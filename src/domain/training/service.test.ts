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

	it("getCourseDetailForLearner attaches per-module progress from enrollment progress rows", async () => {
		const completedAt = new Date("2025-01-01T12:00:00.000Z");
		const findManyCourse = vi.fn().mockResolvedValue([]);
		const findFirstCourse = vi.fn().mockResolvedValue({
			id: "course-1",
			slug: "aml-101",
			status: "PUBLISHED",
			titleI18n: {},
			descriptionI18n: {},
			version: 1,
			passingScore: 70,
			maxAttempts: 3,
			cooldownHours: 0,
			validityMonths: 12,
			modules: [
				{
					id: "mod-done",
					sortOrder: 0,
					kind: "TEXT",
					titleI18n: {},
					descriptionI18n: null,
					required: true,
					durationSeconds: null,
					assetRef: "x",
				},
				{
					id: "mod-open",
					sortOrder: 1,
					kind: "TEXT",
					titleI18n: {},
					descriptionI18n: null,
					required: true,
					durationSeconds: null,
					assetRef: "y",
				},
			],
			quiz: null,
		});
		const findUniqueEnrollment = vi.fn().mockResolvedValue({
			id: "enr-1",
			organizationId: "org-1",
			userId: "user-1",
			courseId: "course-1",
			status: "ASSIGNED",
		});
		const findManyProgress = vi.fn().mockResolvedValue([
			{
				moduleId: "mod-done",
				completedAt,
				watchedSeconds: 99,
			},
		]);
		const prisma = {
			trainingCourse: {
				findMany: findManyCourse,
				findFirst: findFirstCourse,
			},
			trainingEnrollment: { findUnique: findUniqueEnrollment },
			trainingEnrollmentProgress: { findMany: findManyProgress },
		} as unknown as PrismaClient;

		const svc = new TrainingService(prisma, env);
		const detail = await svc.getCourseDetailForLearner(
			"aml-101",
			"org-1",
			"user-1",
		);

		expect(findManyProgress).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { enrollmentId: "enr-1" },
				select: expect.objectContaining({
					moduleId: true,
					completedAt: true,
					watchedSeconds: true,
				}),
			}),
		);

		const modules = detail.modules as Array<{
			id: string;
			progress: {
				completedAt: string | null;
				watchedSeconds: number | null;
			};
		}>;

		expect(modules.find((m) => m.id === "mod-done")?.progress).toEqual({
			completedAt: completedAt.toISOString(),
			watchedSeconds: 99,
		});
		expect(modules.find((m) => m.id === "mod-open")?.progress).toEqual({
			completedAt: null,
			watchedSeconds: null,
		});
	});

	it("submitQuiz persists snapshot userName and organizationName when issuing a certification", async () => {
		const questionId = "q1";
		const correctOptionId = "opt-yes";
		const enrollment = {
			id: "enr-1",
			organizationId: "org-1",
			userId: "user-1",
			courseId: "course-1",
			course: {
				id: "course-1",
				passingScore: 70,
				maxAttempts: 3,
				validityMonths: 12,
			},
		};
		const quiz = {
			questions: [
				{
					id: questionId,
					type: "SINGLE_CHOICE" as const,
					options: [
						{ id: "opt-no", isCorrect: false },
						{ id: correctOptionId, isCorrect: true },
					],
				},
			],
		};

		const trainingCertificationCreate = vi.fn().mockResolvedValue({
			id: "cert-new",
		});
		const prisma = {
			trainingEnrollment: {
				findFirst: vi.fn().mockResolvedValue(enrollment),
				update: vi.fn().mockResolvedValue(undefined),
			},
			trainingCourseQuiz: {
				findUnique: vi.fn().mockResolvedValue(quiz),
			},
			trainingQuizAttempt: {
				findFirst: vi
					.fn()
					.mockResolvedValue({ id: "att-1", submittedAt: null }),
				update: vi.fn().mockResolvedValue(undefined),
				count: vi.fn().mockResolvedValue(1),
			},
			trainingCertification: {
				findFirst: vi.fn().mockResolvedValue(null),
				create: trainingCertificationCreate,
			},
		} as unknown as PrismaClient;

		const sendCert = vi.fn().mockResolvedValue(undefined);
		const sendNotif = vi.fn().mockResolvedValue(undefined);
		const env = {
			AUTH_SERVICE: {
				getOrganization: vi.fn().mockResolvedValue({ name: "Acme Org" }),
			},
			TRAINING_CERT_GEN_QUEUE: { send: sendCert },
			TRAINING_NOTIFICATION_QUEUE: { send: sendNotif },
		} as unknown as Bindings;

		const svc = new TrainingService(prisma, env);
		const result = await svc.submitQuiz(
			"enr-1",
			"att-1",
			{ [questionId]: correctOptionId },
			"org-1",
			"user-1",
			"Jane Doe",
		);

		expect(result).toEqual(
			expect.objectContaining({
				passed: true,
				score: 100,
				certificationId: "cert-new",
			}),
		);
		expect(trainingCertificationCreate).toHaveBeenCalledWith({
			data: expect.objectContaining({
				enrollmentId: "enr-1",
				organizationId: "org-1",
				userId: "user-1",
				courseId: "course-1",
				userName: "Jane Doe",
				organizationName: "Acme Org",
				score: 100,
			}),
		});
		expect(sendCert).toHaveBeenCalledWith({
			certificationId: "cert-new",
		});
	});
});
