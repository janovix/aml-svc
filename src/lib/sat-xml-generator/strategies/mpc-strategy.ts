/**
 * Loans Between Individuals (MPC) Activity XML Strategy
 * Schema: https://www.pld.hacienda.gob.mx/work/models/PLD/documentos/xsd/mpc.xsd
 */

import type { OperationEntity } from "../../../domain/operation/types";
import { BaseActivityStrategy } from "../base-strategy";
import { escapeXml } from "../utils";

export class LoanXmlStrategy extends BaseActivityStrategy {
	activityCode = "MPC" as const;

	generateDetailXml(operation: OperationEntity): string {
		const l = operation.loan;
		if (!l) {
			return "";
		}

		const xml: string[] = [];

		xml.push("<datos_credito>");

		if (l.loanTypeCode) {
			xml.push(`<tipo_credito>${escapeXml(l.loanTypeCode)}</tipo_credito>`);
		}
		if (l.guaranteeTypeCode) {
			xml.push(
				`<tipo_garantia>${escapeXml(l.guaranteeTypeCode)}</tipo_garantia>`,
			);
		}
		if (l.principalAmount) {
			xml.push(`<monto_principal>${l.principalAmount}</monto_principal>`);
		}
		if (l.interestRate) {
			xml.push(`<tasa_interes>${l.interestRate}</tasa_interes>`);
		}
		if (l.termMonths) {
			xml.push(`<plazo_meses>${l.termMonths}</plazo_meses>`);
		}
		if (l.monthlyPayment) {
			xml.push(`<pago_mensual>${l.monthlyPayment}</pago_mensual>`);
		}
		if (l.disbursementDate) {
			xml.push(`<fecha_desembolso>${l.disbursementDate}</fecha_desembolso>`);
		}
		if (l.maturityDate) {
			xml.push(`<fecha_vencimiento>${l.maturityDate}</fecha_vencimiento>`);
		}
		if (l.guaranteeDescription) {
			xml.push(
				`<descripcion_garantia>${escapeXml(l.guaranteeDescription)}</descripcion_garantia>`,
			);
		}
		if (l.guaranteeValue) {
			xml.push(`<valor_garantia>${l.guaranteeValue}</valor_garantia>`);
		}

		xml.push("</datos_credito>");

		return xml.join("\n");
	}
}
