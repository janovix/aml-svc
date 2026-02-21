/**
 * Public KYC Self-Service Routes
 *
 * These routes are token-based (no auth token required) and allow clients to:
 * - View their pre-filled data
 * - Update personal information
 * - Upload documents
 * - Add/update shareholders and beneficial controllers
 * - Submit their KYC session for compliance review
 *
 * Security:
 * - Token validates that client has been invited and session is not expired/revoked
 * - Admin-only fields are stripped via self-service schemas
 * - Write operations are scoped to allowed editable_sections
 */

import { Hono } from "hono";
import { ZodError } from "zod";

import type { Bindings } from "../types";
import { getPrismaClient } from "../lib/prisma";
import { APIError } from "../middleware/error";
import { KycSessionService } from "../domain/kyc-session";
import type { KycSessionEntity } from "../domain/kyc-session";
import {
	selfServicePersonalInfoPhysicalSchema,
	selfServicePersonalInfoMoralSchema,
	selfServiceDocumentSchema,
	selfServiceShareholderSchema,
	selfServiceBeneficialControllerSchema,
	selfServiceAddressSchema,
} from "../domain/kyc-session/self-service-schemas";
import { ClientRepository } from "../domain/client";
import { ShareholderService } from "../domain/shareholder/index.js";
import { BeneficialControllerService } from "../domain/beneficial-controller/index.js";
import { CatalogRepository, CatalogQueryService } from "../domain/catalog";
import { sendKYCSubmissionNotification } from "../lib/kyc-email";
export const publicKycRouter = new Hono<{ Bindings: Bindings }>();

// ============================================================================
// Helpers
// ============================================================================

function parseWithZod<T>(
	schema: { parse: (input: unknown) => T },
	payload: unknown,
): T {
	try {
		return schema.parse(payload);
	} catch (error) {
		if (error instanceof ZodError) {
			throw new APIError(400, "Validation failed", error.format());
		}
		throw error;
	}
}

/**
 * Gets a valid, non-expired KYC session by token.
 * Also marks the session as IN_PROGRESS if it's ACTIVE.
 */
async function resolveSession(
	token: string,
	kycService: KycSessionService,
	ip?: string,
): Promise<KycSessionEntity> {
	const session = await kycService.getByToken(token);

	if (session.status === "EXPIRED") {
		throw new APIError(
			410,
			"SESSION_EXPIRED",
			"This KYC session link has expired. Please contact your organization to generate a new link.",
		);
	}

	if (session.status === "REVOKED") {
		throw new APIError(
			410,
			"SESSION_REVOKED",
			"This KYC session link has been revoked. Please contact your organization.",
		);
	}

	// Auto-mark as IN_PROGRESS on first access
	if (session.status === "ACTIVE") {
		return kycService.markStarted(token, ip);
	}

	return session;
}

/**
 * Verifies that the session allows writing to a specific section.
 */
function assertSectionAllowed(
	session: KycSessionEntity,
	section: string,
): void {
	if (
		session.editableSections &&
		!(session.editableSections as string[]).includes(section)
	) {
		throw new APIError(
			403,
			"SECTION_NOT_ALLOWED",
			`The '${section}' section is not enabled for this KYC session`,
		);
	}
}

/**
 * Verifies that the session allows write operations.
 */
function assertWritable(session: KycSessionEntity): void {
	const writableStatuses = ["ACTIVE", "IN_PROGRESS", "REJECTED"];
	if (!writableStatuses.includes(session.status)) {
		throw new APIError(
			409,
			"SESSION_NOT_WRITABLE",
			`Cannot modify a KYC session in ${session.status} status`,
		);
	}
}

function getClientIp(c: {
	req: { header: (name: string) => string | undefined };
}): string | undefined {
	return (
		c.req.header("CF-Connecting-IP") ??
		c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ??
		undefined
	);
}

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /public/kyc/:token
 * Get session info + pre-filled client data + org branding
 */
