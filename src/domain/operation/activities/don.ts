import type { ActivityHandler, ActivityAlertMetadata } from "./types";
import type { OperationEntity } from "../types";
import { DonationExtensionSchema } from "../schemas";
import type { CatalogFieldsConfig } from "../../catalog/name-resolver";

export const CATALOG_FIELDS: CatalogFieldsConfig = {
	itemTypeCode: { catalog: "pld-item-types", strategy: "BY_CODE" },
};

export const donationHandler: ActivityHandler = {
	code: "DON",
	name: "Donations",
	lfpiropiFraccion: "XIII",
	identificationThresholdUma: 1605,
	noticeThresholdUma: 3210,

	validateExtension(data: unknown): string | null {
		const result = DonationExtensionSchema.safeParse(data);
		if (!result.success) {
			return result.error.errors[0]?.message ?? "Invalid donation data";
		}
		return null;
	},

	extractAlertMetadata(operation: OperationEntity): ActivityAlertMetadata {
		const d = operation.donation;
		const riskFactors: string[] = [];

		if (d) {
			// Check for anonymous donations
			if (d.isAnonymous) {
				riskFactors.push("anonymous_donation");
			}

			// Check for high-value item donations
			const itemValue = d.itemValue ? parseFloat(d.itemValue) : 0;
			if (itemValue > 100000) {
				riskFactors.push("high_value_item");
			}

			// Check for in-kind donations (property, assets)
			if (
				d.donationType &&
				d.donationType !== "CASH" &&
				d.donationType !== "EFECTIVO"
			) {
				riskFactors.push("in_kind_donation");
			}
		}

		return {
			subject: d?.purpose ?? d?.campaignName ?? "Donation",
			attributes: {
				donationType: d?.donationType ?? null,
				purpose: d?.purpose ?? null,
				itemType: d?.itemTypeCode ?? null,
				itemDescription: d?.itemDescription ?? null,
				itemValue: d?.itemValue ?? null,
				isAnonymous: d?.isAnonymous ?? null,
				campaignName: d?.campaignName ?? null,
			},
			riskFactors,
		};
	},

	getApplicableAlertTypes(): string[] {
		// Alert types should be loaded from pld-alert-types catalog filtered by VA code
		return [this.code];
	},

	generateDetailXml(operation: OperationEntity): string {
		const d = operation.donation;
		if (!d) {
			return "<DETALLE_OPERACIONES />";
		}

		const elements: string[] = [];

		if (d.donationType) {
			elements.push(
				`<TIPO_DONATIVO>${escapeXml(d.donationType)}</TIPO_DONATIVO>`,
			);
		}
		if (d.purpose) {
			elements.push(`<FINALIDAD>${escapeXml(d.purpose)}</FINALIDAD>`);
		}
		if (d.itemTypeCode) {
			elements.push(`<TIPO_BIEN>${escapeXml(d.itemTypeCode)}</TIPO_BIEN>`);
		}
		if (d.itemDescription) {
			elements.push(
				`<DESCRIPCION_BIEN>${escapeXml(d.itemDescription)}</DESCRIPCION_BIEN>`,
			);
		}
		if (d.itemValue) {
			elements.push(`<VALOR_BIEN>${d.itemValue}</VALOR_BIEN>`);
		}
		if (d.isAnonymous !== null && d.isAnonymous !== undefined) {
			elements.push(`<ES_ANONIMO>${d.isAnonymous ? "SI" : "NO"}</ES_ANONIMO>`);
		}
		if (d.campaignName) {
			elements.push(
				`<NOMBRE_CAMPANA>${escapeXml(d.campaignName)}</NOMBRE_CAMPANA>`,
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
