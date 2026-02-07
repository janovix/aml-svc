#!/usr/bin/env node
/**
 * Populate CFDI Export Types Catalog (c_Exportacion)
 *
 * SAT codes for export classification.
 * 01 = No aplica
 * 02 = Definitiva
 * 03 = Temporal
 */

import { createCatalogPopulator } from "./lib/cfdi-catalog-base.mjs";

const populate = createCatalogPopulator({
	catalogKey: "cfdi-export-types",
	catalogName: "CFDI Export Types",
	csvFile: "cfdi-export-types.csv",
	remoteUrl: "https://catalogs.janovix.com/cfdi-export-types.csv",
});

populate().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
