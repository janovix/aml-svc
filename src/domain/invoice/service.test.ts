import { describe, expect, it, vi, beforeEach } from "vitest";
import { productionTenant } from "../../lib/tenant-context";
import { InvoiceService } from "./service";
import { InvoiceRepository } from "./repository";

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
});
