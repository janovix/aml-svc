import { Hono } from "hono";
import { z } from "zod";

import type { Bindings } from "../types";
import { getPrismaClient } from "../lib/prisma";
import {
	type AuthVariables,
	getAuthUser,
	getOrganizationId,
} from "../middleware/auth";
import { APIError } from "../middleware/error";

export const chatRouter = new Hono<{
	Bindings: Bindings;
	Variables: AuthVariables;
}>();

const createThreadSchema = z.object({
	title: z.string().max(200).optional(),
	model: z.string().max(120).optional(),
});

const appendMessageSchema = z.object({
	/** When provided, upserts this message id (aligns with client UIMessage ids). */
	id: z.string().uuid().optional(),
	role: z.enum(["user", "assistant", "system"]),
	parts: z.array(z.any()),
	model: z.string().max(120).optional(),
	metadata: z.record(z.string(), z.any()).optional(),
});

function newId(): string {
	return crypto.randomUUID();
}

/** POST /api/v1/chat/threads */
chatRouter.post("/threads", async (c) => {
	const orgId = getOrganizationId(c);
	const user = getAuthUser(c);
	const prisma = getPrismaClient(c.env.DB);
	const body = createThreadSchema.parse(await c.req.json().catch(() => ({})));

	const id = newId();
	await prisma.chatThread.create({
		data: {
			id,
			organizationId: orgId,
			userId: user.id,
			title: body.title ?? null,
			model: body.model ?? null,
		},
	});

	return c.json(
		{ id, title: body.title ?? null, model: body.model ?? null },
		201,
	);
});

/** GET /api/v1/chat/threads */
chatRouter.get("/threads", async (c) => {
	const orgId = getOrganizationId(c);
	const user = getAuthUser(c);
	const prisma = getPrismaClient(c.env.DB);

	const threads = await prisma.chatThread.findMany({
		where: {
			organizationId: orgId,
			userId: user.id,
			archivedAt: null,
		},
		orderBy: { updatedAt: "desc" },
		take: 50,
		select: {
			id: true,
			title: true,
			model: true,
			status: true,
			updatedAt: true,
			createdAt: true,
		},
	});

	return c.json({ threads });
});

/** GET /api/v1/chat/threads/:threadId */
chatRouter.get("/threads/:threadId", async (c) => {
	const orgId = getOrganizationId(c);
	const user = getAuthUser(c);
	const threadId = c.req.param("threadId");
	const prisma = getPrismaClient(c.env.DB);

	const thread = await prisma.chatThread.findFirst({
		where: {
			id: threadId,
			organizationId: orgId,
			userId: user.id,
		},
	});

	if (!thread) {
		throw new APIError(404, "Thread not found");
	}

	return c.json({ thread });
});

/** PATCH /api/v1/chat/threads/:threadId */
chatRouter.patch("/threads/:threadId", async (c) => {
	const orgId = getOrganizationId(c);
	const user = getAuthUser(c);
	const threadId = c.req.param("threadId");
	const prisma = getPrismaClient(c.env.DB);

	const patchSchema = z.object({
		title: z.string().max(200).optional(),
		archived: z.boolean().optional(),
		activeStreamId: z.string().max(200).nullable().optional(),
	});

	const body = patchSchema.parse(await c.req.json());

	const existing = await prisma.chatThread.findFirst({
		where: { id: threadId, organizationId: orgId, userId: user.id },
	});
	if (!existing) {
		throw new APIError(404, "Thread not found");
	}

	const thread = await prisma.chatThread.update({
		where: { id: threadId },
		data: {
			...(body.title !== undefined ? { title: body.title } : {}),
			...(body.archived === true ? { archivedAt: new Date() } : {}),
			...(body.activeStreamId !== undefined
				? { activeStreamId: body.activeStreamId }
				: {}),
		},
	});

	return c.json({ thread });
});

/** DELETE /api/v1/chat/threads/:threadId */
chatRouter.delete("/threads/:threadId", async (c) => {
	const orgId = getOrganizationId(c);
	const user = getAuthUser(c);
	const threadId = c.req.param("threadId");
	const prisma = getPrismaClient(c.env.DB);

	const existing = await prisma.chatThread.findFirst({
		where: { id: threadId, organizationId: orgId, userId: user.id },
	});
	if (!existing) {
		throw new APIError(404, "Thread not found");
	}

	await prisma.chatThread.delete({ where: { id: threadId } });
	return c.body(null, 204);
});

