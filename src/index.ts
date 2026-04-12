import { Hono } from "hono";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import * as Sentry from "@sentry/cloudflare";
import pkg from "../package.json";
import { getScalarHtml, type AppMeta } from "./app-meta";
import { errorHandler } from "./middleware/error";
import { corsMiddleware } from "./middleware/cors";
import { openAPISpec } from "./openapi";
import { createRouter } from "./routes";
import { handleServiceBindingRequest } from "./lib/alert-service-binding";
import type { Bindings } from "./types";

// Start a Hono app
const app = new Hono<{ Bindings: Bindings }>();

const appMeta: AppMeta = {
	name: pkg.name,
	version: pkg.version,
	description: pkg.description,
};

// Global middleware
app.use("*", logger());
app.use("*", prettyJSON());
app.use("*", corsMiddleware());

app.get("/", (c) => {
	if (c.req.header("x-force-error") === "1") {
		throw new Error("Forced error");
	}

	return c.json({
		message: "AML Core API",
		name: appMeta.name,
		version: appMeta.version,
		documentation: "/docsz",
		health: "/healthz",
	});
});

app.get("/healthz", (c) => {
	return c.json({
		ok: true,
		status: "ok",
		environment: c.env.ENVIRONMENT || "development",
		version: c.env.API_VERSION || appMeta.version,
		timestamp: new Date().toISOString(),
	});
});

app.get("/openapi.json", (c) => {
	return c.json(openAPISpec);
});

app.get("/docsz", (c) => {
	return c.html(getScalarHtml(appMeta));
});

// Service binding routes (internal worker-to-worker communication)
// Note: When using service bindings with https://internal/..., Cloudflare strips the /internal prefix
// So we need to handle both /internal/* routes (for direct HTTP calls) and direct paths (for service bindings)

app.all("/internal/*", async (c) => {
	return handleServiceBindingRequest(c.req.raw, c.env);
});

// Service binding routes without /internal prefix (for Cloudflare service bindings)
// These routes handle requests that come through service bindings where /internal is stripped
app.all("/alert-rules/active", async (c) => {
	return handleServiceBindingRequest(c.req.raw, c.env);
});
app.all("/alert-rules/all-active", async (c) => {
	return handleServiceBindingRequest(c.req.raw, c.env);
});
app.all("/alerts", async (c) => {
	return handleServiceBindingRequest(c.req.raw, c.env);
});
app.all("/uma-values/active", async (c) => {
	return handleServiceBindingRequest(c.req.raw, c.env);
});

// Parameterized service binding routes using wildcard patterns
// Hono will match these patterns and pass them to the handler
// IMPORTANT: More specific routes must be registered before less specific ones
app.all("/alert-rules/:id/config/:key", async (c) => {
	return handleServiceBindingRequest(c.req.raw, c.env);
});
app.all("/clients/:id/operations", async (c) => {
	return handleServiceBindingRequest(c.req.raw, c.env);
});
app.all("/clients/:id", async (c) => {
	return handleServiceBindingRequest(c.req.raw, c.env);
});
app.all("/operations", async (c) => {
	return handleServiceBindingRequest(c.req.raw, c.env);
});
// Organization settings routes for service binding access from auth-svc
// More specific route must come before the generic one
app.all("/organization-settings/:organizationId/self-service", async (c) => {
	return handleServiceBindingRequest(c.req.raw, c.env);
});
app.all("/organization-settings/:organizationId", async (c) => {
	return handleServiceBindingRequest(c.req.raw, c.env);
});

// Screening routes for service binding access from screening-refresh-worker
app.all("/clients/stale-screening", async (c) => {
	return handleServiceBindingRequest(c.req.raw, c.env);
});
app.all("/clients/:id/watchlist-query", async (c) => {
	return handleServiceBindingRequest(c.req.raw, c.env);
});
// Callback route for watchlist-svc async screening results
app.all("/screening-callback", async (c) => {
	return handleServiceBindingRequest(c.req.raw, c.env);
});

