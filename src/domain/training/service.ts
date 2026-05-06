/**
 * AML Training / LMS domain service (catalog, enrollments, quiz, certifications).
 */

import type {
	Prisma,
	PrismaClient,
	TrainingCourseStatus,
	TrainingEnrollmentStatus,
} from "@prisma/client";

function addHours(d: Date, hours: number): Date {
	const out = new Date(d);
	out.setTime(out.getTime() + hours * 60 * 60 * 1000);
	return out;
}

import type { Bindings } from "../../types";
import { APIError } from "../../middleware/error";
import {
	getSignedStreamPlaybackToken,
	streamIframePlayerUrl,
} from "../../lib/training/stream";
import type {
	TrainingCertGenJob,
	TrainingNotificationJob,
} from "../../lib/training/jobs";
import { scoreTrainingQuiz } from "./quiz-score";

function addMonths(d: Date, months: number): Date {
	const out = new Date(d);
	out.setMonth(out.getMonth() + months);
	return out;
}

function addDays(d: Date, days: number): Date {
	const out = new Date(d);
	out.setDate(out.getDate() + days);
	return out;
}

export class TrainingService {
	constructor(
		private prisma: PrismaClient,
		private env: Bindings,
	) {}

	async ensureMandatoryEnrollments(organizationId: string, userId: string) {
		const courses = await this.prisma.trainingCourse.findMany({
			where: { status: "PUBLISHED", isMandatory: true },
		});

		const now = new Date();

		for (const course of courses) {
			const existing = await this.prisma.trainingEnrollment.findUnique({
				where: {
					organizationId_userId_courseId: {
						organizationId,
						userId,
						courseId: course.id,
					},
				},
			});

			if (!existing) {
				await this.prisma.trainingEnrollment.create({
					data: {
						id: crypto.randomUUID(),
						organizationId,
						userId,
						courseId: course.id,
						courseVersion: course.version,
						status: "ASSIGNED",
						dueAt: addDays(now, 90),
					},
				});
			}
		}
	}

	async listCoursesWithEnrollment(organizationId: string, userId: string) {
		await this.ensureMandatoryEnrollments(organizationId, userId);

		const courses = await this.prisma.trainingCourse.findMany({
			where: { status: "PUBLISHED" },
			orderBy: { updatedAt: "desc" },
			select: {
				id: true,
				slug: true,
				titleI18n: true,
				descriptionI18n: true,
				version: true,
				isMandatory: true,
				validityMonths: true,
			},
		});

		const enrollments = await this.prisma.trainingEnrollment.findMany({
			where: { organizationId, userId },
		});
		const enrByCourse = new Map(enrollments.map((e) => [e.courseId, e]));

		return courses.map((c) => ({
			...c,
			titleI18n: c.titleI18n as Record<string, string>,
			descriptionI18n: c.descriptionI18n as Record<string, string>,
			enrollment: enrByCourse.get(c.id) ?? null,
		}));
	}

