/**
 * Real Estate Development (DIN) Activity XML Strategy
 * Schema: https://www.pld.hacienda.gob.mx/work/models/PLD/documentos/xsd/din.xsd
 */

import type { OperationEntity } from "../../../domain/operation/types";
import { BaseActivityStrategy } from "../base-strategy";
import { escapeXml } from "../utils";

export class DevelopmentXmlStrategy extends BaseActivityStrategy {
	activityCode = "DIN" as const;

	generateDetailXml(operation: OperationEntity): string {
		const d = operation.development;
		if (!d) {
			return "";
		}

		const xml: string[] = [];

		xml.push("<datos_desarrollo_inmobiliario>");

		if (d.developmentTypeCode) {
			xml.push(
				`<tipo_desarrollo>${escapeXml(d.developmentTypeCode)}</tipo_desarrollo>`,
			);
		}
		if (d.creditTypeCode) {
			xml.push(`<tipo_credito>${escapeXml(d.creditTypeCode)}</tipo_credito>`);
		}
		if (d.projectName) {
			xml.push(
				`<nombre_proyecto>${escapeXml(d.projectName)}</nombre_proyecto>`,
			);
		}
		if (d.projectLocation) {
			xml.push(
				`<ubicacion_proyecto>${escapeXml(d.projectLocation)}</ubicacion_proyecto>`,
			);
		}
		if (d.contributionType) {
			xml.push(
				`<tipo_aportacion>${escapeXml(d.contributionType)}</tipo_aportacion>`,
			);
		}
		if (d.contributionAmount) {
			xml.push(`<monto_aportacion>${d.contributionAmount}</monto_aportacion>`);
		}
		if (d.thirdPartyTypeCode) {
			xml.push(
				`<tipo_tercero>${escapeXml(d.thirdPartyTypeCode)}</tipo_tercero>`,
			);
		}
		if (d.thirdPartyName) {
			xml.push(
				`<nombre_tercero>${escapeXml(d.thirdPartyName)}</nombre_tercero>`,
			);
		}
		if (d.financialInstitutionTypeCode) {
			xml.push(
				`<tipo_institucion_financiera>${escapeXml(d.financialInstitutionTypeCode)}</tipo_institucion_financiera>`,
			);
		}
		if (d.financialInstitutionName) {
			xml.push(
				`<nombre_institucion_financiera>${escapeXml(d.financialInstitutionName)}</nombre_institucion_financiera>`,
			);
		}

		xml.push("</datos_desarrollo_inmobiliario>");

		return xml.join("\n");
	}
}
