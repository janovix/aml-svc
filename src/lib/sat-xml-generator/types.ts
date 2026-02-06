/**
 * SAT XML Generator Types
 * Common types and interfaces for multi-activity SAT notice generation
 */

import type {
	ActivityCode,
	OperationEntity,
} from "../../domain/operation/types";
import type { ClientEntity } from "../../domain/client/types";
import type { AlertEntity } from "../../domain/alert/types";

/**
 * Person types recognized by SAT
 */
export type SatPersonType = "fisica" | "moral" | "fideicomiso";

/**
 * Address types recognized by SAT
 */
export type SatAddressType = "nacional" | "extranjero";

/**
 * Configuration for generating SAT XML notices
 */
export interface SatXmlConfig {
	/** Organization RFC (Clave Sujeto Obligado) */
	obligatedSubjectKey: string;
	/** Notice reference - defaults to alert ID */
	noticeReference?: string;
	/** Priority code - defaults to "1" */
	priority?: string;
	/** Economic activity code for the person */
	economicActivity?: string;
	/** Payment form code */
	paymentForm?: string;
	/** Monetary instrument code */
	monetaryInstrument?: string;
	/** Currency code (e.g., "3" for MXN) */
	currency?: string;
	/** Operation type code */
	operationType?: string;
}

/**
 * Person data for SAT notice
 */
export interface SatPersonData {
	personType: SatPersonType;
	// For persona_fisica
	name?: string;
	paternalLastName?: string;
	maternalLastName?: string;
	birthDate?: string; // YYYYMMDD format
	nationalityCountry?: string; // Country code
	economicActivity?: string;
	// For persona_moral
	businessName?: string;
	rfc?: string;
	// For fideicomiso
	trustIdentifier?: string;
	attorneyDelegate?: {
		name?: string;
		paternalLastName?: string;
		maternalLastName?: string;
		birthDate?: string;
	};
	// Address
	addressType: SatAddressType;
	neighborhood?: string;
	street?: string;
	externalNumber?: string;
	internalNumber?: string;
	postalCode?: string;
	country?: string;
}

/**
 * Payment/liquidation data for SAT notice
 */
export interface SatLiquidationData {
	paymentDate: string; // YYYYMMDD format
	paymentForm: string;
	monetaryInstrument: string;
	currency: string;
	operationAmount: string;
}

/**
 * Base notice data structure
 */
export interface SatNoticeData {
	/** Activity code (e.g., "VEH", "INM") */
	activityCode: ActivityCode;
	/** Reported month in YYYYMM format */
	reportedMonth: string;
	/** Organization RFC */
	obligatedSubjectKey: string;
	/** Unique notice reference */
	noticeReference: string;
	/** Priority code */
	priority: string;
	/** Alert type code */
	alertType: string;
	/** Person in the notice */
	noticePerson: SatPersonData;
	/** Owner/beneficiary (optional) */
	ownerBeneficiary?: SatPersonData;
	/** Operation date in YYYYMMDD format */
	operationDate: string;
	/** Operation postal code */
	operationPostalCode: string;
	/** Operation type code */
	operationType: string;
	/** Liquidation/payment data */
	liquidation: SatLiquidationData;
}

/**
 * Monthly report containing multiple notices
 */
export interface SatMonthlyReport {
	activityCode: ActivityCode;
	reportedMonth: string;
	obligatedSubjectKey: string;
	notices: SatNoticeData[];
}

/**
 * Context for XML generation
 */
export interface XmlGenerationContext {
	operation: OperationEntity;
	client: ClientEntity;
	alert?: AlertEntity;
	config: SatXmlConfig;
}

/**
 * Strategy interface for activity-specific XML generation
 */
export interface ActivityXmlStrategy {
	/** Activity code this strategy handles */
	activityCode: ActivityCode;

	/** XML schema namespace URL */
	schemaNamespace: string;

	/** Schema location (XSD file) */
	schemaLocation: string;

	/**
	 * Maps operation data to SAT notice data structure
	 */
	mapToNoticeData(context: XmlGenerationContext): SatNoticeData;

	/**
	 * Generates the activity-specific <detalle_operaciones> XML section
	 */
	generateDetailXml(operation: OperationEntity): string;

	/**
	 * Generates complete XML for a single notice
	 */
	generateNoticeXml(data: SatNoticeData, operation: OperationEntity): string;

	/**
	 * Generates complete XML for a monthly report with multiple notices
	 */
	generateMonthlyReportXml(
		report: SatMonthlyReport,
		operations: OperationEntity[],
	): string;
}
