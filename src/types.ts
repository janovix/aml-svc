import type { Context } from "hono";

// =============================================================================
// LOCAL RPC INTERFACES
// Mirrors entrypoint methods to enable typed RPC calls without a shared package.
// =============================================================================

type JwksKey = {
	kty: string;
	use?: string;
	alg?: string;
	kid?: string;
	[key: string]: unknown;
};

interface JwksResult {
	keys: JwksKey[];
}

type GateResultRpc = {
	allowed: boolean;
	metric?: string;
	used?: number;
	limit?: number;
	remaining?: number;
	entitlementType?: string;
	error?: string;
	upgradeRequired?: boolean;
	code?: string;
	overageWarning?: boolean;
	overageUnits?: number;
	overageEnabled?: boolean;
	spendLimitRemaining?: number | null;
};

type AuditLogRpcInput = {
	eventType: string;
	entityType: string;
	entityId?: string | null;
	actorUserId?: string | null;
	actorOrganizationId?: string | null;
	actorIp?: string | null;
	actorUserAgent?: string | null;
	previousState?: Record<string, unknown> | null;
	newState?: Record<string, unknown> | null;
	changeSummary?: Record<string, unknown> | null;
	requestId?: string | null;
	metadata?: Record<string, unknown> | null;
	sourceService?: string;
};

type AuditLogRpcResult = { id: string; signature: string };

/**
 * RPC interface exposed by auth-svc via `AuthSvcEntrypoint`.
 * Includes `fetch()` for backward-compatible HTTP calls still needed in
 * routes like `/internal/users` (organization member list).
 */
export interface AuthSvcRpc {
	fetch(request: Request): Promise<Response>;
	getOrganizationLanguage?(organizationId: string): Promise<string>;
	getJwks(): Promise<JwksResult>;
	getResolvedSettings(
		userId: string,
		orgId?: string,
		headers?: string,
	): Promise<unknown>;
	logAuditEvent(input: AuditLogRpcInput): Promise<AuditLogRpcResult | null>;
	gateUsageRights(
		orgId: string,
		metric: string,
		count?: number,
	): Promise<GateResultRpc>;
	meterUsageRights(
		orgId: string,
		metric: string,
		count?: number,
	): Promise<void>;
	checkUsageRights(orgId: string, metric: string): Promise<GateResultRpc>;
	getOrganization(id: string): Promise<{
		id: string;
		name: string;
		slug: string;
		logo: string | null;
		metadata: Record<string, unknown> | null;
		status: string;
	} | null>;
	/** Better Auth member.role for the given user + org (training org-level routes). */
	getMemberRole?(
		userId: string,
		organizationId: string,
	): Promise<"owner" | "admin" | "member" | null>;
	/** Paginated active org members for training enrollment sync. */
	listActiveMembers?(
		organizationId?: string,
		cursor?: string,
	): Promise<{
		items: Array<{
			userId: string;
			organizationId: string;
			email: string;
			name: string;
		}>;
		nextCursor: string | null;
	}>;
}

type NotificationsTarget =
	| { kind: "org" }
	| { kind: "user"; userId: string; email?: string; name?: string };

interface EmailI18nRpcPayload {
	titleKey: string;
	bodyKey: string;
	titleParams?: Record<string, string | number>;
	bodyParams?: Record<string, string | number>;
}

interface NotifyRpcInput {
	tenantId: string;
	target: NotificationsTarget;
	channelSlug?: string;
	type: string;
	title: string;
	body: string;
	payload?: Record<string, unknown>;
	severity?: string;
	callbackUrl?: string;
	sendEmail?: boolean;
	emailI18n?: EmailI18nRpcPayload;
	emailLocale?: "en" | "es";
	sourceService: string;
	sourceEvent?: string;
}

interface NotifyRpcResult {
	notificationId: string;
	delivered: { realtime: boolean; email: string };
	recipientCount?: number;
}

interface EmailSendRpcInput {
	to: { email: string; name?: string };
	subject: string;
	content: { title: string; body: string; callbackUrl?: string };
	tags?: string[];
	sourceService: string;
	sourceEvent?: string;
	language?: "en" | "es";
}

interface EmailSendRpcResult {
	success: boolean;
	email: string;
	status?: string;
	mandrillId?: string;
	error?: string;
}

/**
 * RPC interface exposed by notifications-svc via `NotificationsEntrypoint`.
 */
export interface NotificationsRpc {
	notify(input: NotifyRpcInput): Promise<NotifyRpcResult>;
	sendEmail(input: EmailSendRpcInput): Promise<EmailSendRpcResult>;
}

/**
 * RPC interface exposed by watchlist-svc via `WatchlistEntrypoint`.
 */
export interface WatchlistRpc {
	search(
		input: {
			q: string;
			entityType?: string;
			source?: string;
			birthDate?: string;
			countries?: string[];
			identifiers?: string[];
			topK?: number;
			threshold?: number;
			environment?: string;
			entityId?: string;
			entityKind?: "client" | "beneficial_controller";
		},
		organizationId: string,
		userId: string,
	): Promise<{
		queryId: string;
		ofacCount: number;
		unscCount: number;
		sat69bCount: number;
	}>;
}

// =============================================================================
// BINDINGS
// =============================================================================

