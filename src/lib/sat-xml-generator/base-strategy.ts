/**
 * Base strategy for SAT XML generation
 * Provides common implementation for all activities
 */

import type {
	ActivityCode,
	OperationEntity,
} from "../../domain/operation/types";
import type {
	ActivityXmlStrategy,
	SatNoticeData,
	SatMonthlyReport,
	XmlGenerationContext,
} from "./types";
import {
	escapeXml,
	formatDateYYYYMMDD,
	formatReportedMonth,
	mapClientToPersonData,
	generatePersonaXml,
	generateLiquidationXml,
} from "./utils";

/**
 * Activity codes mapped to their schema prefixes
 */
const ACTIVITY_SCHEMA_PREFIXES: Record<ActivityCode, string> = {
	VEH: "veh",
	INM: "inm",
	MJR: "mjr",
	AVI: "avi",
	JYS: "jys",
	ARI: "ari",
	BLI: "bli",
	DON: "don",
	MPC: "mpc",
	FEP: "fep",
	FES: "fes",
	SPR: "spr",
	CHV: "chv",
	TSC: "tsc",
	TPP: "tpp",
	TDR: "tdr",
	TCV: "tcv",
	OBA: "oba",
	DIN: "din",
};

export abstract class BaseActivityStrategy implements ActivityXmlStrategy {
	abstract activityCode: ActivityCode;

	get schemaPrefix(): string {
		return ACTIVITY_SCHEMA_PREFIXES[this.activityCode];
	}

	get schemaNamespace(): string {
		return `http://www.uif.shcp.gob.mx/recepcion/${this.schemaPrefix}`;
	}

	get schemaLocation(): string {
		return `${this.schemaNamespace} ${this.schemaPrefix}.xsd`;
	}

	/**
	 * Maps operation context to SAT notice data
	 * Override in subclasses for activity-specific mapping
	 */
	mapToNoticeData(context: XmlGenerationContext): SatNoticeData {
		const { operation, client, alert, config } = context;

		const operationDate = formatDateYYYYMMDD(operation.operationDate);
		const reportedMonth = formatReportedMonth(operation.operationDate);

		// Get payment info from first payment
		const firstPayment = operation.payments?.[0];
		const paymentDate = firstPayment
			? formatDateYYYYMMDD(firstPayment.paymentDate)
			: operationDate;

		return {
			activityCode: this.activityCode,
			reportedMonth,
			obligatedSubjectKey: config.obligatedSubjectKey,
			noticeReference: config.noticeReference ?? alert?.id ?? operation.id,
			priority: config.priority ?? operation.priorityCode ?? "1",
			alertType: operation.alertTypeCode ?? "100",
			noticePerson: mapClientToPersonData(client, config.economicActivity),
			operationDate,
			operationPostalCode:
				operation.branchPostalCode ?? client.postalCode ?? "",
			operationType: config.operationType ?? operation.operationTypeCode ?? "1",
			liquidation: {
				paymentDate,
				paymentForm: firstPayment?.paymentFormCode ?? config.paymentForm ?? "1",
				monetaryInstrument:
					firstPayment?.monetaryInstrumentCode ??
					config.monetaryInstrument ??
					"1",
				currency: config.currency ?? operation.currencyCode ?? "3",
				operationAmount: operation.amount,
			},
		};
	}

	/**
	 * Activity-specific detail XML generation
	 * Must be implemented by each activity strategy
	 */
	abstract generateDetailXml(operation: OperationEntity): string;

