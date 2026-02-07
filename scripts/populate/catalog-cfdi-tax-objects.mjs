#!/usr/bin/env node
/**
 * Populate CFDI Tax Objects Catalog (c_ObjetoImp)
 *
 * SAT codes for tax object classification.
 * 01 = No objeto de impuesto
 * 02 = Sí objeto de impuesto
 * 03 = Sí objeto del impuesto y no obligado al desglose
 */

import { createCatalogPopulator } from "./lib/cfdi-catalog-base.mjs";

const populate = createCatalogPopulator({
	catalogKey: "cfdi-tax-objects",
	catalogName: "CFDI Tax Objects",
	csvFile: "cfdi-tax-objects.csv",
	remoteUrl: "https://catalogs.janovix.com/cfdi-tax-objects.csv",
});

populate().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
