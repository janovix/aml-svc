/**
 * SVG Chart Generator
 *
 * Generates SVG charts that can be embedded in HTML/PDF reports.
 * Charts are rendered as pure SVG without JavaScript dependencies.
 */

export interface ChartData {
	label: string;
	value: number;
	color?: string;
}

export interface TimeSeriesData {
	date: string;
	value: number;
	label?: string;
}

export interface StackedData {
	category: string;
	segments: Array<{ label: string; value: number; color?: string }>;
}

export interface ChartOptions {
	width?: number;
	height?: number;
	title?: string;
	showLegend?: boolean;
	colors?: string[];
}

// Default color palette
const DEFAULT_COLORS = [
	"#3b82f6", // blue
	"#10b981", // emerald
	"#f59e0b", // amber
	"#ef4444", // red
	"#8b5cf6", // violet
	"#06b6d4", // cyan
	"#f97316", // orange
	"#84cc16", // lime
	"#ec4899", // pink
	"#6366f1", // indigo
];

// Severity colors
export const SEVERITY_COLORS: Record<string, string> = {
	LOW: "#6b7280",
	MEDIUM: "#f59e0b",
	HIGH: "#f97316",
	CRITICAL: "#ef4444",
};

// Status colors
export const STATUS_COLORS: Record<string, string> = {
	DETECTED: "#3b82f6",
	FILE_GENERATED: "#8b5cf6",
	SUBMITTED: "#10b981",
	OVERDUE: "#ef4444",
	CANCELLED: "#6b7280",
};

function escapeXml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

/**
 * Generate a pie chart SVG
 */
export function generatePieChart(
	data: ChartData[],
	options: ChartOptions = {},
): string {
	const width = options.width || 300;
	const height = options.height || 300;
	const colors = options.colors || DEFAULT_COLORS;
	const showLegend = options.showLegend !== false;

	const chartWidth = showLegend ? width * 0.6 : width;
	const centerX = chartWidth / 2;
	const centerY = height / 2;
	const radius = Math.min(centerX, centerY) - 20;

	const total = data.reduce((sum, d) => sum + d.value, 0);
	if (total === 0) {
		return generateEmptyChart(width, height, "No data available");
	}

	let currentAngle = -Math.PI / 2; // Start at top
	const paths: string[] = [];
	const legendItems: string[] = [];

	data.forEach((item, index) => {
		const percentage = item.value / total;
		const angle = percentage * 2 * Math.PI;
		const color = item.color || colors[index % colors.length];

		// Calculate arc path
		const startX = centerX + radius * Math.cos(currentAngle);
		const startY = centerY + radius * Math.sin(currentAngle);
		const endX = centerX + radius * Math.cos(currentAngle + angle);
		const endY = centerY + radius * Math.sin(currentAngle + angle);

		const largeArcFlag = angle > Math.PI ? 1 : 0;

		if (data.length === 1) {
			// Full circle for single item
			paths.push(
				`<circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="${color}" />`,
			);
		} else {
			paths.push(
				`<path d="M ${centerX} ${centerY} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z" fill="${color}" />`,
			);
		}

		// Legend item
		if (showLegend) {
			const legendY = 30 + index * 25;
			legendItems.push(`
				<rect x="${chartWidth + 10}" y="${legendY - 10}" width="15" height="15" fill="${color}" rx="2" />
				<text x="${chartWidth + 30}" y="${legendY}" fill="#374151" font-size="12" font-family="system-ui">${escapeXml(item.label)} (${Math.round(percentage * 100)}%)</text>
			`);
		}

		currentAngle += angle;
	});

	const title = options.title
		? `<text x="${width / 2}" y="15" text-anchor="middle" fill="#1f2937" font-size="14" font-weight="600" font-family="system-ui">${escapeXml(options.title)}</text>`
		: "";

	return `
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
			${title}
			<g transform="translate(0, ${options.title ? 20 : 0})">
				${paths.join("\n")}
				${legendItems.join("\n")}
			</g>
		</svg>
	`.trim();
}

/**
 * Generate a donut chart SVG
 */
