import { describe, it, expect } from "vitest";
import {
	mapPrismaAlert,
	mapPrismaAlertRule,
	mapPrismaAlertRuleConfig,
	mapAlertRuleCreateInputToPrisma,
	mapAlertRulePatchInputToPrisma,
	mapAlertRuleConfigCreateInputToPrisma,
	mapAlertCreateInputToPrisma,
	mapAlertPatchInputToPrisma,
} from "./mappers";

describe("alert mappers", () => {
	const baseDate = new Date("2024-01-01T00:00:00.000Z");

	it("mapPrismaAlert maps enums and JSON metadata", () => {
		const entity = mapPrismaAlert({
			id: "a1",
			organizationId: "o1",
			alertRuleId: "r1",
			clientId: "c1",
			status: "DETECTED",
			severity: "HIGH",
			idempotencyKey: "ik",
			contextHash: "ch",
			metadata: '{"x":1}',
			operationId: null,
			activityCode: "VEH",
			isManual: false,
			submissionDeadline: baseDate,
			fileGeneratedAt: null,
			submittedAt: null,
			satAcknowledgmentReceipt: null,
			satFolioNumber: null,
			isOverdue: false,
			notes: null,
			reviewedAt: null,
			reviewedBy: null,
			cancelledAt: null,
			cancelledBy: null,
			cancellationReason: null,
			createdAt: baseDate,
			updatedAt: baseDate,
		} as never);
		expect(entity.status).toBe("DETECTED");
		expect(entity.severity).toBe("HIGH");
		expect(entity.metadata).toEqual({ x: 1 });
		expect(entity.createdAt).toBe(baseDate.toISOString());
	});

	it("mapPrismaAlert tolerates invalid metadata JSON", () => {
		const entity = mapPrismaAlert({
			id: "a1",
			organizationId: "o1",
			alertRuleId: "r1",
			clientId: "c1",
			status: "DETECTED",
			severity: "LOW",
			idempotencyKey: "ik",
			contextHash: "ch",
			metadata: "not-json",
			operationId: null,
			activityCode: "VEH",
			isManual: true,
			submissionDeadline: null,
			fileGeneratedAt: null,
			submittedAt: null,
			satAcknowledgmentReceipt: null,
			satFolioNumber: null,
			isOverdue: true,
			notes: null,
			reviewedAt: null,
			reviewedBy: null,
			cancelledAt: null,
			cancelledBy: null,
			cancellationReason: null,
			createdAt: baseDate,
			updatedAt: baseDate,
		} as never);
		expect(entity.metadata).toEqual({});
	});

	it("mapPrismaAlertRule and mapPrismaAlertRuleConfig", () => {
		const rule = mapPrismaAlertRule({
			id: "rule1",
			organizationId: "o1",
			name: "n",
			description: "d",
			active: true,
			severity: "MEDIUM",
			ruleType: "THRESHOLD",
			isManualOnly: false,
			activityCode: "VEH",
			metadata: null,
			createdAt: baseDate,
			updatedAt: baseDate,
		} as never);
		expect(rule.active).toBe(true);

		const cfg = mapPrismaAlertRuleConfig({
			id: "cfg1",
			alertRuleId: "rule1",
			key: "threshold",
			value: "100",
			isHardcoded: false,
			description: null,
			createdAt: baseDate,
			updatedAt: baseDate,
		} as never);
		expect(cfg.value).toBe("100");
	});

	it("mapAlertRuleCreateInputToPrisma fills defaults", () => {
		const row = mapAlertRuleCreateInputToPrisma({
			name: "Rule",
			active: true,
			severity: "LOW",
			isManualOnly: false,
		} as never);
		expect(row.activityCode).toBe("VEH");
		expect(row.metadata).toBeNull();
	});

	it("mapAlertRulePatchInputToPrisma only sets provided keys", () => {
		expect(mapAlertRulePatchInputToPrisma({ name: "X" } as never)).toEqual({
			name: "X",
		});
		expect(
			Object.keys(mapAlertRulePatchInputToPrisma({} as never)).length,
		).toBe(0);
	});

	it("mapAlertRuleConfigCreateInputToPrisma", () => {
		const row = mapAlertRuleConfigCreateInputToPrisma(
			{
				key: "x",
				value: "{}",
				isHardcoded: true,
			} as never,
			"r1",
		);
		expect(row.alertRuleId).toBe("r1");
		expect(row.key).toBe("x");
	});

	it("mapAlertCreateInputToPrisma and mapAlertPatchInputToPrisma", () => {
		const created = mapAlertCreateInputToPrisma(
			{
				alertRuleId: "r1",
				clientId: "c1",
				severity: "CRITICAL",
				idempotencyKey: "ik",
				contextHash: "ch",
				metadata: { a: 1 },
				isManual: false,
			} as never,
			"o1",
		);
		expect(created.status).toBe("DETECTED");
		expect(created.organizationId).toBe("o1");

		const patched = mapAlertPatchInputToPrisma({
			notes: "n",
			status: "SUBMITTED",
		} as never);
		expect(patched.notes).toBe("n");
		expect(patched.status).toBe("SUBMITTED");
	});
});
