import { describe, expect, it, vi, beforeEach } from "vitest";
import { NoticeRepository } from "./repository";
import type {
	PrismaClient,
	Notice,
	Alert,
	AlertRule,
	NoticeStatus as PrismaNoticeStatus,
} from "@prisma/client";

// Mock Prisma client
function createMockPrisma(): PrismaClient {
	return {
		notice: {
			findMany: vi.fn(),
			findUnique: vi.fn(),
			findFirst: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
			count: vi.fn(),
		},
		alert: {
			findMany: vi.fn(),
			updateMany: vi.fn(),
			count: vi.fn(),
		},
	} as unknown as PrismaClient;
}

const mockNotice: Notice = {
	id: "NTC_123",
	organizationId: "org_123",
	name: "Aviso SAT Enero 2024",
	status: "DRAFT" as PrismaNoticeStatus,
	periodStart: new Date("2023-12-17"),
	periodEnd: new Date("2024-01-16"),
	reportedMonth: "202401",
	recordCount: 10,
	xmlFileUrl: null,
	fileSize: null,
	generatedAt: null,
	submittedAt: null,
	satFolioNumber: null,
	createdBy: "user_123",
	notes: null,
	createdAt: new Date("2024-01-15"),
	updatedAt: new Date("2024-01-15"),
};

const mockGeneratedNotice: Notice = {
	...mockNotice,
	id: "NTC_456",
	status: "GENERATED" as PrismaNoticeStatus,
	xmlFileUrl: "https://storage.example.com/notices/ntc_456.xml",
	fileSize: 12345,
	generatedAt: new Date("2024-01-16"),
};

const mockSubmittedNotice: Notice = {
	...mockGeneratedNotice,
	id: "NTC_789",
	status: "SUBMITTED" as PrismaNoticeStatus,
	submittedAt: new Date("2024-01-17"),
};

type AlertWithRule = Alert & { alertRule: AlertRule };

const mockAlert: Partial<AlertWithRule> = {
	id: "alt_123",
	organizationId: "org_123",
	alertRuleId: "rule_123",
	clientId: "clt_123",
	status: "DETECTED",
	severity: "HIGH",
	noticeId: null,
	alertRule: {
		id: "rule_123",
		name: "Test Rule",
	} as AlertRule,
};

