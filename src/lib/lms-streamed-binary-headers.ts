/**
 * Shared headers for streamed LMS binary responses (training images/PDF bytes).
 * Reduces ORB issues on accidental cross-origin loads and strengthens MIME handling.
 */
export function lmsStreamedBinaryHeaders(init: {
	contentType: string;
	cacheControl?: string;
	xTotalCount?: number;
	contentDisposition?: string;
}): Record<string, string> {
	const headers: Record<string, string> = {
		"Content-Type": init.contentType,
		"Cross-Origin-Resource-Policy": "same-site",
		"X-Content-Type-Options": "nosniff",
		"Cache-Control": init.cacheControl ?? "private, max-age=3600",
	};

	if (init.xTotalCount !== undefined) {
		headers["X-Total-Count"] = String(init.xTotalCount);
	}

	if (init.contentDisposition) {
		headers["Content-Disposition"] = init.contentDisposition;
	}

	return headers;
}
