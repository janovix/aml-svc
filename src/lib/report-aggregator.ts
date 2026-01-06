/**
 * Report Aggregator
 *
 * Provides comprehensive data aggregation for analytics reports.
 * Aggregates data from alerts, transactions, and clients.
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

export interface TransactionAggregation {
	total: number;
	totalAmount: number;
	avgAmount: number;
	byOperationType: Record<string, { count: number; amount: number }>;
	byVehicleType: Record<string, { count: number; amount: number }>;
	byCurrency: Record<string, { count: number; amount: number }>;
	byMonth: Array<{ month: string; count: number; amount: number }>;
	topClients: Array<{
		clientId: string;
		clientName: string;
		count: number;
		amount: number;
	}>;
}

export interface ClientAggregation {
	total: number;
	byPersonType: Record<string, number>;
	byCountry: Record<string, number>;
	withAlerts: number;
	newInPeriod: number;
}

export interface ComparisonMetrics {
	alertsChange: number; // percentage
	transactionsChange: number;
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
	transactions: TransactionAggregation;
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
		const [alerts, transactions, clients] = await Promise.all([
			dataSources.includes("ALERTS")
				? this.aggregateAlerts(
						organizationId,
						periodStart,
						periodEnd,
						filters,
						clientId,
					)
				: this.emptyAlertAggregation(),
			dataSources.includes("TRANSACTIONS")
				? this.aggregateTransactions(
						organizationId,
						periodStart,
						periodEnd,
						filters,
						clientId,
					)
				: this.emptyTransactionAggregation(),
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
			transactions,
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

		if (clientId) {
			where.clientId = clientId;
		}
		if (filters?.clientIds && filters.clientIds.length > 0) {
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
	 * Aggregate transaction data
	 */
	async aggregateTransactions(
		organizationId: string,
		periodStart: Date,
		periodEnd: Date,
		filters?: ReportFilters,
		clientId?: string,
	): Promise<TransactionAggregation> {
		const where: Prisma.TransactionWhereInput = {
			organizationId,
			operationDate: {
				gte: periodStart,
				lte: periodEnd,
			},
			deletedAt: null,
		};

		if (clientId) {
			where.clientId = clientId;
		}
		if (filters?.clientIds && filters.clientIds.length > 0) {
			where.clientId = { in: filters.clientIds };
		}
		if (filters?.transactionTypes && filters.transactionTypes.length > 0) {
			where.operationType = {
				in: filters.transactionTypes as ("PURCHASE" | "SALE")[],
			};
		}
		if (filters?.minAmount !== undefined) {
			where.amount = { ...(where.amount as object), gte: filters.minAmount };
		}
		if (filters?.maxAmount !== undefined) {
			where.amount = { ...(where.amount as object), lte: filters.maxAmount };
		}

		const transactions = await this.prisma.transaction.findMany({
			where,
			include: { client: true },
		});

		// Aggregate
		const byOperationType: Record<string, { count: number; amount: number }> =
			{};
		const byVehicleType: Record<string, { count: number; amount: number }> = {};
		const byCurrency: Record<string, { count: number; amount: number }> = {};
		const byMonthMap: Map<string, { count: number; amount: number }> =
			new Map();
		const byClientMap: Map<
			string,
			{ clientName: string; count: number; amount: number }
		> = new Map();

		let totalAmount = 0;

		for (const txn of transactions) {
			const amount = Number(txn.amount);
			totalAmount += amount;

			// By operation type
			if (!byOperationType[txn.operationType]) {
				byOperationType[txn.operationType] = { count: 0, amount: 0 };
			}
			byOperationType[txn.operationType].count++;
			byOperationType[txn.operationType].amount += amount;

			// By vehicle type
			if (!byVehicleType[txn.vehicleType]) {
				byVehicleType[txn.vehicleType] = { count: 0, amount: 0 };
			}
			byVehicleType[txn.vehicleType].count++;
			byVehicleType[txn.vehicleType].amount += amount;

			// By currency
			if (!byCurrency[txn.currency]) {
				byCurrency[txn.currency] = { count: 0, amount: 0 };
			}
			byCurrency[txn.currency].count++;
			byCurrency[txn.currency].amount += amount;

			// By month
			const month = txn.operationDate.toISOString().substring(0, 7);
			const monthData = byMonthMap.get(month) || { count: 0, amount: 0 };
			monthData.count++;
			monthData.amount += amount;
			byMonthMap.set(month, monthData);

			// By client
			const clientData = byClientMap.get(txn.clientId) || {
				clientName:
					txn.client?.businessName ||
					`${txn.client?.firstName || ""} ${txn.client?.lastName || ""}`.trim() ||
					txn.clientId,
				count: 0,
				amount: 0,
			};
			clientData.count++;
			clientData.amount += amount;
			byClientMap.set(txn.clientId, clientData);
		}

		const byMonth = Array.from(byMonthMap.entries())
			.map(([month, data]) => ({ month, ...data }))
			.sort((a, b) => a.month.localeCompare(b.month));

		const topClients = Array.from(byClientMap.entries())
			.map(([clientId, data]) => ({ clientId, ...data }))
			.sort((a, b) => b.amount - a.amount)
			.slice(0, 10);

		return {
			total: transactions.length,
			totalAmount,
			avgAmount:
				transactions.length > 0 ? totalAmount / transactions.length : 0,
			byOperationType,
			byVehicleType,
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
		// Get current period counts
		const [currentAlerts, currentTxns, currentClients] = await Promise.all([
			this.prisma.alert.count({
				where: {
					organizationId,
					createdAt: { gte: currentStart, lte: currentEnd },
					...(clientId && { clientId }),
				},
			}),
			this.prisma.transaction.aggregate({
				where: {
					organizationId,
					operationDate: { gte: currentStart, lte: currentEnd },
					deletedAt: null,
					...(clientId && { clientId }),
				},
				_count: true,
				_sum: { amount: true },
			}),
			this.prisma.client.count({
				where: {
					organizationId,
					createdAt: { gte: currentStart, lte: currentEnd },
					deletedAt: null,
				},
			}),
		]);

		// Get comparison period counts
		const [compAlerts, compTxns, compClients] = await Promise.all([
			this.prisma.alert.count({
				where: {
					organizationId,
					createdAt: { gte: comparisonStart, lte: comparisonEnd },
					...(clientId && { clientId }),
				},
			}),
			this.prisma.transaction.aggregate({
				where: {
					organizationId,
					operationDate: { gte: comparisonStart, lte: comparisonEnd },
					deletedAt: null,
					...(clientId && { clientId }),
				},
				_count: true,
				_sum: { amount: true },
			}),
			this.prisma.client.count({
				where: {
					organizationId,
					createdAt: { gte: comparisonStart, lte: comparisonEnd },
					deletedAt: null,
				},
			}),
		]);

		const calcChange = (current: number, comparison: number) => {
			if (comparison === 0) return current > 0 ? 100 : 0;
			return Math.round(((current - comparison) / comparison) * 100 * 10) / 10;
		};

		const currentAmount = Number(currentTxns._sum.amount || 0);
		const compAmount = Number(compTxns._sum.amount || 0);

		return {
			alertsChange: calcChange(currentAlerts, compAlerts),
			transactionsChange: calcChange(
				currentTxns._count || 0,
				compTxns._count || 0,
			),
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

	private emptyTransactionAggregation(): TransactionAggregation {
		return {
			total: 0,
			totalAmount: 0,
			avgAmount: 0,
			byOperationType: {},
			byVehicleType: {},
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
