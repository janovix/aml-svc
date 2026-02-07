#!/usr/bin/env node
/**
 * Populate CFDI Relation Types Catalog (c_TipoRelacion)
 *
 * SAT codes for invoice relationship types.
 * Example: 01=Nota de crédito, 04=Sustitución
 */

import { createCatalogPopulator } from "./lib/cfdi-catalog-base.mjs";

const populate = createCatalogPopulator({
	catalogKey: "cfdi-relation-types",
	catalogName: "CFDI Relation Types",
	csvFile: "cfdi-relation-types.csv",
	remoteUrl: "https://catalogs.janovix.com/cfdi-relation-types.csv",
});

populate().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
