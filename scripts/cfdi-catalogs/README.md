# CFDI Catalog Downloader

This directory contains scripts to download and parse SAT's official CFDI 4.0 catalogs.

## Overview

SAT (Servicio de Administración Tributaria) publishes CFDI catalogs in Excel format. This script downloads the catalog file, parses all relevant sheets, and generates CSV files for use with the catalog population scripts.

## Usage

### Automatic Download

```bash
node scripts/cfdi-catalogs/download-sat-catalogs.mjs
```

This will attempt to download from SAT's official URLs and generate CSV files in the `output/` directory.

### Using Local File

If SAT's website is unreachable, download the catalog manually from:

- https://www.sat.gob.mx/consultas/35025/formato-de-factura-electronica-(anexo-20)

Then run with the local file:

```bash
node scripts/cfdi-catalogs/download-sat-catalogs.mjs --local path/to/catCFDI.xls
```

Or place the file as `catCFDI.xls` in this directory and run without arguments.

## Generated Catalogs

| Output File               | SAT Sheet           | Description                                  |
| ------------------------- | ------------------- | -------------------------------------------- |
| cfdi-payment-forms.csv    | c_FormaPago         | Payment forms (01=Efectivo, 02=Cheque, etc.) |
| cfdi-payment-methods.csv  | c_MetodoPago        | Payment methods (PUE, PPD)                   |
| cfdi-tax-regimes.csv      | c_RegimenFiscal     | Tax regimes (601-626)                        |
| cfdi-usages.csv           | c_UsoCFDI           | CFDI usage codes (G01, G02, etc.)            |
| cfdi-voucher-types.csv    | c_TipoDeComprobante | Voucher types (I, E, T, N, P)                |
| cfdi-currencies.csv       | c_Moneda            | Currencies (ISO 4217)                        |
| cfdi-countries.csv        | c_Pais              | Countries (ISO 3166-1 alpha-3)               |
| cfdi-taxes.csv            | c_Impuesto          | Taxes (001=ISR, 002=IVA, 003=IEPS)           |
| cfdi-tax-factors.csv      | c_TipoFactor        | Tax factors (Tasa, Cuota, Exento)            |
| cfdi-product-services.csv | c_ClaveProdServ     | Product/service codes (~53K items)           |
| cfdi-units.csv            | c_ClaveUnidad       | Unit codes (~2.4K items)                     |
| cfdi-tax-objects.csv      | c_ObjetoImp         | Tax objects (01, 02, 03)                     |
| cfdi-relation-types.csv   | c_TipoRelacion      | Invoice relation types                       |
| cfdi-export-types.csv     | c_Exportacion       | Export types                                 |

## CSV Format

All CSV files follow a standard format:

```csv
code,name
01,Efectivo
02,Cheque nominativo
...
```

Some catalogs have additional columns (e.g., `decimals` for currencies, `symbol` for units).

## Next Steps

After generating CSVs:

1. Upload to `catalogs.janovix.com` (or use local paths)
2. Run population scripts: `pnpm populate:local`

## Manual Catalog Download

If automatic download fails, visit:
https://www.sat.gob.mx/consultas/35025/formato-de-factura-electronica-(anexo-20)

Look for "Catálogos CFDI" section and download the latest version.
