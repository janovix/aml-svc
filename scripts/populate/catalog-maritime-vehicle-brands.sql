-- Seed script for maritime-vehicle-brands catalog
-- This script populates shipyards, yacht manufacturers, and recreational boat brands
-- Data source: Comprehensive manufacturer database with country of origin

-- =====================================================
-- CREATE CATALOG ENTRY (if not exists)
-- =====================================================
INSERT OR IGNORE INTO catalogs (id, key, name, active, allowNewItems, createdAt, updatedAt)
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
INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Hyundai Heavy Industries', 'hyundai heavy industries', 1, '{"originCountry":"Corea del Sur","type":"Buques comerciales, Petroleros"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'hyundai heavy industries');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Samsung Heavy Industries', 'samsung heavy industries', 1, '{"originCountry":"Corea del Sur","type":"Buques comerciales, Metaneros"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'samsung heavy industries');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Daewoo Shipbuilding (DSME)', 'daewoo shipbuilding (dsme)', 1, '{"originCountry":"Corea del Sur","type":"Portacontenedores, Rompehielos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'daewoo shipbuilding (dsme)');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Hyundai Samho Heavy Industries', 'hyundai samho heavy industries', 1, '{"originCountry":"Corea del Sur","type":"Petroleros, Portacontenedores"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'hyundai samho heavy industries');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'STX Shipbuilding', 'stx shipbuilding', 1, '{"originCountry":"Corea del Sur","type":"Buques comerciales"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'stx shipbuilding');

-- Chinese Shipyards
INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'China State Shipbuilding Corporation (CSSC)', 'china state shipbuilding corporation (cssc)', 1, '{"originCountry":"China","type":"Buques de todo tipo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'china state shipbuilding corporation (cssc)');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'China Shipbuilding Industry Corporation (CSIC)', 'china shipbuilding industry corporation (csic)', 1, '{"originCountry":"China","type":"Buques militares y comerciales"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'china shipbuilding industry corporation (csic)');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Jiangnan Shipyard', 'jiangnan shipyard', 1, '{"originCountry":"China","type":"Portacontenedores, Buques militares"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'jiangnan shipyard');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'COSCO Shipyard', 'cosco shipyard', 1, '{"originCountry":"China","type":"Petroleros, Graneleros, FPSO"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'cosco shipyard');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Shandong Heavy Industry Group', 'shandong heavy industry group', 1, '{"originCountry":"China","type":"Graneleros, Petroleros, Metaneros"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'shandong heavy industry group');

-- Japanese Shipyards
INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Imabari Shipbuilding', 'imabari shipbuilding', 1, '{"originCountry":"Japón","type":"Buques comerciales"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'imabari shipbuilding');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Mitsubishi Heavy Industries (Naval)', 'mitsubishi heavy industries (naval)', 1, '{"originCountry":"Japón","type":"Buques comerciales y militares"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'mitsubishi heavy industries (naval)');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Kawasaki Heavy Industries (Naval)', 'kawasaki heavy industries (naval)', 1, '{"originCountry":"Japón","type":"Buques, Submarinos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'kawasaki heavy industries (naval)');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Sumitomo Heavy Industries', 'sumitomo heavy industries', 1, '{"originCountry":"Japón","type":"Graneleros"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'sumitomo heavy industries');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Tsuneishi Shipbuilding', 'tsuneishi shipbuilding', 1, '{"originCountry":"Japón","type":"Graneleros"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'tsuneishi shipbuilding');

-- European Shipyards
INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Fincantieri', 'fincantieri', 1, '{"originCountry":"Italia","type":"Cruceros, Buques militares"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'fincantieri');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Naval Group', 'naval group', 1, '{"originCountry":"Francia","type":"Buques de guerra, Submarinos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'naval group');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Navantia', 'navantia', 1, '{"originCountry":"España","type":"Buques militares, Submarinos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'navantia');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Damen Shipyards', 'damen shipyards', 1, '{"originCountry":"Países Bajos","type":"Embarcaciones de trabajo, Remolcadores"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'damen shipyards');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Harland and Wolff', 'harland and wolff', 1, '{"originCountry":"Reino Unido","type":"Buques comerciales, Reparaciones"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'harland and wolff');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'BAE Systems (Naval)', 'bae systems (naval)', 1, '{"originCountry":"Reino Unido","type":"Buques militares"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'bae systems (naval)');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'ThyssenKrupp Marine Systems', 'thyssenkrupp marine systems', 1, '{"originCountry":"Alemania","type":"Submarinos, Buques militares"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'thyssenkrupp marine systems');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Meyer Werft', 'meyer werft', 1, '{"originCountry":"Alemania","type":"Cruceros"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'meyer werft');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Astilleros Armón', 'astilleros armon', 1, '{"originCountry":"España","type":"Pesqueros, Remolcadores"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'astilleros armon');

-- Other International Shipyards
INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Austal', 'austal', 1, '{"originCountry":"Australia","type":"Embarcaciones de alta velocidad"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'austal');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Huntington Ingalls Industries', 'huntington ingalls industries', 1, '{"originCountry":"Estados Unidos","type":"Portaaviones, Buques militares"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'huntington ingalls industries');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'General Dynamics NASSCO', 'general dynamics nassco', 1, '{"originCountry":"Estados Unidos","type":"Buques de carga"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'general dynamics nassco');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Seatrium', 'seatrium', 1, '{"originCountry":"Singapur","type":"Plataformas offshore, Buques"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'seatrium');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'CSBC Corporation', 'csbc corporation', 1, '{"originCountry":"Taiwán","type":"Buques comerciales"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'csbc corporation');

-- =====================================================
-- YACHT & RECREATIONAL BOAT MANUFACTURERS
-- =====================================================

-- Italian Yacht Brands
INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Azimut Yachts', 'azimut yachts', 1, '{"originCountry":"Italia","type":"Yates de motor"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'azimut yachts');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Benetti', 'benetti', 1, '{"originCountry":"Italia","type":"Megayates de lujo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'benetti');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Ferretti', 'ferretti', 1, '{"originCountry":"Italia","type":"Yates de motor"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'ferretti');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Riva', 'riva', 1, '{"originCountry":"Italia","type":"Yates de lujo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'riva');

-- UK Yacht Brands
INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Princess Yachts', 'princess yachts', 1, '{"originCountry":"Reino Unido","type":"Yates de motor"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'princess yachts');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Sunseeker', 'sunseeker', 1, '{"originCountry":"Reino Unido","type":"Yates de motor"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'sunseeker');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Fairline', 'fairline', 1, '{"originCountry":"Reino Unido","type":"Yates de motor"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'fairline');

-- French Yacht Brands
INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Beneteau', 'beneteau', 1, '{"originCountry":"Francia","type":"Veleros, Yates"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'beneteau');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Jeanneau', 'jeanneau', 1, '{"originCountry":"Francia","type":"Veleros, Yates"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'jeanneau');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Lagoon', 'lagoon', 1, '{"originCountry":"Francia","type":"Catamaranes"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'lagoon');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Fountaine Pajot', 'fountaine pajot', 1, '{"originCountry":"Francia","type":"Catamaranes"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'fountaine pajot');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Dufour', 'dufour', 1, '{"originCountry":"Francia","type":"Veleros"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'dufour');

-- German Yacht Brands
INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Bavaria Yachts', 'bavaria yachts', 1, '{"originCountry":"Alemania","type":"Veleros, Yates"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'bavaria yachts');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Hanse Yachts', 'hanse yachts', 1, '{"originCountry":"Alemania","type":"Veleros"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'hanse yachts');

-- American Boat Brands
INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Sea Ray', 'sea ray', 1, '{"originCountry":"Estados Unidos","type":"Lanchas, Yates"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'sea ray');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Boston Whaler', 'boston whaler', 1, '{"originCountry":"Estados Unidos","type":"Lanchas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'boston whaler');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Bayliner', 'bayliner', 1, '{"originCountry":"Estados Unidos","type":"Lanchas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'bayliner');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Chris-Craft', 'chris-craft', 1, '{"originCountry":"Estados Unidos","type":"Lanchas clásicas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'chris-craft');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Bertram', 'bertram', 1, '{"originCountry":"Estados Unidos","type":"Yates de pesca"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'bertram');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Viking Yachts', 'viking yachts', 1, '{"originCountry":"Estados Unidos","type":"Yates deportivos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'viking yachts');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Regal', 'regal', 1, '{"originCountry":"Estados Unidos","type":"Lanchas deportivas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'regal');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Cobalt', 'cobalt', 1, '{"originCountry":"Estados Unidos","type":"Lanchas deportivas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'cobalt');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Chaparral', 'chaparral', 1, '{"originCountry":"Estados Unidos","type":"Lanchas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'chaparral');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Four Winns', 'four winns', 1, '{"originCountry":"Estados Unidos","type":"Lanchas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'four winns');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Quicksilver', 'quicksilver', 1, '{"originCountry":"Estados Unidos","type":"Lanchas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'quicksilver');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Baja', 'baja', 1, '{"originCountry":"Estados Unidos","type":"Lanchas de alta performance"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'baja');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Grady-White', 'grady-white', 1, '{"originCountry":"Estados Unidos","type":"Lanchas de pesca"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'grady-white');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Hatteras', 'hatteras', 1, '{"originCountry":"Estados Unidos","type":"Yates de pesca"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'hatteras');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'MasterCraft', 'mastercraft', 1, '{"originCountry":"Estados Unidos","type":"Lanchas de wakeboard/ski"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'mastercraft');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Monterey', 'monterey', 1, '{"originCountry":"Estados Unidos","type":"Lanchas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'monterey');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Prestige', 'prestige', 1, '{"originCountry":"Francia","type":"Yates de motor"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'prestige');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Yamaha Marine', 'yamaha marine', 1, '{"originCountry":"Japón","type":"Lanchas, Motos de agua"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'yamaha marine');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands'), 'Brunswick', 'brunswick', 1, '{"originCountry":"Estados Unidos","type":"Lanchas, Motores marinos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'maritime-vehicle-brands') AND normalizedName = 'brunswick');
