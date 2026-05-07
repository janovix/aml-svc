/**
 * AML Training — learner + org-scoped compliance routes (`/api/v1/training/*`).
 */

import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";

import { TrainingService } from "../domain/training/service";
import {
	trainingProgressBodySchema,
	trainingQuizSubmitSchema,
} from "../domain/training/schemas";
import { getPrismaClient } from "../lib/prisma";
import { lmsStreamedBinaryHeaders } from "../lib/lms-streamed-binary-headers";
import { parseWithZod } from "../lib/route-helpers";
import type { Bindings } from "../types";
import type { AuthVariables } from "../middleware/auth";
import { APIError } from "../middleware/error";
import { requireOrgOwnerOrAdmin } from "../middleware/org-membership";

export const trainingRouter = new Hono<{
	Bindings: Bindings;
	Variables: AuthVariables;
}>();

trainingRouter.get("/courses", async (c) => {
	const org = c.get("organization");
	const user = c.get("user");
	if (!org?.id) {
		throw new APIError(400, "Active organization required");
	}

	const prisma = getPrismaClient(c.env.DB);
	const svc = new TrainingService(prisma, c.env);
	const data = await svc.listCoursesWithEnrollment(org.id, user.id);

	return c.json({ data });
});

trainingRouter.get("/courses/:slug", async (c) => {
	const org = c.get("organization");
	const user = c.get("user");
	if (!org?.id) {
		throw new APIError(400, "Active organization required");
	}

	const prisma = getPrismaClient(c.env.DB);
	const svc = new TrainingService(prisma, c.env);
	const slug = c.req.param("slug");
	const detail = await svc.getCourseDetailForLearner(slug, org.id, user.id);

	return c.json(detail);
});

trainingRouter.get("/enrollments/me", async (c) => {
	const org = c.get("organization");
	const user = c.get("user");
	if (!org?.id) {
		throw new APIError(400, "Active organization required");
	}

	const prisma = getPrismaClient(c.env.DB);
	const svc = new TrainingService(prisma, c.env);
	const data = await svc.listMyEnrollments(org.id, user.id);

	return c.json({ data });
});

trainingRouter.post("/enrollments/:id/progress", async (c) => {
	const org = c.get("organization");
	const user = c.get("user");
	if (!org?.id) {
		throw new APIError(400, "Active organization required");
	}

	const body = parseWithZod(trainingProgressBodySchema, await c.req.json());
	const prisma = getPrismaClient(c.env.DB);
	const svc = new TrainingService(prisma, c.env);
	const enrollmentId = c.req.param("id");

	const result = await svc.recordProgress(
		enrollmentId,
		body.moduleId,
		org.id,
		user.id,
		body.watchedSeconds,
	);

	return c.json(result);
});

trainingRouter.post("/enrollments/:id/quiz/start", async (c) => {
	const org = c.get("organization");
	const user = c.get("user");
	if (!org?.id) {
		throw new APIError(400, "Active organization required");
	}

	const prisma = getPrismaClient(c.env.DB);
	const svc = new TrainingService(prisma, c.env);
	const enrollmentId = c.req.param("id");

	const result = await svc.startQuiz(enrollmentId, org.id, user.id);

	return c.json(result);
});

trainingRouter.post("/enrollments/:id/quiz/submit", async (c) => {
	const org = c.get("organization");
	const user = c.get("user");
	if (!org?.id) {
		throw new APIError(400, "Active organization required");
	}

	const body = parseWithZod(trainingQuizSubmitSchema, await c.req.json());
	const prisma = getPrismaClient(c.env.DB);
	const svc = new TrainingService(prisma, c.env);
	const enrollmentId = c.req.param("id");

	const result = await svc.submitQuiz(
		enrollmentId,
		body.attemptId,
		body.answers,
		org.id,
		user.id,
	);

	return c.json(result);
});

trainingRouter.get("/certifications/me", async (c) => {
	const org = c.get("organization");
	const user = c.get("user");
	if (!org?.id) {
		throw new APIError(400, "Active organization required");
	}

	const prisma = getPrismaClient(c.env.DB);
	const svc = new TrainingService(prisma, c.env);
	const data = await svc.listMyCertifications(org.id, user.id);

	return c.json({ data });
});

