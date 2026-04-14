import { describe, expect, it, beforeEach, vi } from "vitest";
import { ShareholderService, ValidationError } from "./service";
import type { ShareholderRepository } from "./repository";
import type { ShareholderEntity } from "./types";

describe("ShareholderService", () => {
	let service: ShareholderService;
	let mockRepo: ShareholderRepository;
	const clientId = "CLT123456789";

	const personEntity = (
		overrides: Partial<ShareholderEntity> = {},
	): ShareholderEntity => ({
		id: "SHR111111111",
		clientId,
		parentShareholderId: null,
		entityType: "PERSON",
		firstName: "A",
		lastName: "B",
		ownershipPercentage: 40,
		createdAt: "2024-01-01T00:00:00.000Z",
		updatedAt: "2024-01-01T00:00:00.000Z",
		...overrides,
	});

	const companyParent = (
		overrides: Partial<ShareholderEntity> = {},
	): ShareholderEntity =>
		personEntity({
			id: "SHR222222222",
			entityType: "COMPANY",
			businessName: "Parent Co",
			firstName: null,
			lastName: null,
			parentShareholderId: null,
			ownershipPercentage: 60,
			...overrides,
		});

	beforeEach(() => {
		mockRepo = {
			list: vi.fn(),
			getById: vi.fn(),
			getByIdOnly: vi.fn(),
			getSumOfOwnershipByParent: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			patch: vi.fn(),
			delete: vi.fn(),
			listByParent: vi.fn(),
		} as unknown as ShareholderRepository;

		service = new ShareholderService({});
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(service as any).repo = mockRepo;
	});

	it("create validates depth and rejects level-3", async () => {
		const level2 = personEntity({
			id: "SHR333333333",
			parentShareholderId: "SHR222222222",
		});
		vi.mocked(mockRepo.getByIdOnly).mockResolvedValue(level2);

		await expect(
			service.create(clientId, {
				entityType: "PERSON",
				parentShareholderId: "SHR333333333",
				firstName: "X",
				lastName: "Y",
				ownershipPercentage: 10,
			}),
		).rejects.toThrow(ValidationError);
	});

	it("create rejects non-company parent for sub-shareholder", async () => {
		const personParent = personEntity({ id: "SHR444444444" });
		vi.mocked(mockRepo.getByIdOnly).mockResolvedValue(personParent);

		await expect(
			service.create(clientId, {
				entityType: "PERSON",
				parentShareholderId: "SHR444444444",
				firstName: "X",
				lastName: "Y",
				ownershipPercentage: 10,
			}),
		).rejects.toThrow(/Only company shareholders/);
	});

	it("create rejects when parent missing", async () => {
		vi.mocked(mockRepo.getByIdOnly).mockResolvedValue(null);
		await expect(
			service.create(clientId, {
				entityType: "PERSON",
				parentShareholderId: "SHR999999999",
				firstName: "X",
				lastName: "Y",
				ownershipPercentage: 10,
			}),
		).rejects.toThrow(/Parent shareholder not found/);
	});

	it("create rejects ownership cap over 100%", async () => {
		vi.mocked(mockRepo.getSumOfOwnershipByParent).mockResolvedValue(90);
		await expect(
			service.create(clientId, {
				entityType: "PERSON",
				firstName: "X",
				lastName: "Y",
				ownershipPercentage: 20,
			}),
		).rejects.toThrow(/exceed 100%/);
	});

	it("create succeeds when under cap", async () => {
		vi.mocked(mockRepo.getSumOfOwnershipByParent).mockResolvedValue(50);
		const created = personEntity({
			id: "SHR555555555",
			ownershipPercentage: 30,
		});
		vi.mocked(mockRepo.create).mockResolvedValue(created);

		const out = await service.create(clientId, {
			entityType: "PERSON",
			firstName: "X",
			lastName: "Y",
			ownershipPercentage: 30,
		});
		expect(out.id).toBe("SHR555555555");
		expect(mockRepo.create).toHaveBeenCalled();
	});

	it("update excludes existing ownership from sum", async () => {
		vi.mocked(mockRepo.getSumOfOwnershipByParent).mockResolvedValue(80);
		vi.mocked(mockRepo.getById).mockImplementation(async (_cid, sid) => {
			if (sid === "SHR666666666")
				return personEntity({ id: "SHR666666666", ownershipPercentage: 30 });
			return null;
		});
		vi.mocked(mockRepo.update).mockResolvedValue(
			personEntity({ id: "SHR666666666", ownershipPercentage: 50 }),
		);

		const out = await service.update(clientId, "SHR666666666", {
			entityType: "PERSON",
			firstName: "A",
			lastName: "B",
			ownershipPercentage: 50,
		});
		expect(out.ownershipPercentage).toBe(50);
	});

	it("getShareholderDisplayName formats PERSON and COMPANY", () => {
		expect(
			service.getShareholderDisplayName(
				personEntity({
					firstName: "Juan",
					lastName: "Pérez",
					secondLastName: "García",
				}),
			),
		).toContain("Juan");
		expect(
			service.getShareholderDisplayName(
				companyParent({ businessName: "Acme SA" }),
			),
		).toBe("Acme SA");
		expect(
			service.getShareholderDisplayName(
				companyParent({ businessName: null, firstName: null, lastName: null }),
			),
		).toBe("Unknown Company");
	});
});
