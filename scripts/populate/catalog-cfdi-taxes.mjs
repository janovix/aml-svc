#!/usr/bin/env node
/**
 * Populate CFDI Taxes Catalog (c_Impuesto)
 *
 * SAT codes for tax types.
 * 001=ISR (Impuesto Sobre la Renta)
 * 002=IVA (Impuesto al Valor Agregado)
 * 003=IEPS (Impuesto Especial sobre Producción y Servicios)
 */

import { createCatalogPopulator } from "./lib/cfdi-catalog-base.mjs";

const populate = createCatalogPopulator({
	catalogKey: "cfdi-taxes",
	catalogName: "CFDI Taxes",
	csvFile: "cfdi-taxes.csv",
	remoteUrl: "https://catalogs.janovix.com/cfdi-taxes.csv",
});

populate().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