export function generateDonutChart(
	data: ChartData[],
	options: ChartOptions = {},
): string {
	const width = options.width || 300;
	const height = options.height || 300;
	const colors = options.colors || DEFAULT_COLORS;
	const showLegend = options.showLegend !== false;

	const chartWidth = showLegend ? width * 0.6 : width;
	const centerX = chartWidth / 2;
	const centerY = height / 2;
	const outerRadius = Math.min(centerX, centerY) - 20;
	const innerRadius = outerRadius * 0.6;

	const total = data.reduce((sum, d) => sum + d.value, 0);
	if (total === 0) {
		return generateEmptyChart(width, height, "No data available");
	}

	let currentAngle = -Math.PI / 2;
	const paths: string[] = [];
	const legendItems: string[] = [];

	data.forEach((item, index) => {
		const percentage = item.value / total;
		const angle = percentage * 2 * Math.PI;
		const color = item.color || colors[index % colors.length];

		// Calculate arc path
		const startOuterX = centerX + outerRadius * Math.cos(currentAngle);
		const startOuterY = centerY + outerRadius * Math.sin(currentAngle);
		const endOuterX = centerX + outerRadius * Math.cos(currentAngle + angle);
		const endOuterY = centerY + outerRadius * Math.sin(currentAngle + angle);
		const startInnerX = centerX + innerRadius * Math.cos(currentAngle + angle);
		const startInnerY = centerY + innerRadius * Math.sin(currentAngle + angle);
		const endInnerX = centerX + innerRadius * Math.cos(currentAngle);
		const endInnerY = centerY + innerRadius * Math.sin(currentAngle);

		const largeArcFlag = angle > Math.PI ? 1 : 0;

		paths.push(
			`<path d="M ${startOuterX} ${startOuterY} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${endOuterX} ${endOuterY} L ${startInnerX} ${startInnerY} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${endInnerX} ${endInnerY} Z" fill="${color}" />`,
		);

		// Legend item
		if (showLegend) {
			const legendY = 30 + index * 25;
			legendItems.push(`
				<rect x="${chartWidth + 10}" y="${legendY - 10}" width="15" height="15" fill="${color}" rx="2" />
				<text x="${chartWidth + 30}" y="${legendY}" fill="#374151" font-size="12" font-family="system-ui">${escapeXml(item.label)} (${Math.round(percentage * 100)}%)</text>
			`);
		}

		currentAngle += angle;
	});

	// Center text showing total
	const centerText = `
		<text x="${centerX}" y="${centerY - 5}" text-anchor="middle" fill="#1f2937" font-size="24" font-weight="700" font-family="system-ui">${total}</text>
		<text x="${centerX}" y="${centerY + 15}" text-anchor="middle" fill="#6b7280" font-size="12" font-family="system-ui">Total</text>
	`;

	const title = options.title
		? `<text x="${width / 2}" y="15" text-anchor="middle" fill="#1f2937" font-size="14" font-weight="600" font-family="system-ui">${escapeXml(options.title)}</text>`
		: "";

	return `
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
			${title}
			<g transform="translate(0, ${options.title ? 20 : 0})">
				${paths.join("\n")}
				${centerText}
				${legendItems.join("\n")}
			</g>
		</svg>
	`.trim();
}

/**
 * Generate a bar chart SVG
 */
