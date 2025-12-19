import { Hono } from "hono";

import type { Bindings } from "../index";
import { authMiddleware, type AuthVariables } from "../middleware/auth";
import { catalogsRouter } from "./catalogs";
import { clientsRouter } from "./clients";
import { transactionsRouter } from "./transactions";

export function createRouter() {
	const router = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>();

	// Apply auth middleware to all API routes
	// All routes under /api/v1 require a valid JWT from auth-svc
	router.use("*", authMiddleware());

	// Mount resource routers
	router.route("/catalogs", catalogsRouter);
	router.route("/clients", clientsRouter);
	router.route("/transactions", transactionsRouter);

	return router;
}
