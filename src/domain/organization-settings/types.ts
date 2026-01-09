export interface OrganizationSettingsEntity {
	id: string;
	organizationId: string; // Organization ID from auth-svc (better-auth organization plugin)
	obligatedSubjectKey: string; // RFC (clave_sujeto_obligado) - 12 characters
	activityKey: string; // Vulnerable activity code (e.g., "VEH")
	createdAt: string;
	updatedAt: string;
}
