import { Hono } from "hono";

import type { Bindings } from "../types";
import { authMiddleware, type AuthVariables } from "../middleware/auth";
import { requireActiveOrganization } from "../middleware/organization-active";
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
import { shareholdersRouter } from "./shareholders";
import {
	beneficialControllersRouter,
	beneficialControllersInternalRouter,
} from "./beneficial-controllers";
import { exchangeRatesRouter } from "./exchange-rates";
import { kycSessionsRouter } from "./kyc-sessions";
import { publicKycRouter } from "./public-kyc";
import { maintenanceRouter } from "./internal-maintenance";
import { riskRouter } from "./risk";

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
	router.route("/internal/maintenance", maintenanceRouter);
	router.route("/internal/imports", importInternalRouter);
	router.route("/internal/clients", clientsInternalRouter);
	// Transaction internal routes deprecated - use operations
	router.route("/internal/operations", operationsInternalRouter);
	router.route("/internal/invoices", invoicesInternalRouter);
	router.route(
		"/internal/beneficial-controllers",
		beneficialControllersInternalRouter,
	);

	// Public catalogs (reference data — countries, economic activities, etc.)
	router.route("/public/catalogs", catalogsRouter);

	// KYC Self-Service public endpoints (no auth, token-based)
	router.route("/public/kyc", publicKycRouter);

	// KYC sessions routes (authenticated, org-scoped)
	router.use("/kyc-sessions/*", authMiddleware({ requireOrganization: true }));
	router.use("/kyc-sessions", authMiddleware({ requireOrganization: true }));
	router.use("/kyc-sessions/*", requireActiveOrganization());
	router.use("/kyc-sessions", requireActiveOrganization());

	// Apply auth middleware with organization requirement for tenant-scoped routes
	// These routes require an active organization to be selected
	router.use("/clients/*", authMiddleware({ requireOrganization: true }));
	router.use("/operations/*", authMiddleware({ requireOrganization: true }));
	router.use("/invoices/*", authMiddleware({ requireOrganization: true }));
	router.use("/alert-rules/*", authMiddleware({ requireOrganization: true }));
	router.use("/alerts/*", authMiddleware({ requireOrganization: true }));
	router.use("/notices/*", authMiddleware({ requireOrganization: true }));
	router.use("/reports/*", authMiddleware({ requireOrganization: true }));
	router.use("/clients/*", requireActiveOrganization());
	router.use("/operations/*", requireActiveOrganization());
	router.use("/invoices/*", requireActiveOrganization());
	router.use("/alert-rules/*", requireActiveOrganization());
	router.use("/alerts/*", requireActiveOrganization());
	router.use("/notices/*", requireActiveOrganization());
	router.use("/reports/*", requireActiveOrganization());
	// Note: /imports/templates and /imports/:id/events are public, handled separately above
	router.use("/imports", authMiddleware({ requireOrganization: true }));
	router.use("/imports/:id", authMiddleware({ requireOrganization: true }));
	router.use("/imports/:id/*", authMiddleware({ requireOrganization: true }));
	router.use("/imports", requireActiveOrganization());
	router.use("/imports/:id", requireActiveOrganization());
	router.use("/imports/:id/*", requireActiveOrganization());

	// Organization settings requires auth and organization context
	router.use(
		"/organization-settings/*",
		authMiddleware({ requireOrganization: true }),
	);
	router.use("/organization-settings/*", requireActiveOrganization());

	// Risk routes require auth and organization context
	router.use("/risk/*", authMiddleware({ requireOrganization: true }));
	router.use("/risk/*", requireActiveOrganization());

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
	router.route("/clients", shareholdersRouter); // Shareholder routes nested under clients (/:clientId/shareholders/*)
	router.route("/clients", beneficialControllersRouter); // BC routes nested under clients (/:clientId/beneficial-controllers/*)
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
	router.route("/kyc-sessions", kycSessionsRouter);
	router.route("/risk", riskRouter);

	return router;
}
