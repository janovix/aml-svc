import { describe, expect, it, beforeEach, vi } from "vitest";
import { BeneficialControllerService, ValidationError } from "./service";
import type { BeneficialControllerRepository } from "./repository";
import type { BeneficialControllerEntity } from "./types";

describe("BeneficialControllerService", () => {
	let service: BeneficialControllerService;
	let mockRepo: BeneficialControllerRepository;
	const clientId = "CLT123456789";

	const entity = (
		overrides: Partial<BeneficialControllerEntity> = {},
	): BeneficialControllerEntity => ({
		id: "BC123456789",
		clientId,
		bcType: "SHAREHOLDER",
		identificationCriteria: "BENEFIT",
		isLegalRepresentative: false,
		firstName: "A",
		lastName: "B",
		createdAt: "2024-01-01T00:00:00.000Z",
		updatedAt: "2024-01-01T00:00:00.000Z",
		...overrides,
	});

	beforeEach(() => {
		mockRepo = {
			list: vi.fn(),
			getById: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			patch: vi.fn(),
			delete: vi.fn(),
			findByShareholderId: vi.fn(),
			updateScreening: vi.fn(),
		} as unknown as BeneficialControllerRepository;

		const db = {
			clientDocument: {
				findMany: vi.fn().mockResolvedValue([]),
			},
		};
		service = new BeneficialControllerService(db);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(service as any).repo = mockRepo;
	});

	it("update throws when not found", async () => {
		vi.mocked(mockRepo.getById).mockResolvedValue(null);
		await expect(
			service.update(clientId, "BC123456789", {
				bcType: "SHAREHOLDER",
				identificationCriteria: "BENEFIT",
				firstName: "A",
				lastName: "B",
			}),
		).rejects.toThrow(ValidationError);
	});

	it("create resolves doc_ ids to internal ids via prisma", async () => {
		const db = {
			clientDocument: {
				findMany: vi
					.fn()
					.mockResolvedValue([
						{ id: "DOC12345678", docSvcDocumentId: "doc_abc" },
					]),
			},
		};
		const s = new BeneficialControllerService(db);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(s as any).repo = mockRepo;
		vi.mocked(mockRepo.create).mockImplementation(async (_cid, input) =>
			entity({ idCopyDocId: input.idCopyDocId as string | null }),
		);

		const out = await s.create(clientId, {
			bcType: "SHAREHOLDER",
			identificationCriteria: "BENEFIT",
			firstName: "A",
			lastName: "B",
			idCopyDocId: "doc_abc",
		});
		expect(db.clientDocument.findMany).toHaveBeenCalled();
		expect(mockRepo.create).toHaveBeenCalledWith(
			clientId,
			expect.objectContaining({ idCopyDocId: "DOC12345678" }),
		);
		expect(out.idCopyDocId).toBe("DOC12345678");
	});

	it("create leaves internal DOC ids unchanged", async () => {
		const db = { clientDocument: { findMany: vi.fn() } };
		const s = new BeneficialControllerService(db);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(s as any).repo = mockRepo;
		vi.mocked(mockRepo.create).mockResolvedValue(entity());

		await s.create(clientId, {
			bcType: "SHAREHOLDER",
			identificationCriteria: "BENEFIT",
			firstName: "A",
			lastName: "B",
			idCopyDocId: "DOC99999999",
		});
		expect(db.clientDocument.findMany).not.toHaveBeenCalled();
	});

	it("getBCFullName joins names", () => {
		expect(
			service.getBCFullName(
				entity({
					firstName: "Juan",
					lastName: "Pérez",
					secondLastName: "García",
				}),
			),
		).toContain("Juan");
	});
});
