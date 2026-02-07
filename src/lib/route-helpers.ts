/**
 * Shared route helper functions
 *
 * This file consolidates common route utilities that were previously
 * duplicated across multiple route files:
 * - clients.ts
 * - transactions.ts
 * - ubos.ts
 * - imports.ts
 */

import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { APIError } from "../middleware/error";

/**
 * Parse and validate input with a Zod schema, throwing APIError on failure
 * Uses a looser type to accommodate Zod's complex schema types
 */
export function parseWithZod<T>(
	schema: { parse: (input: unknown) => T },
	payload: unknown,
): T {
	try {
		return schema.parse(payload);
	} catch (error) {
		if (error instanceof ZodError) {
			throw new APIError(400, "Validation failed", error.format());
		}
		throw error;
	}
}

/**
 * Common error messages for domain entities
 */
export const NOT_FOUND_ERRORS = {
	CLIENT: "CLIENT_NOT_FOUND",
	DOCUMENT: "DOCUMENT_NOT_FOUND",
	ADDRESS: "ADDRESS_NOT_FOUND",
	UBO: "UBO_NOT_FOUND",
	TRANSACTION: "TRANSACTION_NOT_FOUND",
} as const;

/**
 * Handle common service errors and convert them to appropriate APIErrors
 */
export function handleServiceError(error: unknown): never {
	// Handle Prisma unique constraint violations
	if (error instanceof Prisma.PrismaClientKnownRequestError) {
		if (error.code === "P2002") {
			const target = error.meta?.target;
			// Check if it's the RFC unique constraint
			if (
				Array.isArray(target) &&
				target.includes("organization_id") &&
				target.includes("rfc")
			) {
				throw new APIError(
					409,
					"Ya existe un cliente con este RFC en la organización",
					{
						code: "DUPLICATE_RFC",
						field: "rfc",
					},
				);
			}
			// Generic unique constraint message
			throw new APIError(409, "A record with this value already exists", {
				code: "DUPLICATE_VALUE",
				target,
			});
		}
	}

	if (error instanceof Error) {
		// Handle UNIQUE constraint failed from D1/SQLite
		if (
			error.message.includes("UNIQUE constraint failed") ||
			error.message.includes("Unique constraint failed")
		) {
			if (error.message.includes("rfc")) {
				throw new APIError(
					409,
					"Ya existe un cliente con este RFC en la organización",
					{
						code: "DUPLICATE_RFC",
						field: "rfc",
					},
				);
			}
			throw new APIError(409, "A record with this value already exists", {
				code: "DUPLICATE_VALUE",
			});
		}

		// Handle common not found errors
		switch (error.message) {
			case NOT_FOUND_ERRORS.CLIENT:
				throw new APIError(404, "Client not found");
			case NOT_FOUND_ERRORS.DOCUMENT:
				throw new APIError(404, "Document not found");
			case NOT_FOUND_ERRORS.ADDRESS:
				throw new APIError(404, "Address not found");
			case NOT_FOUND_ERRORS.UBO:
				throw new APIError(404, "UBO not found");
			case NOT_FOUND_ERRORS.TRANSACTION:
				throw new APIError(404, "Transaction not found");
		}
	}

	throw error;
}

/**
 * Format a full name from first name, last name, and optional second last name
 */
export function formatFullName(
	firstName: string,
	lastName: string,
	secondLastName?: string | null,
): string {
	return `${firstName} ${lastName} ${secondLastName || ""}`.trim();
}

/**
 * Get the display name for a client based on person type
 */
export function getClientDisplayName(client: {
	personType: string;
	firstName?: string | null;
	lastName?: string | null;
	secondLastName?: string | null;
	businessName?: string | null;
}): string {
	if (client.personType === "physical") {
		return formatFullName(
			client.firstName || "",
			client.lastName || "",
			client.secondLastName,
		);
	}
	return client.businessName || "";
}
