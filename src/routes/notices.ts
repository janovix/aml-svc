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
	NoticeRebukeSchema,
	NoticeAddAlertsSchema,
	NoticeRemoveAlertsSchema,
} from "../domain/notice";
import { mapPrismaClient } from "../domain/client/mappers";
import {
	OrganizationSettingsRepository,
	OrganizationSettingsService,
} from "../domain/organization-settings";
import type { Bindings } from "../types";
import { getPrismaClient } from "../lib/prisma";
import { APIError } from "../middleware/error";
import type { StatusCode } from "hono/utils/http-status";
import { createUsageRightsClient } from "../lib/usage-rights-client";
import { type AuthVariables, getOrganizationId } from "../middleware/auth";
import {
	generateSatMonthlyReportXml,
	type SatXmlConfig,
} from "../lib/sat-xml-generator/index";
import { mapOperationToEntity } from "../domain/operation/mappers";
import type { OperationEntity, ActivityCode } from "../domain/operation/types";
import type { ClientEntity } from "../domain/client/types";
import { generateNoticeFileKey } from "../lib/r2-upload";
import { parseQueryParams } from "../lib/query-params";

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
		const map: Record<string, [number, string]> = {
			NOTICE_NOT_FOUND: [404, "Notice not found"],
			NOTICE_ALREADY_EXISTS_FOR_PERIOD: [
				409,
				"A notice already exists for this period",
			],
			CANNOT_DELETE_NON_DRAFT_NOTICE: [
				400,
				"Only draft notices can be deleted",
			],
			NOTICE_MUST_BE_GENERATED_BEFORE_SUBMISSION: [
				400,
				"Notice must be generated before submission",
			],
			NOTICE_MUST_BE_SUBMITTED_BEFORE_ACKNOWLEDGMENT: [
				400,
				"Notice must be submitted before acknowledgment",
			],
			NOTICE_MUST_BE_SUBMITTED_BEFORE_REBUKE: [
				400,
				"Notice must be submitted before it can be rebuked",
			],
			NOTICE_MUST_BE_REBUKED_BEFORE_REVERT: [
				400,
				"Notice must be rebuked before reverting to draft",
			],
			NOTICE_MUST_BE_DRAFT_TO_MODIFY_ALERTS: [
				400,
				"Alerts can only be added/removed from draft notices",
			],
		};
		const entry = map[error.message];
		if (entry) throw new APIError(entry[0] as StatusCode, entry[1]);
	}
	throw error;
}

