export type SelfServiceMode = "disabled" | "manual" | "automatic";

export type WatchlistRescanChannel = "in_app" | "email";

export type WatchlistRescanSource =
	| "ofac"
	| "un"
	| "sat69b"
	| "pep"
	| "adverse_media";

export interface OrganizationSettingsEntity {
	id: string;
	organizationId: string; // Organization ID from auth-svc (better-auth organization plugin)
	obligatedSubjectKey: string; // RFC (clave_sujeto_obligado) - 12 characters
	activityKey: string; // Vulnerable activity code (e.g., "VEH")
	// KYC Self-Service settings
	selfServiceMode: SelfServiceMode;
	selfServiceExpiryHours: number;
	selfServiceRequiredSections: string[] | null; // JSON array of section keys
	/** When true, aml-svc sends KYC invite email on manual session creation (default). */
	selfServiceSendEmail: boolean;
	// Watchlist scheduled re-screen
	watchlistRescanEnabled: boolean;
	watchlistRescanIntervalDays: number;
	watchlistRescanIncludeBcs: boolean;
	watchlistRescanNotifyOnStatusChange: boolean;
	watchlistRescanDailyCap: number;
	watchlistRescanNotifyChannels: WatchlistRescanChannel[];
	watchlistRescanSources: WatchlistRescanSource[];
	createdAt: string;
	updatedAt: string;
}
