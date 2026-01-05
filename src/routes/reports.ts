import { Hono } from "hono";
import type { Context } from "hono";
import { ZodError } from "zod";

import {
	ReportFilterSchema,
	ReportIdParamSchema,
	ReportPatchSchema,
	ReportService,
	ReportRepository,
	ReportCreateSchema,
	ReportPreviewSchema,
} from "../domain/report";
import type { Bindings } from "../index";
import { getPrismaClient } from "../lib/prisma";
import { APIError } from "../middleware/error";
import { type AuthVariables, getOrganizationId } from "../middleware/auth";

export const reportsRouter = new Hono<{
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
	const repository = new ReportRepository(prisma);
	return new ReportService(repository);
}

function handleServiceError(error: unknown): never {
	if (error instanceof Error) {
		if (error.message === "REPORT_NOT_FOUND") {
			throw new APIError(404, "Report not found");
		}
		if (error.message === "REPORT_ALREADY_EXISTS_FOR_PERIOD") {
			throw new APIError(
				409,
				"A report already exists for this period and type",
			);
		}
		if (error.message === "CANNOT_DELETE_NON_DRAFT_REPORT") {
			throw new APIError(400, "Only draft reports can be deleted");
		}
		if (error.message === "ONLY_MONTHLY_REPORTS_CAN_BE_SUBMITTED") {
			throw new APIError(400, "Only monthly reports can be submitted to SAT");
		}
		if (error.message === "REPORT_MUST_BE_GENERATED_BEFORE_SUBMISSION") {
			throw new APIError(400, "Report must be generated before submission");
		}
		if (error.message === "ONLY_MONTHLY_REPORTS_CAN_BE_ACKNOWLEDGED") {
			throw new APIError(
				400,
				"Only monthly reports can be acknowledged by SAT",
			);
		}
		if (error.message === "REPORT_MUST_BE_SUBMITTED_BEFORE_ACKNOWLEDGMENT") {
			throw new APIError(400, "Report must be submitted before acknowledgment");
		}
	}
	throw error;
}

// GET /reports - List reports
reportsRouter.get("/", async (c) => {
	const organizationId = getOrganizationId(c);
	const url = new URL(c.req.url);
	const queryObject = Object.fromEntries(url.searchParams.entries());
	const filters = parseWithZod(ReportFilterSchema, queryObject);

	const service = getService(c);
	const result = await service
		.list(organizationId, filters)
		.catch(handleServiceError);

	return c.json(result);
});

// GET /reports/preview - Preview alerts for a potential report
reportsRouter.get("/preview", async (c) => {
	const organizationId = getOrganizationId(c);
	const url = new URL(c.req.url);
	const queryObject = Object.fromEntries(url.searchParams.entries());
	const input = parseWithZod(ReportPreviewSchema, queryObject);

	const service = getService(c);
	const result = await service
		.preview(organizationId, input)
		.catch(handleServiceError);

	return c.json(result);
});

// GET /reports/:id - Get a single report
reportsRouter.get("/:id", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(ReportIdParamSchema, c.req.param());

	const service = getService(c);
	const report = await service
		.getWithSummary(organizationId, params.id)
		.catch(handleServiceError);

	return c.json(report);
});

// POST /reports - Create a new report
reportsRouter.post("/", async (c) => {
	const organizationId = getOrganizationId(c);
	const user = c.get("user");
	const userId = user?.id;
	const body = await c.req.json();
	const payload = parseWithZod(ReportCreateSchema, body);

	const service = getService(c);
	const created = await service
		.create(payload, organizationId, userId)
		.catch(handleServiceError);

	return c.json(created, 201);
});

// PATCH /reports/:id - Update a report
reportsRouter.patch("/:id", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(ReportIdParamSchema, c.req.param());
	const body = await c.req.json();
	const payload = parseWithZod(ReportPatchSchema, body);

	if (Object.keys(payload).length === 0) {
		throw new APIError(400, "Payload is empty");
	}

	const service = getService(c);
	const updated = await service
		.patch(organizationId, params.id, payload)
		.catch(handleServiceError);

	return c.json(updated);
});

