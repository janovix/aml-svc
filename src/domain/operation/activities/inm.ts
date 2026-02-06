import type { ActivityHandler, ActivityAlertMetadata } from "./types";
import type { OperationEntity } from "../types";
import { RealEstateExtensionSchema } from "../schemas";

export const realEstateHandler: ActivityHandler = {
	code: "INM",
	name: "Real Estate",
	lfpiropiFraccion: "V",
	identificationThresholdUma: "ALWAYS",
	noticeThresholdUma: 8025,

	validateExtension(data: unknown): string | null {
		const result = RealEstateExtensionSchema.safeParse(data);
		if (!result.success) {
			return result.error.errors[0]?.message ?? "Invalid real estate data";
		}
		return null;
	},

	extractAlertMetadata(operation: OperationEntity): ActivityAlertMetadata {
		const re = operation.realEstate;
		const riskFactors: string[] = [];

		if (re) {
			// Check for foreign country property
			if (re.countryCode && re.countryCode !== "MEX") {
				riskFactors.push("foreign_property");
			}

			// Check for large land area
			const landArea = re.landAreaM2 ? parseFloat(re.landAreaM2) : 0;
			if (landArea > 10000) {
				riskFactors.push("large_land_area");
			}
		}

		const address = re
			? [
					re.street,
					re.externalNumber,
					re.neighborhood,
					re.municipality,
					re.stateCode,
				]
					.filter(Boolean)
					.join(", ")
			: "Property";

		return {
			subject: address,
			attributes: {
				propertyType: re?.propertyTypeCode ?? null,
				street: re?.street ?? null,
				municipality: re?.municipality ?? null,
				state: re?.stateCode ?? null,
				country: re?.countryCode ?? null,
				registryFolio: re?.registryFolio ?? null,
				landAreaM2: re?.landAreaM2 ?? null,
				constructionAreaM2: re?.constructionAreaM2 ?? null,
				clientFigure: re?.clientFigureCode ?? null,
			},
			riskFactors,
		};
	},

	getApplicableAlertTypes(): string[] {
		// Alert types should be loaded from pld-alert-types catalog filtered by VA code
		return [this.code];
	},

	generateDetailXml(operation: OperationEntity): string {
		const re = operation.realEstate;
		if (!re) {
			return "<DETALLE_OPERACIONES />";
		}

		const elements: string[] = [];

		if (re.propertyTypeCode) {
			elements.push(
				`<TIPO_INMUEBLE>${escapeXml(re.propertyTypeCode)}</TIPO_INMUEBLE>`,
			);
		}
		if (re.street) {
			elements.push(`<CALLE>${escapeXml(re.street)}</CALLE>`);
		}
		if (re.externalNumber) {
			elements.push(
				`<NUMERO_EXTERIOR>${escapeXml(re.externalNumber)}</NUMERO_EXTERIOR>`,
			);
		}
		if (re.internalNumber) {
			elements.push(
				`<NUMERO_INTERIOR>${escapeXml(re.internalNumber)}</NUMERO_INTERIOR>`,
			);
		}
		if (re.neighborhood) {
			elements.push(`<COLONIA>${escapeXml(re.neighborhood)}</COLONIA>`);
		}
		if (re.postalCode) {
			elements.push(
				`<CODIGO_POSTAL>${escapeXml(re.postalCode)}</CODIGO_POSTAL>`,
			);
		}
		if (re.municipality) {
			elements.push(`<MUNICIPIO>${escapeXml(re.municipality)}</MUNICIPIO>`);
		}
		if (re.stateCode) {
			elements.push(`<ESTADO>${escapeXml(re.stateCode)}</ESTADO>`);
		}
		if (re.countryCode) {
			elements.push(`<PAIS>${escapeXml(re.countryCode)}</PAIS>`);
		}
		if (re.registryFolio) {
			elements.push(
				`<FOLIO_REGISTRO>${escapeXml(re.registryFolio)}</FOLIO_REGISTRO>`,
			);
		}
		if (re.landAreaM2) {
			elements.push(
				`<SUPERFICIE_TERRENO>${re.landAreaM2}</SUPERFICIE_TERRENO>`,
			);
		}
		if (re.constructionAreaM2) {
			elements.push(
				`<SUPERFICIE_CONSTRUCCION>${re.constructionAreaM2}</SUPERFICIE_CONSTRUCCION>`,
			);
		}
		if (re.clientFigureCode) {
			elements.push(
				`<FIGURA_CLIENTE>${escapeXml(re.clientFigureCode)}</FIGURA_CLIENTE>`,
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