	async getCourseDetailForLearner(
		slug: string,
		organizationId: string,
		userId: string,
	) {
		await this.ensureMandatoryEnrollments(organizationId, userId);

		const course = await this.prisma.trainingCourse.findFirst({
			where: { slug, status: "PUBLISHED" },
			include: {
				modules: { orderBy: { sortOrder: "asc" } },
				quiz: {
					include: {
						questions: {
							orderBy: { sortOrder: "asc" },
							include: { options: { orderBy: { sortOrder: "asc" } } },
						},
					},
				},
			},
		});

		if (!course) {
			throw new APIError(404, "Course not found", {
				code: "TRAINING_COURSE_NOT_FOUND",
			});
		}

		const enrollment = await this.prisma.trainingEnrollment.findUnique({
			where: {
				organizationId_userId_courseId: {
					organizationId,
					userId,
					courseId: course.id,
				},
			},
		});

		if (!enrollment) {
			throw new APIError(404, "Not enrolled", {
				code: "TRAINING_NOT_ENROLLED",
			});
		}

		const customerCode = this.env.STREAM_CUSTOMER_CODE ?? "";

		const modulesOut = [] as Record<string, unknown>[];
		for (const m of course.modules) {
			const base: Record<string, unknown> = {
				id: m.id,
				sortOrder: m.sortOrder,
				kind: m.kind,
				titleI18n: m.titleI18n,
				required: m.required,
				durationSeconds: m.durationSeconds,
			};

			if (m.kind === "VIDEO" && m.assetRef) {
				try {
					const token = await getSignedStreamPlaybackToken(
						this.env,
						m.assetRef,
					);
					base.playbackToken = token;
					base.playerUrl =
						customerCode !== ""
							? streamIframePlayerUrl(customerCode, m.assetRef, token)
							: null;
				} catch {
					base.playbackError = "Stream signing unavailable";
				}
			} else if (m.kind === "PDF" || m.kind === "IMAGE") {
				base.assetPath = `/api/v1/training/module-assets/${m.id}`;
			} else {
				base.body = m.kind === "TEXT" ? m.assetRef : null;
			}

			modulesOut.push(base);
		}

		const quizOut = course.quiz
			? {
					id: course.quiz.id,
					shuffleQuestions: course.quiz.shuffleQuestions,
					timeLimitMinutes: course.quiz.timeLimitMinutes,
					questions: course.quiz.questions.map((q) => ({
						id: q.id,
						sortOrder: q.sortOrder,
						type: q.type,
						promptI18n: q.promptI18n,
						options: q.options.map((o) => ({
							id: o.id,
							sortOrder: o.sortOrder,
							textI18n: o.textI18n,
						})),
					})),
				}
			: null;

		return {
			course: {
				id: course.id,
				slug: course.slug,
				titleI18n: course.titleI18n,
				descriptionI18n: course.descriptionI18n,
				version: course.version,
				passingScore: course.passingScore,
				maxAttempts: course.maxAttempts,
				cooldownHours: course.cooldownHours,
				validityMonths: course.validityMonths,
			},
			modules: modulesOut,
			quiz: quizOut,
			enrollment,
		};
	}

	async listMyEnrollments(organizationId: string, userId: string) {
		await this.ensureMandatoryEnrollments(organizationId, userId);
		return this.prisma.trainingEnrollment.findMany({
			where: { organizationId, userId },
			include: {
				course: {
					select: { slug: true, titleI18n: true, version: true },
				},
			},
			orderBy: { enrolledAt: "desc" },
		});
	}

	async recordProgress(
		enrollmentId: string,
		moduleId: string,
		organizationId: string,
		userId: string,
		watchedSeconds?: number,
	) {
		const enrollment = await this.prisma.trainingEnrollment.findFirst({
			where: { id: enrollmentId, organizationId, userId },
			include: { course: { include: { modules: true } } },
		});

		if (!enrollment) {
			throw new APIError(404, "Enrollment not found", {
				code: "TRAINING_ENROLLMENT_NOT_FOUND",
			});
		}

		const mod = enrollment.course.modules.find((m) => m.id === moduleId);
		if (!mod) {
			throw new APIError(400, "Invalid module", {
				code: "TRAINING_BAD_MODULE",
			});
		}

		const now = new Date();

		await this.prisma.trainingEnrollmentProgress.upsert({
			where: {
				enrollmentId_moduleId: { enrollmentId, moduleId },
			},
			create: {
				id: crypto.randomUUID(),
				enrollmentId,
				moduleId,
				completedAt: now,
				watchedSeconds: watchedSeconds ?? null,
			},
			update: {
				completedAt: now,
				watchedSeconds: watchedSeconds ?? undefined,
			},
		});

		if (enrollment.status === "ASSIGNED") {
			await this.prisma.trainingEnrollment.update({
				where: { id: enrollmentId },
				data: { status: "IN_PROGRESS" },
			});
		}

		return { ok: true };
	}

