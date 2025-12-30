import { Hono } from "hono";

import type { Bindings } from "../index";
import { authMiddleware, type AuthVariables } from "../middleware/auth";
import { alertRulesRouter } from "./alert-rules";
import { alertsRouter } from "./alerts";
import { catalogsRouter } from "./catalogs";
import { clientsRouter } from "./clients";
import { organizationSettingsRouter } from "./organization-settings";
import { transactionsRouter } from "./transactions";
import { umaValuesRouter } from "./uma-values";

export function createRouter() {
	const router = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>();

	// Apply auth middleware with organization requirement for tenant-scoped routes
	// These routes require an active organization to be selected
	router.use("/clients/*", authMiddleware({ requireOrganization: true }));
	router.use("/transactions/*", authMiddleware({ requireOrganization: true }));
	router.use("/alert-rules/*", authMiddleware({ requireOrganization: true }));
	router.use("/alerts/*", authMiddleware({ requireOrganization: true }));

	// Organization settings requires auth and organization context
	router.use(
		"/organization-settings/*",
		authMiddleware({ requireOrganization: true }),
	);

	// UMA values are global (regulatory standard) - auth required but no org
	router.use("/uma-values/*", authMiddleware());

	// Mount resource routers
	router.route("/catalogs", catalogsRouter);
	router.route("/clients", clientsRouter);
	router.route("/transactions", transactionsRouter);
	router.route("/alert-rules", alertRulesRouter);
	router.route("/alerts", alertsRouter);
	router.route("/uma-values", umaValuesRouter);
	router.route("/organization-settings", organizationSettingsRouter);

	return router;
}
