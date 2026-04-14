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

	it("patch throws when not found", async () => {
		vi.mocked(mockRepo.getById).mockResolvedValue(null);
		await expect(
			service.patch(clientId, "BC123456789", { firstName: "A" }),
		).rejects.toThrow(ValidationError);
	});

	it("resolveDocIds sets null for unresolvable doc_ ids", async () => {
		const db = {
			clientDocument: {
				findMany: vi.fn().mockResolvedValue([]),
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
			idCopyDocId: "doc_unknown",
		});
		expect(db.clientDocument.findMany).toHaveBeenCalled();
		expect(mockRepo.create).toHaveBeenCalledWith(
			clientId,
			expect.objectContaining({ idCopyDocId: null }),
		);
		expect(out.idCopyDocId).toBeNull();
	});

	it("resolveDocIds resolves multiple doc_ fields in one input", async () => {
		const db = {
			clientDocument: {
				findMany: vi.fn().mockResolvedValue([
					{ id: "DOC11111111", docSvcDocumentId: "doc_a" },
					{ id: "DOC22222222", docSvcDocumentId: "doc_b" },
				]),
			},
		};
		const s = new BeneficialControllerService(db);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(s as any).repo = mockRepo;
		vi.mocked(mockRepo.create).mockImplementation(async (_cid, input) =>
			entity({
				idCopyDocId: input.idCopyDocId as string | null,
				curpCopyDocId: input.curpCopyDocId as string | null,
			}),
		);

		const out = await s.create(clientId, {
			bcType: "SHAREHOLDER",
			identificationCriteria: "BENEFIT",
			firstName: "A",
			lastName: "B",
			idCopyDocId: "doc_a",
			curpCopyDocId: "doc_b",
		});
		expect(out.idCopyDocId).toBe("DOC11111111");
		expect(out.curpCopyDocId).toBe("DOC22222222");
	});

	it("resolveDocIds filters rows with null docSvcDocumentId", async () => {
		const db = {
			clientDocument: {
				findMany: vi.fn().mockResolvedValue([
					{ id: "DOC33333333", docSvcDocumentId: null },
					{ id: "DOC44444444", docSvcDocumentId: "doc_match" },
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
			idCopyDocId: "doc_match",
		});
		expect(out.idCopyDocId).toBe("DOC44444444");
	});

	it("resolveDocIds works on update path", async () => {
		const db = {
			clientDocument: {
				findMany: vi
					.fn()
					.mockResolvedValue([
						{ id: "DOC55555555", docSvcDocumentId: "doc_x" },
					]),
			},
		};
		const s = new BeneficialControllerService(db);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(s as any).repo = mockRepo;
		vi.mocked(mockRepo.getById).mockResolvedValue(entity());
		vi.mocked(mockRepo.update).mockImplementation(async (_cid, _id, input) =>
			entity({ idCopyDocId: input.idCopyDocId as string | null }),
		);

		const out = await s.update(clientId, "BC123456789", {
			bcType: "SHAREHOLDER",
			identificationCriteria: "BENEFIT",
			firstName: "A",
			lastName: "B",
			idCopyDocId: "doc_x",
		});
		expect(out.idCopyDocId).toBe("DOC55555555");
	});

	it("resolveDocIds works on patch path", async () => {
		const db = {
			clientDocument: {
				findMany: vi
					.fn()
					.mockResolvedValue([
						{ id: "DOC66666666", docSvcDocumentId: "doc_y" },
					]),
			},
		};
		const s = new BeneficialControllerService(db);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(s as any).repo = mockRepo;
		vi.mocked(mockRepo.getById).mockResolvedValue(entity());
		vi.mocked(mockRepo.patch).mockImplementation(async (_cid, _id, input) =>
			entity({ idCopyDocId: input.idCopyDocId as string | null }),
		);

		const out = await s.patch(clientId, "BC123456789", {
			idCopyDocId: "doc_y",
		});
		expect(out.idCopyDocId).toBe("DOC66666666");
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