	async startQuiz(
		enrollmentId: string,
		organizationId: string,
		userId: string,
	) {
		const enrollment = await this.prisma.trainingEnrollment.findFirst({
			where: { id: enrollmentId, organizationId, userId },
			include: {
				course: {
					include: {
						modules: true,
						quiz: {
							include: {
								questions: {
									orderBy: { sortOrder: "asc" },
									include: { options: { orderBy: { sortOrder: "asc" } } },
								},
							},
						},
					},
				},
				progress: true,
			},
		});

		if (!enrollment?.course.quiz) {
			throw new APIError(400, "No quiz for course", {
				code: "TRAINING_NO_QUIZ",
			});
		}

		const requiredMods = enrollment.course.modules.filter((m) => m.required);
		const completed = new Set(
			enrollment.progress.filter((p) => p.completedAt).map((p) => p.moduleId),
		);
		const allDone = requiredMods.every((m) => completed.has(m.id));
		if (!allDone) {
			throw new APIError(400, "Complete all modules first", {
				code: "TRAINING_MODULES_INCOMPLETE",
			});
		}

		const course = enrollment.course;

		const submittedCount = await this.prisma.trainingQuizAttempt.count({
			where: { enrollmentId, submittedAt: { not: null } },
		});

		if (submittedCount >= course.maxAttempts) {
			throw new APIError(400, "Max attempts reached", {
				code: "TRAINING_MAX_ATTEMPTS",
			});
		}

		const openAttempt = await this.prisma.trainingQuizAttempt.findFirst({
			where: { enrollmentId, submittedAt: null },
			orderBy: { startedAt: "desc" },
		});

		if (openAttempt) {
			const questions = this.prepareQuizQuestionsPayload(
				enrollment.course.quiz,
			);
			return {
				attemptId: openAttempt.id,
				questions,
				startedAt: openAttempt.startedAt.toISOString(),
			};
		}

		const lastSubmitted = await this.prisma.trainingQuizAttempt.findFirst({
			where: { enrollmentId, submittedAt: { not: null } },
			orderBy: { submittedAt: "desc" },
		});

		if (
			lastSubmitted &&
			lastSubmitted.passed === false &&
			course.cooldownHours > 0 &&
			lastSubmitted.submittedAt
		) {
			const cooldownEnd = addHours(
				lastSubmitted.submittedAt,
				course.cooldownHours,
			);
			if (new Date() < cooldownEnd) {
				throw new APIError(429, "Cooldown active", {
					code: "TRAINING_COOLDOWN",
					retryAfter: cooldownEnd.toISOString(),
				});
			}
		}

		const prevMaxAttempt = await this.prisma.trainingQuizAttempt.findFirst({
			where: { enrollmentId },
			orderBy: { attemptNumber: "desc" },
			select: { attemptNumber: true },
		});
		const attemptNumber = (prevMaxAttempt?.attemptNumber ?? 0) + 1;

		const attempt = await this.prisma.trainingQuizAttempt.create({
			data: {
				id: crypto.randomUUID(),
				enrollmentId,
				attemptNumber,
				startedAt: new Date(),
			},
		});

		const questions = this.prepareQuizQuestionsPayload(enrollment.course.quiz);

		return {
			attemptId: attempt.id,
			questions,
			startedAt: attempt.startedAt.toISOString(),
		};
	}

	private prepareQuizQuestionsPayload(quiz: {
		shuffleQuestions: boolean;
		questions: Array<{
			id: string;
			sortOrder: number;
			type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE";
			promptI18n: unknown;
			options: Array<{
				id: string;
				sortOrder: number;
				textI18n: unknown;
			}>;
		}>;
	}) {
		let questions = [...quiz.questions];
		if (quiz.shuffleQuestions) {
			questions = questions.sort(() => Math.random() - 0.5);
		}

		return questions.map((q) => ({
			id: q.id,
			type: q.type,
			promptI18n: q.promptI18n,
			options: q.options.map((o) => ({
				id: o.id,
				textI18n: o.textI18n,
			})),
		}));
	}