export function generateBarChart(
	data: ChartData[],
	options: ChartOptions = {},
): string {
	const width = options.width || 400;
	const height = options.height || 250;
	const colors = options.colors || DEFAULT_COLORS;

	const padding = { top: 40, right: 20, bottom: 60, left: 50 };
	const chartWidth = width - padding.left - padding.right;
	const chartHeight = height - padding.top - padding.bottom;

	if (data.length === 0) {
		return generateEmptyChart(width, height, "No data available");
	}

	const maxValue = Math.max(...data.map((d) => d.value), 1);
	const barWidth = Math.min(chartWidth / data.length - 10, 40);
	const barGap = (chartWidth - barWidth * data.length) / (data.length + 1);

	const bars: string[] = [];
	const labels: string[] = [];

	data.forEach((item, index) => {
		const barHeight = (item.value / maxValue) * chartHeight;
		const x = padding.left + barGap + index * (barWidth + barGap);
		const y = padding.top + chartHeight - barHeight;
		const color = item.color || colors[index % colors.length];

		bars.push(
			`<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" rx="4" />`,
		);

		// Value label on top of bar
		bars.push(
			`<text x="${x + barWidth / 2}" y="${y - 5}" text-anchor="middle" fill="#374151" font-size="11" font-family="system-ui">${item.value}</text>`,
		);

		// X-axis label
		const labelY = padding.top + chartHeight + 20;
		labels.push(
			`<text x="${x + barWidth / 2}" y="${labelY}" text-anchor="middle" fill="#6b7280" font-size="10" font-family="system-ui" transform="rotate(-45, ${x + barWidth / 2}, ${labelY})">${escapeXml(item.label.substring(0, 12))}</text>`,
		);
	});

	// Y-axis
	const yAxisTicks: string[] = [];
	for (let i = 0; i <= 4; i++) {
		const value = Math.round((maxValue / 4) * i);
		const y = padding.top + chartHeight - (chartHeight / 4) * i;
		yAxisTicks.push(
			`<text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" fill="#6b7280" font-size="10" font-family="system-ui">${value}</text>`,
		);
		yAxisTicks.push(
			`<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#e5e7eb" stroke-width="1" />`,
		);
	}

	const title = options.title
		? `<text x="${width / 2}" y="20" text-anchor="middle" fill="#1f2937" font-size="14" font-weight="600" font-family="system-ui">${escapeXml(options.title)}</text>`
		: "";

	return `
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
			${title}
			${yAxisTicks.join("\n")}
			${bars.join("\n")}
			${labels.join("\n")}
		</svg>
	`.trim();
}

/**
 * Generate a line chart SVG
 */
