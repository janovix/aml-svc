/**
 * Daily cron: mark expired training certifications / enrollments.
 */

import { getPrismaClient } from "../lib/prisma";
import type { Bindings } from "../types";

export async function runTrainingExpiration(env: Bindings): Promise<{
	expiredEnrollments: number;
}> {
	const prisma = getPrismaClient(env.DB);
	const now = new Date();

	const res = await prisma.trainingEnrollment.updateMany({
		where: {
			validUntil: { lt: now },
			status: { in: ["COMPLETED", "IN_PROGRESS", "ASSIGNED"] },
		},
		data: { status: "EXPIRED" },
	});

	return { expiredEnrollments: res.count };
}