	async submitQuiz(
		enrollmentId: string,
		attemptId: string,
		answers: Record<string, string | string[]>,
		organizationId: string,
		userId: string,
	) {
		const enrollment = await this.prisma.trainingEnrollment.findFirst({
			where: { id: enrollmentId, organizationId, userId },
			include: { course: true },
		});

		if (!enrollment) {
			throw new APIError(404, "Enrollment not found");
		}

		const quiz = await this.prisma.trainingCourseQuiz.findUnique({
			where: { courseId: enrollment.courseId },
			include: {
				questions: {
					include: { options: true },
				},
			},
		});

		if (!quiz) {
			throw new APIError(400, "No quiz");
		}

		const attempt = await this.prisma.trainingQuizAttempt.findFirst({
			where: { id: attemptId, enrollmentId },
		});

		if (!attempt || attempt.submittedAt) {
			throw new APIError(400, "Invalid or closed attempt");
		}

		const forScore = quiz.questions.map((q) => ({
			id: q.id,
			type: q.type,
			options: q.options.map((o) => ({ id: o.id, isCorrect: o.isCorrect })),
		}));

		const { scorePercent } = scoreTrainingQuiz(forScore, answers);
		const passed = scorePercent >= enrollment.course.passingScore;
		const now = new Date();

		await this.prisma.trainingQuizAttempt.update({
			where: { id: attemptId },
			data: {
				submittedAt: now,
				score: scorePercent,
				passed,
				answers: answers as Prisma.InputJsonValue,
			},
		});

		const totalSubmitted = await this.prisma.trainingQuizAttempt.count({
			where: { enrollmentId, submittedAt: { not: null } },
		});

		if (!passed) {
			const failedFinal = totalSubmitted >= enrollment.course.maxAttempts;
			await this.prisma.trainingEnrollment.update({
				where: { id: enrollmentId },
				data: {
					status: failedFinal ? "FAILED" : "IN_PROGRESS",
					attemptCount: totalSubmitted,
				},
			});

			if (failedFinal) {
				await this.enqueueNotification({
					kind: "failed_max_attempts",
					organizationId,
					userId,
					courseId: enrollment.courseId,
				});
			}

			return {
				passed: false,
				score: scorePercent,
				passingScore: enrollment.course.passingScore,
				enrollmentStatus: failedFinal
					? ("FAILED" as const)
					: ("IN_PROGRESS" as const),
			};
		}

		const validUntil = addMonths(now, enrollment.course.validityMonths);

		await this.prisma.trainingEnrollment.update({
			where: { id: enrollmentId },
			data: {
				status: "COMPLETED",
				completedAt: now,
				validUntil,
				attemptCount: totalSubmitted,
			},
		});

		const certNumber = await this.nextCertificateNumber();
		const cert = await this.prisma.trainingCertification.create({
			data: {
				id: crypto.randomUUID(),
				enrollmentId,
				organizationId,
				userId,
				courseId: enrollment.courseId,
				certificateNumber: certNumber,
				score: scorePercent,
				issuedAt: now,
				expiresAt: validUntil,
			},
		});

		await this.enqueueCertGen({ certificationId: cert.id });
		await this.enqueueNotification({
			kind: "certified",
			organizationId,
			userId,
			courseId: enrollment.courseId,
		});

		return {
			passed: true,
			score: scorePercent,
			certificationId: cert.id,
			validUntil: validUntil.toISOString(),
		};
	}

	private async nextCertificateNumber(): Promise<string> {
		const year = new Date().getFullYear();
		const prefix = `JNX-AML-${year}-`;
		const last = await this.prisma.trainingCertification.findFirst({
			where: { certificateNumber: { startsWith: prefix } },
			orderBy: { certificateNumber: "desc" },
			select: { certificateNumber: true },
		});
		let seq = 1;
		if (last?.certificateNumber) {
			const part = last.certificateNumber.slice(prefix.length);
			const n = Number.parseInt(part, 10);
			if (!Number.isNaN(n)) seq = n + 1;
		}
		return `${prefix}${String(seq).padStart(6, "0")}`;
	}

