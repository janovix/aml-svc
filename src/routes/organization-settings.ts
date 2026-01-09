import { Hono } from "hono";
import { ZodError } from "zod";

import type { Bindings } from "../index";
import { getPrismaClient } from "../lib/prisma";
import { type AuthVariables, getOrganizationId } from "../middleware/auth";
import { APIError } from "../middleware/error";
import {
	OrganizationSettingsRepository,
	OrganizationSettingsService,
	organizationSettingsCreateSchema,
	organizationSettingsUpdateSchema,
} from "../domain/organization-settings";

export const organizationSettingsRouter = new Hono<{
	Bindings: Bindings;
	Variables: AuthVariables;
}>();

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

// GET /api/v1/organization-settings - Get current organization's settings
organizationSettingsRouter.get("/", async (c) => {
	const organizationId = getOrganizationId(c);
	const prisma = getPrismaClient(c.env.DB);
	const repository = new OrganizationSettingsRepository(prisma);
	const service = new OrganizationSettingsService(repository);

	const settings = await service.getByOrganizationId(organizationId);

	if (!settings) {
		return c.json(
			{
				error: "Not Found",
				message: "Organization settings not found for this organization",
			},
			404,
		);
	}

	return c.json(settings);
});

// PUT /api/v1/organization-settings - Create or update organization settings
organizationSettingsRouter.put("/", async (c) => {
	const organizationId = getOrganizationId(c);
	const prisma = getPrismaClient(c.env.DB);
	const repository = new OrganizationSettingsRepository(prisma);
	const service = new OrganizationSettingsService(repository);

	const body = await c.req.json();
	const data = parseWithZod(organizationSettingsCreateSchema, body);

	const settings = await service.createOrUpdate(organizationId, {
		obligatedSubjectKey: data.obligatedSubjectKey,
		activityKey: data.activityKey,
	});

	return c.json(settings, 200);
});

// PATCH /api/v1/organization-settings - Partial update
organizationSettingsRouter.patch("/", async (c) => {
	const organizationId = getOrganizationId(c);
	const prisma = getPrismaClient(c.env.DB);
	const repository = new OrganizationSettingsRepository(prisma);
	const service = new OrganizationSettingsService(repository);

	const existing = await service.getByOrganizationId(organizationId);
	if (!existing) {
		return c.json(
			{
				error: "Not Found",
				message: "Organization settings not found for this organization",
			},
			404,
		);
	}

	const body = await c.req.json();
	const data = parseWithZod(organizationSettingsUpdateSchema, body);
	const settings = await service.update(organizationId, {
		obligatedSubjectKey: data.obligatedSubjectKey,
		activityKey: data.activityKey,
	});

	return c.json(settings);
});
