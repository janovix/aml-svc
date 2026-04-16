import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { productionTenant } from "../../lib/tenant-context";
import { OperationService, DuplicateOperationError } from "./service";
import { OperationRepository } from "./repository";
import type { ActivityCode } from "./types";

describe("OperationService UMA thresholds", () => {
	let service: OperationService;

	beforeEach(() => {
		service = new OperationService({} as PrismaClient);
	});

	it("getCurrentUmaValue returns fixed UMA", () => {
		expect(service.getCurrentUmaValue()).toBe(117.31);
	});

	it("getNoticeThresholdUma returns 0 for ALWAYS notice activities", () => {
		expect(service.getNoticeThresholdUma("SPR" as ActivityCode)).toBe(0);
		expect(service.getNoticeThresholdUma("FES" as ActivityCode)).toBe(0);
	});

	it("getIdentificationThresholdUma returns 0 for ALWAYS identification", () => {
		expect(service.getIdentificationThresholdUma("CHV" as ActivityCode)).toBe(
			0,
		);
	});

	it("getNoticeThresholdMxn multiplies UMA by numeric notice threshold", () => {
		// VEH notice: 6420 UMA * 117.31
		expect(service.getNoticeThresholdMxn("VEH" as ActivityCode)).toBeCloseTo(
			6420 * 117.31,
			1,
		);
	});

	it("exceedsNoticeThreshold compares amount to MXN threshold", () => {
		const threshold = service.getNoticeThresholdMxn("JYS" as ActivityCode);
		expect(
			service.exceedsNoticeThreshold("JYS" as ActivityCode, threshold),
		).toBe(true);
		expect(
			service.exceedsNoticeThreshold("JYS" as ActivityCode, threshold - 0.01),
		).toBe(false);
	});

	it("getAllThresholds includes every activity code", () => {
		const all = service.getAllThresholds();
		expect(Object.keys(all)).toContain("VEH");
		expect(all.VEH.noticeMxn).toBe(
			(service.getNoticeThresholdUma("VEH" as ActivityCode) || 0) * 117.31,
		);
	});

	it("deprecated aliases delegate to notice thresholds", () => {
		expect(service.getUmaThreshold("INM" as ActivityCode)).toBe(
			service.getNoticeThresholdUma("INM" as ActivityCode),
		);
		expect(service.getThresholdMxn("INM" as ActivityCode)).toBe(
			service.getNoticeThresholdMxn("INM" as ActivityCode),
		);
		expect(service.exceedsThreshold("INM" as ActivityCode, 999999)).toBe(
			service.exceedsNoticeThreshold("INM" as ActivityCode, 999999),
		);
	});
});

describe("OperationService CRUD and stats", () => {
	let mockPrisma: PrismaClient;
	let service: OperationService;

	beforeEach(() => {
		vi.restoreAllMocks();
		mockPrisma = {} as PrismaClient;
		service = new OperationService(mockPrisma);
	});

	it("create throws DuplicateOperationError when import hash exists", async () => {
		const tenant = productionTenant("org-1");
		vi.spyOn(
			OperationRepository.prototype,
			"existsByImportHash",
		).mockResolvedValue(true);

		await expect(
			service.create(tenant, {
				clientId: "c1",
				activityCode: "VEH",
				operationDate: "2024-06-01",
				branchPostalCode: "12345",
				amount: "100",
				currencyCode: "MXN",
				payments: [
					{
						paymentDate: "2024-06-01",
						paymentFormCode: "01",
						currencyCode: "MXN",
						amount: "100",
					},
				],
				importHash: "dup-hash",
			} as Parameters<OperationService["create"]>[1]),
		).rejects.toThrow(DuplicateOperationError);

		vi.spyOn(OperationRepository.prototype, "existsByImportHash").mockRestore();
	});

	it("create delegates to repository when hash is unique", async () => {
		const tenant = productionTenant("org-1");
		const entity = { id: "op-1" };
		vi.spyOn(
			OperationRepository.prototype,
			"existsByImportHash",
		).mockResolvedValue(false);
		vi.spyOn(OperationRepository.prototype, "create").mockResolvedValue(
			entity as never,
		);

		const input = {
			clientId: "c1",
			activityCode: "VEH" as const,
			operationDate: "2024-06-01",
			branchPostalCode: "12345",
			amount: "100",
			currencyCode: "MXN",
			payments: [
				{
					paymentDate: "2024-06-01",
					paymentFormCode: "01",
					currencyCode: "MXN",
					amount: "100",
				},
			],
			importHash: "new-hash",
		} as Parameters<OperationService["create"]>[1];

		const result = await service.create(tenant, input);
		expect(result).toEqual(entity);

		vi.spyOn(OperationRepository.prototype, "existsByImportHash").mockRestore();
		vi.spyOn(OperationRepository.prototype, "create").mockRestore();
	});

	it("calculateAccumulatedAmount sums operations and compares to notice threshold", async () => {
		const tenant = productionTenant("org-1");
		vi.spyOn(OperationRepository.prototype, "findByClientId").mockResolvedValue(
			[{ amountMxn: "50.5" }, { amountMxn: "49.5" }] as never,
		);

		const out = await service.calculateAccumulatedAmount(
			tenant,
			"client-1",
			"JYS" as ActivityCode,
			new Date("2024-01-01"),
			new Date("2024-12-31"),
		);

		expect(out.totalMxn).toBe(100);
		expect(out.operationCount).toBe(2);
		expect(typeof out.exceedsThreshold).toBe("boolean");

		vi.spyOn(OperationRepository.prototype, "findByClientId").mockRestore();
	});
});
