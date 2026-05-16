import type { PrismaClient } from "@prisma/client";

/**
 * Best-effort purge of all AML tenant data for the given organization IDs.
 * Order respects common FK dependencies (children before parents).
 */
export async function purgeAmlOrganizations(
	prisma: PrismaClient,
	organizationIds: string[],
): Promise<{ deletedOrgs: number; errors: string[] }> {
	const errors: string[] = [];
	if (organizationIds.length === 0) {
		return { deletedOrgs: 0, errors };
	}

	const inOrg = { in: organizationIds };

	async function run(label: string, fn: () => Promise<unknown>): Promise<void> {
		try {
			await fn();
		} catch (e) {
			errors.push(`${label}: ${e instanceof Error ? e.message : String(e)}`);
		}
	}

	await run("chatAbuseEvent", () =>
		prisma.chatAbuseEvent.deleteMany({ where: { organizationId: inOrg } }),
	);
	await run("chatThread", () =>
		prisma.chatThread.deleteMany({ where: { organizationId: inOrg } }),
	);
	await run("alert", () =>
		prisma.alert.deleteMany({ where: { organizationId: inOrg } }),
	);
	await run("notice", () =>
		prisma.notice.deleteMany({ where: { organizationId: inOrg } }),
	);
	await run("report", () =>
		prisma.report.deleteMany({ where: { organizationId: inOrg } }),
	);
	await run("import", () =>
		prisma.import.deleteMany({ where: { organizationId: inOrg } }),
	);

	const sessions = await prisma.kycSession.findMany({
		where: { organizationId: inOrg },
		select: { id: true },
	});
	for (const s of sessions) {
		await run("kycSessionEvent", () =>
			prisma.kycSessionEvent.deleteMany({ where: { sessionId: s.id } }),
		);
	}
	await run("kycSession", () =>
		prisma.kycSession.deleteMany({ where: { organizationId: inOrg } }),
	);

	await run("orgRiskAssessment", () =>
		prisma.orgRiskAssessment.deleteMany({ where: { organizationId: inOrg } }),
	);
	await run("clientRiskAssessment", () =>
		prisma.clientRiskAssessment.deleteMany({
			where: { organizationId: inOrg },
		}),
	);
	await run("riskMethodology", () =>
		prisma.riskMethodology.deleteMany({
			where: { organizationId: { in: organizationIds } },
		}),
	);

	await run("operation", () =>
		prisma.operation.deleteMany({ where: { organizationId: inOrg } }),
	);
	await run("invoice", () =>
		prisma.invoice.deleteMany({ where: { organizationId: inOrg } }),
	);
	await run("uploadLink", () =>
		prisma.uploadLink.deleteMany({ where: { organizationId: inOrg } }),
	);
	await run("client", () =>
		prisma.client.deleteMany({ where: { organizationId: inOrg } }),
	);
	await run("organizationSettings", () =>
		prisma.organizationSettings.deleteMany({
			where: { organizationId: inOrg },
		}),
	);

	return { deletedOrgs: organizationIds.length, errors };
}