// GET /notices - List notices
noticesRouter.get("/", async (c) => {
	const organizationId = getOrganizationId(c);
	const url = new URL(c.req.url);
	const queryObject = parseQueryParams(url.searchParams, ["status"]);
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

	// Gate check: verify org has quota for notices (meter is incremented atomically)
	const usageRights = createUsageRightsClient(c.env);
	const gateResult = await usageRights.gate(organizationId, "notices");
	if (!gateResult.allowed) {
		return c.json(
			{
				success: false,
				error: gateResult.error ?? "usage_limit_exceeded",
				code: "USAGE_LIMIT_EXCEEDED",
				upgradeRequired: true,
				metric: "notices",
				used: gateResult.used,
				limit: gateResult.limit,
				entitlementType: gateResult.entitlementType,
				message:
					"You have reached the limit for notices. Please upgrade your plan or contact your administrator.",
			},
			403,
		);
	}

	const user = c.get("user");
	const userId = user?.id;
	const body = await c.req.json();
	const payload = parseWithZod(NoticeCreateSchema, body);

	const service = getService(c);
	const created = await service
		.create(payload, organizationId, userId)
		.catch(handleServiceError);

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

	const user = c.get("user");
	const userId = user?.id;

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

	const primaryActivityCode = orgSettings.activityKey as ActivityCode;

	// Get alerts with transactions/operations for XML generation
	const alertsData = await service.getAlertsWithOperationsForNotice(
		organizationId,
		params.id,
	);

	let xmlContent: string;
	let alertCount = 0;

	if (alertsData.length === 0) {
		// Empty notice (zero-activity): generate valid empty SAT XML
		xmlContent = generateSatMonthlyReportXml(
			primaryActivityCode,
			notice.reportedMonth,
			orgSettings.obligatedSubjectKey,
			[],
			new Map(),
			{ obligatedSubjectKey: orgSettings.obligatedSubjectKey },
		);
	} else {
		const operationAlerts = alertsData.filter(
			(alert) => alert.operation && alert.client,
		);

		if (operationAlerts.length === 0) {
			throw new APIError(
				400,
				"No valid alerts with operations found for XML generation",
			);
		}

		const operationsByActivity = new Map<
			ActivityCode,
			Array<{
				operation: OperationEntity;
				client: ClientEntity;
				alert: (typeof alertsData)[0];
			}>
		>();

		for (const alert of operationAlerts) {
			if (!alert.operation || !alert.client) continue;

			const operationEntity = mapOperationToEntity(
				alert.operation as Parameters<typeof mapOperationToEntity>[0],
			);
			const clientEntity = mapPrismaClient(alert.client);

			const activityCode = operationEntity.activityCode;
			if (!operationsByActivity.has(activityCode)) {
				operationsByActivity.set(activityCode, []);
			}
			operationsByActivity.get(activityCode)!.push({
				operation: operationEntity,
				client: clientEntity,
				alert,
			});
		}

		const primaryOperations = operationsByActivity.get(primaryActivityCode);

		if (primaryOperations && primaryOperations.length > 0) {
			const clientMap = new Map<string, ClientEntity>();
			for (const { operation, client } of primaryOperations) {
				clientMap.set(operation.clientId, client);
			}

			const config: SatXmlConfig = {
				obligatedSubjectKey: orgSettings.obligatedSubjectKey,
			};

			xmlContent = generateSatMonthlyReportXml(
				primaryActivityCode,
				notice.reportedMonth,
				orgSettings.obligatedSubjectKey,
				primaryOperations.map((op) => op.operation),
				clientMap,
				config,
			);
			alertCount = primaryOperations.length;
		} else {
			throw new APIError(
				400,
				`No operations found for activity ${primaryActivityCode}. Operations exist for: ${Array.from(operationsByActivity.keys()).join(", ")}`,
			);
		}
	}

	const xmlBytes = new TextEncoder().encode(xmlContent);
	const fileSize = xmlBytes.length;

	let xmlFileUrl: string | null = null;

	if (c.env.R2_BUCKET) {
		const fileName = generateNoticeFileKey(
			organizationId,
			notice.id,
			notice.reportedMonth,
		);
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
		xmlFileUrl = fileName;
	}

	await service.markAsGenerated(
		organizationId,
		params.id,
		{ xmlFileUrl, fileSize },
		userId,
	);

	return c.json({
		message: "XML generation complete",
		noticeId: notice.id,
		alertCount,
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
	const user = c.get("user");

	const service = getService(c);
	const updated = await service
		.markAsSubmitted(
			organizationId,
			params.id,
			input.docSvcDocumentId,
			user?.id,
		)
		.catch(handleServiceError);

	return c.json(updated);
});

// POST /notices/:id/acknowledge - Mark notice as acknowledged by SAT
noticesRouter.post("/:id/acknowledge", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(NoticeIdParamSchema, c.req.param());
	const body = await c.req.json();
	const input = parseWithZod(NoticeAcknowledgeSchema, body);
	const user = c.get("user");

	const service = getService(c);
	const updated = await service
		.markAsAcknowledged(
			organizationId,
			params.id,
			input.docSvcDocumentId,
			user?.id,
		)
		.catch(handleServiceError);

	return c.json(updated);
});

// POST /notices/:id/rebuke - Mark notice as rebuked (rejected) by SAT
noticesRouter.post("/:id/rebuke", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(NoticeIdParamSchema, c.req.param());
	const body = await c.req.json();
	const input = parseWithZod(NoticeRebukeSchema, body);
	const user = c.get("user");

	const service = getService(c);
	const updated = await service
		.markAsRebuked(
			organizationId,
			params.id,
			input.docSvcDocumentId,
			input.notes,
			user?.id,
		)
		.catch(handleServiceError);

	return c.json(updated);
});

// POST /notices/:id/revert - Revert a rebuked notice back to draft
noticesRouter.post("/:id/revert", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(NoticeIdParamSchema, c.req.param());
	const user = c.get("user");

	const service = getService(c);
	const updated = await service
		.revertToDraft(organizationId, params.id, user?.id)
		.catch(handleServiceError);

	return c.json(updated);
});

// POST /notices/:id/alerts/add - Add alerts to a draft notice
noticesRouter.post("/:id/alerts/add", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(NoticeIdParamSchema, c.req.param());
	const body = await c.req.json();
	const input = parseWithZod(NoticeAddAlertsSchema, body);
	const user = c.get("user");

	const service = getService(c);
	const count = await service
		.addAlerts(organizationId, params.id, input.alertIds, user?.id)
		.catch(handleServiceError);

	return c.json({ added: count });
});

// POST /notices/:id/alerts/remove - Remove alerts from a draft notice
noticesRouter.post("/:id/alerts/remove", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(NoticeIdParamSchema, c.req.param());
	const body = await c.req.json();
	const input = parseWithZod(NoticeRemoveAlertsSchema, body);
	const user = c.get("user");

	const service = getService(c);
	const count = await service
		.removeAlerts(organizationId, params.id, input.alertIds, user?.id)
		.catch(handleServiceError);

	return c.json({ removed: count });
});
