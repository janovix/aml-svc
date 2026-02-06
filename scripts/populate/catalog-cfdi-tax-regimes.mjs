#!/usr/bin/env node
/**
 * Populate CFDI Tax Regimes Catalog (c_RegimenFiscal)
 *
 * SAT codes for tax regimes (601-626).
 * Example: 601=General de Ley Personas Morales, 612=Personas Físicas con Actividades Empresariales
 */

import { createCatalogPopulator } from "./lib/cfdi-catalog-base.mjs";

const populate = createCatalogPopulator({
	catalogKey: "cfdi-tax-regimes",
	catalogName: "CFDI Tax Regimes",
	csvFile: "cfdi-tax-regimes.csv",
	remoteUrl: "https://catalogs.janovix.com/cfdi-tax-regimes.csv",
});

populate().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