	private async enqueueCertGen(job: TrainingCertGenJob) {
		const q = this.env.TRAINING_CERT_GEN_QUEUE;
		if (q) {
			await q.send(job);
		}
	}

	private async enqueueNotification(job: TrainingNotificationJob) {
		const q = this.env.TRAINING_NOTIFICATION_QUEUE;
		if (q) {
			await q.send(job);
		}
	}

	async listMyCertifications(organizationId: string, userId: string) {
		return this.prisma.trainingCertification.findMany({
			where: { organizationId, userId },
			include: {
				enrollment: {
					include: {
						course: { select: { slug: true, titleI18n: true } },
					},
				},
			},
			orderBy: { issuedAt: "desc" },
		});
	}

	async getModuleAssetStreamKey(
		moduleId: string,
		organizationId: string,
		userId: string,
	): Promise<{ key: string; contentType: string }> {
		const mod = await this.prisma.trainingCourseModule.findUnique({
			where: { id: moduleId },
			include: { course: true },
		});

		if (!mod || mod.course.status !== "PUBLISHED") {
			throw new APIError(404, "Module not found");
		}

		const enrollment = await this.prisma.trainingEnrollment.findUnique({
			where: {
				organizationId_userId_courseId: {
					organizationId,
					userId,
					courseId: mod.courseId,
				},
			},
		});

		if (!enrollment) {
			throw new APIError(403, "Not enrolled");
		}

		if (mod.kind !== "PDF" && mod.kind !== "IMAGE") {
			throw new APIError(400, "Not a file module");
		}

		const mime =
			mod.kind === "PDF"
				? "application/pdf"
				: mod.assetRef.endsWith(".png")
					? "image/png"
					: "image/jpeg";

		return { key: mod.assetRef, contentType: mime };
	}

	async getCertificationDownloadStream(
		certificationId: string,
		organizationId: string,
		userId: string,
	): Promise<{ key: string; filename: string }> {
		const cert = await this.prisma.trainingCertification.findFirst({
			where: { id: certificationId, organizationId, userId },
		});

		if (!cert?.pdfR2Key) {
			throw new APIError(404, "Certificate PDF not ready");
		}

		return {
			key: cert.pdfR2Key,
			filename: `${cert.certificateNumber}.pdf`,
		};
	}

	// --- Org admin (owner/admin) ---

	async listOrgEnrollments(
		organizationId: string,
		filters?: { courseId?: string; status?: TrainingEnrollmentStatus },
	) {
		return this.prisma.trainingEnrollment.findMany({
			where: {
				organizationId,
				...(filters?.courseId ? { courseId: filters.courseId } : {}),
				...(filters?.status ? { status: filters.status } : {}),
			},
			include: {
				course: { select: { slug: true, titleI18n: true } },
			},
			orderBy: { enrolledAt: "desc" },
			take: 500,
		});
	}

	async listOrgCertifications(organizationId: string) {
		return this.prisma.trainingCertification.findMany({
			where: { organizationId },
			include: {
				enrollment: {
					include: {
						course: { select: { slug: true, titleI18n: true } },
					},
				},
			},
			orderBy: { issuedAt: "desc" },
			take: 500,
		});
	}

	async orgComplianceSummary(organizationId: string) {
		const [byStatus, totalMembers, certified] = await Promise.all([
			this.prisma.trainingEnrollment.groupBy({
				by: ["status"],
				where: { organizationId },
				_count: { status: true },
			}),
			this.prisma.trainingEnrollment.findMany({
				where: { organizationId },
				select: { userId: true },
				distinct: ["userId"],
			}),
			this.prisma.trainingCertification.count({
				where: {
					organizationId,
					expiresAt: { gt: new Date() },
				},
			}),
		]);

		const counts = Object.fromEntries(
			byStatus.map((r) => [r.status, r._count.status]),
		) as Record<string, number>;

		const expiringSoon = await this.prisma.trainingCertification.count({
			where: {
				organizationId,
				expiresAt: {
					lte: addDays(new Date(), 30),
					gt: new Date(),
				},
			},
		});

		return {
			byStatus: counts,
			distinctMembers: totalMembers.length,
			activeCertifications: certified,
			expiringWithin30Days: expiringSoon,
		};
	}

