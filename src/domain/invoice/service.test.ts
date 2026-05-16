import { describe, expect, it, vi, beforeEach } from "vitest";
import { productionTenant } from "../../lib/tenant-context";
import { InvoiceService } from "./service";
import { InvoiceRepository } from "./repository";
import { CfdiV4Parser } from "./parser/cfdi-v4";

describe("InvoiceService", () => {
	let prisma: Record<string, unknown>;
	let service: InvoiceService;

	beforeEach(() => {
		prisma = {};
		service = new InvoiceService(prisma as never);
		vi.restoreAllMocks();
	});

	it("create delegates to repository", async () => {
		const tenant = productionTenant("org-1");
		const entity = { id: "inv-1" };
		vi.spyOn(InvoiceRepository.prototype, "create").mockResolvedValue(
			entity as never,
		);

		const input = {
			clientId: "c1",
			currencyCode: "MXN",
			totalAmount: "100",
		};

		const result = await service.create(tenant, input as never);

		expect(result).toEqual(entity);
		expect(InvoiceRepository.prototype.create).toHaveBeenCalledWith(
			tenant,
			input,
		);
	});

	it("getById delegates to findById", async () => {
		const tenant = productionTenant("org-1");
		vi.spyOn(InvoiceRepository.prototype, "findById").mockResolvedValue(null);

		await service.getById(tenant, "inv-1");

		expect(InvoiceRepository.prototype.findById).toHaveBeenCalledWith(
			tenant,
			"inv-1",
		);
	});

	it("parseAndCreate throws when UUID already exists", async () => {
		const tenant = productionTenant("org-1");
		vi.spyOn(CfdiV4Parser.prototype, "parse").mockReturnValue({
			TimbreFiscalDigital: { UUID: "dup-uuid" },
		} as never);
		vi.spyOn(InvoiceRepository.prototype, "findByUuid").mockResolvedValue({
			id: "existing",
		} as never);

		await expect(
			service.parseAndCreate(tenant, {
				xmlContent: "<cfdi/>",
				notes: null,
			} as never),
		).rejects.toThrow(/already exists/);
	});

	it("list delegates to repository", async () => {
		const tenant = productionTenant("org-1");
		vi.spyOn(InvoiceRepository.prototype, "list").mockResolvedValue({
			data: [],
			meta: { total: 0, page: 1, limit: 10 },
		} as never);
		await service.list(tenant, { page: 2 } as never);
		expect(InvoiceRepository.prototype.list).toHaveBeenCalledWith(tenant, {
			page: 2,
		});
	});

	it("delete delegates to softDelete", async () => {
		const tenant = productionTenant("org-1");
		vi.spyOn(InvoiceRepository.prototype, "softDelete").mockResolvedValue(true);
		await service.delete(tenant, "inv-1");
		expect(InvoiceRepository.prototype.softDelete).toHaveBeenCalledWith(
			tenant,
			"inv-1",
		);
	});
});
