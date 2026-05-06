import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

import type { Bindings } from "../../types";
import { TrainingService } from "./service";

describe("TrainingService", () => {
	const env = {} as Bindings;

	it("generateLmsAssetKey sanitizes unsafe filename characters", () => {
		const svc = new TrainingService({} as PrismaClient, env);
		const key = svc.generateLmsAssetKey("course-1", "Weird name!.pdf");
		expect(key).toMatch(
			/^lms\/courses\/course-1\/[0-9a-f-]{36}-Weird_name_.pdf$/,
		);
	});

	it("adminComplianceSummary aggregates enrollments and certification count", async () => {
		const groupBy = vi.fn().mockResolvedValue([
			{ status: "ASSIGNED", _count: { status: 2 } },
			{ status: "COMPLETED", _count: { status: 1 } },
		]);
		const count = vi.fn().mockResolvedValue(4);
		const prisma = {
			trainingEnrollment: { groupBy },
			trainingCertification: { count },
		} as unknown as PrismaClient;

		const svc = new TrainingService(prisma, env);
		const summary = await svc.adminComplianceSummary({
			organizationId: "org-a",
		});

		expect(summary.totalCertifications).toBe(4);
		expect(summary.enrollmentByStatus.ASSIGNED).toBe(2);
		expect(summary.enrollmentByStatus.COMPLETED).toBe(1);
		expect(groupBy).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { organizationId: "org-a" },
			}),
		);
	});

	it("listEnrollmentsAdmin includes course and certification", async () => {
		const findMany = vi.fn().mockResolvedValue([]);
		const prisma = {
			trainingEnrollment: { findMany },
		} as unknown as PrismaClient;

		const svc = new TrainingService(prisma, env);
		await svc.listEnrollmentsAdmin({ organizationId: "org-1" });

		expect(findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				include: expect.objectContaining({
					course: {
						select: {
							id: true,
							slug: true,
							titleI18n: true,
							version: true,
						},
					},
					certification: {
						select: {
							id: true,
							certificateNumber: true,
							score: true,
							issuedAt: true,
							expiresAt: true,
						},
					},
				}),
			}),
		);
	});

	it("listCoursesWithEnrollment attaches enrollment and ensures mandatory", async () => {
		const publishedCourse = {
			id: "c1",
			slug: "aml-101",
			titleI18n: { en: "T" },
			descriptionI18n: { en: "D" },
			version: 2,
			isMandatory: false,
			validityMonths: 12,
		};
		const findManyCourse = vi.fn(
			(args: { where: { isMandatory?: boolean } }) => {
				if (args.where.isMandatory === true) {
					return Promise.resolve([]);
				}
				return Promise.resolve([publishedCourse]);
			},
		);
		const findManyEnr = vi
			.fn()
			.mockResolvedValue([{ courseId: "c1", status: "ASSIGNED" }]);
		const findUnique = vi.fn().mockResolvedValue(null);
		const create = vi.fn().mockResolvedValue({});
		const prisma = {
			trainingCourse: { findMany: findManyCourse },
			trainingEnrollment: { findMany: findManyEnr, findUnique, create },
		} as unknown as PrismaClient;

		const svc = new TrainingService(prisma, env);
		const rows = await svc.listCoursesWithEnrollment("org-1", "user-1");

		expect(rows).toHaveLength(1);
		expect(rows[0]?.slug).toBe("aml-101");
		expect(rows[0]?.enrollment?.status).toBe("ASSIGNED");
	});

	it("ensureMandatoryEnrollments creates missing enrollment for mandatory courses", async () => {
		const course = {
			id: "c1",
			version: 3,
		};
		const findManyCourses = vi.fn().mockResolvedValue([course]);
		const findUnique = vi.fn().mockResolvedValue(null);
		const create = vi.fn().mockResolvedValue({});
		const prisma = {
			trainingCourse: { findMany: findManyCourses },
			trainingEnrollment: { findUnique, create },
		} as unknown as PrismaClient;

		const svc = new TrainingService(prisma, env);
		await svc.ensureMandatoryEnrollments("org-1", "user-1");

		expect(findUnique).toHaveBeenCalled();
		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					organizationId: "org-1",
					userId: "user-1",
					courseId: "c1",
					courseVersion: 3,
					status: "ASSIGNED",
				}),
			}),
		);
	});
});
