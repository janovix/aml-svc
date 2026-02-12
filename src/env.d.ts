import type { AlertJob } from "./lib/alert-queue";

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
		 * Cache TTL for JWKS in seconds (default: 3600)
		 */
		AUTH_JWKS_CACHE_TTL?: string;
		/**
		 * SAT configuration
		 */
		SAT_CLAVE_SUJETO_OBLIGADO?: string; // 12-character obligated subject identifier (RFC)
		SAT_CLAVE_ACTIVIDAD?: string; // Activity code (e.g., "VEH" for vehicle notices)
		SAT_CLAVE_ENTIDAD_COLEGIADA?: string; // Optional collegiate entity identifier
		/**
		 * Queue for alert detection jobs
		 */
		ALERT_DETECTION_QUEUE?: Queue<AlertJob>;
		/**
		 * Sentry DSN for error tracking.
		 * If not set, Sentry will be disabled.
		 */
		SENTRY_DSN?: string;
		/**
		 * CurrencyLayer API key for real-time exchange rates.
		 * Get your key at: https://currencylayer.com/
		 */
		CURRENCYLAYER_API_KEY?: string;
		/**
		 * Service binding to doc-svc for document processing
		 */
		DOC_SERVICE?: Fetcher;
	}
}
