/**
 * Audit Trail Cryptographic Functions
 *
 * Implements industry-standard hash chaining for tamper-evident audit logs:
 * - SHA-256 for content hashing
 * - HMAC-SHA256 for entry signing
 * - Chain verification for integrity checking
 *
 * This follows the pattern used in financial compliance systems
 * and is similar to blockchain immutability guarantees.
 */

/**
 * Convert ArrayBuffer to hex string
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
	const byteArray = new Uint8Array(buffer);
	return Array.from(byteArray)
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

/**
 * Convert string to Uint8Array for crypto operations
 */
function stringToUint8Array(str: string): Uint8Array {
	const encoder = new TextEncoder();
	return encoder.encode(str);
}

/**
 * Compute SHA-256 hash of the given data
 *
 * @param data - String data to hash
 * @returns Hex-encoded SHA-256 hash
 */
export async function sha256(data: string): Promise<string> {
	const buffer = stringToUint8Array(data);
	const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
	return arrayBufferToHex(hashBuffer);
}

/**
 * Compute HMAC-SHA256 signature of the given data
 *
 * @param data - String data to sign
 * @param secretKey - Secret key for HMAC
 * @returns Hex-encoded HMAC-SHA256 signature
 */
export async function hmacSha256(
	data: string,
	secretKey: string,
): Promise<string> {
	const keyBuffer = stringToUint8Array(secretKey);
	const dataBuffer = stringToUint8Array(data);

	// Import the secret key
	const cryptoKey = await crypto.subtle.importKey(
		"raw",
		keyBuffer,
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);

	// Sign the data
	const signatureBuffer = await crypto.subtle.sign(
		"HMAC",
		cryptoKey,
		dataBuffer,
	);
	return arrayBufferToHex(signatureBuffer);
}

/**
 * Verify HMAC-SHA256 signature
 *
 * @param data - String data that was signed
 * @param signature - Hex-encoded signature to verify
 * @param secretKey - Secret key used for HMAC
 * @returns True if signature is valid
 */
export async function verifyHmacSha256(
	data: string,
	signature: string,
	secretKey: string,
): Promise<boolean> {
	const expectedSignature = await hmacSha256(data, secretKey);
	return expectedSignature === signature;
}

/**
 * Input data for computing an audit log entry's data hash
 */
export interface AuditDataHashInput {
	entityType: string;
	entityId: string;
	action: string;
	actorId: string | null;
	actorType: string;
	timestamp: string;
	oldData: string | null;
	newData: string | null;
	sequenceNumber: number;
	metadata: string | null;
}

/**
 * Compute the data hash for an audit log entry
 *
 * The hash includes all content fields to detect any tampering.
 * The order and format must be consistent to produce reproducible hashes.
 *
 * @param input - Audit log entry data
 * @returns Hex-encoded SHA-256 hash
 */
export async function computeDataHash(
	input: AuditDataHashInput,
): Promise<string> {
	// Create a canonical string representation of the data
	// Using JSON.stringify for consistent ordering and escaping
	const canonicalData = JSON.stringify({
		entityType: input.entityType,
		entityId: input.entityId,
		action: input.action,
		actorId: input.actorId,
		actorType: input.actorType,
		timestamp: input.timestamp,
		oldData: input.oldData,
		newData: input.newData,
		sequenceNumber: input.sequenceNumber,
		metadata: input.metadata,
	});

	return sha256(canonicalData);
}

/**
 * Compute the signature for an audit log entry
 *
 * The signature is HMAC-SHA256(dataHash + previousSignature, secretKey)
 * This creates the chain where each entry depends on the previous one.
 *
 * @param dataHash - SHA-256 hash of the entry's content
 * @param previousSignature - Signature of the previous entry (null for first)
 * @param secretKey - Secret key for HMAC signing
 * @returns Hex-encoded HMAC-SHA256 signature
 */
export async function computeSignature(
	dataHash: string,
	previousSignature: string | null,
	secretKey: string,
): Promise<string> {
	// Concatenate dataHash and previousSignature (or empty string if null)
	const signatureInput = `${dataHash}:${previousSignature ?? "GENESIS"}`;
	return hmacSha256(signatureInput, secretKey);
}

/**
 * Verify a single audit log entry's signature
 *
 * @param entry - The audit log entry to verify
 * @param previousSignature - Signature of the previous entry
 * @param secretKey - Secret key for HMAC verification
 * @returns True if the entry's signature is valid
 */
export async function verifyEntrySignature(
	entry: AuditDataHashInput & { dataHash: string; signature: string },
	previousSignature: string | null,
	secretKey: string,
): Promise<boolean> {
	// First, verify the data hash
	const computedDataHash = await computeDataHash(entry);
	if (computedDataHash !== entry.dataHash) {
		return false;
	}

	// Then, verify the signature
	const computedSignature = await computeSignature(
		entry.dataHash,
		previousSignature,
		secretKey,
	);
	return computedSignature === entry.signature;
}

/**
 * Result of chain verification
 */
export interface ChainVerificationResult {
	valid: boolean;
	entriesVerified: number;
	firstInvalidEntry?: {
		id: string;
		sequenceNumber: number;
		error: "DATA_HASH_MISMATCH" | "SIGNATURE_MISMATCH" | "CHAIN_BREAK";
	};
}

/**
 * Verify the integrity of an audit log chain
 *
 * @param entries - Array of audit log entries in sequence order
 * @param secretKey - Secret key for HMAC verification
 * @returns Verification result with details on any invalid entries
 */
export async function verifyChain(
	entries: Array<
		AuditDataHashInput & {
			id: string;
			dataHash: string;
			previousSignature: string | null;
			signature: string;
		}
	>,
	secretKey: string,
): Promise<ChainVerificationResult> {
	let previousSignature: string | null = null;
	let entriesVerified = 0;

	for (const entry of entries) {
		// Verify the data hash
		const computedDataHash = await computeDataHash(entry);
		if (computedDataHash !== entry.dataHash) {
			return {
				valid: false,
				entriesVerified,
				firstInvalidEntry: {
					id: entry.id,
					sequenceNumber: entry.sequenceNumber,
					error: "DATA_HASH_MISMATCH",
				},
			};
		}

		// Verify the chain linkage (previousSignature matches)
		if (entry.previousSignature !== previousSignature) {
			return {
				valid: false,
				entriesVerified,
				firstInvalidEntry: {
					id: entry.id,
					sequenceNumber: entry.sequenceNumber,
					error: "CHAIN_BREAK",
				},
			};
		}

		// Verify the signature
		const computedSignature = await computeSignature(
			entry.dataHash,
			previousSignature,
			secretKey,
		);
		if (computedSignature !== entry.signature) {
			return {
				valid: false,
				entriesVerified,
				firstInvalidEntry: {
					id: entry.id,
					sequenceNumber: entry.sequenceNumber,
					error: "SIGNATURE_MISMATCH",
				},
			};
		}

		previousSignature = entry.signature;
		entriesVerified++;
	}

	return {
		valid: true,
		entriesVerified,
	};
}

/**
 * Default secret key for development/testing
 * In production, this should be set via AUDIT_SECRET_KEY environment variable
 */
export const DEFAULT_AUDIT_SECRET_KEY =
	"aml-audit-trail-secret-key-change-in-production";
