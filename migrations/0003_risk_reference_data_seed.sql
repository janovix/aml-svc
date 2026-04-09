-- Seed: ENR 2023 Reference Data for Risk-Based Approach
-- Activity risk profiles, geographic risk zones, and jurisdiction risk data

-- =============================================================================
-- Activity Risk Profiles (20 Vulnerable Activities from ENR 2023)
-- Scale: 0-9. Levels: LOW (0-3), MEDIUM_LOW (3-5), MEDIUM (5-7), HIGH (7-9)
-- =============================================================================

INSERT OR IGNORE INTO "activity_risk_profiles" ("id", "activity_key", "activity_name", "risk_level", "risk_score", "liquidity_factor", "anonymity_factor", "value_transfer_factor", "cash_intensity_factor", "source", "updated_at") VALUES
('arp_oba', 'OBA', 'Obras de Arte y Antigüedades', 'HIGH', 7.8, 6.0, 8.0, 7.5, 5.0, 'ENR_2023', CURRENT_TIMESTAMP),
('arp_mjr', 'MJR', 'Metales y Piedras Preciosas / Joyería', 'HIGH', 7.5, 7.0, 7.5, 8.0, 7.0, 'ENR_2023', CURRENT_TIMESTAMP),
('arp_tdr', 'TDR', 'Tarjetas de Servicios, Crédito, Monederos y Certificados', 'HIGH', 7.2, 8.0, 7.0, 7.5, 4.0, 'ENR_2023', CURRENT_TIMESTAMP),
('arp_tpp', 'TPP', 'Tarjetas Prepagadas', 'MEDIUM', 5.8, 7.5, 6.5, 6.0, 3.5, 'ENR_2023', CURRENT_TIMESTAMP),
('arp_veh', 'VEH', 'Vehículos (Terrestres, Marítimos y Aéreos)', 'MEDIUM', 5.5, 5.0, 4.0, 7.0, 5.5, 'ENR_2023', CURRENT_TIMESTAMP),
('arp_fes', 'FES', 'Servidores Públicos / Fe Pública (Corredores)', 'MEDIUM', 5.3, 4.0, 3.5, 6.5, 3.0, 'ENR_2023', CURRENT_TIMESTAMP),
('arp_fep', 'FEP', 'Fe Pública (Notarios)', 'MEDIUM', 5.2, 4.0, 3.5, 7.0, 3.0, 'ENR_2023', CURRENT_TIMESTAMP),
('arp_mpc', 'MPC', 'Mutuo, Préstamo y Crédito', 'MEDIUM', 5.0, 6.5, 5.0, 5.5, 5.0, 'ENR_2023', CURRENT_TIMESTAMP),
('arp_bli', 'BLI', 'Blindaje', 'MEDIUM_LOW', 4.5, 3.5, 3.0, 5.0, 4.0, 'ENR_2023', CURRENT_TIMESTAMP),
('arp_tsc', 'TSC', 'Tarjetas de Servicios y Crédito (Emisión)', 'MEDIUM_LOW', 4.3, 6.0, 5.5, 5.0, 3.0, 'ENR_2023', CURRENT_TIMESTAMP),
('arp_jys', 'JYS', 'Juegos y Sorteos', 'MEDIUM_LOW', 4.2, 6.0, 5.0, 4.0, 7.0, 'ENR_2023', CURRENT_TIMESTAMP),
('arp_inm', 'INM', 'Inmuebles (Compraventa)', 'MEDIUM_LOW', 4.0, 4.0, 3.5, 7.5, 4.5, 'ENR_2023', CURRENT_TIMESTAMP),
('arp_don', 'DON', 'Donativos', 'MEDIUM_LOW', 3.8, 5.0, 5.5, 4.0, 4.5, 'ENR_2023', CURRENT_TIMESTAMP),
('arp_ari', 'ARI', 'Arrendamiento de Inmuebles', 'MEDIUM_LOW', 3.6, 4.0, 3.0, 4.5, 4.0, 'ENR_2023', CURRENT_TIMESTAMP),
('arp_din', 'DIN', 'Desarrollo Inmobiliario', 'MEDIUM_LOW', 3.5, 4.5, 3.0, 6.0, 3.5, 'ENR_2023', CURRENT_TIMESTAMP),
('arp_avi', 'AVI', 'Activos Virtuales', 'MEDIUM_LOW', 3.4, 8.0, 7.0, 7.0, 1.0, 'ENR_2023', CURRENT_TIMESTAMP),
('arp_spr', 'SPR', 'Servicios Profesionales Independientes', 'MEDIUM_LOW', 3.3, 3.5, 4.0, 5.0, 3.0, 'ENR_2023', CURRENT_TIMESTAMP),
('arp_tcv', 'TCV', 'Traslado y Custodia de Valores', 'MEDIUM_LOW', 3.2, 3.0, 2.5, 4.0, 7.0, 'ENR_2023', CURRENT_TIMESTAMP),
('arp_chv', 'CHV', 'Cheques de Viajero', 'MEDIUM_LOW', 3.1, 7.0, 5.0, 5.0, 2.0, 'ENR_2023', CURRENT_TIMESTAMP),
('arp_otr', 'OTR', 'Otros (Actividad General)', 'LOW', 2.5, 3.0, 3.0, 3.0, 3.0, 'ENR_2023', CURRENT_TIMESTAMP);

