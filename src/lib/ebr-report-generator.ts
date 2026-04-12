/**
 * EBR Report Generator
 *
 * Generates HTML reports for:
 * 1. EBR Results (org and client risk assessment documentation)
 * 2. Manual de Politicas Internas (Art. 18-VIII LFPIORPI)
 *
 * These reports can be rendered in the browser or converted to PDF.
 */

interface EbrReportData {
	organizationName: string;
	orgAssessment: {
		riskLevel: string;
		residualRiskScore: number;
		inherentRiskScore: number;
		requiredAuditType: string;
		fpRiskLevel: string;
		fpRiskJustification: string;
		periodStartDate: string;
		periodEndDate: string;
		assessedBy: string;
		version: number;
		elements: Array<{
			elementType: string;
			weight: number;
			riskScore: number;
			riskLevel: string;
			factorBreakdown: Record<string, number>;
		}>;
		mitigants: Array<{
			mitigantName: string;
			exists: boolean;
			effectivenessScore: number;
			riskEffect: number;
		}>;
	} | null;
	clientDistribution: {
		total: number;
		distribution: Record<string, number>;
	};
	generatedAt: string;
}

const RISK_LEVEL_COLORS: Record<string, string> = {
	LOW: "#22c55e",
	MEDIUM_LOW: "#eab308",
	MEDIUM: "#f97316",
	HIGH: "#ef4444",
};

const ELEMENT_LABELS: Record<string, string> = {
	CLIENTS: "Clientes/Usuarios",
	GEOGRAPHY: "Geográfico",
	PRODUCTS: "Productos/Servicios",
	TRANSACTIONS: "Transacciones/Canales",
};

