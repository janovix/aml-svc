import { z } from "zod";

import type { WatchlistRescanChannel, WatchlistRescanSource } from "./types";

export const selfServiceModeSchema = z.enum([
	"disabled",
	"manual",
	"automatic",
]);

const watchlistRescanChannelSchema = z.enum([
	"in_app",
	"email",
]) satisfies z.ZodType<WatchlistRescanChannel>;
const watchlistRescanSourceSchema = z.enum([
	"ofac",
	"un",
	"sat69b",
	"pep",
	"adverse_media",
]) satisfies z.ZodType<WatchlistRescanSource>;

const MORAL_RFC_REGEX = /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/;
const PHYSICAL_RFC_REGEX = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/;

export const organizationSettingsCreateSchema = z.object({
	obligatedSubjectKey: z
		.string()
		.refine(
			(val) =>
				(val.length === 12 && MORAL_RFC_REGEX.test(val)) ||
				(val.length === 13 && PHYSICAL_RFC_REGEX.test(val)),
			"obligatedSubjectKey must be a valid RFC: 12 characters for moral person or 13 characters for physical person",
		),
	activityKey: z
		.string()
		.min(1, "activityKey is required")
		.max(10, "activityKey must be at most 10 characters"),
	selfServiceMode: selfServiceModeSchema.optional(),
	selfServiceExpiryHours: z.number().int().min(1).max(720).optional(),
	selfServiceRequiredSections: z.array(z.string()).nullable().optional(),
	selfServiceSendEmail: z.boolean().optional(),
	watchlistRescanEnabled: z.boolean().optional(),
	watchlistRescanIntervalDays: z.number().int().min(7).max(180).optional(),
	watchlistRescanIncludeBcs: z.boolean().optional(),
	watchlistRescanNotifyOnStatusChange: z.boolean().optional(),
	watchlistRescanDailyCap: z.number().int().min(50).max(10_000).optional(),
	watchlistRescanNotifyChannels: z
		.array(watchlistRescanChannelSchema)
		.min(1)
		.max(2)
		.optional(),
	watchlistRescanSources: z
		.array(watchlistRescanSourceSchema)
		.max(5)
		.optional(),
});

export const organizationSettingsUpdateSchema =
	organizationSettingsCreateSchema.partial();

export const selfServiceSettingsUpdateSchema = z.object({
	selfServiceMode: selfServiceModeSchema.optional(),
	selfServiceExpiryHours: z.number().int().min(1).max(720).optional(),
	selfServiceRequiredSections: z.array(z.string()).nullable().optional(),
	selfServiceSendEmail: z.boolean().optional(),
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