publicKycRouter.get("/:token", async (c) => {
	const token = c.req.param("token");
	const prisma = getPrismaClient(c.env.DB);
	const kycService = new KycSessionService(prisma);
	const ip = getClientIp(c);

	const session = await resolveSession(token, kycService, ip);

	// Fetch client data (pre-filled for the form)
	const client = await prisma.client.findUnique({
		where: { id: session.clientId },
		include: {
			documents: true,
			addresses: true,
		},
	});

	if (!client) {
		throw new APIError(404, "NOT_FOUND", "Client not found");
	}

	// Log access event
	await kycService.logEvent(session.id, "session_accessed", {
		actorIp: ip,
		actorType: "client",
	});

	// Strip admin-only fields from client data before sending to client
	const {
		// Admin-only fields stripped:
		watchlistQueryId: _watchlistQueryId,
		ofacSanctioned: _ofacSanctioned,
		unscSanctioned: _unscSanctioned,
		sat69bListed: _sat69bListed,
		adverseMediaFlagged: _adverseMediaFlagged,
		screeningResult: _screeningResult,
		screenedAt: _screenedAt,
		isPEP: _isPEP,
		kycStatus: _kycStatus,
		kycCompletedAt: _kycCompletedAt,
		completenessStatus: _completenessStatus,
		missingFields: _missingFields,
		notes: _notes,
		// Documents admin-only fields stripped per doc
		...safeClient
	} = client as Record<string, unknown>;

	// Also strip admin-only fields from documents
	const safeDocuments = client.documents.map((doc) => {
		const {
			verifiedAt: _va,
			verifiedBy: _vb,
			...safeDoc
		} = doc as unknown as Record<string, unknown>;
		return safeDoc;
	});

	return c.json({
		session: {
			id: session.id,
			status: session.status,
			expiresAt: session.expiresAt,
			editableSections: session.editableSections,
			identificationTier: session.identificationTier,
			thresholdAmountMxn: session.thresholdAmountMxn,
			completedSections: session.completedSections,
		},
		client: { ...safeClient, documents: safeDocuments },
	});
});

/**
 * PATCH /public/kyc/:token/personal-info
 * Update client personal fields
 */
publicKycRouter.patch("/:token/personal-info", async (c) => {
	const token = c.req.param("token");
	const prisma = getPrismaClient(c.env.DB);
	const kycService = new KycSessionService(prisma);
	const ip = getClientIp(c);

	const session = await resolveSession(token, kycService, ip);
	assertWritable(session);
	assertSectionAllowed(session, "personal_info");

	const body = await c.req.json();

	// Fetch client to determine person type
	const client = await prisma.client.findUnique({
		where: { id: session.clientId },
		select: { personType: true },
	});

	if (!client) {
		throw new APIError(404, "NOT_FOUND", "Client not found");
	}

	// Use appropriate schema based on person type
	let validatedData: Record<string, unknown>;
	if (client.personType === "PHYSICAL") {
		validatedData = parseWithZod(selfServicePersonalInfoPhysicalSchema, body);
	} else {
		validatedData = parseWithZod(selfServicePersonalInfoMoralSchema, body);
	}

	// Remove undefined values
	const updateData = Object.fromEntries(
		Object.entries(validatedData).filter(([, v]) => v !== undefined),
	);

	// Proxy update to client repository (use patch for partial update)
	const clientRepo = new ClientRepository(prisma);

	// Capture before state for audit trail
	const before = await prisma.client.findUnique({
		where: { id: session.clientId },
		select: {
			firstName: true,
			lastName: true,
			secondLastName: true,
			email: true,
			phone: true,
			nationality: true,
			occupation: true,
			sourceOfFunds: true,
			sourceOfWealth: true,
		},
	});

	await clientRepo.patch(session.organizationId, session.clientId, updateData);

	await kycService.logEvent(session.id, "personal_info_updated", {
		actorIp: ip,
		actorType: "client",
		payload: { before, after: updateData },
	});

	const updatedClient = await prisma.client.findUnique({
		where: { id: session.clientId },
	});

	return c.json({ success: true, client: updatedClient });
});

/**
 * POST /public/kyc/:token/documents
 * Create a client document record
 */