-- =============================================================================
-- Geographic Risk Zones (Mexican States from ENR 2023)
-- Based on: organized crime incidence, informality, border proximity, ports
-- =============================================================================

INSERT OR IGNORE INTO "geographic_risk_zones" ("id", "state_code", "state_name", "risk_level", "risk_score", "factors", "source", "updated_at") VALUES
('grz_agu', 'AGU', 'Aguascalientes', 'LOW', 2.5, '{"incidence":2,"informality":3,"border":false,"ports":false}', 'ENR_2023', CURRENT_TIMESTAMP),
('grz_bcn', 'BCN', 'Baja California', 'HIGH', 7.8, '{"incidence":8,"informality":6,"border":true,"ports":true}', 'ENR_2023', CURRENT_TIMESTAMP),
('grz_bcs', 'BCS', 'Baja California Sur', 'MEDIUM', 5.0, '{"incidence":5,"informality":5,"border":false,"ports":true}', 'ENR_2023', CURRENT_TIMESTAMP),
('grz_cam', 'CAM', 'Campeche', 'MEDIUM_LOW', 3.5, '{"incidence":3,"informality":5,"border":true,"ports":true}', 'ENR_2023', CURRENT_TIMESTAMP),
('grz_chp', 'CHP', 'Chiapas', 'HIGH', 7.2, '{"incidence":7,"informality":8,"border":true,"ports":true}', 'ENR_2023', CURRENT_TIMESTAMP),
('grz_chh', 'CHH', 'Chihuahua', 'HIGH', 7.5, '{"incidence":8,"informality":5,"border":true,"ports":false}', 'ENR_2023', CURRENT_TIMESTAMP),
('grz_coa', 'COA', 'Coahuila', 'MEDIUM', 5.5, '{"incidence":5,"informality":4,"border":true,"ports":false}', 'ENR_2023', CURRENT_TIMESTAMP),
('grz_col', 'COL', 'Colima', 'HIGH', 8.0, '{"incidence":9,"informality":5,"border":false,"ports":true}', 'ENR_2023', CURRENT_TIMESTAMP),
('grz_cmx', 'CMX', 'Ciudad de México', 'MEDIUM', 5.8, '{"incidence":6,"informality":4,"border":false,"ports":false}', 'ENR_2023', CURRENT_TIMESTAMP),
('grz_dur', 'DUR', 'Durango', 'MEDIUM', 5.2, '{"incidence":5,"informality":6,"border":false,"ports":false}', 'ENR_2023', CURRENT_TIMESTAMP),
('grz_gua', 'GUA', 'Guanajuato', 'HIGH', 7.0, '{"incidence":8,"informality":5,"border":false,"ports":false}', 'ENR_2023', CURRENT_TIMESTAMP),
('grz_gro', 'GRO', 'Guerrero', 'HIGH', 8.2, '{"incidence":9,"informality":8,"border":false,"ports":true}', 'ENR_2023', CURRENT_TIMESTAMP),
('grz_hid', 'HID', 'Hidalgo', 'MEDIUM_LOW', 3.8, '{"incidence":4,"informality":6,"border":false,"ports":false}', 'ENR_2023', CURRENT_TIMESTAMP),
('grz_jal', 'JAL', 'Jalisco', 'HIGH', 7.8, '{"incidence":8,"informality":5,"border":false,"ports":true}', 'ENR_2023', CURRENT_TIMESTAMP),
('grz_mex', 'MEX', 'Estado de México', 'MEDIUM', 6.0, '{"incidence":7,"informality":5,"border":false,"ports":false}', 'ENR_2023', CURRENT_TIMESTAMP),
('grz_mic', 'MIC', 'Michoacán', 'HIGH', 8.0, '{"incidence":9,"informality":7,"border":false,"ports":true}', 'ENR_2023', CURRENT_TIMESTAMP),
('grz_mor', 'MOR', 'Morelos', 'MEDIUM', 5.8, '{"incidence":6,"informality":5,"border":false,"ports":false}', 'ENR_2023', CURRENT_TIMESTAMP),
('grz_nay', 'NAY', 'Nayarit', 'MEDIUM', 5.5, '{"incidence":6,"informality":6,"border":false,"ports":true}', 'ENR_2023', CURRENT_TIMESTAMP),
('grz_nle', 'NLE', 'Nuevo León', 'MEDIUM', 5.5, '{"incidence":5,"informality":3,"border":true,"ports":false}', 'ENR_2023', CURRENT_TIMESTAMP),
('grz_oax', 'OAX', 'Oaxaca', 'MEDIUM', 5.0, '{"incidence":5,"informality":8,"border":false,"ports":true}', 'ENR_2023', CURRENT_TIMESTAMP),
('grz_pue', 'PUE', 'Puebla', 'MEDIUM', 5.2, '{"incidence":5,"informality":6,"border":false,"ports":false}', 'ENR_2023', CURRENT_TIMESTAMP),
('grz_que', 'QUE', 'Querétaro', 'LOW', 2.8, '{"incidence":3,"informality":3,"border":false,"ports":false}', 'ENR_2023', CURRENT_TIMESTAMP),
('grz_roo', 'ROO', 'Quintana Roo', 'MEDIUM', 6.0, '{"incidence":6,"informality":5,"border":true,"ports":true}', 'ENR_2023', CURRENT_TIMESTAMP),
('grz_slp', 'SLP', 'San Luis Potosí', 'MEDIUM_LOW', 4.2, '{"incidence":5,"informality":5,"border":false,"ports":false}', 'ENR_2023', CURRENT_TIMESTAMP),
('grz_sin', 'SIN', 'Sinaloa', 'HIGH', 7.5, '{"incidence":8,"informality":5,"border":false,"ports":true}', 'ENR_2023', CURRENT_TIMESTAMP),
('grz_son', 'SON', 'Sonora', 'HIGH', 7.2, '{"incidence":7,"informality":5,"border":true,"ports":true}', 'ENR_2023', CURRENT_TIMESTAMP),
('grz_tab', 'TAB', 'Tabasco', 'MEDIUM', 5.0, '{"incidence":5,"informality":6,"border":true,"ports":true}', 'ENR_2023', CURRENT_TIMESTAMP),
('grz_tam', 'TAM', 'Tamaulipas', 'HIGH', 7.8, '{"incidence":8,"informality":5,"border":true,"ports":true}', 'ENR_2023', CURRENT_TIMESTAMP),
('grz_tla', 'TLA', 'Tlaxcala', 'LOW', 2.5, '{"incidence":3,"informality":5,"border":false,"ports":false}', 'ENR_2023', CURRENT_TIMESTAMP),
('grz_ver', 'VER', 'Veracruz', 'MEDIUM', 6.0, '{"incidence":6,"informality":6,"border":false,"ports":true}', 'ENR_2023', CURRENT_TIMESTAMP),
('grz_yuc', 'YUC', 'Yucatán', 'LOW', 2.5, '{"incidence":2,"informality":4,"border":false,"ports":true}', 'ENR_2023', CURRENT_TIMESTAMP),
('grz_zac', 'ZAC', 'Zacatecas', 'HIGH', 7.5, '{"incidence":8,"informality":6,"border":false,"ports":false}', 'ENR_2023', CURRENT_TIMESTAMP);

