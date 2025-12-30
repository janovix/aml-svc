import { Hono } from "hono";
import type { Context } from "hono";
import { ZodError } from "zod";

import {
	AddressIdParamSchema,
	ClientAddressCreateSchema,
	ClientAddressPatchSchema,
	ClientAddressUpdateSchema,
	ClientCreateSchema,
	ClientDocumentCreateSchema,
	ClientDocumentPatchSchema,
	ClientDocumentUpdateSchema,
	ClientFilterSchema,
	ClientIdParamSchema,
	ClientPatchSchema,
	ClientService,
	ClientUpdateSchema,
	DocumentIdParamSchema,
	ClientRepository,
} from "../domain/client";
import type { Bindings } from "../index";
import { createAlertQueueService } from "../lib/alert-queue";
import { getPrismaClient } from "../lib/prisma";
import { type AuthVariables, getOrganizationId } from "../middleware/auth";
import { APIError } from "../middleware/error";

export const clientsRouter = new Hono<{
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

function getService(
	c: Context<{ Bindings: Bindings; Variables: AuthVariables }>,
) {
	const prisma = getPrismaClient(c.env.DB);
	const repository = new ClientRepository(prisma);
	return new ClientService(repository);
}

function handleServiceError(error: unknown): never {
	if (error instanceof Error) {
		if (error.message === "CLIENT_NOT_FOUND") {
			throw new APIError(404, "Client not found");
		}
		if (error.message === "DOCUMENT_NOT_FOUND") {
			throw new APIError(404, "Document not found");
		}
		if (error.message === "ADDRESS_NOT_FOUND") {
			throw new APIError(404, "Address not found");
		}
	}
	throw error;
}

clientsRouter.get("/", async (c) => {
	const organizationId = getOrganizationId(c);
	const url = new URL(c.req.url);
	const queryObject = Object.fromEntries(url.searchParams.entries());
	const filters = parseWithZod(ClientFilterSchema, queryObject);

	const service = getService(c);
	const result = await service
		.list(organizationId, filters)
		.catch(handleServiceError);

	return c.json(result);
});

// IMPORTANT: /stats must be defined BEFORE /:id to avoid "stats" being matched as an id parameter
clientsRouter.get("/stats", async (c) => {
	const organizationId = getOrganizationId(c);
	const service = getService(c);
	const stats = await service
		.getStats(organizationId)
		.catch(handleServiceError);
	return c.json(stats);
});

clientsRouter.get("/:id", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(ClientIdParamSchema, c.req.param());

	const service = getService(c);
	const client = await service
		.get(organizationId, params.id)
		.catch(handleServiceError);

	return c.json(client);
});

clientsRouter.post("/", async (c) => {
	const organizationId = getOrganizationId(c);
	const body = await c.req.json();
	const payload = parseWithZod(ClientCreateSchema, body);

	const service = getService(c);
	const created = await service
		.create(organizationId, payload)
		.catch(handleServiceError);

	// Queue alert detection job for new client
	const alertQueue = createAlertQueueService(c.env.ALERT_DETECTION_QUEUE);
	await alertQueue.queueClientCreated(created.id);

	return c.json(created, 201);
});

clientsRouter.put("/:id", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(ClientIdParamSchema, c.req.param());
	const body = await c.req.json();
	const payload = parseWithZod(ClientUpdateSchema, body);

	const service = getService(c);
	const updated = await service
		.update(organizationId, params.id, payload)
		.catch(handleServiceError);

	// Queue alert detection job for updated client
	const alertQueue = createAlertQueueService(c.env.ALERT_DETECTION_QUEUE);
	await alertQueue.queueClientUpdated(updated.id);

	return c.json(updated);
});

