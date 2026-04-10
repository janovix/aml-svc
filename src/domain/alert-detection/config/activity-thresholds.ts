/**
 * Activity-specific UMA thresholds from LFPIORPI Art. 17
 *
 * Each vulnerable activity has two thresholds:
 * - Identification: When client identity data must be captured
 * - Notice: When a SAT notice must be submitted
 *
 * "ALWAYS" means the activity must always be identified/reported regardless of amount.
 *
 * Source: LFPIORPI Art. 17 + SAT Threshold Tables (Feb 2026)
 */

export interface ActivityThreshold {
	activityCode: string;
	lfpiropiFraccion: string;
	identificationThresholdUma: number | "ALWAYS";
	noticeThresholdUma: number | "ALWAYS";
	description: string;
}

/**
 * Correct UMA thresholds per vulnerable activity.
 * These values come directly from LFPIORPI Art. 17.
 */
export const ACTIVITY_THRESHOLDS: Record<string, ActivityThreshold> = {
	// Fracción I - Juegos, concursos, sorteos
	JYS: {
		activityCode: "JYS",
		lfpiropiFraccion: "I",
		identificationThresholdUma: 325,
		noticeThresholdUma: 645,
		description: "Juegos, concursos, sorteos",
	},

	// Fracción II - Tarjetas
	TSC: {
		activityCode: "TSC",
		lfpiropiFraccion: "II-a",
		identificationThresholdUma: 805,
		noticeThresholdUma: 1285,
		description: "Tarjetas de crédito/servicios",
	},
	TPP: {
		activityCode: "TPP",
		lfpiropiFraccion: "II-b,c",
		identificationThresholdUma: 645,
		noticeThresholdUma: 645,
		description: "Tarjetas prepagadas",
	},
	TDR: {
		activityCode: "TDR",
		lfpiropiFraccion: "II-c",
		identificationThresholdUma: 645,
		noticeThresholdUma: 645,
		description: "Instrumentos valor/recompensas",
	},

	// Fracción III - Cheques de viajero
	CHV: {
		activityCode: "CHV",
		lfpiropiFraccion: "III",
		identificationThresholdUma: "ALWAYS",
		noticeThresholdUma: 645,
		description: "Cheques de viajero",
	},

	// Fracción IV - Préstamos
	MPC: {
		activityCode: "MPC",
		lfpiropiFraccion: "IV",
		identificationThresholdUma: "ALWAYS",
		noticeThresholdUma: 1605,
		description: "Préstamos/créditos",
	},

	// Fracción V - Bienes inmuebles
	INM: {
		activityCode: "INM",
		lfpiropiFraccion: "V",
		identificationThresholdUma: "ALWAYS",
		noticeThresholdUma: 8025,
		description: "Bienes inmuebles",
	},

	// Fracción V Bis - Desarrollo inmobiliario
	DIN: {
		activityCode: "DIN",
		lfpiropiFraccion: "V Bis",
		identificationThresholdUma: "ALWAYS",
		noticeThresholdUma: 8025,
		description: "Desarrollo inmobiliario",
	},

	// Fracción VI - Metales/piedras preciosas
	MJR: {
		activityCode: "MJR",
		lfpiropiFraccion: "VI",
		identificationThresholdUma: 805,
		noticeThresholdUma: 1605,
		description: "Metales/piedras preciosas, joyas",
	},

	// Fracción VII - Obras de arte
	OBA: {
		activityCode: "OBA",
		lfpiropiFraccion: "VII",
		identificationThresholdUma: 2410,
		noticeThresholdUma: 4815,
		description: "Obras de arte",
	},

	// Fracción VIII - Vehículos
	VEH: {
		activityCode: "VEH",
		lfpiropiFraccion: "VIII",
		identificationThresholdUma: 3210,
		noticeThresholdUma: 6420,
		description: "Vehículos",
	},

	// Fracción IX - Blindaje
	BLI: {
		activityCode: "BLI",
		lfpiropiFraccion: "IX",
		identificationThresholdUma: 2410,
		noticeThresholdUma: 4815,
		description: "Servicios de blindaje",
	},

	// Fracción X - Traslado/custodia valores
	TCV: {
		activityCode: "TCV",
		lfpiropiFraccion: "X",
		identificationThresholdUma: "ALWAYS",
		noticeThresholdUma: 3210,
		description: "Traslado/custodia valores",
	},

	// Fracción XI - Servicios profesionales
	SPR: {
		activityCode: "SPR",
		lfpiropiFraccion: "XI",
		identificationThresholdUma: "ALWAYS",
		noticeThresholdUma: "ALWAYS",
		description: "Servicios profesionales",
	},

	// Fracción XII-A - Fe pública (notarios)
	FEP: {
		activityCode: "FEP",
		lfpiropiFraccion: "XII-A",
		identificationThresholdUma: "ALWAYS",
		noticeThresholdUma: 8000,
		description: "Fe pública (notarios)",
	},

	// Fracción XII-B - Fe pública (corredores)
	FES: {
		activityCode: "FES",
		lfpiropiFraccion: "XII-B",
		identificationThresholdUma: "ALWAYS",
		noticeThresholdUma: "ALWAYS",
		description: "Fe pública (corredores)",
	},

	// Fracción XIII - Donativos
	DON: {
		activityCode: "DON",
		lfpiropiFraccion: "XIII",
		identificationThresholdUma: 1605,
		noticeThresholdUma: 3210,
		description: "Recepción de donativos",
	},

	// Fracción XV - Arrendamiento
	ARI: {
		activityCode: "ARI",
		lfpiropiFraccion: "XV",
		identificationThresholdUma: 1605,
		noticeThresholdUma: 3210,
		description: "Arrendamiento inmuebles",
	},

	// Fracción XVI - Activos virtuales
	AVI: {
		activityCode: "AVI",
		lfpiropiFraccion: "XVI",
		identificationThresholdUma: "ALWAYS",
		noticeThresholdUma: 210,
		description: "Activos virtuales",
	},
};

