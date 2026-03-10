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
}
