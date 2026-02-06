// Domain: Operation Activities
// Provides specialized handlers for each of the 19 vulnerable activity types

export * from "./types";
export {
	activityRegistry,
	getActivityHandler,
	getAllActivityCodes,
	validateActivityExtension,
	getUmaThreshold,
	getApplicableAlertTypes,
	generateDetailXml,
	extractAlertMetadata,
	getActivityName,
	getAllActivities,
} from "./registry";

// Export individual handlers for direct access if needed
export { vehicleHandler } from "./veh";
export { realEstateHandler } from "./inm";
export { jewelryHandler } from "./mjr";
export { virtualAssetHandler } from "./avi";
export { gamblingHandler } from "./jys";
export { rentalHandler } from "./ari";
export { armoringHandler } from "./bli";
export { donationHandler } from "./don";
export { loanHandler } from "./mpc";
export { officialHandler } from "./fep";
export { notaryHandler } from "./fes";
export { professionalHandler } from "./spr";
export { travelerCheckHandler } from "./chv";
export { cardHandler } from "./tsc";
export { prepaidHandler } from "./tpp";
export { rewardHandler } from "./tdr";
export { valuableHandler } from "./tcv";
export { artHandler } from "./oba";
export { developmentHandler } from "./din";