publicKycRouter.post("/:token/documents", async (c) => {
	const token = c.req.param("token");
	const prisma = getPrismaClient(c.env.DB);
	const kycService = new KycSessionService(prisma);
	const ip = getClientIp(c);

	const session = await resolveSession(token, kycService, ip);
	assertWritable(session);
	assertSectionAllowed(session, "documents");

	const body = await c.req.json();
	const data = parseWithZod(selfServiceDocumentSchema, body);

	const clientRepo = new ClientRepository(prisma);
	const document = await clientRepo.createDocument(session.organizationId, {
		clientId: session.clientId,
		documentType: data.documentType,
		documentNumber: data.documentNumber,
		issuingCountry: data.issuingCountry ?? undefined,
		issueDate: data.issueDate ?? undefined,
		expiryDate: data.expiryDate ?? undefined,
		status: "PENDING",
		docSvcDocumentId: data.docSvcDocumentId ?? undefined,
		uploadLinkId: data.uploadLinkId ?? undefined,
	});

	await kycService.logEvent(session.id, "document_uploaded", {
		actorIp: ip,
		actorType: "client",
		payload: { documentType: data.documentType, documentId: document.id },
	});

	// Strip admin-only fields before returning
	const {
		verifiedAt: _va,
		verifiedBy: _vb,
		...safeDoc
	} = document as unknown as Record<string, unknown>;

	return c.json({ document: safeDoc }, 201);
});

/**
 * POST /public/kyc/:token/shareholders
 * Add a shareholder (moral/trust only)
 */
publicKycRouter.post("/:token/shareholders", async (c) => {
	const token = c.req.param("token");
	const prisma = getPrismaClient(c.env.DB);
	const kycService = new KycSessionService(prisma);
	const ip = getClientIp(c);

	const session = await resolveSession(token, kycService, ip);
	assertWritable(session);
	assertSectionAllowed(session, "shareholders");

	// Verify client is moral or trust
	const client = await prisma.client.findUnique({
		where: { id: session.clientId },
		select: { personType: true },
	});
	if (client?.personType === "PHYSICAL") {
		throw new APIError(
			400,
			"INVALID_PERSON_TYPE",
			"Shareholders are only applicable to moral or trust entities",
		);
	}

	const body = await c.req.json();
	const data = parseWithZod(selfServiceShareholderSchema, body);

	const shareholderService = new ShareholderService(prisma);

	// Map self-service schema to internal schema (discriminated union)
	const shareholder = await shareholderService.create(
		session.clientId,
		data.shareholderType === "PERSON"
			? {
					entityType: "PERSON" as const,
					firstName: data.firstName!,
					lastName: data.lastName!,
					secondLastName: data.secondLastName,
					rfc: data.rfc,
					ownershipPercentage: data.ownershipPercentage,
					email: data.email,
					phone: data.phone,
					parentShareholderId: data.parentShareholderId,
				}
			: {
					entityType: "COMPANY" as const,
					businessName: data.businessName!,
					taxId: data.taxId ?? "",
					nationality: data.nationality,
					incorporationDate: data.incorporationDate,
					representativeName: data.representativeName,
					representativeCurp: data.representativeCurp,
					representativeRfc: data.representativeRfc,
					ownershipPercentage: data.ownershipPercentage,
					parentShareholderId: data.parentShareholderId,
				},
	);

	await kycService.logEvent(session.id, "shareholder_added", {
		actorIp: ip,
		actorType: "client",
		payload: {
			shareholderId: shareholder.id,
			entityType: data.shareholderType,
		},
	});

	return c.json({ shareholder }, 201);
});

/**
 * PUT /public/kyc/:token/shareholders/:sid
 * Update a shareholder
 */
