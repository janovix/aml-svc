/**
 * SAT File Generator Service
 * Orchestrates XML generation and R2 upload for SAT vehicle notices
 */

// R2Bucket type from Cloudflare Workers runtime
type R2Bucket = {
	put(
		key: string,
		value: ReadableStream | ArrayBuffer | ArrayBufferView | string | null,
		options?: R2PutOptions,
	): Promise<R2Object>;
};

type R2PutOptions = {
	httpMetadata?: {
		contentType?: string;
		contentEncoding?: string;
		cacheControl?: string;
		cacheExpiry?: Date;
	};
	customMetadata?: Record<string, string>;
};

type R2Object = {
	key: string;
	size: number;
	etag: string;
};
import type { AlertEntity } from "../domain/alert/types";
import type { ClientEntity } from "../domain/client/types";
import type { TransactionEntity } from "../domain/transaction/types";
import {
	generateSatVehicleNoticeXml,
	mapToSatVehicleNoticeData,
	type SatVehicleNoticeData,
} from "./sat-xml-generator";
import { generateAlertFileKey, uploadToR2 } from "./r2-upload";

export interface SatFileGeneratorConfig {
	r2Bucket: R2Bucket;
	obligatedSubjectKey: string;
	activityKey: string; // e.g., "VEH"
	collegiateEntityKey?: string;
	// Catalog lookups using existing Catalog system
	getCatalogValue: (
		catalogKey: string,
		itemName: string,
	) => Promise<string | null>; // Returns the catalog item's normalizedName or name
}

export interface SatFileGenerationResult {
	fileUrl: string;
	fileKey: string;
	fileSize: number;
	etag: string;
}

/**
 * Generates SAT XML file and uploads it to R2
 */
export async function generateAndUploadSatFile(
	alert: AlertEntity,
	client: ClientEntity,
	transaction: TransactionEntity,
	config: SatFileGeneratorConfig,
): Promise<SatFileGenerationResult> {
	// Get catalog values using existing Catalog system
	// Catalog keys should match the catalog.key field in the database
	const operationType =
		(await config.getCatalogValue("operation-types", "802")) || "802"; // Default from example
	const currency = (await config.getCatalogValue("currencies", "3")) || "3"; // "3" for MXN in example
	// Map vehicle type
	const vehicleType =
		transaction.vehicleType === "land"
			? "terrestre"
			: transaction.vehicleType === "marine"
				? "maritimo"
				: "aereo";
	// Get brand name from catalog
	const brand =
		(await config.getCatalogValue("vehicle-brands", transaction.brandId)) ||
		transaction.brandId; // Fallback to brandId if not found
	const nationalityCountry =
		(await config.getCatalogValue("countries", client.nationality || "MX")) ||
		client.nationality ||
		"MX";
	// Get payment form codes from catalog
	const paymentForm =
		(await config.getCatalogValue("payment-forms", "1")) || "1"; // Default from example
	const monetaryInstrument = "1"; // Default from example

	// Map to SAT format
	const satData: SatVehicleNoticeData = mapToSatVehicleNoticeData(
		alert,
		client,
		transaction,
		{
			obligatedSubjectKey: config.obligatedSubjectKey,
			activityKey: config.activityKey,
			noticeReference: alert.id,
			priority: "1", // Default priority
			alertType: "803", // Default alert type from example
			operationType,
			currency,
			vehicleType,
			brand,
			nationalityCountry,
			economicActivity: undefined, // Can be populated from catalog if needed
			paymentForm,
			monetaryInstrument,
		},
	);

	// Generate XML
	const xmlContent = generateSatVehicleNoticeXml(satData);

	// Generate file key
	const fileKey = generateAlertFileKey(alert.id);

	// Upload to R2
	const uploadResult = await uploadToR2({
		bucket: config.r2Bucket,
		key: fileKey,
		content: xmlContent,
		contentType: "application/xml",
		metadata: {
			alertId: alert.id,
			clientId: client.rfc,
			transactionId: transaction.id,
			generatedAt: new Date().toISOString(),
		},
	});

	return {
		fileUrl: uploadResult.url,
		fileKey: uploadResult.key,
		fileSize: uploadResult.size,
		etag: uploadResult.etag,
	};
}
