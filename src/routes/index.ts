import { Hono } from "hono";

import type { Bindings } from "../index";
import { authMiddleware, type AuthVariables } from "../middleware/auth";
import { type AdminAuthVariables } from "../middleware/admin-auth";
import { adminRouter } from "./admin";
import { alertRulesRouter } from "./alert-rules";
import { alertsRouter } from "./alerts";
import { catalogsRouter } from "./catalogs";
import { clientsRouter } from "./clients";
import {
	importsRouter,
	importTemplatesRouter,
	importEventsRouter,
	importInternalRouter,
} from "./imports";
import { noticesRouter } from "./notices";
import { organizationSettingsRouter } from "./organization-settings";
import { reportsRouter } from "./reports";
import { transactionsRouter } from "./transactions";
import { umaValuesRouter } from "./uma-values";

export function createRouter() {
	const router = new Hono<{
		Bindings: Bindings;
		Variables: AuthVariables & AdminAuthVariables;
	}>();

	// Public routes (no auth required)
	// Import templates are static CSV files, no auth needed
	router.route("/imports/templates", importTemplatesRouter);
	// Import SSE events handle their own auth (EventSource can't send headers)
	router.route("/imports", importEventsRouter);
	// Internal routes for worker-to-service communication (no auth, service binding only)
	router.route("/internal/imports", importInternalRouter);

	// Apply auth middleware with organization requirement for tenant-scoped routes
	// These routes require an active organization to be selected
	router.use("/clients/*", authMiddleware({ requireOrganization: true }));
	router.use("/transactions/*", authMiddleware({ requireOrganization: true }));
	router.use("/alert-rules/*", authMiddleware({ requireOrganization: true }));
	router.use("/alerts/*", authMiddleware({ requireOrganization: true }));
	router.use("/notices/*", authMiddleware({ requireOrganization: true }));
	router.use("/reports/*", authMiddleware({ requireOrganization: true }));
	router.use("/imports/*", authMiddleware({ requireOrganization: true }));

	// Organization settings requires auth and organization context
	router.use(
		"/organization-settings/*",
		authMiddleware({ requireOrganization: true }),
	);

	// UMA values are global (regulatory standard) - auth required but no org
	router.use("/uma-values/*", authMiddleware());

	// Admin routes use their own auth middleware (checks for admin role)
	// No middleware applied here - adminRouter handles its own auth
	router.route("/admin", adminRouter);

	// Mount resource routers
	router.route("/catalogs", catalogsRouter);
	router.route("/clients", clientsRouter);
	router.route("/transactions", transactionsRouter);
	router.route("/alert-rules", alertRulesRouter);
	router.route("/alerts", alertsRouter);
	router.route("/notices", noticesRouter);
	router.route("/reports", reportsRouter);
	router.route("/uma-values", umaValuesRouter);
	router.route("/organization-settings", organizationSettingsRouter);
	router.route("/imports", importsRouter);

	return router;
}
