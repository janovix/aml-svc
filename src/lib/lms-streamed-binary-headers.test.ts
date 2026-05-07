import { describe, expect, it } from "vitest";

import { lmsStreamedBinaryHeaders } from "./lms-streamed-binary-headers";

describe("lmsStreamedBinaryHeaders", () => {
	it("includes Cross-Origin-Resource-Policy same-site and X-Content-Type-Options nosniff", () => {
		const h = lmsStreamedBinaryHeaders({
			contentType: "image/png",
			xTotalCount: 2,
		});

		expect(h["Cross-Origin-Resource-Policy"]).toBe("same-site");
		expect(h["X-Content-Type-Options"]).toBe("nosniff");
		expect(h["Content-Type"]).toBe("image/png");
		expect(h["X-Total-Count"]).toBe("2");
		expect(h["Cache-Control"]).toBe("private, max-age=3600");
	});

	it("supports Content-Disposition and custom Cache-Control", () => {
		const h = lmsStreamedBinaryHeaders({
			contentType: "application/pdf",
			cacheControl: "private, no-store",
			contentDisposition: 'attachment; filename="cert.pdf"',
		});

		expect(h["Content-Disposition"]).toBe('attachment; filename="cert.pdf"');
		expect(h["Cache-Control"]).toBe("private, no-store");
	});
});
