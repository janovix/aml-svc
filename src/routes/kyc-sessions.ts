import { Hono } from "hono";
import { ZodError } from "zod";

import type { Bindings } from "../types";
import { getPrismaClient } from "../lib/prisma";
import {
	type AuthVariables,
	getOrganizationId,
	getAuthUser,
} from "../middleware/auth";
import { APIError } from "../middleware/error";
import {
	KycSessionService,
	kycSessionCreateSchema,
	kycSessionRejectSchema,
	kycSessionListFiltersSchema,
} from "../domain/kyc-session";
import { sendKYCInviteEmail } from "../lib/kyc-email";

export const kycSessionsRouter = new Hono<{
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

// POST /api/v1/kyc-sessions - Create a KYC session for a client
kycSessionsRouter.post("/", async (c) => {
	const organizationId = getOrganizationId(c);
	const user = getAuthUser(c);
	const prisma = getPrismaClient(c.env.DB);
	const service = new KycSessionService(prisma);

	const body = await c.req.json();
	const data = parseWithZod(kycSessionCreateSchema, body);

	const session = await service.create(
		organizationId,
		{ ...data, createdBy: user.id },
		prisma,
	);

	const orgSettings = await prisma.organizationSettings.findUnique({
		where: { organizationId },
		select: { selfServiceSendEmail: true },
	});

	if (orgSettings?.selfServiceSendEmail !== false) {
		const client = await prisma.client.findUnique({
			where: { id: data.clientId },
			select: {
				email: true,
				firstName: true,
				lastName: true,
				businessName: true,
			},
		});

		if (client?.email) {
			c.executionCtx.waitUntil(
				sendKYCInviteEmail(c.env, client.email, session, {
					clientName: client.firstName
						? `${client.firstName} ${client.lastName ?? ""}`.trim()
						: (client.businessName ?? "Cliente"),
					expiresAt: session.expiresAt,
				}).then(() => service.recordEmailSent(session.id)),
			);
		}
	}

	return c.json({ session }, 201);
});

// GET /api/v1/kyc-sessions - List sessions for the org
kycSessionsRouter.get("/", async (c) => {
	const organizationId = getOrganizationId(c);
	const prisma = getPrismaClient(c.env.DB);
	const service = new KycSessionService(prisma);

	const query = c.req.query();
	const filters = parseWithZod(kycSessionListFiltersSchema, query);

	const result = await service.list(organizationId, {
		clientId: filters.clientId,
		status: filters.status,
		page: filters.page,
		limit: filters.limit,
	});

	return c.json({
		data: result.data,
		pagination: {
			page: result.page,
			limit: result.limit,
			total: result.total,
			totalPages:
				result.total === 0 ? 0 : Math.ceil(result.total / result.limit),
		},
	});
});

// GET /api/v1/kyc-sessions/:id - Get a session by ID
kycSessionsRouter.get("/:id", async (c) => {
	const organizationId = getOrganizationId(c);
	const prisma = getPrismaClient(c.env.DB);
	const service = new KycSessionService(prisma);

	const session = await service.getById(c.req.param("id"), organizationId);
	return c.json({ session });
});

// GET /api/v1/kyc-sessions/:id/events - Get audit trail for a session
kycSessionsRouter.get("/:id/events", async (c) => {
	const organizationId = getOrganizationId(c);
	const prisma = getPrismaClient(c.env.DB);
	const service = new KycSessionService(prisma);

	const events = await service.getEvents(c.req.param("id"), organizationId);
	return c.json({ events });
});

// POST /api/v1/kyc-sessions/:id/resend-email - Resend KYC invite email
kycSessionsRouter.post("/:id/resend-email", async (c) => {
	const organizationId = getOrganizationId(c);
	const prisma = getPrismaClient(c.env.DB);
	const service = new KycSessionService(prisma);

	const session = await service.getById(c.req.param("id"), organizationId);

	if (
		session.status === "APPROVED" ||
		session.status === "REVOKED" ||
		session.status === "EXPIRED"
	) {
		throw new APIError(
			400,
			"SESSION_INACTIVE",
			`Cannot resend email for a session in ${session.status} status`,
		);
	}

	// Fetch client email for sending
	const client = await prisma.client.findUnique({
		where: { id: session.clientId },
		select: {
			email: true,
			firstName: true,
			lastName: true,
			businessName: true,
		},
	});

	if (!client?.email) {
		throw new APIError(
			400,
			"NO_EMAIL",
			"Client does not have an email address",
		);
	}

	// Send email non-blocking
	c.executionCtx.waitUntil(
		sendKYCInviteEmail(c.env, client.email, session, {
			clientName: client.firstName
				? `${client.firstName} ${client.lastName ?? ""}`.trim()
				: (client.businessName ?? "Cliente"),
		}).then(() => service.recordEmailSent(session.id)),
	);

	return c.json({ success: true, message: "Email queued for delivery" });
});

// POST /api/v1/kyc-sessions/:id/approve - Compliance officer approves the session
kycSessionsRouter.post("/:id/approve", async (c) => {
	const organizationId = getOrganizationId(c);
	const user = getAuthUser(c);
	const prisma = getPrismaClient(c.env.DB);
	const service = new KycSessionService(prisma);

	const session = await service.approve(
		c.req.param("id"),
		organizationId,
		user.id,
	);

	return c.json({ session });
});

// POST /api/v1/kyc-sessions/:id/reject - Compliance officer rejects the session
kycSessionsRouter.post("/:id/reject", async (c) => {
	const organizationId = getOrganizationId(c);
	const user = getAuthUser(c);
	const prisma = getPrismaClient(c.env.DB);
	const service = new KycSessionService(prisma);

	const body = await c.req.json();
	const data = parseWithZod(kycSessionRejectSchema, body);

	const session = await service.reject(
		c.req.param("id"),
		organizationId,
		user.id,
		data,
	);

	return c.json({ session });
});

// POST /api/v1/kyc-sessions/:id/revoke - Revoke a session
kycSessionsRouter.post("/:id/revoke", async (c) => {
	const organizationId = getOrganizationId(c);
	const user = getAuthUser(c);
	const prisma = getPrismaClient(c.env.DB);
	const service = new KycSessionService(prisma);

	const session = await service.revoke(
		c.req.param("id"),
		organizationId,
		user.id,
	);

	return c.json({ session });
});
