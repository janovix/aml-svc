#!/usr/bin/env node
/**
 * Populate CFDI Usages Catalog (c_UsoCFDI)
 *
 * SAT codes for CFDI usage (what the invoice is for).
 * Example: G01=Adquisición de mercancías, G03=Gastos en general
 */

import { createCatalogPopulator } from "./lib/cfdi-catalog-base.mjs";

const populate = createCatalogPopulator({
	catalogKey: "cfdi-usages",
	catalogName: "CFDI Usages",
	csvFile: "cfdi-usages.csv",
	remoteUrl: "https://catalogs.janovix.com/cfdi-usages.csv",
});

populate().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
