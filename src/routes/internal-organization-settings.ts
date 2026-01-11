/**
 * Internal organization settings routes for service binding access
 * These endpoints are used by auth-svc via Cloudflare service bindings
 */
import { getPrismaClient } from "../lib/prisma";
import {
	OrganizationSettingsRepository,
	OrganizationSettingsService,
	organizationSettingsCreateSchema,
	organizationSettingsUpdateSchema,
} from "../domain/organization-settings";
import type { Bindings } from "../index";

/**
 * Handle internal organization settings requests from service bindings
 *
 * Routes:
 * - GET /organization-settings/:organizationId - Get org settings
 * - PUT /organization-settings/:organizationId - Create or update org settings
 * - PATCH /organization-settings/:organizationId - Partial update
 */
export async function handleInternalOrganizationSettingsRequest(
	request: Request,
	env: Bindings,
	organizationId: string,
): Promise<Response> {
	const prisma = getPrismaClient(env.DB);
	const repository = new OrganizationSettingsRepository(prisma);
	const service = new OrganizationSettingsService(repository);

	try {
		// GET - Fetch organization settings
		if (request.method === "GET") {
			console.log(
				`[InternalOrgSettings] GET organization settings for ${organizationId}`,
			);
			const settings = await service.getByOrganizationId(organizationId);

			if (!settings) {
				return new Response(
					JSON.stringify({
						success: false,
						error: "Not Found",
						message: "Organization settings not found for this organization",
					}),
					{
						status: 404,
						headers: { "Content-Type": "application/json" },
					},
				);
			}

			return new Response(
				JSON.stringify({
					success: true,
					data: settings,
				}),
				{
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		// PUT - Create or update organization settings
		if (request.method === "PUT") {
			console.log(
				`[InternalOrgSettings] PUT organization settings for ${organizationId}`,
			);
			const body = await request.json();
			const parseResult = organizationSettingsCreateSchema.safeParse(body);

			if (!parseResult.success) {
				return new Response(
					JSON.stringify({
						success: false,
						error: "Validation Error",
						details: parseResult.error.format(),
					}),
					{
						status: 400,
						headers: { "Content-Type": "application/json" },
					},
				);
			}

			const settings = await service.createOrUpdate(
				organizationId,
				parseResult.data,
			);

			return new Response(
				JSON.stringify({
					success: true,
					data: settings,
				}),
				{
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		// PATCH - Partial update organization settings
		if (request.method === "PATCH") {
			console.log(
				`[InternalOrgSettings] PATCH organization settings for ${organizationId}`,
			);

			// Check if settings exist first
			const existing = await service.getByOrganizationId(organizationId);
			if (!existing) {
				return new Response(
					JSON.stringify({
						success: false,
						error: "Not Found",
						message: "Organization settings not found for this organization",
					}),
					{
						status: 404,
						headers: { "Content-Type": "application/json" },
					},
				);
			}

			const body = await request.json();
			const parseResult = organizationSettingsUpdateSchema.safeParse(body);

			if (!parseResult.success) {
				return new Response(
					JSON.stringify({
						success: false,
						error: "Validation Error",
						details: parseResult.error.format(),
					}),
					{
						status: 400,
						headers: { "Content-Type": "application/json" },
					},
				);
			}

			// Check if payload is empty
			if (Object.keys(parseResult.data).length === 0) {
				return new Response(
					JSON.stringify({
						success: false,
						error: "Validation Error",
						message: "Payload is empty",
					}),
					{
						status: 400,
						headers: { "Content-Type": "application/json" },
					},
				);
			}

			const settings = await service.update(organizationId, parseResult.data);

			return new Response(
				JSON.stringify({
					success: true,
					data: settings,
				}),
				{
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		// Method not allowed
		return new Response(
			JSON.stringify({
				success: false,
				error: "Method Not Allowed",
				message: `Method ${request.method} is not allowed for this endpoint`,
			}),
			{
				status: 405,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("[InternalOrgSettings] Error processing request:", error);
		return new Response(
			JSON.stringify({
				success: false,
				error: "Internal Server Error",
				message: error instanceof Error ? error.message : "Unknown error",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
}
