import type { Context, MiddlewareHandler } from "hono";
import * as jose from "jose";

import type { Bindings } from "../types";

/**
 * JWT payload structure from Better Auth
 */
export interface AuthTokenPayload {
	/** Subject - User ID */
	sub: string;
	/** Issuer - Auth service URL */
	iss?: string;
	/** Audience */
	aud?: string | string[];
	/** Expiration time (Unix timestamp) */
	exp?: number;
	/** Issued at (Unix timestamp) */
	iat?: number;
	/** JWT ID */
	jti?: string;
	/** User email (if included in token) */
	email?: string;
	/** User name (if included in token) */
	name?: string;
	/** Active organization ID (from better-auth organization plugin) */
	organizationId?: string | null;
}

/**
 * Authenticated user context attached to requests
 */
export interface AuthUser {
	id: string;
	email?: string;
	name?: string;
}

/**
 * Organization context extracted from JWT
 */
export interface AuthOrganization {
	id: string;
}

/**
 * Extended bindings with auth context
 */
export type AuthBindings = Bindings & {
	AUTH_SERVICE_URL: string;
	AUTH_JWKS_CACHE_TTL?: string;
	/** Service binding to auth-svc for direct worker-to-worker communication */
	AUTH_SERVICE?: Fetcher;
	/** Environment name (local, development, staging, production) */
	ENVIRONMENT?: string;
};

/**
 * Variables attached to request context
 */
export interface AuthVariables {
	user: AuthUser;
	organization: AuthOrganization | null;
	token: string;
	tokenPayload: AuthTokenPayload;
}

const DEFAULT_JWKS_CACHE_TTL = 3600; // 1 hour in seconds

/**
 * In-memory JWKS cache for the worker instance
 * This avoids fetching JWKS on every request within the same worker instance
 */
let cachedJWKS: jose.JSONWebKeySet | null = null;
let cachedJWKSExpiry: number = 0;

/**
 * Fetches JWKS from auth-svc with in-memory caching
 * Uses service binding if available for direct worker-to-worker communication
 */
async function getJWKS(
	authServiceUrl: string,
	cacheTtl: number,
	authServiceBinding?: Fetcher,
	environment?: string,
): Promise<jose.JSONWebKeySet> {
	const now = Date.now();

	// Check in-memory cache
	if (cachedJWKS && cachedJWKSExpiry > now) {
		return cachedJWKS;
	}

	// Fetch from auth service
	const jwksUrl = `${authServiceUrl}/api/auth/jwks`;
	let response: Response;

	// Service bindings don't work reliably in local development with wrangler dev
	// Skip service binding in local environment and use regular HTTP fetch instead
	const useServiceBinding = authServiceBinding && environment !== "local";

	if (useServiceBinding) {
		// Use service binding for direct worker-to-worker communication
		// This bypasses the public URL and avoids routing issues
		response = await authServiceBinding.fetch(
			new Request(jwksUrl, {
				headers: { Accept: "application/json" },
			}),
		);
	} else {
		// Fallback to regular fetch with cf options
		response = await fetch(jwksUrl, {
			headers: { Accept: "application/json" },
			cf: {
				cacheTtl: 0,
				cacheEverything: false,
			},
		} as RequestInit);
	}

	if (!response.ok) {
		throw new Error(
			`Failed to fetch JWKS from ${jwksUrl}: ${response.status} ${response.statusText}`,
		);
	}

	const jwks = (await response.json()) as jose.JSONWebKeySet;

	// Validate JWKS structure
	if (!jwks.keys || !Array.isArray(jwks.keys) || jwks.keys.length === 0) {
		throw new Error("Invalid JWKS: no keys found");
	}

	// Update in-memory cache
	cachedJWKS = jwks;
	cachedJWKSExpiry = now + cacheTtl * 1000;

	return jwks;
}

/**
 * Verifies a JWT using JWKS from auth-svc
 * Exported for use in SSE endpoints where EventSource can't send headers
 */
export async function verifyToken(
	token: string,
	authServiceUrl: string,
	cacheTtl: number,
	authServiceBinding?: Fetcher,
	environment?: string,
): Promise<AuthTokenPayload> {
	const jwks = await getJWKS(
		authServiceUrl,
		cacheTtl,
		authServiceBinding,
		environment,
	);

	// Create a local JWKS for verification
	const jwksInstance = jose.createLocalJWKSet(jwks);

	// Verify the token
	const { payload } = await jose.jwtVerify(token, jwksInstance);

	// Validate required claims
	if (!payload.sub) {
		throw new Error("Token missing required 'sub' claim");
	}

	return payload as AuthTokenPayload;
}

