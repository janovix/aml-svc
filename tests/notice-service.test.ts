import { describe, it, expect, beforeEach, vi } from "vitest";
import { NoticeService } from "../src/domain/notice/service";
import { calculateNoticePeriod } from "../src/domain/notice/types";
import { NoticeRepository } from "../src/domain/notice/repository";
import type {
	NoticeEntity,
	NoticeWithAlertSummary,
} from "../src/domain/notice/types";
import type { NoticeCreateInput } from "../src/domain/notice/schemas";

// Mock the repository
vi.mock("../src/domain/notice/repository");

describe("NoticeService", () => {
	const mockRepository = {
		list: vi.fn(),
		get: vi.fn(),
		getWithAlertSummary: vi.fn(),
		create: vi.fn(),
		patch: vi.fn(),
		delete: vi.fn(),
		countAlertsForPeriod: vi.fn(),
		assignAlertsToNotice: vi.fn(),
		updateFileUrl: vi.fn(),
		markAsGenerated: vi.fn(),
		markAsSubmitted: vi.fn(),
		markAsAcknowledged: vi.fn(),
		existsForPeriod: vi.fn(),
		getAlertsForNotice: vi.fn(),
	} as unknown as NoticeRepository;

	const organizationId = "org-123";
	const userId = "user-456";

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("calculateNoticePeriod (imported from types)", () => {
		it("should calculate correct period for January 2024", () => {
			const period = calculateNoticePeriod(2024, 1);

			// January 2024 period: Dec 17, 2023 to Jan 16, 2024
			expect(period.start.getUTCFullYear()).toBe(2023);
			expect(period.start.getUTCMonth()).toBe(11); // December (0-indexed)
			expect(period.start.getUTCDate()).toBe(17);

			expect(period.end.getUTCFullYear()).toBe(2024);
			expect(period.end.getUTCMonth()).toBe(0); // January
			expect(period.end.getUTCDate()).toBe(16);

			expect(period.reportedMonth).toBe("202401");
			expect(period.displayName).toBe("Enero 2024");
		});

		it("should calculate correct period for December 2024", () => {
			const period = calculateNoticePeriod(2024, 12);

			// December 2024 period: Nov 17, 2024 to Dec 16, 2024
			expect(period.start.getUTCFullYear()).toBe(2024);
			expect(period.start.getUTCMonth()).toBe(10); // November
			expect(period.start.getUTCDate()).toBe(17);

			expect(period.end.getUTCFullYear()).toBe(2024);
			expect(period.end.getUTCMonth()).toBe(11); // December
			expect(period.end.getUTCDate()).toBe(16);

			expect(period.reportedMonth).toBe("202412");
			expect(period.displayName).toBe("Diciembre 2024");
		});

		it("should handle year boundary (February)", () => {
			const period = calculateNoticePeriod(2024, 2);

			// February 2024 period: Jan 17, 2024 to Feb 16, 2024
			expect(period.start.getUTCFullYear()).toBe(2024);
			expect(period.start.getUTCMonth()).toBe(0); // January
			expect(period.start.getUTCDate()).toBe(17);

			expect(period.end.getUTCFullYear()).toBe(2024);
			expect(period.end.getUTCMonth()).toBe(1); // February
			expect(period.end.getUTCDate()).toBe(16);

			expect(period.reportedMonth).toBe("202402");
		});
	});

	describe("create", () => {
		// New schema uses year/month instead of explicit period dates
		const createInput: NoticeCreateInput = {
			name: "Aviso Enero 2024",
			year: 2024,
			month: 1,
			notes: "Test notice",
		};

		const mockNotice: NoticeEntity = {
			id: "NOTICE_abc123",
			organizationId,
			name: createInput.name,
			status: "DRAFT",
			periodStart: "2023-12-17T00:00:00.000Z",
			periodEnd: "2024-01-16T23:59:59.999Z",
			reportedMonth: "202401",
			recordCount: 0,
			xmlFileUrl: null,
			fileSize: null,
			generatedAt: null,
			submittedAt: null,
			satFolioNumber: null,
			createdBy: userId,
			notes: createInput.notes ?? null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		it("should create a notice and assign alerts", async () => {
			vi.mocked(mockRepository.existsForPeriod).mockResolvedValue(false);
			vi.mocked(mockRepository.create).mockResolvedValue(mockNotice);
			vi.mocked(mockRepository.assignAlertsToNotice).mockResolvedValue(5);

			const service = new NoticeService(mockRepository);
			const result = await service.create(createInput, organizationId, userId);

			expect(result).toEqual({ ...mockNotice, recordCount: 5 });
			expect(mockRepository.existsForPeriod).toHaveBeenCalledWith(
				organizationId,
				"202401", // calculated from year/month
			);
			expect(mockRepository.create).toHaveBeenCalled();
			expect(mockRepository.assignAlertsToNotice).toHaveBeenCalled();
		});

		it("should throw error if notice already exists for period", async () => {
			vi.mocked(mockRepository.existsForPeriod).mockResolvedValue(true);

			const service = new NoticeService(mockRepository);

			await expect(
				service.create(createInput, organizationId, userId),
			).rejects.toThrow("NOTICE_ALREADY_EXISTS_FOR_PERIOD");
		});
	});

	describe("markAsGenerated", () => {
		const noticeId = "NOTICE_abc123";

		const mockNotice: NoticeEntity = {
			id: noticeId,
			organizationId,
			name: "Aviso Test",
			status: "DRAFT",
			periodStart: "2023-12-17T00:00:00Z",
			periodEnd: "2024-01-16T23:59:59Z",
			reportedMonth: "202401",
			recordCount: 5,
			xmlFileUrl: null,
			fileSize: null,
			generatedAt: null,
			submittedAt: null,
			satFolioNumber: null,
			createdBy: null,
			notes: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		it("should mark notice as generated", async () => {
			vi.mocked(mockRepository.markAsGenerated).mockResolvedValue({
				...mockNotice,
				status: "GENERATED",
				generatedAt: new Date().toISOString(),
			});

			const service = new NoticeService(mockRepository);
			const result = await service.markAsGenerated(organizationId, noticeId, {
				xmlFileUrl: "https://example.com/file.xml",
				fileSize: 1024,
			});

			expect(result.status).toBe("GENERATED");
			expect(mockRepository.markAsGenerated).toHaveBeenCalledWith(
				organizationId,
				noticeId,
				{
					xmlFileUrl: "https://example.com/file.xml",
					fileSize: 1024,
				},
			);
		});
	});

	describe("markAsSubmitted", () => {
		const noticeId = "NOTICE_abc123";

		const mockGeneratedNotice: NoticeEntity = {
			id: noticeId,
			organizationId,
			name: "Aviso Test",
			status: "GENERATED",
			periodStart: "2023-12-17T00:00:00Z",
			periodEnd: "2024-01-16T23:59:59Z",
			reportedMonth: "202401",
			recordCount: 5,
			xmlFileUrl: "https://example.com/file.xml",
			fileSize: 1024,
			generatedAt: new Date().toISOString(),
			submittedAt: null,
			satFolioNumber: null,
			createdBy: null,
			notes: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		it("should mark notice as submitted", async () => {
			vi.mocked(mockRepository.markAsSubmitted).mockResolvedValue({
				...mockGeneratedNotice,
				status: "SUBMITTED",
				submittedAt: new Date().toISOString(),
				satFolioNumber: "SAT-12345",
			});

			const service = new NoticeService(mockRepository);
			const result = await service.markAsSubmitted(
				organizationId,
				noticeId,
				"SAT-12345",
			);

			expect(result.status).toBe("SUBMITTED");
			expect(result.satFolioNumber).toBe("SAT-12345");
			expect(mockRepository.markAsSubmitted).toHaveBeenCalledWith(
				organizationId,
				noticeId,
				"SAT-12345",
			);
		});
	});

	describe("delete", () => {
		const noticeId = "NOTICE_abc123";

		it("should delete a notice", async () => {
			vi.mocked(mockRepository.delete).mockResolvedValue(undefined);

			const service = new NoticeService(mockRepository);
			await expect(
				service.delete(organizationId, noticeId),
			).resolves.toBeUndefined();

			expect(mockRepository.delete).toHaveBeenCalledWith(
				organizationId,
				noticeId,
			);
		});
	});

	describe("getWithSummary", () => {
		const noticeId = "NOTICE_abc123";

		const mockNoticeWithSummary: NoticeWithAlertSummary = {
			id: noticeId,
			organizationId,
			name: "Aviso Test",
			status: "DRAFT",
			periodStart: "2023-12-17T00:00:00Z",
			periodEnd: "2024-01-16T23:59:59Z",
			reportedMonth: "202401",
			recordCount: 5,
			xmlFileUrl: null,
			fileSize: null,
			generatedAt: null,
			submittedAt: null,
			satFolioNumber: null,
			createdBy: null,
			notes: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			alertSummary: {
				total: 5,
				bySeverity: { HIGH: 2, MEDIUM: 3 },
				byStatus: { DETECTED: 5 },
				byRule: [],
			},
		};

		it("should get notice with alert summary", async () => {
			vi.mocked(mockRepository.getWithAlertSummary).mockResolvedValue(
				mockNoticeWithSummary,
			);

			const service = new NoticeService(mockRepository);
			const result = await service.getWithSummary(organizationId, noticeId);

			expect(result.alertSummary.total).toBe(5);
			expect(mockRepository.getWithAlertSummary).toHaveBeenCalledWith(
				organizationId,
				noticeId,
			);
		});
	});
});
