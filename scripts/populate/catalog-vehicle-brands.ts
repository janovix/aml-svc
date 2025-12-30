import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "@prisma/client";

// Common vehicle brands list
const VEHICLE_BRANDS = [
	"Acura",
	"Alfa Romeo",
	"Aston Martin",
	"Audi",
	"Bentley",
	"BMW",
	"Buick",
	"Cadillac",
	"Chevrolet",
	"Chrysler",
	"Citroën",
	"Dodge",
	"Ferrari",
	"Fiat",
	"Ford",
	"Genesis",
	"GMC",
	"Honda",
	"Hyundai",
	"Infiniti",
	"Jaguar",
	"Jeep",
	"Kia",
	"Lamborghini",
	"Land Rover",
	"Lexus",
	"Lincoln",
	"Maserati",
	"Mazda",
	"McLaren",
	"Mercedes-Benz",
	"Mini",
	"Mitsubishi",
	"Nissan",
	"Porsche",
	"Ram",
	"Rolls-Royce",
	"Subaru",
	"Tesla",
	"Toyota",
	"Volkswagen",
	"Volvo",
];

function normalizeName(name: string): string {
	return name
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();
}

async function populateVehicleBrands(db: D1Database) {
	const adapter = new PrismaD1(db);
	const prisma = new PrismaClient({ adapter });

	try {
		console.log("Starting vehicle-brands catalog population...");

		// Check if catalog already exists
		let catalog = await prisma.catalog.findUnique({
			where: { key: "vehicle-brands" },
		});

		if (!catalog) {
			// Create the catalog
			catalog = await prisma.catalog.create({
				data: {
					key: "vehicle-brands",
					name: "Vehicle Brands",
					active: true,
				},
			});
			console.log(`Created catalog: ${catalog.name} (${catalog.key})`);
		} else {
			console.log(`Catalog already exists: ${catalog.name} (${catalog.key})`);
		}

		// Get existing items to avoid duplicates
		const existingItems = await prisma.catalogItem.findMany({
			where: { catalogId: catalog.id },
			select: { normalizedName: true },
		});

		const existingNormalizedNames = new Set(
			existingItems.map((item) => item.normalizedName),
		);

		// Create catalog items for each brand
		const brandsToCreate = VEHICLE_BRANDS.filter(
			(brand) => !existingNormalizedNames.has(normalizeName(brand)),
		);

		if (brandsToCreate.length === 0) {
			console.log("All vehicle brands already exist in the catalog.");
			return;
		}

		const createdItems = await prisma.catalogItem.createMany({
			data: brandsToCreate.map((brand) => ({
				catalogId: catalog.id,
				name: brand,
				normalizedName: normalizeName(brand),
				active: true,
			})),
		});

		console.log(
			`Successfully populated ${createdItems.count} vehicle brand(s) into the catalog.`,
		);
		console.log(`Total brands in catalog: ${VEHICLE_BRANDS.length}`);
	} catch (error) {
		console.error("Error populating vehicle-brands catalog:", error);
		throw error;
	} finally {
		await prisma.$disconnect();
	}
}

export { populateVehicleBrands };
