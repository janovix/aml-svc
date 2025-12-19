/**
 * Environment bindings for Cloudflare Workers
 */
declare namespace Cloudflare {
	interface Env {
		DB: D1Database;
		CACHE?: KVNamespace;
		ENVIRONMENT?: string;
		API_VERSION?: string;
		/**
		 * URL of the auth-svc for JWKS verification
		 * Example: https://auth-svc.janovix.workers.dev
		 */
		AUTH_SERVICE_URL?: string;
		/**
		 * Cache TTL for JWKS in seconds (default: 3600)
		 */
		AUTH_JWKS_CACHE_TTL?: string;
	}
}
