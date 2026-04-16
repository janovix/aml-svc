/**
 * Alert Detection Processor
 *
 * Orchestrates the alert detection workflow using seekers.
 * This processor uses direct Prisma DB access instead of RPC calls,
 * since it now runs inside aml-svc.
 */

import type { PrismaClient } from "@prisma/client";

import {
	initializeSeekers,
	getSeekersForActivity,
	type AlertContext,
	type AlertSeeker,
	type SeekerEvaluationResult,
	type SeekerRunResult,
	type SeekerError,
	type VulnerableActivityCode,
	type AlertClient,
	type AlertOperation,
} from "./seekers";
import type { AlertJob, UmaValueEntity } from "./types";
import type { AlertRuleEntity } from "../alert/types";
import { generateContextHash } from "../../lib/hash";
import { retry } from "../../lib/retry";
import { AlertRepository, AlertRuleRepository } from "../alert/repository";
import type { Bindings } from "../../types";
import { t, type LanguageCode, type MessageKey } from "../../lib/i18n";
import { getOrganizationLanguageForTenant } from "../../lib/org-language";
import type {
	ApiKeyEnvironment,
	TenantContext,
} from "../../lib/tenant-context";

const LOG_TAG = "[alert-detection]";

function tenantFromClientAndJob(
	client: Record<string, unknown>,
	job: AlertJob,
): TenantContext {
	const organizationId = String(client.organizationId ?? job.organizationId);
	const raw = String(client.environment ?? "production");
	const environment: ApiKeyEnvironment =
		raw === "staging" || raw === "development" ? raw : "production";
	return { organizationId, environment };
}

function alertSeverityKeys(severity: string): {
	title: MessageKey;
	adj: MessageKey;
} {
	const u = severity.toUpperCase();
	if (u === "CRITICAL")
		return {
			title: "alert.severity.title.CRITICAL",
			adj: "alert.severity.adj.CRITICAL",
		};
	if (u === "HIGH")
		return {
			title: "alert.severity.title.HIGH",
			adj: "alert.severity.adj.HIGH",
		};
	if (u === "MEDIUM")
		return {
			title: "alert.severity.title.MEDIUM",
			adj: "alert.severity.adj.MEDIUM",
		};
	return { title: "alert.severity.title.LOW", adj: "alert.severity.adj.LOW" };
}

interface AlertProcessorConfig {
	useSeekers: boolean;
	fallbackToRuleEvaluator: boolean;
	defaultActivityCode: VulnerableActivityCode;
}

const DEFAULT_CONFIG: AlertProcessorConfig = {
	useSeekers: true,
	fallbackToRuleEvaluator: false,
	defaultActivityCode: "VEH",
};

export class AlertDetectionProcessor {
	private alertRepo: AlertRepository;
	private alertRuleRepo: AlertRuleRepository;
	private config: AlertProcessorConfig;
	private seekersInitialized = false;

