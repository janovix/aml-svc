#!/usr/bin/env node
/**
 * Populate CFDI Countries Catalog (c_Pais)
 *
 * SAT codes for countries (ISO 3166-1 alpha-3).
 * Example: MEX=México, USA=Estados Unidos de América
 */

import { createCatalogPopulator } from "./lib/cfdi-catalog-base.mjs";

const populate = createCatalogPopulator({
	catalogKey: "cfdi-countries",
	catalogName: "CFDI Countries",
	csvFile: "cfdi-countries.csv",
	remoteUrl: "https://catalogs.janovix.com/cfdi-countries.csv",
});

populate().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