/** GET /api/v1/chat/threads/:threadId/messages */
chatRouter.get("/threads/:threadId/messages", async (c) => {
	const orgId = getOrganizationId(c);
	const user = getAuthUser(c);
	const threadId = c.req.param("threadId");
	const prisma = getPrismaClient(c.env.DB);

	const thread = await prisma.chatThread.findFirst({
		where: { id: threadId, organizationId: orgId, userId: user.id },
	});
	if (!thread) {
		throw new APIError(404, "Thread not found");
	}

	const rows = await prisma.chatMessage.findMany({
		where: { threadId },
		orderBy: { createdAt: "asc" },
	});

	const messages = rows.map((r) => ({
		id: r.id,
		role: r.role,
		parts: JSON.parse(r.partsJson) as unknown[],
		metadata: r.metadataJson ? JSON.parse(r.metadataJson) : undefined,
		createdAt: r.createdAt.toISOString(),
	}));

	return c.json({ messages });
});

/** POST /api/v1/chat/threads/:threadId/messages */
chatRouter.post("/threads/:threadId/messages", async (c) => {
	const orgId = getOrganizationId(c);
	const user = getAuthUser(c);
	const threadId = c.req.param("threadId");
	const prisma = getPrismaClient(c.env.DB);

	const thread = await prisma.chatThread.findFirst({
		where: { id: threadId, organizationId: orgId, userId: user.id },
	});
	if (!thread) {
		throw new APIError(404, "Thread not found");
	}

	const body = appendMessageSchema.parse(await c.req.json());
	const partsJson = JSON.stringify(body.parts);
	const metadataJson = body.metadata ? JSON.stringify(body.metadata) : null;
	const modelVal = body.model ?? null;

	let resolvedId: string;

	if (body.id) {
		resolvedId = body.id;
		const inThread = await prisma.chatMessage.findFirst({
			where: { id: body.id, threadId },
		});
		if (inThread) {
			await prisma.chatMessage.update({
				where: { id: body.id },
				data: { partsJson, model: modelVal, metadataJson },
			});
		} else {
			const elsewhere = await prisma.chatMessage.findFirst({
				where: { id: body.id },
			});
			if (elsewhere) {
				throw new APIError(409, "Message id already exists in another thread");
			}
			await prisma.chatMessage.create({
				data: {
					id: body.id,
					threadId,
					role: body.role,
					partsJson,
					model: modelVal,
					metadataJson,
				},
			});
		}
	} else {
		resolvedId = newId();
		await prisma.chatMessage.create({
			data: {
				id: resolvedId,
				threadId,
				role: body.role,
				partsJson,
				model: modelVal,
				metadataJson,
			},
		});
	}

	await prisma.chatThread.update({
		where: { id: threadId },
		data: { updatedAt: new Date() },
	});

	return c.json({ id: resolvedId, threadId }, 201);
});

const abuseEventSchema = z.object({
	kind: z.string().min(1).max(120),
	snippet: z.string().max(2000).optional(),
	threadId: z.string().uuid().optional(),
});

/** POST /api/v1/chat/abuse-events — record guardrail / abuse signal for monitoring */
chatRouter.post("/abuse-events", async (c) => {
	const orgId = getOrganizationId(c);
	const user = getAuthUser(c);
	const prisma = getPrismaClient(c.env.DB);
	const body = abuseEventSchema.parse(await c.req.json());

	if (body.threadId) {
		const thread = await prisma.chatThread.findFirst({
			where: { id: body.threadId, organizationId: orgId, userId: user.id },
		});
		if (!thread) {
			throw new APIError(404, "Thread not found");
		}
	}

	const id = newId();
	await prisma.chatAbuseEvent.create({
		data: {
			id,
			organizationId: orgId,
			userId: user.id,
			threadId: body.threadId ?? null,
			kind: body.kind,
			snippet: body.snippet ?? null,
		},
	});

	return c.json({ id }, 201);
});