	constructor(
		private prisma: PrismaClient,
		private env: Bindings,
		config: Partial<AlertProcessorConfig> = {},
	) {
		this.alertRepo = new AlertRepository(prisma);
		this.alertRuleRepo = new AlertRuleRepository(prisma);
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	private ensureSeekersInitialized(): void {
		if (!this.seekersInitialized) {
			initializeSeekers();
			this.seekersInitialized = true;
		}
	}

	async processJob(job: AlertJob): Promise<void> {
		console.log(
			`${LOG_TAG} Processing job: ${job.type} for client ${job.clientId}`,
		);

		try {
			if (this.config.useSeekers) {
				this.ensureSeekersInitialized();
			}

			const umaValue = await this.getActiveUmaValue();
			if (!umaValue) {
				console.warn(
					`${LOG_TAG} No active UMA value, continuing without UMA thresholds`,
				);
			}

			const rules = await this.alertRuleRepo.listActiveForSeeker();
			if (rules.length === 0) {
				console.log(`${LOG_TAG} No active alert rules found`);
				return;
			}

			const client = await this.getClient(job.clientId);
			if (!client) {
				console.error(`${LOG_TAG} Client ${job.clientId} not found`);
				return;
			}

			const operations = await this.getClientOperations(job.clientId);

			let triggerOperation: AlertOperation | undefined;
			if (job.operationId) {
				triggerOperation = operations.find(
					(op) => op.id === job.operationId,
				) as AlertOperation | undefined;
			}

			if (this.config.useSeekers) {
				const runResult = await this.runSeekers(
					client as AlertClient,
					operations as AlertOperation[],
					triggerOperation,
					umaValue,
					rules,
					job,
				);

				console.log(
					`${LOG_TAG} Seeker run complete: ${runResult.alertsTriggered} alerts from ${runResult.seekersRun} seekers`,
				);
			}

			console.log(`${LOG_TAG} Completed processing for client ${job.clientId}`);
		} catch (error) {
			console.error(
				`${LOG_TAG} Error processing job for client ${job.clientId}:`,
				error,
			);
			throw error;
		}
	}

	private async runSeekers(
		client: AlertClient,
		operations: AlertOperation[],
		triggerOperation: AlertOperation | undefined,
		umaValue: UmaValueEntity | null,
		alertRules: AlertRuleEntity[],
		job: AlertJob,
	): Promise<SeekerRunResult> {
		const startTime = Date.now();
		const errors: SeekerError[] = [];
		const results: SeekerEvaluationResult[] = [];

		const activityCode = this.determineActivityCode(
			triggerOperation,
			operations,
		);

		const seekers = getSeekersForActivity(activityCode);
		if (seekers.length === 0) {
			console.warn(`${LOG_TAG} No seekers for activity ${activityCode}`);
			return {
				activityCode,
				clientId: client.id,
				seekersRun: 0,
				alertsTriggered: 0,
				results: [],
				errors: [],
				totalDurationMs: Date.now() - startTime,
			};
		}

		const context: AlertContext = {
			client,
			operations,
			triggerOperation,
			umaValue,
			alertRules,
			activityCode,
			evaluationTimestamp: new Date().toISOString(),
		};

		for (const seeker of seekers) {
			try {
				const result = await this.runSeeker(seeker, context, job);
				if (result) {
					results.push(result);
				}
			} catch (error) {
				const err = error as Error;
				console.error(`${LOG_TAG} Error in seeker ${seeker.ruleType}:`, err);
				errors.push({
					seekerType: seeker.ruleType,
					message: err.message,
					stack: err.stack,
				});
			}
		}

		return {
			activityCode,
			clientId: client.id,
			seekersRun: seekers.length,
			alertsTriggered: results.length,
			results,
			errors,
			totalDurationMs: Date.now() - startTime,
		};
	}

	private async runSeeker(
		seeker: AlertSeeker,
		context: AlertContext,
		job: AlertJob,
	): Promise<SeekerEvaluationResult | null> {
		const seekerStartTime = Date.now();
		const result = await seeker.evaluate(context);

		if (!result || !result.triggered) {
			return null;
		}

		console.log(
			`${LOG_TAG} Seeker ${seeker.name} triggered for client ${context.client.id}`,
		);

		const idempotencyKey = await seeker.generateIdempotencyKey(context, result);
		const contextHash = await generateContextHash(result.alertMetadata);

		let rule = result.matchedRule;

		if (!rule) {
			const universalSeeker = seeker as unknown as {
				getAlertCodeForActivity?: (code: string) => string | null;
			};
			if (universalSeeker.getAlertCodeForActivity) {
				const alertCode = universalSeeker.getAlertCodeForActivity(
					context.activityCode,
				);
				if (alertCode) {
					rule = context.alertRules.find(
						(r) => r.id === alertCode && r.active && !r.isManualOnly,
					);
				}
			}
		}

		if (!rule) {
			rule = context.alertRules.find(
				(r) => r.ruleType === seeker.ruleType && r.active && !r.isManualOnly,
			);
		}

		if (!rule) {
			console.warn(
				`${LOG_TAG} No matching rule for seeker ${seeker.ruleType}, skipping`,
			);
			return null;
		}

		const alertTenant = tenantFromClientAndJob(
			context.client as Record<string, unknown>,
			job,
		);

		try {
			const alert = await retry(
				() =>
					this.alertRepo.create(
						{
							alertRuleId: rule.id,
							clientId: context.client.id,
							severity: rule.severity || seeker.defaultSeverity,
							idempotencyKey,
							contextHash,
							metadata: {
								...result.alertMetadata,
								seekerType: seeker.ruleType,
								seekerName: seeker.name,
								evaluationDurationMs: Date.now() - seekerStartTime,
							},
							operationId: job.operationId,
							isManual: false,
						},
						alertTenant,
					),
				{ maxRetries: 2 },
			);

			console.log(`${LOG_TAG} Alert created: ${alert.id}`);

			// Send notification
			const notifService = this.env.NOTIFICATIONS_SERVICE;
			if (notifService) {
				try {
					const clientName = (context.client as Record<string, unknown>)
						.name as string | undefined;
					const lang: LanguageCode = await getOrganizationLanguageForTenant(
						this.env,
						job.organizationId,
					);
					const sevKeys = alertSeverityKeys(alert.severity);
					const severityLabel = t(lang, sevKeys.title);
					const severityLower = t(lang, sevKeys.adj);
					const clientDisplay = clientName || alert.clientId;
					const title = t(lang, "alert.new.title", { severityLabel });
					const body = t(lang, "alert.new.body", {
						severityLower,
						clientDisplay,
						seekerName: seeker.name,
					});
					const amlFrontendUrl =
						this.env.TRUSTED_ORIGINS?.split(",")[0] ??
						"https://aml.janovix.workers.dev";
					const callbackUrl = `${amlFrontendUrl.replace(/\/$/, "")}/alerts/${alert.id}`;

					await notifService.notify({
						tenantId: job.organizationId,
						target: { kind: "org" },
						channelSlug: "system",
						type: "aml.alert.detected",
						title,
						body,
						payload: {
							alertId: alert.id,
							clientId: alert.clientId,
							severity: alert.severity,
							seekerName: seeker.name,
							status: alert.status,
						},
						severity:
							alert.severity === "CRITICAL" || alert.severity === "HIGH"
								? "error"
								: alert.severity === "MEDIUM"
									? "warn"
									: "info",
						callbackUrl,
						sendEmail: true,
						emailI18n: {
							titleKey: "alert.new.title",
							bodyKey: "alert.new.body",
							titleParams: { severityLabel },
							bodyParams: {
								severityLower,
								clientDisplay,
								seekerName: seeker.name,
							},
						},
						sourceService: "aml-svc",
						sourceEvent: "seeker.alert.detected",
					});
				} catch (notifError) {
					console.error(
						`${LOG_TAG} Notification failed for ${alert.id}:`,
						notifError,
					);
				}
			}

			return result;
		} catch (error) {
			console.error(
				`${LOG_TAG} Alert creation failed for seeker ${seeker.ruleType}:`,
				error,
			);
			throw error;
		}
	}

	private determineActivityCode(
		triggerOperation: AlertOperation | undefined,
		operations: AlertOperation[],
	): VulnerableActivityCode {
		if (triggerOperation) {
			const code = (triggerOperation as Record<string, unknown>)
				.activityCode as string | undefined;
			if (code) return code as VulnerableActivityCode;
		}

		if (operations.length > 0) {
			const latest = operations[operations.length - 1];
			const code = (latest as Record<string, unknown>).activityCode as
				| string
				| undefined;
			if (code) return code as VulnerableActivityCode;
		}

		return this.config.defaultActivityCode;
	}

	// ── Direct DB access methods (replacing RPC) ──

	private async getActiveUmaValue(): Promise<UmaValueEntity | null> {
		const record = await this.prisma.umaValue.findFirst({
			where: { active: true },
			orderBy: { effectiveDate: "desc" },
		});
		if (!record) return null;
		return {
			id: record.id,
			dailyValue: Number(record.dailyValue),
			active: Boolean(record.active),
			effectiveDate:
				record.effectiveDate instanceof Date
					? record.effectiveDate.toISOString()
					: String(record.effectiveDate),
			createdAt:
				record.createdAt instanceof Date
					? record.createdAt.toISOString()
					: String(record.createdAt),
			updatedAt:
				record.updatedAt instanceof Date
					? record.updatedAt.toISOString()
					: String(record.updatedAt),
		};
	}

	private async getClient(
		clientId: string,
	): Promise<Record<string, unknown> | null> {
		return this.prisma.client.findUnique({
			where: { id: clientId },
		});
	}

	private async getClientOperations(
		clientId: string,
	): Promise<Array<Record<string, unknown>>> {
		const ops = await this.prisma.operation.findMany({
			where: { clientId },
			orderBy: { createdAt: "asc" },
			include: { payments: true },
		});
		return ops.map((op) => ({
			...op,
			amount: Number(op.amount),
			createdAt:
				op.createdAt instanceof Date
					? op.createdAt.toISOString()
					: String(op.createdAt),
		}));
	}
}

export async function processAlertBatch(
	batch: MessageBatch<AlertJob>,
	env: Bindings,
): Promise<void> {
	const { getPrismaClient } = await import("../../lib/prisma");
	const prisma = getPrismaClient(env.DB);
	const processor = new AlertDetectionProcessor(prisma, env);

	for (const message of batch.messages) {
		try {
			await processor.processJob(message.body);
			message.ack();
		} catch (err) {
			console.error(`${LOG_TAG} Failed to process ${message.body.type}:`, err);
			message.retry();
		}
	}
}
