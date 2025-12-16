import type { Context } from "hono";
import type { StatusCode } from "hono/utils/http-status";

export class APIError extends Error {
	constructor(
		public statusCode: StatusCode,
		message: string,
		public details?: unknown,
	) {
		super(message);
		this.name = "APIError";
	}
}

export const errorHandler = (err: Error, c: Context) => {
	console.error("Error:", err);

	if (err instanceof APIError) {
		return c.json(
			{
				error: err.name,
				message: err.message,
				details: err.details,
			},
			err.statusCode as 200,
		);
	}

	// Default error response
	return c.json(
		{
			success: false,
			errors: [{ code: 7000, message: "Internal Server Error" }],
		},
		500,
	);
};
