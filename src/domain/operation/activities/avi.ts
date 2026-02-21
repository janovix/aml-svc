import type { ActivityHandler, ActivityAlertMetadata } from "./types";
import type { OperationEntity } from "../types";
import { VirtualAssetExtensionSchema } from "../schemas";
import type { CatalogFieldsConfig } from "../../catalog/name-resolver";

export const CATALOG_FIELDS: CatalogFieldsConfig = {
	assetTypeCode: { catalog: "pld-asset-types", strategy: "BY_CODE" },
	exchangeCountryCode: { catalog: "countries", strategy: "BY_CODE" },
};

export const virtualAssetHandler: ActivityHandler = {
	code: "AVI",
	name: "Virtual Assets",
	lfpiropiFraccion: "XVI",
	identificationThresholdUma: "ALWAYS",
	noticeThresholdUma: 210,

	validateExtension(data: unknown): string | null {
		const result = VirtualAssetExtensionSchema.safeParse(data);
		if (!result.success) {
			return result.error.errors[0]?.message ?? "Invalid virtual asset data";
		}
		return null;
	},

	extractAlertMetadata(operation: OperationEntity): ActivityAlertMetadata {
		const va = operation.virtualAsset;
		const riskFactors: string[] = [];

		if (va) {
			// Check for privacy coins
			const privacyCoins = ["XMR", "MONERO", "ZEC", "ZCASH", "DASH"];
			if (
				va.assetName &&
				privacyCoins.some((c) => va.assetName?.toUpperCase().includes(c))
			) {
				riskFactors.push("privacy_coin");
			}

			// Check for high-risk exchanges or jurisdictions
			const highRiskCountries = ["KP", "IR", "SY", "CU"];
			if (
				va.exchangeCountryCode &&
				highRiskCountries.includes(va.exchangeCountryCode)
			) {
				riskFactors.push("high_risk_jurisdiction");
			}

			// Check for unhosted wallets (simplified check)
			if (va.walletAddressDestination && !va.exchangeName) {
				riskFactors.push("unhosted_wallet");
			}
		}

		return {
			subject: va?.assetName ?? "Virtual Asset",
			attributes: {
				assetType: va?.assetTypeCode ?? null,
				assetName: va?.assetName ?? null,
				walletOrigin: va?.walletAddressOrigin ?? null,
				walletDestination: va?.walletAddressDestination ?? null,
				exchange: va?.exchangeName ?? null,
				exchangeCountry: va?.exchangeCountryCode ?? null,
				quantity: va?.assetQuantity ?? null,
				unitPrice: va?.assetUnitPrice ?? null,
				txHash: va?.blockchainTxHash ?? null,
			},
			riskFactors,
		};
	},

	getApplicableAlertTypes(): string[] {
		// Alert types should be loaded from pld-alert-types catalog filtered by VA code
		return [this.code];
	},

	generateDetailXml(operation: OperationEntity): string {
		const va = operation.virtualAsset;
		if (!va) {
			return "<DETALLE_OPERACIONES />";
		}

		const elements: string[] = [];

		if (va.assetTypeCode) {
			elements.push(
				`<TIPO_ACTIVO>${escapeXml(va.assetTypeCode)}</TIPO_ACTIVO>`,
			);
		}
		if (va.assetName) {
			elements.push(
				`<NOMBRE_ACTIVO>${escapeXml(va.assetName)}</NOMBRE_ACTIVO>`,
			);
		}
		if (va.walletAddressOrigin) {
			elements.push(
				`<DIRECCION_ORIGEN>${escapeXml(va.walletAddressOrigin)}</DIRECCION_ORIGEN>`,
			);
		}
		if (va.walletAddressDestination) {
			elements.push(
				`<DIRECCION_DESTINO>${escapeXml(va.walletAddressDestination)}</DIRECCION_DESTINO>`,
			);
		}
		if (va.exchangeName) {
			elements.push(
				`<NOMBRE_EXCHANGE>${escapeXml(va.exchangeName)}</NOMBRE_EXCHANGE>`,
			);
		}
		if (va.exchangeCountryCode) {
			elements.push(
				`<PAIS_EXCHANGE>${escapeXml(va.exchangeCountryCode)}</PAIS_EXCHANGE>`,
			);
		}
		if (va.assetQuantity) {
			elements.push(`<CANTIDAD>${va.assetQuantity}</CANTIDAD>`);
		}
		if (va.assetUnitPrice) {
			elements.push(`<PRECIO_UNITARIO>${va.assetUnitPrice}</PRECIO_UNITARIO>`);
		}
		if (va.blockchainTxHash) {
			elements.push(
				`<HASH_TRANSACCION>${escapeXml(va.blockchainTxHash)}</HASH_TRANSACCION>`,
			);
		}

		return `<DETALLE_OPERACIONES>\n  ${elements.join("\n  ")}\n</DETALLE_OPERACIONES>`;
	},
};

function escapeXml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}