clientsRouter.patch("/:id", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(ClientIdParamSchema, c.req.param());
	const body = await c.req.json();
	const payload = parseWithZod(ClientPatchSchema, body);

	if (Object.keys(payload).length === 0) {
		throw new APIError(400, "Payload is empty");
	}

	const service = getService(c);
	const updated = await service
		.patch(organizationId, params.id, payload)
		.catch(handleServiceError);

	// Queue alert detection job for updated client
	const alertQueue = createAlertQueueService(c.env.ALERT_DETECTION_QUEUE);
	await alertQueue.queueClientUpdated(updated.id);

	return c.json(updated);
});

clientsRouter.delete("/:id", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(ClientIdParamSchema, c.req.param());

	const service = getService(c);
	await service.delete(organizationId, params.id).catch(handleServiceError);

	return c.body(null, 204);
});

clientsRouter.get("/:id/documents", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(ClientIdParamSchema, c.req.param());
	const service = getService(c);
	const documents = await service
		.listDocuments(organizationId, params.id)
		.catch(handleServiceError);
	return c.json({ data: documents });
});

clientsRouter.post("/:id/documents", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(ClientIdParamSchema, c.req.param());
	const body = await c.req.json();
	const payload = parseWithZod(ClientDocumentCreateSchema, {
		...body,
		clientId: params.id,
	});
	const service = getService(c);
	const created = await service
		.createDocument(organizationId, payload)
		.catch(handleServiceError);
	return c.json(created, 201);
});

clientsRouter.put("/:clientId/documents/:documentId", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(DocumentIdParamSchema, c.req.param());
	const body = await c.req.json();
	const payload = parseWithZod(ClientDocumentUpdateSchema, body);
	const service = getService(c);
	const updated = await service
		.updateDocument(organizationId, params.clientId, params.documentId, payload)
		.catch(handleServiceError);
	return c.json(updated);
});

clientsRouter.patch("/:clientId/documents/:documentId", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(DocumentIdParamSchema, c.req.param());
	const body = await c.req.json();
	const payload = parseWithZod(ClientDocumentPatchSchema, body);
	const service = getService(c);
	const updated = await service
		.patchDocument(organizationId, params.clientId, params.documentId, payload)
		.catch(handleServiceError);
	return c.json(updated);
});

clientsRouter.delete("/:clientId/documents/:documentId", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(DocumentIdParamSchema, c.req.param());
	const service = getService(c);
	await service
		.deleteDocument(organizationId, params.clientId, params.documentId)
		.catch(handleServiceError);
	return c.body(null, 204);
});

clientsRouter.get("/:id/addresses", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(ClientIdParamSchema, c.req.param());
	const service = getService(c);
	const addresses = await service
		.listAddresses(organizationId, params.id)
		.catch(handleServiceError);
	return c.json({ data: addresses });
});

clientsRouter.post("/:id/addresses", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(ClientIdParamSchema, c.req.param());
	const body = await c.req.json();
	const payload = parseWithZod(ClientAddressCreateSchema, {
		...body,
		clientId: params.id,
	});
	const service = getService(c);
	const created = await service
		.createAddress(organizationId, payload)
		.catch(handleServiceError);
	return c.json(created, 201);
});

clientsRouter.put("/:clientId/addresses/:addressId", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(AddressIdParamSchema, c.req.param());
	const body = await c.req.json();
	const payload = parseWithZod(ClientAddressUpdateSchema, body);
	const service = getService(c);
	const updated = await service
		.updateAddress(organizationId, params.clientId, params.addressId, payload)
		.catch(handleServiceError);
	return c.json(updated);
});

clientsRouter.patch("/:clientId/addresses/:addressId", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(AddressIdParamSchema, c.req.param());
	const body = await c.req.json();
	const payload = parseWithZod(ClientAddressPatchSchema, body);
	const service = getService(c);
	const updated = await service
		.patchAddress(organizationId, params.clientId, params.addressId, payload)
		.catch(handleServiceError);
	return c.json(updated);
});

clientsRouter.delete("/:clientId/addresses/:addressId", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(AddressIdParamSchema, c.req.param());
	const service = getService(c);
	await service
		.deleteAddress(organizationId, params.clientId, params.addressId)
		.catch(handleServiceError);
	return c.body(null, 204);
});
