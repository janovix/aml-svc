-- Seed script for maritime-vehicle-brands catalog
-- This script populates shipyards, yacht manufacturers, and recreational boat brands
-- Data source: Comprehensive manufacturer database with country of origin

-- =====================================================
-- CREATE CATALOG ENTRY (if not exists)
-- =====================================================
INSERT OR IGNORE INTO catalogs (id, key, name, active, allow_new_items, created_at, updated_at)
VALUES (
    lower(hex(randomblob(16))),
    'maritime-vehicle-brands',
    'Marcas de Vehículos Marítimos',
    1,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- =====================================================
-- MAJOR SHIPYARDS & COMMERCIAL SHIPBUILDERS
-- =====================================================

-- Korean Shipyards
INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Hyundai Heavy Industries', 'hyundai heavy industries', 1, '{"originCountry":"Corea del Sur","type":"Buques comerciales, Petroleros"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'hyundai heavy industries');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Samsung Heavy Industries', 'samsung heavy industries', 1, '{"originCountry":"Corea del Sur","type":"Buques comerciales, Metaneros"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'samsung heavy industries');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Daewoo Shipbuilding (DSME)', 'daewoo shipbuilding (dsme)', 1, '{"originCountry":"Corea del Sur","type":"Portacontenedores, Rompehielos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'daewoo shipbuilding (dsme)');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Hyundai Samho Heavy Industries', 'hyundai samho heavy industries', 1, '{"originCountry":"Corea del Sur","type":"Petroleros, Portacontenedores"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'hyundai samho heavy industries');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'STX Shipbuilding', 'stx shipbuilding', 1, '{"originCountry":"Corea del Sur","type":"Buques comerciales"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'stx shipbuilding');

-- Chinese Shipyards
INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'China State Shipbuilding Corporation (CSSC)', 'china state shipbuilding corporation (cssc)', 1, '{"originCountry":"China","type":"Buques de todo tipo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'china state shipbuilding corporation (cssc)');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'China Shipbuilding Industry Corporation (CSIC)', 'china shipbuilding industry corporation (csic)', 1, '{"originCountry":"China","type":"Buques militares y comerciales"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'china shipbuilding industry corporation (csic)');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Jiangnan Shipyard', 'jiangnan shipyard', 1, '{"originCountry":"China","type":"Portacontenedores, Buques militares"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'jiangnan shipyard');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'COSCO Shipyard', 'cosco shipyard', 1, '{"originCountry":"China","type":"Petroleros, Graneleros, FPSO"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'cosco shipyard');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Shandong Heavy Industry Group', 'shandong heavy industry group', 1, '{"originCountry":"China","type":"Graneleros, Petroleros, Metaneros"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'shandong heavy industry group');

-- Japanese Shipyards
INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Imabari Shipbuilding', 'imabari shipbuilding', 1, '{"originCountry":"Japón","type":"Buques comerciales"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'imabari shipbuilding');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Mitsubishi Heavy Industries (Naval)', 'mitsubishi heavy industries (naval)', 1, '{"originCountry":"Japón","type":"Buques comerciales y militares"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'mitsubishi heavy industries (naval)');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Kawasaki Heavy Industries (Naval)', 'kawasaki heavy industries (naval)', 1, '{"originCountry":"Japón","type":"Buques, Submarinos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'kawasaki heavy industries (naval)');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Sumitomo Heavy Industries', 'sumitomo heavy industries', 1, '{"originCountry":"Japón","type":"Graneleros"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'sumitomo heavy industries');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Tsuneishi Shipbuilding', 'tsuneishi shipbuilding', 1, '{"originCountry":"Japón","type":"Graneleros"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'tsuneishi shipbuilding');

-- European Shipyards
INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Fincantieri', 'fincantieri', 1, '{"originCountry":"Italia","type":"Cruceros, Buques militares"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'fincantieri');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Naval Group', 'naval group', 1, '{"originCountry":"Francia","type":"Buques de guerra, Submarinos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'naval group');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Navantia', 'navantia', 1, '{"originCountry":"España","type":"Buques militares, Submarinos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'navantia');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Damen Shipyards', 'damen shipyards', 1, '{"originCountry":"Países Bajos","type":"Embarcaciones de trabajo, Remolcadores"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'damen shipyards');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Harland and Wolff', 'harland and wolff', 1, '{"originCountry":"Reino Unido","type":"Buques comerciales, Reparaciones"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'harland and wolff');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'BAE Systems (Naval)', 'bae systems (naval)', 1, '{"originCountry":"Reino Unido","type":"Buques militares"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'bae systems (naval)');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'ThyssenKrupp Marine Systems', 'thyssenkrupp marine systems', 1, '{"originCountry":"Alemania","type":"Submarinos, Buques militares"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'thyssenkrupp marine systems');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Meyer Werft', 'meyer werft', 1, '{"originCountry":"Alemania","type":"Cruceros"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'meyer werft');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Astilleros Armón', 'astilleros armon', 1, '{"originCountry":"España","type":"Pesqueros, Remolcadores"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'astilleros armon');

-- Other International Shipyards
INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Austal', 'austal', 1, '{"originCountry":"Australia","type":"Embarcaciones de alta velocidad"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'austal');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Huntington Ingalls Industries', 'huntington ingalls industries', 1, '{"originCountry":"Estados Unidos","type":"Portaaviones, Buques militares"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'huntington ingalls industries');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'General Dynamics NASSCO', 'general dynamics nassco', 1, '{"originCountry":"Estados Unidos","type":"Buques de carga"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'general dynamics nassco');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Seatrium', 'seatrium', 1, '{"originCountry":"Singapur","type":"Plataformas offshore, Buques"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'seatrium');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'CSBC Corporation', 'csbc corporation', 1, '{"originCountry":"Taiwán","type":"Buques comerciales"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'csbc corporation');

-- =====================================================
-- YACHT & RECREATIONAL BOAT MANUFACTURERS
-- =====================================================

-- Italian Yacht Brands
INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Azimut Yachts', 'azimut yachts', 1, '{"originCountry":"Italia","type":"Yates de motor"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'azimut yachts');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Benetti', 'benetti', 1, '{"originCountry":"Italia","type":"Megayates de lujo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'benetti');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Ferretti', 'ferretti', 1, '{"originCountry":"Italia","type":"Yates de motor"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'ferretti');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Riva', 'riva', 1, '{"originCountry":"Italia","type":"Yates de lujo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'riva');

-- UK Yacht Brands
INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Princess Yachts', 'princess yachts', 1, '{"originCountry":"Reino Unido","type":"Yates de motor"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'princess yachts');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Sunseeker', 'sunseeker', 1, '{"originCountry":"Reino Unido","type":"Yates de motor"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'sunseeker');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Fairline', 'fairline', 1, '{"originCountry":"Reino Unido","type":"Yates de motor"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'fairline');

-- French Yacht Brands
INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Beneteau', 'beneteau', 1, '{"originCountry":"Francia","type":"Veleros, Yates"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'beneteau');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Jeanneau', 'jeanneau', 1, '{"originCountry":"Francia","type":"Veleros, Yates"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'jeanneau');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Lagoon', 'lagoon', 1, '{"originCountry":"Francia","type":"Catamaranes"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'lagoon');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Fountaine Pajot', 'fountaine pajot', 1, '{"originCountry":"Francia","type":"Catamaranes"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'fountaine pajot');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Dufour', 'dufour', 1, '{"originCountry":"Francia","type":"Veleros"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'dufour');

-- German Yacht Brands
INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Bavaria Yachts', 'bavaria yachts', 1, '{"originCountry":"Alemania","type":"Veleros, Yates"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'bavaria yachts');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Hanse Yachts', 'hanse yachts', 1, '{"originCountry":"Alemania","type":"Veleros"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'hanse yachts');

-- American Boat Brands
INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Sea Ray', 'sea ray', 1, '{"originCountry":"Estados Unidos","type":"Lanchas, Yates"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'sea ray');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Boston Whaler', 'boston whaler', 1, '{"originCountry":"Estados Unidos","type":"Lanchas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'boston whaler');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Bayliner', 'bayliner', 1, '{"originCountry":"Estados Unidos","type":"Lanchas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'bayliner');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Chris-Craft', 'chris-craft', 1, '{"originCountry":"Estados Unidos","type":"Lanchas clásicas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'chris-craft');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Bertram', 'bertram', 1, '{"originCountry":"Estados Unidos","type":"Yates de pesca"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'bertram');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Viking Yachts', 'viking yachts', 1, '{"originCountry":"Estados Unidos","type":"Yates deportivos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'viking yachts');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Regal', 'regal', 1, '{"originCountry":"Estados Unidos","type":"Lanchas deportivas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'regal');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Cobalt', 'cobalt', 1, '{"originCountry":"Estados Unidos","type":"Lanchas deportivas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'cobalt');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Chaparral', 'chaparral', 1, '{"originCountry":"Estados Unidos","type":"Lanchas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'chaparral');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Four Winns', 'four winns', 1, '{"originCountry":"Estados Unidos","type":"Lanchas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'four winns');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Quicksilver', 'quicksilver', 1, '{"originCountry":"Estados Unidos","type":"Lanchas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'quicksilver');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Baja', 'baja', 1, '{"originCountry":"Estados Unidos","type":"Lanchas de alta performance"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'baja');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Grady-White', 'grady-white', 1, '{"originCountry":"Estados Unidos","type":"Lanchas de pesca"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'grady-white');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Hatteras', 'hatteras', 1, '{"originCountry":"Estados Unidos","type":"Yates de pesca"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'hatteras');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'MasterCraft', 'mastercraft', 1, '{"originCountry":"Estados Unidos","type":"Lanchas de wakeboard/ski"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'mastercraft');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Monterey', 'monterey', 1, '{"originCountry":"Estados Unidos","type":"Lanchas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'monterey');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Prestige', 'prestige', 1, '{"originCountry":"Francia","type":"Yates de motor"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'prestige');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Yamaha Marine', 'yamaha marine', 1, '{"originCountry":"Japón","type":"Lanchas, Motos de agua"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'yamaha marine');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Brunswick', 'brunswick', 1, '{"originCountry":"Estados Unidos","type":"Lanchas, Motores marinos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalized_name = 'brunswick');