// DELETE /reports/:id - Delete a draft report
reportsRouter.delete("/:id", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(ReportIdParamSchema, c.req.param());

	const service = getService(c);
	await service.delete(organizationId, params.id).catch(handleServiceError);

	return c.body(null, 204);
});

// POST /reports/:id/generate - Generate file for a report
reportsRouter.post("/:id/generate", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(ReportIdParamSchema, c.req.param());

	const service = getService(c);
	const report = await service
		.get(organizationId, params.id)
		.catch(handleServiceError);

	if (report.status !== "DRAFT") {
		throw new APIError(400, "Report has already been generated");
	}

	// Get alerts for the report
	const alerts = await service.getAlertsForReport(organizationId, params.id);

	if (alerts.length === 0) {
		throw new APIError(400, "Report has no alerts to include");
	}

	// Generate based on report type
	if (report.type === "MONTHLY") {
		// MONTHLY reports generate both XML (for SAT) and PDF (for internal use)
		// TODO: Implement XML and PDF generation with R2 upload
		// For now, return a placeholder response
		return c.json({
			message: "XML and PDF generation will be implemented with R2 bucket",
			reportId: report.id,
			alertCount: alerts.length,
			types: ["XML", "PDF"],
		});
	} else {
		// QUARTERLY/ANNUAL/CUSTOM reports generate PDF only
		// TODO: Implement PDF generation with R2 upload
		return c.json({
			message: "PDF generation will be implemented with R2 bucket",
			reportId: report.id,
			alertCount: alerts.length,
			types: ["PDF"],
		});
	}
});

// GET /reports/:id/download - Get download URL for generated file
// For MONTHLY reports, use ?format=xml or ?format=pdf (defaults to xml)
reportsRouter.get("/:id/download", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(ReportIdParamSchema, c.req.param());
	const url = new URL(c.req.url);
	const format = url.searchParams.get("format") ?? "xml";

	const service = getService(c);
	const report = await service
		.get(organizationId, params.id)
		.catch(handleServiceError);

	if (report.status === "DRAFT") {
		throw new APIError(400, "Report has not been generated yet");
	}

	let fileUrl: string | null | undefined;
	let fileSize: number | null | undefined;
	let fileFormat: "xml" | "pdf";

	if (report.type === "MONTHLY") {
		// MONTHLY reports have both XML and PDF
		if (format === "pdf") {
			fileUrl = report.pdfFileUrl;
			fileSize = report.pdfFileSize;
			fileFormat = "pdf";
		} else {
			fileUrl = report.xmlFileUrl;
			fileSize = report.fileSize;
			fileFormat = "xml";
		}
	} else {
		// Other report types only have PDF
		fileUrl = report.pdfFileUrl;
		fileSize = report.pdfFileSize ?? report.fileSize;
		fileFormat = "pdf";
	}

	if (!fileUrl) {
		throw new APIError(
			404,
			`Report ${fileFormat.toUpperCase()} file not found`,
		);
	}

	return c.json({ fileUrl, fileSize, format: fileFormat });
});

// POST /reports/:id/submit - Mark monthly report as submitted to SAT
reportsRouter.post("/:id/submit", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(ReportIdParamSchema, c.req.param());
	const body = await c.req.json().catch(() => ({}));
	const satFolioNumber = body.satFolioNumber as string | undefined;

	const service = getService(c);
	const updated = await service
		.markAsSubmitted(organizationId, params.id, satFolioNumber)
		.catch(handleServiceError);

	return c.json(updated);
});

// POST /reports/:id/acknowledge - Mark monthly report as acknowledged by SAT
reportsRouter.post("/:id/acknowledge", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(ReportIdParamSchema, c.req.param());
	const body = await c.req.json();
	const satFolioNumber = body.satFolioNumber as string;

	if (!satFolioNumber) {
		throw new APIError(400, "SAT folio number is required");
	}

	const service = getService(c);
	const updated = await service
		.markAsAcknowledged(organizationId, params.id, satFolioNumber)
		.catch(handleServiceError);

	return c.json(updated);
});
