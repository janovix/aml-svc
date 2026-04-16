/**
 * Service Binding Interface for Alert Detection Worker
 *
 * This interface defines the methods that can be called via service binding
 * from the alert detection worker to this service.
 *
 * Usage in worker:
 * ```typescript
 * const response = await env.AML_SERVICE.fetch(
 *   new Request("https://internal/alert-rules/active", { method: "GET" })
 * );
 * ```
 *
 * Or using the helper methods defined below.
 */

import * as Sentry from "@sentry/cloudflare";
import type { Bindings } from "../types";
import { getPrismaClient } from "./prisma";
import {
	AlertRuleRepository,
	AlertRepository,
	AlertRuleConfigRepository,
} from "../domain/alert";
import {
	AlertService,
	AlertRuleService,
	AlertRuleConfigService,
} from "../domain/alert";
import { UmaValueRepository } from "../domain/uma";
import { UmaValueService } from "../domain/uma";
import { ClientRepository } from "../domain/client";
import { ClientService } from "../domain/client";
import { OperationService } from "../domain/operation";
import { productionTenant } from "./tenant-context";
import {
	handleInternalOrganizationSettingsRequest,
	handleInternalSelfServiceSettingsRequest,
} from "../routes/internal-organization-settings";
import { handleInternalScreeningRequest } from "../routes/internal-screening";

/**
 * Service binding helper functions for alert operations
 * These can be called directly from other workers via service binding
 */
export class AlertServiceBinding {
	constructor(private readonly env: Bindings) {}

	/**
	 * Get all active alert rules (global - no organizationId required)
	 * Called via: env.AML_SERVICE.fetch(new Request("https://internal/alert-rules/active"))
	 */
	async getActiveAlertRules() {
		const prisma = getPrismaClient(this.env.DB);
		const repository = new AlertRuleRepository(prisma);
		const service = new AlertRuleService(repository);
		return service.listActiveForSeeker();
	}

	/**
	 * Get all active alert rules including manual-only rules
	 * Called via: env.AML_SERVICE.fetch(new Request("https://internal/alert-rules/all-active"))
	 */
	async getAllActiveAlertRules() {
		const prisma = getPrismaClient(this.env.DB);
		const repository = new AlertRuleRepository(prisma);
		const service = new AlertRuleService(repository);
		return service.listActive();
	}

	/**
	 * Get alert rule config by key
	 * Called via: env.AML_SERVICE.fetch(new Request("https://internal/alert-rules/{id}/config/{key}"))
	 */
	async getAlertRuleConfig(alertRuleId: string, key: string) {
		const prisma = getPrismaClient(this.env.DB);
		const repository = new AlertRuleConfigRepository(prisma);
		const service = new AlertRuleConfigService(repository);
		try {
			return await service.getByKey(alertRuleId, key);
		} catch {
			return null;
		}
	}

	/**
	 * Get active UMA value
	 * Called via: env.AML_SERVICE.fetch(new Request("https://internal/uma-values/active"))
	 */
	async getActiveUmaValue() {
		const prisma = getPrismaClient(this.env.DB);
		const repository = new UmaValueRepository(prisma);
		const service = new UmaValueService(repository);
		return service.getActive();
	}

	/**
	 * Get client data
	 * Called via: env.AML_SERVICE.fetch(new Request(`https://internal/clients/${clientId}`))
	 */
	async getClient(clientId: string) {
		const prisma = getPrismaClient(this.env.DB);

		// First, fetch the client to get its organizationId
		const clientRecord = await prisma.client.findUnique({
			where: { id: clientId },
			select: { organizationId: true },
		});

		if (!clientRecord) {
			throw new Error(`Client not found: ${clientId}`);
		}

		// Now use ClientService to get the full client entity
		const repository = new ClientRepository(prisma);
		const service = new ClientService(repository);
		return service.get(productionTenant(clientRecord.organizationId), clientId);
	}

	/**
	 * Get client operations
	 * Called via: env.AML_SERVICE.fetch(new Request(`https://internal/clients/${clientId}/operations`))
	 */
	async getClientOperations(clientId: string) {
		const prisma = getPrismaClient(this.env.DB);

		// First, fetch the client to get its organizationId
		const clientRecord = await prisma.client.findUnique({
			where: { id: clientId },
			select: { organizationId: true },
		});

		if (!clientRecord) {
			throw new Error(`Client not found: ${clientId}`);
		}

		// Now use OperationService to list operations for this client
		const service = new OperationService(prisma);

		const result = await service.list(
			productionTenant(clientRecord.organizationId),
			{
				clientId,
				page: 1,
				limit: 1000, // Get all operations for the client
			},
		);

		return result.data;
	}

