/**
 * Report Aggregator
 *
 * Provides comprehensive data aggregation for analytics reports.
 * Aggregates data from alerts, operations, and clients.
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import type { ReportFilters, ReportDataSource } from "../domain/report/types";

export interface AlertAggregation {
	total: number;
	bySeverity: Record<string, number>;
	byStatus: Record<string, number>;
	byRule: Array<{ ruleId: string; ruleName: string; count: number }>;
	byMonth: Array<{ month: string; count: number }>;
	avgResolutionDays: number;
	overdueCount: number;
}

export interface OperationAggregation {
	total: number;
	totalAmount: number;
	avgAmount: number;
	byActivityCode: Record<string, { count: number; amount: number }>;
	byOperationType: Record<string, { count: number; amount: number }>;
	byCurrency: Record<string, { count: number; amount: number }>;
	byMonth: Array<{ month: string; count: number; amount: number }>;
	topClients: Array<{
		clientId: string;
		clientName: string;
		count: number;
		amount: number;
	}>;
}

/** @deprecated Use OperationAggregation instead */
export type TransactionAggregation = OperationAggregation;

export interface ClientAggregation {
	total: number;
	byPersonType: Record<string, number>;
	byCountry: Record<string, number>;
	withAlerts: number;
	newInPeriod: number;
}

export interface ComparisonMetrics {
	alertsChange: number; // percentage
	operationsChange: number;
	amountChange: number;
	clientsChange: number;
}

export interface RiskIndicators {
	highRiskClients: number;
	criticalAlerts: number;
	overdueSubmissions: number;
	complianceScore: number; // 0-100
}

export interface ReportAggregation {
	alerts: AlertAggregation;
	operations: OperationAggregation;
	clients: ClientAggregation;
	comparison?: ComparisonMetrics;
	riskIndicators: RiskIndicators;
}

export interface AggregationOptions {
	organizationId: string;
	periodStart: Date;
	periodEnd: Date;
	comparisonPeriodStart?: Date;
	comparisonPeriodEnd?: Date;
	dataSources: ReportDataSource[];
	filters?: ReportFilters;
	clientId?: string;
}

export class ReportAggregator {
	constructor(private readonly prisma: PrismaClient) {}

	/**
	 * Aggregate all data for a report
	 */
	async aggregate(options: AggregationOptions): Promise<ReportAggregation> {
		const {
			organizationId,
			periodStart,
			periodEnd,
			comparisonPeriodStart,
			comparisonPeriodEnd,
			dataSources,
			filters,
			clientId,
		} = options;

		// Aggregate each data source in parallel
		const [alerts, operations, clients] = await Promise.all([
			dataSources.includes("ALERTS")
				? this.aggregateAlerts(
						organizationId,
						periodStart,
						periodEnd,
						filters,
						clientId,
					)
				: this.emptyAlertAggregation(),
			dataSources.includes("OPERATIONS")
				? this.aggregateOperations(
						organizationId,
						periodStart,
						periodEnd,
						filters,
						clientId,
					)
				: this.emptyOperationAggregation(),
			dataSources.includes("CLIENTS")
				? this.aggregateClients(
						organizationId,
						periodStart,
						periodEnd,
						clientId,
					)
				: this.emptyClientAggregation(),
		]);

		// Calculate comparison if comparison period is provided
		let comparison: ComparisonMetrics | undefined;
		if (comparisonPeriodStart && comparisonPeriodEnd) {
			comparison = await this.calculateComparison(
				organizationId,
				periodStart,
				periodEnd,
				comparisonPeriodStart,
				comparisonPeriodEnd,
				filters,
				clientId,
			);
		}

		// Calculate risk indicators
		const riskIndicators = await this.calculateRiskIndicators(
			organizationId,
			alerts,
			clients,
		);

		return {
			alerts,
			operations,
			clients,
			comparison,
			riskIndicators,
		};
	}

