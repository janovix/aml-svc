/**
 * R2 Upload Service
 * Handles file uploads to Cloudflare R2 storage
 */

// R2Bucket type from Cloudflare Workers runtime
type R2Bucket = {
	put(
		key: string,
		value: ReadableStream | ArrayBuffer | ArrayBufferView | string | null,
		options?: R2PutOptions,
	): Promise<R2Object>;
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

export interface R2UploadOptions {
	bucket: R2Bucket;
	key: string; // Object key (path) in R2
	content: string | ArrayBuffer | Uint8Array;
	contentType?: string;
	metadata?: Record<string, string>;
}

export interface R2UploadResult {
	key: string;
	url: string; // Public URL or presigned URL
	size: number;
	etag: string;
}

/**
 * Uploads content to R2 bucket
 */
export async function uploadToR2(
	options: R2UploadOptions,
): Promise<R2UploadResult> {
	const { bucket, key, content, contentType, metadata } = options;

	// Convert string content to ArrayBuffer if needed
	let body: ArrayBuffer | Uint8Array;
	if (typeof content === "string") {
		body = new TextEncoder().encode(content);
	} else {
		body = content;
	}

	// Upload to R2
	const object = await bucket.put(key, body, {
		httpMetadata: {
			contentType: contentType || "application/xml",
		},
		customMetadata: metadata,
	});

	// Generate public URL (assuming public bucket or custom domain)
	// In production, you might want to use a custom domain or presigned URLs
	// Note: R2 buckets don't have a public URL by default - you'll need to configure
	// a custom domain or use presigned URLs. For now, return a placeholder.
	const url = `r2://sat-xml-files/${key}`;

	return {
		key,
		url,
		size: object.size,
		etag: object.etag,
	};
}

/**
 * Generates a unique key for alert XML files
 * Format: alerts/{alertId}/{timestamp}-{alertId}.xml
 */
export function generateAlertFileKey(alertId: string): string {
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	return `alerts/${alertId}/${timestamp}-${alertId}.xml`;
}
