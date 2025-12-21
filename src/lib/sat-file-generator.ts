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
	claveSujetoObligado: string;
	tipoSujetoObligado: string;
	claveEntidadColegiada?: string;
	// Catalog lookups (simplified - in production these should come from database)
	getCatalogValue: (
		catalogCode: string,
		itemCode: string,
	) => Promise<string | null>;
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
	// Get catalog values
	const tipoOperacion =
		(await config.getCatalogValue("CAT_TIPO_OPERACION", "1")) || "1"; // Default to "1" (Compra)
	const moneda = (await config.getCatalogValue("CAT_MONEDA", "MXN")) || "MXN";
	const tipoVehiculo =
		(await config.getCatalogValue(
			"CAT_TIPO_VEHICULO",
			transaction.vehicleType === "land" ? "1" : "2",
		)) || "1";
	// TODO: Map brandId to catalog code
	const marca =
		(await config.getCatalogValue("CAT_MARCA_VEHICULO", "1")) || "1";
	const color =
		(await config.getCatalogValue("CAT_COLOR_VEHICULO", "1")) || "1";
	const tipoPersona =
		client.personType === "physical"
			? "1"
			: client.personType === "moral"
				? "2"
				: "1";
	const paisNacionalidad =
		(await config.getCatalogValue("CAT_PAIS", client.nationality || "MX")) ||
		"MX";
	const pais =
		(await config.getCatalogValue("CAT_PAIS", client.country || "MX")) || "MX";
	const entidadFederativa =
		client.country === "MX"
			? await config.getCatalogValue("CAT_ENTIDAD_FEDERATIVA", client.stateCode)
			: undefined;

	// Map to SAT format
	const satData: SatVehicleNoticeData = mapToSatVehicleNoticeData(
		alert,
		client,
		transaction,
		{
			claveSujetoObligado: config.claveSujetoObligado,
			tipoSujetoObligado: config.tipoSujetoObligado,
			claveEntidadColegiada: config.claveEntidadColegiada,
			tipoOperacion,
			moneda,
			tipoVehiculo,
			marca,
			color,
			tipoPersona,
			paisNacionalidad,
			pais,
			entidadFederativa: entidadFederativa || undefined,
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
