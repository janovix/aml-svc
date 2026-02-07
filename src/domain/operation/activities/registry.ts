import type { ActivityHandler, ActivityRegistry } from "./types";
import type { ActivityCode, OperationEntity } from "../types";

// Import all activity handlers
import { vehicleHandler } from "./veh";
import { realEstateHandler } from "./inm";
import { jewelryHandler } from "./mjr";
import { virtualAssetHandler } from "./avi";
import { gamblingHandler } from "./jys";
import { rentalHandler } from "./ari";
import { armoringHandler } from "./bli";
import { donationHandler } from "./don";
import { loanHandler } from "./mpc";
import { officialHandler } from "./fep";
import { notaryHandler } from "./fes";
import { professionalHandler } from "./spr";
import { travelerCheckHandler } from "./chv";
import { cardHandler } from "./tsc";
import { prepaidHandler } from "./tpp";
import { rewardHandler } from "./tdr";
import { valuableHandler } from "./tcv";
import { artHandler } from "./oba";
import { developmentHandler } from "./din";

/**
 * Central registry of all activity handlers
 * Each handler provides specialized logic for its vulnerable activity type
 */
export const activityRegistry: ActivityRegistry = {
	VEH: vehicleHandler,
	INM: realEstateHandler,
	MJR: jewelryHandler,
	AVI: virtualAssetHandler,
	JYS: gamblingHandler,
	ARI: rentalHandler,
	BLI: armoringHandler,
	DON: donationHandler,
	MPC: loanHandler,
	FEP: officialHandler,
	FES: notaryHandler,
	SPR: professionalHandler,
	CHV: travelerCheckHandler,
	TSC: cardHandler,
	TPP: prepaidHandler,
	TDR: rewardHandler,
	TCV: valuableHandler,
	OBA: artHandler,
	DIN: developmentHandler,
};

/**
 * Gets the handler for a specific activity code
 */
export function getActivityHandler(code: ActivityCode): ActivityHandler {
	const handler = activityRegistry[code];
	if (!handler) {
		throw new Error(`Unknown activity code: ${code}`);
	}
	return handler;
}

/**
 * Gets all supported activity codes
 */
export function getAllActivityCodes(): ActivityCode[] {
	return Object.keys(activityRegistry) as ActivityCode[];
}

/**
 * Validates extension data for a specific activity
 */
export function validateActivityExtension(
	code: ActivityCode,
	data: unknown,
): string | null {
	const handler = getActivityHandler(code);
	return handler.validateExtension(data);
}

/**
 * Gets the notice UMA threshold for a specific activity.
 * This is the threshold at which a SAT notice must be filed.
 */
export function getNoticeThresholdUma(code: ActivityCode): number | "ALWAYS" {
	const handler = getActivityHandler(code);
	return handler.noticeThresholdUma;
}

/**
 * Gets the identification UMA threshold for a specific activity.
 * This is the threshold at which client identity must be captured.
 */
export function getIdentificationThresholdUma(
	code: ActivityCode,
): number | "ALWAYS" {
	const handler = getActivityHandler(code);
	return handler.identificationThresholdUma;
}

/**
 * @deprecated Use getNoticeThresholdUma() instead. Returns notice threshold for backward compat.
 */
export function getUmaThreshold(code: ActivityCode): number {
	const handler = getActivityHandler(code);
	const t = handler.noticeThresholdUma;
	return t === "ALWAYS" ? 0 : t;
}

/**
 * Gets applicable alert types for a specific activity
 */
export function getApplicableAlertTypes(code: ActivityCode): string[] {
	const handler = getActivityHandler(code);
	return handler.getApplicableAlertTypes();
}

/**
 * Generates the DETALLE_OPERACIONES XML section for an operation
 */
export function generateDetailXml(operation: OperationEntity): string {
	const handler = getActivityHandler(operation.activityCode);
	return handler.generateDetailXml(operation);
}

/**
 * Extracts alert metadata from an operation
 */
export function extractAlertMetadata(operation: OperationEntity) {
	const handler = getActivityHandler(operation.activityCode);
	return handler.extractAlertMetadata(operation);
}

/**
 * Get activity name by code
 */
export function getActivityName(code: ActivityCode): string {
	const handler = getActivityHandler(code);
	return handler.name;
}

/**
 * Get all activities with their details
 */
export function getAllActivities(): Array<{
	code: ActivityCode;
	name: string;
	lfpiropiFraccion: string;
	identificationThresholdUma: number | "ALWAYS";
	noticeThresholdUma: number | "ALWAYS";
}> {
	return getAllActivityCodes().map((code) => {
		const handler = activityRegistry[code];
		return {
			code,
			name: handler.name,
			lfpiropiFraccion: handler.lfpiropiFraccion,
			identificationThresholdUma: handler.identificationThresholdUma,
			noticeThresholdUma: handler.noticeThresholdUma,
		};
	});
}
