-- Seed script for air-vehicle-brands catalog
-- This script populates aircraft, helicopter, and drone manufacturers
-- Data source: Comprehensive manufacturer database with country of origin

-- =====================================================
-- COMMERCIAL AIRCRAFT MANUFACTURERS
-- =====================================================

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Boeing', 'boeing', 1, '{"originCountry":"Estados Unidos","type":"Aviones comerciales, Militares"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'boeing');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Airbus', 'airbus', 1, '{"originCountry":"Europa (Francia/Alemania/España/UK)","type":"Aviones comerciales"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'airbus');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Embraer', 'embraer', 1, '{"originCountry":"Brasil","type":"Aviones regionales, Ejecutivos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'embraer');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Bombardier Aerospace', 'bombardier aerospace', 1, '{"originCountry":"Canadá","type":"Jets ejecutivos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'bombardier aerospace');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'ATR', 'atr', 1, '{"originCountry":"Francia/Italia","type":"Aviones turbohélice regionales"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'atr');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'COMAC', 'comac', 1, '{"originCountry":"China","type":"Aviones comerciales"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'comac');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'United Aircraft Corporation (UAC)', 'united aircraft corporation (uac)', 1, '{"originCountry":"Rusia","type":"Aviones comerciales"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'united aircraft corporation (uac)');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Sukhoi', 'sukhoi', 1, '{"originCountry":"Rusia","type":"Aviones comerciales y militares"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'sukhoi');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Mitsubishi Aircraft', 'mitsubishi aircraft', 1, '{"originCountry":"Japón","type":"Aviones regionales"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'mitsubishi aircraft');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'De Havilland Canada', 'de havilland canada', 1, '{"originCountry":"Canadá","type":"Aviones regionales"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'de havilland canada');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Pilatus', 'pilatus', 1, '{"originCountry":"Suiza","type":"Aviones de entrenamiento"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'pilatus');

