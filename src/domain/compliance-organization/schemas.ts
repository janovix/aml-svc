import { z } from "zod";

export const complianceOrganizationCreateSchema = z.object({
	claveSujetoObligado: z
		.string()
		.length(12, "clave_sujeto_obligado must be exactly 12 characters")
		.regex(
			/^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/,
			"clave_sujeto_obligado must be a valid RFC format (12 characters)",
		),
	claveActividad: z
		.string()
		.min(1, "clave_actividad is required")
		.max(10, "clave_actividad must be at most 10 characters"),
});

export const complianceOrganizationUpdateSchema =
	complianceOrganizationCreateSchema.partial();

export type ComplianceOrganizationCreateInput = z.infer<
	typeof complianceOrganizationCreateSchema
>;
export type ComplianceOrganizationUpdateInput = z.infer<
	typeof complianceOrganizationUpdateSchema
>;