	/**
	 * Aggregate alert data
	 */
	async aggregateAlerts(
		organizationId: string,
		periodStart: Date,
		periodEnd: Date,
		filters?: ReportFilters,
		clientId?: string,
	): Promise<AlertAggregation> {
		const where: Prisma.AlertWhereInput = {
			organizationId,
			createdAt: {
				gte: periodStart,
				lte: periodEnd,
			},
		};

		// clientId parameter takes precedence over filters.clientIds
		if (clientId) {
			where.clientId = clientId;
		} else if (filters?.clientIds && filters.clientIds.length > 0) {
			where.clientId = { in: filters.clientIds };
		}
		if (filters?.alertRuleIds && filters.alertRuleIds.length > 0) {
			where.alertRuleId = { in: filters.alertRuleIds };
		}
		if (filters?.alertSeverities && filters.alertSeverities.length > 0) {
			where.severity = {
				in: filters.alertSeverities as (
					| "LOW"
					| "MEDIUM"
					| "HIGH"
					| "CRITICAL"
				)[],
			};
		}

		const alerts = await this.prisma.alert.findMany({
			where,
			include: { alertRule: true },
		});

		// Aggregate by severity
		const bySeverity: Record<string, number> = {};
		const byStatus: Record<string, number> = {};
		const byRuleMap: Map<string, { ruleName: string; count: number }> =
			new Map();
		const byMonthMap: Map<string, number> = new Map();
		let overdueCount = 0;
		let totalResolutionDays = 0;
		let resolvedCount = 0;

		for (const alert of alerts) {
			// By severity
			bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;

			// By status
			byStatus[alert.status] = (byStatus[alert.status] || 0) + 1;

			// By rule
			const existing = byRuleMap.get(alert.alertRuleId);
			if (existing) {
				existing.count++;
			} else {
				byRuleMap.set(alert.alertRuleId, {
					ruleName: alert.alertRule?.name || alert.alertRuleId,
					count: 1,
				});
			}

			// By month
			const month = alert.createdAt.toISOString().substring(0, 7); // YYYY-MM
			byMonthMap.set(month, (byMonthMap.get(month) || 0) + 1);

			// Overdue count
			if (alert.isOverdue) {
				overdueCount++;
			}

			// Resolution time (if resolved)
			if (alert.submittedAt) {
				const resolutionDays =
					(alert.submittedAt.getTime() - alert.createdAt.getTime()) /
					(1000 * 60 * 60 * 24);
				totalResolutionDays += resolutionDays;
				resolvedCount++;
			}
		}

		const byRule = Array.from(byRuleMap.entries())
			.map(([ruleId, { ruleName, count }]) => ({ ruleId, ruleName, count }))
			.sort((a, b) => b.count - a.count);

		const byMonth = Array.from(byMonthMap.entries())
			.map(([month, count]) => ({ month, count }))
			.sort((a, b) => a.month.localeCompare(b.month));

		const avgResolutionDays =
			resolvedCount > 0 ? totalResolutionDays / resolvedCount : 0;

		return {
			total: alerts.length,
			bySeverity,
			byStatus,
			byRule,
			byMonth,
			avgResolutionDays: Math.round(avgResolutionDays * 10) / 10,
			overdueCount,
		};
	}

	/**
	 * Aggregate operation data
	 */
	async aggregateOperations(
		organizationId: string,
		periodStart: Date,
		periodEnd: Date,
		filters?: ReportFilters,
		clientId?: string,
	): Promise<OperationAggregation> {
		const where: Prisma.OperationWhereInput = {
			organizationId,
			operationDate: {
				gte: periodStart,
				lte: periodEnd,
			},
			deletedAt: null,
		};

		// clientId parameter takes precedence over filters.clientIds
		if (clientId) {
			where.clientId = clientId;
		} else if (filters?.clientIds && filters.clientIds.length > 0) {
			where.clientId = { in: filters.clientIds };
		}
		if (filters?.activityCodes && filters.activityCodes.length > 0) {
			where.activityCode = { in: filters.activityCodes };
		}
		if (filters?.minAmount !== undefined) {
			where.amount = { ...(where.amount as object), gte: filters.minAmount };
		}
		if (filters?.maxAmount !== undefined) {
			where.amount = { ...(where.amount as object), lte: filters.maxAmount };
		}

		const operations = await this.prisma.operation.findMany({
			where,
			include: { client: true },
		});

		// Aggregate
		const byActivityCode: Record<string, { count: number; amount: number }> =
			{};
		const byOperationType: Record<string, { count: number; amount: number }> =
			{};
		const byCurrency: Record<string, { count: number; amount: number }> = {};
		const byMonthMap: Map<string, { count: number; amount: number }> =
			new Map();
		const byClientMap: Map<
			string,
			{ clientName: string; count: number; amount: number }
		> = new Map();

		let totalAmount = 0;

		for (const op of operations) {
			const amount = Number(op.amount);
			totalAmount += amount;

			// By activity code
			if (!byActivityCode[op.activityCode]) {
				byActivityCode[op.activityCode] = { count: 0, amount: 0 };
			}
			byActivityCode[op.activityCode].count++;
			byActivityCode[op.activityCode].amount += amount;

			// By operation type
			const opType = op.operationTypeCode || "UNKNOWN";
			if (!byOperationType[opType]) {
				byOperationType[opType] = { count: 0, amount: 0 };
			}
			byOperationType[opType].count++;
			byOperationType[opType].amount += amount;

			// By currency
			if (!byCurrency[op.currencyCode]) {
				byCurrency[op.currencyCode] = { count: 0, amount: 0 };
			}
			byCurrency[op.currencyCode].count++;
			byCurrency[op.currencyCode].amount += amount;

			// By month
			const month = op.operationDate.toISOString().substring(0, 7);
			const monthData = byMonthMap.get(month) || { count: 0, amount: 0 };
			monthData.count++;
			monthData.amount += amount;
			byMonthMap.set(month, monthData);

			// By client
			const clientData = byClientMap.get(op.clientId) || {
				clientName:
					op.client?.businessName ||
					`${op.client?.firstName || ""} ${op.client?.lastName || ""}`.trim() ||
					op.clientId,
				count: 0,
				amount: 0,
			};
			clientData.count++;
			clientData.amount += amount;
			byClientMap.set(op.clientId, clientData);
		}

		const byMonth = Array.from(byMonthMap.entries())
			.map(([month, data]) => ({ month, ...data }))
			.sort((a, b) => a.month.localeCompare(b.month));

		const topClients = Array.from(byClientMap.entries())
			.map(([clientId, data]) => ({ clientId, ...data }))
			.sort((a, b) => b.amount - a.amount)
			.slice(0, 10);

		return {
			total: operations.length,
			totalAmount,
			avgAmount: operations.length > 0 ? totalAmount / operations.length : 0,
			byActivityCode,
			byOperationType,
			byCurrency,
			byMonth,
			topClients,
		};
	}