	// --- Platform admin ---

	async getCourseAdminById(courseId: string) {
		const course = await this.prisma.trainingCourse.findUnique({
			where: { id: courseId },
			include: {
				modules: { orderBy: { sortOrder: "asc" } },
				quiz: {
					include: {
						questions: {
							orderBy: { sortOrder: "asc" },
							include: { options: { orderBy: { sortOrder: "asc" } } },
						},
					},
				},
			},
		});

		if (!course) {
			throw new APIError(404, "Course not found", {
				code: "TRAINING_COURSE_NOT_FOUND",
			});
		}

		return course;
	}

	async listCoursesAdmin(where?: { status?: TrainingCourseStatus }) {
		return this.prisma.trainingCourse.findMany({
			where,
			orderBy: { updatedAt: "desc" },
			include: {
				_count: { select: { modules: true } },
			},
		});
	}

	async createCourseAdmin(data: {
		slug: string;
		titleI18n: Record<string, string>;
		descriptionI18n?: Record<string, string>;
		isMandatory?: boolean;
		validityMonths?: number;
		passingScore?: number;
		maxAttempts?: number;
		cooldownHours?: number;
	}) {
		return this.prisma.trainingCourse.create({
			data: {
				id: crypto.randomUUID(),
				slug: data.slug,
				titleI18n: data.titleI18n,
				descriptionI18n: data.descriptionI18n ?? {},
				status: "DRAFT",
				isMandatory: data.isMandatory ?? true,
				validityMonths: data.validityMonths ?? 12,
				passingScore: data.passingScore ?? 80,
				maxAttempts: data.maxAttempts ?? 3,
				cooldownHours: data.cooldownHours ?? 24,
			},
		});
	}

	async updateCourseAdmin(
		courseId: string,
		patch: Partial<{
			titleI18n: Record<string, string>;
			descriptionI18n: Record<string, string>;
			isMandatory: boolean;
			validityMonths: number;
			passingScore: number;
			maxAttempts: number;
			cooldownHours: number;
			status: TrainingCourseStatus;
			slug: string;
		}>,
	) {
		return this.prisma.trainingCourse.update({
			where: { id: courseId },
			data: patch,
		});
	}

	async publishCourse(courseId: string) {
		const course = await this.prisma.trainingCourse.findUnique({
			where: { id: courseId },
			include: { quiz: true },
		});

		if (!course) {
			throw new APIError(404, "Course not found");
		}

		if (!course.quiz) {
			throw new APIError(400, "Add a quiz before publishing");
		}

		const publishedAt = new Date();

		return this.prisma.trainingCourse.update({
			where: { id: courseId },
			data: {
				status: "PUBLISHED",
				version: { increment: 1 },
				publishedAt,
			},
		});
	}

	async deleteCourseAdmin(courseId: string) {
		await this.prisma.trainingCourse.delete({ where: { id: courseId } });
	}

	async upsertModule(
		courseId: string,
		payload: {
			id?: string;
			sortOrder: number;
			kind: "VIDEO" | "PDF" | "IMAGE" | "TEXT";
			titleI18n: Record<string, string>;
			assetRef: string;
			durationSeconds?: number | null;
			required?: boolean;
		},
	) {
		if (payload.id) {
			return this.prisma.trainingCourseModule.update({
				where: { id: payload.id },
				data: {
					sortOrder: payload.sortOrder,
					kind: payload.kind,
					titleI18n: payload.titleI18n,
					assetRef: payload.assetRef,
					durationSeconds: payload.durationSeconds ?? null,
					required: payload.required ?? true,
				},
			});
		}

		return this.prisma.trainingCourseModule.create({
			data: {
				id: crypto.randomUUID(),
				courseId,
				sortOrder: payload.sortOrder,
				kind: payload.kind,
				titleI18n: payload.titleI18n,
				assetRef: payload.assetRef,
				durationSeconds: payload.durationSeconds ?? null,
				required: payload.required ?? true,
			},
		});
	}