// Internal synthetic data generation endpoint (for local development only)
// Note: GitHub Actions uses the script directly, not this endpoint
// Only accessible with SYNTHETIC_DATA_SECRET token
app.post("/internal/synthetic-data", async (c) => {
	const secret = c.req.header("X-Synthetic-Data-Secret");
	const expectedSecret = c.env.SYNTHETIC_DATA_SECRET;

	if (!expectedSecret) {
		return c.json(
			{
				success: false,
				error: "Configuration Error",
				message: "Synthetic data generation is not configured",
			},
			500,
		);
	}

	if (secret !== expectedSecret) {
		return c.json(
			{
				success: false,
				error: "Unauthorized",
				message: "Invalid secret token",
			},
			401,
		);
	}

	// Check if we're in production (should not allow in production)
	const environment = c.env.ENVIRONMENT || "development";
	if (environment === "production" || environment === "prod") {
		return c.json(
			{
				success: false,
				error: "Forbidden",
				message: "Synthetic data generation is not allowed in production",
			},
			403,
		);
	}

	try {
		const body = await c.req.json();
		const { userId, organizationId, models, options } = body;

		if (!userId || !organizationId || !models || !Array.isArray(models)) {
			return c.json(
				{
					success: false,
					error: "Validation Error",
					message: "userId, organizationId, and models are required",
				},
				400,
			);
		}

		// Import the generator dynamically to avoid circular dependencies
		const syntheticDataModule = await import("./lib/synthetic-data-generator");
		const { getPrismaClient } = await import("./lib/prisma");

		const prisma = getPrismaClient(c.env.DB);
		const generator = new syntheticDataModule.SyntheticDataGenerator(
			prisma,
			organizationId,
		);

		// Build options based on requested models
		const syntheticOptions: {
			clients?: {
				count: number;
				includeDocuments?: boolean;
				includeAddresses?: boolean;
			};
			operations?: {
				count: number;
				perClient?: number;
				skipClients?: number;
			};
			/** @deprecated Use operations instead */
			transactions?: {
				count: number;
				perClient?: number;
			};
		} = {};

		if (models.includes("clients")) {
			syntheticOptions.clients = {
				count: options?.clients?.count ?? 10,
				includeDocuments: options?.clients?.includeDocuments ?? false,
				includeAddresses: options?.clients?.includeAddresses ?? false,
			};
		}

		if (models.includes("operations")) {
			// Default count of 0 — the generator auto-adjusts to cover every client
			syntheticOptions.operations = {
				count: options?.operations?.count ?? 0,
				perClient: options?.operations?.perClient,
				skipClients: options?.operations?.skipClients,
			};
		}

		if (models.includes("transactions")) {
			// Deprecated: map to operations with auto-adjusted count
			syntheticOptions.transactions = {
				count: options?.transactions?.count ?? 0,
				perClient: options?.transactions?.perClient,
			};
		}

		const result = await generator.generate(syntheticOptions);

		return c.json(
			{
				success: true,
				userId,
				generated: result,
				summary: {
					clientsCreated: result.clients.created,
					transactionsCreated: result.transactions.created, // deprecated: use result.operations
				},
			},
			201,
		);
	} catch (error) {
		console.error("Error generating synthetic data:", error);
		if (error instanceof Error) {
			return c.json(
				{
					success: false,
					error: "Generation failed",
					message: error.message,
				},
				500,
			);
		}
		return c.json(
			{
				success: false,
				error: "Generation failed",
				message: "Unknown error",
			},
			500,
		);
	}
});

// API routes
const apiRouter = createRouter();
app.route("/api/v1", apiRouter);

// Error handler (must be registered last)
app.onError(errorHandler);

// Sentry is enabled only when SENTRY_DSN environment variable is set.
// Configure it via wrangler secrets: `wrangler secret put SENTRY_DSN`
const sentryWrapped = Sentry.withSentry((env: Bindings) => {
	const versionId = env.CF_VERSION_METADATA?.id;
	return {
		dsn: env.SENTRY_DSN,
		release: versionId,
		environment: env.ENVIRONMENT,
		sendDefaultPii: true,
	};
}, app);