	/**
	 * Aggregate client data
	 */
	async aggregateClients(
		organizationId: string,
		periodStart: Date,
		periodEnd: Date,
		clientId?: string,
	): Promise<ClientAggregation> {
		const where: Prisma.ClientWhereInput = {
			organizationId,
			deletedAt: null,
		};

		if (clientId) {
			where.id = clientId;
		}

		const clients = await this.prisma.client.findMany({
			where,
			include: {
				alerts: {
					where: {
						createdAt: {
							gte: periodStart,
							lte: periodEnd,
						},
					},
				},
			},
		});

		// Count clients created in period
		const newInPeriod = clients.filter(
			(c) => c.createdAt >= periodStart && c.createdAt <= periodEnd,
		).length;

		// Aggregate by person type
		const byPersonType: Record<string, number> = {};
		const byCountry: Record<string, number> = {};
		let withAlerts = 0;

		for (const client of clients) {
			// By person type
			byPersonType[client.personType] =
				(byPersonType[client.personType] || 0) + 1;

			// By country
			byCountry[client.country] = (byCountry[client.country] || 0) + 1;

			// With alerts in period
			if (client.alerts.length > 0) {
				withAlerts++;
			}
		}

		return {
			total: clients.length,
			byPersonType,
			byCountry,
			withAlerts,
			newInPeriod,
		};
	}

