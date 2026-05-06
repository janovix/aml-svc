/**
 * Platform admin routes for AML Training (`/api/v1/admin/training/*`).
 */

import { Hono } from "hono";

import { TrainingService } from "../domain/training/service";
import {
	trainingAssetUploadRequestSchema,
	trainingCourseCreateSchema,
	trainingCourseUpdateSchema,
	trainingModuleCreateSchema,
	trainingVideoUploadRequestSchema,
} from "../domain/training/schemas";
import { createStreamDirectUpload } from "../lib/training/stream";
import { uploadToR2 } from "../lib/r2-upload";
import { getPrismaClient } from "../lib/prisma";
import type { Bindings } from "../types";
import type { AdminAuthVariables } from "../middleware/admin-auth";
import { parseWithZod } from "../lib/route-helpers";
import { APIError } from "../middleware/error";

export const trainingAdminRouter = new Hono<{
	Bindings: Bindings;
	Variables: AdminAuthVariables;
}>();

trainingAdminRouter.get("/courses", async (c) => {
	const prisma = getPrismaClient(c.env.DB);
	const svc = new TrainingService(prisma, c.env);
	const status = c.req.query("status") as
		| "DRAFT"
		| "PUBLISHED"
		| "ARCHIVED"
		| undefined;

	const data = await svc.listCoursesAdmin(status ? { status } : undefined);

	return c.json({ data });
});

trainingAdminRouter.get("/courses/:id", async (c) => {
	const prisma = getPrismaClient(c.env.DB);
	const svc = new TrainingService(prisma, c.env);
	const course = await svc.getCourseAdminById(c.req.param("id"));
	return c.json(course);
});

trainingAdminRouter.post("/courses", async (c) => {
	const body = parseWithZod(trainingCourseCreateSchema, await c.req.json());
	const prisma = getPrismaClient(c.env.DB);
	const svc = new TrainingService(prisma, c.env);

	const created = await svc.createCourseAdmin({
		slug: body.slug,
		titleI18n: body.titleI18n as Record<string, string>,
		descriptionI18n: body.descriptionI18n as Record<string, string> | undefined,
		isMandatory: body.isMandatory,
		validityMonths: body.validityMonths,
		passingScore: body.passingScore,
		maxAttempts: body.maxAttempts,
		cooldownHours: body.cooldownHours,
	});

	return c.json(created, 201);
});

trainingAdminRouter.patch("/courses/:id", async (c) => {
	const body = parseWithZod(trainingCourseUpdateSchema, await c.req.json());
	const prisma = getPrismaClient(c.env.DB);
	const svc = new TrainingService(prisma, c.env);
	const id = c.req.param("id");

	const updated = await svc.updateCourseAdmin(id, {
		...(body.titleI18n != null
			? { titleI18n: body.titleI18n as Record<string, string> }
			: {}),
		...(body.descriptionI18n != null
			? { descriptionI18n: body.descriptionI18n as Record<string, string> }
			: {}),
		isMandatory: body.isMandatory,
		validityMonths: body.validityMonths,
		passingScore: body.passingScore,
		maxAttempts: body.maxAttempts,
		cooldownHours: body.cooldownHours,
		status: body.status as "DRAFT" | "PUBLISHED" | "ARCHIVED" | undefined,
	});

	return c.json(updated);
});

trainingAdminRouter.delete("/courses/:id", async (c) => {
	const prisma = getPrismaClient(c.env.DB);
	const svc = new TrainingService(prisma, c.env);
	await svc.deleteCourseAdmin(c.req.param("id"));
	return c.json({ success: true });
});

trainingAdminRouter.post("/courses/:id/publish", async (c) => {
	const prisma = getPrismaClient(c.env.DB);
	const svc = new TrainingService(prisma, c.env);
	const published = await svc.publishCourse(c.req.param("id"));
	return c.json(published);
});

trainingAdminRouter.post("/courses/:courseId/modules", async (c) => {
	const body = parseWithZod(trainingModuleCreateSchema, await c.req.json());
	const prisma = getPrismaClient(c.env.DB);
	const svc = new TrainingService(prisma, c.env);
	const mod = await svc.upsertModule(c.req.param("courseId"), body);
	return c.json(mod, 201);
});

