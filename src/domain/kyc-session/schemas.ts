import { z } from "zod";
import {
	KYC_SESSION_STATUSES,
	KYC_IDENTIFICATION_TIERS,
	KYC_EDITABLE_SECTIONS,
} from "./types";

export const kycSessionStatusSchema = z.enum(KYC_SESSION_STATUSES);
export const kycIdentificationTierSchema = z.enum(KYC_IDENTIFICATION_TIERS);
export const kycEditableSectionSchema = z.enum(KYC_EDITABLE_SECTIONS);

export const kycSessionCreateSchema = z.object({
	clientId: z.string().min(1),
	createdBy: z.string().min(1).default("system"),
	editableSections: z.array(kycEditableSectionSchema).optional(),
	expiryHours: z.number().int().min(1).max(720).optional(), // Override org default
});

export const kycSessionUpdateSchema = z.object({
	status: kycSessionStatusSchema.optional(),
	rejectionReason: z.string().max(1000).optional(),
});

export const kycSessionRevokeSchema = z.object({
	reason: z.string().max(500).optional(),
});

export const kycSessionRejectSchema = z.object({
	reason: z.string().min(1).max(1000),
	reopenForCorrections: z.boolean().optional().default(false),
});

export const kycSessionListFiltersSchema = z.object({
	clientId: z.string().optional(),
	status: kycSessionStatusSchema.optional(),
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type KycSessionCreateInput = z.infer<typeof kycSessionCreateSchema>;
export type KycSessionUpdateInput = z.infer<typeof kycSessionUpdateSchema>;
export type KycSessionRevokeInput = z.infer<typeof kycSessionRevokeSchema>;
export type KycSessionRejectInput = z.infer<typeof kycSessionRejectSchema>;
export type KycSessionListFilters = z.infer<typeof kycSessionListFiltersSchema>;
