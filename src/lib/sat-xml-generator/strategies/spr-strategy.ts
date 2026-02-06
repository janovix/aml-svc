/**
 * Professional Services (SPR) Activity XML Strategy
 * Schema: https://www.pld.hacienda.gob.mx/work/models/PLD/documentos/xsd/spr.xsd
 */

import type { OperationEntity } from "../../../domain/operation/types";
import { BaseActivityStrategy } from "../base-strategy";
import { escapeXml } from "../utils";

export class ProfessionalXmlStrategy extends BaseActivityStrategy {
	activityCode = "SPR" as const;

	generateDetailXml(operation: OperationEntity): string {
		const p = operation.professional;
		if (!p) {
			return "";
		}

		const xml: string[] = [];

		xml.push("<datos_servicio_profesional>");

		if (p.serviceTypeCode) {
			xml.push(
				`<tipo_servicio>${escapeXml(p.serviceTypeCode)}</tipo_servicio>`,
			);
		}
		if (p.serviceAreaCode) {
			xml.push(
				`<area_servicio>${escapeXml(p.serviceAreaCode)}</area_servicio>`,
			);
		}
		if (p.clientFigureCode) {
			xml.push(
				`<figura_cliente>${escapeXml(p.clientFigureCode)}</figura_cliente>`,
			);
		}
		if (p.contributionReasonCode) {
			xml.push(
				`<motivo_aportacion>${escapeXml(p.contributionReasonCode)}</motivo_aportacion>`,
			);
		}
		if (p.assignmentTypeCode) {
			xml.push(`<tipo_cesion>${escapeXml(p.assignmentTypeCode)}</tipo_cesion>`);
		}
		if (p.mergerTypeCode) {
			xml.push(`<tipo_fusion>${escapeXml(p.mergerTypeCode)}</tipo_fusion>`);
		}
		if (p.incorporationReasonCode) {
			xml.push(
				`<motivo_constitucion>${escapeXml(p.incorporationReasonCode)}</motivo_constitucion>`,
			);
		}
		if (p.shareholderPositionCode) {
			xml.push(
				`<cargo_accionista>${escapeXml(p.shareholderPositionCode)}</cargo_accionista>`,
			);
		}
		if (p.sharePercentage) {
			xml.push(
				`<porcentaje_acciones>${p.sharePercentage}</porcentaje_acciones>`,
			);
		}
		if (p.managedAssetTypeCode) {
			xml.push(
				`<tipo_activo_administrado>${escapeXml(p.managedAssetTypeCode)}</tipo_activo_administrado>`,
			);
		}
		if (p.managementStatusCode) {
			xml.push(
				`<estado_administracion>${escapeXml(p.managementStatusCode)}</estado_administracion>`,
			);
		}
		if (p.financialInstitutionTypeCode) {
			xml.push(
				`<tipo_institucion_financiera>${escapeXml(p.financialInstitutionTypeCode)}</tipo_institucion_financiera>`,
			);
		}
		if (p.financialInstitutionName) {
			xml.push(
				`<nombre_institucion_financiera>${escapeXml(p.financialInstitutionName)}</nombre_institucion_financiera>`,
			);
		}
		if (p.occupationCode) {
			xml.push(`<ocupacion>${escapeXml(p.occupationCode)}</ocupacion>`);
		}
		if (p.serviceDescription) {
			xml.push(
				`<descripcion_servicio>${escapeXml(p.serviceDescription)}</descripcion_servicio>`,
			);
		}

		xml.push("</datos_servicio_profesional>");

		return xml.join("\n");
	}
}
