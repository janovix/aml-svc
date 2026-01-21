-- Seed script for terrestrial-vehicle-brands catalog
-- This script populates common car, truck, motorcycle, and heavy machinery brands
-- Data source: Comprehensive manufacturer database with country of origin

-- =====================================================
-- CREATE CATALOG ENTRY (if not exists)
-- =====================================================
INSERT OR IGNORE INTO catalogs (id, key, name, active, allow_new_items, created_at, updated_at)
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
INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Toyota', 'toyota', 1, '{"originCountry":"Japón","type":"Automóviles, SUVs, Híbridos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'toyota');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Honda', 'honda', 1, '{"originCountry":"Japón","type":"Automóviles, SUVs, Motocicletas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'honda');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Nissan', 'nissan', 1, '{"originCountry":"Japón","type":"Automóviles, SUVs"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'nissan');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Mazda', 'mazda', 1, '{"originCountry":"Japón","type":"Automóviles"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'mazda');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Subaru', 'subaru', 1, '{"originCountry":"Japón","type":"Automóviles, SUVs"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'subaru');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Mitsubishi', 'mitsubishi', 1, '{"originCountry":"Japón","type":"Automóviles, SUVs"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'mitsubishi');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Suzuki', 'suzuki', 1, '{"originCountry":"Japón","type":"Automóviles compactos, Motocicletas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'suzuki');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Lexus', 'lexus', 1, '{"originCountry":"Japón","type":"Automóviles de lujo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'lexus');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Acura', 'acura', 1, '{"originCountry":"Japón","type":"Automóviles de lujo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'acura');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Infiniti', 'infiniti', 1, '{"originCountry":"Japón","type":"Automóviles de lujo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'infiniti');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Daihatsu', 'daihatsu', 1, '{"originCountry":"Japón","type":"Automóviles compactos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'daihatsu');

-- German Brands
INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Volkswagen', 'volkswagen', 1, '{"originCountry":"Alemania","type":"Automóviles, SUVs"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'volkswagen');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Mercedes-Benz', 'mercedes-benz', 1, '{"originCountry":"Alemania","type":"Automóviles de lujo, SUVs, Camiones"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'mercedes-benz');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'BMW', 'bmw', 1, '{"originCountry":"Alemania","type":"Automóviles de lujo, SUVs, Motocicletas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'bmw');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Audi', 'audi', 1, '{"originCountry":"Alemania","type":"Automóviles de lujo, SUVs"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'audi');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Porsche', 'porsche', 1, '{"originCountry":"Alemania","type":"Automóviles deportivos de lujo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'porsche');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Opel', 'opel', 1, '{"originCountry":"Alemania","type":"Automóviles"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'opel');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'MAN', 'man', 1, '{"originCountry":"Alemania","type":"Camiones pesados"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'man');

-- Korean Brands
INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Hyundai', 'hyundai', 1, '{"originCountry":"Corea del Sur","type":"Automóviles, SUVs"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'hyundai');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Kia', 'kia', 1, '{"originCountry":"Corea del Sur","type":"Automóviles, SUVs"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'kia');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Genesis', 'genesis', 1, '{"originCountry":"Corea del Sur","type":"Automóviles de lujo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'genesis');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Daewoo', 'daewoo', 1, '{"originCountry":"Corea del Sur","type":"Automóviles (histórica)"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'daewoo');

-- American Brands
INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Ford', 'ford', 1, '{"originCountry":"Estados Unidos","type":"Automóviles, Pickups, SUVs"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'ford');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'General Motors', 'general motors', 1, '{"originCountry":"Estados Unidos","type":"Automóviles, Pickups, SUVs"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'general motors');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Chevrolet', 'chevrolet', 1, '{"originCountry":"Estados Unidos","type":"Automóviles, Pickups, SUVs"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'chevrolet');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Tesla', 'tesla', 1, '{"originCountry":"Estados Unidos","type":"Automóviles eléctricos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'tesla');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Jeep', 'jeep', 1, '{"originCountry":"Estados Unidos","type":"SUVs, Todoterreno"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'jeep');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Ram', 'ram', 1, '{"originCountry":"Estados Unidos","type":"Pickups"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'ram');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Dodge', 'dodge', 1, '{"originCountry":"Estados Unidos","type":"Automóviles, Pickups"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'dodge');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Chrysler', 'chrysler', 1, '{"originCountry":"Estados Unidos","type":"Automóviles"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'chrysler');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Cadillac', 'cadillac', 1, '{"originCountry":"Estados Unidos","type":"Automóviles de lujo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'cadillac');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Lincoln', 'lincoln', 1, '{"originCountry":"Estados Unidos","type":"Automóviles de lujo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'lincoln');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Buick', 'buick', 1, '{"originCountry":"Estados Unidos","type":"Automóviles"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'buick');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'GMC', 'gmc', 1, '{"originCountry":"Estados Unidos","type":"SUVs, Pickups"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'gmc');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Rivian', 'rivian', 1, '{"originCountry":"Estados Unidos","type":"Pickups y SUVs eléctricos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'rivian');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Lucid Motors', 'lucid motors', 1, '{"originCountry":"Estados Unidos","type":"Automóviles eléctricos de lujo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'lucid motors');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Fisker', 'fisker', 1, '{"originCountry":"Estados Unidos","type":"Automóviles eléctricos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'fisker');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Hummer', 'hummer', 1, '{"originCountry":"Estados Unidos","type":"SUVs eléctricos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'hummer');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Harley-Davidson', 'harley-davidson', 1, '{"originCountry":"Estados Unidos","type":"Motocicletas cruiser"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'harley-davidson');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Indian Motorcycle', 'indian motorcycle', 1, '{"originCountry":"Estados Unidos","type":"Motocicletas cruiser"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'indian motorcycle');

-- Italian Brands
INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Fiat', 'fiat', 1, '{"originCountry":"Italia","type":"Automóviles"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'fiat');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Alfa Romeo', 'alfa romeo', 1, '{"originCountry":"Italia","type":"Automóviles deportivos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'alfa romeo');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Maserati', 'maserati', 1, '{"originCountry":"Italia","type":"Automóviles de lujo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'maserati');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Ferrari', 'ferrari', 1, '{"originCountry":"Italia","type":"Superdeportivos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'ferrari');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Lamborghini', 'lamborghini', 1, '{"originCountry":"Italia","type":"Superdeportivos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'lamborghini');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Pagani', 'pagani', 1, '{"originCountry":"Italia","type":"Hiperdeportivos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'pagani');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Lancia', 'lancia', 1, '{"originCountry":"Italia","type":"Automóviles"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'lancia');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Abarth', 'abarth', 1, '{"originCountry":"Italia","type":"Automóviles deportivos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'abarth');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Ducati', 'ducati', 1, '{"originCountry":"Italia","type":"Motocicletas deportivas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'ducati');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Aprilia', 'aprilia', 1, '{"originCountry":"Italia","type":"Motocicletas deportivas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'aprilia');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Piaggio', 'piaggio', 1, '{"originCountry":"Italia","type":"Scooters, Motocicletas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'piaggio');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Vespa', 'vespa', 1, '{"originCountry":"Italia","type":"Scooters"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'vespa');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Moto Guzzi', 'moto guzzi', 1, '{"originCountry":"Italia","type":"Motocicletas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'moto guzzi');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Iveco', 'iveco', 1, '{"originCountry":"Italia","type":"Camiones, Vehículos comerciales"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'iveco');

-- French Brands
INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Peugeot', 'peugeot', 1, '{"originCountry":"Francia","type":"Automóviles"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'peugeot');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Citroën', 'citroen', 1, '{"originCountry":"Francia","type":"Automóviles"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'citroen');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Renault', 'renault', 1, '{"originCountry":"Francia","type":"Automóviles"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'renault');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'DS Automobiles', 'ds automobiles', 1, '{"originCountry":"Francia","type":"Automóviles premium"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'ds automobiles');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Bugatti', 'bugatti', 1, '{"originCountry":"Francia","type":"Hiperdeportivos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'bugatti');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Renault Trucks', 'renault trucks', 1, '{"originCountry":"Francia","type":"Camiones"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'renault trucks');

-- UK Brands
INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Jaguar', 'jaguar', 1, '{"originCountry":"Reino Unido","type":"Automóviles de lujo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'jaguar');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Land Rover', 'land rover', 1, '{"originCountry":"Reino Unido","type":"SUVs de lujo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'land rover');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Bentley', 'bentley', 1, '{"originCountry":"Reino Unido","type":"Automóviles de lujo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'bentley');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Rolls-Royce', 'rolls-royce', 1, '{"originCountry":"Reino Unido","type":"Automóviles de ultra lujo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'rolls-royce');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Aston Martin', 'aston martin', 1, '{"originCountry":"Reino Unido","type":"Automóviles deportivos de lujo"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'aston martin');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'McLaren', 'mclaren', 1, '{"originCountry":"Reino Unido","type":"Superdeportivos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'mclaren');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Lotus', 'lotus', 1, '{"originCountry":"Reino Unido","type":"Automóviles deportivos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'lotus');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Mini', 'mini', 1, '{"originCountry":"Reino Unido","type":"Automóviles compactos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'mini');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Triumph', 'triumph', 1, '{"originCountry":"Reino Unido","type":"Motocicletas clásicas/modernas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'triumph');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Norton', 'norton', 1, '{"originCountry":"Reino Unido","type":"Motocicletas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'norton');

-- Swedish Brands
INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Volvo Cars', 'volvo cars', 1, '{"originCountry":"Suecia","type":"Automóviles, SUVs"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'volvo cars');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Volvo Trucks', 'volvo trucks', 1, '{"originCountry":"Suecia","type":"Camiones pesados"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'volvo trucks');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Scania', 'scania', 1, '{"originCountry":"Suecia","type":"Camiones pesados"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'scania');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Polestar', 'polestar', 1, '{"originCountry":"Suecia","type":"Automóviles eléctricos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'polestar');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Koenigsegg', 'koenigsegg', 1, '{"originCountry":"Suecia","type":"Hiperdeportivos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'koenigsegg');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Husqvarna', 'husqvarna', 1, '{"originCountry":"Suecia","type":"Motocicletas off-road"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'husqvarna');

-- Chinese Brands
INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'BYD', 'byd', 1, '{"originCountry":"China","type":"Automóviles eléctricos e híbridos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'byd');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Geely', 'geely', 1, '{"originCountry":"China","type":"Automóviles"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'geely');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'NIO', 'nio', 1, '{"originCountry":"China","type":"Automóviles eléctricos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'nio');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Xpeng', 'xpeng', 1, '{"originCountry":"China","type":"Automóviles eléctricos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'xpeng');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Li Auto', 'li auto', 1, '{"originCountry":"China","type":"Automóviles eléctricos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'li auto');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Great Wall Motors', 'great wall motors', 1, '{"originCountry":"China","type":"Automóviles, SUVs"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'great wall motors');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Chery', 'chery', 1, '{"originCountry":"China","type":"Automóviles"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'chery');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'SAIC Motor', 'saic motor', 1, '{"originCountry":"China","type":"Automóviles"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'saic motor');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Dongfeng Motor', 'dongfeng motor', 1, '{"originCountry":"China","type":"Automóviles, Camiones"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'dongfeng motor');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'FAW', 'faw', 1, '{"originCountry":"China","type":"Automóviles, Camiones"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'faw');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Foton', 'foton', 1, '{"originCountry":"China","type":"Camiones"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'foton');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Sinotruk', 'sinotruk', 1, '{"originCountry":"China","type":"Camiones pesados"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'sinotruk');

-- Indian Brands
INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Tata Motors', 'tata motors', 1, '{"originCountry":"India","type":"Automóviles, Camiones"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'tata motors');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Mahindra', 'mahindra', 1, '{"originCountry":"India","type":"SUVs, Tractores agrícolas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'mahindra');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Maruti Suzuki', 'maruti suzuki', 1, '{"originCountry":"India","type":"Automóviles"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'maruti suzuki');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Hero MotoCorp', 'hero motocorp', 1, '{"originCountry":"India","type":"Motocicletas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'hero motocorp');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Bajaj Auto', 'bajaj auto', 1, '{"originCountry":"India","type":"Motocicletas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'bajaj auto');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Royal Enfield', 'royal enfield', 1, '{"originCountry":"India","type":"Motocicletas clásicas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'royal enfield');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'TVS Motor', 'tvs motor', 1, '{"originCountry":"India","type":"Motocicletas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'tvs motor');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Ashok Leyland', 'ashok leyland', 1, '{"originCountry":"India","type":"Camiones"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'ashok leyland');

-- Other European Brands
INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'SEAT', 'seat', 1, '{"originCountry":"España","type":"Automóviles"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'seat');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Skoda', 'skoda', 1, '{"originCountry":"República Checa","type":"Automóviles"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'skoda');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Dacia', 'dacia', 1, '{"originCountry":"Rumania","type":"Automóviles económicos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'dacia');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'DAF', 'daf', 1, '{"originCountry":"Países Bajos","type":"Camiones pesados"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'daf');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'KTM', 'ktm', 1, '{"originCountry":"Austria","type":"Motocicletas deportivas/off-road"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'ktm');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Rimac', 'rimac', 1, '{"originCountry":"Croacia","type":"Hiperdeportivos eléctricos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'rimac');

-- Other Asian Brands
INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'VinFast', 'vinfast', 1, '{"originCountry":"Vietnam","type":"Automóviles eléctricos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'vinfast');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Proton', 'proton', 1, '{"originCountry":"Malasia","type":"Automóviles"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'proton');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Kymco', 'kymco', 1, '{"originCountry":"Taiwán","type":"Scooters, Motocicletas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'kymco');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'SYM', 'sym', 1, '{"originCountry":"Taiwán","type":"Scooters, Motocicletas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'sym');

-- Japanese Motorcycles
INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Yamaha', 'yamaha', 1, '{"originCountry":"Japón","type":"Motocicletas de todos los tipos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'yamaha');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Kawasaki', 'kawasaki', 1, '{"originCountry":"Japón","type":"Motocicletas deportivas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'kawasaki');

-- American Trucks
INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Freightliner', 'freightliner', 1, '{"originCountry":"Estados Unidos","type":"Camiones pesados"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'freightliner');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Kenworth', 'kenworth', 1, '{"originCountry":"Estados Unidos","type":"Camiones pesados"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'kenworth');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Peterbilt', 'peterbilt', 1, '{"originCountry":"Estados Unidos","type":"Camiones pesados"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'peterbilt');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'International', 'international', 1, '{"originCountry":"Estados Unidos","type":"Camiones"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'international');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Mack Trucks', 'mack trucks', 1, '{"originCountry":"Estados Unidos","type":"Camiones pesados"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'mack trucks');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Western Star', 'western star', 1, '{"originCountry":"Estados Unidos","type":"Camiones pesados"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'western star');

-- Japanese Trucks
INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Hino', 'hino', 1, '{"originCountry":"Japón","type":"Camiones"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'hino');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Isuzu', 'isuzu', 1, '{"originCountry":"Japón","type":"Camiones comerciales"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'isuzu');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Mitsubishi Fuso', 'mitsubishi fuso', 1, '{"originCountry":"Japón","type":"Camiones"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'mitsubishi fuso');

-- Agricultural Equipment
INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'John Deere', 'john deere', 1, '{"originCountry":"Estados Unidos","type":"Tractores agrícolas, Maquinaria pesada"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'john deere');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Caterpillar', 'caterpillar', 1, '{"originCountry":"Estados Unidos","type":"Maquinaria pesada"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'caterpillar');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Case IH', 'case ih', 1, '{"originCountry":"Estados Unidos","type":"Tractores agrícolas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'case ih');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'New Holland', 'new holland', 1, '{"originCountry":"Estados Unidos","type":"Tractores agrícolas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'new holland');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Massey Ferguson', 'massey ferguson', 1, '{"originCountry":"Reino Unido/Estados Unidos","type":"Tractores agrícolas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'massey ferguson');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Kubota', 'kubota', 1, '{"originCountry":"Japón","type":"Tractores compactos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'kubota');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Fendt', 'fendt', 1, '{"originCountry":"Alemania","type":"Tractores agrícolas"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'fendt');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Claas', 'claas', 1, '{"originCountry":"Alemania","type":"Tractores, Maquinaria agrícola"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'claas');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'JCB', 'jcb', 1, '{"originCountry":"Reino Unido","type":"Maquinaria de construcción"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'jcb');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Komatsu', 'komatsu', 1, '{"originCountry":"Japón","type":"Maquinaria pesada"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'komatsu');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Bobcat', 'bobcat', 1, '{"originCountry":"Estados Unidos","type":"Maquinaria compacta"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'bobcat');

-- Mexican Brands
INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Italika', 'italika', 1, '{"originCountry":"México","type":"Motocicletas económicas, Vehículos de movilidad"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'italika');

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'), 'Mastretta', 'mastretta', 1, '{"originCountry":"México","type":"Automóviles deportivos"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands') AND normalized_name = 'mastretta');
