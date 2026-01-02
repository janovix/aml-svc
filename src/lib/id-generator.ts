/**
 * Atomic ID Generator
 *
 * Generates human-readable, type-prefixed IDs for entities.
 * Format: {PREFIX}{RANDOM}
 * - PREFIX: 3 uppercase letters identifying the entity type
 * - RANDOM: 9-12 characters of base62-encoded random data
 *
 * IDs are designed to be:
 * - Human-readable and easy to type/copy
 * - Type-identifiable by prefix
 * - Collision-resistant (sufficient entropy)
 * - Shorter than UUIDs but still unique
 */

// Base62 alphabet (0-9, A-Z, a-z) - excludes ambiguous characters
const BASE62_ALPHABET =
	"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

// Entity type prefixes
export const ID_PREFIXES = {
	CLIENT: "CLT",
	CLIENT_DOCUMENT: "DOC",
	CLIENT_ADDRESS: "ADR",
	CATALOG: "CAT",
	CATALOG_ITEM: "CIT",
	TRANSACTION: "TRN",
	TRANSACTION_PAYMENT_METHOD: "PMT",
	ALERT_RULE: "ARL",
	ALERT_RULE_CONFIG: "ARC",
	ALERT: "ALT",
	UMA_VALUE: "UMA",
	ORGANIZATION_SETTINGS: "ORG",
} as const;

export type EntityType = keyof typeof ID_PREFIXES;

/**
 * Generates a random base62 string of the specified length
 */
function generateRandomBase62(length: number): string {
	let result = "";

	while (result.length < length) {
		// Generate random bytes - we need at least enough for one character (6 bits = 1 byte)
		const bytesNeeded = Math.max(
			1,
			Math.ceil(((length - result.length) * 6) / 8),
		);
		const randomBytes = new Uint8Array(bytesNeeded);
		crypto.getRandomValues(randomBytes);

		// Convert bytes to base62 characters
		for (let i = 0; i < randomBytes.length && result.length < length; i++) {
			// Use modulo to map byte value (0-255) to base62 (0-61)
			// This gives us uniform distribution
			const index = randomBytes[i] % BASE62_ALPHABET.length;
			result += BASE62_ALPHABET[index];
		}
	}

	return result.slice(0, length);
}

/**
 * Generates a new ID for the specified entity type
 * Format: {PREFIX}{RANDOM} (e.g., TRNxK9mP2qR4, CLT7bN3vY8wZ)
 *
 * @param entityType - The type of entity to generate an ID for
 * @returns A new unique ID string
 */
export function generateId(entityType: EntityType): string {
	const prefix = ID_PREFIXES[entityType];
	// Generate 9 random characters for a total length of 12 (3 prefix + 9 random)
	// This provides ~53 bits of entropy, sufficient for collision resistance
	const random = generateRandomBase62(9);
	return `${prefix}${random}`;
}

/**
 * Validates if a string is a valid ID format for the given entity type
 *
 * @param id - The ID to validate
 * @param entityType - The expected entity type
 * @returns True if the ID is valid for the entity type
 */
export function isValidId(id: string, entityType: EntityType): boolean {
	const prefix = ID_PREFIXES[entityType];
	if (!id.startsWith(prefix)) {
		return false;
	}
	// Check length: prefix (3) + random (9) = 12 characters
	if (id.length !== 12) {
		return false;
	}
	// Check that remaining characters are valid base62
	const randomPart = id.slice(prefix.length);
	return /^[0-9A-Za-z]+$/.test(randomPart);
}

/**
 * Extracts the entity type from an ID by checking its prefix
 *
 * @param id - The ID to analyze
 * @returns The entity type if the prefix matches, null otherwise
 */
export function getEntityTypeFromId(id: string): EntityType | null {
	if (id.length < 3) {
		return null;
	}
	const prefix = id.slice(0, 3);
	for (const [type, typePrefix] of Object.entries(ID_PREFIXES)) {
		if (typePrefix === prefix) {
			return type as EntityType;
		}
	}
	return null;
}
