import { z } from "zod";

export const organizationSettingsCreateSchema = z.object({
	obligatedSubjectKey: z
		.string()
		.length(12, "obligatedSubjectKey must be exactly 12 characters")
		.regex(
			/^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/,
			"obligatedSubjectKey must be a valid RFC format (12 characters)",
		),
	activityKey: z
		.string()
		.min(1, "activityKey is required")
		.max(10, "activityKey must be at most 10 characters"),
});

export const organizationSettingsUpdateSchema =
	organizationSettingsCreateSchema.partial();

export type OrganizationSettingsCreateInput = z.infer<
	typeof organizationSettingsCreateSchema
>;
export type OrganizationSettingsUpdateInput = z.infer<
	typeof organizationSettingsUpdateSchema
>;
