import { Hono } from "hono";
import type { Context } from "hono";
import type { Bindings } from "../index";
import { type AuthVariables, getOrganizationId } from "../middleware/auth";
import { APIError } from "../middleware/error";
import { generateId } from "../lib/id-generator";

export const filesRouter = new Hono<{
	Bindings: Bindings;
	Variables: AuthVariables;
}>();

/**
 * POST /files/upload
 * Upload a file to R2 storage
 */
filesRouter.post(
	"/upload",
	async (c: Context<{ Bindings: Bindings; Variables: AuthVariables }>) => {
		const organizationId = getOrganizationId(c);

		// Check if R2 bucket is configured
		if (!c.env.R2_BUCKET) {
			throw new APIError(503, "File storage not configured");
		}

		try {
			// Parse form data
			const formData = await c.req.formData();
			const file = formData.get("file");
			const clientId = formData.get("clientId");
			const documentId = formData.get("documentId");
			const category = formData.get("category") || "client-documents";
			const metadataStr = formData.get("metadata");

			// Validate file
			if (!file || !(file instanceof File)) {
				throw new APIError(400, "No file provided");
			}

			// Parse metadata
			let metadata: Record<string, string> = {};
			if (metadataStr && typeof metadataStr === "string") {
				try {
					metadata = JSON.parse(metadataStr);
				} catch {
					// Ignore invalid metadata
				}
			}

			// Generate unique file key
			const fileId = generateId("FILE");
			const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
			const extension = file.name.split(".").pop() || "bin";
			const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");

			// Build key: {category}/{organizationId}/{clientId}/{documentId}/{timestamp}-{fileId}.{ext}
			const keyParts = [category, organizationId];

			if (clientId && typeof clientId === "string") {
				keyParts.push(clientId);
			}

			if (documentId && typeof documentId === "string") {
				keyParts.push(documentId);
			}

			keyParts.push(`${timestamp}-${fileId}.${extension}`);
			const key = keyParts.join("/");

			// Get file content
			const arrayBuffer = await file.arrayBuffer();

			// Upload to R2
			const object = await c.env.R2_BUCKET.put(key, arrayBuffer, {
				httpMetadata: {
					contentType: file.type || "application/octet-stream",
				},
				customMetadata: {
					organizationId,
					originalFileName: sanitizedFileName,
					uploadedAt: new Date().toISOString(),
					...metadata,
				},
			});

			// Return upload result
			return c.json(
				{
					key,
					url: `r2://aml/${key}`, // Placeholder URL format
					size: object.size,
					etag: object.etag,
				},
				201,
			);
		} catch (error) {
			if (error instanceof APIError) {
				throw error;
			}
			console.error("Error uploading file:", error);
			throw new APIError(500, "Failed to upload file");
		}
	},
);

/**
 * GET /files/:key
 * Download a file from R2 storage
 */
filesRouter.get(
	"/*",
	async (c: Context<{ Bindings: Bindings; Variables: AuthVariables }>) => {
		const organizationId = getOrganizationId(c);

		// Check if R2 bucket is configured
		if (!c.env.R2_BUCKET) {
			throw new APIError(503, "File storage not configured");
		}

		try {
			// Get file key from path (everything after /files/)
			const key = c.req.path.replace("/api/v1/files/", "");

			if (!key) {
				throw new APIError(400, "File key is required");
			}

			// Verify the key belongs to this organization (security check)
			if (!key.includes(organizationId)) {
				throw new APIError(403, "Access denied");
			}

			// Get file from R2
			const object = await c.env.R2_BUCKET.get(key);

			if (!object) {
				throw new APIError(404, "File not found");
			}

			// Return file with appropriate headers
			return new Response(object.body, {
				headers: {
					"Content-Type":
						object.httpMetadata?.contentType || "application/octet-stream",
					"Content-Length": object.size.toString(),
					ETag: object.etag,
					"Cache-Control": "public, max-age=31536000", // Cache for 1 year
				},
			});
		} catch (error) {
			if (error instanceof APIError) {
				throw error;
			}
			console.error("Error downloading file:", error);
			throw new APIError(500, "Failed to download file");
		}
	},
);