publicKycRouter.put("/:token/shareholders/:sid", async (c) => {
	const token = c.req.param("token");
	const sid = c.req.param("sid");
	const prisma = getPrismaClient(c.env.DB);
	const kycService = new KycSessionService(prisma);
	const ip = getClientIp(c);

	const session = await resolveSession(token, kycService, ip);
	assertWritable(session);
	assertSectionAllowed(session, "shareholders");

	const body = await c.req.json();
	const data = parseWithZod(selfServiceShareholderSchema, body);

	const shareholderService = new ShareholderService(prisma);

	const shareholder = await shareholderService.update(
		session.clientId,
		sid,
		data.shareholderType === "PERSON"
			? {
					entityType: "PERSON" as const,
					firstName: data.firstName!,
					lastName: data.lastName!,
					secondLastName: data.secondLastName,
					rfc: data.rfc,
					ownershipPercentage: data.ownershipPercentage,
					email: data.email,
					phone: data.phone,
				}
			: {
					entityType: "COMPANY" as const,
					businessName: data.businessName!,
					taxId: data.taxId ?? "",
					nationality: data.nationality,
					incorporationDate: data.incorporationDate,
					representativeName: data.representativeName,
					representativeCurp: data.representativeCurp,
					representativeRfc: data.representativeRfc,
					ownershipPercentage: data.ownershipPercentage,
				},
	);

	await kycService.logEvent(session.id, "shareholder_updated", {
		actorIp: ip,
		actorType: "client",
		payload: { shareholderId: sid },
	});

	return c.json({ shareholder });
});

/**
 * POST /public/kyc/:token/beneficial-controllers
 * Add a beneficial controller (moral/trust only)
 */
publicKycRouter.post("/:token/beneficial-controllers", async (c) => {
	const token = c.req.param("token");
	const prisma = getPrismaClient(c.env.DB);
	const kycService = new KycSessionService(prisma);
	const ip = getClientIp(c);

	const session = await resolveSession(token, kycService, ip);
	assertWritable(session);
	assertSectionAllowed(session, "beneficial_controllers");

	const client = await prisma.client.findUnique({
		where: { id: session.clientId },
		select: { personType: true },
	});
	if (client?.personType === "PHYSICAL") {
		throw new APIError(
			400,
			"INVALID_PERSON_TYPE",
			"Beneficial controllers are only applicable to moral or trust entities",
		);
	}

	const body = await c.req.json();
	const data = parseWithZod(selfServiceBeneficialControllerSchema, body);

	const bcService = new BeneficialControllerService(prisma);

	const bc = await bcService.create(session.clientId, {
		...data,
	});

	await kycService.logEvent(session.id, "beneficial_controller_added", {
		actorIp: ip,
		actorType: "client",
		payload: { bcId: bc.id },
	});

	return c.json({ beneficialController: bc }, 201);
});

/**
 * PUT /public/kyc/:token/beneficial-controllers/:bcId
 * Update a beneficial controller
 */
publicKycRouter.put("/:token/beneficial-controllers/:bcId", async (c) => {
	const token = c.req.param("token");
	const bcId = c.req.param("bcId");
	const prisma = getPrismaClient(c.env.DB);
	const kycService = new KycSessionService(prisma);
	const ip = getClientIp(c);

	const session = await resolveSession(token, kycService, ip);
	assertWritable(session);
	assertSectionAllowed(session, "beneficial_controllers");

	const body = await c.req.json();
	const data = parseWithZod(selfServiceBeneficialControllerSchema, body);

	const bcService = new BeneficialControllerService(prisma);

	const bc = await bcService.update(session.clientId, bcId, data);

	await kycService.logEvent(session.id, "beneficial_controller_updated", {
		actorIp: ip,
		actorType: "client",
		payload: { bcId },
	});

	return c.json({ beneficialController: bc });
});

/**
 * POST /public/kyc/:token/addresses
 * Add an address
 */
