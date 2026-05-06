import type { PrismaClient } from "@prisma/client";

import type { Bindings } from "../../types";
import type { TenantContext } from "../../lib/tenant-context";
import { ClientRiskService } from "../risk";
import { TrainingService } from "../training/service";

export type SidebarBadgesData = {
	alerts: number;
	notices: number;
	reports: number;
	riskModels: number;
	imports: number;
	training: number;
};

/**
 * Primary SAT reporting period for "this month", matching `NoticeService.getAvailableMonths`
 * (when day {@literal >} 16, the active period shifts forward one calendar month).
 */
export function primaryNoticeReportedMonth(now: Date = new Date()): string {
	const currentDay = now.getDate();
	const startOffset = currentDay > 16 ? -1 : 0;
	const date = new Date(now.getFullYear(), now.getMonth() - startOffset, 1);
	const year = date.getFullYear();
	const month = date.getMonth() + 1;
	return `${year}${String(month).padStart(2, "0")}`;
}

export type SidebarBadgeCounters = {
	countOpenAlerts(tenant: TenantContext): Promise<number>;
	countDraftNoticesForReportedMonth(
		tenant: TenantContext,
		reportedMonth: string,
	): Promise<number>;
	countDraftReports(tenant: TenantContext): Promise<number>;
	countRiskDueForReview(tenant: TenantContext): Promise<number>;
	countFailedImports(tenant: TenantContext): Promise<number>;
	countTrainingTodo(organizationId: string, userId: string): Promise<number>;
};

export function createSidebarBadgeCounters(
	prisma: PrismaClient,
	env: Bindings,
): SidebarBadgeCounters {
	return {
		async countOpenAlerts(tenant) {
			const { organizationId, environment } = tenant;
			return prisma.alert.count({
				where: {
					organizationId,
					environment,
					status: { notIn: ["CANCELLED", "SUBMITTED"] },
					OR: [{ status: "DETECTED" }, { isOverdue: true }],
				},
			});
		},
		async countDraftNoticesForReportedMonth(tenant, reportedMonth) {
			const { organizationId, environment } = tenant;
			return prisma.notice.count({
				where: {
					organizationId,
					environment,
					reportedMonth,
					status: { in: ["DRAFT", "GENERATED"] },
				},
			});
		},
		async countDraftReports(tenant) {
			const { organizationId, environment } = tenant;
			return prisma.report.count({
				where: {
					organizationId,
					environment,
					status: "DRAFT",
				},
			});
		},
		async countRiskDueForReview(tenant) {
			const svc = new ClientRiskService(prisma);
			const due = await svc.getClientsDueForReview(tenant);
			return due.length;
		},
		async countFailedImports(tenant) {
			const { organizationId, environment } = tenant;
			return prisma.import.count({
				where: {
					organizationId,
					environment,
					status: "FAILED",
				},
			});
		},
		async countTrainingTodo(organizationId, userId) {
			const training = new TrainingService(prisma, env);
			await training.ensureMandatoryEnrollments(organizationId, userId);
			return prisma.trainingEnrollment.count({
				where: {
					organizationId,
					userId,
					status: { in: ["ASSIGNED", "IN_PROGRESS"] },
				},
			});
		},
	};
}

export async function getSidebarBadges(
	tenant: TenantContext,
	userId: string,
	counters: SidebarBadgeCounters,
	now?: Date,
): Promise<SidebarBadgesData> {
	const reportedMonth = primaryNoticeReportedMonth(now);
	const [alerts, notices, reports, riskModels, imports, training] =
		await Promise.all([
			counters.countOpenAlerts(tenant),
			counters.countDraftNoticesForReportedMonth(tenant, reportedMonth),
			counters.countDraftReports(tenant),
			counters.countRiskDueForReview(tenant),
			counters.countFailedImports(tenant),
			counters.countTrainingTodo(tenant.organizationId, userId),
		]);
	return { alerts, notices, reports, riskModels, imports, training };
}
