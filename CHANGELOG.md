# [1.4.0-rc.14](https://github.com/janovix/aml-svc/compare/v1.4.0-rc.13...v1.4.0-rc.14) (2026-01-19)


### Features

* improve error handling for unique constraint violations in client routes ([eb6bad1](https://github.com/janovix/aml-svc/commit/eb6bad1847bb6c260debd061bd74550cd5c70b24))

# [1.4.0-rc.13](https://github.com/janovix/aml-svc/compare/v1.4.0-rc.12...v1.4.0-rc.13) (2026-01-19)


### Features

* enhance Prisma client initialization with caching and timeout handling in catalog operations ([701d09a](https://github.com/janovix/aml-svc/commit/701d09a8d927c53e026db745b2296031cfd47501))

# [1.4.0-rc.12](https://github.com/janovix/aml-svc/compare/v1.4.0-rc.11...v1.4.0-rc.12) (2026-01-18)


### Features

* enhance error handling in internal API routes for clients, imports, and transactions ([d385e2b](https://github.com/janovix/aml-svc/commit/d385e2b2913e884e9086c68db2bcbc9fbd575841))

# [1.4.0-rc.11](https://github.com/janovix/aml-svc/compare/v1.4.0-rc.10...v1.4.0-rc.11) (2026-01-18)


### Bug Fixes

* update RFC uniqueness constraint in clients table and adjust Prisma model accordingly ([fdce47f](https://github.com/janovix/aml-svc/commit/fdce47ff4639173d20ee7924adf6acca12a51cbc))

# [1.4.0-rc.10](https://github.com/janovix/aml-svc/compare/v1.4.0-rc.9...v1.4.0-rc.10) (2026-01-18)


### Features

* add internal clients and transactions routers for worker communication without auth ([8ffd26e](https://github.com/janovix/aml-svc/commit/8ffd26ebeadd8f2d1fc3561da68927f6bd8053ab))

# [1.4.0-rc.9](https://github.com/janovix/aml-svc/compare/v1.4.0-rc.8...v1.4.0-rc.9) (2026-01-18)


### Features

* add internal imports router for worker communication without auth ([3550764](https://github.com/janovix/aml-svc/commit/3550764966f7eb703d0db07bee2e94723e29928f))

# [1.4.0-rc.8](https://github.com/janovix/aml-svc/compare/v1.4.0-rc.7...v1.4.0-rc.8) (2026-01-18)


### Features

* add SSE endpoint for real-time import updates with token verification from query parameters ([c52b5d6](https://github.com/janovix/aml-svc/commit/c52b5d6b44dbb72e889703b8910a88e8915dc82f))

# [1.4.0-rc.7](https://github.com/janovix/aml-svc/compare/v1.4.0-rc.6...v1.4.0-rc.7) (2026-01-17)


### Features

* add public endpoint for downloading CSV import templates and update OpenAPI specification ([b13e319](https://github.com/janovix/aml-svc/commit/b13e319711ed4c9c6959b9880da8d7f05b9d6885))

# [1.4.0-rc.6](https://github.com/janovix/aml-svc/compare/v1.4.0-rc.5...v1.4.0-rc.6) (2026-01-17)


### Features

* implement bulk data import functionality with associated models, services, and routes ([0929ce1](https://github.com/janovix/aml-svc/commit/0929ce19f4c58cd99aa0b71282a0049c92871fd5))

# [1.4.0-rc.5](https://github.com/janovix/aml-svc/compare/v1.4.0-rc.4...v1.4.0-rc.5) (2026-01-12)


### Features

* add admin routes and authentication middleware for platform admin management ([6254ca1](https://github.com/janovix/aml-svc/commit/6254ca10058dafa4b349feefdce12f4f92de8ad3))

# [1.4.0-rc.4](https://github.com/janovix/aml-svc/compare/v1.4.0-rc.3...v1.4.0-rc.4) (2026-01-12)


### Features

* enhance subscription management with new middleware and client for usage tracking and feature access ([157acc2](https://github.com/janovix/aml-svc/commit/157acc20d033a20ecd6e9c4d3bbcb6ce1cd2769f))

# [1.4.0-rc.3](https://github.com/janovix/aml-svc/compare/v1.4.0-rc.2...v1.4.0-rc.3) (2026-01-11)


### Features

* add organization settings route for service binding access and implement internal handling ([ebf3ba7](https://github.com/janovix/aml-svc/commit/ebf3ba7728f51c173cdf674b7c0c101920d911cf))

# [1.4.0-rc.2](https://github.com/janovix/aml-svc/compare/v1.4.0-rc.1...v1.4.0-rc.2) (2026-01-11)


### Features

* add audit client and auth settings integration via service binding ([a3a1199](https://github.com/janovix/aml-svc/commit/a3a1199c8bd008c33f79011b21a55133db0a888e))

# [1.4.0-rc.1](https://github.com/janovix/aml-svc/compare/v1.3.0...v1.4.0-rc.1) (2026-01-10)


### Features

* add compatibility flags for nodejs_als in configuration files ([3cb6c19](https://github.com/janovix/aml-svc/commit/3cb6c195d01657c989334334f80b2f5e86a2b865))

# [1.3.0](https://github.com/janovix/aml-svc/compare/v1.2.0...v1.3.0) (2026-01-10)


### Features

* add endpoint to cancel alerts with reason and implement corresponding schema and tests ([eb0ebe6](https://github.com/janovix/aml-svc/commit/eb0ebe67c4da50e2a98d07a222ad7741faa8943d))
* enhance search field validation in CatalogListQuerySchema to treat empty and whitespace-only strings as undefined ([178ae5e](https://github.com/janovix/aml-svc/commit/178ae5e8b1d415676d20a05a7571bc38d21db21d))
* full sentry integration ([244b958](https://github.com/janovix/aml-svc/commit/244b958e31bc95d1121f630b683348fe4cafe211))
* update client statistics retrieval to include physical and moral client counts ([01ca427](https://github.com/janovix/aml-svc/commit/01ca4274a5593cd830d3665447414fe78f547ecb))

# [1.2.0-rc.5](https://github.com/janovix/aml-svc/compare/v1.2.0-rc.4...v1.2.0-rc.5) (2026-01-10)


### Features

* full sentry integration ([244b958](https://github.com/janovix/aml-svc/commit/244b958e31bc95d1121f630b683348fe4cafe211))

# [1.2.0-rc.4](https://github.com/janovix/aml-svc/compare/v1.2.0-rc.3...v1.2.0-rc.4) (2026-01-09)


### Features

* add endpoint to cancel alerts with reason and implement corresponding schema and tests ([eb0ebe6](https://github.com/janovix/aml-svc/commit/eb0ebe67c4da50e2a98d07a222ad7741faa8943d))

# [1.2.0-rc.3](https://github.com/janovix/aml-svc/compare/v1.2.0-rc.2...v1.2.0-rc.3) (2026-01-09)


### Features

* update client statistics retrieval to include physical and moral client counts ([01ca427](https://github.com/janovix/aml-svc/commit/01ca4274a5593cd830d3665447414fe78f547ecb))

# [1.2.0-rc.2](https://github.com/janovix/aml-svc/compare/v1.2.0-rc.1...v1.2.0-rc.2) (2026-01-09)
# [1.2.0](https://github.com/janovix/aml-svc/compare/v1.1.0...v1.2.0) (2026-01-09)


### Bug Fixes

* add validation for GitHub Secrets in synthetic data generation workflow ([ba12a45](https://github.com/janovix/aml-svc/commit/ba12a45e593b644c69715658551a223ee872aa5b))
* enhance JSONC parsing in synthetic data generation script to handle multi-line comments and trailing commas ([b0ff3f1](https://github.com/janovix/aml-svc/commit/b0ff3f1f2c004e77c162eae909ef46004fd87d0e))
* ensure correct order of alert rule and config seeding scripts ([0b0e392](https://github.com/janovix/aml-svc/commit/0b0e39263215a829131ce4bcb9316faeed5446dc))
* implement synthetic data generation for clients and transactions with SQL output ([e3eb469](https://github.com/janovix/aml-svc/commit/e3eb469b4421b2dae969c1cd7aa2c3c374100781))
* improve JSONC parsing in synthetic data generation script to handle edge cases with comments and trailing commas ([7c87c47](https://github.com/janovix/aml-svc/commit/7c87c4719994044cea7267647c03d355caef16a7))
* remove working-directory specification for synthetic data generation in GitHub Actions workflow ([58f9cd7](https://github.com/janovix/aml-svc/commit/58f9cd7ae55c43e2defff4b2ec148d15c6d62cd9))
* update auth middleware to return 409 Conflict for missing organization ([f6f633a](https://github.com/janovix/aml-svc/commit/f6f633abce89e15e400145137279a38b629417e7))


### Features

* enhance search field validation in CatalogListQuerySchema to treat empty and whitespace-only strings as undefined ([178ae5e](https://github.com/janovix/aml-svc/commit/178ae5e8b1d415676d20a05a7571bc38d21db21d))
* add Caddyfile for local development and update README with local dev instructions ([8f95e28](https://github.com/janovix/aml-svc/commit/8f95e281de5e5fc0ac087c5fee3719bd0047bdf7))
* add endpoints for retrieving catalog items by ID and active alert rules for seekers ([ab78f97](https://github.com/janovix/aml-svc/commit/ab78f973f3e0a6c8efc3d632bf3e3f97a7e94a13))
* add Notices API endpoints for managing SAT notices and their statuses ([e051bc6](https://github.com/janovix/aml-svc/commit/e051bc6801e48df5b9c01be15623c9ab10e74300))
* add organization ID support in synthetic data generation and update related services ([a5573c0](https://github.com/janovix/aml-svc/commit/a5573c04454d5c77457b116347c969907cf2d962))
* add report management functionality ([b22edff](https://github.com/janovix/aml-svc/commit/b22edff5e93c5b55996504735571db477f51b64b))
* add service binding routes for alert rules and UMA values with support for parameterized paths ([8e4aac2](https://github.com/janovix/aml-svc/commit/8e4aac2e90e689de35b6e89f68ce307f8d646c64))
* add target environment input and dynamic wrangler config selection for synthetic data generation ([066d0cb](https://github.com/janovix/aml-svc/commit/066d0cb7503657bee2867021d88a1614659217be))
* Add target environment to synthetic data generation ([1ea0117](https://github.com/janovix/aml-svc/commit/1ea0117eb51d34e9b4db852d1fca780c2e8a8097))
* add UMA values population and seeding scripts ([f80008c](https://github.com/janovix/aml-svc/commit/f80008cee92ed297686b10540a75c20ad7ae10ca))
* enhance Notice API to manage pending notices and improve statistics retrieval ([5e8a5fc](https://github.com/janovix/aml-svc/commit/5e8a5fc346bb7320998158fd8798117539ea7c29))
* enhance Notices API to include transaction data for alerts and improve XML generation process ([a252258](https://github.com/janovix/aml-svc/commit/a2522580f27491121096b115b2b8968e02499a46))
* enhance OpenAPI specifications for alerts, transactions, and clients with detailed response schemas ([a4b74de](https://github.com/janovix/aml-svc/commit/a4b74debfa8ba9882514cde7a5e345c85ff98f45))
* implement catalog enrichment service for transactions ([9733c34](https://github.com/janovix/aml-svc/commit/9733c348064080618467cb221d964f1755fbd4a7))
* implement client data and transaction retrieval endpoints in service binding ([03d16e0](https://github.com/janovix/aml-svc/commit/03d16e0f1eba01adaea7aba38db0fadc6e6281ef))
* implement custom ID generation for clients and related entities ([82aac9d](https://github.com/janovix/aml-svc/commit/82aac9dd5da51c11ae0f8fc4a50ab99be07dacfe))
* implement flexible item retrieval by ID, shortName, or code in CatalogRepository ([d58b913](https://github.com/janovix/aml-svc/commit/d58b913cfb08a23e2848736643d6333cd6126d16))
* implement global alert rules architecture and configuration management ([e115073](https://github.com/janovix/aml-svc/commit/e115073466330c27428355b2cacd45829490c080))
* implement Notices & Reports API with migration and service enhancements ([534b005](https://github.com/janovix/aml-svc/commit/534b005a7adba31743c84c696ce7d3dd55820556))
* Improve RFC validation and add tests ([1fb6a8f](https://github.com/janovix/aml-svc/commit/1fb6a8f2f2f9fda0858780a2f03d4a4acbb074e6))
* new vehicle brand catalogs and organization settings ([209b64d](https://github.com/janovix/aml-svc/commit/209b64d7a6e522375a48e6328ec1322906b8a9b7))
* remove migration script for MONTHLY reports to Notices ([fd0b3eb](https://github.com/janovix/aml-svc/commit/fd0b3ebbb0fd6502b1f5ce9062f8ebc271e06905))

# [1.2.0-rc.1](https://github.com/janovix/aml-svc/compare/v1.1.0...v1.2.0-rc.1) (2026-01-09)


### Bug Fixes

* add validation for GitHub Secrets in synthetic data generation workflow ([ba12a45](https://github.com/janovix/aml-svc/commit/ba12a45e593b644c69715658551a223ee872aa5b))
* enhance JSONC parsing in synthetic data generation script to handle multi-line comments and trailing commas ([b0ff3f1](https://github.com/janovix/aml-svc/commit/b0ff3f1f2c004e77c162eae909ef46004fd87d0e))
* ensure correct order of alert rule and config seeding scripts ([0b0e392](https://github.com/janovix/aml-svc/commit/0b0e39263215a829131ce4bcb9316faeed5446dc))
* implement synthetic data generation for clients and transactions with SQL output ([e3eb469](https://github.com/janovix/aml-svc/commit/e3eb469b4421b2dae969c1cd7aa2c3c374100781))
* improve JSONC parsing in synthetic data generation script to handle edge cases with comments and trailing commas ([7c87c47](https://github.com/janovix/aml-svc/commit/7c87c4719994044cea7267647c03d355caef16a7))
* remove working-directory specification for synthetic data generation in GitHub Actions workflow ([58f9cd7](https://github.com/janovix/aml-svc/commit/58f9cd7ae55c43e2defff4b2ec148d15c6d62cd9))
* update auth middleware to return 409 Conflict for missing organization ([f6f633a](https://github.com/janovix/aml-svc/commit/f6f633abce89e15e400145137279a38b629417e7))


### Features

* add Caddyfile for local development and update README with local dev instructions ([8f95e28](https://github.com/janovix/aml-svc/commit/8f95e281de5e5fc0ac087c5fee3719bd0047bdf7))
* add endpoints for retrieving catalog items by ID and active alert rules for seekers ([ab78f97](https://github.com/janovix/aml-svc/commit/ab78f973f3e0a6c8efc3d632bf3e3f97a7e94a13))
* add Notices API endpoints for managing SAT notices and their statuses ([e051bc6](https://github.com/janovix/aml-svc/commit/e051bc6801e48df5b9c01be15623c9ab10e74300))
* add organization ID support in synthetic data generation and update related services ([a5573c0](https://github.com/janovix/aml-svc/commit/a5573c04454d5c77457b116347c969907cf2d962))
* add report management functionality ([b22edff](https://github.com/janovix/aml-svc/commit/b22edff5e93c5b55996504735571db477f51b64b))
* add service binding routes for alert rules and UMA values with support for parameterized paths ([8e4aac2](https://github.com/janovix/aml-svc/commit/8e4aac2e90e689de35b6e89f68ce307f8d646c64))
* add target environment input and dynamic wrangler config selection for synthetic data generation ([066d0cb](https://github.com/janovix/aml-svc/commit/066d0cb7503657bee2867021d88a1614659217be))
* Add target environment to synthetic data generation ([1ea0117](https://github.com/janovix/aml-svc/commit/1ea0117eb51d34e9b4db852d1fca780c2e8a8097))
* add UMA values population and seeding scripts ([f80008c](https://github.com/janovix/aml-svc/commit/f80008cee92ed297686b10540a75c20ad7ae10ca))
* enhance Notice API to manage pending notices and improve statistics retrieval ([5e8a5fc](https://github.com/janovix/aml-svc/commit/5e8a5fc346bb7320998158fd8798117539ea7c29))
* enhance Notices API to include transaction data for alerts and improve XML generation process ([a252258](https://github.com/janovix/aml-svc/commit/a2522580f27491121096b115b2b8968e02499a46))
* enhance OpenAPI specifications for alerts, transactions, and clients with detailed response schemas ([a4b74de](https://github.com/janovix/aml-svc/commit/a4b74debfa8ba9882514cde7a5e345c85ff98f45))
* implement catalog enrichment service for transactions ([9733c34](https://github.com/janovix/aml-svc/commit/9733c348064080618467cb221d964f1755fbd4a7))
* implement client data and transaction retrieval endpoints in service binding ([03d16e0](https://github.com/janovix/aml-svc/commit/03d16e0f1eba01adaea7aba38db0fadc6e6281ef))
* implement custom ID generation for clients and related entities ([82aac9d](https://github.com/janovix/aml-svc/commit/82aac9dd5da51c11ae0f8fc4a50ab99be07dacfe))
* implement flexible item retrieval by ID, shortName, or code in CatalogRepository ([d58b913](https://github.com/janovix/aml-svc/commit/d58b913cfb08a23e2848736643d6333cd6126d16))
* implement global alert rules architecture and configuration management ([e115073](https://github.com/janovix/aml-svc/commit/e115073466330c27428355b2cacd45829490c080))
* implement Notices & Reports API with migration and service enhancements ([534b005](https://github.com/janovix/aml-svc/commit/534b005a7adba31743c84c696ce7d3dd55820556))
* Improve RFC validation and add tests ([1fb6a8f](https://github.com/janovix/aml-svc/commit/1fb6a8f2f2f9fda0858780a2f03d4a4acbb074e6))
* new vehicle brand catalogs and organization settings ([209b64d](https://github.com/janovix/aml-svc/commit/209b64d7a6e522375a48e6328ec1322906b8a9b7))
* remove migration script for MONTHLY reports to Notices ([fd0b3eb](https://github.com/janovix/aml-svc/commit/fd0b3ebbb0fd6502b1f5ce9062f8ebc271e06905))

# [1.1.0](https://github.com/janovix/aml-svc/compare/v1.0.0...v1.1.0) (2025-12-30)

### Bug Fixes

* **auth:** add cf options to bypass cache in JWKS fetch ([227525c](https://github.com/janovix/aml-svc/commit/227525c194e829f52bfefed78fd242547b260e19))
* replace UNION ALL with VALUES clause to avoid SQLite compound SELECT limit ([32aca8a](https://github.com/janovix/aml-svc/commit/32aca8a9e727fa4447c435c5ff04692385fc19c6))
* use individual INSERT statements instead of VALUES clause for SQLite compatibility ([c6884f0](https://github.com/janovix/aml-svc/commit/c6884f0f8d6ae48b04c8782c8d0ea1ef1afcb694))


### Features

* add alert detection queue and job types for client and transaction events ([aa007cf](https://github.com/janovix/aml-svc/commit/aa007cf56acf5ae89f0c8d64979530ad3782b492))
* Add alert rules and alerts API endpoints ([b7c71f3](https://github.com/janovix/aml-svc/commit/b7c71f34d687e503332c8fa213fe18fed1093922))
* Add alert system and UMA value tables and scripts ([4d1bbfb](https://github.com/janovix/aml-svc/commit/4d1bbfbe25908ee9f4ad9a004dbeba1ed14aeee5))
* add client and transaction statistics endpoints and schemas ([68d4e39](https://github.com/janovix/aml-svc/commit/68d4e39dd90c37e9ca032b53955bbb1e96aa611e))
* Add compliance organization and UMA calculation ([5f48719](https://github.com/janovix/aml-svc/commit/5f48719e6adf54911017b6764f8ec5f5d5a08b0f))
* add GitHub Actions workflow for generating synthetic data ([88f86eb](https://github.com/janovix/aml-svc/commit/88f86eb36e1fb364a2673450b7128a375c746476))
* Add OpenAPI specification and routes ([efd5b63](https://github.com/janovix/aml-svc/commit/efd5b63eb61df22166392a458bcf3fab0e1eb7cf))
* Add prisma generate to CI and pre-commit hook ([78563fb](https://github.com/janovix/aml-svc/commit/78563fb1623a54d61de614004b1d00ac8942e058))
* Add script to create alert rules and documentation ([cdd059a](https://github.com/janovix/aml-svc/commit/cdd059ae0cbad4155cc09343e16e5626853d44ed))
* Add script to populate economic activities catalog ([3b8499b](https://github.com/janovix/aml-svc/commit/3b8499b4d5e7a190a085b397e51e9142dc23106d))
* Add script to seed vehicle brands catalog ([af4c94a](https://github.com/janovix/aml-svc/commit/af4c94a9ee8320796f465c6d2ab19062d917fbb0))
* Add scripts to populate new catalogs ([27df78e](https://github.com/janovix/aml-svc/commit/27df78e60a576705fed079a2a4755c53a27a8fbb))
* Add states catalog and update catalog URLs ([525bd5b](https://github.com/janovix/aml-svc/commit/525bd5b72ed7b82043b1da67399f20b7271b60bd))
* Add support for multiple payment methods per transaction ([a8fc89d](https://github.com/janovix/aml-svc/commit/a8fc89dc928a569b4f7ad17e922a4828bf3ac955))
* add synthetic data generation script and documentation ([698ba58](https://github.com/janovix/aml-svc/commit/698ba5873e7dc833f9294bd08028b1d956a59fda))
* Add UMA value management and integration ([ca0196d](https://github.com/janovix/aml-svc/commit/ca0196dbf31f20b60f20a2a7c60cd839977967ef))
* **auth:** add JWT verification middleware using JWKS from auth-svc ([6fbad42](https://github.com/janovix/aml-svc/commit/6fbad42b855aa5eac3e15d323766e0f02f475ebd))
* **auth:** add service binding for worker-to-worker JWKS fetch ([976ec56](https://github.com/janovix/aml-svc/commit/976ec560ffb95b6e76c5a2fcd71738210c8e8eeb))
* **auth:** apply auth middleware to /transactions routes ([90752cd](https://github.com/janovix/aml-svc/commit/90752cde9a5c8ecc7d92b962876bf5e5498be412))
* Implement alert detection system ([bdc0490](https://github.com/janovix/aml-svc/commit/bdc04908860d36fd5577d92e9386f8232dd62532))
* Implement SAT alert submission tracking ([ed8d388](https://github.com/janovix/aml-svc/commit/ed8d388b6560c2533f581ddf1d8c8a12b19ac301))
* Implement SAT XML file generation and upload ([1696ec7](https://github.com/janovix/aml-svc/commit/1696ec753ac3d0068fbcba744837b8356d606893))
* Populate SAT catalogs from CSV files ([9bb97de](https://github.com/janovix/aml-svc/commit/9bb97de569b467ea39df8c76d1136e155207b120))
* Remove serialNumber from Transaction entity ([13043b1](https://github.com/janovix/aml-svc/commit/13043b10ada81feae4ee769f81d60bf30ec27a01))
* Seed alert rules and update seeding script ([ade8a7e](https://github.com/janovix/aml-svc/commit/ade8a7e022f8c3319be4a43c88d0daf7d4f927a2))
* Set pnpm as package manager ([0f88525](https://github.com/janovix/aml-svc/commit/0f885258234c8c06a70761662f697bd97b527b14))
* Trigger CI on push to main and dev branches ([3ac6a06](https://github.com/janovix/aml-svc/commit/3ac6a069df8180df302aa7878779cdb90120b9f7))
* Use RFC as primary key for clients ([118a3b1](https://github.com/janovix/aml-svc/commit/118a3b1fec2af345eadc4267a27bf6c9762ee8fd))


### Reverts

* remove cookie-based auth, use JWT Bearer tokens only ([bd40f6c](https://github.com/janovix/aml-svc/commit/bd40f6c71fa62121dc5ec11db3183e3d42931bbe))


# [1.1.0-rc.37](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.36...v1.1.0-rc.37) (2026-01-07)


### Features

* enhance Notice API to manage pending notices and improve statistics retrieval ([5e8a5fc](https://github.com/janovix/aml-svc/commit/5e8a5fc346bb7320998158fd8798117539ea7c29))

# [1.1.0-rc.36](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.35...v1.1.0-rc.36) (2026-01-06)


### Features

* enhance Notices API to include transaction data for alerts and improve XML generation process ([a252258](https://github.com/janovix/aml-svc/commit/a2522580f27491121096b115b2b8968e02499a46))

# [1.1.0-rc.35](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.34...v1.1.0-rc.35) (2026-01-06)


### Features

* add Notices API endpoints for managing SAT notices and their statuses ([e051bc6](https://github.com/janovix/aml-svc/commit/e051bc6801e48df5b9c01be15623c9ab10e74300))
* enhance OpenAPI specifications for alerts, transactions, and clients with detailed response schemas ([a4b74de](https://github.com/janovix/aml-svc/commit/a4b74debfa8ba9882514cde7a5e345c85ff98f45))
* implement Notices & Reports API with migration and service enhancements ([534b005](https://github.com/janovix/aml-svc/commit/534b005a7adba31743c84c696ce7d3dd55820556))
* remove migration script for MONTHLY reports to Notices ([fd0b3eb](https://github.com/janovix/aml-svc/commit/fd0b3ebbb0fd6502b1f5ce9062f8ebc271e06905))

# [1.1.0-rc.34](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.33...v1.1.0-rc.34) (2026-01-05)


### Features

* add UMA values population and seeding scripts ([f80008c](https://github.com/janovix/aml-svc/commit/f80008cee92ed297686b10540a75c20ad7ae10ca))

# [1.1.0-rc.33](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.32...v1.1.0-rc.33) (2026-01-05)


### Features

* add report management functionality ([b22edff](https://github.com/janovix/aml-svc/commit/b22edff5e93c5b55996504735571db477f51b64b))

# [1.1.0-rc.32](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.31...v1.1.0-rc.32) (2026-01-03)


### Features

* implement client data and transaction retrieval endpoints in service binding ([03d16e0](https://github.com/janovix/aml-svc/commit/03d16e0f1eba01adaea7aba38db0fadc6e6281ef))

# [1.1.0-rc.31](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.30...v1.1.0-rc.31) (2026-01-03)


### Features

* add service binding routes for alert rules and UMA values with support for parameterized paths ([8e4aac2](https://github.com/janovix/aml-svc/commit/8e4aac2e90e689de35b6e89f68ce307f8d646c64))

# [1.1.0-rc.30](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.29...v1.1.0-rc.30) (2026-01-03)


### Features

* add Caddyfile for local development and update README with local dev instructions ([8f95e28](https://github.com/janovix/aml-svc/commit/8f95e281de5e5fc0ac087c5fee3719bd0047bdf7))

# [1.1.0-rc.29](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.28...v1.1.0-rc.29) (2026-01-03)


### Features

* implement flexible item retrieval by ID, shortName, or code in CatalogRepository ([d58b913](https://github.com/janovix/aml-svc/commit/d58b913cfb08a23e2848736643d6333cd6126d16))

# [1.1.0-rc.28](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.27...v1.1.0-rc.28) (2026-01-03)


### Features

* add endpoints for retrieving catalog items by ID and active alert rules for seekers ([ab78f97](https://github.com/janovix/aml-svc/commit/ab78f973f3e0a6c8efc3d632bf3e3f97a7e94a13))

# [1.1.0-rc.27](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.26...v1.1.0-rc.27) (2026-01-02)


### Bug Fixes

* ensure correct order of alert rule and config seeding scripts ([0b0e392](https://github.com/janovix/aml-svc/commit/0b0e39263215a829131ce4bcb9316faeed5446dc))

# [1.1.0-rc.26](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.25...v1.1.0-rc.26) (2026-01-02)


### Features

* implement global alert rules architecture and configuration management ([e115073](https://github.com/janovix/aml-svc/commit/e115073466330c27428355b2cacd45829490c080))

# [1.1.0-rc.25](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.24...v1.1.0-rc.25) (2025-12-31)


### Features

* implement custom ID generation for clients and related entities ([82aac9d](https://github.com/janovix/aml-svc/commit/82aac9dd5da51c11ae0f8fc4a50ab99be07dacfe))

# [1.1.0-rc.24](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.23...v1.1.0-rc.24) (2025-12-31)


### Bug Fixes

* update auth middleware to return 409 Conflict for missing organization ([f6f633a](https://github.com/janovix/aml-svc/commit/f6f633abce89e15e400145137279a38b629417e7))

# [1.1.0-rc.23](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.22...v1.1.0-rc.23) (2025-12-31)


### Features

* implement catalog enrichment service for transactions ([9733c34](https://github.com/janovix/aml-svc/commit/9733c348064080618467cb221d964f1755fbd4a7))

# [1.1.0-rc.22](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.21...v1.1.0-rc.22) (2025-12-31)


### Features

* add organization ID support in synthetic data generation and update related services ([a5573c0](https://github.com/janovix/aml-svc/commit/a5573c04454d5c77457b116347c969907cf2d962))
* Add target environment to synthetic data generation ([1ea0117](https://github.com/janovix/aml-svc/commit/1ea0117eb51d34e9b4db852d1fca780c2e8a8097))
* new vehicle brand catalogs and organization settings ([209b64d](https://github.com/janovix/aml-svc/commit/209b64d7a6e522375a48e6328ec1322906b8a9b7))

# [1.1.0-rc.21](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.20...v1.1.0-rc.21) (2025-12-31)


### Features

* Improve RFC validation and add tests ([1fb6a8f](https://github.com/janovix/aml-svc/commit/1fb6a8f2f2f9fda0858780a2f03d4a4acbb074e6))

# [1.1.0-rc.20](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.19...v1.1.0-rc.20) (2025-12-30)


### Features

* add target environment input and dynamic wrangler config selection for synthetic data generation ([066d0cb](https://github.com/janovix/aml-svc/commit/066d0cb7503657bee2867021d88a1614659217be))

# [1.1.0-rc.19](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.18...v1.1.0-rc.19) (2025-12-30)


### Bug Fixes

* implement synthetic data generation for clients and transactions with SQL output ([e3eb469](https://github.com/janovix/aml-svc/commit/e3eb469b4421b2dae969c1cd7aa2c3c374100781))

# [1.1.0-rc.18](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.17...v1.1.0-rc.18) (2025-12-30)


### Bug Fixes

* improve JSONC parsing in synthetic data generation script to handle edge cases with comments and trailing commas ([7c87c47](https://github.com/janovix/aml-svc/commit/7c87c4719994044cea7267647c03d355caef16a7))

# [1.1.0-rc.17](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.16...v1.1.0-rc.17) (2025-12-30)


### Bug Fixes

* enhance JSONC parsing in synthetic data generation script to handle multi-line comments and trailing commas ([b0ff3f1](https://github.com/janovix/aml-svc/commit/b0ff3f1f2c004e77c162eae909ef46004fd87d0e))

# [1.1.0-rc.16](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.15...v1.1.0-rc.16) (2025-12-30)


### Bug Fixes

* add validation for GitHub Secrets in synthetic data generation workflow ([ba12a45](https://github.com/janovix/aml-svc/commit/ba12a45e593b644c69715658551a223ee872aa5b))

# [1.1.0-rc.15](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.14...v1.1.0-rc.15) (2025-12-30)


### Bug Fixes
* remove working-directory specification for synthetic data generation in GitHub Actions workflow ([58f9cd7](https://github.com/janovix/aml-svc/commit/58f9cd7ae55c43e2defff4b2ec148d15c6d62cd9))

# [1.1.0-rc.14](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.13...v1.1.0-rc.14) (2025-12-30)


### Features

* add GitHub Actions workflow for generating synthetic data ([88f86eb](https://github.com/janovix/aml-svc/commit/88f86eb36e1fb364a2673450b7128a375c746476))
* add synthetic data generation script and documentation ([698ba58](https://github.com/janovix/aml-svc/commit/698ba5873e7dc833f9294bd08028b1d956a59fda))

# [1.1.0-rc.13](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.12...v1.1.0-rc.13) (2025-12-29)


### Features

* add alert detection queue and job types for client and transaction events ([aa007cf](https://github.com/janovix/aml-svc/commit/aa007cf56acf5ae89f0c8d64979530ad3782b492))
* add client and transaction statistics endpoints and schemas ([68d4e39](https://github.com/janovix/aml-svc/commit/68d4e39dd90c37e9ca032b53955bbb1e96aa611e))

# [1.1.0-rc.12](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.11...v1.1.0-rc.12) (2025-12-22)


### Features

* Add scripts to populate new catalogs ([27df78e](https://github.com/janovix/aml-svc/commit/27df78e60a576705fed079a2a4755c53a27a8fbb))

# [1.1.0-rc.11](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.10...v1.1.0-rc.11) (2025-12-21)


### Features

* Trigger CI on push to main and dev branches ([3ac6a06](https://github.com/janovix/aml-svc/commit/3ac6a069df8180df302aa7878779cdb90120b9f7))

# [1.1.0-rc.10](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.9...v1.1.0-rc.10) (2025-12-21)


### Features

* Add alert rules and alerts API endpoints ([b7c71f3](https://github.com/janovix/aml-svc/commit/b7c71f34d687e503332c8fa213fe18fed1093922))
* Add alert system and UMA value tables and scripts ([4d1bbfb](https://github.com/janovix/aml-svc/commit/4d1bbfbe25908ee9f4ad9a004dbeba1ed14aeee5))
* Add compliance organization and UMA calculation ([5f48719](https://github.com/janovix/aml-svc/commit/5f48719e6adf54911017b6764f8ec5f5d5a08b0f))
* Add script to create alert rules and documentation ([cdd059a](https://github.com/janovix/aml-svc/commit/cdd059ae0cbad4155cc09343e16e5626853d44ed))
* Add script to populate economic activities catalog ([3b8499b](https://github.com/janovix/aml-svc/commit/3b8499b4d5e7a190a085b397e51e9142dc23106d))
* Add states catalog and update catalog URLs ([525bd5b](https://github.com/janovix/aml-svc/commit/525bd5b72ed7b82043b1da67399f20b7271b60bd))
* Add UMA value management and integration ([ca0196d](https://github.com/janovix/aml-svc/commit/ca0196dbf31f20b60f20a2a7c60cd839977967ef))
* Implement alert detection system ([bdc0490](https://github.com/janovix/aml-svc/commit/bdc04908860d36fd5577d92e9386f8232dd62532))
* Implement SAT alert submission tracking ([ed8d388](https://github.com/janovix/aml-svc/commit/ed8d388b6560c2533f581ddf1d8c8a12b19ac301))
* Implement SAT XML file generation and upload ([1696ec7](https://github.com/janovix/aml-svc/commit/1696ec753ac3d0068fbcba744837b8356d606893))
* Populate SAT catalogs from CSV files ([9bb97de](https://github.com/janovix/aml-svc/commit/9bb97de569b467ea39df8c76d1136e155207b120))
* Seed alert rules and update seeding script ([ade8a7e](https://github.com/janovix/aml-svc/commit/ade8a7e022f8c3319be4a43c88d0daf7d4f927a2))

# [1.1.0-rc.9](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.8...v1.1.0-rc.9) (2025-12-19)


### Features

* **auth:** apply auth middleware to /transactions routes ([90752cd](https://github.com/janovix/aml-svc/commit/90752cde9a5c8ecc7d92b962876bf5e5498be412))

# [1.1.0-rc.8](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.7...v1.1.0-rc.8) (2025-12-19)


### Features

* **auth:** add service binding for worker-to-worker JWKS fetch ([976ec56](https://github.com/janovix/aml-svc/commit/976ec560ffb95b6e76c5a2fcd71738210c8e8eeb))

# [1.1.0-rc.7](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.6...v1.1.0-rc.7) (2025-12-19)


### Bug Fixes

* **auth:** add cf options to bypass cache in JWKS fetch ([227525c](https://github.com/janovix/aml-svc/commit/227525c194e829f52bfefed78fd242547b260e19))


### Reverts

* remove cookie-based auth, use JWT Bearer tokens only ([bd40f6c](https://github.com/janovix/aml-svc/commit/bd40f6c71fa62121dc5ec11db3183e3d42931bbe))

# [1.1.0-rc.6](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.5...v1.1.0-rc.6) (2025-12-19)


### Features

* **auth:** add JWT verification middleware using JWKS from auth-svc ([6fbad42](https://github.com/janovix/aml-svc/commit/6fbad42b855aa5eac3e15d323766e0f02f475ebd))

# [1.1.0-rc.5](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.4...v1.1.0-rc.5) (2025-12-19)


### Bug Fixes

* replace UNION ALL with VALUES clause to avoid SQLite compound SELECT limit ([32aca8a](https://github.com/janovix/aml-svc/commit/32aca8a9e727fa4447c435c5ff04692385fc19c6))
* use individual INSERT statements instead of VALUES clause for SQLite compatibility ([c6884f0](https://github.com/janovix/aml-svc/commit/c6884f0f8d6ae48b04c8782c8d0ea1ef1afcb694))


### Features

* Add script to seed vehicle brands catalog ([af4c94a](https://github.com/janovix/aml-svc/commit/af4c94a9ee8320796f465c6d2ab19062d917fbb0))

# [1.1.0-rc.4](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.3...v1.1.0-rc.4) (2025-12-18)


### Features

* Add support for multiple payment methods per transaction ([a8fc89d](https://github.com/janovix/aml-svc/commit/a8fc89dc928a569b4f7ad17e922a4828bf3ac955))
* Remove serialNumber from Transaction entity ([13043b1](https://github.com/janovix/aml-svc/commit/13043b10ada81feae4ee769f81d60bf30ec27a01))

# [1.1.0-rc.3](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.2...v1.1.0-rc.3) (2025-12-17)


### Features

* Set pnpm as package manager ([0f88525](https://github.com/janovix/aml-svc/commit/0f885258234c8c06a70761662f697bd97b527b14))

# [1.1.0-rc.2](https://github.com/janovix/aml-svc/compare/v1.1.0-rc.1...v1.1.0-rc.2) (2025-12-17)


### Features

* Use RFC as primary key for clients ([118a3b1](https://github.com/janovix/aml-svc/commit/118a3b1fec2af345eadc4267a27bf6c9762ee8fd))

# [1.1.0-rc.1](https://github.com/janovix/aml-svc/compare/v1.0.0...v1.1.0-rc.1) (2025-12-16)


### Features

* Add OpenAPI specification and routes ([efd5b63](https://github.com/janovix/aml-svc/commit/efd5b63eb61df22166392a458bcf3fab0e1eb7cf))
* Add prisma generate to CI and pre-commit hook ([78563fb](https://github.com/janovix/aml-svc/commit/78563fb1623a54d61de614004b1d00ac8942e058))

# 1.0.0 (2025-12-16)


### Bug Fixes

* formatting issues ([3395147](https://github.com/janovix/aml-svc/commit/3395147217747064bdca619d4e55fe1f1ce03e68))

# [1.1.0](https://github.com/algtools/backend-template/compare/v1.0.0...v1.1.0) (2025-12-14)


### Features

* Add TASKS_KV namespace to wrangler configs ([dc106de](https://github.com/algtools/backend-template/commit/dc106debc6d30662d681ddd765723f41b3505d42))
* enhance API with metadata and health check endpoints ([dc9a501](https://github.com/algtools/backend-template/commit/dc9a501e5947d2231cbb26dc84330093cb108369))
* Implement KV caching for tasks API ([f1d1262](https://github.com/algtools/backend-template/commit/f1d1262446fe920cac2e1b65703f5aab8af9ee50))

# [1.1.0-rc.1](https://github.com/algtools/backend-template/compare/v1.0.0...v1.1.0-rc.1) (2025-12-14)


### Features

* Add TASKS_KV namespace to wrangler configs ([dc106de](https://github.com/algtools/backend-template/commit/dc106debc6d30662d681ddd765723f41b3505d42))
* enhance API with metadata and health check endpoints ([dc9a501](https://github.com/algtools/backend-template/commit/dc9a501e5947d2231cbb26dc84330093cb108369))
* Implement KV caching for tasks API ([f1d1262](https://github.com/algtools/backend-template/commit/f1d1262446fe920cac2e1b65703f5aab8af9ee50))

# 1.0.0 (2025-12-13)

### Features

* Add TASKS_KV namespace to wrangler configs ([dc106de](https://github.com/algtools/backend-template/commit/dc106debc6d30662d681ddd765723f41b3505d42))
* Implement KV caching for tasks API ([f1d1262](https://github.com/algtools/backend-template/commit/f1d1262446fe920cac2e1b65703f5aab8af9ee50))

# [1.0.0-rc.2](https://github.com/algtools/backend-template/compare/v1.0.0-rc.1...v1.0.0-rc.2) (2025-12-13)


### Features

* enhance API with metadata and health check endpoints ([dc9a501](https://github.com/algtools/backend-template/commit/dc9a501e5947d2231cbb26dc84330093cb108369))
* Add linting and formatting dependencies ([ef9d4c8](https://github.com/algtools/backend-template/commit/ef9d4c8ca32276f4bd49f5d46ba9723d0f06f478))

# 1.0.0-rc.1 (2025-12-13)


### Features

* Add linting and formatting dependencies ([ef9d4c8](https://github.com/algtools/backend-template/commit/ef9d4c8ca32276f4bd49f5d46ba9723d0f06f478))
