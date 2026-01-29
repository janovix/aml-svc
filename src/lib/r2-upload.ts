/**
 * R2 File Service
 * Unified file upload/download operations for Cloudflare R2 storage
 *
 * Consolidates R2 operations from:
 * - files.ts
 * - imports.ts
 * - reports.ts
 * - notices.ts
 */

import { generateId } from "./id-generator";

// R2Bucket type from Cloudflare Workers runtime
export type R2Bucket = {
	put(
		key: string,
		value: ReadableStream | ArrayBuffer | ArrayBufferView | string | null,
		options?: R2PutOptions,
	): Promise<R2Object>;
	get(key: string): Promise<R2ObjectBody | null>;
};

type R2PutOptions = {
	httpMetadata?: {
		contentType?: string;
		contentEncoding?: string;
		cacheControl?: string;
		cacheExpiry?: Date;
	};
	customMetadata?: Record<string, string>;
};

type R2Object = {
	key: string;
	size: number;
	etag: string;
};

type R2ObjectBody = R2Object & {
	body: ReadableStream;
	httpMetadata?: {
		contentType?: string;
	};
};

export interface R2UploadOptions {
	bucket: R2Bucket;
	key: string;
	content: string | ArrayBuffer | Uint8Array;
	contentType?: string;
	metadata?: Record<string, string>;
}

export interface R2UploadResult {
	key: string;
	size: number;
	etag: string;
}

/**
 * Uploads content to R2 bucket
 */
export async function uploadToR2(options: R2UploadOptions): Promise<R2UploadResult> {
	const { bucket, key, content, contentType, metadata } = options;

	// Convert string content to ArrayBuffer if needed
	let body: ArrayBuffer | Uint8Array;
	if (typeof content === "string") {
		body = new TextEncoder().encode(content);
	} else {
		body = content;
	}

	const object = await bucket.put(key, body, {
		httpMetadata: {
			contentType: contentType || "application/octet-stream",
		},
		customMetadata: metadata,
	});

	return {
		key,
		size: object.size,
		etag: object.etag,
	};
}

/**
 * Upload a file (from FormData) to R2
 */
export async function uploadFileToR2(
	bucket: R2Bucket,
	file: File,
	options: {
		category: string;
		organizationId: string;
		clientId?: string;
		documentId?: string;
		metadata?: Record<string, string>;
	},
): Promise<R2UploadResult & { key: string }> {
	const { category, organizationId, clientId, documentId, metadata } = options;

	// Generate unique file key
	const fileId = generateId("FILE");
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");

	// Build key: {category}/{organizationId}/{clientId?}/{documentId?}/{timestamp}-{fileId}-{filename}
	const keyParts = [category, organizationId];
	if (clientId) keyParts.push(clientId);
	if (documentId) keyParts.push(documentId);
	keyParts.push(`${timestamp}-${fileId}-${sanitizedFileName}`);
	const key = keyParts.join("/");

	const arrayBuffer = await file.arrayBuffer();

	const object = await bucket.put(key, arrayBuffer, {
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

	return {
		key,
		size: object.size,
		etag: object.etag,
	};
}

/**
 * Generate a file key with timestamp for a specific category
 */
export function generateFileKey(
	category: string,
	organizationId: string,
	filename: string,
): string {
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 8);
	return `${category}/${organizationId}/${timestamp}-${random}-${filename}`;
}

/**
 * Generate a file key for reports
 */
export function generateReportFileKey(
	organizationId: string,
	reportId: string,
	periodStart: string,
	periodEnd: string,
): string {
	return `reports/${organizationId}/${reportId}_${periodStart.substring(0, 10)}_${periodEnd.substring(0, 10)}.html`;
}

/**
 * Generate a file key for notices
 */
export function generateNoticeFileKey(
	organizationId: string,
	noticeId: string,
	reportedMonth: string,
): string {
	return `notices/${organizationId}/${noticeId}_${reportedMonth}.xml`;
}

/**
 * Generate a file key for imports
 */
export function generateImportFileKey(
	organizationId: string,
	filename: string,
): string {
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 8);
	return `imports/${organizationId}/${timestamp}-${random}-${filename}`;
}
