import { WorkerEntrypoint } from "cloudflare:workers";
import {
	AlertServiceBinding,
	handleServiceBindingRequest,
} from "./lib/alert-service-binding";
import {
	handleInternalOrganizationSettingsRequest,
	handleInternalSelfServiceSettingsRequest,
} from "./routes/internal-organization-settings";
import { handleInternalScreeningRequest } from "./routes/internal-screening";
import { clientsInternalRouter } from "./routes/clients";
import { operationsInternalRouter } from "./routes/operations";
import { importInternalRouter } from "./routes/imports";
import type { Bindings } from "./types";

// =============================================================================
// RPC TYPES (screening callback)
// =============================================================================

export interface ScreeningCallbackData {
	queryId: string;
	type: "pep_official" | "pep_ai" | "adverse_media";
	status: "completed" | "failed";
	matched: boolean;
}

export interface WatchlistQueryUpdateData {
	watchlistQueryId: string;
	ofacSanctioned?: boolean;
	unscSanctioned?: boolean;
	sat69bListed?: boolean;
	screeningResult?: string;
	screenedAt?: string;
}

// =============================================================================
// RPC ENTRYPOINT
// =============================================================================

/**
 * RPC entrypoint for aml-svc.
 *
 * Exposes typed methods for inter-service communication via Cloudflare Service
 * Bindings. Callers must declare `"entrypoint": "AmlSvcEntrypoint"` in their
 * wrangler config service binding.
 *
 * The `fetch()` method delegates to `handleServiceBindingRequest`, maintaining
 * HTTP backward compatibility.
 *
 * @example wrangler.jsonc (caller)
 * ```jsonc
 * {
 *   "services": [{
 *     "binding": "AML_SERVICE",
 *     "service": "aml-svc",
 *     "entrypoint": "AmlSvcEntrypoint"
 *   }]
 * }
 * ```
 */
export class AmlSvcEntrypoint extends WorkerEntrypoint<Bindings> {
	/**
	 * HTTP fallback — delegates to `handleServiceBindingRequest` so existing
	 * `.fetch()` callers continue to work during incremental migration.
	 */
	async fetch(request: Request): Promise<Response> {
		return handleServiceBindingRequest(request, this.env);
	}

	// ===========================================================================
	// Alert rules
	// ===========================================================================

	async getActiveAlertRules() {
		const binding = new AlertServiceBinding(this.env);
		return binding.getActiveAlertRules();
	}

	async getAllActiveAlertRules() {
		const binding = new AlertServiceBinding(this.env);
		return binding.getAllActiveAlertRules();
	}

	async getAlertRuleConfig(alertRuleId: string, key: string) {
		const binding = new AlertServiceBinding(this.env);
		return binding.getAlertRuleConfig(alertRuleId, key);
	}

	async getActiveUmaValue() {
		const binding = new AlertServiceBinding(this.env);
		return binding.getActiveUmaValue();
	}

	// ===========================================================================
	// Alerts
	// ===========================================================================

	async createAlert(
		alertData: Parameters<AlertServiceBinding["createAlert"]>[0],
	) {
		const binding = new AlertServiceBinding(this.env);
		return binding.createAlert(alertData);
	}

	async generateAlertSatFile(alertId: string): Promise<{ fileUrl: string }> {
		const req = new Request(
			`https://aml-svc/internal/alerts/${alertId}/generate-file`,
			{ method: "POST", headers: { "Content-Type": "application/json" } },
		);
		const response = await handleServiceBindingRequest(req, this.env);
		if (!response.ok) {
			throw new Error(`Failed to generate SAT file: ${response.status}`);
		}
		return response.json<{ fileUrl: string }>();
	}

	// ===========================================================================
	// Clients
	// ===========================================================================

	async getClient(clientId: string) {
		const binding = new AlertServiceBinding(this.env);
		return binding.getClient(clientId);
	}

