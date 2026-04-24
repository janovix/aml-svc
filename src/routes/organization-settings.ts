import { Hono } from "hono";
import { ZodError } from "zod";

import type { Bindings } from "../types";
import { getPrismaClient } from "../lib/prisma";
import { type AuthVariables, getTenantContext } from "../middleware/auth";
import { APIError } from "../middleware/error";
import {
	OrganizationSettingsRepository,
	OrganizationSettingsService,
	organizationSettingsCreateSchema,
	organizationSettingsUpdateSchema,
	selfServiceSettingsUpdateSchema,
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
	const tenant = getTenantContext(c);
	const prisma = getPrismaClient(c.env.DB);
	const repository = new OrganizationSettingsRepository(prisma);
	const service = new OrganizationSettingsService(repository);

	const settings = await service.getByOrganizationId(tenant);

	if (!settings) {
		return c.json({
			configured: false,
			settings: null,
		});
	}

	return c.json({
		configured: true,
		settings,
	});
});

// PUT /api/v1/organization-settings - Create or update organization settings
organizationSettingsRouter.put("/", async (c) => {
	const tenant = getTenantContext(c);
	const prisma = getPrismaClient(c.env.DB);
	const repository = new OrganizationSettingsRepository(prisma);
	const service = new OrganizationSettingsService(repository);

	const body = await c.req.json();
	const data = parseWithZod(organizationSettingsCreateSchema, body);

	const settings = await service.createOrUpdate(tenant, data);

	return c.json({ configured: true, settings }, 200);
});

// PATCH /api/v1/organization-settings - Partial update
organizationSettingsRouter.patch("/", async (c) => {
	const tenant = getTenantContext(c);
	const prisma = getPrismaClient(c.env.DB);
	const repository = new OrganizationSettingsRepository(prisma);
	const service = new OrganizationSettingsService(repository);

	const existing = await service.getByOrganizationId(tenant);
	if (!existing) {
		return c.json(
			{
				configured: false,
				error: "Not Configured",
				message:
					"Organization settings have not been configured yet. Use PUT to create them.",
			},
			404,
		);
	}

	const body = await c.req.json();
	const data = parseWithZod(organizationSettingsUpdateSchema, body);
	const settings = await service.update(tenant, data);

	return c.json({ configured: true, settings });
});

// PATCH /api/v1/organization-settings/self-service - Update only self-service settings
organizationSettingsRouter.patch("/self-service", async (c) => {
	const tenant = getTenantContext(c);
	const prisma = getPrismaClient(c.env.DB);
	const repository = new OrganizationSettingsRepository(prisma);
	const service = new OrganizationSettingsService(repository);

	const existing = await service.getByOrganizationId(tenant);
	if (!existing) {
		return c.json(
			{
				configured: false,
				error: "Not Configured",
				message:
					"Organization settings have not been configured yet. Use PUT to create them.",
			},
			404,
		);
	}

	const body = await c.req.json();
	const data = parseWithZod(selfServiceSettingsUpdateSchema, body);
	const settings = await service.update(tenant, {
		selfServiceMode: data.selfServiceMode,
		selfServiceExpiryHours: data.selfServiceExpiryHours,
		selfServiceRequiredSections: data.selfServiceRequiredSections,
		selfServiceSendEmail: data.selfServiceSendEmail,
	});

	return c.json({ configured: true, settings });
});
