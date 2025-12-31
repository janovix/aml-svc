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
