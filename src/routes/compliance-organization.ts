import { Hono } from "hono";
import { ZodError } from "zod";

import type { Bindings } from "../index";
import { getPrismaClient } from "../lib/prisma";
import { authMiddleware, type AuthVariables } from "../middleware/auth";
import { APIError } from "../middleware/error";
import {
	ComplianceOrganizationRepository,
	ComplianceOrganizationService,
	complianceOrganizationCreateSchema,
	complianceOrganizationUpdateSchema,
} from "../domain/compliance-organization";

const router = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>();

function parseWithZod<T>(
	schema: { parse: (input: unknown) => T },
	payload: unknown,
): T {
	try {
		return schema.parse(payload);
	} catch (error) {
		if (error instanceof ZodError) {
			throw new APIError(400, "Validation failed", error.format());
		}
		throw error;
	}
}

// All routes require authentication
router.use("*", authMiddleware());

// GET /api/v1/compliance-organization - Get current user's compliance organization
router.get("/", async (c) => {
	const user = c.get("user");
	if (!user) {
		return c.json(
			{ error: "Unauthorized", message: "User not authenticated" },
			401,
		);
	}
	const prisma = getPrismaClient(c.env.DB);
	const repository = new ComplianceOrganizationRepository(prisma);
	const service = new ComplianceOrganizationService(repository);

	const org = await service.getByUserId(user.id);

	if (!org) {
		return c.json(
			{
				error: "Not Found",
				message: "Compliance organization not found for this user",
			},
			404,
		);
	}

	return c.json(org);
});

// PUT /api/v1/compliance-organization - Create or update compliance organization
router.put("/", async (c) => {
	const user = c.get("user");
	if (!user) {
		return c.json(
			{ error: "Unauthorized", message: "User not authenticated" },
			401,
		);
	}
	const prisma = getPrismaClient(c.env.DB);
	const repository = new ComplianceOrganizationRepository(prisma);
	const service = new ComplianceOrganizationService(repository);

	const body = await c.req.json();
	const data = parseWithZod(complianceOrganizationCreateSchema, body);

	const org = await service.createOrUpdate(user.id, {
		claveSujetoObligado: data.claveSujetoObligado,
		claveActividad: data.claveActividad,
	});

	return c.json(org, 200);
});

// PATCH /api/v1/compliance-organization - Partial update
router.patch("/", async (c) => {
	const user = c.get("user");
	if (!user) {
		return c.json(
			{ error: "Unauthorized", message: "User not authenticated" },
			401,
		);
	}
	const prisma = getPrismaClient(c.env.DB);
	const repository = new ComplianceOrganizationRepository(prisma);
	const service = new ComplianceOrganizationService(repository);

	const existing = await service.getByUserId(user.id);
	if (!existing) {
		return c.json(
			{
				error: "Not Found",
				message: "Compliance organization not found for this user",
			},
			404,
		);
	}

	const body = await c.req.json();
	const data = parseWithZod(complianceOrganizationUpdateSchema, body);
	const org = await repository.update(user.id, {
		claveSujetoObligado: data.claveSujetoObligado,
		claveActividad: data.claveActividad,
	});

	return c.json(org);
});

export default router;
