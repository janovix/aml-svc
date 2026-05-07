import { describe, expect, it, vi } from "vitest";

import type { TrainingCertGenJob } from "../lib/training/jobs";
import type { Bindings } from "../types";
import { processTrainingCertGenJob } from "./training-cert-gen.consumer";

vi.mock("../lib/prisma", () => ({
	getPrismaClient: vi.fn(),
}));

vi.mock("../lib/r2-upload", () => ({
	uploadToR2: vi.fn(),
}));

import { getPrismaClient } from "../lib/prisma";
import { uploadToR2 } from "../lib/r2-upload";

describe("processTrainingCertGenJob", () => {
	it("returns early when certification row is missing", async () => {
		vi.mocked(getPrismaClient).mockReturnValue({
			trainingCertification: {
				findUnique: vi.fn().mockResolvedValue(null),
			},
		} as never);

		await expect(
			processTrainingCertGenJob(
				{ DB: {} } as Bindings,
				{
					certificationId: "missing",
				} as TrainingCertGenJob,
			),
		).resolves.toBeUndefined();
	});

	it("builds a PDF, uploads to R2, updates row, and notifies when certification exists", async () => {
		const update = vi.fn().mockResolvedValue(undefined);
		const findUnique = vi.fn().mockResolvedValue({
			id: "cert-id",
			organizationId: "org-1",
			userId: "user-1",
			courseId: "course-1",
			certificateNumber: "JNX-AML-2026-000001",
			userName: "María García",
			organizationName: "Contoso MX",
			score: 100,
			issuedAt: new Date("2026-05-07T00:00:00.000Z"),
			expiresAt: new Date("2027-05-07T00:00:00.000Z"),
			enrollment: {
				course: { titleI18n: { es: "Capacitación AML anual" } },
			},
		});

		vi.mocked(getPrismaClient).mockReturnValue({
			trainingCertification: {
				findUnique,
				update,
			},
		} as never);

		vi.mocked(uploadToR2).mockResolvedValue({
			key: "lms/certs/org-1/cert-id.pdf",
			size: 1,
			etag: "etag",
		});
		const send = vi.fn().mockResolvedValue(undefined);

		await processTrainingCertGenJob(
			{
				DB: {},
				R2_BUCKET: "test-bucket",
				TRAINING_NOTIFICATION_QUEUE: { send },
			} as unknown as Bindings,
			{ certificationId: "cert-id" } as TrainingCertGenJob,
		);

		expect(uploadToR2).toHaveBeenCalledWith(
			expect.objectContaining({
				bucket: "test-bucket",
				key: "lms/certs/org-1/cert-id.pdf",
				contentType: "application/pdf",
			}),
		);

		const uploaded = vi.mocked(uploadToR2).mock.calls[0]?.[0];
		expect(uploaded).toBeDefined();
		const bytes = uploaded!.content as Uint8Array;
		expect(String.fromCharCode(...bytes.slice(0, 5))).toBe("%PDF-");

		expect(update).toHaveBeenCalledWith({
			where: { id: "cert-id" },
			data: { pdfR2Key: "lms/certs/org-1/cert-id.pdf" },
		});
		expect(send).toHaveBeenCalledTimes(1);
	});
});
