/**
 * Real Estate (INM) Activity XML Strategy
 * Schema: https://www.pld.hacienda.gob.mx/work/models/PLD/documentos/xsd/inm.xsd
 */

import type { OperationEntity } from "../../../domain/operation/types";
import { BaseActivityStrategy } from "../base-strategy";
import { escapeXml } from "../utils";

export class RealEstateXmlStrategy extends BaseActivityStrategy {
	activityCode = "INM" as const;

	generateDetailXml(operation: OperationEntity): string {
		const re = operation.realEstate;
		if (!re) {
			return "";
		}

		const xml: string[] = [];

		xml.push("<datos_inmueble>");

		if (re.propertyTypeCode) {
			xml.push(
				`<tipo_inmueble>${escapeXml(re.propertyTypeCode)}</tipo_inmueble>`,
			);
		}

		// Address
		xml.push("<domicilio_inmueble>");
		if (re.street) {
			xml.push(`<calle>${escapeXml(re.street)}</calle>`);
		}
		if (re.externalNumber) {
			xml.push(
				`<numero_exterior>${escapeXml(re.externalNumber)}</numero_exterior>`,
			);
		}
		if (re.internalNumber) {
			xml.push(
				`<numero_interior>${escapeXml(re.internalNumber)}</numero_interior>`,
			);
		}
		if (re.neighborhood) {
			xml.push(`<colonia>${escapeXml(re.neighborhood)}</colonia>`);
		}
		if (re.postalCode) {
			xml.push(`<codigo_postal>${escapeXml(re.postalCode)}</codigo_postal>`);
		}
		if (re.municipality) {
			xml.push(`<municipio>${escapeXml(re.municipality)}</municipio>`);
		}
		if (re.stateCode) {
			xml.push(
				`<entidad_federativa>${escapeXml(re.stateCode)}</entidad_federativa>`,
			);
		}
		if (re.countryCode) {
			xml.push(`<pais>${escapeXml(re.countryCode)}</pais>`);
		}
		xml.push("</domicilio_inmueble>");

		if (re.registryFolio) {
			xml.push(`<folio_real>${escapeXml(re.registryFolio)}</folio_real>`);
		}
		if (re.registryDate) {
			xml.push(
				`<fecha_registro>${escapeXml(re.registryDate)}</fecha_registro>`,
			);
		}
		if (re.landAreaM2) {
			xml.push(`<superficie_terreno>${re.landAreaM2}</superficie_terreno>`);
		}
		if (re.constructionAreaM2) {
			xml.push(
				`<superficie_construccion>${re.constructionAreaM2}</superficie_construccion>`,
			);
		}
		if (re.clientFigureCode) {
			xml.push(
				`<figura_cliente>${escapeXml(re.clientFigureCode)}</figura_cliente>`,
			);
		}
		if (re.personFigureCode) {
			xml.push(
				`<figura_persona>${escapeXml(re.personFigureCode)}</figura_persona>`,
			);
		}

		xml.push("</datos_inmueble>");

		return xml.join("\n");
	}
}