publicKycRouter.post("/:token/addresses", async (c) => {
	const token = c.req.param("token");
	const prisma = getPrismaClient(c.env.DB);
	const kycService = new KycSessionService(prisma);
	const ip = getClientIp(c);

	const session = await resolveSession(token, kycService, ip);
	assertWritable(session);
	assertSectionAllowed(session, "addresses");

	const body = await c.req.json();
	const data = parseWithZod(selfServiceAddressSchema, body);

	const clientRepo = new ClientRepository(prisma);
	// Map self-service address fields to ClientAddressCreateInput
	const streetLine = [data.street, data.externalNumber, data.internalNumber]
		.filter(Boolean)
		.join(" ");
	const street2Parts = [data.neighborhood, data.municipality].filter(Boolean);
	const address = await clientRepo.createAddress(session.organizationId, {
		clientId: session.clientId,
		addressType: data.addressType,
		country: data.country,
		city: data.city,
		state: data.stateCode,
		street1: streetLine,
		street2: street2Parts.length > 0 ? street2Parts.join(", ") : undefined,
		postalCode: data.postalCode,
		reference: data.reference ?? undefined,
		isPrimary: data.isPrimary,
	});

	await kycService.logEvent(session.id, "address_added", {
		actorIp: ip,
		actorType: "client",
		payload: { addressId: address.id, addressType: data.addressType },
	});

	return c.json({ address }, 201);
});

/**
 * POST /public/kyc/:token/submit
 * Submit the KYC session for compliance review.
 * This does NOT complete KYC - it moves to SUBMITTED awaiting compliance officer review (Art. 18-I).
 */
publicKycRouter.post("/:token/submit", async (c) => {
	const token = c.req.param("token");
	const prisma = getPrismaClient(c.env.DB);
	const kycService = new KycSessionService(prisma);
	const ip = getClientIp(c);

	const session = await resolveSession(token, kycService, ip);

	if (
		session.status !== "ACTIVE" &&
		session.status !== "IN_PROGRESS" &&
		session.status !== "REJECTED"
	) {
		throw new APIError(
			409,
			"CANNOT_SUBMIT",
			`Cannot submit a session in ${session.status} status`,
		);
	}

	const submitted = await kycService.markSubmitted(token, ip);

	// Fetch client for notification
	const client = await prisma.client.findUnique({
		where: { id: session.clientId },
		select: { firstName: true, lastName: true, businessName: true },
	});
	const clientName = client
		? client.firstName
			? `${client.firstName} ${client.lastName ?? ""}`.trim()
			: (client.businessName ?? "Cliente")
		: "Cliente";

	// Non-blocking notification to org compliance team
	c.executionCtx.waitUntil(
		sendKYCSubmissionNotification(c.env, submitted, clientName),
	);

	return c.json({
		success: true,
		message:
			"Your information has been submitted for review. You will be notified once the review is complete.",
		session: {
			id: submitted.id,
			status: submitted.status,
			submittedAt: submitted.submittedAt,
		},
	});
});

/**
 * GET /public/kyc/:token/catalogs/:catalogKey
 * Read-only catalog access for form dropdowns.
 * Scoped by valid session token for basic access control.
 */
publicKycRouter.get("/:token/catalogs/:catalogKey", async (c) => {
	const token = c.req.param("token");
	const catalogKey = c.req.param("catalogKey");
	const prisma = getPrismaClient(c.env.DB);
	const kycService = new KycSessionService(prisma);

	// Validate session (but don't mark as started just for catalog access)
	const session = await kycService.getByToken(token);
	if (
		session.status === "EXPIRED" ||
		session.status === "REVOKED" ||
		session.status === "APPROVED"
	) {
		throw new APIError(
			410,
			"SESSION_INACTIVE",
			"This session is no longer active",
		);
	}

	const catalogRepo = new CatalogRepository(prisma);
	const catalogService = new CatalogQueryService(catalogRepo);

	const url = new URL(c.req.url);
	const query = {
		page: parseInt(url.searchParams.get("page") ?? "1", 10),
		pageSize: Math.min(
			parseInt(url.searchParams.get("limit") ?? "100", 10),
			500,
		),
		search: url.searchParams.get("search") ?? undefined,
		active: url.searchParams.has("active")
			? url.searchParams.get("active") === "true"
			: undefined,
	};

	try {
		const result = await catalogService.list(catalogKey, query);
		return c.json(result);
	} catch (error) {
		if (error instanceof Error && error.message === "CATALOG_NOT_FOUND") {
			throw new APIError(404, "CATALOG_NOT_FOUND", "Catalog not found");
		}
		throw error;
	}
});