	async getClientOperations(clientId: string) {
		const binding = new AlertServiceBinding(this.env);
		return binding.getClientOperations(clientId);
	}

	// ===========================================================================
	// Organization settings
	// ===========================================================================

	async getOrganizationSettings(orgId: string) {
		const req = new Request(`https://aml-svc/organization-settings/${orgId}`, {
			method: "GET",
		});
		const response = await handleInternalOrganizationSettingsRequest(
			req,
			this.env,
			orgId,
		);
		const json = (await response.json()) as {
			success: boolean;
			data: { configured: boolean; settings: unknown };
		};
		return json.data;
	}

	async updateOrganizationSettings(orgId: string, data: unknown) {
		const req = new Request(`https://aml-svc/organization-settings/${orgId}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});
		const response = await handleInternalOrganizationSettingsRequest(
			req,
			this.env,
			orgId,
		);
		if (!response.ok) {
			const error = (await response.json()) as { error?: string };
			throw new Error(error.error ?? "Failed to update organization settings");
		}
		const json = (await response.json()) as {
			success: boolean;
			data: { configured: boolean; settings: unknown };
		};
		return json.data;
	}

	async patchOrganizationSettings(orgId: string, data: unknown) {
		const req = new Request(`https://aml-svc/organization-settings/${orgId}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});
		const response = await handleInternalOrganizationSettingsRequest(
			req,
			this.env,
			orgId,
		);
		if (!response.ok) {
			const error = (await response.json()) as { error?: string };
			throw new Error(error.error ?? "Failed to patch organization settings");
		}
		const json = (await response.json()) as {
			success: boolean;
			data: { configured: boolean; settings: unknown };
		};
		return json.data;
	}

	async patchSelfServiceSettings(orgId: string, data: unknown) {
		const req = new Request(
			`https://aml-svc/organization-settings/${orgId}/self-service`,
			{
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			},
		);
		const response = await handleInternalSelfServiceSettingsRequest(
			req,
			this.env,
			orgId,
		);
		if (!response.ok) {
			const error = (await response.json()) as { error?: string };
			throw new Error(error.error ?? "Failed to patch self-service settings");
		}
		const json = (await response.json()) as {
			success: boolean;
			data: { configured: boolean; settings: unknown };
		};
		return json.data;
	}

	// ===========================================================================
	// Screening
	// ===========================================================================

	async getStaleScreeningClients(segment: number = 0, limit: number = 200) {
		const req = new Request(
			`https://aml-svc/clients/stale-screening?segment=${segment}&limit=${limit}`,
			{ method: "GET" },
		);
		const response = await handleInternalScreeningRequest(
			req,
			this.env,
			`clients/stale-screening`,
		);
		const json = (await response.json()) as {
			success: boolean;
			data: unknown[];
		};
		return json.data;
	}

	async patchClientWatchlistQuery(
		clientId: string,
		data: WatchlistQueryUpdateData,
	) {
		const req = new Request(
			`https://aml-svc/clients/${clientId}/watchlist-query`,
			{
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			},
		);
		await handleInternalScreeningRequest(
			req,
			this.env,
			`clients/${clientId}/watchlist-query`,
		);
	}

	async processScreeningCallback(data: ScreeningCallbackData): Promise<void> {
		const req = new Request("https://aml-svc/screening-callback", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});
		const response = await handleInternalScreeningRequest(
			req,
			this.env,
			"/screening-callback",
		);
		if (!response.ok) {
			const error = (await response.json()) as { error?: string };
			throw new Error(
				error.error ?? `Screening callback failed: ${response.status}`,
			);
		}
	}

	// ===========================================================================
	// Import worker — client & transaction creation + import status
	// ===========================================================================

