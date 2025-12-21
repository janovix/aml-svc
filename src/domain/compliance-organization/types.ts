export interface ComplianceOrganizationEntity {
	id: string;
	userId: string; // User ID from JWT (compliance officer)
	claveSujetoObligado: string; // RFC (clave_sujeto_obligado) - 12 characters
	claveActividad: string; // Vulnerable activity code (e.g., "VEH")
	createdAt: string;
	updatedAt: string;
}