	async deleteModule(moduleId: string) {
		await this.prisma.trainingCourseModule.delete({ where: { id: moduleId } });
	}

	async upsertQuizFull(
		courseId: string,
		payload: {
			shuffleQuestions?: boolean;
			timeLimitMinutes?: number | null;
			questions: Array<{
				id?: string;
				sortOrder: number;
				type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE";
				promptI18n: Record<string, string>;
				explanationI18n?: Record<string, string> | null;
				options: Array<{
					id?: string;
					sortOrder: number;
					textI18n: Record<string, string>;
					isCorrect: boolean;
				}>;
			}>;
		},
	) {
		const quiz = await this.prisma.trainingCourseQuiz.upsert({
			where: { courseId },
			create: {
				id: crypto.randomUUID(),
				courseId,
				shuffleQuestions: payload.shuffleQuestions ?? false,
				timeLimitMinutes: payload.timeLimitMinutes ?? null,
			},
			update: {
				shuffleQuestions: payload.shuffleQuestions ?? false,
				timeLimitMinutes: payload.timeLimitMinutes ?? null,
			},
		});

		await this.prisma.trainingQuizQuestion.deleteMany({
			where: { quizId: quiz.id },
		});

		for (const q of payload.questions) {
			const qid = q.id ?? crypto.randomUUID();
			await this.prisma.trainingQuizQuestion.create({
				data: {
					id: qid,
					quizId: quiz.id,
					sortOrder: q.sortOrder,
					type: q.type,
					promptI18n: q.promptI18n,
					explanationI18n: q.explanationI18n ?? undefined,
					options: {
						create: q.options.map((o) => ({
							id: o.id ?? crypto.randomUUID(),
							sortOrder: o.sortOrder,
							textI18n: o.textI18n,
							isCorrect: o.isCorrect,
						})),
					},
				},
			});
		}

		return quiz;
	}

	async listEnrollmentsAdmin(filters?: {
		organizationId?: string;
		courseId?: string;
		status?: TrainingEnrollmentStatus;
		limit?: number;
	}) {
		const where: Prisma.TrainingEnrollmentWhereInput = {};
		if (filters?.organizationId) {
			where.organizationId = filters.organizationId;
		}
		if (filters?.courseId) {
			where.courseId = filters.courseId;
		}
		if (filters?.status) {
			where.status = filters.status;
		}

		return this.prisma.trainingEnrollment.findMany({
			where,
			take: Math.min(filters?.limit ?? 5000, 10000),
			orderBy: { enrolledAt: "desc" },
			include: {
				course: {
					select: { id: true, slug: true, titleI18n: true, version: true },
				},
			},
		});
	}

	async adminComplianceSummary(filters?: { organizationId?: string }) {
		const whereEnr: Prisma.TrainingEnrollmentWhereInput = {};
		if (filters?.organizationId) {
			whereEnr.organizationId = filters.organizationId;
		}

		const [enrollments, certs] = await Promise.all([
			this.prisma.trainingEnrollment.groupBy({
				by: ["status"],
				where: whereEnr,
				_count: { status: true },
			}),
			this.prisma.trainingCertification.count({
				where: filters?.organizationId
					? { organizationId: filters.organizationId }
					: {},
			}),
		]);

		return {
			enrollmentByStatus: Object.fromEntries(
				enrollments.map((e) => [e.status, e._count.status]),
			),
			totalCertifications: certs,
		};
	}

	generateLmsAssetKey(courseId: string, fileName: string): string {
		const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
		return `lms/courses/${courseId}/${crypto.randomUUID()}-${safe}`;
	}
}
