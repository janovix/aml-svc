import { describe, expect, it } from "vitest";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { APIError } from "../middleware/error";
import {
	parseWithZod,
	handleServiceError,
	formatFullName,
	getClientDisplayName,
	NOT_FOUND_ERRORS,
} from "./route-helpers";

describe("parseWithZod", () => {
	it("returns parsed value on success", () => {
		const schema = z.object({ a: z.number() });
		expect(parseWithZod(schema, { a: 1 })).toEqual({ a: 1 });
	});

	it("throws APIError 400 with zod format on validation failure", () => {
		const schema = z.object({ a: z.number() });
		try {
			parseWithZod(schema, { a: "x" });
			expect.fail("expected throw");
		} catch (e) {
			expect(e).toBeInstanceOf(APIError);
			expect((e as APIError).statusCode).toBe(400);
			expect((e as APIError).message).toBe("Validation failed");
		}
	});

	it("rethrows non-Zod parse errors", () => {
		const schema = {
			parse: () => {
				throw new Error("not zod");
			},
		};
		expect(() => parseWithZod(schema, {})).toThrow("not zod");
	});
});

describe("handleServiceError", () => {
	it("maps Prisma P2002 with rfc to DUPLICATE_RFC", () => {
		const err = new Prisma.PrismaClientKnownRequestError("Unique", {
			code: "P2002",
			clientVersion: "test",
			meta: { target: ["organization_id", "rfc"] },
		});
		expect(() => handleServiceError(err)).toThrow(APIError);
		try {
			handleServiceError(err);
		} catch (e) {
			expect((e as APIError).statusCode).toBe(409);
			expect((e as APIError).details).toMatchObject({ code: "DUPLICATE_RFC" });
		}
	});

	it("maps CLIENT not found message to 404", () => {
		expect(() =>
			handleServiceError(new Error(NOT_FOUND_ERRORS.CLIENT)),
		).toThrow(APIError);
		try {
			handleServiceError(new Error(NOT_FOUND_ERRORS.CLIENT));
		} catch (e) {
			expect((e as APIError).statusCode).toBe(404);
		}
	});

	it("maps SQLite UNIQUE constraint on rfc", () => {
		expect(() =>
			handleServiceError(new Error("UNIQUE constraint failed: client.rfc")),
		).toThrow(APIError);
	});

	it("maps generic Prisma P2002 to DUPLICATE_VALUE", () => {
		const err = new Prisma.PrismaClientKnownRequestError("Unique", {
			code: "P2002",
			clientVersion: "test",
			meta: { target: ["email"] },
		});
		expect(() => handleServiceError(err)).toThrow(APIError);
		try {
			handleServiceError(err);
		} catch (e) {
			expect((e as APIError).details).toMatchObject({
				code: "DUPLICATE_VALUE",
			});
		}
	});

	it("maps Unique constraint failed message without rfc field", () => {
		expect(() =>
			handleServiceError(new Error("Unique constraint failed on idx_email")),
		).toThrow(APIError);
		try {
			handleServiceError(new Error("Unique constraint failed on idx_email"));
		} catch (e) {
			expect((e as APIError).statusCode).toBe(409);
			expect((e as APIError).details).toMatchObject({
				code: "DUPLICATE_VALUE",
			});
		}
	});

	it("maps DOCUMENT, ADDRESS, and TRANSACTION not-found messages", () => {
		expect(() =>
			handleServiceError(new Error(NOT_FOUND_ERRORS.DOCUMENT)),
		).toThrow(APIError);
		expect(() =>
			handleServiceError(new Error(NOT_FOUND_ERRORS.ADDRESS)),
		).toThrow(APIError);
		expect(() =>
			handleServiceError(new Error(NOT_FOUND_ERRORS.TRANSACTION)),
		).toThrow(APIError);
	});

	it("rethrows unknown errors", () => {
		expect(() => handleServiceError(new Error("other"))).toThrow("other");
	});
});

describe("formatFullName", () => {
	it("joins parts and trims", () => {
		expect(formatFullName("Ana", "López", "García")).toBe("Ana López García");
		expect(formatFullName("Ana", "López", null)).toBe("Ana López");
	});
});

describe("getClientDisplayName", () => {
	it("formats physical person", () => {
		expect(
			getClientDisplayName({
				personType: "physical",
				firstName: "Juan",
				lastName: "Pérez",
				secondLastName: "Ruiz",
			}),
		).toBe("Juan Pérez Ruiz");
	});

	it("returns business name for moral", () => {
		expect(
			getClientDisplayName({
				personType: "moral",
				businessName: "ACME SA",
			}),
		).toBe("ACME SA");
	});
});
