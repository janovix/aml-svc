import { Hono } from "hono";

import type { Bindings } from "../index";
import { authMiddleware, type AuthVariables } from "../middleware/auth";
import { catalogsRouter } from "./catalogs";
import { clientsRouter } from "./clients";
import { transactionsRouter } from "./transactions";

export function createRouter() {
	const router = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>();

	// Apply auth middleware only to /clients routes
	router.use("/clients/*", authMiddleware());
	router.use("/transactions/*", authMiddleware());

	// Mount resource routers
	router.route("/catalogs", catalogsRouter);
	router.route("/clients", clientsRouter);
	router.route("/transactions", transactionsRouter);

	return router;
}
