import { Hono } from "hono";
import type { Context } from "hono";
import { ZodError } from "zod";

import {
	NoticeFilterSchema,
	NoticeIdParamSchema,
	NoticePatchSchema,
	NoticeService,
	NoticeRepository,
	NoticeCreateSchema,
	NoticePreviewSchema,
	NoticeSubmitSchema,
	NoticeAcknowledgeSchema,
} from "../domain/notice";
import { mapPrismaClient } from "../domain/client/mappers";
import { mapPrismaTransaction } from "../domain/transaction/mappers";
import { mapPrismaAlert, mapPrismaAlertRule } from "../domain/alert/mappers";
import {
	OrganizationSettingsRepository,
	OrganizationSettingsService,
} from "../domain/organization-settings";
import type { Bindings } from "../index";
import { getPrismaClient } from "../lib/prisma";
import { APIError } from "../middleware/error";
import { type AuthVariables, getOrganizationId } from "../middleware/auth";
import {
	generateMonthlyReportXml,
	mapToSatVehicleNoticeData,
	type SatMonthlyReportData,
} from "../lib/sat-xml-generator";
import { createSubscriptionClient } from "../lib/subscription-client";

export const noticesRouter = new Hono<{
	Bindings: Bindings;
	Variables: AuthVariables;
}>();

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

function getService(
	c: Context<{ Bindings: Bindings; Variables: AuthVariables }>,
) {
	const prisma = getPrismaClient(c.env.DB);
	const repository = new NoticeRepository(prisma);
	return new NoticeService(repository);
}

function handleServiceError(error: unknown): never {
	if (error instanceof Error) {
		if (error.message === "NOTICE_NOT_FOUND") {
			throw new APIError(404, "Notice not found");
		}
		if (error.message === "NOTICE_ALREADY_EXISTS_FOR_PERIOD") {
			throw new APIError(409, "A notice already exists for this period");
		}
		if (error.message === "CANNOT_DELETE_NON_DRAFT_NOTICE") {
			throw new APIError(400, "Only draft notices can be deleted");
		}
		if (error.message === "NOTICE_MUST_BE_GENERATED_BEFORE_SUBMISSION") {
			throw new APIError(400, "Notice must be generated before submission");
		}
		if (error.message === "NOTICE_MUST_BE_SUBMITTED_BEFORE_ACKNOWLEDGMENT") {
			throw new APIError(400, "Notice must be submitted before acknowledgment");
		}
	}
	throw error;
}

// GET /notices - List notices
noticesRouter.get("/", async (c) => {
	const organizationId = getOrganizationId(c);
	const url = new URL(c.req.url);
	const queryObject = Object.fromEntries(url.searchParams.entries());
	const filters = parseWithZod(NoticeFilterSchema, queryObject);

	const service = getService(c);
	const result = await service
		.list(organizationId, filters)
		.catch(handleServiceError);

	return c.json(result);
});

// GET /notices/preview - Preview alerts for a potential notice
noticesRouter.get("/preview", async (c) => {
	const organizationId = getOrganizationId(c);
	const url = new URL(c.req.url);
	const queryObject = Object.fromEntries(url.searchParams.entries());
	const input = parseWithZod(NoticePreviewSchema, queryObject);

	const service = getService(c);
	const result = await service
		.preview(organizationId, input)
		.catch(handleServiceError);

	return c.json(result);
});

// GET /notices/available-months - Get available months for creating notices
noticesRouter.get("/available-months", async (c) => {
	const organizationId = getOrganizationId(c);

	const service = getService(c);
	const months = await service
		.getAvailableMonths(organizationId)
		.catch(handleServiceError);

	return c.json({ months });
});

// GET /notices/:id - Get a single notice
noticesRouter.get("/:id", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(NoticeIdParamSchema, c.req.param());

	const service = getService(c);
	const notice = await service
		.getWithSummary(organizationId, params.id)
		.catch(handleServiceError);

	return c.json(notice);
});

