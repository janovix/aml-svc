/**
 * Hash utilities for generating idempotency keys and context hashes
 */

/**
 * Generates a SHA-256 hash of the input string
 */
export async function hash(input: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(input);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generates a context hash from alert-specific data
 */
export async function generateContextHash(
	data: Record<string, unknown>,
): Promise<string> {
	const sortedData = JSON.stringify(data, Object.keys(data).sort());
	return hash(sortedData);
}

/**
 * Generates an idempotency key for alert creation
 */
export async function generateIdempotencyKey(
	clientId: string,
	alertRuleId: string,
	contextHash: string,
): Promise<string> {
	const key = `${clientId}:${alertRuleId}:${contextHash}`;
	return hash(key);
}