describe("NoticeRepository", () => {
	let prisma: PrismaClient;
	let repository: NoticeRepository;

	beforeEach(() => {
		vi.clearAllMocks();
		prisma = createMockPrisma();
		repository = new NoticeRepository(prisma);
	});

	describe("list", () => {
		it("lists notices with pagination", async () => {
			vi.mocked(prisma.notice.findMany).mockResolvedValue([mockNotice]);
			vi.mocked(prisma.notice.count).mockResolvedValue(1);

			const result = await repository.list("org_123", { page: 1, limit: 10 });

			expect(result.data).toHaveLength(1);
			expect(result.pagination.total).toBe(1);
			expect(result.pagination.page).toBe(1);
			expect(prisma.notice.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { organizationId: "org_123" },
					skip: 0,
					take: 10,
				}),
			);
		});

		it("filters by status", async () => {
			vi.mocked(prisma.notice.findMany).mockResolvedValue([]);
			vi.mocked(prisma.notice.count).mockResolvedValue(0);

			await repository.list("org_123", { page: 1, limit: 10, status: "DRAFT" });

			expect(prisma.notice.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { organizationId: "org_123", status: "DRAFT" },
				}),
			);
		});

		it("filters by period start", async () => {
			vi.mocked(prisma.notice.findMany).mockResolvedValue([]);
			vi.mocked(prisma.notice.count).mockResolvedValue(0);

			await repository.list("org_123", {
				page: 1,
				limit: 10,
				periodStart: "2024-01-01",
			});

			expect(prisma.notice.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: {
						organizationId: "org_123",
						periodStart: { gte: new Date("2024-01-01") },
					},
				}),
			);
		});

		it("filters by period end", async () => {
			vi.mocked(prisma.notice.findMany).mockResolvedValue([]);
			vi.mocked(prisma.notice.count).mockResolvedValue(0);

			await repository.list("org_123", {
				page: 1,
				limit: 10,
				periodEnd: "2024-01-31",
			});

			expect(prisma.notice.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: {
						organizationId: "org_123",
						periodEnd: { lte: new Date("2024-01-31") },
					},
				}),
			);
		});

		it("filters by year", async () => {
			vi.mocked(prisma.notice.findMany).mockResolvedValue([]);
			vi.mocked(prisma.notice.count).mockResolvedValue(0);

			await repository.list("org_123", { page: 1, limit: 10, year: 2024 });

			expect(prisma.notice.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: {
						organizationId: "org_123",
						reportedMonth: { startsWith: "2024" },
					},
				}),
			);
		});

		it("calculates correct pagination offset", async () => {
			vi.mocked(prisma.notice.findMany).mockResolvedValue([]);
			vi.mocked(prisma.notice.count).mockResolvedValue(50);

			const result = await repository.list("org_123", { page: 3, limit: 10 });

			expect(prisma.notice.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					skip: 20,
					take: 10,
				}),
			);
			expect(result.pagination.totalPages).toBe(5);
		});
	});

	describe("get", () => {
		it("returns notice by ID", async () => {
			vi.mocked(prisma.notice.findFirst).mockResolvedValue(mockNotice);

			const result = await repository.get("org_123", "NTC_123");

			expect(result.id).toBe("NTC_123");
			expect(result.name).toBe("Aviso SAT Enero 2024");
			expect(prisma.notice.findFirst).toHaveBeenCalledWith({
				where: { id: "NTC_123", organizationId: "org_123" },
			});
		});

		it("throws error if notice not found", async () => {
			vi.mocked(prisma.notice.findFirst).mockResolvedValue(null);

			await expect(repository.get("org_123", "NTC_999")).rejects.toThrow(
				"NOTICE_NOT_FOUND",
			);
		});
	});

	describe("getWithAlertSummary", () => {
		it("returns notice with alert statistics", async () => {
			vi.mocked(prisma.notice.findFirst).mockResolvedValue(mockNotice);
			vi.mocked(prisma.alert.findMany).mockResolvedValue([
				{
					...mockAlert,
					severity: "HIGH",
					status: "DETECTED",
					noticeId: "NTC_123",
				} as AlertWithRule,
				{
					...mockAlert,
					id: "alt_456",
					severity: "MEDIUM",
					status: "DETECTED",
					noticeId: "NTC_123",
				} as AlertWithRule,
			]);

			const result = await repository.getWithAlertSummary("org_123", "NTC_123");

			expect(result.id).toBe("NTC_123");
			expect(result.alertSummary.total).toBe(2);
			expect(result.alertSummary.bySeverity.HIGH).toBe(1);
			expect(result.alertSummary.bySeverity.MEDIUM).toBe(1);
		});
	});

	describe("create", () => {
		it("creates a new notice", async () => {
			vi.mocked(prisma.notice.create).mockResolvedValue(mockNotice);

			const result = await repository.create(
				{
					name: "Aviso SAT Enero 2024",
					year: 2024,
					month: 1,
				},
				"org_123",
				"user_123",
			);

			expect(result.id).toBe("NTC_123");
			expect(prisma.notice.create).toHaveBeenCalled();
		});
	});

	describe("patch", () => {
		it("updates an existing notice", async () => {
			// Mock ensureExists check
			vi.mocked(prisma.notice.findFirst).mockResolvedValue(mockNotice);
			vi.mocked(prisma.notice.update).mockResolvedValue({
				...mockNotice,
				name: "Updated Name",
			});

			const result = await repository.patch("org_123", "NTC_123", {
				name: "Updated Name",
			});

			expect(result.name).toBe("Updated Name");
			expect(prisma.notice.update).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: "NTC_123" },
				}),
			);
		});

		it("throws error if notice not found", async () => {
			vi.mocked(prisma.notice.findFirst).mockResolvedValue(null);

			await expect(
				repository.patch("org_123", "NTC_999", { name: "Test" }),
			).rejects.toThrow("NOTICE_NOT_FOUND");
		});
	});

	describe("delete", () => {
		it("deletes a draft notice", async () => {
			vi.mocked(prisma.notice.findFirst).mockResolvedValue(mockNotice);
			vi.mocked(prisma.alert.updateMany).mockResolvedValue({ count: 0 });
			vi.mocked(prisma.notice.delete).mockResolvedValue(mockNotice);

			await repository.delete("org_123", "NTC_123");

			expect(prisma.notice.delete).toHaveBeenCalledWith({
				where: { id: "NTC_123" },
			});
		});

		it("throws error when deleting non-draft notice", async () => {
			vi.mocked(prisma.notice.findFirst).mockResolvedValue(mockGeneratedNotice);

			await expect(repository.delete("org_123", "NTC_456")).rejects.toThrow(
				"CANNOT_DELETE_NON_DRAFT_NOTICE",
			);
		});

		it("throws error if notice not found", async () => {
			vi.mocked(prisma.notice.findFirst).mockResolvedValue(null);

			await expect(repository.delete("org_123", "NTC_999")).rejects.toThrow(
				"NOTICE_NOT_FOUND",
			);
		});
	});

	describe("countAlertsForPeriod", () => {
		it("counts alerts in the given period", async () => {
			vi.mocked(prisma.alert.findMany).mockResolvedValue([
				{ severity: "HIGH", status: "DETECTED" },
				{ severity: "HIGH", status: "DETECTED" },
				{ severity: "MEDIUM", status: "PENDING_REVIEW" },
			] as unknown as Alert[]);

			const result = await repository.countAlertsForPeriod(
				"org_123",
				new Date("2023-12-17"),
				new Date("2024-01-16"),
			);

			expect(result.total).toBe(3);
			expect(result.bySeverity.HIGH).toBe(2);
			expect(result.bySeverity.MEDIUM).toBe(1);
			expect(result.byStatus.DETECTED).toBe(2);
			expect(result.byStatus.PENDING_REVIEW).toBe(1);
			expect(prisma.alert.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "org_123",
						noticeId: null,
					}),
				}),
			);
		});

		it("returns empty counts when no alerts found", async () => {
			vi.mocked(prisma.alert.findMany).mockResolvedValue([]);

			const result = await repository.countAlertsForPeriod(
				"org_123",
				new Date("2023-12-17"),
				new Date("2024-01-16"),
			);

			expect(result.total).toBe(0);
			expect(result.bySeverity).toEqual({});
			expect(result.byStatus).toEqual({});
		});
	});

	describe("assignAlertsToNotice", () => {
		it("assigns alerts to a notice", async () => {
			vi.mocked(prisma.alert.updateMany).mockResolvedValue({ count: 10 });
			vi.mocked(prisma.notice.update).mockResolvedValue({
				...mockNotice,
				recordCount: 10,
			});

			const result = await repository.assignAlertsToNotice(
				"org_123",
				"NTC_123",
				new Date("2023-12-17"),
				new Date("2024-01-16"),
			);

			expect(result).toBe(10);
			expect(prisma.alert.updateMany).toHaveBeenCalledWith(
				expect.objectContaining({
					data: { noticeId: "NTC_123" },
				}),
			);
			expect(prisma.notice.update).toHaveBeenCalledWith({
				where: { id: "NTC_123" },
				data: { recordCount: 10 },
			});
		});
	});

	describe("getAlertsForNotice", () => {
		it("returns alerts for a notice", async () => {
			const alerts = [
				{ ...mockAlert, noticeId: "NTC_123" },
				{ ...mockAlert, id: "alt_456", noticeId: "NTC_123" },
			];
			vi.mocked(prisma.alert.findMany).mockResolvedValue(
				alerts as unknown as Alert[],
			);

			const result = await repository.getAlertsForNotice("org_123", "NTC_123");

			expect(result).toHaveLength(2);
			expect(prisma.alert.findMany).toHaveBeenCalledWith({
				where: { noticeId: "NTC_123", organizationId: "org_123" },
				include: { alertRule: true, client: true },
				orderBy: { createdAt: "asc" },
			});
		});
	});

	describe("markAsGenerated", () => {
		it("updates notice to generated status", async () => {
			vi.mocked(prisma.notice.findFirst).mockResolvedValue(mockNotice);
			vi.mocked(prisma.notice.update).mockResolvedValue(mockGeneratedNotice);
			vi.mocked(prisma.alert.updateMany).mockResolvedValue({ count: 5 });

			const result = await repository.markAsGenerated("org_123", "NTC_123", {
				xmlFileUrl: "https://storage.example.com/notices/ntc_123.xml",
				fileSize: 12345,
			});

			expect(result.status).toBe("GENERATED");
			expect(prisma.notice.update).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: "NTC_123" },
					data: expect.objectContaining({
						status: "GENERATED",
					}),
				}),
			);
			expect(prisma.alert.updateMany).toHaveBeenCalled();
		});

		it("throws error if notice not found", async () => {
			vi.mocked(prisma.notice.findFirst).mockResolvedValue(null);

			await expect(
				repository.markAsGenerated("org_123", "NTC_999", {}),
			).rejects.toThrow("NOTICE_NOT_FOUND");
		});
	});

	describe("markAsSubmitted", () => {
		it("updates notice to submitted status with folio", async () => {
			vi.mocked(prisma.notice.findFirst).mockResolvedValue(mockGeneratedNotice);
			vi.mocked(prisma.notice.update).mockResolvedValue(mockSubmittedNotice);
			vi.mocked(prisma.alert.updateMany).mockResolvedValue({ count: 5 });

			const result = await repository.markAsSubmitted(
				"org_123",
				"NTC_456",
				"SAT-2024-12345",
			);

			expect(result.status).toBe("SUBMITTED");
			expect(prisma.notice.update).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						status: "SUBMITTED",
						satFolioNumber: "SAT-2024-12345",
					}),
				}),
			);
		});

		it("marks as submitted without folio number", async () => {
			vi.mocked(prisma.notice.findFirst).mockResolvedValue(mockGeneratedNotice);
			vi.mocked(prisma.notice.update).mockResolvedValue({
				...mockGeneratedNotice,
				status: "SUBMITTED",
				submittedAt: new Date(),
			});
			vi.mocked(prisma.alert.updateMany).mockResolvedValue({ count: 5 });

			await repository.markAsSubmitted("org_123", "NTC_456");

			expect(prisma.notice.update).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						status: "SUBMITTED",
					}),
				}),
			);
		});

		it("throws error if notice is in draft status", async () => {
			vi.mocked(prisma.notice.findFirst).mockResolvedValue(mockNotice);

			await expect(
				repository.markAsSubmitted("org_123", "NTC_123"),
			).rejects.toThrow("NOTICE_MUST_BE_GENERATED_BEFORE_SUBMISSION");
		});

		it("throws error if notice not found", async () => {
			vi.mocked(prisma.notice.findFirst).mockResolvedValue(null);

			await expect(
				repository.markAsSubmitted("org_123", "NTC_999"),
			).rejects.toThrow("NOTICE_NOT_FOUND");
		});
	});

	describe("markAsAcknowledged", () => {
		it("updates notice to acknowledged status", async () => {
			vi.mocked(prisma.notice.findFirst).mockResolvedValue(mockSubmittedNotice);
			vi.mocked(prisma.notice.update).mockResolvedValue({
				...mockSubmittedNotice,
				status: "ACKNOWLEDGED",
				satFolioNumber: "SAT-ACK-2024-99999",
			});
			vi.mocked(prisma.alert.updateMany).mockResolvedValue({ count: 5 });

			const result = await repository.markAsAcknowledged(
				"org_123",
				"NTC_789",
				"SAT-ACK-2024-99999",
			);

			expect(result.status).toBe("ACKNOWLEDGED");
			expect(prisma.notice.update).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						status: "ACKNOWLEDGED",
						satFolioNumber: "SAT-ACK-2024-99999",
					}),
				}),
			);
		});

		it("throws error if notice is not submitted", async () => {
			vi.mocked(prisma.notice.findFirst).mockResolvedValue(mockGeneratedNotice);

			await expect(
				repository.markAsAcknowledged("org_123", "NTC_456", "SAT-ACK-123"),
			).rejects.toThrow("NOTICE_MUST_BE_SUBMITTED_BEFORE_ACKNOWLEDGMENT");
		});

		it("throws error if notice not found", async () => {
			vi.mocked(prisma.notice.findFirst).mockResolvedValue(null);

			await expect(
				repository.markAsAcknowledged("org_123", "NTC_999", "SAT-ACK-123"),
			).rejects.toThrow("NOTICE_NOT_FOUND");
		});
	});

	describe("existsForPeriod", () => {
		it("returns true if notice exists for period", async () => {
			vi.mocked(prisma.notice.count).mockResolvedValue(1);

			const result = await repository.existsForPeriod("org_123", "202401");

			expect(result).toBe(true);
			expect(prisma.notice.count).toHaveBeenCalledWith({
				where: { organizationId: "org_123", reportedMonth: "202401" },
			});
		});

		it("returns false if no notice exists for period", async () => {
			vi.mocked(prisma.notice.count).mockResolvedValue(0);

			const result = await repository.existsForPeriod("org_123", "202401");

			expect(result).toBe(false);
		});
	});
});
