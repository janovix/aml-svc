import { describe, it, expect, beforeEach, vi } from "vitest";
import { OrganizationSettingsService } from "./service";
import type { OrganizationSettingsRepository } from "./repository";
import type { OrganizationSettingsEntity } from "./types";

describe("OrganizationSettingsService", () => {
	let service: OrganizationSettingsService;
	let mockRepository: OrganizationSettingsRepository;

	const mockSettings: OrganizationSettingsEntity = {
		id: "org-settings-123",
		organizationId: "org-123",
		obligatedSubjectKey: "ABC123456DE7",
		activityKey: "VEH",
		selfServiceMode: "disabled",
		selfServiceExpiryHours: 72,
		selfServiceSendEmail: true,
		selfServiceRequiredSections: null,
		createdAt: "2024-01-01T00:00:00.000Z",
		updatedAt: "2024-01-01T00:00:00.000Z",
	};

	beforeEach(() => {
		mockRepository = {
			findByOrganizationId: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			upsert: vi.fn(),
		} as unknown as OrganizationSettingsRepository;

		service = new OrganizationSettingsService(mockRepository);
	});

	describe("getByOrganizationId", () => {
		it("returns settings when they exist", async () => {
			vi.mocked(mockRepository.findByOrganizationId).mockResolvedValue(
				mockSettings,
			);

			const result = await service.getByOrganizationId("org-123");

			expect(result).toEqual(mockSettings);
			expect(mockRepository.findByOrganizationId).toHaveBeenCalledWith(
				"org-123",
			);
		});

		it("returns null when settings do not exist", async () => {
			vi.mocked(mockRepository.findByOrganizationId).mockResolvedValue(null);

			const result = await service.getByOrganizationId("org-nonexistent");

			expect(result).toBeNull();
			expect(mockRepository.findByOrganizationId).toHaveBeenCalledWith(
				"org-nonexistent",
			);
		});
	});

	describe("createOrUpdate", () => {
		it("creates or updates settings via upsert", async () => {
			vi.mocked(mockRepository.upsert).mockResolvedValue(mockSettings);

			const data = {
				obligatedSubjectKey: "ABC123456DE7",
				activityKey: "VEH",
			};

			const result = await service.createOrUpdate("org-123", data);

			expect(result).toEqual(mockSettings);
			expect(mockRepository.upsert).toHaveBeenCalledWith("org-123", data);
		});

		it("handles different activity keys", async () => {
			const updatedSettings: OrganizationSettingsEntity = {
				...mockSettings,
				activityKey: "INM",
			};
			vi.mocked(mockRepository.upsert).mockResolvedValue(updatedSettings);

			const data = {
				obligatedSubjectKey: "ABC123456DE7",
				activityKey: "INM",
			};

			const result = await service.createOrUpdate("org-123", data);

			expect(result.activityKey).toBe("INM");
			expect(mockRepository.upsert).toHaveBeenCalledWith("org-123", data);
		});
	});

	describe("update", () => {
		it("updates settings with partial data", async () => {
			const updatedSettings: OrganizationSettingsEntity = {
				...mockSettings,
				activityKey: "JOY",
				updatedAt: "2024-06-01T00:00:00.000Z",
			};
			vi.mocked(mockRepository.update).mockResolvedValue(updatedSettings);

			const data = { activityKey: "JOY" };
			const result = await service.update("org-123", data);

			expect(result.activityKey).toBe("JOY");
			expect(mockRepository.update).toHaveBeenCalledWith("org-123", data);
		});

		it("updates only obligatedSubjectKey", async () => {
			const updatedSettings: OrganizationSettingsEntity = {
				...mockSettings,
				obligatedSubjectKey: "XYZ987654AB1",
				updatedAt: "2024-06-01T00:00:00.000Z",
			};
			vi.mocked(mockRepository.update).mockResolvedValue(updatedSettings);

			const data = { obligatedSubjectKey: "XYZ987654AB1" };
			const result = await service.update("org-123", data);

			expect(result.obligatedSubjectKey).toBe("XYZ987654AB1");
			expect(mockRepository.update).toHaveBeenCalledWith("org-123", data);
		});
	});
});
