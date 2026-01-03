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
import { TransactionRepository } from "../domain/transaction";
import { TransactionService } from "../domain/transaction";
import { generateAndUploadSatFile } from "./sat-file-generator";
import { CatalogRepository } from "../domain/catalog/repository";
import { CatalogEnrichmentService } from "../domain/catalog/enrichment-service";

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
		metadata: Record<string, unknown>; // Renamed from alertData
		transactionId?: string | null; // Renamed from triggerTransactionId
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

		// Get organizationId from alert first (it should have it from Prisma)
		const alertWithOrg = await prisma.alert.findUnique({
			where: { id: alertId },
			select: { organizationId: true },
		});
		if (!alertWithOrg) {
			throw new Error(`Alert not found: ${alertId}`);
		}
		const organizationId = alertWithOrg.organizationId;

		const alertRepository = new AlertRepository(prisma);
		const alertService = new AlertService(alertRepository);

		// Get alert with organization context
		const alert = await alertService.get(organizationId, alertId);
		if (!alert.transactionId) {
			throw new Error("Alert has no trigger transaction");
		}

		// Get client (RFC is the ID)
		const clientRepository = new ClientRepository(prisma);
		const clientService = new ClientService(clientRepository);
		const client = await clientService.get(organizationId, alert.clientId);

		// Get transaction
		const umaRepository = new UmaValueRepository(prisma);
		const catalogRepository = new CatalogRepository(prisma);
		const catalogEnrichmentService = new CatalogEnrichmentService(
			catalogRepository,
		);
		const transactionRepository = new TransactionRepository(
			prisma,
			umaRepository,
			catalogEnrichmentService,
		);
		const transactionService = new TransactionService(
			transactionRepository,
			clientRepository, // Reuse clientRepository
			umaRepository,
		);
		const transaction = await transactionService.get(
			organizationId,
			alert.transactionId,
		);

		// Generate and upload file
		if (!this.env.R2_BUCKET) {
			throw new Error("R2_BUCKET not configured");
		}

		// Use the catalogRepository already created above for SAT file generation
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
			organizationId,
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
	let path = url.pathname;

	// When using service bindings with https://internal/..., Cloudflare strips the /internal prefix
	// So /internal/alert-rules/active becomes /alert-rules/active
	// But Hono route /internal/* matches and passes the full path, so we need to handle both cases
	// Remove /internal prefix if present for consistent matching
	if (path.startsWith("/internal/")) {
		path = path.slice("/internal".length);
	}

	// Debug logging for service binding requests
	console.log(
		`[ServiceBinding] ${request.method} ${path} (original pathname: ${url.pathname}, full URL: ${request.url})`,
	);

	try {
		// Route: /alert-rules/active (global - no organizationId required)
		if (path === "/alert-rules/active" && request.method === "GET") {
			console.log("[ServiceBinding] Fetching active alert rules for seekers");
			const service = new AlertServiceBinding(env);
			const rules = await service.getActiveAlertRules();
			console.log(
				`[ServiceBinding] Found ${rules.length} active alert rules for seekers`,
			);
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

		// Route: /clients/{clientId}
		if (path.startsWith("/clients/") && request.method === "GET") {
			// const clientId = path.split("/clients/")[1];
			// This would need ClientService - for now return 501
			return new Response(
				JSON.stringify({ error: "Not implemented via service binding" }),
				{ status: 501, headers: { "Content-Type": "application/json" } },
			);
		}

		// Route: /clients/{clientId}/transactions
		if (
			path.startsWith("/clients/") &&
			path.endsWith("/transactions") &&
			request.method === "GET"
		) {
			// const clientId = path.split("/clients/")[1].split("/transactions")[0];
			// This would need TransactionService - for now return 501
			return new Response(
				JSON.stringify({ error: "Not implemented via service binding" }),
				{ status: 501, headers: { "Content-Type": "application/json" } },
			);
		}

		// Route: /alerts/{alertId}/generate-file
		if (
			path.startsWith("/alerts/") &&
			path.endsWith("/generate-file") &&
			request.method === "POST"
		) {
			const alertId = path.split("/alerts/")[1].split("/generate-file")[0];
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

		// No route matched - return 404 with helpful error message
		console.warn(
			`[ServiceBinding] No route matched for ${request.method} ${path}`,
		);
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
		console.error("[ServiceBinding] Error processing request:", error);
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
