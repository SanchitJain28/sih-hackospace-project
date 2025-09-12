// src/utils/riskCalculator.ts
export type RiskLevel = "high" | "medium" | "low";

interface Debris {
  altitude: number;   // in km
  velocity: number;   // in km/s
  size: "small" | "medium" | "large";
}

export function calculateRisk(debris: Debris): RiskLevel {
  // High Risk = low altitude + high velocity
  if (debris.altitude < 1000 && debris.velocity > 7.5) {
    return "high";
  }

  // Medium Risk = moderate altitude + moderate velocity
  if (debris.altitude < 20000 && debris.velocity > 3) {
    return "medium";
  }

  // Otherwise = Low Risk
  return "low";
}
