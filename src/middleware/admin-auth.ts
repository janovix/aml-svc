import type { Context, MiddlewareHandler } from "hono";
import * as jose from "jose";
import * as Sentry from "@sentry/cloudflare";

import type { Bindings } from "../types";

/**
 * Extended JWT payload with admin role
 * This matches the JWT claims defined in auth-svc's jwt plugin configuration
 */
export interface AdminTokenPayload {
	sub: string;
	email?: string;
	name?: string;
	/** User role from auth-svc (admin, user, etc.) */
	role?: string;
	organizationId?: string | null;
}

/**
 * Admin user context attached to requests
 */
export interface AdminUser {
	id: string;
	email?: string;
	name?: string;
	role: string;
}

/**
 * Extended bindings for admin auth
 */
export type AdminAuthBindings = Bindings & {
	AUTH_JWKS_CACHE_TTL?: string;
	AUTH_SERVICE: Fetcher;
};

/**
 * Variables for admin routes
 */
export interface AdminAuthVariables {
	adminUser: AdminUser;
	token: string;
}

const DEFAULT_JWKS_CACHE_TTL = 3600;

let cachedJWKS: jose.JSONWebKeySet | null = null;
let cachedJWKSExpiry: number = 0;

/**
 * Clears the in-memory JWKS cache (useful for testing)
 */
export function clearJWKSCache(): void {
	cachedJWKS = null;
	cachedJWKSExpiry = 0;
}

async function getJWKS(
	cacheTtl: number,
	authServiceBinding: Fetcher,
): Promise<jose.JSONWebKeySet> {
	const now = Date.now();

	if (cachedJWKS && cachedJWKSExpiry > now) {
		return cachedJWKS;
	}

	// Construct JWKS URL with internal hostname
	// When using service binding, the hostname doesn't affect routing but is used for Host header
	const jwksUrl = "http://internal/api/auth/jwks";

	// Use service binding for direct worker-to-worker communication
	// The hostname in the URL is used for the Host header but routing is handled by the binding
	const response = await authServiceBinding.fetch(
		new Request(jwksUrl, {
			headers: { Accept: "application/json" },
		}),
	);

	if (!response.ok) {
		throw new Error(
			`Failed to fetch JWKS from service binding: ${response.status} ${response.statusText}`,
		);
	}

	const jwks = (await response.json()) as jose.JSONWebKeySet;

	if (!jwks.keys || !Array.isArray(jwks.keys) || jwks.keys.length === 0) {
		throw new Error("Invalid JWKS: no keys found");
	}

	cachedJWKS = jwks;
	cachedJWKSExpiry = now + cacheTtl * 1000;

	return jwks;
}

async function verifyToken(
	token: string,
	cacheTtl: number,
	authServiceBinding: Fetcher,
): Promise<AdminTokenPayload> {
	const jwks = await getJWKS(cacheTtl, authServiceBinding);
	const jwksInstance = jose.createLocalJWKSet(jwks);
	const { payload } = await jose.jwtVerify(token, jwksInstance);

	if (!payload.sub) {
		throw new Error("Token missing required 'sub' claim");
	}

	return payload as AdminTokenPayload;
}

function extractBearerToken(authHeader: string | undefined): string | null {
	if (!authHeader) {
		return null;
	}

	const parts = authHeader.split(" ");
	if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
		return null;
	}

	return parts[1];
}

/**
 * Validates that a role string represents an admin role.
 * Supports both single role and comma-separated multiple roles.
 *
 * @param role - The role string from JWT payload
 * @returns true if user has admin role
 */
function isAdminRole(role: string | undefined): boolean {
	if (!role) return false;
	// Better-auth stores multiple roles as comma-separated string
	const roles = role.split(",").map((r) => r.trim().toLowerCase());
	return roles.includes("admin");
}

/**
 * Admin authentication middleware
 * Verifies JWT and checks that user has admin role
 */
export function adminAuthMiddleware(): MiddlewareHandler<{
	Bindings: AdminAuthBindings;
	Variables: AdminAuthVariables;
}> {
	return async (c, next) => {
		const authHeader = c.req.header("Authorization");
		const token = extractBearerToken(authHeader);

		// Skip JWT verification in test environment but still require token
		if (c.env.ENVIRONMENT === "test" && token) {
			// Set a mock admin user for tests
			const mockAdminUser: AdminUser = {
				id: "test-admin-id",
				email: "admin@example.com",
				name: "Test Admin",
				role: "admin",
			};
			c.set("adminUser", mockAdminUser);
			c.set("token", token);
			return next();
		}

		if (!token) {
			return c.json(
				{
					success: false,
					error: "Unauthorized",
					message: "Missing or invalid Authorization header",
				},
				401,
			);
		}

		const authServiceBinding = c.env.AUTH_SERVICE;
		if (!authServiceBinding) {
			Sentry.captureMessage("AUTH_SERVICE binding is not configured", {
				level: "error",
				tags: { context: "admin-auth-middleware-missing-binding" },
			});
			return c.json(
				{
					success: false,
					error: "Configuration Error",
					message: "Authentication service not configured",
				},
				500,
			);
		}

		const cacheTtl = c.env.AUTH_JWKS_CACHE_TTL
			? parseInt(c.env.AUTH_JWKS_CACHE_TTL, 10)
			: DEFAULT_JWKS_CACHE_TTL;

		try {
			// Verify JWT and extract payload
			const payload = await verifyToken(token, cacheTtl, authServiceBinding);

			// Check admin role from JWT payload
			// The role is included in the JWT by auth-svc's jwt plugin configuration
			if (!isAdminRole(payload.role)) {
				return c.json(
					{
						success: false,
						error: "Forbidden",
						message: "Admin access required",
					},
					403,
				);
			}

			const adminUser: AdminUser = {
				id: payload.sub,
				email: payload.email,
				name: payload.name,
				role: payload.role ?? "user",
			};

			c.set("adminUser", adminUser);
			c.set("token", token);

			return next();
		} catch (error) {
			if (error instanceof jose.errors.JWTExpired) {
				return c.json(
					{
						success: false,
						error: "Token Expired",
						message: "The authentication token has expired",
					},
					401,
				);
			}

			if (
				error instanceof jose.errors.JWSSignatureVerificationFailed ||
				error instanceof jose.errors.JWSInvalid
			) {
				return c.json(
					{
						success: false,
						error: "Invalid Signature",
						message: "Token signature verification failed",
					},
					401,
				);
			}

			Sentry.captureException(error, {
				tags: { context: "admin-auth-middleware-error" },
			});

			if (
				error instanceof Error &&
				error.message.includes("Failed to fetch JWKS")
			) {
				return c.json(
					{
						success: false,
						error: "Service Unavailable",
						message: "Authentication service temporarily unavailable",
					},
					503,
				);
			}

			return c.json(
				{
					success: false,
					error: "Unauthorized",
					message: "Invalid authentication token",
				},
				401,
			);
		}
	};
}

/**
 * Helper to get the admin user from context
 */
export function getAdminUser(
	c: Context<{ Variables: Partial<AdminAuthVariables> }>,
): AdminUser {
	const user = c.get("adminUser");
	if (!user) {
		throw new Error("Admin user not authenticated");
	}
	return user;
}