	/**
	 * Create alert (idempotent)
	 * Called via: env.AML_SERVICE.fetch(new Request("https://internal/alerts", { method: "POST", body: ... }))
	 */
	async createAlert(alertData: {
		alertRuleId: string;
		clientId: string;
		severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
		idempotencyKey: string;
		contextHash: string;
		metadata: Record<string, unknown>;
		operationId?: string | null; // Primary trigger (Operation entity)
		activityCode?: string | null; // Activity code for multi-activity support
		isManual: boolean;
		notes?: string | null;
	}) {
		const prisma = getPrismaClient(this.env.DB);
		const repository = new AlertRepository(prisma);
		const service = new AlertService(repository);

		// Get organizationId from client
		const client = await prisma.client.findUnique({
			where: { id: alertData.clientId },
			select: { organizationId: true },
		});

		if (!client) {
			throw new Error(`Client not found: ${alertData.clientId}`);
		}

		return service.create(alertData, productionTenant(client.organizationId));
	}
}

/**
 * Handle service binding requests for alert operations
 * This can be added as a route handler in the main app
 */
export async function handleServiceBindingRequest(
	request: Request,
	env: Bindings,
): Promise<Response> {
	const url = new URL(request.url);
	let path = url.pathname;

	// When using service bindings with https://internal/..., Cloudflare strips the /internal prefix
	// So /internal/alert-rules/active becomes /alert-rules/active
	// But Hono route /internal/* matches and passes the full path, so we need to handle both cases
	// Remove /internal prefix if present for consistent matching
	if (path.startsWith("/internal/")) {
		path = path.slice("/internal".length);
	}

	try {
		// Route: /alert-rules/active (global - no organizationId required)
		if (path === "/alert-rules/active" && request.method === "GET") {
			const service = new AlertServiceBinding(env);
			const rules = await service.getActiveAlertRules();
			return new Response(JSON.stringify(rules), {
				headers: { "Content-Type": "application/json" },
			});
		}

		// Route: /alert-rules/all-active (includes manual-only rules)
		if (path === "/alert-rules/all-active" && request.method === "GET") {
			const service = new AlertServiceBinding(env);
			const rules = await service.getAllActiveAlertRules();
			return new Response(JSON.stringify(rules), {
				headers: { "Content-Type": "application/json" },
			});
		}

		// Route: /alert-rules/{id}/config/{key}
		const configMatch = path.match(/^\/alert-rules\/([^/]+)\/config\/([^/]+)$/);
		if (configMatch && request.method === "GET") {
			const [, alertRuleId, key] = configMatch;
			const service = new AlertServiceBinding(env);
			const config = await service.getAlertRuleConfig(alertRuleId, key);
			if (!config) {
				return new Response(JSON.stringify({ error: "Config not found" }), {
					status: 404,
					headers: { "Content-Type": "application/json" },
				});
			}
			return new Response(JSON.stringify(config), {
				headers: { "Content-Type": "application/json" },
			});
		}

		// Route: /alerts (POST)
		if (path === "/alerts" && request.method === "POST") {
			const service = new AlertServiceBinding(env);
			const alertData = (await request.json()) as Parameters<
				AlertServiceBinding["createAlert"]
			>[0];
			const alert = await service.createAlert(alertData);
			return new Response(JSON.stringify(alert), {
				status: 201,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Route: /uma-values/active
		if (path === "/uma-values/active" && request.method === "GET") {
			const service = new AlertServiceBinding(env);
			const umaValue = await service.getActiveUmaValue();
			if (!umaValue) {
				return new Response(
					JSON.stringify({ error: "No active UMA value found" }),
					{ status: 404, headers: { "Content-Type": "application/json" } },
				);
			}
			return new Response(JSON.stringify(umaValue), {
				headers: { "Content-Type": "application/json" },
			});
		}

		// Route: /clients/{clientId}/operations (must be checked before /clients/{clientId})
		if (
			path.startsWith("/clients/") &&
			path.endsWith("/operations") &&
			request.method === "GET"
		) {
			const clientId = path.split("/clients/")[1].split("/operations")[0];

			if (!clientId) {
				return new Response(
					JSON.stringify({ error: "Client ID is required" }),
					{ status: 400, headers: { "Content-Type": "application/json" } },
				);
			}

			try {
				const service = new AlertServiceBinding(env);
				const operations = await service.getClientOperations(clientId);
				return new Response(JSON.stringify(operations), {
					headers: { "Content-Type": "application/json" },
				});
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error";
				if (
					errorMessage.includes("not found") ||
					errorMessage.includes("NOT_FOUND")
				) {
					return new Response(JSON.stringify({ error: "Client not found" }), {
						status: 404,
						headers: { "Content-Type": "application/json" },
					});
				}
				return new Response(
					JSON.stringify({
						error: "Failed to fetch operations",
						message: errorMessage,
					}),
					{
						status: 500,
						headers: { "Content-Type": "application/json" },
					},
				);
			}
		}

		// Route: /clients/{clientId}
		if (path.startsWith("/clients/") && request.method === "GET") {
			const clientId = path.split("/clients/")[1];
			// Remove any trailing path segments (e.g., "/transactions")
			const cleanClientId = clientId.split("/")[0];

			if (!cleanClientId) {
				return new Response(
					JSON.stringify({ error: "Client ID is required" }),
					{ status: 400, headers: { "Content-Type": "application/json" } },
				);
			}

			try {
				const service = new AlertServiceBinding(env);
				const client = await service.getClient(cleanClientId);
				return new Response(JSON.stringify(client), {
					headers: { "Content-Type": "application/json" },
				});
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error";
				if (
					errorMessage.includes("not found") ||
					errorMessage.includes("NOT_FOUND")
				) {
					return new Response(JSON.stringify({ error: "Client not found" }), {
						status: 404,
						headers: { "Content-Type": "application/json" },
					});
				}
				return new Response(
					JSON.stringify({
						error: "Failed to fetch client",
						message: errorMessage,
					}),
					{
						status: 500,
						headers: { "Content-Type": "application/json" },
					},
				);
			}
		}

		// Route: /operations?clientId={clientId} (alternative format)
		if (path === "/operations" && request.method === "GET") {
			const url = new URL(request.url);
			const clientId = url.searchParams.get("clientId");

			if (!clientId) {
				return new Response(
					JSON.stringify({ error: "clientId query parameter is required" }),
					{ status: 400, headers: { "Content-Type": "application/json" } },
				);
			}

			try {
				const service = new AlertServiceBinding(env);
				const operations = await service.getClientOperations(clientId);
				return new Response(JSON.stringify(operations), {
					headers: { "Content-Type": "application/json" },
				});
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error";
				if (
					errorMessage.includes("not found") ||
					errorMessage.includes("NOT_FOUND")
				) {
					return new Response(JSON.stringify({ error: "Client not found" }), {
						status: 404,
						headers: { "Content-Type": "application/json" },
					});
				}
				return new Response(
					JSON.stringify({
						error: "Failed to fetch operations",
						message: errorMessage,
					}),
					{
						status: 500,
						headers: { "Content-Type": "application/json" },
					},
				);
			}
		}

		// Route: /organization-settings/:organizationId (GET, PUT, PATCH)
		// Called via: env.AML_SERVICE.fetch(new Request(`https://internal/organization-settings/${organizationId}`))
		const orgSettingsMatch = path.match(/^\/organization-settings\/([^/]+)$/);
		if (orgSettingsMatch) {
			const [, organizationId] = orgSettingsMatch;
			return handleInternalOrganizationSettingsRequest(
				request,
				env,
				organizationId,
			);
		}

		// Route: /organization-settings/:organizationId/self-service (PATCH)
		// Called via: env.AML_SERVICE.fetch(new Request(`https://internal/organization-settings/${organizationId}/self-service`, { method: 'PATCH', body: ... }))
		const selfServiceMatch = path.match(
			/^\/organization-settings\/([^/]+)\/self-service$/,
		);
		if (selfServiceMatch) {
			const [, organizationId] = selfServiceMatch;
			return handleInternalSelfServiceSettingsRequest(
				request,
				env,
				organizationId,
			);
		}

		// Route: Screening endpoints (stale-screening, watchlist-query updates, and callback)
		// Called via: env.AML_SERVICE.fetch(new Request(`https://internal/clients/stale-screening?segment=0&limit=200`))
		// Called via: env.AML_SERVICE.fetch(new Request(`https://internal/clients/${id}/watchlist-query`, { method: 'PATCH', body: ... }))
		// Called via: env.AML_SERVICE.fetch(new Request(`https://internal/screening-callback`, { method: 'PATCH', body: ... }))
		if (
			path.startsWith("/clients/stale-screening") ||
			path.match(/^\/clients\/[^/]+\/watchlist-query$/) ||
			path === "/screening-callback"
		) {
			return handleInternalScreeningRequest(request, env, path);
		}

		// No route matched - return 404 with helpful error message
		return new Response(
			JSON.stringify({
				error: "Not Found",
				message: `No handler found for ${request.method} ${path}`,
				path,
				method: request.method,
			}),
			{
				status: 404,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		Sentry.captureException(error, {
			tags: { context: "service-binding-error" },
		});
		return new Response(
			JSON.stringify({
				error: "Internal Server Error",
				message: error instanceof Error ? error.message : "Unknown error",
				path,
				method: request.method,
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
}
