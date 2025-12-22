import { Hono } from "hono";

import type { Bindings } from "../index";
import { authMiddleware, type AuthVariables } from "../middleware/auth";
import { alertRulesRouter } from "./alert-rules";
import { alertsRouter } from "./alerts";
import { catalogsRouter } from "./catalogs";
import { clientsRouter } from "./clients";
import complianceOrganizationRouter from "./compliance-organization";
import { curpRouter } from "./curp";
import { transactionsRouter } from "./transactions";
import { umaValuesRouter } from "./uma-values";

export function createRouter() {
	const router = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>();

	// Apply auth middleware only to /clients routes
	router.use("/clients/*", authMiddleware());
	router.use("/transactions/*", authMiddleware());
	router.use("/alert-rules/*", authMiddleware());
	router.use("/alerts/*", authMiddleware());
	router.use("/uma-values/*", authMiddleware());
	router.use("/compliance-organization/*", authMiddleware());

	// Mount resource routers
	router.route("/catalogs", catalogsRouter);
	router.route("/clients", clientsRouter);
	router.route("/transactions", transactionsRouter);
	router.route("/alert-rules", alertRulesRouter);
	router.route("/alerts", alertsRouter);
	router.route("/uma-values", umaValuesRouter);
	router.route("/compliance-organization", complianceOrganizationRouter);
	router.route("/curp", curpRouter);

	return router;
}
