import type { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * Document requirements per person type
 */
const DOCUMENT_REQUIREMENTS: Record<string, string[]> = {
	PHYSICAL: ["NATIONAL_ID", "PROOF_OF_ADDRESS", "TAX_ID"],
	MORAL: ["ACTA_CONSTITUTIVA", "PODER_NOTARIAL", "TAX_ID", "PROOF_OF_ADDRESS"],
	TRUST: ["TRUST_AGREEMENT", "TAX_ID", "PROOF_OF_ADDRESS"],
};

/**
 * KYC section weights and field lists (mirrors aml/src/lib/kyc-status.ts)
 */
const SECTION_WEIGHTS = {
	personalInfo: 1.5,
	companyInfo: 1.5,
	contactInfo: 1,
	addressInfo: 1,
	kycInfo: 1,
	pepInfo: 0.5,
	documents: 2,
	beneficialControllers: 1,
};

/** Field lists per section — must match frontend KYC_SECTIONS */
const SECTION_FIELDS: Record<string, string[]> = {
	personalInfo: [
		"firstName",
		"lastName",
		"secondLastName",
		"birthDate",
		"curp",
		"rfc",
		"nationality",
		"countryCode",
	],
	companyInfo: [
		"businessName",
		"incorporationDate",
		"rfc",
		"countryCode",
		"economicActivityCode",
	],
	contactInfo: ["email", "phone"],
	addressInfo: [
		"country",
		"stateCode",
		"city",
		"municipality",
		"neighborhood",
		"street",
		"externalNumber",
		"postalCode",
	],
	kycInfo: [
		"economicActivityCode",
		"gender",
		"occupation",
		"maritalStatus",
		"sourceOfFunds",
	],
	pepInfo: ["screeningResult", "screenedAt"],
};

function isFieldComplete(
	client: Record<string, unknown>,
	fieldName: string,
): boolean {
	const value = client[fieldName];
	if (fieldName === "screeningResult") {
		return value === "clear" || value === "flagged";
	}
	if (fieldName === "screenedAt") {
		return !!value;
	}
	return value !== null && value !== undefined && value !== "";
}

function sectionCompletedCount(
	client: Record<string, unknown>,
	fields: string[],
): number {
	return fields.filter((f) => isFieldComplete(client, f)).length;
}

/**
 * Recalculate KYC progress for a client and update the database.
 * This function is called after mutations that affect KYC state (documents, BCs, shareholders, client fields).
 *
 * Computes:
 * - kycCompletionPct: overall weighted percentage (0-100)
 * - documentsComplete: 1 if all required docs uploaded, 0 otherwise
 * - documentsCount: number of uploaded documents
 * - documentsRequired: number of required documents for person type
 * - shareholdersCount: number of shareholders
 * - beneficialControllersCount: number of beneficial controllers
 * - identificationRequired, identificationTier, identification/notice thresholds
 */
export async function recalculateKycProgress(
	prisma: PrismaClient,
	clientId: string,
): Promise<void> {
	// Fetch the client and all related data
	const client = await prisma.client.findUnique({
		where: { id: clientId },
		include: {
			documents: true,
			beneficialControllers: true,
			shareholders: true,
		},
	});

	if (!client) {
		throw new Error(`Client not found: ${clientId}`);
	}

	// 1. FIELD COMPLETENESS — all sections aligned with frontend (aml/src/lib/kyc-status.ts)
	const clientRecord = client as Record<string, unknown>;
	let fieldWeight = 0;

	// Personal info (PHYSICAL only)
	if (client.personType === "PHYSICAL") {
		const fields = SECTION_FIELDS.personalInfo;
		const completed = sectionCompletedCount(clientRecord, fields);
		fieldWeight += (completed / fields.length) * SECTION_WEIGHTS.personalInfo;
	}

	// Company info (MORAL/TRUST only)
	if (client.personType === "MORAL" || client.personType === "TRUST") {
		const fields = SECTION_FIELDS.companyInfo;
		const completed = sectionCompletedCount(clientRecord, fields);
		fieldWeight += (completed / fields.length) * SECTION_WEIGHTS.companyInfo;
	}

	// Contact info
	const contactFields = SECTION_FIELDS.contactInfo;
	fieldWeight +=
		(sectionCompletedCount(clientRecord, contactFields) /
			contactFields.length) *
		SECTION_WEIGHTS.contactInfo;

	// Address info
	const addressFields = SECTION_FIELDS.addressInfo;
	fieldWeight +=
		(sectionCompletedCount(clientRecord, addressFields) /
			addressFields.length) *
		SECTION_WEIGHTS.addressInfo;

	// KYC info (PHYSICAL only)
	if (client.personType === "PHYSICAL") {
		const fields = SECTION_FIELDS.kycInfo;
		const completed = sectionCompletedCount(clientRecord, fields);
		fieldWeight += (completed / fields.length) * SECTION_WEIGHTS.kycInfo;
	}

	// PEP / screening
	const pepFields = SECTION_FIELDS.pepInfo;
	fieldWeight +=
		(sectionCompletedCount(clientRecord, pepFields) / pepFields.length) *
		SECTION_WEIGHTS.pepInfo;

	// 2. DOCUMENT COMPLETENESS
	const requiredDocTypes = DOCUMENT_REQUIREMENTS[client.personType] || [];
	const uploadedDocTypes = new Set(
		client.documents.map((d) => d.documentType as string),
	);
	const missingDocs = requiredDocTypes.filter((d) => !uploadedDocTypes.has(d));
	const docsCompleted = requiredDocTypes.length - missingDocs.length;
	const documentsComplete = missingDocs.length === 0 ? 1 : 0;
	fieldWeight +=
		(docsCompleted / requiredDocTypes.length) * SECTION_WEIGHTS.documents;

	// 3. BENEFICIAL CONTROLLERS (MORAL/TRUST only)
	if (client.personType === "MORAL" || client.personType === "TRUST") {
		const hasBCs = client.beneficialControllers.length > 0;
		fieldWeight += hasBCs ? SECTION_WEIGHTS.beneficialControllers : 0;
	}

	// 4. OVERALL PERCENTAGE
	let totalWeight = 0;
	if (client.personType === "PHYSICAL") {
		totalWeight =
			SECTION_WEIGHTS.personalInfo +
			SECTION_WEIGHTS.contactInfo +
			SECTION_WEIGHTS.addressInfo +
			SECTION_WEIGHTS.kycInfo +
			SECTION_WEIGHTS.pepInfo +
			SECTION_WEIGHTS.documents;
	} else {
		// MORAL or TRUST
		totalWeight =
			SECTION_WEIGHTS.companyInfo +
			SECTION_WEIGHTS.contactInfo +
			SECTION_WEIGHTS.addressInfo +
			SECTION_WEIGHTS.pepInfo +
			SECTION_WEIGHTS.documents +
			SECTION_WEIGHTS.beneficialControllers;
	}

	const kycCompletionPct = Math.round((fieldWeight / totalWeight) * 100);

	// 5. THRESHOLD-AWARE KYC (Art. 17 LFPIORPI)
	// For now, default to ALWAYS identification required
	// This would require org settings and UMA value lookup for full implementation
	const identificationRequired = true;
	const identificationTier: "ALWAYS" | "ABOVE_THRESHOLD" | "BELOW_THRESHOLD" =
		"ALWAYS";
	const identificationThresholdMxn: Decimal | null = null;
	const noticeThresholdMxn: Decimal | null = null;

	// TODO: Integrate with org settings and UMA to compute actual thresholds
	// For now, store defaults

	// 6. UPDATE CLIENT RECORD
	await prisma.client.update({
		where: { id: clientId },
		data: {
			kycCompletionPct,
			documentsComplete,
			documentsCount: client.documents.length,
			documentsRequired: requiredDocTypes.length,
			shareholdersCount: client.shareholders.length,
			beneficialControllersCount: client.beneficialControllers.length,
			identificationRequired,
			identificationTier,
			identificationThresholdMxn,
			noticeThresholdMxn,
		},
	});
}