/**
 * Extended environment bindings with custom properties.
 * The base Env is auto-generated by `wrangler types` in worker-configuration.d.ts
 */
export type Bindings = Omit<
	Env,
	| "ENVIRONMENT"
	| "AUTH_JWKS_CACHE_TTL"
	| "AUTH_SERVICE"
	| "WATCHLIST_SERVICE"
	| "NOTIFICATIONS_SERVICE"
> & {
	/** Environment name (dev, preview, production) - overridden to be string instead of literal */
	ENVIRONMENT?: string;
	/** Cache TTL for JWKS in seconds - overridden to be string instead of literal */
	AUTH_JWKS_CACHE_TTL?: string;
	/**
	 * Comma-separated list of trusted origins for CORS.
	 * Example: "https://aml.janovix.com,https://auth.janovix.com,http://localhost:3000"
	 */
	TRUSTED_ORIGINS?: string;
	/** Shared secret for internal E2E routes (alert thresholds, org purge). */
	E2E_API_KEY?: string;
	/** Queue for import processing jobs */
	IMPORT_PROCESSING_QUEUE?: Queue<import("./domain/import").ImportJob>;
	/** Queue for risk assessment jobs (consumed by aml-svc itself) */
	RISK_ASSESSMENT_QUEUE?: Queue<import("./lib/risk-queue").RiskJob>;
	/** Watchlist re-screen jobs (pep-check replacement; consumed by aml-svc) */
	AML_SCREENING_REFRESH_QUEUE?: Queue<
		import("./lib/watchlist-rescan-types").ScreeningRescanJob
	>;
	/** Queue for webhook event delivery (consumed by webhook-delivery-worker) */
	WEBHOOK_QUEUE?: Queue<import("./lib/webhook-events").WebhookEvent>;
	/**
	 * Auth service binding via `AuthSvcEntrypoint`.
	 * Caller wrangler config must include `"entrypoint": "AuthSvcEntrypoint"`.
	 */
	AUTH_SERVICE?: AuthSvcRpc;
	/**
	 * Watchlist service binding via `WatchlistEntrypoint`.
	 * Caller wrangler config must include `"entrypoint": "WatchlistEntrypoint"`.
	 */
	WATCHLIST_SERVICE?: WatchlistRpc;
	/**
	 * Notifications service binding via `NotificationsEntrypoint`.
	 * Caller wrangler config must include `"entrypoint": "NotificationsEntrypoint"`.
	 */
	NOTIFICATIONS_SERVICE?: NotificationsRpc;
	/** Public AML frontend URL used to build notification callback links */
	AML_FRONTEND_URL?: string;
	/** KYC Self-Service app URL for generating invite links */
	KYC_SELF_SERVICE_URL?: string;
	/** Internal service-to-service shared secret */
	INTERNAL_SERVICE_SECRET?: string;
	/** Secret token for synthetic data generation HTTP endpoint (local development only) */
	SYNTHETIC_DATA_SECRET?: string;
	/**
	 * Sentry DSN for error tracking.
	 * If not set, Sentry will be disabled.
	 * Configured via Cloudflare Dashboard secrets or wrangler vars.
	 */
	SENTRY_DSN?: string;
	/** 12-character obligated subject identifier (RFC) */
	SAT_CLAVE_SUJETO_OBLIGADO?: string;
	/** Activity code (e.g., "VEH" for vehicle notices) */
	SAT_CLAVE_ACTIVIDAD?: string;
	/** Optional collegiate entity identifier */
	SAT_CLAVE_ENTIDAD_COLEGIADA?: string;
	/**
	 * CurrencyLayer API key for real-time exchange rates.
	 * Get your key at: https://currencylayer.com/
	 */
	CURRENCYLAYER_API_KEY?: string;
	/** API version override (defaults to package.json version) */
	API_VERSION?: string;
	/** Cloudflare account id (Stream direct upload API). */
	CF_ACCOUNT_ID?: string;
	/** Stream customer subdomain code for iframe URLs (`customer-{code}.cloudflarestream.com`). */
	STREAM_CUSTOMER_CODE?: string;
	/** Cloudflare Stream API token (direct upload). */
	CLOUDFLARE_STREAM_API_TOKEN?: string;
	/**
	 * Base64-encoded JWK private key from Cloudflare `POST /stream/keys` for
	 * signing Stream playback JWTs. The JWK's `kid` is used directly.
	 * @see https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/#step-1-call-the-streamkey-endpoint-once-to-obtain-a-key
	 */
	STREAM_SIGNING_KEY_JWK?: string;
	/** Training certificate PDF generation queue */
	TRAINING_CERT_GEN_QUEUE?: Queue<
		import("./lib/training/jobs").TrainingCertGenJob
	>;
	/** Training notification dispatch queue */
	TRAINING_NOTIFICATION_QUEUE?: Queue<
		import("./lib/training/jobs").TrainingNotificationJob
	>;
	/**
	 * Cloudflare Worker version metadata.
	 * Used for Sentry release tracking.
	 */
	CF_VERSION_METADATA?: WorkerVersionMetadata;
};

export type AppContext = Context<{ Bindings: Bindings }>;
export type HandleArgs = [AppContext];
