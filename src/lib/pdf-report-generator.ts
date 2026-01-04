/**
 * PDF Report Generator for AML Reports
 *
 * Generates HTML-based reports that can be:
 * 1. Rendered as HTML for browser viewing
 * 2. Converted to PDF via browser print (client-side)
 * 3. Processed by a PDF service if needed
 *
 * Used for QUARTERLY, ANNUAL, and CUSTOM report types.
 */

import type { ReportEntity } from "../domain/report/types";

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
 * Data required to generate a PDF report
 */
export interface PdfReportData {
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
 * Get report type label in Spanish
 */
function getReportTypeLabel(type: string): string {
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
		LOW: { label: "Baja", color: "#6b7280" },
		MEDIUM: { label: "Media", color: "#f59e0b" },
		HIGH: { label: "Alta", color: "#f97316" },
		CRITICAL: { label: "Crítica", color: "#ef4444" },
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
 * Generate HTML report content
 */
export function generatePdfReportHtml(data: PdfReportData): string {
	const {
		report,
		organizationName,
		organizationRfc,
		alerts,
		summary,
		generatedAt,
	} = data;

	// Build severity breakdown rows
	const severityRows = Object.entries(summary.bySeverity)
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

	// Build status breakdown rows
	const statusRows = Object.entries(summary.byStatus)
		.map(([status, count]) => {
			return `
				<tr>
					<td>${getStatusLabel(status)}</td>
					<td style="text-align: right; font-weight: 600;">${count}</td>
				</tr>
			`;
		})
		.join("");

	// Build alerts by rule rows
	const ruleRows = summary.byRule
		.sort((a, b) => b.count - a.count)
		.map(({ ruleName, count }) => {
			return `
				<tr>
					<td>${ruleName}</td>
					<td style="text-align: right; font-weight: 600;">${count}</td>
				</tr>
			`;
		})
		.join("");

	// Build alert details rows
	const alertRows = alerts
		.map((alert) => {
			const severity = getSeverityStyle(alert.severity);
			return `
				<tr>
					<td style="font-family: monospace; font-size: 11px;">${alert.id}</td>
					<td>${alert.alertRuleName}</td>
					<td>${alert.clientName}</td>
					<td><span style="color: ${severity.color};">${severity.label}</span></td>
					<td>${getStatusLabel(alert.status)}</td>
					<td>${formatDate(alert.createdAt)}</td>
					${alert.amount !== undefined ? `<td style="text-align: right;">${formatCurrency(alert.amount)}</td>` : ""}
				</tr>
			`;
		})
		.join("");

	const hasAmounts = alerts.some((a) => a.amount !== undefined);

	return `
<!DOCTYPE html>
<html lang="es">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Reporte ${getReportTypeLabel(report.type)} - ${report.reportedMonth}</title>
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
			margin-bottom: 20px;
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
		.report-meta p {
			font-size: 11px;
			color: #6b7280;
		}
		.section {
			margin-bottom: 25px;
		}
		.section-title {
			font-size: 14px;
			font-weight: 600;
			color: #1f2937;
			border-bottom: 1px solid #e5e7eb;
			padding-bottom: 8px;
			margin-bottom: 15px;
		}
		.info-grid {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
			gap: 15px;
		}
		.info-box {
			background: #f9fafb;
			border-radius: 8px;
			padding: 15px;
		}
		.info-box h3 {
			font-size: 11px;
			text-transform: uppercase;
			color: #6b7280;
			margin-bottom: 5px;
		}
		.info-box p {
			font-size: 14px;
			font-weight: 600;
			color: #1f2937;
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
				<h2>Reporte ${getReportTypeLabel(report.type)}</h2>
				<p>Período: ${formatDate(report.periodStart)} - ${formatDate(report.periodEnd)}</p>
				<p>Generado: ${formatDate(generatedAt)}</p>
			</div>
		</div>
	</div>

	<div class="section">
		<h3 class="section-title">Resumen Ejecutivo</h3>
		<div class="summary-grid">
			<div class="summary-card">
				<h3>Total Alertas</h3>
				<p>${summary.total}</p>
			</div>
			<div class="summary-card secondary">
				<h3>Severidad Alta/Crítica</h3>
				<p>${(summary.bySeverity["HIGH"] || 0) + (summary.bySeverity["CRITICAL"] || 0)}</p>
			</div>
			<div class="summary-card secondary">
				<h3>Reglas Activadas</h3>
				<p>${summary.byRule.length}</p>
			</div>
			${
				summary.totalAmount !== undefined
					? `
			<div class="summary-card secondary">
				<h3>Monto Total</h3>
				<p style="font-size: 16px;">${formatCurrency(summary.totalAmount)}</p>
			</div>
			`
					: `
			<div class="summary-card secondary">
				<h3>Período</h3>
				<p style="font-size: 14px;">${report.reportedMonth}</p>
			</div>
			`
			}
		</div>
	</div>

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

	<div class="section">
		<h3 class="section-title">Detalle de Alertas (${alerts.length})</h3>
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
				${alertRows || '<tr><td colspan="6">No hay alertas en este período</td></tr>'}
			</tbody>
		</table>
	</div>

	<div class="footer">
		<p>Este documento fue generado automáticamente por el sistema AML.</p>
		<p>Reporte ID: ${report.id} | Generado: ${generatedAt}</p>
	</div>
</body>
</html>
	`.trim();
}

/**
 * Generate a PDF-ready report as an ArrayBuffer
 * For edge environments, this returns HTML that can be converted to PDF client-side
 */
export function generatePdfReport(data: PdfReportData): {
	html: string;
	filename: string;
	contentType: string;
} {
	const html = generatePdfReportHtml(data);
	const filename = `reporte_${data.report.type.toLowerCase()}_${data.report.reportedMonth}.html`;

	return {
		html,
		filename,
		contentType: "text/html; charset=utf-8",
	};
}
