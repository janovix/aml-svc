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

import type { Bindings } from "../index";
import { getPrismaClient } from "./prisma";
import { AlertRuleRepository, AlertRepository } from "../domain/alert";
import { AlertService, AlertRuleService } from "../domain/alert";
import { UmaValueRepository } from "../domain/uma";
import { UmaValueService } from "../domain/uma";

/**
 * Service binding helper functions for alert operations
 * These can be called directly from other workers via service binding
 */
export class AlertServiceBinding {
	constructor(private readonly env: Bindings) {}

	/**
	 * Get all active alert rules
	 * Called via: env.AML_SERVICE.fetch(new Request("https://internal/alert-rules/active"))
	 */
	async getActiveAlertRules() {
		const prisma = getPrismaClient(this.env.DB);
		const repository = new AlertRuleRepository(prisma);
		const service = new AlertRuleService(repository);
		return service.listActive();
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
	async getClient(_clientId: string) {
		// This would need to import ClientService
		// For now, return a placeholder - the actual implementation would use ClientService
		throw new Error("Not implemented - use ClientService directly");
	}

	/**
	 * Get client transactions
	 * Called via: env.AML_SERVICE.fetch(new Request(`https://internal/clients/${clientId}/transactions`))
	 */
	async getClientTransactions(_clientId: string) {
		// This would need to import TransactionService
		// For now, return a placeholder - the actual implementation would use TransactionService
		throw new Error("Not implemented - use TransactionService directly");
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
		alertData: Record<string, unknown>;
		triggerTransactionId?: string | null;
		notes?: string | null;
	}) {
		const prisma = getPrismaClient(this.env.DB);
		const repository = new AlertRepository(prisma);
		const service = new AlertService(repository);
		return service.create(alertData);
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
	const path = url.pathname;

	try {
		// Route: /internal/alert-rules/active
		if (path === "/internal/alert-rules/active" && request.method === "GET") {
			const service = new AlertServiceBinding(env);
			const rules = await service.getActiveAlertRules();
			return new Response(JSON.stringify(rules), {
				headers: { "Content-Type": "application/json" },
			});
		}

		// Route: /internal/alerts (POST)
		if (path === "/internal/alerts" && request.method === "POST") {
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

		// Route: /internal/uma-values/active
		if (path === "/internal/uma-values/active" && request.method === "GET") {
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

		// Route: /internal/clients/{clientId}
		if (path.startsWith("/internal/clients/") && request.method === "GET") {
			// const clientId = path.split("/internal/clients/")[1];
			// This would need ClientService - for now return 501
			return new Response(
				JSON.stringify({ error: "Not implemented via service binding" }),
				{ status: 501, headers: { "Content-Type": "application/json" } },
			);
		}

		// Route: /internal/clients/{clientId}/transactions
		if (
			path.startsWith("/internal/clients/") &&
			path.endsWith("/transactions") &&
			request.method === "GET"
		) {
			// const clientId = path
			// 	.split("/internal/clients/")[1]
			// 	.split("/transactions")[0];
			// This would need TransactionService - for now return 501
			return new Response(
				JSON.stringify({ error: "Not implemented via service binding" }),
				{ status: 501, headers: { "Content-Type": "application/json" } },
			);
		}

		return new Response("Not Found", { status: 404 });
	} catch (error) {
		console.error("Service binding error:", error);
		return new Response(
			JSON.stringify({
				error: "Internal Server Error",
				message: error instanceof Error ? error.message : "Unknown error",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
}