export function generateEbrResultsHtml(data: EbrReportData): string {
	const assessment = data.orgAssessment;

	return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Resultados EBR - ${data.organizationName}</title>
<style>
  body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 40px; color: #1a1a2e; line-height: 1.6; }
  h1 { color: #16213e; border-bottom: 3px solid #0f3460; padding-bottom: 8px; }
  h2 { color: #0f3460; margin-top: 24px; }
  h3 { color: #16213e; }
  .meta { color: #666; font-size: 0.9em; margin-bottom: 24px; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 4px; color: #fff; font-weight: 600; }
  .score-card { display: flex; gap: 16px; margin: 16px 0; flex-wrap: wrap; }
  .score-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; flex: 1; min-width: 180px; }
  .score-item .label { font-size: 0.85em; color: #64748b; }
  .score-item .value { font-size: 1.5em; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid #e2e8f0; }
  th { background: #f1f5f9; font-weight: 600; color: #334155; }
  .element-bar { height: 12px; border-radius: 6px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 0.85em; color: #94a3b8; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>
<h1>Evaluación con Enfoque Basado en Riesgo (EBR)</h1>
<p class="meta">
  ${data.organizationName} | Generado: ${data.generatedAt}<br/>
  ${assessment ? `Período: ${assessment.periodStartDate} — ${assessment.periodEndDate} | Versión: ${assessment.version}` : "Sin evaluación organizacional activa"}
</p>

${assessment ? generateOrgSection(assessment) : "<p><em>No se ha realizado una evaluación organizacional.</em></p>"}

<h2>Distribución de Riesgo de Clientes</h2>
<p>Total de clientes: ${data.clientDistribution.total}</p>
<div class="score-card">
${Object.entries(data.clientDistribution.distribution)
	.map(
		([level, count]) => `
  <div class="score-item">
    <div class="label">${level}</div>
    <div class="value" style="color: ${RISK_LEVEL_COLORS[level] ?? "#64748b"}">${count}</div>
  </div>`,
	)
	.join("")}
</div>

<h2>Sección FP (Financiamiento a la Proliferación)</h2>
${
	assessment
		? `<p><span class="badge" style="background:${RISK_LEVEL_COLORS[assessment.fpRiskLevel] ?? "#64748b"}">${assessment.fpRiskLevel}</span></p>
<p>${assessment.fpRiskJustification}</p>`
		: "<p><em>Sin evaluación.</em></p>"
}

<h2>Determinación de Tipo de Auditoría (Art. 18-XI)</h2>
${
	assessment
		? `<p>Nivel de riesgo entidad: <strong>${assessment.riskLevel}</strong> → Auditoría requerida: <strong>${assessment.requiredAuditType === "EXTERNAL_INDEPENDENT" ? "Externa Independiente" : "Interna"}</strong></p>`
		: "<p><em>Pendiente de evaluación.</em></p>"
}

<div class="footer">
  <p>Documento generado conforme al Art. 18-VII de la LFPIORPI (reforma DOF 16/07/2025).
  Alineado con GAFI Recomendación 1 y ENR 2023.</p>
</div>
</body>
</html>`;
}

function generateOrgSection(
	assessment: EbrReportData["orgAssessment"] & {},
): string {
	return `
<h2>Riesgo Organizacional</h2>
<div class="score-card">
  <div class="score-item">
    <div class="label">Riesgo Inherente</div>
    <div class="value">${assessment.inherentRiskScore.toFixed(2)}</div>
  </div>
  <div class="score-item">
    <div class="label">Riesgo Residual</div>
    <div class="value" style="color:${RISK_LEVEL_COLORS[assessment.riskLevel]}">${assessment.residualRiskScore.toFixed(2)}</div>
  </div>
  <div class="score-item">
    <div class="label">Nivel de Riesgo</div>
    <div class="value"><span class="badge" style="background:${RISK_LEVEL_COLORS[assessment.riskLevel]}">${assessment.riskLevel}</span></div>
  </div>
</div>

<h3>Elementos de Riesgo</h3>
<table>
<thead><tr><th>Elemento</th><th>Peso</th><th>Score</th><th>Nivel</th><th>Barra</th></tr></thead>
<tbody>
${assessment.elements
	.map(
		(e) => `<tr>
  <td>${ELEMENT_LABELS[e.elementType] ?? e.elementType}</td>
  <td>${(e.weight * 100).toFixed(0)}%</td>
  <td>${e.riskScore.toFixed(2)}</td>
  <td><span class="badge" style="background:${RISK_LEVEL_COLORS[e.riskLevel]}">${e.riskLevel}</span></td>
  <td><div class="element-bar" style="width:${(e.riskScore / 9) * 100}%;background:${RISK_LEVEL_COLORS[e.riskLevel]}"></div></td>
</tr>`,
	)
	.join("")}
</tbody>
</table>

<h3>Mitigantes</h3>
<table>
<thead><tr><th>Control</th><th>Existe</th><th>Efectividad</th><th>Efecto en Riesgo</th></tr></thead>
<tbody>
${assessment.mitigants
	.map(
		(m) => `<tr>
  <td>${m.mitigantName}</td>
  <td>${m.exists ? "✓" : "✗"}</td>
  <td>${(m.effectivenessScore * 100).toFixed(0)}%</td>
  <td style="color:${m.riskEffect >= 0 ? "#22c55e" : "#ef4444"}">${m.riskEffect >= 0 ? "-" : "+"}${Math.abs(m.riskEffect).toFixed(2)}</td>
</tr>`,
	)
	.join("")}
</tbody>
</table>`;
}

export function generateManualPoliticasHtml(
	data: EbrReportData & { activityName: string },
): string {
	return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Manual de Políticas Internas - ${data.organizationName}</title>
<style>
  body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 40px; color: #1a1a2e; line-height: 1.6; }
  h1 { color: #16213e; border-bottom: 3px solid #0f3460; padding-bottom: 8px; text-align: center; }
  h2 { color: #0f3460; margin-top: 32px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
  h3 { color: #16213e; }
  .meta { color: #666; font-size: 0.9em; text-align: center; margin-bottom: 32px; }
  .article { background: #f8fafc; padding: 12px 16px; border-left: 4px solid #0f3460; margin: 12px 0; font-size: 0.9em; }
  ol, ul { margin-left: 20px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 0.85em; color: #94a3b8; }
  @media print { body { margin: 20px; } }
</style>
</head>
<body>
<h1>Manual de Políticas Internas<br/>para la Prevención e Identificación de<br/>Operaciones con Recursos de Procedencia Ilícita</h1>
<p class="meta">
  ${data.organizationName}<br/>
  Actividad Vulnerable: ${data.activityName}<br/>
  Fecha de emisión: ${data.generatedAt}
</p>

<div class="article">
  <strong>Base legal:</strong> Artículo 18, fracción VIII de la Ley Federal para la Prevención e Identificación
  de Operaciones con Recursos de Procedencia Ilícita (LFPIORPI), reforma DOF 16/07/2025.
</div>

<h2>I. Objeto y Alcance</h2>
<p>El presente Manual establece los criterios, medidas y procedimientos internos que ${data.organizationName}
adopta para el cumplimiento de las obligaciones previstas en la LFPIORPI y su normativa secundaria,
respecto a la prevención e identificación de operaciones con recursos de procedencia ilícita,
financiamiento al terrorismo y financiamiento a la proliferación de armas de destrucción masiva.</p>

<h2>II. Enfoque Basado en Riesgo (Art. 18-VII)</h2>
<p>La organización implementa un enfoque basado en riesgo que permite identificar, analizar, entender y mitigar
tanto los riesgos propios de la entidad como los de las personas clientes o usuarias.</p>

<h3>II.1 Evaluación de Riesgo Organizacional</h3>
<p>Se evalúan cuatro elementos de riesgo con pesos configurables:</p>
<ol>
  <li><strong>Clientes/Usuarios</strong> — Concentración PEP, nacionalidades de riesgo, complejidad BC</li>
  <li><strong>Geográfico</strong> — Zonas de alto riesgo, exposición fronteriza, operaciones transfronterizas</li>
  <li><strong>Productos/Servicios</strong> — Perfil de riesgo ENR, intensidad de efectivo</li>
  <li><strong>Transacciones/Canales</strong> — Operaciones en efectivo, aproximación a umbrales, frecuencia</li>
</ol>

<h3>II.2 Clasificación de Riesgo de Clientes</h3>
<p>Cada cliente es evaluado en las mismas cuatro dimensiones, produciendo un perfil de debida diligencia
diferenciado por factor conforme a la Nota Interpretativa del GAFI R.1, párrafo 16:</p>
<ul>
  <li><strong>Simplificada</strong> (Bajo Riesgo, Art. 19 LFPIORPI): datos mínimos por anexos</li>
  <li><strong>Estándar</strong> (Riesgo Medio): KYC completo conforme Art. 12 RCG</li>
  <li><strong>Reforzada</strong> (Alto Riesgo): verificación profunda de BC + monitoreo continuo</li>
</ul>

<h2>III. Personas Políticamente Expuestas (PEP)</h2>
<p>Se implementan procedimientos para la identificación y seguimiento intensificado de PEPs,
incluyendo consulta a listas oficiales y monitoreo permanente de sus operaciones.</p>

<h2>IV. Monitoreo Automatizado (Art. 18-X)</h2>
<p>La organización cuenta con mecanismos automatizados de monitoreo permanente que incluyen:</p>
<ul>
  <li>Detección de alertas por reglas configurables</li>
  <li>Seguimiento intensificado para clientes de alto riesgo y PEPs</li>
  <li>Umbrales dinámicos basados en el nivel de riesgo del cliente</li>
</ul>

<h2>V. Programa de Capacitación (Art. 18-IX)</h2>
<p>Se establece un programa anual de capacitación dirigido a personal de administración,
cumplimiento y atención al público, con evaluación de efectividad.</p>

<h2>VI. Auditoría (Art. 18-XI)</h2>
${
	data.orgAssessment
		? `<p>Conforme al nivel de riesgo organizacional (${data.orgAssessment.riskLevel}),
se requiere auditoría de tipo: <strong>${data.orgAssessment.requiredAuditType === "EXTERNAL_INDEPENDENT" ? "Externa Independiente" : "Interna"}</strong>.</p>`
		: "<p>El tipo de auditoría se determinará tras completar la evaluación organizacional.</p>"
}

<h2>VII. Conservación de Documentos (Art. 18-IV)</h2>
<p>Todos los documentos, registros y evaluaciones se conservarán por un período mínimo de 10 años
conforme al Art. 18, fracción IV de la LFPIORPI reformada.</p>

<h2>VIII. Vigencia y Actualización</h2>
<p>Este Manual entra en vigor a partir de la fecha de emisión y será revisado anualmente o cuando
se publiquen actualizaciones a la normativa aplicable (RCG, ENR).</p>

<div class="footer">
  <p>Generado conforme al Art. 18-VIII de la LFPIORPI (reforma DOF 16/07/2025).</p>
</div>
</body>
</html>`;
}
