-- Seed script for terrestrial-vehicle-brands catalog
-- This script populates common car, truck, motorcycle, and heavy machinery brands
-- Data source: Comprehensive manufacturer database with country of origin

-- =====================================================
-- CREATE CATALOG ENTRY (if not exists)
-- =====================================================
INSERT OR IGNORE INTO catalogs (id, key, name, active, allowNewItems, createdAt, updatedAt)
VALUES (
    lower(hex(randomblob(16))),
    'terrestrial-vehicle-brands',
    'Marcas de Vehículos Terrestres',
    1,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- =====================================================
-- AUTOMOBILES
-- =====================================================

-- Japanese Brands
INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Toyota', 'toyota', 1, '{"originCountry":"Japón","type":"Automóviles, SUVs, Híbridos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'toyota');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Honda', 'honda', 1, '{"originCountry":"Japón","type":"Automóviles, SUVs, Motocicletas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'honda');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Nissan', 'nissan', 1, '{"originCountry":"Japón","type":"Automóviles, SUVs"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'nissan');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Mazda', 'mazda', 1, '{"originCountry":"Japón","type":"Automóviles"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'mazda');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Subaru', 'subaru', 1, '{"originCountry":"Japón","type":"Automóviles, SUVs"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'subaru');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Mitsubishi', 'mitsubishi', 1, '{"originCountry":"Japón","type":"Automóviles, SUVs"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'mitsubishi');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Suzuki', 'suzuki', 1, '{"originCountry":"Japón","type":"Automóviles compactos, Motocicletas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'suzuki');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Lexus', 'lexus', 1, '{"originCountry":"Japón","type":"Automóviles de lujo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'lexus');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Acura', 'acura', 1, '{"originCountry":"Japón","type":"Automóviles de lujo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'acura');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Infiniti', 'infiniti', 1, '{"originCountry":"Japón","type":"Automóviles de lujo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'infiniti');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Daihatsu', 'daihatsu', 1, '{"originCountry":"Japón","type":"Automóviles compactos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'daihatsu');

-- German Brands
INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Volkswagen', 'volkswagen', 1, '{"originCountry":"Alemania","type":"Automóviles, SUVs"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'volkswagen');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Mercedes-Benz', 'mercedes-benz', 1, '{"originCountry":"Alemania","type":"Automóviles de lujo, SUVs, Camiones"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'mercedes-benz');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'BMW', 'bmw', 1, '{"originCountry":"Alemania","type":"Automóviles de lujo, SUVs, Motocicletas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'bmw');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Audi', 'audi', 1, '{"originCountry":"Alemania","type":"Automóviles de lujo, SUVs"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'audi');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Porsche', 'porsche', 1, '{"originCountry":"Alemania","type":"Automóviles deportivos de lujo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'porsche');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Opel', 'opel', 1, '{"originCountry":"Alemania","type":"Automóviles"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'opel');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'MAN', 'man', 1, '{"originCountry":"Alemania","type":"Camiones pesados"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'man');

-- Korean Brands
INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Hyundai', 'hyundai', 1, '{"originCountry":"Corea del Sur","type":"Automóviles, SUVs"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'hyundai');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Kia', 'kia', 1, '{"originCountry":"Corea del Sur","type":"Automóviles, SUVs"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'kia');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Genesis', 'genesis', 1, '{"originCountry":"Corea del Sur","type":"Automóviles de lujo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'genesis');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Daewoo', 'daewoo', 1, '{"originCountry":"Corea del Sur","type":"Automóviles (histórica)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'daewoo');

-- American Brands
INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Ford', 'ford', 1, '{"originCountry":"Estados Unidos","type":"Automóviles, Pickups, SUVs"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'ford');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'General Motors', 'general motors', 1, '{"originCountry":"Estados Unidos","type":"Automóviles, Pickups, SUVs"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'general motors');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Chevrolet', 'chevrolet', 1, '{"originCountry":"Estados Unidos","type":"Automóviles, Pickups, SUVs"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'chevrolet');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Tesla', 'tesla', 1, '{"originCountry":"Estados Unidos","type":"Automóviles eléctricos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'tesla');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Jeep', 'jeep', 1, '{"originCountry":"Estados Unidos","type":"SUVs, Todoterreno"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'jeep');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Ram', 'ram', 1, '{"originCountry":"Estados Unidos","type":"Pickups"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'ram');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Dodge', 'dodge', 1, '{"originCountry":"Estados Unidos","type":"Automóviles, Pickups"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'dodge');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Chrysler', 'chrysler', 1, '{"originCountry":"Estados Unidos","type":"Automóviles"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'chrysler');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Cadillac', 'cadillac', 1, '{"originCountry":"Estados Unidos","type":"Automóviles de lujo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'cadillac');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Lincoln', 'lincoln', 1, '{"originCountry":"Estados Unidos","type":"Automóviles de lujo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'lincoln');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Buick', 'buick', 1, '{"originCountry":"Estados Unidos","type":"Automóviles"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'buick');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'GMC', 'gmc', 1, '{"originCountry":"Estados Unidos","type":"SUVs, Pickups"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'gmc');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Rivian', 'rivian', 1, '{"originCountry":"Estados Unidos","type":"Pickups y SUVs eléctricos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'rivian');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Lucid Motors', 'lucid motors', 1, '{"originCountry":"Estados Unidos","type":"Automóviles eléctricos de lujo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'lucid motors');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Fisker', 'fisker', 1, '{"originCountry":"Estados Unidos","type":"Automóviles eléctricos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'fisker');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Hummer', 'hummer', 1, '{"originCountry":"Estados Unidos","type":"SUVs eléctricos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'hummer');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Harley-Davidson', 'harley-davidson', 1, '{"originCountry":"Estados Unidos","type":"Motocicletas cruiser"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'harley-davidson');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Indian Motorcycle', 'indian motorcycle', 1, '{"originCountry":"Estados Unidos","type":"Motocicletas cruiser"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'indian motorcycle');

-- Italian Brands
INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Fiat', 'fiat', 1, '{"originCountry":"Italia","type":"Automóviles"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'fiat');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Alfa Romeo', 'alfa romeo', 1, '{"originCountry":"Italia","type":"Automóviles deportivos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'alfa romeo');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Maserati', 'maserati', 1, '{"originCountry":"Italia","type":"Automóviles de lujo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'maserati');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Ferrari', 'ferrari', 1, '{"originCountry":"Italia","type":"Superdeportivos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'ferrari');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Lamborghini', 'lamborghini', 1, '{"originCountry":"Italia","type":"Superdeportivos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'lamborghini');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Pagani', 'pagani', 1, '{"originCountry":"Italia","type":"Hiperdeportivos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'pagani');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Lancia', 'lancia', 1, '{"originCountry":"Italia","type":"Automóviles"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'lancia');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Abarth', 'abarth', 1, '{"originCountry":"Italia","type":"Automóviles deportivos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'abarth');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Ducati', 'ducati', 1, '{"originCountry":"Italia","type":"Motocicletas deportivas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'ducati');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Aprilia', 'aprilia', 1, '{"originCountry":"Italia","type":"Motocicletas deportivas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'aprilia');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Piaggio', 'piaggio', 1, '{"originCountry":"Italia","type":"Scooters, Motocicletas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'piaggio');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Vespa', 'vespa', 1, '{"originCountry":"Italia","type":"Scooters"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'vespa');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Moto Guzzi', 'moto guzzi', 1, '{"originCountry":"Italia","type":"Motocicletas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'moto guzzi');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Iveco', 'iveco', 1, '{"originCountry":"Italia","type":"Camiones, Vehículos comerciales"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'iveco');

-- French Brands
INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Peugeot', 'peugeot', 1, '{"originCountry":"Francia","type":"Automóviles"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'peugeot');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Citroën', 'citroen', 1, '{"originCountry":"Francia","type":"Automóviles"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'citroen');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Renault', 'renault', 1, '{"originCountry":"Francia","type":"Automóviles"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'renault');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'DS Automobiles', 'ds automobiles', 1, '{"originCountry":"Francia","type":"Automóviles premium"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'ds automobiles');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Bugatti', 'bugatti', 1, '{"originCountry":"Francia","type":"Hiperdeportivos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'bugatti');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Renault Trucks', 'renault trucks', 1, '{"originCountry":"Francia","type":"Camiones"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'renault trucks');

-- UK Brands
INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Jaguar', 'jaguar', 1, '{"originCountry":"Reino Unido","type":"Automóviles de lujo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'jaguar');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Land Rover', 'land rover', 1, '{"originCountry":"Reino Unido","type":"SUVs de lujo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'land rover');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Bentley', 'bentley', 1, '{"originCountry":"Reino Unido","type":"Automóviles de lujo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'bentley');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Rolls-Royce', 'rolls-royce', 1, '{"originCountry":"Reino Unido","type":"Automóviles de ultra lujo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'rolls-royce');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Aston Martin', 'aston martin', 1, '{"originCountry":"Reino Unido","type":"Automóviles deportivos de lujo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'aston martin');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'McLaren', 'mclaren', 1, '{"originCountry":"Reino Unido","type":"Superdeportivos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'mclaren');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Lotus', 'lotus', 1, '{"originCountry":"Reino Unido","type":"Automóviles deportivos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'lotus');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Mini', 'mini', 1, '{"originCountry":"Reino Unido","type":"Automóviles compactos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'mini');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Triumph', 'triumph', 1, '{"originCountry":"Reino Unido","type":"Motocicletas clásicas/modernas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'triumph');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Norton', 'norton', 1, '{"originCountry":"Reino Unido","type":"Motocicletas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'norton');

-- Swedish Brands
INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Volvo Cars', 'volvo cars', 1, '{"originCountry":"Suecia","type":"Automóviles, SUVs"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'volvo cars');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Volvo Trucks', 'volvo trucks', 1, '{"originCountry":"Suecia","type":"Camiones pesados"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'volvo trucks');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Scania', 'scania', 1, '{"originCountry":"Suecia","type":"Camiones pesados"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'scania');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Polestar', 'polestar', 1, '{"originCountry":"Suecia","type":"Automóviles eléctricos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'polestar');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Koenigsegg', 'koenigsegg', 1, '{"originCountry":"Suecia","type":"Hiperdeportivos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'koenigsegg');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Husqvarna', 'husqvarna', 1, '{"originCountry":"Suecia","type":"Motocicletas off-road"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'husqvarna');

-- Chinese Brands
INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'BYD', 'byd', 1, '{"originCountry":"China","type":"Automóviles eléctricos e híbridos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'byd');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Geely', 'geely', 1, '{"originCountry":"China","type":"Automóviles"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'geely');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'NIO', 'nio', 1, '{"originCountry":"China","type":"Automóviles eléctricos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'nio');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Xpeng', 'xpeng', 1, '{"originCountry":"China","type":"Automóviles eléctricos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'xpeng');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Li Auto', 'li auto', 1, '{"originCountry":"China","type":"Automóviles eléctricos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'li auto');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Great Wall Motors', 'great wall motors', 1, '{"originCountry":"China","type":"Automóviles, SUVs"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'great wall motors');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Chery', 'chery', 1, '{"originCountry":"China","type":"Automóviles"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'chery');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'SAIC Motor', 'saic motor', 1, '{"originCountry":"China","type":"Automóviles"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'saic motor');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Dongfeng Motor', 'dongfeng motor', 1, '{"originCountry":"China","type":"Automóviles, Camiones"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'dongfeng motor');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'FAW', 'faw', 1, '{"originCountry":"China","type":"Automóviles, Camiones"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'faw');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Foton', 'foton', 1, '{"originCountry":"China","type":"Camiones"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'foton');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Sinotruk', 'sinotruk', 1, '{"originCountry":"China","type":"Camiones pesados"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'sinotruk');

-- Indian Brands
INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Tata Motors', 'tata motors', 1, '{"originCountry":"India","type":"Automóviles, Camiones"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'tata motors');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Mahindra', 'mahindra', 1, '{"originCountry":"India","type":"SUVs, Tractores agrícolas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'mahindra');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Maruti Suzuki', 'maruti suzuki', 1, '{"originCountry":"India","type":"Automóviles"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'maruti suzuki');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Hero MotoCorp', 'hero motocorp', 1, '{"originCountry":"India","type":"Motocicletas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'hero motocorp');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Bajaj Auto', 'bajaj auto', 1, '{"originCountry":"India","type":"Motocicletas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'bajaj auto');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Royal Enfield', 'royal enfield', 1, '{"originCountry":"India","type":"Motocicletas clásicas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'royal enfield');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'TVS Motor', 'tvs motor', 1, '{"originCountry":"India","type":"Motocicletas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'tvs motor');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Ashok Leyland', 'ashok leyland', 1, '{"originCountry":"India","type":"Camiones"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'ashok leyland');

-- Other European Brands
INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'SEAT', 'seat', 1, '{"originCountry":"España","type":"Automóviles"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'seat');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Skoda', 'skoda', 1, '{"originCountry":"República Checa","type":"Automóviles"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'skoda');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Dacia', 'dacia', 1, '{"originCountry":"Rumania","type":"Automóviles económicos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'dacia');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'DAF', 'daf', 1, '{"originCountry":"Países Bajos","type":"Camiones pesados"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'daf');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'KTM', 'ktm', 1, '{"originCountry":"Austria","type":"Motocicletas deportivas/off-road"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'ktm');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Rimac', 'rimac', 1, '{"originCountry":"Croacia","type":"Hiperdeportivos eléctricos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'rimac');

-- Other Asian Brands
INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'VinFast', 'vinfast', 1, '{"originCountry":"Vietnam","type":"Automóviles eléctricos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'vinfast');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Proton', 'proton', 1, '{"originCountry":"Malasia","type":"Automóviles"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'proton');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Kymco', 'kymco', 1, '{"originCountry":"Taiwán","type":"Scooters, Motocicletas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'kymco');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'SYM', 'sym', 1, '{"originCountry":"Taiwán","type":"Scooters, Motocicletas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'sym');

-- Japanese Motorcycles
INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Yamaha', 'yamaha', 1, '{"originCountry":"Japón","type":"Motocicletas de todos los tipos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'yamaha');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Kawasaki', 'kawasaki', 1, '{"originCountry":"Japón","type":"Motocicletas deportivas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'kawasaki');

-- American Trucks
INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Freightliner', 'freightliner', 1, '{"originCountry":"Estados Unidos","type":"Camiones pesados"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'freightliner');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Kenworth', 'kenworth', 1, '{"originCountry":"Estados Unidos","type":"Camiones pesados"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'kenworth');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Peterbilt', 'peterbilt', 1, '{"originCountry":"Estados Unidos","type":"Camiones pesados"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'peterbilt');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'International', 'international', 1, '{"originCountry":"Estados Unidos","type":"Camiones"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'international');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Mack Trucks', 'mack trucks', 1, '{"originCountry":"Estados Unidos","type":"Camiones pesados"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'mack trucks');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Western Star', 'western star', 1, '{"originCountry":"Estados Unidos","type":"Camiones pesados"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'western star');

-- Japanese Trucks
INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Hino', 'hino', 1, '{"originCountry":"Japón","type":"Camiones"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'hino');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Isuzu', 'isuzu', 1, '{"originCountry":"Japón","type":"Camiones comerciales"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'isuzu');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Mitsubishi Fuso', 'mitsubishi fuso', 1, '{"originCountry":"Japón","type":"Camiones"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'mitsubishi fuso');

-- Agricultural Equipment
INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'John Deere', 'john deere', 1, '{"originCountry":"Estados Unidos","type":"Tractores agrícolas, Maquinaria pesada"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'john deere');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Caterpillar', 'caterpillar', 1, '{"originCountry":"Estados Unidos","type":"Maquinaria pesada"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'caterpillar');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Case IH', 'case ih', 1, '{"originCountry":"Estados Unidos","type":"Tractores agrícolas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'case ih');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'New Holland', 'new holland', 1, '{"originCountry":"Estados Unidos","type":"Tractores agrícolas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'new holland');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Massey Ferguson', 'massey ferguson', 1, '{"originCountry":"Reino Unido/Estados Unidos","type":"Tractores agrícolas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'massey ferguson');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Kubota', 'kubota', 1, '{"originCountry":"Japón","type":"Tractores compactos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'kubota');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Fendt', 'fendt', 1, '{"originCountry":"Alemania","type":"Tractores agrícolas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'fendt');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Claas', 'claas', 1, '{"originCountry":"Alemania","type":"Tractores, Maquinaria agrícola"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'claas');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'JCB', 'jcb', 1, '{"originCountry":"Reino Unido","type":"Maquinaria de construcción"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'jcb');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Komatsu', 'komatsu', 1, '{"originCountry":"Japón","type":"Maquinaria pesada"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'komatsu');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Bobcat', 'bobcat', 1, '{"originCountry":"Estados Unidos","type":"Maquinaria compacta"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'bobcat');

-- Mexican Brands
INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Italika', 'italika', 1, '{"originCountry":"México","type":"Motocicletas económicas, Vehículos de movilidad"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'italika');

INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Mastretta', 'mastretta', 1, '{"originCountry":"México","type":"Automóviles deportivos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalizedName = 'mastretta');