trainingRouter.get("/certifications/:id/download", async (c) => {
	const org = c.get("organization");
	const user = c.get("user");
	if (!org?.id) {
		throw new APIError(400, "Active organization required");
	}

	const prisma = getPrismaClient(c.env.DB);
	const svc = new TrainingService(prisma, c.env);
	const certId = c.req.param("id");

	const { key, filename } = await svc.getCertificationDownloadStream(
		certId,
		org.id,
		user.id,
	);

	const obj = await c.env.R2_BUCKET.get(key);
	if (!obj?.body) {
		throw new APIError(404, "File not found");
	}

	return new Response(obj.body, {
		headers: {
			"Content-Type": "application/pdf",
			"Content-Disposition": `attachment; filename="${filename}"`,
		},
	});
});

trainingRouter.get("/module-assets/:moduleId", async (c) => {
	const org = c.get("organization");
	const user = c.get("user");
	if (!org?.id) {
		throw new APIError(400, "Active organization required");
	}

	const prisma = getPrismaClient(c.env.DB);
	const svc = new TrainingService(prisma, c.env);
	const moduleId = c.req.param("moduleId");
	const rawIndex = c.req.query("index") ?? "0";
	const index = Number.parseInt(rawIndex, 10);

	const { key, contentType, total } = await svc.getModuleAssetStreamKey(
		moduleId,
		org.id,
		user.id,
		Number.isFinite(index) ? index : 0,
	);

	const obj = await c.env.R2_BUCKET.get(key);
	if (!obj?.body) {
		throw new APIError(404, "Asset not found");
	}

	return new Response(obj.body, {
		headers: lmsStreamedBinaryHeaders({
			contentType,
			xTotalCount: total,
		}),
	});
});

const orgRouter = new Hono<{
	Bindings: Bindings;
	Variables: AuthVariables;
}>();

const ensureJwtOrgMatchesPath: MiddlewareHandler<{
	Bindings: Bindings;
	Variables: AuthVariables;
}> = async (c, next) => {
	const jwtOrg = c.get("organization")?.id;
	const pathOrg = c.req.param("organizationId");
	if (!jwtOrg || !pathOrg || jwtOrg !== pathOrg) {
		throw new APIError(403, "Organization mismatch", {
			code: "TRAINING_ORG_MISMATCH",
		});
	}
	await next();
};

orgRouter.use("/org/:organizationId/*", ensureJwtOrgMatchesPath);
orgRouter.use("/org/:organizationId", ensureJwtOrgMatchesPath);
orgRouter.use("/org/:organizationId/*", requireOrgOwnerOrAdmin());
orgRouter.use("/org/:organizationId", requireOrgOwnerOrAdmin());

orgRouter.get("/org/:organizationId/enrollments", async (c) => {
	const prisma = getPrismaClient(c.env.DB);
	const svc = new TrainingService(prisma, c.env);
	const organizationId = c.req.param("organizationId");
	const courseId = c.req.query("courseId");
	const status = c.req.query("status") as
		| "ASSIGNED"
		| "IN_PROGRESS"
		| "COMPLETED"
		| "EXPIRED"
		| "FAILED"
		| undefined;

	const data = await svc.listOrgEnrollments(organizationId, {
		courseId: courseId ?? undefined,
		status,
	});

	return c.json({ data });
});

orgRouter.get("/org/:organizationId/certifications", async (c) => {
	const prisma = getPrismaClient(c.env.DB);
	const svc = new TrainingService(prisma, c.env);
	const organizationId = c.req.param("organizationId");

	const data = await svc.listOrgCertifications(organizationId);

	return c.json({ data });
});

orgRouter.get("/org/:organizationId/compliance-summary", async (c) => {
	const prisma = getPrismaClient(c.env.DB);
	const svc = new TrainingService(prisma, c.env);
	const organizationId = c.req.param("organizationId");

	const summary = await svc.orgComplianceSummary(organizationId);

	return c.json(summary);
});

trainingRouter.route("/", orgRouter);
