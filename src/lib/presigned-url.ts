/**
 * Presigned URL Generator
 * Creates temporary URLs with embedded tokens for secure file access
 */

/**
 * Generate a presigned URL for a file
 * @param fileKey - The R2 file key
 * @param organizationId - The organization ID (for validation)
 * @param secret - Secret key for signing (from env)
 * @param expiresInMinutes - How long the URL should be valid (default: 60 minutes)
 * @returns Presigned URL query parameters
 */
export async function generatePresignedToken(
	fileKey: string,
	organizationId: string,
	secret: string,
	expiresInMinutes = 60,
): Promise<{ token: string; expires: number }> {
	const expires = Math.floor(Date.now() / 1000) + expiresInMinutes * 60;

	// Create payload
	const payload = JSON.stringify({
		key: fileKey,
		org: organizationId,
		exp: expires,
	});

	// Sign the payload using HMAC-SHA256
	const encoder = new TextEncoder();
	const data = encoder.encode(payload);
	const keyData = encoder.encode(secret);

	const cryptoKey = await crypto.subtle.importKey(
		"raw",
		keyData,
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);

	const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);

	// Encode as base64url (URL-safe base64)
	const signatureArray = new Uint8Array(signature);
	const signatureBase64 = btoa(String.fromCharCode(...signatureArray))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=/g, "");

	// Combine payload and signature
	const payloadBase64 = btoa(payload)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=/g, "");

	const token = `${payloadBase64}.${signatureBase64}`;

	return { token, expires };
}

/**
 * Verify a presigned token
 * @param token - The token to verify
 * @param secret - Secret key for verification
 * @returns Decoded payload if valid, null if invalid
 */
export async function verifyPresignedToken(
	token: string,
	secret: string,
): Promise<{ key: string; org: string; exp: number } | null> {
	try {
		const [payloadBase64, signatureBase64] = token.split(".");

		if (!payloadBase64 || !signatureBase64) {
			return null;
		}

		// Decode payload
		const payload = atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"));
		const data = JSON.parse(payload);

		// Check expiration
		const now = Math.floor(Date.now() / 1000);
		if (data.exp < now) {
			return null;
		}

		// Verify signature
		const encoder = new TextEncoder();
		const payloadData = encoder.encode(payload);
		const keyData = encoder.encode(secret);

		const cryptoKey = await crypto.subtle.importKey(
			"raw",
			keyData,
			{ name: "HMAC", hash: "SHA-256" },
			false,
			["verify"],
		);

		// Decode signature
		const signatureBytes = Uint8Array.from(
			atob(signatureBase64.replace(/-/g, "+").replace(/_/g, "/"))
				.split("")
				.map((c) => c.charCodeAt(0)),
		);

		const isValid = await crypto.subtle.verify(
			"HMAC",
			cryptoKey,
			signatureBytes,
			payloadData,
		);

		if (!isValid) {
			return null;
		}

		return data;
	} catch (error) {
		console.error("Error verifying presigned token:", error);
		return null;
	}
}
