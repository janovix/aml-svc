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
});
