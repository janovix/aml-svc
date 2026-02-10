import type { ActivityHandler, ActivityAlertMetadata } from "./types";
import type { OperationEntity } from "../types";
import { RentalExtensionSchema } from "../schemas";
import type { CatalogFieldsConfig } from "../../catalog/name-resolver";

export const CATALOG_FIELDS: CatalogFieldsConfig = {
	propertyTypeCode: { catalog: "pld-property-types", strategy: "BY_CODE" },
	stateCode: { catalog: "states", strategy: "BY_CODE" },
};

export const rentalHandler: ActivityHandler = {
	code: "ARI",
	name: "Rental Services",
	lfpiropiFraccion: "XV",
	identificationThresholdUma: 1605,
	noticeThresholdUma: 3210,

	validateExtension(data: unknown): string | null {
		const result = RentalExtensionSchema.safeParse(data);
		if (!result.success) {
			return result.error.errors[0]?.message ?? "Invalid rental data";
		}
		return null;
	},

	extractAlertMetadata(operation: OperationEntity): ActivityAlertMetadata {
		const r = operation.rental;
		const riskFactors: string[] = [];

		if (r) {
			// Check for prepaid rentals
			if (r.isPrepaid && r.prepaidMonths && r.prepaidMonths > 6) {
				riskFactors.push("long_prepaid_period");
			}

			// Check for high monthly rent
			const monthlyRent = r.monthlyRent ? parseFloat(r.monthlyRent) : 0;
			if (monthlyRent > 100000) {
				riskFactors.push("high_monthly_rent");
			}

			// Check for high deposit (only if monthlyRent is present and > 0)
			const deposit = r.depositAmount ? parseFloat(r.depositAmount) : 0;
			if (monthlyRent > 0 && deposit > monthlyRent * 3) {
				riskFactors.push("high_deposit");
			}
		}

		const address = r
			? [
					r.street,
					r.externalNumber,
					r.neighborhood,
					r.municipality,
					r.stateCode,
				]
					.filter(Boolean)
					.join(", ")
			: "Rental Property";

		return {
			subject: address,
			attributes: {
				propertyType: r?.propertyTypeCode ?? null,
				rentalPeriodMonths: r?.rentalPeriodMonths ?? null,
				monthlyRent: r?.monthlyRent ?? null,
				depositAmount: r?.depositAmount ?? null,
				contractStartDate: r?.contractStartDate ?? null,
				contractEndDate: r?.contractEndDate ?? null,
				isPrepaid: r?.isPrepaid ?? null,
				prepaidMonths: r?.prepaidMonths ?? null,
			},
			riskFactors,
		};
	},

	getApplicableAlertTypes(): string[] {
		// Alert types should be loaded from pld-alert-types catalog filtered by VA code
		return [this.code];
	},

	generateDetailXml(operation: OperationEntity): string {
		const r = operation.rental;
		if (!r) {
			return "<DETALLE_OPERACIONES />";
		}

		const elements: string[] = [];

		if (r.propertyTypeCode) {
			elements.push(
				`<TIPO_INMUEBLE>${escapeXml(r.propertyTypeCode)}</TIPO_INMUEBLE>`,
			);
		}
		if (r.rentalPeriodMonths) {
			elements.push(`<PERIODO_MESES>${r.rentalPeriodMonths}</PERIODO_MESES>`);
		}
		if (r.monthlyRent) {
			elements.push(`<RENTA_MENSUAL>${r.monthlyRent}</RENTA_MENSUAL>`);
		}
		if (r.depositAmount) {
			elements.push(`<MONTO_DEPOSITO>${r.depositAmount}</MONTO_DEPOSITO>`);
		}
		if (r.contractStartDate) {
			elements.push(`<FECHA_INICIO>${r.contractStartDate}</FECHA_INICIO>`);
		}
		if (r.contractEndDate) {
			elements.push(`<FECHA_FIN>${r.contractEndDate}</FECHA_FIN>`);
		}
		if (r.street) {
			elements.push(`<CALLE>${escapeXml(r.street)}</CALLE>`);
		}
		if (r.externalNumber) {
			elements.push(
				`<NUMERO_EXTERIOR>${escapeXml(r.externalNumber)}</NUMERO_EXTERIOR>`,
			);
		}
		if (r.internalNumber) {
			elements.push(
				`<NUMERO_INTERIOR>${escapeXml(r.internalNumber)}</NUMERO_INTERIOR>`,
			);
		}
		if (r.neighborhood) {
			elements.push(`<COLONIA>${escapeXml(r.neighborhood)}</COLONIA>`);
		}
		if (r.postalCode) {
			elements.push(
				`<CODIGO_POSTAL>${escapeXml(r.postalCode)}</CODIGO_POSTAL>`,
			);
		}
		if (r.municipality) {
			elements.push(`<MUNICIPIO>${escapeXml(r.municipality)}</MUNICIPIO>`);
		}
		if (r.stateCode) {
			elements.push(`<ESTADO>${escapeXml(r.stateCode)}</ESTADO>`);
		}
		if (r.isPrepaid !== null && r.isPrepaid !== undefined) {
			elements.push(`<ES_PREPAGO>${r.isPrepaid ? "SI" : "NO"}</ES_PREPAGO>`);
		}
		if (r.prepaidMonths) {
			elements.push(`<MESES_PREPAGADOS>${r.prepaidMonths}</MESES_PREPAGADOS>`);
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
