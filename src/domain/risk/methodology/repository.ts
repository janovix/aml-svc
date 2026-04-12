import type { PrismaClient } from "@prisma/client";
import { generateId } from "../../../lib/id-generator";
import type {
	MethodologyCreateInput,
	MethodologyScope,
	MethodologyWithSource,
	ResolvedMethodology,
} from "./types";
import { parseMethodology } from "./parser";
import { SYSTEM_DEFAULT_METHODOLOGY } from "./defaults";

const INCLUDE_ALL_RELATIONS = {
	categories: {
		include: {
			factors: {
				include: { scoreMaps: true },
			},
		},
	},
	thresholds: true,
	mitigants: true,
} as const;

export class RiskMethodologyRepository {
	constructor(private readonly prisma: PrismaClient) {}

	/**
	 * Cascading resolution: ORGANIZATION -> ACTIVITY -> SYSTEM.
	 * Returns the effective methodology plus which scope it came from.
	 */
	async resolve(
		organizationId: string,
		activityKey: string,
	): Promise<MethodologyWithSource> {
		// 1. Check org-level override
		const orgMethodology = await this.prisma.riskMethodology.findFirst({
			where: { scope: "ORGANIZATION", organizationId, status: "ACTIVE" },
			include: INCLUDE_ALL_RELATIONS,
		});
		if (orgMethodology) {
			return {
				...parseMethodology(orgMethodology),
				sourceScope: "ORGANIZATION",
			};
		}

		// 2. Check activity-level default
		const activityMethodology = await this.prisma.riskMethodology.findFirst({
			where: { scope: "ACTIVITY", activityKey, status: "ACTIVE" },
			include: INCLUDE_ALL_RELATIONS,
		});
		if (activityMethodology) {
			return {
				...parseMethodology(activityMethodology),
				sourceScope: "ACTIVITY",
			};
		}

		// 3. Fall back to system default
		const systemMethodology = await this.prisma.riskMethodology.findFirst({
			where: { scope: "SYSTEM", status: "ACTIVE" },
			include: INCLUDE_ALL_RELATIONS,
		});
		if (systemMethodology) {
			return {
				...parseMethodology(systemMethodology),
				sourceScope: "SYSTEM",
			};
		}

		// 4. No methodology in DB at all — seed and return system default
		const seeded = await this.seedSystemDefault();
		return { ...seeded, sourceScope: "SYSTEM" };
	}

	async getById(id: string): Promise<ResolvedMethodology | null> {
		const m = await this.prisma.riskMethodology.findUnique({
			where: { id },
			include: INCLUDE_ALL_RELATIONS,
		});
		return m ? parseMethodology(m) : null;
	}

	async listAll(
		scopeFilter?: MethodologyScope,
	): Promise<ResolvedMethodology[]> {
		const where = scopeFilter
			? { scope: scopeFilter, status: { not: "ARCHIVED" } }
			: { status: { not: "ARCHIVED" } };
		const methodologies = await this.prisma.riskMethodology.findMany({
			where,
			include: INCLUDE_ALL_RELATIONS,
			orderBy: { createdAt: "desc" },
		});
		return methodologies.map(parseMethodology);
	}

	async create(input: MethodologyCreateInput): Promise<ResolvedMethodology> {
		const methodologyId = generateId("RISK_METHODOLOGY");

		await this.prisma.riskMethodology.create({
			data: {
				id: methodologyId,
				scope: input.scope,
				activityKey: input.activityKey ?? null,
				organizationId: input.organizationId ?? null,
				name: input.name,
				description: input.description ?? null,
				createdBy: input.createdBy,
				categories: {
					create: input.categories.map((cat, catIdx) => {
						const categoryId = generateId("RISK_CATEGORY");
						return {
							id: categoryId,
							name: cat.name,
							displayName: cat.displayName,
							weight: cat.weight,
							displayOrder: catIdx,
							factors: {
								create: cat.factors.map((f, fIdx) => {
									const factorId = generateId("RISK_FACTOR");
									return {
										id: factorId,
										name: f.name,
										displayName: f.displayName,
										weight: f.weight,
										factorType: f.factorType,
										dataSource: f.dataSource,
										displayOrder: fIdx,
										description: f.description ?? null,
										scoreMaps: {
											create: f.scoreMaps.map((sm, smIdx) => ({
												id: generateId("RISK_FACTOR_SCORE_MAP"),
												conditionType: sm.conditionType,
												conditionValue: sm.conditionValue,
												score: sm.score,
												label: sm.label ?? null,
												displayOrder: smIdx,
											})),
										},
									};
								}),
							},
						};
					}),
				},
				thresholds: {
					create: input.thresholds.map((t, idx) => ({
						id: generateId("RISK_THRESHOLD"),
						riskLevel: t.riskLevel,
						minScore: t.minScore,
						maxScore: t.maxScore,
						ddLevel: t.ddLevel,
						reviewMonths: t.reviewMonths,
						displayOrder: idx,
					})),
				},
				mitigants: {
					create: input.mitigants.map((m, idx) => ({
						id: generateId("RISK_MITIGANT_DEF"),
						mitigantKey: m.mitigantKey,
						displayName: m.displayName,
						maxEffect: m.maxEffect,
						weight: m.weight,
						dataSource: m.dataSource,
						displayOrder: idx,
					})),
				},
			},
		});

		await this.logChange(methodologyId, "CREATED", input.createdBy, null);

		const created = await this.getById(methodologyId);
		return created!;
	}

	async archive(
		id: string,
		changedBy: string,
		justification?: string,
	): Promise<void> {
		await this.prisma.riskMethodology.update({
			where: { id },
			data: { status: "ARCHIVED", updatedAt: new Date() },
		});
		await this.logChange(id, "ARCHIVED", changedBy, justification ?? null);
	}

	async resetOrgToDefault(
		organizationId: string,
		changedBy: string,
	): Promise<void> {
		const existing = await this.prisma.riskMethodology.findFirst({
			where: { scope: "ORGANIZATION", organizationId, status: "ACTIVE" },
		});
		if (existing) {
			await this.archive(
				existing.id,
				changedBy,
				"Reset to default methodology",
			);
		}
	}

	async seedSystemDefault(): Promise<ResolvedMethodology> {
		const existing = await this.prisma.riskMethodology.findFirst({
			where: { scope: "SYSTEM", status: "ACTIVE" },
			include: INCLUDE_ALL_RELATIONS,
		});
		if (existing) return parseMethodology(existing);

		return this.create(SYSTEM_DEFAULT_METHODOLOGY);
	}

	async logChange(
		methodologyId: string,
		changeType: string,
		changedBy: string,
		justification: string | null,
		previousValue?: string,
		newValue?: string,
	): Promise<void> {
		await this.prisma.methodologyAuditLog.create({
			data: {
				id: generateId("METHODOLOGY_AUDIT_LOG"),
				methodologyId,
				changeType,
				changedBy,
				justification,
				previousValue: previousValue ?? null,
				newValue: newValue ?? null,
			},
		});
	}
}
