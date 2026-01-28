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
import {
	OrganizationSettingsService,
	OrganizationSettingsRepository,
} from "../domain/organization-settings";
import type { Bindings } from "../types";
import { getPrismaClient } from "../lib/prisma";
import { APIError } from "../middleware/error";
import { type AuthVariables, getOrganizationId } from "../middleware/auth";
import { ReportAggregator } from "../lib/report-aggregator";
import {
	generatePdfReportHtml,
	type AlertSummaryForPdf,
} from "../lib/pdf-report-generator";

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

function getOrganizationSettingsService(
	c: Context<{ Bindings: Bindings; Variables: AuthVariables }>,
) {
	const prisma = getPrismaClient(c.env.DB);
	const repository = new OrganizationSettingsRepository(prisma);
	return new OrganizationSettingsService(repository);
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
	const query = parseWithZod(ReportAggregationQuerySchema, queryObject);

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
	const query = parseWithZod(ReportAggregationQuerySchema, queryObject);

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
	const query = parseWithZod(ReportAggregationQuerySchema, queryObject);

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

	// Get organization settings for the organization name and RFC
	const orgSettingsService = getOrganizationSettingsService(c);
	const orgSettings =
		await orgSettingsService.getByOrganizationId(organizationId);

	// Get the aggregation data for the report
	const aggregator = getAggregator(c);
	const aggregation = await aggregator.aggregate({
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

	// Get alerts for PDF detail table
	const prisma = getPrismaClient(c.env.DB);
	const alerts = await prisma.alert.findMany({
		where: {
			organizationId,
			createdAt: {
				gte: new Date(report.periodStart),
				lte: new Date(report.periodEnd),
			},
		},
		include: {
			alertRule: true,
			client: true,
		},
		orderBy: { createdAt: "desc" },
		take: 100, // Limit for PDF size
	});

	// Map alerts to PDF format
	const alertsForPdf: AlertSummaryForPdf[] = alerts.map((alert) => ({
		id: alert.id,
		alertRuleId: alert.alertRuleId,
		alertRuleName: alert.alertRule?.name || alert.alertRuleId,
		clientId: alert.clientId || "",
		clientName: alert.client
			? alert.client.businessName ||
				`${alert.client.firstName || ""} ${alert.client.lastName || ""}`.trim()
			: "Unknown",
		severity: alert.severity,
		status: alert.status,
		createdAt: alert.createdAt.toISOString(),
		amount: undefined, // Transaction amount not available via relation
	}));

	// Generate the HTML report - extract report entity without alertSummary
	const generatedAt = new Date().toISOString();
	const { alertSummary: _alertSummary, ...reportEntity } = report;
	const htmlContent = generatePdfReportHtml({
		report: reportEntity,
		organizationName:
			orgSettings?.obligatedSubjectKey || `Organization ${organizationId}`,
		organizationRfc: orgSettings?.activityKey || "N/A",
		alerts: alertsForPdf,
		aggregation,
		generatedAt,
	});

	// Upload to R2 if bucket is available
	let pdfFileUrl: string | null = null;
	const fileSize = new TextEncoder().encode(htmlContent).length;

	if (c.env.R2_BUCKET) {
		const filename = `reports/${organizationId}/${report.id}_${report.periodStart.substring(0, 10)}_${report.periodEnd.substring(0, 10)}.html`;
		await c.env.R2_BUCKET.put(filename, htmlContent, {
			httpMetadata: {
				contentType: "text/html; charset=utf-8",
			},
		});
		pdfFileUrl = filename;
	}

	// Mark the report as generated with the file URL
	await service.markAsGenerated(organizationId, params.id, {
		pdfFileUrl,
		fileSize,
	});

	return c.json({
		message: "PDF generation complete",
		reportId: report.id,
		alertCount,
		types: ["PDF"],
		...(pdfFileUrl && { fileUrl: pdfFileUrl }),
	});
});

// GET /reports/:id/download - Download the generated report file
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
		throw new APIError(404, "Report file not found");
	}

	// Check if R2 bucket is available
	if (!c.env.R2_BUCKET) {
		// Fallback: return file info for external download
		return c.json({
			fileUrl: report.pdfFileUrl,
			fileSize: report.fileSize,
			format: "html",
		});
	}

	// Try to fetch from R2
	const file = await c.env.R2_BUCKET.get(report.pdfFileUrl);

	if (file) {
		// Extract filename for Content-Disposition
		const urlParts = report.pdfFileUrl.split("/");
		const filename = urlParts[urlParts.length - 1];

		return new Response(file.body, {
			headers: {
				"Content-Type": "text/html; charset=utf-8",
				"Content-Disposition": `attachment; filename="${filename}"`,
				"Content-Length": String(file.size),
			},
		});
	}

	// File not found in R2
	throw new APIError(404, "Report file not found in storage");
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
