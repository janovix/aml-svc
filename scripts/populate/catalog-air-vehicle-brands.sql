-- Seed script for air-vehicle-brands catalog
-- This script populates aircraft, helicopter, and drone manufacturers
-- Data source: Comprehensive manufacturer database with country of origin

-- =====================================================
-- CREATE CATALOG ENTRY (if not exists)
-- =====================================================
INSERT OR IGNORE INTO catalogs (id, key, name, active, allow_new_items, created_at, updated_at)
VALUES (
    lower(hex(randomblob(16))),
    'air-vehicle-brands',
    'Marcas de Vehículos Aéreos',
    1,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- =====================================================
-- COMMERCIAL AIRCRAFT MANUFACTURERS
-- =====================================================

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Boeing', 'boeing', 1, '{"originCountry":"Estados Unidos","type":"Aviones comerciales, Militares"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'boeing');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Airbus', 'airbus', 1, '{"originCountry":"Europa (Francia/Alemania/España/UK)","type":"Aviones comerciales"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'airbus');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Embraer', 'embraer', 1, '{"originCountry":"Brasil","type":"Aviones regionales, Ejecutivos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'embraer');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Bombardier Aerospace', 'bombardier aerospace', 1, '{"originCountry":"Canadá","type":"Jets ejecutivos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'bombardier aerospace');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'ATR', 'atr', 1, '{"originCountry":"Francia/Italia","type":"Aviones turbohélice regionales"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'atr');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'COMAC', 'comac', 1, '{"originCountry":"China","type":"Aviones comerciales"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'comac');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'United Aircraft Corporation (UAC)', 'united aircraft corporation (uac)', 1, '{"originCountry":"Rusia","type":"Aviones comerciales"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'united aircraft corporation (uac)');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Sukhoi', 'sukhoi', 1, '{"originCountry":"Rusia","type":"Aviones comerciales y militares"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'sukhoi');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Mitsubishi Aircraft', 'mitsubishi aircraft', 1, '{"originCountry":"Japón","type":"Aviones regionales"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'mitsubishi aircraft');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'De Havilland Canada', 'de havilland canada', 1, '{"originCountry":"Canadá","type":"Aviones regionales"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'de havilland canada');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Pilatus', 'pilatus', 1, '{"originCountry":"Suiza","type":"Aviones de entrenamiento"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'pilatus');

-- =====================================================
-- EXECUTIVE JET MANUFACTURERS
-- =====================================================

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Gulfstream', 'gulfstream', 1, '{"originCountry":"Estados Unidos","type":"Jets ejecutivos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'gulfstream');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Cessna', 'cessna', 1, '{"originCountry":"Estados Unidos","type":"Jets ejecutivos, Avionetas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'cessna');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Beechcraft', 'beechcraft', 1, '{"originCountry":"Estados Unidos","type":"Jets ejecutivos, Turbohélices"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'beechcraft');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Learjet', 'learjet', 1, '{"originCountry":"Canadá","type":"Jets ejecutivos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'learjet');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Challenger', 'challenger', 1, '{"originCountry":"Canadá","type":"Jets ejecutivos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'challenger');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Global', 'global', 1, '{"originCountry":"Canadá","type":"Jets ejecutivos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'global');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Dassault Aviation', 'dassault aviation', 1, '{"originCountry":"Francia","type":"Jets ejecutivos (Falcon)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'dassault aviation');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Embraer Executive Jets', 'embraer executive jets', 1, '{"originCountry":"Brasil","type":"Jets ejecutivos (Phenom, Legacy, Praetor)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'embraer executive jets');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Honda Aircraft', 'honda aircraft', 1, '{"originCountry":"Japón","type":"Jets ejecutivos (HondaJet)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'honda aircraft');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Cirrus Aircraft', 'cirrus aircraft', 1, '{"originCountry":"Estados Unidos","type":"Aviones ligeros (Vision Jet)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'cirrus aircraft');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Piper Aircraft', 'piper aircraft', 1, '{"originCountry":"Estados Unidos","type":"Avionetas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'piper aircraft');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Textron Aviation', 'textron aviation', 1, '{"originCountry":"Estados Unidos","type":"Jets ejecutivos, Avionetas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'textron aviation');

-- =====================================================
-- HELICOPTER MANUFACTURERS
-- =====================================================

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Airbus Helicopters', 'airbus helicopters', 1, '{"originCountry":"Europa","type":"Helicópteros civiles y militares"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'airbus helicopters');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Bell Helicopter', 'bell helicopter', 1, '{"originCountry":"Estados Unidos","type":"Helicópteros"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'bell helicopter');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Sikorsky', 'sikorsky', 1, '{"originCountry":"Estados Unidos","type":"Helicópteros (Lockheed Martin)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'sikorsky');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Leonardo Helicopters', 'leonardo helicopters', 1, '{"originCountry":"Italia","type":"Helicópteros (AgustaWestland)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'leonardo helicopters');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Robinson Helicopter', 'robinson helicopter', 1, '{"originCountry":"Estados Unidos","type":"Helicópteros ligeros"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'robinson helicopter');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'MD Helicopters', 'md helicopters', 1, '{"originCountry":"Estados Unidos","type":"Helicópteros"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'md helicopters');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Kamov', 'kamov', 1, '{"originCountry":"Rusia","type":"Helicópteros militares"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'kamov');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Mil', 'mil', 1, '{"originCountry":"Rusia","type":"Helicópteros (Mi-8, Mi-24, etc.)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'mil');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Enstrom', 'enstrom', 1, '{"originCountry":"Estados Unidos","type":"Helicópteros ligeros"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'enstrom');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Schweizer', 'schweizer', 1, '{"originCountry":"Estados Unidos","type":"Helicópteros ligeros"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'schweizer');

-- =====================================================
-- DRONE & UAV MANUFACTURERS
-- =====================================================

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'DJI', 'dji', 1, '{"originCountry":"China","type":"Drones comerciales"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'dji');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'General Atomics', 'general atomics', 1, '{"originCountry":"Estados Unidos","type":"Drones militares (Predator, Reaper)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'general atomics');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Northrop Grumman', 'northrop grumman', 1, '{"originCountry":"Estados Unidos","type":"Drones militares (Global Hawk)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'northrop grumman');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Israel Aerospace Industries', 'israel aerospace industries', 1, '{"originCountry":"Israel","type":"Drones militares"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'israel aerospace industries');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Elbit Systems', 'elbit systems', 1, '{"originCountry":"Israel","type":"Drones militares (Hermes)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'elbit systems');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Turkish Aerospace', 'turkish aerospace', 1, '{"originCountry":"Turquía","type":"Drones militares"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'turkish aerospace');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'CASC', 'casc', 1, '{"originCountry":"China","type":"Drones militares"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'casc');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Baykar', 'baykar', 1, '{"originCountry":"Turquía","type":"Drones militares (Bayraktar TB2)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'baykar');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Parrot', 'parrot', 1, '{"originCountry":"Francia","type":"Drones comerciales"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'parrot');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Skydio', 'skydio', 1, '{"originCountry":"Estados Unidos","type":"Drones autónomos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'skydio');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Autel Robotics', 'autel robotics', 1, '{"originCountry":"Estados Unidos/China","type":"Drones comerciales"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'autel robotics');

-- =====================================================
-- MILITARY & DEFENSE AIRCRAFT
-- =====================================================

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Lockheed Martin', 'lockheed martin', 1, '{"originCountry":"Estados Unidos","type":"Aviones militares (F-35, F-22, C-130)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'lockheed martin');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Raytheon', 'raytheon', 1, '{"originCountry":"Estados Unidos","type":"Sistemas de defensa aérea"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'raytheon');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'BAE Systems', 'bae systems', 1, '{"originCountry":"Reino Unido","type":"Aviones militares"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'bae systems');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Saab', 'saab', 1, '{"originCountry":"Suecia","type":"Aviones militares (Gripen)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'saab');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Chengdu Aircraft Corporation', 'chengdu aircraft corporation', 1, '{"originCountry":"China","type":"Aviones militares (J-20)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'chengdu aircraft corporation');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Shenyang Aircraft Corporation', 'shenyang aircraft corporation', 1, '{"originCountry":"China","type":"Aviones militares"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'shenyang aircraft corporation');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Mikoyan', 'mikoyan', 1, '{"originCountry":"Rusia","type":"Aviones militares (MiG)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'mikoyan');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Hindustan Aeronautics Limited', 'hindustan aeronautics limited', 1, '{"originCountry":"India","type":"Aviones militares (HAL Tejas)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'hindustan aeronautics limited');

-- =====================================================
-- LIGHT AIRCRAFT & ULTRALIGHTS
-- =====================================================

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Diamond Aircraft', 'diamond aircraft', 1, '{"originCountry":"Austria","type":"Aviones ligeros"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'diamond aircraft');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Daher', 'daher', 1, '{"originCountry":"Francia","type":"Aviones turbohélice (TBM)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'daher');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Mooney', 'mooney', 1, '{"originCountry":"Estados Unidos","type":"Avionetas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'mooney');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Epic Aircraft', 'epic aircraft', 1, '{"originCountry":"Estados Unidos","type":"Aviones turbohélice"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'epic aircraft');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Tecnam', 'tecnam', 1, '{"originCountry":"Italia","type":"Aviones ligeros"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'tecnam');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Pipistrel', 'pipistrel', 1, '{"originCountry":"Eslovenia","type":"Aviones ultraligeros, Eléctricos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'pipistrel');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Robin Aircraft', 'robin aircraft', 1, '{"originCountry":"Francia","type":"Aviones ligeros"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'robin aircraft');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Vulcanair', 'vulcanair', 1, '{"originCountry":"Italia","type":"Aviones ligeros"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'vulcanair');

-- =====================================================
-- EVTOL & ADVANCED AIR MOBILITY
-- =====================================================

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Joby Aviation', 'joby aviation', 1, '{"originCountry":"Estados Unidos","type":"eVTOL (taxi aéreo eléctrico)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'joby aviation');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Archer Aviation', 'archer aviation', 1, '{"originCountry":"Estados Unidos","type":"eVTOL (taxi aéreo eléctrico)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'archer aviation');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Lilium', 'lilium', 1, '{"originCountry":"Alemania","type":"eVTOL (jets eléctricos)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'lilium');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Volocopter', 'volocopter', 1, '{"originCountry":"Alemania","type":"eVTOL (multicóptero eléctrico)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'volocopter');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Wisk Aero', 'wisk aero', 1, '{"originCountry":"Estados Unidos","type":"eVTOL autónomo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'wisk aero');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'EHang', 'ehang', 1, '{"originCountry":"China","type":"eVTOL autónomo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'ehang');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Beta Technologies', 'beta technologies', 1, '{"originCountry":"Estados Unidos","type":"Aviones eléctricos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'beta technologies');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Vertical Aerospace', 'vertical aerospace', 1, '{"originCountry":"Reino Unido","type":"eVTOL"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalized_name = 'vertical aerospace');