// POST /notices - Create a new notice
noticesRouter.post("/", async (c) => {
	const organizationId = getOrganizationId(c);
	const user = c.get("user");
	const userId = user?.id;
	const body = await c.req.json();
	const payload = parseWithZod(NoticeCreateSchema, body);

	const service = getService(c);
	const created = await service
		.create(payload, organizationId, userId)
		.catch(handleServiceError);

	// Report notice usage to auth-svc for metered billing
	// This is fire-and-forget - we don't want to fail notice creation if billing fails
	const subscriptionClient = createSubscriptionClient(c.env);
	subscriptionClient.reportUsage(organizationId, "notices", 1).catch((err) => {
		console.error("Failed to report notice usage:", err);
	});

	return c.json(created, 201);
});

// PATCH /notices/:id - Update a notice
noticesRouter.patch("/:id", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(NoticeIdParamSchema, c.req.param());
	const body = await c.req.json();
	const payload = parseWithZod(NoticePatchSchema, body);

	if (Object.keys(payload).length === 0) {
		throw new APIError(400, "Payload is empty");
	}

	const service = getService(c);
	const updated = await service
		.patch(organizationId, params.id, payload)
		.catch(handleServiceError);

	return c.json(updated);
});

// DELETE /notices/:id - Delete a draft notice
noticesRouter.delete("/:id", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(NoticeIdParamSchema, c.req.param());

	const service = getService(c);
	await service.delete(organizationId, params.id).catch(handleServiceError);

	return c.body(null, 204);
});

// POST /notices/:id/generate - Generate XML file for a notice
noticesRouter.post("/:id/generate", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(NoticeIdParamSchema, c.req.param());

	const service = getService(c);
	const notice = await service
		.get(organizationId, params.id)
		.catch(handleServiceError);

	if (notice.status !== "DRAFT") {
		throw new APIError(400, "Notice has already been generated");
	}

	// Get alerts with transactions for XML generation
	const alertsWithTransactions =
		await service.getAlertsWithTransactionsForNotice(organizationId, params.id);

	if (alertsWithTransactions.length === 0) {
		throw new APIError(400, "Notice has no alerts to include");
	}

	// Get organization settings (RFC and activity code)
	const prisma = getPrismaClient(c.env.DB);
	const orgSettingsRepo = new OrganizationSettingsRepository(prisma);
	const orgSettingsService = new OrganizationSettingsService(orgSettingsRepo);
	const orgSettings =
		await orgSettingsService.getByOrganizationId(organizationId);

	if (!orgSettings) {
		throw new APIError(
			400,
			"Organization settings not configured. Please configure RFC and activity code first.",
		);
	}

	// Build SAT monthly report data
	const avisos = alertsWithTransactions
		.filter((alert) => alert.transaction && alert.client)
		.map((alert) => {
			const clientEntity = mapPrismaClient(alert.client);
			const transactionEntity = mapPrismaTransaction(alert.transaction!);
			const alertEntity = {
				...mapPrismaAlert(alert),
				alertRule: alert.alertRule
					? mapPrismaAlertRule(alert.alertRule)
					: undefined,
			};

			return mapToSatVehicleNoticeData(
				alertEntity,
				clientEntity,
				transactionEntity,
				{
					obligatedSubjectKey: orgSettings.obligatedSubjectKey,
					activityKey: orgSettings.activityKey,
					noticeReference: alert.id,
					priority: "1",
					alertType: alert.alertRule?.id ?? "803",
					operationType: transactionEntity.operationTypeCode ?? "802",
					currency: transactionEntity.currencyCode ?? "3",
					vehicleType:
						transactionEntity.vehicleType === "land"
							? "terrestre"
							: transactionEntity.vehicleType === "marine"
								? "maritimo"
								: "aereo",
					brand: transactionEntity.brand,
					nationalityCountry:
						clientEntity.countryCode ?? clientEntity.nationality ?? undefined,
					economicActivity: clientEntity.economicActivityCode ?? undefined,
				},
			);
		});

	if (avisos.length === 0) {
		throw new APIError(
			400,
			"No valid alerts with transactions found for XML generation",
		);
	}

	// Generate the XML
	const reportData: SatMonthlyReportData = {
		reportedMonth: notice.reportedMonth,
		obligatedSubjectKey: orgSettings.obligatedSubjectKey,
		activityKey: orgSettings.activityKey,
		avisos,
	};

	const xmlContent = generateMonthlyReportXml(reportData);
	const xmlBytes = new TextEncoder().encode(xmlContent);
	const fileSize = xmlBytes.length;

	// Upload to R2 if bucket is available
	let xmlFileUrl: string | null = null;

	if (c.env.R2_BUCKET) {
		const fileName = `notices/${organizationId}/${notice.id}_${notice.reportedMonth}.xml`;
		await c.env.R2_BUCKET.put(fileName, xmlBytes, {
			httpMetadata: {
				contentType: "application/xml",
			},
			customMetadata: {
				noticeId: notice.id,
				organizationId,
				reportedMonth: notice.reportedMonth,
				generatedAt: new Date().toISOString(),
			},
		});
		// Construct the R2 public URL or use a signed URL in production
		xmlFileUrl = fileName;
	}

	// Mark the notice as generated with file info
	await service.markAsGenerated(organizationId, params.id, {
		xmlFileUrl,
		fileSize,
	});

	return c.json({
		message: "XML generation complete",
		noticeId: notice.id,
		alertCount: avisos.length,
		fileSize,
		xmlFileUrl,
	});
});

