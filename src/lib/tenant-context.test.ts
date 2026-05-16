import { describe, expect, it } from "vitest";

import {
	orgEnvWhere,
	productionTenant,
	tenantBinds,
	withEnvScope,
	type TenantContext,
} from "./tenant-context";

describe("tenant-context", () => {
	it("withEnvScope appends environment bind placeholder", () => {
		expect(
			withEnvScope(
				"SELECT * FROM clients WHERE organization_id = ? AND deleted_at IS NULL",
			),
		).toBe(
			"SELECT * FROM clients WHERE organization_id = ? AND deleted_at IS NULL AND environment = ?",
		);
	});

	it("orgEnvWhere builds column-qualified clause", () => {
		expect(orgEnvWhere()).toBe("organization_id = ? AND environment = ?");
		expect(orgEnvWhere("c")).toBe(
			"c.organization_id = ? AND c.environment = ?",
		);
	});

	it("tenantBinds and productionTenant", () => {
		const ctx: TenantContext = {
			organizationId: "o1",
			environment: "staging",
		};
		expect(tenantBinds(ctx)).toEqual(["o1", "staging"]);
		expect(productionTenant("o2")).toEqual({
			organizationId: "o2",
			environment: "production",
		});
	});
});
