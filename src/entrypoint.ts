import { WorkerEntrypoint } from "cloudflare:workers";
import { handleServiceBindingRequest } from "./lib/alert-service-binding";
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
 * NOTE: Alert-worker and import-worker RPC methods have been removed — those
 * workers are now absorbed into aml-svc and use direct Prisma/service calls.
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
	// Organization settings (used by auth-svc)
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
			success?: boolean;
			data?: { configured: boolean; settings: unknown };
			error?: string;
		};
		if (!response.ok) {
			throw new Error(
				json.error ?? `${response.status} ${response.statusText}`,
			);
		}
		return json.data!;
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
		const json = (await response.json()) as {
			success?: boolean;
			data?: { configured: boolean; settings: unknown };
			error?: string;
		};
		if (!response.ok) {
			throw new Error(json.error ?? "Failed to update organization settings");
		}
		return json.data!;
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
		const json = (await response.json()) as {
			success?: boolean;
			data?: { configured: boolean; settings: unknown };
			error?: string;
		};
		if (!response.ok) {
			throw new Error(json.error ?? "Failed to patch organization settings");
		}
		return json.data!;
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
		const json = (await response.json()) as {
			success?: boolean;
			data?: { configured: boolean; settings: unknown };
			error?: string;
		};
		if (!response.ok) {
			throw new Error(json.error ?? "Failed to patch self-service settings");
		}
		return json.data!;
	}

	// ===========================================================================
	// Screening (used by watchlist-svc)
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
			success?: boolean;
			data?: unknown[];
			error?: string;
		};
		if (!response.ok) {
			throw new Error(
				json.error ?? `${response.status} ${response.statusText}`,
			);
		}
		return json.data ?? [];
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
		const response = await handleInternalScreeningRequest(
			req,
			this.env,
			`clients/${clientId}/watchlist-query`,
		);
		if (!response.ok) {
			const json = (await response.json()) as { error?: string };
			throw new Error(
				json.error ?? `${response.status} ${response.statusText}`,
			);
		}
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
