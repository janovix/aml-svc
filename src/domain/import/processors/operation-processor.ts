/**
 * Operation Processor
 * Processes operation rows from CSV/Excel import using direct service calls.
 */

import type { PrismaClient } from "@prisma/client";
import type { Bindings } from "../../../types";
import type { ParsedRow, RowProcessingResult } from "../types";
import { ClientRepository } from "../../client/repository";
import { ClientService } from "../../client/service";
import {
	OperationService,
	DuplicateOperationError,
} from "../../operation/service";
import { createAlertQueueService } from "../../../lib/alert-queue";

export function getOperationRequiredHeaders(): string[] {
	return [
		"client_rfc",
		"operation_date",
		"branch_postal_code",
		"amount",
		"currency",
		"payment_form_code_1",
		"payment_amount_1",
	];
}

function validateOperationRow(
	data: Record<string, string>,
	activityCode: string,
): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	const requiredFields = [
		"client_rfc",
		"operation_date",
		"branch_postal_code",
		"amount",
		"currency",
		"payment_form_code_1",
		"payment_amount_1",
	];

	for (const field of requiredFields) {
		if (!data[field] || data[field].trim() === "") {
			errors.push(`Missing required field: ${field}`);
		}
	}

	if (data.operation_date && !isValidDate(data.operation_date)) {
		errors.push(`Invalid operation_date format: ${data.operation_date}`);
	}

	if (data.amount) {
		const amount = parseFloat(data.amount);
		if (isNaN(amount) || amount <= 0) {
			errors.push(`Invalid amount: ${data.amount}`);
		}
	}

	if (data.payment_amount_1) {
		const paymentAmount = parseFloat(data.payment_amount_1);
		if (isNaN(paymentAmount) || paymentAmount <= 0) {
			errors.push(`Invalid payment_amount_1: ${data.payment_amount_1}`);
		}
	}

	const activityRequiredFields: Record<string, string[]> = {
		VEH: ["vehicle_type", "brand", "model", "year"],
		INM: ["property_type_code"],
		MJR: ["item_type_code"],
		AVI: ["asset_type_code"],
		ARI: ["property_type_code"],
		BLI: ["item_type", "armor_level_code"],
		DON: ["donation_type"],
		MPC: ["principal_amount"],
		FEP: ["act_type_code"],
		FES: ["act_type_code"],
		SPR: ["service_type_code"],
		CHV: ["denomination_code", "check_count"],
		TSC: ["card_type_code"],
		TPP: ["card_type"],
		TDR: ["reward_type"],
		TCV: ["value_type_code"],
		OBA: ["artwork_type_code"],
		DIN: ["development_type_code"],
	};

	const activityRequired = activityRequiredFields[activityCode] || [];
	for (const field of activityRequired) {
		if (!data[field] || data[field].trim() === "") {
			errors.push(`Missing required field for ${activityCode}: ${field}`);
		}
	}

	return { valid: errors.length === 0, errors };
}

function collectPaymentMethods(data: Record<string, string>): Array<{
	paymentDate: string;
	paymentFormCode: string;
	amount: string;
	currencyCode: string;
	exchangeRate?: string | null;
}> {
	const payments: Array<{
		paymentDate: string;
		paymentFormCode: string;
		amount: string;
		currencyCode: string;
		exchangeRate?: string | null;
	}> = [];

	for (let i = 1; i <= 5; i++) {
		const formCode = data[`payment_form_code_${i}`];
		const amount = data[`payment_amount_${i}`];

		if (formCode && amount) {
			payments.push({
				paymentDate: data[`payment_date_${i}`] || data.operation_date,
				paymentFormCode: formCode,
				amount,
				currencyCode: data[`payment_currency_${i}`] || data.currency || "MXN",
				exchangeRate: data[`payment_exchange_rate_${i}`] || null,
			});
		}
	}

	return payments;
}

function mapExtensionData(
	data: Record<string, string>,
	_activityCode: string,
): Record<string, unknown> {
	const snakeToCamel = (str: string): string => {
		return str.replace(/_([a-z])/g, (_, letter: string) =>
			letter.toUpperCase(),
		);
	};

	const extension: Record<string, unknown> = {};

	const coreFields = [
		"client_rfc",
		"operation_date",
		"operation_type_code",
		"branch_postal_code",
		"amount",
		"currency",
		"exchange_rate",
		"alert_type_code",
		"reference_number",
		"notes",
	];

	const paymentFieldPrefixes = [
		"payment_date_",
		"payment_form_code_",
		"payment_amount_",
		"payment_currency_",
		"payment_exchange_rate_",
	];

	for (const [key, value] of Object.entries(data)) {
		if (coreFields.includes(key)) continue;
		if (paymentFieldPrefixes.some((prefix) => key.startsWith(prefix))) continue;
		if (!value || value.trim() === "") continue;

		const camelKey = snakeToCamel(key);

		if (value.toLowerCase() === "true" || value.toLowerCase() === "false") {
			extension[camelKey] = value.toLowerCase() === "true";
		} else if (!isNaN(Number(value)) && value.trim() !== "") {
			if (
				key.includes("year") ||
				key.includes("months") ||
				key.includes("count") ||
				key.includes("_m2")
			) {
				extension[camelKey] = parseInt(value, 10);
			} else {
				extension[camelKey] = value;
			}
		} else {
			extension[camelKey] = value;
		}
	}

	return extension;
}

