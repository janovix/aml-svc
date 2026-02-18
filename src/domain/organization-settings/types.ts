export type SelfServiceMode = "disabled" | "manual" | "automatic";

export interface OrganizationSettingsEntity {
	id: string;
	organizationId: string; // Organization ID from auth-svc (better-auth organization plugin)
	obligatedSubjectKey: string; // RFC (clave_sujeto_obligado) - 12 characters
	activityKey: string; // Vulnerable activity code (e.g., "VEH")
	// KYC Self-Service settings
	selfServiceMode: SelfServiceMode;
	selfServiceExpiryHours: number;
	selfServiceRequiredSections: string[] | null; // JSON array of section keys
	createdAt: string;
	updatedAt: string;
}
