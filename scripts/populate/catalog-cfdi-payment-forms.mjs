#!/usr/bin/env node
/**
 * Populate CFDI Payment Forms Catalog (c_FormaPago)
 *
 * SAT codes for payment forms used in CFDI invoices.
 * Example: 01=Efectivo, 02=Cheque, 03=Transferencia, etc.
 */

import { createCatalogPopulator } from "./lib/cfdi-catalog-base.mjs";

const populate = createCatalogPopulator({
	catalogKey: "cfdi-payment-forms",
	catalogName: "CFDI Payment Forms",
	csvFile: "cfdi-payment-forms.csv",
	remoteUrl: "https://catalogs.janovix.com/cfdi-payment-forms.csv",
});

populate().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
