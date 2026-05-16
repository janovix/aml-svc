import { describe, it, expect } from "vitest";
import {
	mapPrismaNotice,
	mapPrismaNoticeEvent,
	mapNoticeCreateInputToPrisma,
	mapNoticePatchInputToPrisma,
	getNoticeDisplayName,
} from "./mappers";

describe("notice mappers", () => {
	const baseDate = new Date("2024-06-01T12:00:00.000Z");

	it("mapPrismaNotice maps status and dates", () => {
		const n = mapPrismaNotice({
			id: "n1",
			organizationId: "o1",
			name: "July",
			status: "GENERATED",
			periodStart: baseDate,
			periodEnd: baseDate,
			reportedMonth: "2024-07",
			recordCount: 10,
			xmlFileUrl: null,
			fileSize: null,
			generatedAt: baseDate,
			submittedAt: null,
			amendmentCycle: 0,
			createdBy: "u1",
			notes: null,
			createdAt: baseDate,
			updatedAt: baseDate,
		} as never);
		expect(n.status).toBe("GENERATED");
		expect(n.periodStart).toBe(baseDate.toISOString());
	});

	it("mapPrismaNoticeEvent", () => {
		const ev = mapPrismaNoticeEvent({
			id: "e1",
			noticeId: "n1",
			organizationId: "o1",
			eventType: "STATUS_CHANGE",
			fromStatus: "DRAFT",
			toStatus: "GENERATED",
			cycle: 1,
			pdfDocumentId: null,
			xmlFileUrl: null,
			fileSize: null,
			notes: null,
			createdAt: baseDate,
		} as never);
		expect(ev.eventType).toBe("STATUS_CHANGE");
	});

	it("mapNoticeCreateInputToPrisma uses calculateNoticePeriod", () => {
		const row = mapNoticeCreateInputToPrisma(
			{
				name: "Aug",
				year: 2024,
				month: 8,
				notes: null,
			} as never,
			"o1",
			"u1",
		);
		expect(row.organizationId).toBe("o1");
		expect(row.createdBy).toBe("u1");
		expect(row.status).toBe("DRAFT");
	});

	it("mapNoticePatchInputToPrisma applies partial fields", () => {
		const partial = mapNoticePatchInputToPrisma({
			name: "Renamed",
			notes: "x",
		} as never);
		expect(partial.name).toBe("Renamed");
		expect(partial.notes).toBe("x");
	});

	it("getNoticeDisplayName formats reported month", () => {
		expect(getNoticeDisplayName("2024-09")).toContain("2024");
	});
});
