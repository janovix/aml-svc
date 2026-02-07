#!/usr/bin/env node
/**
 * Populate CFDI Voucher Types Catalog (c_TipoDeComprobante)
 *
 * SAT codes for invoice/voucher types.
 * I=Ingreso, E=Egreso, T=Traslado, N=Nómina, P=Pago
 */

import { createCatalogPopulator } from "./lib/cfdi-catalog-base.mjs";

const populate = createCatalogPopulator({
	catalogKey: "cfdi-voucher-types",
	catalogName: "CFDI Voucher Types",
	csvFile: "cfdi-voucher-types.csv",
	remoteUrl: "https://catalogs.janovix.com/cfdi-voucher-types.csv",
});

populate().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
