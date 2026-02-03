import { type MiddlewareHandler } from "hono";
import { cors } from "hono/cors";

/**
 * CORS middleware for cross-origin requests from frontend apps.
 * Uses TRUSTED_ORIGINS environment variable to configure allowed origins per environment.
 *
 * The TRUSTED_ORIGINS variable should be a comma-separated list of allowed origins:
 * Example: "https://aml.janovix.com,https://auth.janovix.com,http://localhost:3000"
 */
export function corsMiddleware(): MiddlewareHandler {
	return async (c, next) => {
		const trustedOriginsStr = c.env.TRUSTED_ORIGINS || "";

		// Parse comma-separated origins and trim whitespace
		const trustedOrigins = trustedOriginsStr
			.split(",")
			.map((origin: string) => origin.trim())
			.filter((origin: string) => origin.length > 0);

		// If no trusted origins are configured, deny all CORS requests
		// This is a security-first approach
		const allowedOrigins = trustedOrigins.length > 0 ? trustedOrigins : [];

		// Apply CORS middleware with parsed origins
		const corsHandler = cors({
			origin: allowedOrigins,
			allowHeaders: ["Content-Type", "Authorization"],
			allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
			exposeHeaders: ["Content-Length", "X-Request-Id"],
			maxAge: 600,
			credentials: true,
		});

		return corsHandler(c, next);
	};
}
