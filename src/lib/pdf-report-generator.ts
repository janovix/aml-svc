/**
 * PDF Report Generator for AML Reports
 *
 * Generates HTML-based reports that can be:
 * 1. Rendered as HTML for browser viewing
 * 2. Converted to PDF via browser print (client-side)
 * 3. Processed by a PDF service if needed
 *
 * Enhanced with:
 * - SVG charts for data visualization
 * - Executive summary with comparison indicators
 * - Template-based formatting
 * - Professional styling
 */

import type { ReportEntity, ReportTemplate } from "../domain/report/types";
import type {
	ReportAggregation,
	AlertAggregation,
	TransactionAggregation,
	ClientAggregation,
	ComparisonMetrics,
} from "./report-aggregator";
import {
	generatePieChart,
	generateDonutChart,
	generateBarChart,
	generateLineChart,
	SEVERITY_COLORS,
	STATUS_COLORS,
	type ChartData,
	type TimeSeriesData,
} from "./svg-charts";

/**
 * Alert summary data for PDF generation
 */
export interface AlertSummaryForPdf {
	id: string;
	alertRuleId: string;
	alertRuleName: string;
	clientId: string;
	clientName: string;
	severity: string;
	status: string;
	createdAt: string;
	amount?: number;
}

/**
 * Enhanced data required to generate a PDF report
 */
export interface PdfReportData {
	report: ReportEntity;
	organizationName: string;
	organizationRfc: string;
	alerts: AlertSummaryForPdf[];
	aggregation: ReportAggregation;
	generatedAt: string;
}

/**
 * Legacy interface for backwards compatibility
 */
export interface LegacyPdfReportData {
	report: ReportEntity;
	organizationName: string;
	organizationRfc: string;
	alerts: AlertSummaryForPdf[];
	summary: {
		total: number;
		bySeverity: Record<string, number>;
		byStatus: Record<string, number>;
		byRule: Array<{ ruleId: string; ruleName: string; count: number }>;
		totalAmount?: number;
	};
	generatedAt: string;
}

/**
 * Format a date for display
 */
