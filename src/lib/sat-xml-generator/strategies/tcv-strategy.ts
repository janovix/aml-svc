/**
 * Valuable Custody and Transport (TCV) Activity XML Strategy
 * Schema: https://www.pld.hacienda.gob.mx/work/models/PLD/documentos/xsd/tcv.xsd
 */

import type { OperationEntity } from "../../../domain/operation/types";
import { BaseActivityStrategy } from "../base-strategy";
import { escapeXml } from "../utils";

export class ValuableXmlStrategy extends BaseActivityStrategy {
	activityCode = "TCV" as const;

	generateDetailXml(operation: OperationEntity): string {
		const v = operation.valuable;
		if (!v) {
			return "";
		}

		const xml: string[] = [];

		xml.push("<datos_custodia_valores>");

		if (v.valueTypeCode) {
			xml.push(`<tipo_valor>${escapeXml(v.valueTypeCode)}</tipo_valor>`);
		}
		if (v.serviceTypeCode) {
			xml.push(
				`<tipo_servicio>${escapeXml(v.serviceTypeCode)}</tipo_servicio>`,
			);
		}
		if (v.transportMethod) {
			xml.push(
				`<metodo_transporte>${escapeXml(v.transportMethod)}</metodo_transporte>`,
			);
		}
		if (v.originAddress) {
			xml.push(
				`<direccion_origen>${escapeXml(v.originAddress)}</direccion_origen>`,
			);
		}
		if (v.destinationAddress) {
			xml.push(
				`<direccion_destino>${escapeXml(v.destinationAddress)}</direccion_destino>`,
			);
		}
		if (v.custodyStartDate) {
			xml.push(
				`<fecha_inicio_custodia>${v.custodyStartDate}</fecha_inicio_custodia>`,
			);
		}
		if (v.custodyEndDate) {
			xml.push(`<fecha_fin_custodia>${v.custodyEndDate}</fecha_fin_custodia>`);
		}
		if (v.storageLocation) {
			xml.push(
				`<ubicacion_almacenamiento>${escapeXml(v.storageLocation)}</ubicacion_almacenamiento>`,
			);
		}
		if (v.declaredValue) {
			xml.push(`<valor_declarado>${v.declaredValue}</valor_declarado>`);
		}
		if (v.insuredValue) {
			xml.push(`<valor_asegurado>${v.insuredValue}</valor_asegurado>`);
		}
		if (v.description) {
			xml.push(`<descripcion>${escapeXml(v.description)}</descripcion>`);
		}

		xml.push("</datos_custodia_valores>");

		return xml.join("\n");
	}
}