/**
 * Extracts Bearer token from Authorization header
 */
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
 * Creates an authentication middleware that verifies JWTs signed by auth-svc
 *
 * @param options - Configuration options
 * @param options.optional - If true, allows unauthenticated requests to pass through
 * @param options.requireOrganization - If true, requires an active organization in the JWT
 * @returns Hono middleware handler
 *
 * @example
 * // Require authentication for all routes
 * router.use("*", authMiddleware());
 *
 * // Optional authentication (user info available if token present)
 * router.use("*", authMiddleware({ optional: true }));
 *
 * // Require authentication AND organization context
 * router.use("*", authMiddleware({ requireOrganization: true }));
 */
export function authMiddleware(options?: {
	optional?: boolean;
	requireOrganization?: boolean;
}): MiddlewareHandler<{
	Bindings: AuthBindings;
	Variables: AuthVariables;
}> {
	const { optional = false, requireOrganization = false } = options ?? {};

	return async (c, next) => {
		const authHeader = c.req.header("Authorization");
		const token = extractBearerToken(authHeader);

		// No token provided
		if (!token) {
			if (optional) {
				return next();
			}
			return c.json(
				{
					success: false,
					error: "Unauthorized",
					message: "Missing or invalid Authorization header",
				},
				401,
			);
		}

		// Validate environment
		const authServiceUrl = c.env.AUTH_SERVICE_URL;
		if (!authServiceUrl) {
			console.error("AUTH_SERVICE_URL is not configured");
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

		// Get the service binding for direct worker-to-worker communication
		const authServiceBinding = c.env.AUTH_SERVICE;

		try {
			const payload = await verifyToken(
				token,
				authServiceUrl,
				cacheTtl,
				authServiceBinding,
				c.env.ENVIRONMENT,
			);

			// Attach user info to context
			const user: AuthUser = {
				id: payload.sub,
				email: payload.email,
				name: payload.name,
			};

			// Extract organization context from JWT (set by better-auth organization plugin)
			const organization: AuthOrganization | null = payload.organizationId
				? { id: payload.organizationId }
				: null;

			c.set("user", user);
			c.set("organization", organization);
			c.set("token", token);
			c.set("tokenPayload", payload);

			// Check if organization is required but not present
			// Return 409 Conflict to distinguish from 403 Forbidden (access denied)
			// This allows the frontend to detect "no org selected" vs "unauthorized"
			if (requireOrganization && !organization) {
				return c.json(
					{
						success: false,
						error: "Organization Required",
						code: "ORGANIZATION_REQUIRED",
						message:
							"An active organization must be selected. Please switch to an organization first.",
					},
					409,
				);
			}

			return next();
		} catch (error) {
			// Handle specific JWT errors
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

			if (error instanceof jose.errors.JWTClaimValidationFailed) {
				return c.json(
					{
						success: false,
						error: "Invalid Token",
						message: "Token validation failed",
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

			// Log unexpected errors
			console.error("Auth middleware error:", error);

			// For JWKS fetch errors, return 503
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

			// Generic auth error
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
 * Helper to get the authenticated user from context
 * Throws if user is not authenticated
 */
export function getAuthUser(
	c: Context<{ Variables: Partial<AuthVariables> }>,
): AuthUser {
	const user = c.get("user");
	if (!user) {
		throw new Error("User not authenticated");
	}
	return user;
}

/**
 * Helper to get the authenticated user from context, or null if not authenticated
 */
export function getAuthUserOrNull(
	c: Context<{ Variables: Partial<AuthVariables> }>,
): AuthUser | null {
	return c.get("user") ?? null;
}

/**
 * Helper to get the organization context from JWT
 * Throws if organization is not set (user hasn't selected an organization)
 */
export function getAuthOrganization(
	c: Context<{ Variables: Partial<AuthVariables> }>,
): AuthOrganization {
	const organization = c.get("organization");
	if (!organization) {
		throw new Error(
			"Organization not set. User must select an active organization.",
		);
	}
	return organization;
}

/**
 * Helper to get the organization context from JWT, or null if not set
 */
export function getAuthOrganizationOrNull(
	c: Context<{ Variables: Partial<AuthVariables> }>,
): AuthOrganization | null {
	return c.get("organization") ?? null;
}

/**
 * Helper to get the organization ID from context
 * Throws if organization is not set
 */
export function getOrganizationId<
	E extends { Variables?: Partial<AuthVariables> | AuthVariables },
>(c: Context<E>): string {
	const organization = (
		c as unknown as Context<{ Variables: Partial<AuthVariables> }>
	).get("organization");
	if (!organization) {
		throw new Error(
			"Organization not set. User must select an active organization.",
		);
	}
	return organization.id;
}

/**
 * Helper to get the organization ID from context, or null if not set
 */
export function getOrganizationIdOrNull(
	c: Context<{ Variables: Partial<AuthVariables> }>,
): string | null {
	return getAuthOrganizationOrNull(c)?.id ?? null;
}

/**
 * Clears the in-memory JWKS cache
 * Useful for testing or when keys need to be refreshed immediately
 */
export function clearJWKSCache(): void {
	cachedJWKS = null;
	cachedJWKSExpiry = 0;
}
