import { Hono } from "hono";

import type { Bindings } from "../index";
import { catalogsRouter } from "./catalogs";
import { clientsRouter } from "./clients";
import { transactionsRouter } from "./transactions";

export function createRouter() {
	const router = new Hono<{ Bindings: Bindings }>();

	// Mount resource routers
	router.route("/catalogs", catalogsRouter);
	router.route("/clients", clientsRouter);
	router.route("/transactions", transactionsRouter);

	return router;
}