	/**
	 * Calculate comparison metrics between two periods
	 */
	async calculateComparison(
		organizationId: string,
		currentStart: Date,
		currentEnd: Date,
		comparisonStart: Date,
		comparisonEnd: Date,
		filters?: ReportFilters,
		clientId?: string,
	): Promise<ComparisonMetrics> {
		// Build common filter conditions
		const alertFilters: Prisma.AlertWhereInput = {};
		const opFilters: Prisma.OperationWhereInput = {};
		const clientFilters: Prisma.ClientWhereInput = {};

		// clientId parameter takes precedence over filters.clientIds
		if (clientId) {
			alertFilters.clientId = clientId;
			opFilters.clientId = clientId;
		} else if (filters?.clientIds && filters.clientIds.length > 0) {
			alertFilters.clientId = { in: filters.clientIds };
			opFilters.clientId = { in: filters.clientIds };
			clientFilters.id = { in: filters.clientIds };
		}

		// Apply additional filters
		if (filters?.alertRuleIds && filters.alertRuleIds.length > 0) {
			alertFilters.alertRuleId = { in: filters.alertRuleIds };
		}
		if (filters?.alertSeverities && filters.alertSeverities.length > 0) {
			alertFilters.severity = {
				in: filters.alertSeverities as (
					| "LOW"
					| "MEDIUM"
					| "HIGH"
					| "CRITICAL"
				)[],
			};
		}
		if (filters?.activityCodes && filters.activityCodes.length > 0) {
			opFilters.activityCode = { in: filters.activityCodes };
		}
		if (filters?.minAmount !== undefined) {
			opFilters.amount = { gte: filters.minAmount };
		}
		if (filters?.maxAmount !== undefined) {
			opFilters.amount = {
				...(opFilters.amount as object),
				lte: filters.maxAmount,
			};
		}

		// Get current period counts
		const [currentAlerts, currentOps, currentClients] = await Promise.all([
			this.prisma.alert.count({
				where: {
					organizationId,
					createdAt: { gte: currentStart, lte: currentEnd },
					...alertFilters,
				},
			}),
			this.prisma.operation.aggregate({
				where: {
					organizationId,
					operationDate: { gte: currentStart, lte: currentEnd },
					deletedAt: null,
					...opFilters,
				},
				_count: true,
				_sum: { amount: true },
			}),
			this.prisma.client.count({
				where: {
					organizationId,
					createdAt: { gte: currentStart, lte: currentEnd },
					deletedAt: null,
					...clientFilters,
				},
			}),
		]);

		// Get comparison period counts
		const [compAlerts, compOps, compClients] = await Promise.all([
			this.prisma.alert.count({
				where: {
					organizationId,
					createdAt: { gte: comparisonStart, lte: comparisonEnd },
					...alertFilters,
				},
			}),
			this.prisma.operation.aggregate({
				where: {
					organizationId,
					operationDate: { gte: comparisonStart, lte: comparisonEnd },
					deletedAt: null,
					...opFilters,
				},
				_count: true,
				_sum: { amount: true },
			}),
			this.prisma.client.count({
				where: {
					organizationId,
					createdAt: { gte: comparisonStart, lte: comparisonEnd },
					deletedAt: null,
					...clientFilters,
				},
			}),
		]);

		const calcChange = (current: number, comparison: number) => {
			if (comparison === 0) return current > 0 ? 100 : 0;
			return Math.round(((current - comparison) / comparison) * 100 * 10) / 10;
		};

		const currentAmount = Number(currentOps._sum.amount || 0);
		const compAmount = Number(compOps._sum.amount || 0);

		return {
			alertsChange: calcChange(currentAlerts, compAlerts),
			operationsChange: calcChange(currentOps._count || 0, compOps._count || 0),
			amountChange: calcChange(currentAmount, compAmount),
			clientsChange: calcChange(currentClients, compClients),
		};
	}

	/**
	 * Calculate risk indicators
	 */
	async calculateRiskIndicators(
		organizationId: string,
		alerts: AlertAggregation,
		_clients: ClientAggregation,
	): Promise<RiskIndicators> {
		// Count clients with critical/high alerts
		const highRiskClients = await this.prisma.client.count({
			where: {
				organizationId,
				deletedAt: null,
				alerts: {
					some: {
						severity: { in: ["HIGH", "CRITICAL"] },
						status: { notIn: ["CANCELLED", "SUBMITTED"] },
					},
				},
			},
		});

		// Count overdue submissions
		const overdueSubmissions = await this.prisma.alert.count({
			where: {
				organizationId,
				isOverdue: true,
				status: { notIn: ["CANCELLED", "SUBMITTED"] },
			},
		});

		// Calculate compliance score (0-100)
		// Based on: resolved alerts, no overdue, low critical alerts
		let complianceScore = 100;

		// Deduct for critical alerts (up to -30)
		const criticalAlerts = alerts.bySeverity["CRITICAL"] || 0;
		complianceScore -= Math.min(criticalAlerts * 10, 30);

		// Deduct for overdue (up to -40)
		complianceScore -= Math.min(alerts.overdueCount * 10, 40);

		// Deduct for high alerts (up to -20)
		const highAlerts = alerts.bySeverity["HIGH"] || 0;
		complianceScore -= Math.min(highAlerts * 5, 20);

		// Ensure score is between 0 and 100
		complianceScore = Math.max(0, Math.min(100, complianceScore));

		return {
			highRiskClients,
			criticalAlerts,
			overdueSubmissions,
			complianceScore,
		};
	}

	private emptyAlertAggregation(): AlertAggregation {
		return {
			total: 0,
			bySeverity: {},
			byStatus: {},
			byRule: [],
			byMonth: [],
			avgResolutionDays: 0,
			overdueCount: 0,
		};
	}

	private emptyOperationAggregation(): OperationAggregation {
		return {
			total: 0,
			totalAmount: 0,
			avgAmount: 0,
			byActivityCode: {},
			byOperationType: {},
			byCurrency: {},
			byMonth: [],
			topClients: [],
		};
	}

	private emptyClientAggregation(): ClientAggregation {
		return {
			total: 0,
			byPersonType: {},
			byCountry: {},
			withAlerts: 0,
			newInPeriod: 0,
		};
	}
}