// GET /notices/:id/download - Download the generated XML file
noticesRouter.get("/:id/download", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(NoticeIdParamSchema, c.req.param());

	const service = getService(c);
	const notice = await service
		.get(organizationId, params.id)
		.catch(handleServiceError);

	if (notice.status === "DRAFT") {
		throw new APIError(400, "Notice has not been generated yet");
	}

	if (!notice.xmlFileUrl) {
		throw new APIError(404, "Notice XML file not found");
	}

	// Fetch from R2 if available
	if (c.env.R2_BUCKET) {
		const file = await c.env.R2_BUCKET.get(notice.xmlFileUrl);

		if (!file) {
			throw new APIError(404, "Notice XML file not found in storage");
		}

		const fileName = `aviso_${notice.reportedMonth}_${notice.id}.xml`;

		return new Response(file.body, {
			headers: {
				"Content-Type": "application/xml",
				"Content-Disposition": `attachment; filename="${fileName}"`,
				"Content-Length": String(file.size),
			},
		});
	}

	// Fallback: return file URL for external download
	return c.json({
		fileUrl: notice.xmlFileUrl,
		fileSize: notice.fileSize,
		format: "xml",
	});
});

// POST /notices/:id/submit - Mark notice as submitted to SAT
noticesRouter.post("/:id/submit", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(NoticeIdParamSchema, c.req.param());
	const body = await c.req.json().catch(() => ({}));
	const input = parseWithZod(NoticeSubmitSchema, body);

	const service = getService(c);
	const updated = await service
		.markAsSubmitted(organizationId, params.id, input.satFolioNumber)
		.catch(handleServiceError);

	return c.json(updated);
});

// POST /notices/:id/acknowledge - Mark notice as acknowledged by SAT
noticesRouter.post("/:id/acknowledge", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(NoticeIdParamSchema, c.req.param());
	const body = await c.req.json();
	const input = parseWithZod(NoticeAcknowledgeSchema, body);

	const service = getService(c);
	const updated = await service
		.markAsAcknowledged(organizationId, params.id, input.satFolioNumber)
		.catch(handleServiceError);

	return c.json(updated);
});