trainingAdminRouter.patch("/courses/:courseId/modules/:moduleId", async (c) => {
	const body = parseWithZod(trainingModuleCreateSchema, await c.req.json());
	const prisma = getPrismaClient(c.env.DB);
	const svc = new TrainingService(prisma, c.env);
	const mod = await svc.upsertModule(c.req.param("courseId"), {
		id: c.req.param("moduleId"),
		...body,
	});
	return c.json(mod);
});

trainingAdminRouter.delete(
	"/courses/:courseId/modules/:moduleId",
	async (c) => {
		const prisma = getPrismaClient(c.env.DB);
		const svc = new TrainingService(prisma, c.env);
		await svc.deleteModule(c.req.param("moduleId"));
		return c.json({ success: true });
	},
);

trainingAdminRouter.put("/courses/:courseId/quiz", async (c) => {
	const body = (await c.req.json()) as Parameters<
		TrainingService["upsertQuizFull"]
	>[1];

	const prisma = getPrismaClient(c.env.DB);
	const svc = new TrainingService(prisma, c.env);
	const quiz = await svc.upsertQuizFull(c.req.param("courseId"), body);
	return c.json(quiz);
});

trainingAdminRouter.post("/uploads/video", async (c) => {
	const raw = await c.req.json().catch(() => ({}));
	const body = parseWithZod(trainingVideoUploadRequestSchema, raw);

	const result = await createStreamDirectUpload(c.env, {
		maxDurationSeconds: body.maxDurationSeconds,
	});

	return c.json({
		uploadURL: result.uploadURL,
		uid: result.uid,
	});
});

trainingAdminRouter.post("/uploads/asset", async (c) => {
	const body = parseWithZod(
		trainingAssetUploadRequestSchema,
		await c.req.json(),
	);
	const courseId = c.req.query("courseId");
	if (!courseId) {
		throw new APIError(400, "courseId query required");
	}

	const prisma = getPrismaClient(c.env.DB);
	const svc = new TrainingService(prisma, c.env);
	const key = svc.generateLmsAssetKey(courseId, body.fileName);

	const token = crypto.randomUUID();
	const tokenKey = `training:upload:${token}`;
	await c.env.CACHE.put(
		tokenKey,
		JSON.stringify({
			key,
			contentType: body.contentType,
			exp: Date.now() + 15 * 60 * 1000,
		}),
		{ expirationTtl: 900 },
	);

	const base = new URL(c.req.url).origin;
	return c.json({
		putUrl: `${base}/api/v1/admin/training/uploads/asset/${token}`,
		key,
		method: "PUT",
		headers: {
			"Content-Type": body.contentType,
		},
	});
});

trainingAdminRouter.put("/uploads/asset/:token", async (c) => {
	const token = c.req.param("token");
	const raw = await c.env.CACHE.get(`training:upload:${token}`);
	if (!raw) {
		throw new APIError(400, "Invalid or expired upload token");
	}

	const meta = JSON.parse(raw) as {
		key: string;
		contentType: string;
		exp: number;
	};

	if (Date.now() > meta.exp) {
		throw new APIError(400, "Upload token expired");
	}

	const buf = await c.req.arrayBuffer();

	await uploadToR2({
		bucket: c.env.R2_BUCKET,
		key: meta.key,
		content: buf,
		contentType: meta.contentType,
	});

	await c.env.CACHE.delete(`training:upload:${token}`);

	return c.json({ key: meta.key });
});

trainingAdminRouter.get("/compliance", async (c) => {
	const prisma = getPrismaClient(c.env.DB);
	const svc = new TrainingService(prisma, c.env);
	const organizationId = c.req.query("organizationId") ?? undefined;

	const summary = await svc.adminComplianceSummary({ organizationId });

	return c.json(summary);
});

trainingAdminRouter.get("/enrollments", async (c) => {
	const prisma = getPrismaClient(c.env.DB);
	const svc = new TrainingService(prisma, c.env);
	const organizationId = c.req.query("organizationId") ?? undefined;
	const courseId = c.req.query("courseId") ?? undefined;
	const status = c.req.query("status") as
		| "ASSIGNED"
		| "IN_PROGRESS"
		| "COMPLETED"
		| "EXPIRED"
		| "FAILED"
		| undefined;

	const data = await svc.listEnrollmentsAdmin({
		organizationId,
		courseId,
		status,
	});

	return c.json({ data });
});
