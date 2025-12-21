/**
 * Environment bindings for Cloudflare Workers
 */
declare namespace Cloudflare {
	interface Env {
		DB: D1Database;
		CACHE?: KVNamespace;
		R2_BUCKET?: R2Bucket; // R2 bucket for storing SAT XML files
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
		/**
		 * SAT configuration
		 */
		SAT_CLAVE_SUJETO_OBLIGADO?: string; // 12-character obligated subject identifier
		SAT_TIPO_SUJETO_OBLIGADO?: string; // Catalog code from CAT_TIPO_SUJETO_OBLIGADO
		SAT_CLAVE_ENTIDAD_COLEGIADA?: string; // Optional collegiate entity identifier
	}
}
