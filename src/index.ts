import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import pkg from "../package.json";
import { getScalarHtml, type AppMeta } from "./app-meta";
import { errorHandler } from "./middleware/error";
import { openAPISpec } from "./openapi";
import { createRouter } from "./routes";
import { handleServiceBindingRequest } from "./lib/alert-service-binding";
import type { AlertJob } from "./lib/alert-queue";

export type Bindings = {
	DB: D1Database;
	CACHE?: KVNamespace;
	R2_BUCKET?: R2Bucket; // R2 bucket for storing SAT XML files
	ENVIRONMENT?: string;
	API_VERSION?: string;
	AUTH_SERVICE_URL?: string;
	AUTH_JWKS_CACHE_TTL?: string;
	SAT_CLAVE_SUJETO_OBLIGADO?: string; // 12-character obligated subject identifier (RFC)
	SAT_CLAVE_ACTIVIDAD?: string; // Activity code (e.g., "VEH" for vehicle notices)
	SAT_CLAVE_ENTIDAD_COLEGIADA?: string; // Optional collegiate entity identifier
	/** Service binding to auth-svc for worker-to-worker communication */
	AUTH_SERVICE?: Fetcher;
	/** Queue for alert detection jobs */
	ALERT_DETECTION_QUEUE?: Queue<AlertJob>;
	/** Secret token for synthetic data generation HTTP endpoint (local development only) */
	SYNTHETIC_DATA_SECRET?: string;
};

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
app.use(
	"*",
	cors({
		origin: "*",
		allowHeaders: ["Content-Type", "Authorization"],
		allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
		credentials: true,
	}),
);

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
app.all("/clients/:id/transactions", async (c) => {
	return handleServiceBindingRequest(c.req.raw, c.env);
});
app.all("/clients/:id", async (c) => {
	return handleServiceBindingRequest(c.req.raw, c.env);
});
app.all("/transactions", async (c) => {
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

		if (models.includes("transactions")) {
			syntheticOptions.transactions = {
				count: options?.transactions?.count ?? 50,
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
					transactionsCreated: result.transactions.created,
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

// Export the Hono app
export default app;
