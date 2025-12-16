/**
 * Environment bindings for Cloudflare Workers
 */
declare namespace Cloudflare {
	interface Env {
		DB: D1Database;
		CACHE?: KVNamespace;
		ENVIRONMENT?: string;
		API_VERSION?: string;
	}
}
