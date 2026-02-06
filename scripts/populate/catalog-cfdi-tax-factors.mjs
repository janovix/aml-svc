#!/usr/bin/env node
/**
 * Populate CFDI Tax Factors Catalog (c_TipoFactor)
 *
 * SAT codes for tax calculation factors.
 * Tasa = Rate (percentage)
 * Cuota = Fixed amount
 * Exento = Exempt
 */

import { createCatalogPopulator } from "./lib/cfdi-catalog-base.mjs";

const populate = createCatalogPopulator({
	catalogKey: "cfdi-tax-factors",
	catalogName: "CFDI Tax Factors",
	csvFile: "cfdi-tax-factors.csv",
	remoteUrl: "https://catalogs.janovix.com/cfdi-tax-factors.csv",
});

populate().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
