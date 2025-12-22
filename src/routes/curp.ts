import { Hono } from "hono";
import { z, ZodError } from "zod";

import type { Bindings } from "../index";
import { APIError } from "../middleware/error";

export const curpRouter = new Hono<{ Bindings: Bindings }>();

const GetCurpDataBodySchema = z.object({
	curp: z
		.string()
		.trim()
		.min(1)
		.max(18)
		.regex(/^[A-Z0-9]+$/i, "Invalid CURP format")
		.transform((v) => v.toUpperCase()),
	/**
	 * reCAPTCHA Enterprise token (action: "CONSULTA") obtained legitimately
	 * by a client interacting with the gob.mx CURP site.
	 */
	recaptchaToken: z.string().trim().min(1),
});

type RenapoConsultaResponse = {
	codigo?: string;
	mensaje?: string;
	registros?: Array<{
		curp: string;
		nombres: string;
		primerApellido: string;
		segundoApellido: string;
		sexo: string;
		fechaNacimiento: string;
		nacionalidad: string;
		entidad: string;
		docProbatorio: number;
		statusCurp?: string;
		parametro: string;
		datosDocProbatorio?: {
			anioReg?: string;
			numActa?: string;
			entidadReg?: string;
			municipioReg?: string;
			foja?: string;
			tomo?: string;
			libro?: string;
		};
	}>;
};

const RENAPO_CONSULTA_URL = "https://www.gob.mx/v1/renapoCURP/consulta";
const CURP_PDF_BASE_URL = "https://consultas.curp.gob.mx/CurpSP/pdfgobmx";

export async function getCurpData(params: {
	curp: string;
	recaptchaToken: string;
	env: Bindings;
	requestUrl: string;
}): Promise<{
	data: NonNullable<NonNullable<RenapoConsultaResponse["registros"]>[0]>;
	pdf: { key: string; url: string };
}> {
	if (!params.env.R2_BUCKET) {
		throw new APIError(500, "R2_BUCKET not configured");
	}

	// Call RENAPO JSON endpoint (requires reCAPTCHA token from client).
	const consultaRes = await fetch(RENAPO_CONSULTA_URL, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			accept: "application/json",
		},
		body: JSON.stringify({
			curp: params.curp,
			tipoBusqueda: "curp",
			ip: "127.0.0.1",
			token: params.recaptchaToken,
		}),
	});

	if (!consultaRes.ok) {
		const text = await consultaRes.text().catch(() => "");
		throw new APIError(502, "RENAPO consulta failed", {
			status: consultaRes.status,
			body: text.slice(0, 1000),
		});
	}

	const consultaJson = (await consultaRes.json()) as RenapoConsultaResponse;
	if (!consultaJson.registros?.length) {
		throw new APIError(404, "CURP not found", {
			codigo: consultaJson.codigo,
			mensaje: consultaJson.mensaje,
		});
	}

	const record = consultaJson.registros[0];
	const key = buildPdfKey(params.curp, record.parametro);

	// Idempotent R2 write: skip download if already present.
	const existing = await params.env.R2_BUCKET.head(key);
	if (!existing) {
		const pdfRes = await fetch(`${CURP_PDF_BASE_URL}${record.parametro}`, {
			method: "GET",
			// This endpoint returns base64 text.
			headers: { accept: "text/plain,*/*" },
		});

		if (!pdfRes.ok) {
			const text = await pdfRes.text().catch(() => "");
			throw new APIError(502, "RENAPO PDF fetch failed", {
				status: pdfRes.status,
				body: text.slice(0, 1000),
			});
		}

		const base64 = await pdfRes.text();
		const pdfBytes = arrayBufferFromBase64(base64);

		await params.env.R2_BUCKET.put(key, pdfBytes, {
			httpMetadata: { contentType: "application/pdf" },
			customMetadata: {
				curp: params.curp,
				parametro: record.parametro,
				source: "gob.mx/curp",
				storedAt: new Date().toISOString(),
			},
		});
	}

	const pdfUrl = buildPublicPdfUrl(params.requestUrl, key);

	return {
		data: record,
		pdf: { key, url: pdfUrl },
	};
}

function parseWithZod<T>(
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

function arrayBufferFromBase64(base64: string): ArrayBuffer {
	// gob.mx returns raw base64; sometimes with whitespace/newlines.
	const clean = base64.trim();
	const binary = atob(clean);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes.buffer;
}

function buildPdfKey(curp: string, parametro: string): string {
	// parametro is the RENAPO-generated identifier used to fetch the PDF.
	// Using it in the key prevents duplicates and allows idempotent caching.
	const safeCurp = curp.replace(/[^A-Z0-9]/g, "");
	const safeParametro = parametro.replace(/[^A-Za-z0-9._-]/g, "");
	return `curp/${safeCurp}/${safeParametro}.pdf`;
}

function buildPublicPdfUrl(reqUrl: string, key: string): string {
	const url = new URL(reqUrl);
	// If key has slashes, we must URL-encode it.
	return `${url.origin}/api/v1/curp/pdf/${encodeURIComponent(key)}`;
}

/**
 * POST /api/v1/curp
 * Body: { curp, recaptchaToken }
 *
 * Fetches RENAPO CURP data + PDF, stores PDF in R2 idempotently, returns data + PDF URL.
 */
curpRouter.post("/", async (c) => {
	const body = await c.req.json();
	const payload = parseWithZod(GetCurpDataBodySchema, body);
	const result = await getCurpData({
		curp: payload.curp,
		recaptchaToken: payload.recaptchaToken,
		env: c.env,
		requestUrl: c.req.url,
	});

	return c.json(result);
});

/**
 * GET /api/v1/curp/pdf/:key
 * Streams the PDF back from R2. This provides a stable, fetchable URL.
 */
curpRouter.get("/pdf/:key", async (c) => {
	if (!c.env.R2_BUCKET) {
		throw new APIError(500, "R2_BUCKET not configured");
	}
	const key = decodeURIComponent(c.req.param("key"));
	const obj = await c.env.R2_BUCKET.get(key);
	if (!obj) {
		throw new APIError(404, "PDF not found");
	}

	return new Response(obj.body, {
		status: 200,
		headers: {
			"content-type": "application/pdf",
			"cache-control": "public, max-age=31536000, immutable",
			// Optional: preserve etag for caching
			etag: obj.etag,
		},
	});
});
