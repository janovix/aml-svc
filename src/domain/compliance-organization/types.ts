export interface ComplianceOrganizationEntity {
	id: string;
	userId: string; // User ID from JWT (compliance officer)
	obligatedSubjectKey: string; // RFC (clave_sujeto_obligado) - 12 characters
	activityKey: string; // Vulnerable activity code (e.g., "VEH")
	createdAt: string;
	updatedAt: string;
}
