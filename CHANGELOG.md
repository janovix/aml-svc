# [1.7.0-rc.2](https://github.com/janovix/aml-svc/compare/v1.7.0-rc.1...v1.7.0-rc.2) (2026-02-21)


### Features

* add endpoint to retrieve client by RFC ([cbce23a](https://github.com/janovix/aml-svc/commit/cbce23a8988a5b8307dc092ad8a2637d9f048075))
* enhance client and import services with filter metadata and pagination support ([c2efa29](https://github.com/janovix/aml-svc/commit/c2efa29a87763a81913a8983e0a7e4267df769b1))

# [1.7.0-rc.1](https://github.com/janovix/aml-svc/compare/v1.6.0...v1.7.0-rc.1) (2026-02-21)


### Bug Fixes

* update CatalogListQuerySchema to accept single character search and adjust validation for search string length ([66f96ec](https://github.com/janovix/aml-svc/commit/66f96eca03a57e38420192bae3f9e40d28bfcea3))
* update pageSize maximum limit in openAPI and CatalogListQuerySchema to 200 ([87ed31d](https://github.com/janovix/aml-svc/commit/87ed31d4204d62162910e50ce62f527d9591a485))
* update ruleType in alertRules from transaction_amount_uma to operation_amount_uma for clarity ([43c4465](https://github.com/janovix/aml-svc/commit/43c446564f49d3b726ee43f5a8dfe2b6eb728ef6))


### Features

* add activity_code to imports and catalog name resolution columns ([d76eacb](https://github.com/janovix/aml-svc/commit/d76eacb088474d3664084fe73e7dd888097e1c42))
* add currency population script and CSV data for catalog currencies ([a491199](https://github.com/janovix/aml-svc/commit/a4911998a9b817ddb13f214f93dd762ed8d89423))
* add exchange rate functionality using CurrencyLayer API ([4f0da1c](https://github.com/janovix/aml-svc/commit/4f0da1c37bad3ec7dd0a88e79ac68a49a919ea98))
* add getStats method to InvoiceRepository and InvoiceService, and create /invoices/stats endpoint ([b4d64c8](https://github.com/janovix/aml-svc/commit/b4d64c86531ccaee2554e636b7fe038e372c26bf))
* add internal maintenance routes for KYC progress recalculation ([1cef456](https://github.com/janovix/aml-svc/commit/1cef456494dcd8b4d66efc76ff36443a8aba61f0))
* add KYC progress persistence to clients table ([15b3f9c](https://github.com/janovix/aml-svc/commit/15b3f9c18ec7fcc96543f773544b2c3119d4b48d))
* add KYC self-service module with session management and email notifications ([01b1d91](https://github.com/janovix/aml-svc/commit/01b1d91b4c90611a8659aadb71e313dc2d2547a1))
* add notifications service integration for screening alerts ([86455da](https://github.com/janovix/aml-svc/commit/86455daad22ecc760a287439012241b22db14e5f))
* add organizationId to AlertEntity and mapPrismaAlert function ([292bffe](https://github.com/janovix/aml-svc/commit/292bffe1d891a2c7f495ef8521b7ad7f7128167d))
* add screening callback route for watchlist service integration ([e071a1f](https://github.com/janovix/aml-svc/commit/e071a1f42d196fcdd6406d7d51614556a0db97a3))
* add script for importing catalog items with proper foreign key handling ([81bbbeb](https://github.com/janovix/aml-svc/commit/81bbbeb5ab3f43d492c369c51030b128938ac258))
* add script for importing remaining catalogs from a specified index ([52b3bde](https://github.com/janovix/aml-svc/commit/52b3bde46b0719949131248b74fb6e9450a8b9e6))
* add scripts for incremental catalog import and database state check ([ac10933](https://github.com/janovix/aml-svc/commit/ac10933cd901942ca56f92eb252220ae3019a8fa))
* add statistics endpoint for operations and implement related repository and service methods ([96efca9](https://github.com/janovix/aml-svc/commit/96efca95bb3a635181fc7c7a47d1ff80bbb1b5d7))
* add submit and acknowledgment PDF document ID fields to Notice model and update related functionality ([57a5bbf](https://github.com/janovix/aml-svc/commit/57a5bbfb790abc64796db547af972f089350071e))
* add synthetic test data generation and validation scripts ([117bd7c](https://github.com/janovix/aml-svc/commit/117bd7cdfe5ee59c8b0ecb3ed3ac93202aa03683))
* enhance import event streaming with progress counts ([f75b552](https://github.com/janovix/aml-svc/commit/f75b552d590d3d2701b9fcef251b355de769a888))
* implement beneficial controller management and watchlist screening integration ([d940fce](https://github.com/janovix/aml-svc/commit/d940fce3338164283a6f7bf40658d400826f7fd9))
* implement usage rights client and middleware ([e4f303a](https://github.com/janovix/aml-svc/commit/e4f303a1753fbeb7dd85a80be25cd1642257206b))
* integrate Sentry for error handling across services ([7ff629a](https://github.com/janovix/aml-svc/commit/7ff629aacaf4d1f92ef94e361db4b78b18a3bdd0))
* update catalog field mappings and add resolvedNames to client updates ([6ada746](https://github.com/janovix/aml-svc/commit/6ada7468c0c8e7ab25dd3b98663e905e4ba7a431))

# [1.6.0-rc.23](https://github.com/janovix/aml-svc/compare/v1.6.0-rc.22...v1.6.0-rc.23) (2026-02-20)

### Features

* add notifications service integration for screening alerts ([86455da](https://github.com/janovix/aml-svc/commit/86455daad22ecc760a287439012241b22db14e5f))

# [1.6.0-rc.22](https://github.com/janovix/aml-svc/compare/v1.6.0-rc.21...v1.6.0-rc.22) (2026-02-20)

### Features

* add KYC progress persistence to clients table ([15b3f9c](https://github.com/janovix/aml-svc/commit/15b3f9c18ec7fcc96543f773544b2c3119d4b48d))

# [1.6.0-rc.21](https://github.com/janovix/aml-svc/compare/v1.6.0-rc.20...v1.6.0-rc.21) (2026-02-20)

### Features

* enhance import event streaming with progress counts ([f75b552](https://github.com/janovix/aml-svc/commit/f75b552d590d3d2701b9fcef251b355de769a888))
* update catalog field mappings and add resolvedNames to client updates ([6ada746](https://github.com/janovix/aml-svc/commit/6ada7468c0c8e7ab25dd3b98663e905e4ba7a431))

# [1.6.0-rc.20](https://github.com/janovix/aml-svc/compare/v1.6.0-rc.19...v1.6.0-rc.20) (2026-02-20)

### Features

* add synthetic test data generation and validation scripts ([117bd7c](https://github.com/janovix/aml-svc/commit/117bd7cdfe5ee59c8b0ecb3ed3ac93202aa03683))

# [1.6.0-rc.19](https://github.com/janovix/aml-svc/compare/v1.6.0-rc.18...v1.6.0-rc.19) (2026-02-20)

### Bug Fixes

* update ruleType in alertRules from transaction_amount_uma to operation_amount_uma for clarity ([43c4465](https://github.com/janovix/aml-svc/commit/43c446564f49d3b726ee43f5a8dfe2b6eb728ef6))

# [1.6.0-rc.18](https://github.com/janovix/aml-svc/compare/v1.6.0-rc.17...v1.6.0-rc.18) (2026-02-20)

### Features

* add organizationId to AlertEntity and mapPrismaAlert function ([292bffe](https://github.com/janovix/aml-svc/commit/292bffe1d891a2c7f495ef8521b7ad7f7128167d))

# [1.6.0-rc.17](https://github.com/janovix/aml-svc/compare/v1.6.0-rc.16...v1.6.0-rc.17) (2026-02-19)

### Features

* add getStats method to InvoiceRepository and InvoiceService, and create /invoices/stats endpoint ([b4d64c8](https://github.com/janovix/aml-svc/commit/b4d64c86531ccaee2554e636b7fe038e372c26bf))

# [1.6.0-rc.16](https://github.com/janovix/aml-svc/compare/v1.6.0-rc.15...v1.6.0-rc.16) (2026-02-19)

### Features

* add statistics endpoint for operations and implement related repository and service methods ([96efca9](https://github.com/janovix/aml-svc/commit/96efca95bb3a635181fc7c7a47d1ff80bbb1b5d7))

# [1.6.0-rc.15](https://github.com/janovix/aml-svc/compare/v1.6.0-rc.14...v1.6.0-rc.15) (2026-02-18)

### Features

* add submit and acknowledgment PDF document ID fields to Notice model and update related functionality ([57a5bbf](https://github.com/janovix/aml-svc/commit/57a5bbfb790abc64796db547af972f089350071e))

# [1.6.0-rc.14](https://github.com/janovix/aml-svc/compare/v1.6.0-rc.13...v1.6.0-rc.14) (2026-02-18)

### Features

* add KYC self-service module with session management and email notifications ([01b1d91](https://github.com/janovix/aml-svc/commit/01b1d91b4c90611a8659aadb71e313dc2d2547a1))

# [1.6.0-rc.13](https://github.com/janovix/aml-svc/compare/v1.6.0-rc.12...v1.6.0-rc.13) (2026-02-17)

### Features

* add screening callback route for watchlist service integration ([e071a1f](https://github.com/janovix/aml-svc/commit/e071a1f42d196fcdd6406d7d51614556a0db97a3))

# [1.6.0-rc.12](https://github.com/janovix/aml-svc/compare/v1.6.0-rc.11...v1.6.0-rc.12) (2026-02-17)

### Features

* implement beneficial controller management and watchlist screening integration ([d940fce](https://github.com/janovix/aml-svc/commit/d940fce3338164283a6f7bf40658d400826f7fd9))

# [1.6.0-rc.11](https://github.com/janovix/aml-svc/compare/v1.6.0-rc.10...v1.6.0-rc.11) (2026-02-13)

### Features

* integrate Sentry for error handling across services ([7ff629a](https://github.com/janovix/aml-svc/commit/7ff629aacaf4d1f92ef94e361db4b78b18a3bdd0))

# [1.6.0-rc.10](https://github.com/janovix/aml-svc/compare/v1.6.0-rc.9...v1.6.0-rc.10) (2026-02-12)

### Features

* add script for importing catalog items with proper foreign key handling ([81bbbeb](https://github.com/janovix/aml-svc/commit/81bbbeb5ab3f43d492c369c51030b128938ac258))

# [1.6.0-rc.9](https://github.com/janovix/aml-svc/compare/v1.6.0-rc.8...v1.6.0-rc.9) (2026-02-12)

### Features

* add script for importing remaining catalogs from a specified index ([52b3bde](https://github.com/janovix/aml-svc/commit/52b3bde46b0719949131248b74fb6e9450a8b9e6))

# [1.6.0-rc.8](https://github.com/janovix/aml-svc/compare/v1.6.0-rc.7...v1.6.0-rc.8) (2026-02-12)

### Features

* add scripts for incremental catalog import and database state check ([ac10933](https://github.com/janovix/aml-svc/commit/ac10933cd901942ca56f92eb252220ae3019a8fa))

# [1.6.0-rc.7](https://github.com/janovix/aml-svc/compare/v1.6.0-rc.6...v1.6.0-rc.7) (2026-02-12)

### Features

* implement usage rights client and middleware ([e4f303a](https://github.com/janovix/aml-svc/commit/e4f303a1753fbeb7dd85a80be25cd1642257206b))

# [1.6.0-rc.6](https://github.com/janovix/aml-svc/compare/v1.6.0-rc.5...v1.6.0-rc.6) (2026-02-10)

### Features

* add activity_code to imports and catalog name resolution columns ([d76eacb](https://github.com/janovix/aml-svc/commit/d76eacb088474d3664084fe73e7dd888097e1c42))

# [1.6.0-rc.5](https://github.com/janovix/aml-svc/compare/v1.6.0-rc.4...v1.6.0-rc.5) (2026-02-09)

### Bug Fixes

* update pageSize maximum limit in openAPI and CatalogListQuerySchema to 200 ([87ed31d](https://github.com/janovix/aml-svc/commit/87ed31d4204d62162910e50ce62f527d9591a485))

# [1.6.0-rc.4](https://github.com/janovix/aml-svc/compare/v1.6.0-rc.3...v1.6.0-rc.4) (2026-02-09)

### Features

* add currency population script and CSV data for catalog currencies ([a491199](https://github.com/janovix/aml-svc/commit/a4911998a9b817ddb13f214f93dd762ed8d89423))

# [1.6.0-rc.3](https://github.com/janovix/aml-svc/compare/v1.6.0-rc.2...v1.6.0-rc.3) (2026-02-08)

### Bug Fixes

* update CatalogListQuerySchema to accept single character search and adjust validation for search string length ([66f96ec](https://github.com/janovix/aml-svc/commit/66f96eca03a57e38420192bae3f9e40d28bfcea3))

# [1.6.0-rc.2](https://github.com/janovix/aml-svc/compare/v1.6.0-rc.1...v1.6.0-rc.2) (2026-02-07)

### Features

* add exchange rate functionality using CurrencyLayer API ([4f0da1c](https://github.com/janovix/aml-svc/commit/4f0da1c37bad3ec7dd0a88e79ac68a49a919ea98))

# [1.6.0-rc.1](https://github.com/janovix/aml-svc/compare/v1.5.0...v1.6.0-rc.1) (2026-02-07)

### Bug Fixes

* address additional CodeRabbit review items ([405f2de](https://github.com/janovix/aml-svc/commit/405f2def8aa3cb2c17654987464091dab295a4ac))
* address CodeRabbit review items for PR [#42](https://github.com/janovix/aml-svc/issues/42) ([5e56482](https://github.com/janovix/aml-svc/commit/5e5648211ff2ba973a0f7f03a9d653fb8d08d889))
* address CodeRabbit review items from PR [#42](https://github.com/janovix/aml-svc/issues/42) ([0b3383d](https://github.com/janovix/aml-svc/commit/0b3383d625f1cc9fb82b2c7f13d2ae5baef2a295))

### Features

* add comprehensive catalog population documentation and workflows ([aa43981](https://github.com/janovix/aml-svc/commit/aa43981bec5597d3d7f9626ebf4295b2103b6e94))
* add organization settings endpoints for admin panel ([6865d1f](https://github.com/janovix/aml-svc/commit/6865d1ff12b133c30402e4163e662ea5590906be))
* add trust clients count to client statistics endpoint ([c89c017](https://github.com/janovix/aml-svc/commit/c89c0176993f3168ac42699c5ff0c757a7cf43f7))
* add TRUSTED_ORIGINS configuration to environment files and implement CORS middleware ([3683d30](https://github.com/janovix/aml-svc/commit/3683d30e02646fcf3a49732ae4f84ac559efea6f))
* implement presigned URL generation and document viewer components ([cf85652](https://github.com/janovix/aml-svc/commit/cf8565217a681ac445121e8bc2bd510e0b77816d))
* update CORS middleware to support wildcard patterns for TRUSTED_ORIGINS ([193e5a4](https://github.com/janovix/aml-svc/commit/193e5a46247d9a421e73f44bbe0bf3c9592ba4de))

# [1.6.0](https://github.com/janovix/aml-svc/compare/v1.5.0...v1.6.0) (2026-02-07)

### Bug Fixes

* address additional CodeRabbit review items ([405f2de](https://github.com/janovix/aml-svc/commit/405f2def8aa3cb2c17654987464091dab295a4ac))
* address CodeRabbit review items for PR [#42](https://github.com/janovix/aml-svc/issues/42) ([5e56482](https://github.com/janovix/aml-svc/commit/5e5648211ff2ba973a0f7f03a9d653fb8d08d889))
* address CodeRabbit review items from PR [#42](https://github.com/janovix/aml-svc/issues/42) ([0b3383d](https://github.com/janovix/aml-svc/commit/0b3383d625f1cc9fb82b2c7f13d2ae5baef2a295))

### Features

* add comprehensive catalog population documentation and workflows ([aa43981](https://github.com/janovix/aml-svc/commit/aa43981bec5597d3d7f9626ebf4295b2103b6e94))
* add organization settings endpoints for admin panel ([6865d1f](https://github.com/janovix/aml-svc/commit/6865d1ff12b133c30402e4163e662ea5590906be))
* add trust clients count to client statistics endpoint ([c89c017](https://github.com/janovix/aml-svc/commit/c89c0176993f3168ac42699c5ff0c757a7cf43f7))
* add TRUSTED_ORIGINS configuration to environment files and implement CORS middleware ([3683d30](https://github.com/janovix/aml-svc/commit/3683d30e02646fcf3a49732ae4f84ac559efea6f))
* implement presigned URL generation and document viewer components ([cf85652](https://github.com/janovix/aml-svc/commit/cf8565217a681ac445121e8bc2bd510e0b77816d))
* update CORS middleware to support wildcard patterns for TRUSTED_ORIGINS ([193e5a4](https://github.com/janovix/aml-svc/commit/193e5a46247d9a421e73f44bbe0bf3c9592ba4de))
