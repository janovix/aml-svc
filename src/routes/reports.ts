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
	ReportAggregationQuerySchema,
	getTemplateConfigs,
} from "../domain/report";
import type { Bindings } from "../index";
import { getPrismaClient } from "../lib/prisma";
import { APIError } from "../middleware/error";
import { type AuthVariables, getOrganizationId } from "../middleware/auth";
import { ReportAggregator } from "../lib/report-aggregator";

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

function getAggregator(
	c: Context<{ Bindings: Bindings; Variables: AuthVariables }>,
) {
	const prisma = getPrismaClient(c.env.DB);
	return new ReportAggregator(prisma);
}

function handleServiceError(error: unknown): never {
	if (error instanceof Error) {
		if (error.message === "REPORT_NOT_FOUND") {
			throw new APIError(404, "Report not found");
		}
		if (error.message === "CANNOT_DELETE_NON_DRAFT_REPORT") {
			throw new APIError(400, "Only draft reports can be deleted");
		}
	}
	throw error;
}

// GET /reports/templates - List available report templates
reportsRouter.get("/templates", async (c) => {
	const templates = getTemplateConfigs();
	return c.json({ templates });
});

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

// GET /reports/preview - Preview data for a potential report
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

// GET /reports/aggregate/summary - Get executive summary aggregation
reportsRouter.get("/aggregate/summary", async (c) => {
	const organizationId = getOrganizationId(c);
	const url = new URL(c.req.url);
	const queryObject = Object.fromEntries(url.searchParams.entries());
	const query = parseWithZod(ReportAggregationQuerySchema, queryObject);

	const aggregator = getAggregator(c);
	const result = await aggregator.aggregate({
		organizationId,
		periodStart: new Date(query.periodStart),
		periodEnd: new Date(query.periodEnd),
		comparisonPeriodStart: query.comparisonPeriodStart
			? new Date(query.comparisonPeriodStart)
			: undefined,
		comparisonPeriodEnd: query.comparisonPeriodEnd
			? new Date(query.comparisonPeriodEnd)
			: undefined,
		dataSources: ["ALERTS", "TRANSACTIONS", "CLIENTS"],
		clientId: query.clientId,
	});

	return c.json(result);
});

// GET /reports/aggregate/alerts - Get alert metrics aggregation
reportsRouter.get("/aggregate/alerts", async (c) => {
	const organizationId = getOrganizationId(c);
	const url = new URL(c.req.url);
	const queryObject = Object.fromEntries(url.searchParams.entries());
	const query = ReportAggregationQuerySchema.parse(queryObject);

	const aggregator = getAggregator(c);
	const result = await aggregator.aggregateAlerts(
		organizationId,
		new Date(query.periodStart),
		new Date(query.periodEnd),
		undefined,
		query.clientId,
	);

	return c.json(result);
});

// GET /reports/aggregate/transactions - Get transaction metrics aggregation
reportsRouter.get("/aggregate/transactions", async (c) => {
	const organizationId = getOrganizationId(c);
	const url = new URL(c.req.url);
	const queryObject = Object.fromEntries(url.searchParams.entries());
	const query = ReportAggregationQuerySchema.parse(queryObject);

	const aggregator = getAggregator(c);
	const result = await aggregator.aggregateTransactions(
		organizationId,
		new Date(query.periodStart),
		new Date(query.periodEnd),
		undefined,
		query.clientId,
	);

	return c.json(result);
});

// GET /reports/aggregate/clients - Get client metrics aggregation
reportsRouter.get("/aggregate/clients", async (c) => {
	const organizationId = getOrganizationId(c);
	const url = new URL(c.req.url);
	const queryObject = Object.fromEntries(url.searchParams.entries());
	const query = ReportAggregationQuerySchema.parse(queryObject);

	const aggregator = getAggregator(c);
	const result = await aggregator.aggregateClients(
		organizationId,
		new Date(query.periodStart),
		new Date(query.periodEnd),
		query.clientId,
	);

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

// POST /reports/:id/generate - Generate PDF for a report
reportsRouter.post("/:id/generate", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(ReportIdParamSchema, c.req.param());

	const service = getService(c);
	const report = await service
		.getWithSummary(organizationId, params.id)
		.catch(handleServiceError);

	if (report.status !== "DRAFT") {
		throw new APIError(400, "Report has already been generated");
	}

	// Get the alert count from the summary
	const alertCount = report.alertSummary?.total ?? 0;

	// Mark the report as generated
	await service.markAsGenerated(organizationId, params.id, {
		pdfFileUrl: null,
		fileSize: null,
	});

	return c.json({
		message: "PDF generation complete",
		reportId: report.id,
		alertCount,
		types: ["PDF"],
	});
});

// GET /reports/:id/download - Get download URL for generated PDF
reportsRouter.get("/:id/download", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(ReportIdParamSchema, c.req.param());

	const service = getService(c);
	const report = await service
		.get(organizationId, params.id)
		.catch(handleServiceError);

	if (report.status === "DRAFT") {
		throw new APIError(400, "Report has not been generated yet");
	}

	if (!report.pdfFileUrl) {
		throw new APIError(404, "Report PDF file not found");
	}

	return c.json({
		fileUrl: report.pdfFileUrl,
		fileSize: report.fileSize,
		format: "pdf",
	});
});

// GET /reports/:id/aggregation - Get aggregation data for a report
reportsRouter.get("/:id/aggregation", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(ReportIdParamSchema, c.req.param());

	const service = getService(c);
	const report = await service
		.get(organizationId, params.id)
		.catch(handleServiceError);

	const aggregator = getAggregator(c);
	const result = await aggregator.aggregate({
		organizationId,
		periodStart: new Date(report.periodStart),
		periodEnd: new Date(report.periodEnd),
		comparisonPeriodStart: report.comparisonPeriodStart
			? new Date(report.comparisonPeriodStart)
			: undefined,
		comparisonPeriodEnd: report.comparisonPeriodEnd
			? new Date(report.comparisonPeriodEnd)
			: undefined,
		dataSources: report.dataSources,
		filters: report.filters,
		clientId: report.clientId ?? undefined,
	});

	return c.json(result);
});
