export type ScreeningRescanJob = {
	kind: "client" | "bc";
	organizationId: string;
	entityId: string;
	triggeredBy: "scheduled" | "manual";
};
