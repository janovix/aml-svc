import { Hono } from "hono";

import type { Bindings } from "../types";
import { authMiddleware, type AuthVariables } from "../middleware/auth";
import { type AdminAuthVariables } from "../middleware/admin-auth";
import { adminRouter } from "./admin";
import { alertRulesRouter } from "./alert-rules";
import { alertsRouter } from "./alerts";
import { catalogsRouter } from "./catalogs";
import { clientsRouter, clientsInternalRouter } from "./clients";
import {
	importsRouter,
	importTemplatesRouter,
	importEventsRouter,
	importInternalRouter,
} from "./imports";
import { invoicesRouter, invoicesInternalRouter } from "./invoices";
import { noticesRouter } from "./notices";
import { operationsRouter, operationsInternalRouter } from "./operations";
import { organizationSettingsRouter } from "./organization-settings";
import { reportsRouter } from "./reports";
// Transaction domain deprecated - use operations instead
import { umaValuesRouter } from "./uma-values";
import { ubosRouter, ubosInternalRouter } from "./ubos";
import { exchangeRatesRouter } from "./exchange-rates";

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
	router.route("/internal/clients", clientsInternalRouter);
	// Transaction internal routes deprecated - use operations
	router.route("/internal/operations", operationsInternalRouter);
	router.route("/internal/invoices", invoicesInternalRouter);
	router.route("/internal/ubos", ubosInternalRouter);

	// Apply auth middleware with organization requirement for tenant-scoped routes
	// These routes require an active organization to be selected
	router.use("/clients/*", authMiddleware({ requireOrganization: true }));
	router.use("/operations/*", authMiddleware({ requireOrganization: true }));
	router.use("/invoices/*", authMiddleware({ requireOrganization: true }));
	router.use("/alert-rules/*", authMiddleware({ requireOrganization: true }));
	router.use("/alerts/*", authMiddleware({ requireOrganization: true }));
	router.use("/notices/*", authMiddleware({ requireOrganization: true }));
	router.use("/reports/*", authMiddleware({ requireOrganization: true }));
	// Note: /imports/templates and /imports/:id/events are public, handled separately above
	router.use("/imports", authMiddleware({ requireOrganization: true }));
	router.use("/imports/:id", authMiddleware({ requireOrganization: true }));
	router.use("/imports/:id/*", authMiddleware({ requireOrganization: true }));

	// Organization settings requires auth and organization context
	router.use(
		"/organization-settings/*",
		authMiddleware({ requireOrganization: true }),
	);

	// Exchange rates are global utility - auth required but no org
	router.use("/exchange-rates/*", authMiddleware());

	// UMA values are global (regulatory standard) - auth required but no org
	router.use("/uma-values/*", authMiddleware());

	// Admin routes use their own auth middleware (checks for admin role)
	// No middleware applied here - adminRouter handles its own auth
	router.route("/admin", adminRouter);

	// Mount resource routers
	router.route("/catalogs", catalogsRouter);
	router.route("/clients", clientsRouter);
	router.route("/clients", ubosRouter); // UBO routes nested under clients (/:clientId/ubos/*)
	router.route("/operations", operationsRouter);
	router.route("/invoices", invoicesRouter);
	router.route("/alert-rules", alertRulesRouter);
	router.route("/alerts", alertsRouter);
	router.route("/notices", noticesRouter);
	router.route("/reports", reportsRouter);
	router.route("/exchange-rates", exchangeRatesRouter);
	router.route("/uma-values", umaValuesRouter);
	router.route("/organization-settings", organizationSettingsRouter);
	router.route("/imports", importsRouter);

	return router;
}
