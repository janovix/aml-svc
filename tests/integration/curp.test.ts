import { SELF } from "cloudflare:test";
import { describe, expect, it, vi } from "vitest";

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});
}

describe("CURP endpoint", () => {
	it("returns 400 when payload is invalid", async () => {
		const res = await SELF.fetch("http://local.test/api/v1/curp", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ curp: "", recaptchaToken: "" }),
		});

		expect(res.status).toBe(400);
		const body = await res.json<{ error?: string; message?: string }>();
		expect(body.error).toBe("APIError");
	});

	it("stores PDF in R2 idempotently and returns stable URL", async () => {
		const fetchSpy = vi.spyOn(globalThis, "fetch");

		// 1) RENAPO consulta JSON
		fetchSpy.mockImplementationOnce(async () =>
			jsonResponse({
				codigo: "01",
				mensaje: "OK",
				registros: [
					{
						curp: "AAAA000101HDFXXX09",
						nombres: "TEST",
						primerApellido: "USER",
						segundoApellido: "EXAMPLE",
						sexo: "HOMBRE",
						fechaNacimiento: "01/01/2000",
						nacionalidad: "MEXICO",
						entidad: "CDMX",
						docProbatorio: 1,
						statusCurp: "AN",
						parametro: "/fake-parametro",
						datosDocProbatorio: {
							anioReg: "2000",
							numActa: "00123",
							entidadReg: "09",
							municipioReg: "001",
						},
					},
				],
			}),
		);

		// 2) PDF base64
		const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"
		const base64 = btoa(String.fromCharCode(...pdfBytes));
		fetchSpy.mockImplementationOnce(
			async () => new Response(base64, { status: 200 }),
		);

		const res1 = await SELF.fetch("http://local.test/api/v1/curp", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				curp: "AAAA000101HDFXXX09",
				recaptchaToken: "token-from-client",
			}),
		});
		expect(res1.status).toBe(200);
		const body1 = await res1.json<{
			pdf: { key: string; url: string };
			data: { parametro: string };
		}>();
		expect(body1.pdf.key).toContain("curp/AAAA000101HDFXXX09/");
		expect(body1.pdf.url).toMatch(/\/api\/v1\/curp\/pdf\//);

		// Download stored PDF through our stable URL
		const resPdf = await SELF.fetch(body1.pdf.url);
		expect(resPdf.status).toBe(200);
		expect(resPdf.headers.get("content-type")).toMatch(/application\/pdf/i);
		const buf = new Uint8Array(await resPdf.arrayBuffer());
		expect(buf[0]).toBe(0x25); // "%"

		// Call again: should not refetch the PDF if the object exists.
		// Provide another consulta response (same parametro) to force same key.
		fetchSpy.mockImplementationOnce(async () =>
			jsonResponse({
				codigo: "01",
				mensaje: "OK",
				registros: [
					{
						curp: "AAAA000101HDFXXX09",
						nombres: "TEST",
						primerApellido: "USER",
						segundoApellido: "EXAMPLE",
						sexo: "HOMBRE",
						fechaNacimiento: "01/01/2000",
						nacionalidad: "MEXICO",
						entidad: "CDMX",
						docProbatorio: 1,
						parametro: "/fake-parametro",
					},
				],
			}),
		);

		const res2 = await SELF.fetch("http://local.test/api/v1/curp", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				curp: "AAAA000101HDFXXX09",
				recaptchaToken: "token-from-client",
			}),
		});
		expect(res2.status).toBe(200);

		// Total external fetches should be 3:
		// - consulta (1st)
		// - pdf (1st)
		// - consulta (2nd)
		expect(fetchSpy).toHaveBeenCalledTimes(3);

		fetchSpy.mockRestore();
	});
});