-- =====================================================
-- EXECUTIVE JET MANUFACTURERS
-- =====================================================

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Gulfstream', 'gulfstream', 1, '{"originCountry":"Estados Unidos","type":"Jets ejecutivos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'gulfstream');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Cessna', 'cessna', 1, '{"originCountry":"Estados Unidos","type":"Jets ejecutivos, Avionetas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'cessna');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Beechcraft', 'beechcraft', 1, '{"originCountry":"Estados Unidos","type":"Jets ejecutivos, Turbohélices"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'beechcraft');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Learjet', 'learjet', 1, '{"originCountry":"Canadá","type":"Jets ejecutivos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'learjet');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Challenger', 'challenger', 1, '{"originCountry":"Canadá","type":"Jets ejecutivos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'challenger');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Global', 'global', 1, '{"originCountry":"Canadá","type":"Jets ejecutivos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'global');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Dassault Aviation', 'dassault aviation', 1, '{"originCountry":"Francia","type":"Jets ejecutivos (Falcon)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'dassault aviation');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Embraer Executive Jets', 'embraer executive jets', 1, '{"originCountry":"Brasil","type":"Jets ejecutivos (Phenom, Legacy, Praetor)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'embraer executive jets');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Honda Aircraft', 'honda aircraft', 1, '{"originCountry":"Japón","type":"Jets ejecutivos (HondaJet)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'honda aircraft');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Cirrus Aircraft', 'cirrus aircraft', 1, '{"originCountry":"Estados Unidos","type":"Aviones ligeros (Vision Jet)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'cirrus aircraft');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Piper Aircraft', 'piper aircraft', 1, '{"originCountry":"Estados Unidos","type":"Avionetas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'piper aircraft');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Textron Aviation', 'textron aviation', 1, '{"originCountry":"Estados Unidos","type":"Jets ejecutivos, Avionetas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'textron aviation');

-- =====================================================
-- HELICOPTER MANUFACTURERS
-- =====================================================

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Airbus Helicopters', 'airbus helicopters', 1, '{"originCountry":"Europa","type":"Helicópteros civiles y militares"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'airbus helicopters');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Bell Helicopter', 'bell helicopter', 1, '{"originCountry":"Estados Unidos","type":"Helicópteros"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'bell helicopter');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Sikorsky', 'sikorsky', 1, '{"originCountry":"Estados Unidos","type":"Helicópteros (Lockheed Martin)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'sikorsky');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Leonardo Helicopters', 'leonardo helicopters', 1, '{"originCountry":"Italia","type":"Helicópteros (AgustaWestland)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'leonardo helicopters');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Robinson Helicopter', 'robinson helicopter', 1, '{"originCountry":"Estados Unidos","type":"Helicópteros ligeros"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'robinson helicopter');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'MD Helicopters', 'md helicopters', 1, '{"originCountry":"Estados Unidos","type":"Helicópteros"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'md helicopters');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Kamov', 'kamov', 1, '{"originCountry":"Rusia","type":"Helicópteros militares"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'kamov');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Mil', 'mil', 1, '{"originCountry":"Rusia","type":"Helicópteros (Mi-8, Mi-24, etc.)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'mil');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Enstrom', 'enstrom', 1, '{"originCountry":"Estados Unidos","type":"Helicópteros ligeros"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'enstrom');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Schweizer', 'schweizer', 1, '{"originCountry":"Estados Unidos","type":"Helicópteros ligeros"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'schweizer');

-- =====================================================
-- DRONE & UAV MANUFACTURERS
-- =====================================================

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'DJI', 'dji', 1, '{"originCountry":"China","type":"Drones comerciales"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'dji');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'General Atomics', 'general atomics', 1, '{"originCountry":"Estados Unidos","type":"Drones militares (Predator, Reaper)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'general atomics');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Northrop Grumman', 'northrop grumman', 1, '{"originCountry":"Estados Unidos","type":"Drones militares (Global Hawk)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'northrop grumman');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Israel Aerospace Industries', 'israel aerospace industries', 1, '{"originCountry":"Israel","type":"Drones militares"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'israel aerospace industries');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Elbit Systems', 'elbit systems', 1, '{"originCountry":"Israel","type":"Drones militares (Hermes)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'elbit systems');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Turkish Aerospace', 'turkish aerospace', 1, '{"originCountry":"Turquía","type":"Drones militares"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'turkish aerospace');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'CASC', 'casc', 1, '{"originCountry":"China","type":"Drones militares"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'casc');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Baykar', 'baykar', 1, '{"originCountry":"Turquía","type":"Drones militares (Bayraktar TB2)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'baykar');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Parrot', 'parrot', 1, '{"originCountry":"Francia","type":"Drones comerciales"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'parrot');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Skydio', 'skydio', 1, '{"originCountry":"Estados Unidos","type":"Drones autónomos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'skydio');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Autel Robotics', 'autel robotics', 1, '{"originCountry":"Estados Unidos/China","type":"Drones comerciales"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'autel robotics');

-- =====================================================
-- MILITARY & DEFENSE AIRCRAFT
-- =====================================================

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Lockheed Martin', 'lockheed martin', 1, '{"originCountry":"Estados Unidos","type":"Aviones militares (F-35, F-22, C-130)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'lockheed martin');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Raytheon', 'raytheon', 1, '{"originCountry":"Estados Unidos","type":"Sistemas de defensa aérea"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'raytheon');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'BAE Systems', 'bae systems', 1, '{"originCountry":"Reino Unido","type":"Aviones militares"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'bae systems');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Saab', 'saab', 1, '{"originCountry":"Suecia","type":"Aviones militares (Gripen)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'saab');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Chengdu Aircraft Corporation', 'chengdu aircraft corporation', 1, '{"originCountry":"China","type":"Aviones militares (J-20)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'chengdu aircraft corporation');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Shenyang Aircraft Corporation', 'shenyang aircraft corporation', 1, '{"originCountry":"China","type":"Aviones militares"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'shenyang aircraft corporation');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Mikoyan', 'mikoyan', 1, '{"originCountry":"Rusia","type":"Aviones militares (MiG)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'mikoyan');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Hindustan Aeronautics Limited', 'hindustan aeronautics limited', 1, '{"originCountry":"India","type":"Aviones militares (HAL Tejas)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'hindustan aeronautics limited');

-- =====================================================
-- LIGHT AIRCRAFT & ULTRALIGHTS
-- =====================================================

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Diamond Aircraft', 'diamond aircraft', 1, '{"originCountry":"Austria","type":"Aviones ligeros"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'diamond aircraft');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Daher', 'daher', 1, '{"originCountry":"Francia","type":"Aviones turbohélice (TBM)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'daher');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Mooney', 'mooney', 1, '{"originCountry":"Estados Unidos","type":"Avionetas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'mooney');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Epic Aircraft', 'epic aircraft', 1, '{"originCountry":"Estados Unidos","type":"Aviones turbohélice"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'epic aircraft');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Tecnam', 'tecnam', 1, '{"originCountry":"Italia","type":"Aviones ligeros"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'tecnam');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Pipistrel', 'pipistrel', 1, '{"originCountry":"Eslovenia","type":"Aviones ultraligeros, Eléctricos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'pipistrel');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Robin Aircraft', 'robin aircraft', 1, '{"originCountry":"Francia","type":"Aviones ligeros"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'robin aircraft');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Vulcanair', 'vulcanair', 1, '{"originCountry":"Italia","type":"Aviones ligeros"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'vulcanair');

-- =====================================================
-- EVTOL & ADVANCED AIR MOBILITY
-- =====================================================

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Joby Aviation', 'joby aviation', 1, '{"originCountry":"Estados Unidos","type":"eVTOL (taxi aéreo eléctrico)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'joby aviation');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Archer Aviation', 'archer aviation', 1, '{"originCountry":"Estados Unidos","type":"eVTOL (taxi aéreo eléctrico)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'archer aviation');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Lilium', 'lilium', 1, '{"originCountry":"Alemania","type":"eVTOL (jets eléctricos)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'lilium');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Volocopter', 'volocopter', 1, '{"originCountry":"Alemania","type":"eVTOL (multicóptero eléctrico)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'volocopter');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Wisk Aero', 'wisk aero', 1, '{"originCountry":"Estados Unidos","type":"eVTOL autónomo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'wisk aero');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'EHang', 'ehang', 1, '{"originCountry":"China","type":"eVTOL autónomo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'ehang');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Beta Technologies', 'beta technologies', 1, '{"originCountry":"Estados Unidos","type":"Aviones eléctricos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'beta technologies');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands'), 'Vertical Aerospace', 'vertical aerospace', 1, '{"originCountry":"Reino Unido","type":"eVTOL"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'air-vehicle-brands') AND normalizedName = 'vertical aerospace');
