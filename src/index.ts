import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import pkg from "../package.json";
import { getOpenApiInfo, getScalarHtml, type AppMeta } from "./app-meta";
import { errorHandler } from "./middleware/error";
import { createRouter } from "./routes";

export type Bindings = {
	DB: D1Database;
	CACHE?: KVNamespace;
	ENVIRONMENT?: string;
	API_VERSION?: string;
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
	const openApiInfo = getOpenApiInfo(appMeta);
	return c.json({
		openapi: "3.1.0",
		info: openApiInfo,
		paths: {},
	});
});

app.get("/docsz", (c) => {
	return c.html(getScalarHtml(appMeta));
});

// API routes
const apiRouter = createRouter();
app.route("/api/v1", apiRouter);

// Error handler (must be registered last)
app.onError(errorHandler);

// Export the Hono app
export default app;
