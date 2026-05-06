/**
 * Daily cron: ensure mandatory published courses have enrollments for all active org members.
 */

import { getPrismaClient } from "../lib/prisma";
import type { Bindings } from "../types";

function addDays(d: Date, days: number): Date {
	const x = new Date(d);
	x.setDate(x.getDate() + days);
	return x;
}

export async function runTrainingEnrollmentSync(env: Bindings): Promise<{
	upserts: number;
}> {
	const auth = env.AUTH_SERVICE;
	if (!auth?.listActiveMembers) {
		console.warn(
			"[training-enrollment-sync] listActiveMembers RPC unavailable",
		);
		return { upserts: 0 };
	}

	const prisma = getPrismaClient(env.DB);

	const courses = await prisma.trainingCourse.findMany({
		where: { status: "PUBLISHED", isMandatory: true },
		select: { id: true, version: true },
	});

	if (courses.length === 0) {
		return { upserts: 0 };
	}

	let upserts = 0;
	let cursor: string | undefined;

	do {
		const page = await auth.listActiveMembers(undefined, cursor);

		for (const m of page.items) {
			for (const course of courses) {
				await prisma.trainingEnrollment.upsert({
					where: {
						organizationId_userId_courseId: {
							organizationId: m.organizationId,
							userId: m.userId,
							courseId: course.id,
						},
					},
					create: {
						id: crypto.randomUUID(),
						organizationId: m.organizationId,
						userId: m.userId,
						courseId: course.id,
						courseVersion: course.version,
						status: "ASSIGNED",
						dueAt: addDays(new Date(), 90),
					},
					update: {},
				});
				upserts++;
			}
		}

		cursor = page.nextCursor ?? undefined;
	} while (cursor);

	return { upserts };
}
