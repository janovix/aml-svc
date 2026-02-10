#!/usr/bin/env node
/**
 * Generate Vehicle Brand CSV Files
 *
 * Creates 3 CSV files with common vehicle brands:
 * - terrestrial-vehicle-brands.csv
 * - maritime-vehicle-brands.csv
 * - air-vehicle-brands.csv
 *
 * Format: name,origin_country,type
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CACHE_DIR = join(__dirname, "../../../catalogs-cache");

// Terrestrial vehicle brands (cars, trucks, motorcycles)
const TERRESTRIAL_BRANDS = [
	{ name: "Acura", origin: "Japan", type: "Car" },
	{ name: "Alfa Romeo", origin: "Italy", type: "Car" },
	{ name: "Aston Martin", origin: "United Kingdom", type: "Car" },
	{ name: "Audi", origin: "Germany", type: "Car" },
	{ name: "Bentley", origin: "United Kingdom", type: "Car" },
	{ name: "BMW", origin: "Germany", type: "Car" },
	{ name: "Buick", origin: "United States", type: "Car" },
	{ name: "Cadillac", origin: "United States", type: "Car" },
	{ name: "Chevrolet", origin: "United States", type: "Car" },
	{ name: "Chrysler", origin: "United States", type: "Car" },
	{ name: "Citroën", origin: "France", type: "Car" },
	{ name: "Dodge", origin: "United States", type: "Car" },
	{ name: "Ferrari", origin: "Italy", type: "Car" },
	{ name: "Fiat", origin: "Italy", type: "Car" },
	{ name: "Ford", origin: "United States", type: "Car" },
	{ name: "Genesis", origin: "South Korea", type: "Car" },
	{ name: "GMC", origin: "United States", type: "Car" },
	{ name: "Honda", origin: "Japan", type: "Car" },
	{ name: "Hyundai", origin: "South Korea", type: "Car" },
	{ name: "Infiniti", origin: "Japan", type: "Car" },
	{ name: "Isuzu", origin: "Japan", type: "Car" },
	{ name: "Jaguar", origin: "United Kingdom", type: "Car" },
	{ name: "Jeep", origin: "United States", type: "Car" },
	{ name: "Kia", origin: "South Korea", type: "Car" },
	{ name: "Lamborghini", origin: "Italy", type: "Car" },
	{ name: "Land Rover", origin: "United Kingdom", type: "Car" },
	{ name: "Lexus", origin: "Japan", type: "Car" },
	{ name: "Lincoln", origin: "United States", type: "Car" },
	{ name: "Maserati", origin: "Italy", type: "Car" },
	{ name: "Mazda", origin: "Japan", type: "Car" },
	{ name: "McLaren", origin: "United Kingdom", type: "Car" },
	{ name: "Mercedes-Benz", origin: "Germany", type: "Car" },
	{ name: "Mini", origin: "United Kingdom", type: "Car" },
	{ name: "Mitsubishi", origin: "Japan", type: "Car" },
	{ name: "Nissan", origin: "Japan", type: "Car" },
	{ name: "Peugeot", origin: "France", type: "Car" },
	{ name: "Porsche", origin: "Germany", type: "Car" },
	{ name: "Ram", origin: "United States", type: "Car" },
	{ name: "Renault", origin: "France", type: "Car" },
	{ name: "Rolls-Royce", origin: "United Kingdom", type: "Car" },
	{ name: "Seat", origin: "Spain", type: "Car" },
	{ name: "Škoda", origin: "Czech Republic", type: "Car" },
	{ name: "Subaru", origin: "Japan", type: "Car" },
	{ name: "Suzuki", origin: "Japan", type: "Car" },
	{ name: "Tesla", origin: "United States", type: "Car" },
	{ name: "Toyota", origin: "Japan", type: "Car" },
	{ name: "Volkswagen", origin: "Germany", type: "Car" },
	{ name: "Volvo", origin: "Sweden", type: "Car" },
	// Motorcycles
	{ name: "Harley-Davidson", origin: "United States", type: "Motorcycle" },
	{ name: "Yamaha", origin: "Japan", type: "Motorcycle" },
	{ name: "Kawasaki", origin: "Japan", type: "Motorcycle" },
	{ name: "Ducati", origin: "Italy", type: "Motorcycle" },
	{ name: "KTM", origin: "Austria", type: "Motorcycle" },
	{ name: "Triumph", origin: "United Kingdom", type: "Motorcycle" },
	{ name: "BMW Motorrad", origin: "Germany", type: "Motorcycle" },
	{ name: "Indian", origin: "United States", type: "Motorcycle" },
	{ name: "Aprilia", origin: "Italy", type: "Motorcycle" },
	{ name: "MV Agusta", origin: "Italy", type: "Motorcycle" },
];

// Maritime vehicle brands (boats, yachts, ships)
const MARITIME_BRANDS = [
	{ name: "Azimut", origin: "Italy", type: "Yacht" },
	{ name: "Beneteau", origin: "France", type: "Yacht" },
	{ name: "Boston Whaler", origin: "United States", type: "Boat" },
	{ name: "Carver", origin: "United States", type: "Yacht" },
	{ name: "Chaparral", origin: "United States", type: "Boat" },
	{ name: "Chris-Craft", origin: "United States", type: "Boat" },
	{ name: "Fairline", origin: "United Kingdom", type: "Yacht" },
	{ name: "Ferretti", origin: "Italy", type: "Yacht" },
	{ name: "Formula", origin: "United States", type: "Boat" },
	{ name: "Grady-White", origin: "United States", type: "Boat" },
	{ name: "Hatteras", origin: "United States", type: "Yacht" },
	{ name: "Jeanneau", origin: "France", type: "Yacht" },
	{ name: "Luhrs", origin: "United States", type: "Yacht" },
	{ name: "Mastercraft", origin: "United States", type: "Boat" },
	{ name: "Malibu", origin: "United States", type: "Boat" },
	{ name: "Nautique", origin: "United States", type: "Boat" },
	{ name: "Pershing", origin: "Italy", type: "Yacht" },
	{ name: "Princess", origin: "United Kingdom", type: "Yacht" },
	{ name: "Riva", origin: "Italy", type: "Yacht" },
	{ name: "Sea Ray", origin: "United States", type: "Boat" },
	{ name: "Sunseeker", origin: "United Kingdom", type: "Yacht" },
	{ name: "Tiara", origin: "United States", type: "Yacht" },
	{ name: "Viking", origin: "United States", type: "Yacht" },
	{ name: "Wellcraft", origin: "United States", type: "Boat" },
	{ name: "Yamaha", origin: "Japan", type: "Boat" },
];

// Air vehicle brands (planes, helicopters)
const AIR_BRANDS = [
	{ name: "Airbus", origin: "France", type: "Airplane" },
	{ name: "Boeing", origin: "United States", type: "Airplane" },
	{ name: "Bombardier", origin: "Canada", type: "Airplane" },
	{ name: "Cessna", origin: "United States", type: "Airplane" },
	{ name: "Cirrus", origin: "United States", type: "Airplane" },
	{ name: "Dassault", origin: "France", type: "Airplane" },
	{ name: "Embraer", origin: "Brazil", type: "Airplane" },
	{ name: "Gulfstream", origin: "United States", type: "Airplane" },
	{ name: "Learjet", origin: "United States", type: "Airplane" },
	{ name: "Piper", origin: "United States", type: "Airplane" },
	{ name: "Beechcraft", origin: "United States", type: "Airplane" },
	{ name: "Diamond", origin: "Austria", type: "Airplane" },
	// Helicopters
	{ name: "Airbus Helicopters", origin: "France", type: "Helicopter" },
	{ name: "Bell", origin: "United States", type: "Helicopter" },
	{ name: "Robinson", origin: "United States", type: "Helicopter" },
	{ name: "Sikorsky", origin: "United States", type: "Helicopter" },
	{ name: "Leonardo", origin: "Italy", type: "Helicopter" },
	{ name: "MD Helicopters", origin: "United States", type: "Helicopter" },
	{ name: "Enstrom", origin: "United States", type: "Helicopter" },
	{ name: "Kaman", origin: "United States", type: "Helicopter" },
];

function generateCsv(brands, outputPath) {
	const lines = ["name,origin_country,type"];

	for (const brand of brands) {
		lines.push(`${brand.name},${brand.origin},${brand.type}`);
	}

	writeFileSync(outputPath, lines.join("\n"));
}

async function generateAll() {
	console.log("╔════════════════════════════════════════════════════════════╗");
	console.log("║         Vehicle Brand CSV Generation                      ║");
	console.log(
		"╚════════════════════════════════════════════════════════════╝\n",
	);

	// Generate terrestrial brands
	console.log("📝 Generating terrestrial-vehicle-brands.csv...");
	const terrestrialPath = join(CACHE_DIR, "terrestrial-vehicle-brands.csv");
	generateCsv(TERRESTRIAL_BRANDS, terrestrialPath);
	console.log(`✅ Created with ${TERRESTRIAL_BRANDS.length} brands\n`);

	// Generate maritime brands
	console.log("📝 Generating maritime-vehicle-brands.csv...");
	const maritimePath = join(CACHE_DIR, "maritime-vehicle-brands.csv");
	generateCsv(MARITIME_BRANDS, maritimePath);
	console.log(`✅ Created with ${MARITIME_BRANDS.length} brands\n`);

	// Generate air brands
	console.log("📝 Generating air-vehicle-brands.csv...");
	const airPath = join(CACHE_DIR, "air-vehicle-brands.csv");
	generateCsv(AIR_BRANDS, airPath);
	console.log(`✅ Created with ${AIR_BRANDS.length} brands\n`);

	console.log("╔════════════════════════════════════════════════════════════╗");
	console.log("║                    Summary                                 ║");
	console.log(
		"╚════════════════════════════════════════════════════════════╝\n",
	);
	console.log(`✅ Generated 3 vehicle brand CSV files`);
	console.log(`   - Terrestrial: ${TERRESTRIAL_BRANDS.length} brands`);
	console.log(`   - Maritime: ${MARITIME_BRANDS.length} brands`);
	console.log(`   - Air: ${AIR_BRANDS.length} brands`);
}

generateAll().catch(console.error);
