/**
 * SAT XML Generator Module
 * Multi-activity XML generation for SAT PLD notices using the Strategy pattern
 *
 * Each of the 19 vulnerable activities (VAs) has its own XSD schema from SAT.
 * This module provides a unified interface for generating XML notices for any activity.
 *
 * Usage:
 * ```typescript
 * import { generateSatNoticeXml, generateSatMonthlyReportXml } from './sat-xml-generator';
 *
 * // Generate single notice
 * const xml = generateSatNoticeXml(operation, client, config);
 *
 * // Generate monthly report with multiple notices
 * const reportXml = generateSatMonthlyReportXml(report, operations);
 * ```
 */

import * as Sentry from "@sentry/cloudflare";
import type {
	ActivityCode,
	OperationEntity,
} from "../../domain/operation/types";
import type { ClientEntity } from "../../domain/client/types";
import type { AlertEntity } from "../../domain/alert/types";
import type {
	SatXmlConfig,
	SatNoticeData,
	SatMonthlyReport,
	XmlGenerationContext,
} from "./types";
import { getXmlStrategy } from "./registry";

// Re-export types
export * from "./types";
export * from "./utils";
export {
	getXmlStrategy,
	hasXmlStrategy,
	getAllRegisteredActivities,
} from "./registry";
export { BaseActivityStrategy } from "./base-strategy";

/**
 * Generates SAT notice XML for a single operation
 *
 * @param operation - The operation entity
 * @param client - The client entity
 * @param config - XML generation configuration
 * @param alert - Optional alert entity (for notice reference)
 * @returns Complete SAT XML string
 */
export function generateSatNoticeXml(
	operation: OperationEntity,
	client: ClientEntity,
	config: SatXmlConfig,
	alert?: AlertEntity,
): string {
	const strategy = getXmlStrategy(operation.activityCode);

	const context: XmlGenerationContext = {
		operation,
		client,
		alert,
		config,
	};

	const noticeData = strategy.mapToNoticeData(context);
	return strategy.generateNoticeXml(noticeData, operation);
}

/**
 * Generates SAT monthly report XML for multiple operations
 *
 * @param activityCode - The activity code for the report
 * @param reportedMonth - The reported month in YYYYMM format
 * @param obligatedSubjectKey - Organization RFC
 * @param operations - Array of operations to include
 * @param clients - Map of client IDs to client entities
 * @param config - Base XML generation configuration
 * @returns Complete SAT monthly report XML string
 */
export function generateSatMonthlyReportXml(
	activityCode: ActivityCode,
	reportedMonth: string,
	obligatedSubjectKey: string,
	operations: OperationEntity[],
	clients: Map<string, ClientEntity>,
	config: Partial<SatXmlConfig> = {},
): string {
	const strategy = getXmlStrategy(activityCode);

	const notices: SatNoticeData[] = [];

	for (const operation of operations) {
		const client = clients.get(operation.clientId);
		if (!client) {
			Sentry.captureMessage("Client not found for operation", {
				level: "warning",
				tags: { context: "sat-xml-client-not-found" },
				extra: { operationId: operation.id },
			});
			continue;
		}

		const context: XmlGenerationContext = {
			operation,
			client,
			config: {
				obligatedSubjectKey,
				...config,
			},
		};

		notices.push(strategy.mapToNoticeData(context));
	}

	const report: SatMonthlyReport = {
		activityCode,
		reportedMonth,
		obligatedSubjectKey,
		notices,
	};

	return strategy.generateMonthlyReportXml(report, operations);
}

/**
 * Maps operation data to SAT notice data structure
 *
 * @param operation - The operation entity
 * @param client - The client entity
 * @param config - XML generation configuration
 * @param alert - Optional alert entity
 * @returns SAT notice data structure
 */
export function mapToSatNoticeData(
	operation: OperationEntity,
	client: ClientEntity,
	config: SatXmlConfig,
	alert?: AlertEntity,
): SatNoticeData {
	const strategy = getXmlStrategy(operation.activityCode);

	const context: XmlGenerationContext = {
		operation,
		client,
		alert,
		config,
	};

	return strategy.mapToNoticeData(context);
}

/**
 * Generates empty SAT notice XML for a period with no operations
 * This is required by SAT when there are no reportable operations in a month
 *
 * @param activityCode - The activity code
 * @param reportedMonth - The reported month in YYYYMM format
 * @param obligatedSubjectKey - Organization RFC
 * @returns Complete SAT XML string for empty report
 */
export function generateEmptySatNoticeXml(
	activityCode: ActivityCode,
	reportedMonth: string,
	obligatedSubjectKey: string,
): string {
	const strategy = getXmlStrategy(activityCode);

	const xml: string[] = [];

	xml.push('<?xml version="1.0" encoding="UTF-8"?>');
	xml.push(
		`<archivo xsi:schemaLocation="${strategy.schemaLocation}" xmlns="${strategy.schemaNamespace}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`,
	);
	xml.push("<informe>");
	xml.push(`<mes_reportado>${reportedMonth}</mes_reportado>`);
	xml.push("<sujeto_obligado>");
	xml.push(
		`<clave_sujeto_obligado>${obligatedSubjectKey}</clave_sujeto_obligado>`,
	);
	xml.push(`<clave_actividad>${activityCode}</clave_actividad>`);
	xml.push("</sujeto_obligado>");
	// No avisos for empty report
	xml.push("</informe>");
	xml.push("</archivo>");

	return xml.join("\n");
}

/**
 * Gets the schema namespace URL for an activity
 */
export function getSchemaNamespace(activityCode: ActivityCode): string {
	const strategy = getXmlStrategy(activityCode);
	return strategy.schemaNamespace;
}

/**
 * Gets the schema location for an activity
 */
export function getSchemaLocation(activityCode: ActivityCode): string {
	const strategy = getXmlStrategy(activityCode);
	return strategy.schemaLocation;
}
