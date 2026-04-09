/**
 * Risk Queue Processor
 *
 * Processes risk assessment jobs from RISK_ASSESSMENT_QUEUE.
 * Consumed by aml-svc itself via the queue handler in index.ts.
 */

import type { Bindings } from "../types";
import type { RiskJob } from "./risk-queue";
import { getPrismaClient } from "./prisma";
import {
	ClientRiskService,
	OrgRiskService,
	loadRiskLookups,
} from "../domain/risk";
import { sendRiskNotification } from "./risk-notifications";

export async function processRiskJob(
	env: Bindings,
	job: RiskJob,
): Promise<void> {
	const prisma = getPrismaClient(env.DB);

	switch (job.type) {
		case "client.assess":
		case "client.reassess":
		case "screening.risk_update":
		case "operation.risk_check": {
			if (!job.clientId) {
				console.error(`[risk-queue] ${job.type} job missing clientId`);
				return;
			}

			const lookups = await loadRiskLookups(prisma);
			const service = new ClientRiskService(prisma);

			const { result, previousLevel } = await service.assessClient(
				job.clientId,
				job.organizationId,
				lookups,
				job.triggerReason,
			);

			console.log(
				`[risk-queue] Client ${job.clientId} assessed: ${result.riskLevel} (score: ${result.residualRiskScore.toFixed(2)})`,
			);

			await emitClientNotifications(env, result, previousLevel, job);
			break;
		}

		case "client.batch_assess": {
			const lookups = await loadRiskLookups(prisma);
			const service = new ClientRiskService(prisma);

			const clients = await prisma.client.findMany({
				where: {
					organizationId: job.organizationId,
					deletedAt: null,
				},
				select: { id: true },
			});

			let highCount = 0;
			let mediumCount = 0;
			let lowCount = 0;

			for (const client of clients) {
				try {
					const { result } = await service.assessClient(
						client.id,
						job.organizationId,
						lookups,
						job.triggerReason,
					);

					if (result.riskLevel === "HIGH") highCount++;
					else if (
						result.riskLevel === "MEDIUM" ||
						result.riskLevel === "MEDIUM_LOW"
					)
						mediumCount++;
					else lowCount++;
				} catch (err) {
					console.error(
						`[risk-queue] Batch: failed for client ${client.id}:`,
						err,
					);
				}
			}

			console.log(
				`[risk-queue] Batch complete: ${clients.length} clients assessed`,
			);

			await sendRiskNotification(env, {
				type: "aml.risk.batch_complete",
				organizationId: job.organizationId,
				totalAssessed: clients.length,
				highRiskCount: highCount,
				mediumRiskCount: mediumCount,
				lowRiskCount: lowCount,
			});
			break;
		}

		case "org.assess": {
			const orgService = new OrgRiskService(prisma);
			const {
				result: orgResult,
				previousLevel: prevOrgLevel,
				previousAuditType,
			} = await orgService.assessOrganization(
				job.organizationId,
				job.triggerReason,
			);

			console.log(
				`[risk-queue] Org ${job.organizationId} assessed: ${orgResult.riskLevel} (audit: ${orgResult.requiredAuditType})`,
			);

			if (prevOrgLevel && prevOrgLevel !== orgResult.riskLevel) {
				await sendRiskNotification(env, {
					type: "aml.risk.org_changed",
					organizationId: job.organizationId,
					previousLevel: prevOrgLevel,
					newLevel: orgResult.riskLevel,
				});
			}

			if (
				previousAuditType &&
				previousAuditType !== orgResult.requiredAuditType &&
				orgResult.requiredAuditType === "EXTERNAL_INDEPENDENT"
			) {
				await sendRiskNotification(env, {
					type: "aml.risk.audit_escalated",
					organizationId: job.organizationId,
					previousAuditType,
					newAuditType: orgResult.requiredAuditType,
					riskLevel: orgResult.riskLevel,
				});
			}
			break;
		}
	}
}

async function emitClientNotifications(
	env: Bindings,
	result: {
		clientId: string;
		organizationId: string;
		riskLevel: string;
		residualRiskScore: number;
		elements: Record<string, unknown>;
	},
	previousLevel: string | null,
	job: RiskJob,
): Promise<void> {
	// Look up client name for notifications
	const prisma = getPrismaClient(env.DB);
	const client = await prisma.client.findUnique({
		where: { id: result.clientId },
		select: {
			firstName: true,
			lastName: true,
			businessName: true,
			personType: true,
			isPEP: true,
			ofacSanctioned: true,
			unscSanctioned: true,
		},
	});

	const clientName =
		client?.personType === "PHYSICAL"
			? `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim()
			: (client?.businessName ?? result.clientId);

	if (result.riskLevel === "HIGH") {
		await sendRiskNotification(env, {
			type: "aml.risk.client_high",
			organizationId: job.organizationId,
			clientId: result.clientId,
			clientName,
			riskLevel: result.riskLevel,
			previousLevel: previousLevel ?? undefined,
			factors: result.elements as Record<string, unknown>,
		});
	}

	if (
		result.riskLevel === "HIGH" &&
		client?.isPEP &&
		(client?.ofacSanctioned || client?.unscSanctioned)
	) {
		await sendRiskNotification(env, {
			type: "aml.risk.client_critical",
			organizationId: job.organizationId,
			clientId: result.clientId,
			clientName,
			riskLevel: result.riskLevel,
			isPep: true,
			hasWatchlistHit: true,
		});
	}

	if (previousLevel && previousLevel !== result.riskLevel) {
		await sendRiskNotification(env, {
			type: "aml.risk.client_changed",
			organizationId: job.organizationId,
			clientId: result.clientId,
			clientName,
			previousLevel,
			newLevel: result.riskLevel,
		});
	}

	if (result.riskLevel === "LOW") {
		await sendRiskNotification(env, {
			type: "aml.risk.simplified_dd",
			organizationId: job.organizationId,
			clientId: result.clientId,
			clientName,
		});
	}
}
