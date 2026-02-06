#!/usr/bin/env node
/**
 * Populate CFDI Payment Methods Catalog (c_MetodoPago)
 *
 * SAT codes for payment methods used in CFDI invoices.
 * PUE = Pago en Una sola Exhibición
 * PPD = Pago en Parcialidades o Diferido
 */

import { createCatalogPopulator } from "./lib/cfdi-catalog-base.mjs";

const populate = createCatalogPopulator({
	catalogKey: "cfdi-payment-methods",
	catalogName: "CFDI Payment Methods",
	csvFile: "cfdi-payment-methods.csv",
	remoteUrl: "https://catalogs.janovix.com/cfdi-payment-methods.csv",
});

populate().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
