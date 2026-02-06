/**
 * Rental Services (ARI) Activity XML Strategy
 * Schema: https://www.pld.hacienda.gob.mx/work/models/PLD/documentos/xsd/ari.xsd
 */

import type { OperationEntity } from "../../../domain/operation/types";
import { BaseActivityStrategy } from "../base-strategy";
import { escapeXml } from "../utils";

export class RentalXmlStrategy extends BaseActivityStrategy {
	activityCode = "ARI" as const;

	generateDetailXml(operation: OperationEntity): string {
		const r = operation.rental;
		if (!r) {
			return "";
		}

		const xml: string[] = [];

		xml.push("<datos_arrendamiento>");

		if (r.propertyTypeCode) {
			xml.push(
				`<tipo_inmueble>${escapeXml(r.propertyTypeCode)}</tipo_inmueble>`,
			);
		}
		if (r.rentalPeriodMonths) {
			xml.push(`<periodo_meses>${r.rentalPeriodMonths}</periodo_meses>`);
		}
		if (r.monthlyRent) {
			xml.push(`<renta_mensual>${r.monthlyRent}</renta_mensual>`);
		}
		if (r.depositAmount) {
			xml.push(`<monto_deposito>${r.depositAmount}</monto_deposito>`);
		}
		if (r.contractStartDate) {
			xml.push(`<fecha_inicio>${r.contractStartDate}</fecha_inicio>`);
		}
		if (r.contractEndDate) {
			xml.push(`<fecha_fin>${r.contractEndDate}</fecha_fin>`);
		}

		// Address
		xml.push("<domicilio_inmueble>");
		if (r.street) {
			xml.push(`<calle>${escapeXml(r.street)}</calle>`);
		}
		if (r.externalNumber) {
			xml.push(
				`<numero_exterior>${escapeXml(r.externalNumber)}</numero_exterior>`,
			);
		}
		if (r.internalNumber) {
			xml.push(
				`<numero_interior>${escapeXml(r.internalNumber)}</numero_interior>`,
			);
		}
		if (r.neighborhood) {
			xml.push(`<colonia>${escapeXml(r.neighborhood)}</colonia>`);
		}
		if (r.postalCode) {
			xml.push(`<codigo_postal>${escapeXml(r.postalCode)}</codigo_postal>`);
		}
		if (r.municipality) {
			xml.push(`<municipio>${escapeXml(r.municipality)}</municipio>`);
		}
		if (r.stateCode) {
			xml.push(
				`<entidad_federativa>${escapeXml(r.stateCode)}</entidad_federativa>`,
			);
		}
		xml.push("</domicilio_inmueble>");

		if (r.isPrepaid !== null && r.isPrepaid !== undefined) {
			xml.push(`<es_prepago>${r.isPrepaid ? "SI" : "NO"}</es_prepago>`);
		}
		if (r.prepaidMonths) {
			xml.push(`<meses_prepagados>${r.prepaidMonths}</meses_prepagados>`);
		}

		xml.push("</datos_arrendamiento>");

		return xml.join("\n");
	}
}