function getExtensionKey(activityCode: string): string {
	const extensionKeys: Record<string, string> = {
		VEH: "vehicle",
		INM: "realEstate",
		MJR: "jewelry",
		AVI: "virtualAsset",
		JYS: "gambling",
		ARI: "rental",
		BLI: "armoring",
		DON: "donation",
		MPC: "loan",
		FEP: "official",
		FES: "notary",
		SPR: "professional",
		CHV: "travelerCheck",
		TSC: "card",
		TPP: "prepaid",
		TDR: "reward",
		TCV: "valuable",
		OBA: "art",
		DIN: "development",
	};

	return extensionKeys[activityCode] || activityCode.toLowerCase();
}

async function computeImportHash(
	data: Record<string, string>,
	activityCode: string,
): Promise<string> {
	const parts: string[] = [
		(data.client_rfc || "").toUpperCase(),
		data.operation_date || "",
		activityCode,
		data.amount || "",
		(data.currency || "MXN").toUpperCase(),
		data.branch_postal_code || "",
		data.reference_number || "",
		data.exchange_rate || "",
		data.operation_type_code || "",
		data.notes || "",
	];

	for (let i = 1; i <= 5; i++) {
		const formCode = data[`payment_form_code_${i}`] || "";
		const amount = data[`payment_amount_${i}`] || "";
		if (formCode || amount) {
			parts.push(`p${i}:${formCode}:${amount}`);
		}
	}

	const extensionKeys = Object.keys(data)
		.filter((key) => {
			const coreFields = [
				"client_rfc",
				"operation_date",
				"operation_type_code",
				"branch_postal_code",
				"amount",
				"currency",
				"exchange_rate",
				"alert_type_code",
				"reference_number",
				"notes",
			];
			const paymentPrefixes = [
				"payment_date_",
				"payment_form_code_",
				"payment_amount_",
				"payment_currency_",
				"payment_exchange_rate_",
			];
			if (coreFields.includes(key)) return false;
			if (paymentPrefixes.some((p) => key.startsWith(p))) return false;
			return true;
		})
		.sort();

	for (const key of extensionKeys) {
		const value = (data[key] || "").trim();
		if (value) {
			parts.push(`${key}=${value}`);
		}
	}

	const payload = parts.join("|");
	const encoded = new TextEncoder().encode(payload);
	const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Processes a single operation row using direct service calls.
 */
export async function processOperationRow(
	prisma: PrismaClient,
	env: Bindings,
	organizationId: string,
	activityCode: string,
	row: ParsedRow,
): Promise<RowProcessingResult> {
	const { rowNumber, data } = row;

	const validation = validateOperationRow(data, activityCode);
	if (!validation.valid) {
		return {
			rowNumber,
			status: "ERROR",
			errors: validation.errors,
			message: `Validation failed: ${validation.errors.join("; ")}`,
		};
	}

	// Look up client by RFC using direct service call
	const clientRepo = new ClientRepository(prisma);
	const clientService = new ClientService(clientRepo);

	let clientId: string;
	try {
		const client = await clientService.findByRfc(
			organizationId,
			data.client_rfc.toUpperCase(),
		);

		if (!client) {
			return {
				rowNumber,
				status: "ERROR",
				errors: [`Client with RFC ${data.client_rfc} not found`],
				message: `Client with RFC ${data.client_rfc} not found. Please import clients first.`,
			};
		}

		clientId = client.id;
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		return {
			rowNumber,
			status: "ERROR",
			errors: [errorMessage],
			message: `Failed to lookup client: ${errorMessage}`,
		};
	}

	const payments = collectPaymentMethods(data);
	const extensionData = mapExtensionData(data, activityCode);
	const extensionKey = getExtensionKey(activityCode);
	const importHash = await computeImportHash(data, activityCode);

	const operationPayload = {
		clientId,
		activityCode,
		operationTypeCode: data.operation_type_code || null,
		operationDate: data.operation_date,
		branchPostalCode: data.branch_postal_code,
		amount: data.amount,
		currencyCode: data.currency || "MXN",
		exchangeRate: data.exchange_rate || null,
		alertTypeCode: data.alert_type_code || "100",
		priorityCode: "2",
		referenceNumber: data.reference_number || null,
		notes: data.notes || null,
		dataSource: "IMPORT" as const,
		importHash,
		payments,
		[extensionKey]: extensionData,
	};

	try {
		const operationService = new OperationService(prisma);
		const created = await operationService.create(
			organizationId,
			operationPayload,
		);

		// Queue alert detection (best-effort)
		try {
			const alertQueue = createAlertQueueService(env.ALERT_DETECTION_QUEUE);
			await alertQueue.queueOperationCreated(
				created.clientId,
				created.id,
				organizationId,
			);
		} catch {
			/* best-effort */
		}

		return {
			rowNumber,
			status: "SUCCESS",
			entityId: created.id,
			message: "Operation created successfully",
		};
	} catch (error) {
		if (error instanceof DuplicateOperationError) {
			return {
				rowNumber,
				status: "SKIPPED",
				message:
					"Operación duplicada — ya existe una operación idéntica importada previamente",
			};
		}

		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		console.error(`[OperationProcessor] Row ${rowNumber} error:`, error);
		return {
			rowNumber,
			status: "ERROR",
			errors: [errorMessage],
			message: `Failed to create operation: ${errorMessage}`,
		};
	}
}

function isValidDate(dateStr: string): boolean {
	const date = new Date(dateStr);
	return !isNaN(date.getTime());
}
