import { z } from "zod";

export const selfServiceModeSchema = z.enum([
	"disabled",
	"manual",
	"automatic",
]);

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
	selfServiceMode: selfServiceModeSchema.optional(),
	selfServiceExpiryHours: z.number().int().min(1).max(720).optional(),
	selfServiceRequiredSections: z.array(z.string()).nullable().optional(),
});

export const organizationSettingsUpdateSchema =
	organizationSettingsCreateSchema.partial();

export const selfServiceSettingsUpdateSchema = z.object({
	selfServiceMode: selfServiceModeSchema.optional(),
	selfServiceExpiryHours: z.number().int().min(1).max(720).optional(),
	selfServiceRequiredSections: z.array(z.string()).nullable().optional(),
});

export type OrganizationSettingsCreateInput = z.infer<
	typeof organizationSettingsCreateSchema
>;
export type OrganizationSettingsUpdateInput = z.infer<
	typeof organizationSettingsUpdateSchema
>;
export type SelfServiceSettingsUpdateInput = z.infer<
	typeof selfServiceSettingsUpdateSchema
>;
