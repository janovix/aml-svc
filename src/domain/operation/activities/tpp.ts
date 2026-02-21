import type { ActivityHandler, ActivityAlertMetadata } from "./types";
import type { OperationEntity } from "../types";
import { PrepaidExtensionSchema } from "../schemas";
import type { CatalogFieldsConfig } from "../../catalog/name-resolver";

export const CATALOG_FIELDS: CatalogFieldsConfig = {
	cardTypeCode: { catalog: "pld-card-types", strategy: "BY_CODE" },
};

export const prepaidHandler: ActivityHandler = {
	code: "TPP",
	name: "Prepaid Cards",
	lfpiropiFraccion: "II-b,c",
	identificationThresholdUma: 645,
	noticeThresholdUma: 645,

	validateExtension(data: unknown): string | null {
		const result = PrepaidExtensionSchema.safeParse(data);
		if (!result.success) {
			return result.error.errors[0]?.message ?? "Invalid prepaid card data";
		}
		return null;
	},

	extractAlertMetadata(operation: OperationEntity): ActivityAlertMetadata {
		const p = operation.prepaid;
		const riskFactors: string[] = [];

		if (p) {
			// Check for high reload amount
			const reloadAmount = p.reloadAmount ? parseFloat(p.reloadAmount) : 0;
			if (reloadAmount > 50000) {
				riskFactors.push("high_reload_amount");
			}

			// Check for high balance
			const balance = p.currentBalance ? parseFloat(p.currentBalance) : 0;
			if (balance > 100000) {
				riskFactors.push("high_balance");
			}

			// Check for initial load patterns
			if (p.isInitialLoad) {
				riskFactors.push("initial_load");
			}

			// Check for gift cards
			if (
				p.cardType?.toUpperCase().includes("GIFT") ||
				p.cardType?.toUpperCase().includes("REGALO")
			) {
				riskFactors.push("gift_card");
			}
		}

		return {
			subject: p?.cardType ?? "Prepaid Card",
			attributes: {
				cardType: p?.cardType ?? null,
				cardNumberMasked: p?.cardNumberMasked ?? null,
				isInitialLoad: p?.isInitialLoad ?? null,
				reloadAmount: p?.reloadAmount ?? null,
				currentBalance: p?.currentBalance ?? null,
				issuerName: p?.issuerName ?? null,
			},
			riskFactors,
		};
	},

	getApplicableAlertTypes(): string[] {
		// Alert types should be loaded from pld-alert-types catalog filtered by VA code
		return [this.code];
	},

	generateDetailXml(operation: OperationEntity): string {
		const p = operation.prepaid;
		if (!p) {
			return "<DETALLE_OPERACIONES />";
		}

		const elements: string[] = [];

		if (p.cardType) {
			elements.push(`<TIPO_TARJETA>${escapeXml(p.cardType)}</TIPO_TARJETA>`);
		}
		if (p.cardNumberMasked) {
			elements.push(
				`<NUMERO_TARJETA>${escapeXml(p.cardNumberMasked)}</NUMERO_TARJETA>`,
			);
		}
		if (p.isInitialLoad !== null && p.isInitialLoad !== undefined) {
			elements.push(
				`<ES_CARGA_INICIAL>${p.isInitialLoad ? "SI" : "NO"}</ES_CARGA_INICIAL>`,
			);
		}
		if (p.reloadAmount) {
			elements.push(`<MONTO_RECARGA>${p.reloadAmount}</MONTO_RECARGA>`);
		}
		if (p.currentBalance) {
			elements.push(`<SALDO_ACTUAL>${p.currentBalance}</SALDO_ACTUAL>`);
		}
		if (p.issuerName) {
			elements.push(
				`<NOMBRE_EMISOR>${escapeXml(p.issuerName)}</NOMBRE_EMISOR>`,
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
