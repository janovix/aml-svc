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
 * KYC section weights (mirrors aml/src/lib/kyc-status.ts)
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

	// 1. FIELD COMPLETENESS
	let fieldWeight = 0;

	// Contact info section
	const contactInfoFields = ["email", "phone"];
	const contactCompleted = contactInfoFields.filter((f) => {
		const val = (client as Record<string, unknown>)[f];
		return val !== null && val !== undefined && val !== "";
	}).length;
	const contactWeight = SECTION_WEIGHTS.contactInfo;
	fieldWeight += (contactCompleted / contactInfoFields.length) * contactWeight;

	// 2. DOCUMENT COMPLETENESS
	const requiredDocTypes = DOCUMENT_REQUIREMENTS[client.personType] || [];
	const uploadedDocTypes = new Set(
		client.documents.map((d) => d.documentType as string),
	);
	const missingDocs = requiredDocTypes.filter((d) => !uploadedDocTypes.has(d));
	const docsCompleted = requiredDocTypes.length - missingDocs.length;
	const documentsComplete = missingDocs.length === 0 ? 1 : 0;
	const docsWeight = SECTION_WEIGHTS.documents;
	fieldWeight += (docsCompleted / requiredDocTypes.length) * docsWeight;

	// 3. BENEFICIAL CONTROLLERS / SHAREHOLDERS
	let bcWeight = 0;
	if (client.personType === "MORAL" || client.personType === "TRUST") {
		const hasBCs = client.beneficialControllers.length > 0;
		bcWeight = hasBCs ? SECTION_WEIGHTS.beneficialControllers : 0;
		fieldWeight += bcWeight;
	}

	// 4. SCREENING STATUS
	const screeningComplete =
		client.screeningResult === "clear" || client.screeningResult === "flagged"
			? 1
			: 0;
	const pepWeight = SECTION_WEIGHTS.pepInfo;
	fieldWeight += (screeningComplete / 1) * pepWeight;

	// 5. OVERALL PERCENTAGE
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

	// 6. THRESHOLD-AWARE KYC (Art. 17 LFPIORPI)
	// For now, default to ALWAYS identification required
	// This would require org settings and UMA value lookup for full implementation
	const identificationRequired = true;
	const identificationTier: "ALWAYS" | "ABOVE_THRESHOLD" | "BELOW_THRESHOLD" =
		"ALWAYS";
	const identificationThresholdMxn: Decimal | null = null;
	const noticeThresholdMxn: Decimal | null = null;

	// TODO: Integrate with org settings and UMA to compute actual thresholds
	// For now, store defaults

	// 7. UPDATE CLIENT RECORD
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