	/**
	 * Create a client (called by aml-import-worker).
	 * Delegates to POST /api/v1/internal/clients.
	 */
	async createClient(
		organizationId: string,
		data: unknown,
	): Promise<{ id: string; [key: string]: unknown }> {
		const req = new Request("https://aml-svc/", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Organization-Id": organizationId,
			},
			body: JSON.stringify(data),
		});
		const response = await clientsInternalRouter.fetch(req, this.env, this.ctx);
		if (!response.ok) {
			const error = (await response.json()) as { message?: string };
			throw new Error(
				error.message ?? `createClient failed: ${response.status}`,
			);
		}
		return response.json<{ id: string; [key: string]: unknown }>();
	}

	/**
	 * Look up a client by RFC (called by aml-import-worker).
	 * Delegates to GET /api/v1/internal/clients/by-rfc/:rfc.
	 */
	async getClientByRfc(
		organizationId: string,
		rfc: string,
	): Promise<{ id: string; [key: string]: unknown } | null> {
		const req = new Request(
			`https://aml-svc/by-rfc/${encodeURIComponent(rfc)}`,
			{
				method: "GET",
				headers: { "X-Organization-Id": organizationId },
			},
		);
		const response = await clientsInternalRouter.fetch(req, this.env, this.ctx);
		if (response.status === 404) return null;
		if (!response.ok) {
			const error = (await response.json()) as { message?: string };
			throw new Error(
				error.message ?? `getClientByRfc failed: ${response.status}`,
			);
		}
		return response.json<{ id: string; [key: string]: unknown }>();
	}

	/**
	 * Create an operation for a client (called by aml-import-worker).
	 * Delegates to POST /api/v1/internal/operations.
	 */
	async createOperation(
		organizationId: string,
		data: unknown,
	): Promise<{ id: string; [key: string]: unknown }> {
		const req = new Request("https://aml-svc/", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Organization-Id": organizationId,
			},
			body: JSON.stringify(data),
		});
		const response = await operationsInternalRouter.fetch(
			req,
			this.env,
			this.ctx,
		);
		if (!response.ok) {
			const error = (await response.json()) as { message?: string };
			throw new Error(
				error.message ?? `createOperation failed: ${response.status}`,
			);
		}
		return response.json<{ id: string; [key: string]: unknown }>();
	}

	/**
	 * Update import status (called by aml-import-worker).
	 * Delegates to POST /api/v1/internal/imports/:id/status.
	 */
	async updateImportStatus(importId: string, data: unknown): Promise<void> {
		const req = new Request(`https://aml-svc/${importId}/status`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});
		const response = await importInternalRouter.fetch(req, this.env, this.ctx);
		if (!response.ok) {
			const error = (await response.json()) as { message?: string };
			throw new Error(
				error.message ?? `updateImportStatus failed: ${response.status}`,
			);
		}
	}

	/**
	 * Create import row result records in bulk (called by aml-import-worker).
	 * Delegates to POST /api/v1/internal/imports/:id/rows.
	 */
	async createImportRows(
		importId: string,
		rows: Array<{ rowNumber: number; rawData: string }>,
	): Promise<void> {
		const req = new Request(`https://aml-svc/${importId}/rows`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ rows }),
		});
		const response = await importInternalRouter.fetch(req, this.env, this.ctx);
		if (!response.ok) {
			const error = (await response.json()) as { message?: string };
			throw new Error(
				error.message ?? `createImportRows failed: ${response.status}`,
			);
		}
	}

	/**
	 * Update a single import row result (called by aml-import-worker).
	 * Delegates to POST /api/v1/internal/imports/:id/progress.
	 */
	async updateImportRowProgress(
		importId: string,
		result: {
			rowNumber: number;
			status: string;
			entityId?: string;
			message?: string;
			errors?: string[];
		},
	): Promise<void> {
		const req = new Request(`https://aml-svc/${importId}/progress`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(result),
		});
		const response = await importInternalRouter.fetch(req, this.env, this.ctx);
		if (!response.ok) {
			const error = (await response.json()) as { message?: string };
			throw new Error(
				error.message ?? `updateImportRowProgress failed: ${response.status}`,
			);
		}
	}
}