function formatDate(dateStr: string): string {
	const date = new Date(dateStr);
	return date.toLocaleDateString("es-MX", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

/**
 * Format currency
 */
function formatCurrency(amount: number): string {
	return new Intl.NumberFormat("es-MX", {
		style: "currency",
		currency: "MXN",
	}).format(amount);
}

/**
 * Format a number with commas
 */
function formatNumber(num: number): string {
	return new Intl.NumberFormat("es-MX").format(num);
}

/**
 * Get template label
 */
function getTemplateLabel(template: ReportTemplate): string {
	const labels: Record<string, string> = {
		EXECUTIVE_SUMMARY: "Resumen Ejecutivo",
		COMPLIANCE_STATUS: "Estado de Cumplimiento",
		TRANSACTION_ANALYSIS: "Análisis de Transacciones",
		CLIENT_RISK_PROFILE: "Perfil de Riesgo del Cliente",
		ALERT_BREAKDOWN: "Desglose de Alertas",
		PERIOD_COMPARISON: "Comparación de Períodos",
		CUSTOM: "Reporte Personalizado",
	};
	return labels[template] || template;
}

/**
 * Get period type label
 */
function getPeriodTypeLabel(type: string): string {
	const labels: Record<string, string> = {
		MONTHLY: "Mensual",
		QUARTERLY: "Trimestral",
		ANNUAL: "Anual",
		CUSTOM: "Personalizado",
	};
	return labels[type] || type;
}

/**
 * Get severity label and color
 */
function getSeverityStyle(severity: string): { label: string; color: string } {
	const styles: Record<string, { label: string; color: string }> = {
		LOW: { label: "Baja", color: SEVERITY_COLORS.LOW },
		MEDIUM: { label: "Media", color: SEVERITY_COLORS.MEDIUM },
		HIGH: { label: "Alta", color: SEVERITY_COLORS.HIGH },
		CRITICAL: { label: "Crítica", color: SEVERITY_COLORS.CRITICAL },
	};
	return styles[severity] || { label: severity, color: "#6b7280" };
}

/**
 * Get status label in Spanish
 */
function getStatusLabel(status: string): string {
	const labels: Record<string, string> = {
		DETECTED: "Detectada",
		FILE_GENERATED: "Archivo Generado",
		SUBMITTED: "Enviada",
		OVERDUE: "Vencida",
		CANCELLED: "Cancelada",
	};
	return labels[status] || status;
}

/**
 * Format change indicator with arrow
 */
function formatChangeIndicator(change: number): string {
	if (change > 0) {
		return `<span style="color: #ef4444;">↑ ${Math.abs(change)}%</span>`;
	} else if (change < 0) {
		return `<span style="color: #10b981;">↓ ${Math.abs(change)}%</span>`;
	}
	return `<span style="color: #6b7280;">→ 0%</span>`;
}

/**
 * Get compliance score color
 */
function getComplianceScoreColor(score: number): string {
	if (score >= 80) return "#10b981";
	if (score >= 60) return "#f59e0b";
	return "#ef4444";
}

/**
 * Generate charts section based on aggregation data
 */
function generateChartsSection(aggregation: ReportAggregation): string {
	const charts: string[] = [];

	// Alerts by Severity (Donut)
	if (Object.keys(aggregation.alerts.bySeverity).length > 0) {
		const severityData: ChartData[] = Object.entries(
			aggregation.alerts.bySeverity,
		).map(([severity, count]) => ({
			label: getSeverityStyle(severity).label,
			value: count,
			color: SEVERITY_COLORS[severity] || "#6b7280",
		}));
		charts.push(`
			<div class="chart-container">
				${generateDonutChart(severityData, { title: "Alertas por Severidad", width: 280, height: 220 })}
			</div>
		`);
	}

	// Alerts by Status (Pie)
	if (Object.keys(aggregation.alerts.byStatus).length > 0) {
		const statusData: ChartData[] = Object.entries(
			aggregation.alerts.byStatus,
		).map(([status, count]) => ({
			label: getStatusLabel(status),
			value: count,
			color: STATUS_COLORS[status] || "#6b7280",
		}));
		charts.push(`
			<div class="chart-container">
				${generatePieChart(statusData, { title: "Alertas por Estado", width: 280, height: 220 })}
			</div>
		`);
	}

	// Alerts by Rule (Bar)
	if (aggregation.alerts.byRule.length > 0) {
		const ruleData: ChartData[] = aggregation.alerts.byRule
			.slice(0, 8)
			.map((rule) => ({
				label: rule.ruleName.substring(0, 15),
				value: rule.count,
			}));
		charts.push(`
			<div class="chart-container wide">
				${generateBarChart(ruleData, { title: "Alertas por Regla", width: 400, height: 220 })}
			</div>
		`);
	}

	// Alerts by Month (Line)
	if (aggregation.alerts.byMonth.length > 1) {
		const monthData: TimeSeriesData[] = aggregation.alerts.byMonth.map((m) => ({
			date: m.month,
			value: m.count,
		}));
		charts.push(`
			<div class="chart-container wide">
				${generateLineChart(monthData, { title: "Tendencia de Alertas", width: 400, height: 220 })}
			</div>
		`);
	}

	// Transaction volume by month (Line)
	if (aggregation.transactions.byMonth.length > 1) {
		const txnData: TimeSeriesData[] = aggregation.transactions.byMonth.map(
			(m) => ({
				date: m.month,
				value: m.count,
			}),
		);
		charts.push(`
			<div class="chart-container wide">
				${generateLineChart(txnData, { title: "Volumen de Transacciones", width: 400, height: 220 })}
			</div>
		`);
	}

	if (charts.length === 0) {
		return "";
	}

	return `
		<div class="section">
			<h3 class="section-title">Visualización de Datos</h3>
			<div class="charts-grid">
				${charts.join("\n")}
			</div>
		</div>
	`;
}

/**
 * Generate executive summary section
 */
function generateExecutiveSummary(
	aggregation: ReportAggregation,
	comparison?: ComparisonMetrics,
): string {
	const { alerts, transactions, riskIndicators } = aggregation;

	const comparisonHtml = comparison
		? `
		<div class="comparison-section">
			<h4>Comparación con Período Anterior</h4>
			<div class="comparison-grid">
				<div class="comparison-item">
					<span class="comparison-label">Alertas</span>
					${formatChangeIndicator(comparison.alertsChange)}
				</div>
				<div class="comparison-item">
					<span class="comparison-label">Transacciones</span>
					${formatChangeIndicator(comparison.transactionsChange)}
				</div>
				<div class="comparison-item">
					<span class="comparison-label">Monto</span>
					${formatChangeIndicator(comparison.amountChange)}
				</div>
				<div class="comparison-item">
					<span class="comparison-label">Clientes</span>
					${formatChangeIndicator(comparison.clientsChange)}
				</div>
			</div>
		</div>
	`
		: "";

	return `
		<div class="section">
			<h3 class="section-title">Resumen Ejecutivo</h3>
			<div class="summary-grid">
				<div class="summary-card">
					<h3>Total Alertas</h3>
					<p>${formatNumber(alerts.total)}</p>
				</div>
				<div class="summary-card" style="background: linear-gradient(135deg, ${getComplianceScoreColor(riskIndicators.complianceScore)} 0%, ${getComplianceScoreColor(riskIndicators.complianceScore)}dd 100%);">
					<h3>Score de Cumplimiento</h3>
					<p>${riskIndicators.complianceScore}</p>
				</div>
				<div class="summary-card secondary">
					<h3>Transacciones</h3>
					<p>${formatNumber(transactions.total)}</p>
				</div>
				<div class="summary-card secondary">
					<h3>Monto Total</h3>
					<p style="font-size: 16px;">${formatCurrency(transactions.totalAmount)}</p>
				</div>
			</div>

			<div class="risk-indicators">
				<h4>Indicadores de Riesgo</h4>
				<div class="indicators-grid">
					<div class="indicator">
						<span class="indicator-value" style="color: ${riskIndicators.criticalAlerts > 0 ? "#ef4444" : "#10b981"};">
							${riskIndicators.criticalAlerts}
						</span>
						<span class="indicator-label">Alertas Críticas</span>
					</div>
					<div class="indicator">
						<span class="indicator-value" style="color: ${riskIndicators.highRiskClients > 0 ? "#f97316" : "#10b981"};">
							${riskIndicators.highRiskClients}
						</span>
						<span class="indicator-label">Clientes Alto Riesgo</span>
					</div>
					<div class="indicator">
						<span class="indicator-value" style="color: ${riskIndicators.overdueSubmissions > 0 ? "#ef4444" : "#10b981"};">
							${riskIndicators.overdueSubmissions}
						</span>
						<span class="indicator-label">Envíos Vencidos</span>
					</div>
					<div class="indicator">
						<span class="indicator-value">${alerts.avgResolutionDays.toFixed(1)}</span>
						<span class="indicator-label">Días Prom. Resolución</span>
					</div>
				</div>
			</div>

			${comparisonHtml}
		</div>
	`;
}

/**
 * Generate breakdown tables section
 */
function generateBreakdownSection(alerts: AlertAggregation): string {
	const severityRows = Object.entries(alerts.bySeverity)
		.map(([severity, count]) => {
			const style = getSeverityStyle(severity);
			return `
				<tr>
					<td><span style="color: ${style.color}; font-weight: 600;">●</span> ${style.label}</td>
					<td style="text-align: right; font-weight: 600;">${count}</td>
				</tr>
			`;
		})
		.join("");

	const statusRows = Object.entries(alerts.byStatus)
		.map(([status, count]) => {
			return `
				<tr>
					<td>${getStatusLabel(status)}</td>
					<td style="text-align: right; font-weight: 600;">${count}</td>
				</tr>
			`;
		})
		.join("");

	const ruleRows = alerts.byRule
		.sort((a, b) => b.count - a.count)
		.slice(0, 10)
		.map(({ ruleName, count }) => {
			return `
				<tr>
					<td>${ruleName}</td>
					<td style="text-align: right; font-weight: 600;">${count}</td>
				</tr>
			`;
		})
		.join("");

	return `
		<div class="section">
			<h3 class="section-title">Desglose por Categoría</h3>
			<div class="breakdown-tables">
				<div class="breakdown-table">
					<h4>Por Severidad</h4>
					<table>
						<tbody>
							${severityRows || '<tr><td colspan="2">Sin datos</td></tr>'}
						</tbody>
					</table>
				</div>
				<div class="breakdown-table">
					<h4>Por Estado</h4>
					<table>
						<tbody>
							${statusRows || '<tr><td colspan="2">Sin datos</td></tr>'}
						</tbody>
					</table>
				</div>
				<div class="breakdown-table">
					<h4>Por Tipo de Alerta</h4>
					<table>
						<tbody>
							${ruleRows || '<tr><td colspan="2">Sin datos</td></tr>'}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	`;
}

/**
 * Generate transaction summary section
 */
function generateTransactionSection(
	transactions: TransactionAggregation,
): string {
	if (transactions.total === 0) {
		return "";
	}

	const opTypeRows = Object.entries(transactions.byOperationType)
		.map(
			([type, data]) => `
			<tr>
				<td>${type === "PURCHASE" ? "Compra" : "Venta"}</td>
				<td style="text-align: right;">${data.count}</td>
				<td style="text-align: right;">${formatCurrency(data.amount)}</td>
			</tr>
		`,
		)
		.join("");

	const vehicleTypeRows = Object.entries(transactions.byVehicleType)
		.map(([type, data]) => {
			const typeLabel: Record<string, string> = {
				LAND: "Terrestre",
				MARINE: "Marítimo",
				AIR: "Aéreo",
			};
			return `
				<tr>
					<td>${typeLabel[type] || type}</td>
					<td style="text-align: right;">${data.count}</td>
					<td style="text-align: right;">${formatCurrency(data.amount)}</td>
				</tr>
			`;
		})
		.join("");

	const topClientsRows = transactions.topClients
		.slice(0, 5)
		.map(
			(client) => `
			<tr>
				<td>${client.clientName}</td>
				<td style="text-align: right;">${client.count}</td>
				<td style="text-align: right;">${formatCurrency(client.amount)}</td>
			</tr>
		`,
		)
		.join("");

	return `
		<div class="section">
			<h3 class="section-title">Resumen de Transacciones</h3>
			<div class="txn-summary-grid">
				<div class="txn-stat">
					<h4>Total Transacciones</h4>
					<p class="stat-value">${formatNumber(transactions.total)}</p>
				</div>
				<div class="txn-stat">
					<h4>Monto Total</h4>
					<p class="stat-value">${formatCurrency(transactions.totalAmount)}</p>
				</div>
				<div class="txn-stat">
					<h4>Promedio por Transacción</h4>
					<p class="stat-value">${formatCurrency(transactions.avgAmount)}</p>
				</div>
			</div>

			<div class="breakdown-tables" style="margin-top: 20px;">
				<div class="breakdown-table">
					<h4>Por Tipo de Operación</h4>
					<table>
						<thead><tr><th>Tipo</th><th>Cantidad</th><th>Monto</th></tr></thead>
						<tbody>${opTypeRows || '<tr><td colspan="3">Sin datos</td></tr>'}</tbody>
					</table>
				</div>
				<div class="breakdown-table">
					<h4>Por Tipo de Vehículo</h4>
					<table>
						<thead><tr><th>Tipo</th><th>Cantidad</th><th>Monto</th></tr></thead>
						<tbody>${vehicleTypeRows || '<tr><td colspan="3">Sin datos</td></tr>'}</tbody>
					</table>
				</div>
				<div class="breakdown-table">
					<h4>Principales Clientes</h4>
					<table>
						<thead><tr><th>Cliente</th><th>Cantidad</th><th>Monto</th></tr></thead>
						<tbody>${topClientsRows || '<tr><td colspan="3">Sin datos</td></tr>'}</tbody>
					</table>
				</div>
			</div>
		</div>
	`;
}

/**
 * Generate client summary section
 */
function generateClientSection(clients: ClientAggregation): string {
	if (clients.total === 0) {
		return "";
	}

	const personTypeRows = Object.entries(clients.byPersonType)
		.map(([type, count]) => {
			const typeLabel: Record<string, string> = {
				PHYSICAL: "Persona Física",
				MORAL: "Persona Moral",
				TRUST: "Fideicomiso",
			};
			return `
				<tr>
					<td>${typeLabel[type] || type}</td>
					<td style="text-align: right; font-weight: 600;">${count}</td>
				</tr>
			`;
		})
		.join("");

	const countryRows = Object.entries(clients.byCountry)
		.slice(0, 10)
		.map(
			([country, count]) => `
			<tr>
				<td>${country}</td>
				<td style="text-align: right; font-weight: 600;">${count}</td>
			</tr>
		`,
		)
		.join("");

	return `
		<div class="section">
			<h3 class="section-title">Resumen de Clientes</h3>
			<div class="client-stats">
				<div class="client-stat">
					<span class="stat-value">${formatNumber(clients.total)}</span>
					<span class="stat-label">Total Clientes</span>
				</div>
				<div class="client-stat">
					<span class="stat-value">${formatNumber(clients.withAlerts)}</span>
					<span class="stat-label">Con Alertas</span>
				</div>
				<div class="client-stat">
					<span class="stat-value">${formatNumber(clients.newInPeriod)}</span>
					<span class="stat-label">Nuevos en Período</span>
				</div>
			</div>
			<div class="breakdown-tables" style="margin-top: 20px;">
				<div class="breakdown-table">
					<h4>Por Tipo de Persona</h4>
					<table>
						<tbody>${personTypeRows || '<tr><td colspan="2">Sin datos</td></tr>'}</tbody>
					</table>
				</div>
				<div class="breakdown-table">
					<h4>Por País</h4>
					<table>
						<tbody>${countryRows || '<tr><td colspan="2">Sin datos</td></tr>'}</tbody>
					</table>
				</div>
			</div>
		</div>
	`;
}

/**
 * Generate alert details table
 */
function generateAlertDetailsSection(alerts: AlertSummaryForPdf[]): string {
	if (alerts.length === 0) {
		return "";
	}

	const hasAmounts = alerts.some((a) => a.amount !== undefined);

	const alertRows = alerts
		.slice(0, 100) // Limit to 100 for PDF size
		.map((alert) => {
			const severity = getSeverityStyle(alert.severity);
			return `
				<tr>
					<td style="font-family: monospace; font-size: 10px;">${alert.id.substring(0, 12)}...</td>
					<td>${alert.alertRuleName}</td>
					<td>${alert.clientName}</td>
					<td><span style="color: ${severity.color};">${severity.label}</span></td>
					<td>${getStatusLabel(alert.status)}</td>
					<td>${formatDate(alert.createdAt)}</td>
					${hasAmounts && alert.amount !== undefined ? `<td style="text-align: right;">${formatCurrency(alert.amount)}</td>` : ""}
				</tr>
			`;
		})
		.join("");

	const showingText =
		alerts.length > 100
			? ` (mostrando 100 de ${alerts.length})`
			: ` (${alerts.length})`;

	return `
		<div class="section">
			<h3 class="section-title">Detalle de Alertas${showingText}</h3>
			<table>
				<thead>
					<tr>
						<th>ID</th>
						<th>Tipo de Alerta</th>
						<th>Cliente</th>
						<th>Severidad</th>
						<th>Estado</th>
						<th>Fecha</th>
						${hasAmounts ? "<th>Monto</th>" : ""}
					</tr>
				</thead>
				<tbody>
					${alertRows}
				</tbody>
			</table>
		</div>
	`;
}

/**
 * Generate enhanced HTML report content
 */
export function generatePdfReportHtml(data: PdfReportData): string {
	const {
		report,
		organizationName,
		organizationRfc,
		alerts,
		aggregation,
		generatedAt,
	} = data;

	return `
<!DOCTYPE html>
<html lang="es">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${getTemplateLabel(report.template)} - ${report.name}</title>
	<style>
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
			font-size: 12px;
			line-height: 1.5;
			color: #1f2937;
			background: #ffffff;
			padding: 20px;
		}
		.header {
			border-bottom: 2px solid #1f2937;
			padding-bottom: 20px;
			margin-bottom: 25px;
		}
		.header-top {
			display: flex;
			justify-content: space-between;
			align-items: flex-start;
			margin-bottom: 10px;
		}
		.logo-section h1 {
			font-size: 24px;
			font-weight: 700;
			color: #1f2937;
		}
		.logo-section p {
			color: #6b7280;
			font-size: 11px;
		}
		.report-meta {
			text-align: right;
		}
		.report-meta h2 {
			font-size: 18px;
			color: #3b82f6;
			margin-bottom: 5px;
		}
		.report-meta .template-badge {
			display: inline-block;
			background: #3b82f6;
			color: white;
			padding: 2px 8px;
			border-radius: 4px;
			font-size: 10px;
			margin-bottom: 5px;
		}
		.report-meta p {
			font-size: 11px;
			color: #6b7280;
		}
		.section {
			margin-bottom: 30px;
			break-inside: avoid;
		}
		.section-title {
			font-size: 14px;
			font-weight: 600;
			color: #1f2937;
			border-bottom: 1px solid #e5e7eb;
			padding-bottom: 8px;
			margin-bottom: 15px;
		}
		.summary-grid {
			display: grid;
			grid-template-columns: repeat(4, 1fr);
			gap: 15px;
		}
		.summary-card {
			background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
			border-radius: 8px;
			padding: 15px;
			color: white;
		}
		.summary-card.secondary {
			background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
		}
		.summary-card h3 {
			font-size: 11px;
			text-transform: uppercase;
			opacity: 0.8;
			margin-bottom: 5px;
		}
		.summary-card p {
			font-size: 24px;
			font-weight: 700;
		}
		.risk-indicators {
			margin-top: 20px;
			background: #f9fafb;
			border-radius: 8px;
			padding: 15px;
		}
		.risk-indicators h4 {
			font-size: 12px;
			font-weight: 600;
			margin-bottom: 12px;
			color: #374151;
		}
		.indicators-grid {
			display: grid;
			grid-template-columns: repeat(4, 1fr);
			gap: 15px;
		}
		.indicator {
			text-align: center;
		}
		.indicator-value {
			display: block;
			font-size: 24px;
			font-weight: 700;
			color: #1f2937;
		}
		.indicator-label {
			display: block;
			font-size: 10px;
			color: #6b7280;
			margin-top: 4px;
		}
		.comparison-section {
			margin-top: 20px;
			background: #fef3c7;
			border-radius: 8px;
			padding: 15px;
		}
		.comparison-section h4 {
			font-size: 12px;
			font-weight: 600;
			margin-bottom: 12px;
			color: #92400e;
		}
		.comparison-grid {
			display: grid;
			grid-template-columns: repeat(4, 1fr);
			gap: 15px;
		}
		.comparison-item {
			text-align: center;
		}
		.comparison-label {
			display: block;
			font-size: 10px;
			color: #6b7280;
			margin-bottom: 4px;
		}
		.charts-grid {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
			gap: 20px;
		}
		.chart-container {
			background: #f9fafb;
			border-radius: 8px;
			padding: 15px;
			display: flex;
			justify-content: center;
			align-items: center;
		}
		.chart-container.wide {
			grid-column: span 1;
		}
		.breakdown-tables {
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			gap: 20px;
		}
		.breakdown-table {
			background: #f9fafb;
			border-radius: 8px;
			padding: 15px;
		}
		.breakdown-table h4 {
			font-size: 12px;
			font-weight: 600;
			margin-bottom: 10px;
			color: #374151;
		}
		.txn-summary-grid {
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			gap: 15px;
		}
		.txn-stat {
			background: #f9fafb;
			border-radius: 8px;
			padding: 15px;
			text-align: center;
		}
		.txn-stat h4 {
			font-size: 11px;
			color: #6b7280;
			margin-bottom: 5px;
		}
		.txn-stat .stat-value {
			font-size: 20px;
			font-weight: 700;
			color: #1f2937;
		}
		.client-stats {
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			gap: 15px;
			margin-bottom: 20px;
		}
		.client-stat {
			background: #f9fafb;
			border-radius: 8px;
			padding: 15px;
			text-align: center;
		}
		.client-stat .stat-value {
			display: block;
			font-size: 24px;
			font-weight: 700;
			color: #1f2937;
		}
		.client-stat .stat-label {
			display: block;
			font-size: 10px;
			color: #6b7280;
			margin-top: 4px;
		}
		table {
			width: 100%;
			border-collapse: collapse;
			font-size: 11px;
		}
		th, td {
			padding: 8px 12px;
			text-align: left;
			border-bottom: 1px solid #e5e7eb;
		}
		th {
			background: #f9fafb;
			font-weight: 600;
			color: #374151;
		}
		tr:hover {
			background: #f9fafb;
		}
		.footer {
			margin-top: 30px;
			padding-top: 15px;
			border-top: 1px solid #e5e7eb;
			text-align: center;
			color: #6b7280;
			font-size: 10px;
		}
		@media print {
			body {
				padding: 0;
			}
			.section {
				break-inside: avoid;
			}
		}
	</style>
</head>
<body>
	<div class="header">
		<div class="header-top">
			<div class="logo-section">
				<h1>${organizationName}</h1>
				<p>RFC: ${organizationRfc}</p>
			</div>
			<div class="report-meta">
				<div class="template-badge">${getTemplateLabel(report.template)}</div>
				<h2>${report.name}</h2>
				<p>Período: ${formatDate(report.periodStart)} - ${formatDate(report.periodEnd)}</p>
				<p>Tipo: ${getPeriodTypeLabel(report.periodType)}</p>
				<p>Generado: ${formatDate(generatedAt)}</p>
			</div>
		</div>
	</div>

	${generateExecutiveSummary(aggregation, aggregation.comparison)}
	${generateChartsSection(aggregation)}
	${generateBreakdownSection(aggregation.alerts)}
	${aggregation.transactions.total > 0 ? generateTransactionSection(aggregation.transactions) : ""}
	${aggregation.clients.total > 0 ? generateClientSection(aggregation.clients) : ""}
	${report.includeDetailTables ? generateAlertDetailsSection(alerts) : ""}

	<div class="footer">
		<p>Este documento fue generado automáticamente por el sistema AML.</p>
		<p>Reporte ID: ${report.id} | Generado: ${generatedAt}</p>
	</div>
</body>
</html>
	`.trim();
}

/**
 * Generate a PDF-ready report
 */
export function generatePdfReport(data: PdfReportData): {
	html: string;
	filename: string;
	contentType: string;
} {
	const html = generatePdfReportHtml(data);
	const templateSlug = data.report.template.toLowerCase().replace(/_/g, "-");
	const filename = `report_${templateSlug}_${data.report.periodStart.substring(0, 10)}_${data.report.periodEnd.substring(0, 10)}.html`;

	return {
		html,
		filename,
		contentType: "text/html; charset=utf-8",
	};
}

/**
 * Convert legacy report data format to new format
 */
export function convertLegacyToNewFormat(
	legacy: LegacyPdfReportData,
): PdfReportData {
	return {
		...legacy,
		aggregation: {
			alerts: {
				total: legacy.summary.total,
				bySeverity: legacy.summary.bySeverity,
				byStatus: legacy.summary.byStatus,
				byRule: legacy.summary.byRule,
				byMonth: [],
				avgResolutionDays: 0,
				overdueCount: 0,
			},
			transactions: {
				total: 0,
				totalAmount: legacy.summary.totalAmount || 0,
				avgAmount: 0,
				byOperationType: {},
				byVehicleType: {},
				byCurrency: {},
				byMonth: [],
				topClients: [],
			},
			clients: {
				total: 0,
				byPersonType: {},
				byCountry: {},
				withAlerts: 0,
				newInPeriod: 0,
			},
			riskIndicators: {
				highRiskClients: 0,
				criticalAlerts: legacy.summary.bySeverity.CRITICAL || 0,
				overdueSubmissions: 0,
				complianceScore: 75, // Default
			},
		},
	};
}