export default {
	fetch: sentryWrapped.fetch,

	async scheduled(
		event: ScheduledEvent,
		env: Bindings,
		ctx: ExecutionContext,
	): Promise<void> {
		const { processNoticeDeadlineNotifications } = await import(
			"./lib/notice-deadline-notifications"
		);

		ctx.waitUntil(
			processNoticeDeadlineNotifications(env, new Date(event.scheduledTime))
				.then((r) =>
					console.log(
						`[scheduled] Notice deadline check: ${r.checked} orgs checked, ${r.notified} notified`,
					),
				)
				.catch((err) =>
					console.error("[scheduled] Notice deadline check failed:", err),
				),
		);

		// KYC session expiration: notify orgs about soon-to-expire sessions & bulk-expire stale ones
		ctx.waitUntil(
			(async () => {
				const { processKycExpirationNotifications } = await import(
					"./lib/kyc-expiration-notifications"
				);
				return processKycExpirationNotifications(
					env,
					new Date(event.scheduledTime),
				);
			})()
				.then((r) =>
					console.log(
						`[scheduled] KYC expiry: ${r.notifiedCount} notified, ${r.expiredCount} expired`,
					),
				)
				.catch((err) =>
					console.error("[scheduled] KYC expiry check failed:", err),
				),
		);

		// Risk review: enqueue reassessment for clients past their review date
		ctx.waitUntil(
			(async () => {
				try {
					const { getPrismaClient } = await import("./lib/prisma");
					const { createRiskQueueService } = await import("./lib/risk-queue");
					const { sendRiskNotification } = await import(
						"./lib/risk-notifications"
					);

					const prisma = getPrismaClient(env.DB);
					const riskQueue = createRiskQueueService(
						env.RISK_ASSESSMENT_QUEUE as
							| Queue<import("./lib/risk-queue").RiskJob>
							| undefined,
					);

					if (!riskQueue.isAvailable()) return;

					const now = new Date(event.scheduledTime);
					const dueClients = await prisma.client.findMany({
						where: {
							nextRiskReview: { lte: now },
							deletedAt: null,
						},
						select: { id: true, organizationId: true },
					});

					if (dueClients.length === 0) return;

					const orgMap = new Map<string, string[]>();
					for (const c of dueClients) {
						const list = orgMap.get(c.organizationId) ?? [];
						list.push(c.id);
						orgMap.set(c.organizationId, list);
					}

					for (const [orgId, clientIds] of orgMap) {
						for (const clientId of clientIds) {
							await riskQueue.queueClientReassess(
								orgId,
								clientId,
								"scheduled_review",
							);
						}
						await sendRiskNotification(env, {
							type: "aml.risk.review_due",
							organizationId: orgId,
							clientsDueCount: clientIds.length,
						});
					}

					console.log(
						`[scheduled] Risk review: ${dueClients.length} clients enqueued across ${orgMap.size} orgs`,
					);
				} catch (err) {
					console.error("[scheduled] Risk review check failed:", err);
				}
			})(),
		);
	},

	async queue(
		batch: MessageBatch,
		env: Bindings,
		_ctx: ExecutionContext,
	): Promise<void> {
		const queueName = batch.queue;

		if (queueName.startsWith("aml-alert-detection")) {
			const { processAlertBatch } = await import("./domain/alert-detection");
			return processAlertBatch(
				batch as MessageBatch<import("./domain/alert-detection").AlertJob>,
				env,
			);
		}

		if (queueName.startsWith("aml-imports")) {
			const { processImportBatch } = await import(
				"./domain/import/queue-processor"
			);
			return processImportBatch(
				batch as MessageBatch<import("./domain/import").ImportJob>,
				env,
			);
		}

		// Default: risk assessment queue
		const { processRiskJob } = await import("./lib/risk-queue-processor");

		for (const message of batch.messages) {
			try {
				await processRiskJob(
					env,
					(message as Message<import("./lib/risk-queue").RiskJob>).body,
				);
				message.ack();
			} catch (err) {
				console.error(`[risk-queue] Failed to process job:`, err);
				message.retry();
			}
		}
	},
};

// Re-export types for backward compatibility
export type { Bindings } from "./types";

// Export RPC entrypoint for service binding callers
export { AmlSvcEntrypoint } from "./entrypoint";