export function generateLineChart(
	data: TimeSeriesData[],
	options: ChartOptions = {},
): string {
	const width = options.width || 400;
	const height = options.height || 250;
	const color = options.colors?.[0] || "#3b82f6";

	const padding = { top: 40, right: 20, bottom: 60, left: 50 };
	const chartWidth = width - padding.left - padding.right;
	const chartHeight = height - padding.top - padding.bottom;

	if (data.length === 0) {
		return generateEmptyChart(width, height, "No data available");
	}

	const maxValue = Math.max(...data.map((d) => d.value), 1);
	const minValue = 0;

	// Calculate points
	const points: Array<{ x: number; y: number }> = data.map((item, index) => {
		const x = padding.left + (index / (data.length - 1 || 1)) * chartWidth;
		const y =
			padding.top +
			chartHeight -
			((item.value - minValue) / (maxValue - minValue || 1)) * chartHeight;
		return { x, y };
	});

	// Create line path
	const linePath = points
		.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
		.join(" ");

	// Create area path (filled below line)
	const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

	// X-axis labels (show every nth label to avoid crowding)
	const labelStep = Math.ceil(data.length / 6);
	const xLabels = data
		.filter((_, i) => i % labelStep === 0)
		.map((item, i) => {
			const x =
				padding.left + ((i * labelStep) / (data.length - 1 || 1)) * chartWidth;
			return `<text x="${x}" y="${padding.top + chartHeight + 20}" text-anchor="middle" fill="#6b7280" font-size="10" font-family="system-ui">${escapeXml(item.date.substring(5))}</text>`;
		});

	// Y-axis ticks
	const yAxisTicks: string[] = [];
	for (let i = 0; i <= 4; i++) {
		const value = Math.round((maxValue / 4) * i);
		const y = padding.top + chartHeight - (chartHeight / 4) * i;
		yAxisTicks.push(
			`<text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" fill="#6b7280" font-size="10" font-family="system-ui">${value}</text>`,
		);
		yAxisTicks.push(
			`<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#e5e7eb" stroke-width="1" />`,
		);
	}

	// Data points
	const dataPoints = points
		.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="4" fill="${color}" />`)
		.join("\n");

	const title = options.title
		? `<text x="${width / 2}" y="20" text-anchor="middle" fill="#1f2937" font-size="14" font-weight="600" font-family="system-ui">${escapeXml(options.title)}</text>`
		: "";

	return `
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
			${title}
			${yAxisTicks.join("\n")}
			<path d="${areaPath}" fill="${color}" fill-opacity="0.1" />
			<path d="${linePath}" fill="none" stroke="${color}" stroke-width="2" />
			${dataPoints}
			${xLabels.join("\n")}
		</svg>
	`.trim();
}

/**
 * Generate a stacked bar chart SVG
 */
export function generateStackedBarChart(
	data: StackedData[],
	options: ChartOptions = {},
): string {
	const width = options.width || 400;
	const height = options.height || 300;
	const colors = options.colors || DEFAULT_COLORS;
	const showLegend = options.showLegend !== false;

	const padding = {
		top: 40,
		right: showLegend ? 150 : 20,
		bottom: 60,
		left: 50,
	};
	const chartWidth = width - padding.left - padding.right;
	const chartHeight = height - padding.top - padding.bottom;

	if (data.length === 0) {
		return generateEmptyChart(width, height, "No data available");
	}

	// Get all unique segment labels
	const segmentLabels = [
		...new Set(data.flatMap((d) => d.segments.map((s) => s.label))),
	];

	// Calculate max total
	const maxTotal = Math.max(
		...data.map((d) => d.segments.reduce((sum, s) => sum + s.value, 0)),
		1,
	);

	const barWidth = Math.min(chartWidth / data.length - 10, 40);
	const barGap = (chartWidth - barWidth * data.length) / (data.length + 1);

	const bars: string[] = [];
	const labels: string[] = [];

	data.forEach((item, index) => {
		const x = padding.left + barGap + index * (barWidth + barGap);
		let currentY = padding.top + chartHeight;

		item.segments.forEach((segment) => {
			const segmentHeight = (segment.value / maxTotal) * chartHeight;
			const y = currentY - segmentHeight;
			const segmentIndex = segmentLabels.indexOf(segment.label);
			const color = segment.color || colors[segmentIndex % colors.length];

			bars.push(
				`<rect x="${x}" y="${y}" width="${barWidth}" height="${segmentHeight}" fill="${color}" />`,
			);

			currentY = y;
		});

		// X-axis label
		const labelY = padding.top + chartHeight + 20;
		labels.push(
			`<text x="${x + barWidth / 2}" y="${labelY}" text-anchor="middle" fill="#6b7280" font-size="10" font-family="system-ui" transform="rotate(-45, ${x + barWidth / 2}, ${labelY})">${escapeXml(item.category.substring(0, 10))}</text>`,
		);
	});

	// Legend
	const legendItems: string[] = [];
	if (showLegend) {
		segmentLabels.forEach((label, index) => {
			const legendY = padding.top + 20 + index * 25;
			const color = colors[index % colors.length];
			legendItems.push(`
				<rect x="${width - 140}" y="${legendY - 10}" width="15" height="15" fill="${color}" rx="2" />
				<text x="${width - 120}" y="${legendY}" fill="#374151" font-size="11" font-family="system-ui">${escapeXml(label)}</text>
			`);
		});
	}

	// Y-axis
	const yAxisTicks: string[] = [];
	for (let i = 0; i <= 4; i++) {
		const value = Math.round((maxTotal / 4) * i);
		const y = padding.top + chartHeight - (chartHeight / 4) * i;
		yAxisTicks.push(
			`<text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" fill="#6b7280" font-size="10" font-family="system-ui">${value}</text>`,
		);
		yAxisTicks.push(
			`<line x1="${padding.left}" y1="${y}" x2="${padding.left + chartWidth}" y2="${y}" stroke="#e5e7eb" stroke-width="1" />`,
		);
	}

	const title = options.title
		? `<text x="${(width - (showLegend ? 150 : 0)) / 2}" y="20" text-anchor="middle" fill="#1f2937" font-size="14" font-weight="600" font-family="system-ui">${escapeXml(options.title)}</text>`
		: "";

	return `
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
			${title}
			${yAxisTicks.join("\n")}
			${bars.join("\n")}
			${labels.join("\n")}
			${legendItems.join("\n")}
		</svg>
	`.trim();
}

/**
 * Generate an empty chart placeholder
 */
function generateEmptyChart(
	width: number,
	height: number,
	message: string,
): string {
	return `
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
			<rect x="0" y="0" width="${width}" height="${height}" fill="#f9fafb" rx="8" />
			<text x="${width / 2}" y="${height / 2}" text-anchor="middle" fill="#9ca3af" font-size="14" font-family="system-ui">${escapeXml(message)}</text>
		</svg>
	`.trim();
}
