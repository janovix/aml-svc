import { z } from "zod";

export const i18nJsonSchema = z.object({
	es: z.string().optional(),
	en: z.string().optional(),
});

export const trainingCourseCreateSchema = z.object({
	slug: z
		.string()
		.min(1)
		.max(120)
		.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
	titleI18n: z.record(z.string()),
	descriptionI18n: z.record(z.string()).optional(),
	isMandatory: z.boolean().optional(),
	validityMonths: z.number().int().min(1).max(120).optional(),
	passingScore: z.number().int().min(0).max(100).optional(),
	maxAttempts: z.number().int().min(1).max(20).optional(),
	cooldownHours: z.number().int().min(0).max(168).optional(),
});

export const trainingCourseUpdateSchema = trainingCourseCreateSchema
	.partial()
	.extend({
		status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
	});

export const trainingModuleCreateSchema = z.object({
	sortOrder: z.number().int().min(0),
	kind: z.enum(["VIDEO", "PDF", "IMAGE", "TEXT"]),
	titleI18n: z.record(z.string()),
	assetRef: z.string().min(1),
	durationSeconds: z.number().int().min(0).optional().nullable(),
	required: z.boolean().optional(),
});

export const trainingProgressBodySchema = z.object({
	moduleId: z.string().uuid(),
	watchedSeconds: z.number().int().min(0).optional(),
});

export const trainingQuizSubmitSchema = z.object({
	attemptId: z.string().uuid(),
	answers: z.record(z.union([z.string(), z.array(z.string())])),
});

export const trainingAssetUploadRequestSchema = z.object({
	fileName: z.string().min(1).max(255),
	contentType: z.string().min(1).max(128),
});

export const trainingVideoUploadRequestSchema = z.object({
	maxDurationSeconds: z.number().int().min(60).max(7200).optional(),
});