-- =============================================================================
-- Jurisdiction Risk (GAFI/GAFILAT High-Risk Jurisdictions)
-- Based on: GAFI grey list, deficient AML/CFT, preferential tax, corruption
-- =============================================================================

INSERT OR IGNORE INTO "jurisdiction_risks" ("id", "country_code", "country_name", "risk_level", "risk_score", "preferential_tax", "gafi_deficient", "high_corruption", "source", "updated_at") VALUES
-- GAFI High-Risk / Call for Action (black list)
('jr_prk', 'PRK', 'Corea del Norte', 'HIGH', 9.0, 0, 1, 1, 'GAFI_2023', CURRENT_TIMESTAMP),
('jr_irn', 'IRN', 'Irán', 'HIGH', 9.0, 0, 1, 1, 'GAFI_2023', CURRENT_TIMESTAMP),
('jr_mmr', 'MMR', 'Myanmar', 'HIGH', 8.5, 0, 1, 1, 'GAFI_2023', CURRENT_TIMESTAMP),
-- GAFI Increased Monitoring (grey list)
('jr_bfa', 'BFA', 'Burkina Faso', 'HIGH', 7.5, 0, 1, 1, 'GAFI_2023', CURRENT_TIMESTAMP),
('jr_cmr', 'CMR', 'Camerún', 'HIGH', 7.0, 0, 1, 1, 'GAFI_2023', CURRENT_TIMESTAMP),
('jr_cod', 'COD', 'República Democrática del Congo', 'HIGH', 7.5, 0, 1, 1, 'GAFI_2023', CURRENT_TIMESTAMP),
('jr_hti', 'HTI', 'Haití', 'HIGH', 7.5, 0, 1, 1, 'GAFI_2023', CURRENT_TIMESTAMP),
('jr_moz', 'MOZ', 'Mozambique', 'HIGH', 7.0, 0, 1, 1, 'GAFI_2023', CURRENT_TIMESTAMP),
('jr_nga', 'NGA', 'Nigeria', 'HIGH', 7.5, 0, 1, 1, 'GAFI_2023', CURRENT_TIMESTAMP),
('jr_syc', 'SYC', 'Seychelles', 'MEDIUM', 6.0, 1, 1, 0, 'GAFI_2023', CURRENT_TIMESTAMP),
('jr_zaf', 'ZAF', 'Sudáfrica', 'MEDIUM', 6.0, 0, 1, 1, 'GAFI_2023', CURRENT_TIMESTAMP),
('jr_ssd', 'SSD', 'Sudán del Sur', 'HIGH', 8.0, 0, 1, 1, 'GAFI_2023', CURRENT_TIMESTAMP),
('jr_syr', 'SYR', 'Siria', 'HIGH', 8.5, 0, 1, 1, 'GAFI_2023', CURRENT_TIMESTAMP),
('jr_tza', 'TZA', 'Tanzania', 'MEDIUM', 6.5, 0, 1, 1, 'GAFI_2023', CURRENT_TIMESTAMP),
('jr_ven', 'VEN', 'Venezuela', 'HIGH', 7.5, 0, 1, 1, 'GAFI_2023', CURRENT_TIMESTAMP),
('jr_yem', 'YEM', 'Yemen', 'HIGH', 8.0, 0, 1, 1, 'GAFI_2023', CURRENT_TIMESTAMP),
-- Preferential Tax Regimes (Art. 176 LISR, relevant for AML risk)
('jr_cym', 'CYM', 'Islas Caimán', 'MEDIUM', 6.0, 1, 0, 0, 'GAFI_2023', CURRENT_TIMESTAMP),
('jr_vgb', 'VGB', 'Islas Vírgenes Británicas', 'MEDIUM', 6.0, 1, 0, 0, 'GAFI_2023', CURRENT_TIMESTAMP),
('jr_pan', 'PAN', 'Panamá', 'MEDIUM', 5.5, 1, 0, 0, 'GAFI_2023', CURRENT_TIMESTAMP),
('jr_blz', 'BLZ', 'Belice', 'MEDIUM', 5.5, 1, 0, 0, 'GAFI_2023', CURRENT_TIMESTAMP),
('jr_lux', 'LUX', 'Luxemburgo', 'LOW', 2.5, 1, 0, 0, 'GAFI_2023', CURRENT_TIMESTAMP),
-- Low-risk reference countries
('jr_mex', 'MEX', 'México', 'LOW', 2.0, 0, 0, 0, 'GAFI_2023', CURRENT_TIMESTAMP),
('jr_usa', 'USA', 'Estados Unidos', 'LOW', 1.5, 0, 0, 0, 'GAFI_2023', CURRENT_TIMESTAMP),
('jr_can', 'CAN', 'Canadá', 'LOW', 1.5, 0, 0, 0, 'GAFI_2023', CURRENT_TIMESTAMP),
('jr_gbr', 'GBR', 'Reino Unido', 'LOW', 1.5, 0, 0, 0, 'GAFI_2023', CURRENT_TIMESTAMP),
('jr_esp', 'ESP', 'España', 'LOW', 1.5, 0, 0, 0, 'GAFI_2023', CURRENT_TIMESTAMP),
('jr_deu', 'DEU', 'Alemania', 'LOW', 1.5, 0, 0, 0, 'GAFI_2023', CURRENT_TIMESTAMP),
('jr_fra', 'FRA', 'Francia', 'LOW', 1.5, 0, 0, 0, 'GAFI_2023', CURRENT_TIMESTAMP),
('jr_jpn', 'JPN', 'Japón', 'LOW', 1.0, 0, 0, 0, 'GAFI_2023', CURRENT_TIMESTAMP);
