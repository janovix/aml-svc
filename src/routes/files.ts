import { Hono } from "hono";
import type { Context } from "hono";
import type { Bindings } from "../index";
import { type AuthVariables, getOrganizationId } from "../middleware/auth";
import { APIError } from "../middleware/error";
import { generateId } from "../lib/id-generator";
import {
	generatePresignedToken,
	verifyPresignedToken,
} from "../lib/presigned-url";

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

			keyParts.push(`${timestamp}-${fileId}-${sanitizedFileName}`);
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

			// Build public URL to access the file via this service
			// The URL will be: https://{worker-url}/api/v1/files/{key}
			const requestUrl = new URL(c.req.url);
			// Always use https to avoid mixed content issues
			const baseUrl = `https://${requestUrl.host}`;
			const publicUrl = `${baseUrl}/api/v1/files/${key}`;

			// Generate presigned URL (valid for 60 minutes)
			const { token, expires } = await generatePresignedToken(
				key,
				organizationId,
				c.env.PRESIGNED_URL_SECRET,
				60,
			);
			const presignedUrl = `${baseUrl}/api/v1/files/${key}?token=${token}`;

			// Return upload result
			return c.json(
				{
					key,
					url: publicUrl, // Keep for backward compatibility
					presignedUrl, // New: URL with embedded token
					expiresAt: new Date(expires * 1000).toISOString(),
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
 * POST /files/presign
 * Generate a presigned URL for an existing file
 */
filesRouter.post(
	"/presign",
	async (c: Context<{ Bindings: Bindings; Variables: AuthVariables }>) => {
		const organizationId = getOrganizationId(c);

		try {
			const body = await c.req.json();
			const { url, expiresInMinutes = 60 } = body;

			if (!url || typeof url !== "string") {
				throw new APIError(400, "File URL is required");
			}

			// Extract key from URL
			// URL format: https://{host}/api/v1/files/{key}
			const urlObj = new URL(url);
			const key = urlObj.pathname.replace("/api/v1/files/", "");

			if (!key) {
				throw new APIError(400, "Invalid file URL");
			}

			// Verify the key belongs to this organization
			const parts = key.split("/");
			if (parts.length < 2 || parts[1] !== organizationId) {
				throw new APIError(403, "Access denied");
			}

			// Generate presigned token
			const { token, expires } = await generatePresignedToken(
				key,
				organizationId,
				c.env.PRESIGNED_URL_SECRET,
				expiresInMinutes,
			);

			// Build presigned URL
			const baseUrl = `https://${urlObj.host}`;
			const presignedUrl = `${baseUrl}/api/v1/files/${key}?token=${token}`;

			return c.json({
				presignedUrl,
				expiresAt: new Date(expires * 1000).toISOString(),
				expiresInMinutes,
			});
		} catch (error) {
			if (error instanceof APIError) {
				throw error;
			}
			console.error("Error generating presigned URL:", error);
			throw new APIError(500, "Failed to generate presigned URL");
		}
	},
);

/**
 * OPTIONS /files/:key
 * Handle CORS preflight requests
 */
filesRouter.options("/*", async () => {
	return new Response(null, {
		status: 204,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
			"Access-Control-Max-Age": "86400", // 24 hours
		},
	});
});

/**
 * GET /files/:key
 * Download a file from R2 storage
 * Supports both authenticated requests (JWT) and presigned URLs (token query param)
 */
filesRouter.get(
	"/*",
	async (c: Context<{ Bindings: Bindings; Variables: AuthVariables }>) => {
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

			// Check for presigned token in query params
			const token = c.req.query("token");
			let organizationId: string;

			if (token) {
				// Verify presigned token
				const payload = await verifyPresignedToken(
					token,
					c.env.PRESIGNED_URL_SECRET,
				);

				if (!payload) {
					throw new APIError(401, "Invalid or expired token");
				}

				// Verify the token is for this file
				if (payload.key !== key) {
					throw new APIError(403, "Token not valid for this file");
				}

				organizationId = payload.org;
			} else {
				// Fall back to JWT authentication
				organizationId = getOrganizationId(c);
			}

			// Verify the key belongs to this organization (security check)
			// Expected key structure: {category}/{organizationId}/{...}
			const parts = key.split("/");
			if (parts.length < 2 || parts[1] !== organizationId) {
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
					"Cache-Control": "public, max-age=3600", // Cache for 1 hour (presigned URLs expire)
					// CORS headers for cross-origin access
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "GET, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type, Authorization",
					// ORB (Opaque Response Blocking) bypass
					"Cross-Origin-Resource-Policy": "cross-origin",
					"Cross-Origin-Embedder-Policy": "unsafe-none",
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
