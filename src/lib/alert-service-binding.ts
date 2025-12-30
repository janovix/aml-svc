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
import { ClientRepository } from "../domain/client";
import { ClientService } from "../domain/client";
import { TransactionRepository } from "../domain/transaction";
import { TransactionService } from "../domain/transaction";
import { generateAndUploadSatFile } from "./sat-file-generator";

// R2Bucket type for compatibility
type R2Bucket = {
	put(
		key: string,
		value: ReadableStream | ArrayBuffer | ArrayBufferView | string | null,
		options?: {
			httpMetadata?: {
				contentType?: string;
				contentEncoding?: string;
				cacheControl?: string;
				cacheExpiry?: Date;
			};
			customMetadata?: Record<string, string>;
		},
	): Promise<{ key: string; size: number; etag: string }>;
};

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

		// Get organizationId from client
		const client = await prisma.client.findUnique({
			where: { rfc: alertData.clientId },
			select: { organizationId: true },
		});

		if (!client) {
			throw new Error(`Client not found: ${alertData.clientId}`);
		}

		return service.create(alertData, client.organizationId);
	}

	/**
	 * Generate and upload SAT XML file for an alert
	 * Called via: env.AML_SERVICE.fetch(new Request(`https://internal/alerts/${alertId}/generate-file`, { method: "POST" }))
	 */
	async generateSatFile(alertId: string) {
		if (!this.env.R2_BUCKET) {
			throw new Error("R2_BUCKET not configured");
		}

		const prisma = getPrismaClient(this.env.DB);
		const alertRepository = new AlertRepository(prisma);
		const alertService = new AlertService(alertRepository);

		// Get alert
		const alert = await alertService.get(alertId);
		if (!alert.triggerTransactionId) {
			throw new Error("Alert has no trigger transaction");
		}

		// Get client (RFC is the ID)
		// Get organizationId from alert (it should have it from Prisma)
		const alertWithOrg = await prisma.alert.findUnique({
			where: { id: alertId },
			select: { organizationId: true },
		});
		if (!alertWithOrg) {
			throw new Error(`Alert not found: ${alertId}`);
		}
		const clientRepository = new ClientRepository(prisma);
		const clientService = new ClientService(clientRepository);
		const client = await clientService.get(
			alertWithOrg.organizationId,
			alert.clientId,
		);

		// Get transaction
		const umaRepository = new UmaValueRepository(prisma);
		const transactionRepository = new TransactionRepository(
			prisma,
			umaRepository,
		);
		const transactionService = new TransactionService(
			transactionRepository,
			clientRepository, // Reuse clientRepository
			umaRepository,
		);
		const transaction = await transactionService.get(
			alert.triggerTransactionId,
		);

		// Generate and upload file
		if (!this.env.R2_BUCKET) {
			throw new Error("R2_BUCKET not configured");
		}

		// Import CatalogRepository for catalog lookups
		const { CatalogRepository } = await import("../domain/catalog");
		const catalogRepository = new CatalogRepository(prisma);

		const result = await generateAndUploadSatFile(alert, client, transaction, {
			r2Bucket: this.env.R2_BUCKET as unknown as R2Bucket, // Type assertion for compatibility
			obligatedSubjectKey: this.env.SAT_CLAVE_SUJETO_OBLIGADO || "000000000000",
			activityKey: this.env.SAT_CLAVE_ACTIVIDAD || "VEH",
			collegiateEntityKey: this.env.SAT_CLAVE_ENTIDAD_COLEGIADA,
			getCatalogValue: async (catalogKey: string, code: string) => {
				try {
					// Look up catalog by key
					const catalog = await catalogRepository.findByKey(catalogKey);
					if (!catalog) {
						return null;
					}
					// Search for catalog item by code (stored in metadata.code)
					// We need to search all items and find the one with matching code in metadata
					const result = await catalogRepository.listItems(catalog.id, {
						page: 1,
						pageSize: 1000, // Get all items to search metadata
						active: true,
					});
					// Find item where metadata.code matches the requested code
					const item = result.data.find((item) => {
						if (!item.metadata || typeof item.metadata !== "object") {
							return false;
						}
						return (item.metadata as { code?: string }).code === code;
					});
					// Return the code from metadata if found
					return item
						? (item.metadata as { code?: string }).code || code
						: null;
				} catch (error) {
					console.error(`Error looking up catalog ${catalogKey}:`, error);
					return null;
				}
			},
		});

		// Update alert with file URL
		const updatedAlert = await alertService.updateSatFileUrl(
			alertId,
			result.fileUrl,
		);

		return {
			alert: updatedAlert,
			fileUrl: result.fileUrl,
			fileKey: result.fileKey,
			fileSize: result.fileSize,
		};
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

		// Route: /internal/alerts/{alertId}/generate-file
		if (
			path.startsWith("/internal/alerts/") &&
			path.endsWith("/generate-file") &&
			request.method === "POST"
		) {
			const alertId = path
				.split("/internal/alerts/")[1]
				.split("/generate-file")[0];
			const service = new AlertServiceBinding(env);
			try {
				const result = await service.generateSatFile(alertId);
				return new Response(JSON.stringify(result), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			} catch (error) {
				return new Response(
					JSON.stringify({
						error: "Failed to generate SAT file",
						message: error instanceof Error ? error.message : "Unknown error",
					}),
					{
						status: 500,
						headers: { "Content-Type": "application/json" },
					},
				);
			}
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
