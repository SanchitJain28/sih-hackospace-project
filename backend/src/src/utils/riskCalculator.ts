// // Type for debris
// export type RiskLevel = "high" | "medium" | "low";

// interface Debris {
//   altitude: number;   // in km
//   velocity: number;   // in km/s
//   size: "small" | "medium" | "large";
// }

// // Function to calculate risk level
// export function calculateRisk(debris: Debris): RiskLevel {
//   // High Risk = Low altitude + High velocity
//   if (debris.altitude < 1000 && debris.velocity > 7.5) {
//     return "high";
//   }

//   // Medium Risk = Moderate altitude + moderate velocity
//   if (debris.altitude < 20000 && debris.velocity > 3) {
//     return "medium";
//   }

//   // Otherwise = Low Risk
//   return "low";
// }
