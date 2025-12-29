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

/**
 * Alert job types for queue messages
 */
type AlertJobType = "client.created" | "client.updated" | "transaction.created";

/**
 * Alert job payload for queue messages
 */
interface AlertJob {
	type: AlertJobType;
	clientId: string;
	transactionId?: string;
	timestamp: string;
}

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
app.all("/internal/*", async (c) => {
	return handleServiceBindingRequest(c.req.raw, c.env);
});

// API routes
const apiRouter = createRouter();
app.route("/api/v1", apiRouter);

// Error handler (must be registered last)
app.onError(errorHandler);

// Export the Hono app
export default app;
