import type { ActivityCode, OperationEntity } from "../types";

/**
 * Activity-specific handler interface
 * Each VA implements this to provide specialized logic
 */
export interface ActivityHandler {
	/** Three-letter activity code */
	code: ActivityCode;

	/** Human-readable name */
	name: string;

	/** LFPIORPI fracción reference */
	lfpiropiFraccion: string;

	/**
	 * UMA threshold at which operations must be identified (client data captured).
	 * "ALWAYS" means all operations must be identified regardless of amount.
	 * Source: LFPIORPI Art. 17
	 */
	identificationThresholdUma: number | "ALWAYS";

	/**
	 * UMA threshold at which a SAT notice must be filed.
	 * "ALWAYS" means all operations must be reported regardless of amount.
	 * Source: LFPIORPI Art. 17
	 */
	noticeThresholdUma: number | "ALWAYS";

	/**
	 * Validates activity-specific extension data
	 * Returns null if valid, error message if invalid
	 */
	validateExtension(data: unknown): string | null;

	/**
	 * Extracts metadata for alert generation from operation
	 */
	extractAlertMetadata(operation: OperationEntity): ActivityAlertMetadata;

	/**
	 * Gets the list of applicable alert type codes for this activity
	 */
	getApplicableAlertTypes(): string[];

	/**
	 * Generates activity-specific XML element for SAT notice
	 * Returns the XML string for the <DETALLE_OPERACIONES> section
	 */
	generateDetailXml(operation: OperationEntity): string;
}

/**
 * Metadata extracted from operation for alert analysis
 */
export interface ActivityAlertMetadata {
	/** Primary description of the operation subject */
	subject: string;

	/** Key-value pairs of relevant attributes */
	attributes: Record<string, string | number | boolean | null>;

	/** Suggested alert type code based on operation data */
	suggestedAlertTypeCode?: string;

	/** Risk factors identified */
	riskFactors: string[];
}

/**
 * Registry for all activity handlers
 */
export type ActivityRegistry = Record<ActivityCode, ActivityHandler>;