	/**
	 * Generates complete XML for a single notice
	 */
	generateNoticeXml(data: SatNoticeData, operation: OperationEntity): string {
		const xml: string[] = [];

		xml.push('<?xml version="1.0" encoding="UTF-8"?>');
		xml.push(
			`<archivo xsi:schemaLocation="${this.schemaLocation}" xmlns="${this.schemaNamespace}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`,
		);
		xml.push("<informe>");
		xml.push(`<mes_reportado>${escapeXml(data.reportedMonth)}</mes_reportado>`);
		xml.push("<sujeto_obligado>");
		xml.push(
			`<clave_sujeto_obligado>${escapeXml(data.obligatedSubjectKey)}</clave_sujeto_obligado>`,
		);
		xml.push(
			`<clave_actividad>${escapeXml(data.activityCode)}</clave_actividad>`,
		);
		xml.push("</sujeto_obligado>");

		// Add the aviso section
		xml.push(this.generateAvisoXml(data, operation));

		xml.push("</informe>");
		xml.push("</archivo>");

		return xml.join("\n");
	}

	/**
	 * Generates the <aviso> XML section for a single notice
	 */
	protected generateAvisoXml(
		data: SatNoticeData,
		operation: OperationEntity,
	): string {
		const xml: string[] = [];

		xml.push("<aviso>");
		xml.push(
			`<referencia_aviso>${escapeXml(data.noticeReference)}</referencia_aviso>`,
		);
		xml.push(`<prioridad>${escapeXml(data.priority)}</prioridad>`);
		xml.push("<alerta>");
		xml.push(`<tipo_alerta>${escapeXml(data.alertType)}</tipo_alerta>`);
		xml.push("</alerta>");

		// Person in notice
		xml.push(generatePersonaXml(data.noticePerson, "persona_aviso"));

		// Owner/beneficiary if present
		if (data.ownerBeneficiary) {
			xml.push(generatePersonaXml(data.ownerBeneficiary, "dueno_beneficiario"));
		}

		// Operation details
		xml.push("<detalle_operaciones>");
		xml.push("<datos_operacion>");
		xml.push(
			`<fecha_operacion>${escapeXml(data.operationDate)}</fecha_operacion>`,
		);
		xml.push(
			`<codigo_postal>${escapeXml(data.operationPostalCode)}</codigo_postal>`,
		);
		xml.push(
			`<tipo_operacion>${escapeXml(data.operationType)}</tipo_operacion>`,
		);

		// Activity-specific details
		xml.push(this.generateDetailXml(operation));

		// Payment/liquidation data
		xml.push(
			generateLiquidationXml(
				data.liquidation.paymentDate,
				data.liquidation.paymentForm,
				data.liquidation.monetaryInstrument,
				data.liquidation.currency,
				data.liquidation.operationAmount,
			),
		);

		xml.push("</datos_operacion>");
		xml.push("</detalle_operaciones>");
		xml.push("</aviso>");

		return xml.join("\n");
	}

	/**
	 * Generates complete XML for a monthly report with multiple notices
	 */
	generateMonthlyReportXml(
		report: SatMonthlyReport,
		operations: OperationEntity[],
	): string {
		const xml: string[] = [];

		xml.push('<?xml version="1.0" encoding="UTF-8"?>');
		xml.push(
			`<archivo xsi:schemaLocation="${this.schemaLocation}" xmlns="${this.schemaNamespace}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`,
		);
		xml.push("<informe>");
		xml.push(
			`<mes_reportado>${escapeXml(report.reportedMonth)}</mes_reportado>`,
		);
		xml.push("<sujeto_obligado>");
		xml.push(
			`<clave_sujeto_obligado>${escapeXml(report.obligatedSubjectKey)}</clave_sujeto_obligado>`,
		);
		xml.push(
			`<clave_actividad>${escapeXml(report.activityCode)}</clave_actividad>`,
		);
		xml.push("</sujeto_obligado>");

		// Add each aviso
		for (let i = 0; i < report.notices.length; i++) {
			const notice = report.notices[i];
			const operation = operations[i];
			if (notice && operation) {
				xml.push(this.generateAvisoXml(notice, operation));
			}
		}

		xml.push("</informe>");
		xml.push("</archivo>");

		return xml.join("\n");
	}
}
