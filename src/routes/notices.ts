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
import type { Bindings } from "../index";
import { getPrismaClient } from "../lib/prisma";
import { APIError } from "../middleware/error";
import { type AuthVariables, getOrganizationId } from "../middleware/auth";

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

	// Get alerts for the notice
	const alerts = await service.getAlertsForNotice(organizationId, params.id);

	if (alerts.length === 0) {
		throw new APIError(400, "Notice has no alerts to include");
	}

	// Mark the notice as generated
	// Note: R2 file upload can be implemented later when needed
	await service.markAsGenerated(organizationId, params.id, {
		xmlFileUrl: null,
		fileSize: null,
	});

	return c.json({
		message: "XML generation complete",
		noticeId: notice.id,
		alertCount: alerts.length,
	});
});

// GET /notices/:id/download - Get download URL for generated XML file
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