/** All supported activity codes */
export const ALL_ACTIVITY_CODES = Object.keys(ACTIVITY_THRESHOLDS);

/** Get the notice threshold in UMA for an activity */
export function getNoticeThresholdUma(
	activityCode: string,
): number | "ALWAYS" | null {
	const threshold = ACTIVITY_THRESHOLDS[activityCode];
	if (!threshold) return null;
	return threshold.noticeThresholdUma;
}

/** Get the identification threshold in UMA for an activity */
export function getIdentificationThresholdUma(
	activityCode: string,
): number | "ALWAYS" | null {
	const threshold = ACTIVITY_THRESHOLDS[activityCode];
	if (!threshold) return null;
	return threshold.identificationThresholdUma;
}

/** Convert notice UMA threshold to MXN for a given activity and UMA daily value */
export function getNoticeThresholdMxn(
	activityCode: string,
	umaDailyValue: number,
): number | null {
	const umaThreshold = getNoticeThresholdUma(activityCode);
	if (umaThreshold === null) return null;
	if (umaThreshold === "ALWAYS") return 0;
	return umaThreshold * umaDailyValue;
}

/** Convert identification UMA threshold to MXN */
export function getIdentificationThresholdMxn(
	activityCode: string,
	umaDailyValue: number,
): number | null {
	const umaThreshold = getIdentificationThresholdUma(activityCode);
	if (umaThreshold === null) return null;
	if (umaThreshold === "ALWAYS") return 0;
	return umaThreshold * umaDailyValue;
}

/** Check if an MXN amount exceeds the notice threshold for an activity */
export function exceedsNoticeThreshold(
	activityCode: string,
	amountMxn: number,
	umaDailyValue: number,
): boolean {
	const threshold = getNoticeThresholdMxn(activityCode, umaDailyValue);
	if (threshold === null) return false;
	return amountMxn >= threshold;
}

/** Check if an MXN amount exceeds the identification threshold for an activity */
export function exceedsIdentificationThreshold(
	activityCode: string,
	amountMxn: number,
	umaDailyValue: number,
): boolean {
	const threshold = getIdentificationThresholdMxn(activityCode, umaDailyValue);
	if (threshold === null) return false;
	return amountMxn >= threshold;
}

/** Default UMA daily value fallback (Feb 2026) */
export const DEFAULT_UMA_DAILY_VALUE = 117.31;
