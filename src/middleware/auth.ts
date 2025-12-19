import type { Context, MiddlewareHandler } from "hono";
import * as jose from "jose";

import type { Bindings } from "../index";

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
 * Extended bindings with auth context
 */
export type AuthBindings = Bindings & {
	AUTH_SERVICE_URL: string;
	AUTH_JWKS_CACHE_TTL?: string;
};

/**
 * Variables attached to request context
 */
export interface AuthVariables {
	user: AuthUser;
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
 */
async function getJWKS(
	authServiceUrl: string,
	cacheTtl: number,
): Promise<jose.JSONWebKeySet> {
	const now = Date.now();

	// Check in-memory cache
	if (cachedJWKS && cachedJWKSExpiry > now) {
		return cachedJWKS;
	}

	// Fetch from auth service
	const jwksUrl = `${authServiceUrl}/api/auth/jwks`;
	const response = await fetch(jwksUrl, {
		headers: { Accept: "application/json" },
	});

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
 */
async function verifyToken(
	token: string,
	authServiceUrl: string,
	cacheTtl: number,
): Promise<AuthTokenPayload> {
	const jwks = await getJWKS(authServiceUrl, cacheTtl);

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
 * Extracts better-auth session cookies from request
 */
function extractSessionCookies(
	cookieHeader: string | undefined,
): string | null {
	if (!cookieHeader) {
		return null;
	}

	// Check for better-auth session cookies
	const hasSessionToken =
		cookieHeader.includes("better-auth.session_token") ||
		cookieHeader.includes("__Secure-better-auth.session_token");
	const hasSessionData =
		cookieHeader.includes("better-auth.session_data") ||
		cookieHeader.includes("__Secure-better-auth.session_data");

	if (hasSessionToken || hasSessionData) {
		return cookieHeader;
	}

	return null;
}

/**
 * Validates session cookies by calling the auth service
 * Returns user info if session is valid
 */
async function validateSessionCookies(
	cookieHeader: string,
	authServiceUrl: string,
	origin?: string,
): Promise<{ user: AuthUser; token: string }> {
	const sessionUrl = `${authServiceUrl}/api/auth/get-session`;

	const headers: Record<string, string> = {
		Cookie: cookieHeader,
		Accept: "application/json",
	};

	// Include Origin header if provided (some auth services require it)
	if (origin) {
		headers.Origin = origin;
	}

	const response = await fetch(sessionUrl, {
		headers,
	});

	if (!response.ok) {
		throw new Error(
			`Failed to validate session: ${response.status} ${response.statusText}`,
		);
	}

	const data = (await response.json()) as {
		session?: { userId: string };
		user?: { id: string; email?: string; name?: string };
	};

	if (!data.session || !data.user) {
		throw new Error("Invalid session: missing session or user data");
	}

	// Use session token as the token for context (or we could extract a JWT if available)
	// For now, we'll use a synthetic token identifier
	const token = `session:${data.session.userId}`;

	return {
		user: {
			id: data.user.id,
			email: data.user.email,
			name: data.user.name,
		},
		token,
	};
}

/**
 * Creates an authentication middleware that verifies JWTs signed by auth-svc
 *
 * @param options - Configuration options
 * @param options.optional - If true, allows unauthenticated requests to pass through
 * @returns Hono middleware handler
 *
 * @example
 * // Require authentication for all routes
 * router.use("*", authMiddleware());
 *
 * // Optional authentication (user info available if token present)
 * router.use("*", authMiddleware({ optional: true }));
 */
export function authMiddleware(options?: {
	optional?: boolean;
}): MiddlewareHandler<{
	Bindings: AuthBindings;
	Variables: AuthVariables;
}> {
	const { optional = false } = options ?? {};

	return async (c, next) => {
		const authHeader = c.req.header("Authorization");
		const cookieHeader = c.req.header("Cookie");
		const token = extractBearerToken(authHeader);
		const sessionCookies = extractSessionCookies(cookieHeader);

		// No token or cookies provided
		if (!token && !sessionCookies) {
			if (optional) {
				return next();
			}
			return c.json(
				{
					success: false,
					error: "Unauthorized",
					message: "Missing or invalid Authorization header or session cookies",
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

		try {
			// If Bearer token is provided, use JWT verification
			if (token) {
				const payload = await verifyToken(token, authServiceUrl, cacheTtl);

				// Attach user info to context
				const user: AuthUser = {
					id: payload.sub,
					email: payload.email,
					name: payload.name,
				};

				c.set("user", user);
				c.set("token", token);
				c.set("tokenPayload", payload);

				return next();
			}

			// Otherwise, validate session cookies
			if (sessionCookies) {
				const origin = c.req.header("Origin");
				const { user, token: sessionToken } = await validateSessionCookies(
					sessionCookies,
					authServiceUrl,
					origin,
				);

				// Create a minimal token payload for consistency
				const tokenPayload: AuthTokenPayload = {
					sub: user.id,
					email: user.email,
					name: user.name,
				};

				c.set("user", user);
				c.set("token", sessionToken);
				c.set("tokenPayload", tokenPayload);

				return next();
			}
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

			// Handle session validation errors
			if (
				error instanceof Error &&
				error.message.includes("Failed to validate session")
			) {
				return c.json(
					{
						success: false,
						error: "Invalid Session",
						message: "Session validation failed",
					},
					401,
				);
			}

			if (error instanceof Error && error.message.includes("Invalid session")) {
				return c.json(
					{
						success: false,
						error: "Invalid Session",
						message: error.message,
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
					message: "Invalid authentication token or session",
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
 * Clears the in-memory JWKS cache
 * Useful for testing or when keys need to be refreshed immediately
 */
export function clearJWKSCache(): void {
	cachedJWKS = null;
	cachedJWKSExpiry = 0;
}
