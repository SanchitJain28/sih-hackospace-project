// shared/debrisUtils.ts
// Centralized debris processing utilities to ensure data synchronization

export type DebrisSize = "small" | "medium" | "large";
export type VelocityCategory = "slow" | "medium" | "fast";
export type RiskLevel = "high" | "medium" | "low";

// Raw data interface from JSON
export interface RawDebrisVelocity {
  x: number;
  y: number;
  z: number;
}

export interface RawDebris {
  id: string;
  satellite_id: string;
  altitude: number;
  velocity: RawDebrisVelocity;
  // Add these if they exist in your data, otherwise we'll generate them
  longitude?: number;
  latitude?: number;
  type?: string;
}

// Processed debris interface used by both components
export interface Debris {
  id: string | number;
  name: string;
  altitude: number; // in km
  velocity: number; // in km/s
  size: DebrisSize;
  mass: number; // in kg
  type: string;
  lon: number;
  lat: number;
}

export interface Filters {
  altitudeRange: [number, number];
  sizes: DebrisSize[];
  velocity: VelocityCategory | "all";
}

// **CENTRALIZED PROCESSING FUNCTIONS**
// These ensure both components use identical logic

export const calculateVelocityMagnitude = (velocity: RawDebrisVelocity): number => {
  return Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);
};

export const assignSize = (altitude: number): DebrisSize => {
  if (altitude > 550) return "small";
  if (altitude > 400) return "medium";
  return "large";
};

export const assignMass = (size: DebrisSize): number => {
  switch (size) {
    case "small": return 50;
    case "medium": return 250;
    case "large": return 1000;
    default: return 0;
  }
};

export const assignType = (altitude: number, size: DebrisSize): string => {
  if (altitude < 300) return "space junk";
  if (size === "large") return "satellite fragment";
  if (size === "medium") return "rocket stage";
  return "micrometeorite";
};

// Generate realistic coordinates if not provided
export const generateCoordinates = (id: string, altitude: number): { lon: number; lat: number } => {
  // Use ID as seed for consistent coordinates
  const seed = parseInt(id.replace(/\D/g, '')) || 0;
  const random1 = (seed * 9301 + 49297) % 233280;
  const random2 = (random1 * 9301 + 49297) % 233280;
  
  const lon = ((random1 / 233280) * 360) - 180; // -180 to 180
  const lat = ((random2 / 233280) * 180) - 90;  // -90 to 90
  
  return { lon, lat };
};

// **UNIFIED RISK CALCULATION** - This is the single source of truth
export const calculateRisk = (debris: Debris): RiskLevel => {
  // High risk: very low altitude + high velocity (likely reentry hazard)
  if (debris.altitude < 2000 && debris.velocity > 4.8) return "high";
  
  // Medium risk: crowded orbits (typical LEO ~300-1500 km)
  if (debris.altitude < 550 && debris.velocity > 3.5) return "medium";
  
  // Everything else: far away or slow → low risk
  return "low";
};

export const getVelocityCategory = (velocity: number): VelocityCategory => {
  if (velocity < 4) return "slow";
  if (velocity < 7) return "medium";
  return "fast";
};

// **MAIN PROCESSING FUNCTION**
// Convert raw debris data to processed format used by both components
export const processRawDebris = (rawData: RawDebris[]): Debris[] => {
  if (!rawData || !Array.isArray(rawData)) {
    console.warn("Invalid raw debris data provided");
    return [];
  }

  return rawData.map(raw => {
    try {
      const velocityMagnitude = calculateVelocityMagnitude(raw.velocity);
      const size = assignSize(raw.altitude);
      const mass = assignMass(size);
      const type = assignType(raw.altitude, size);
      
      // Use provided coordinates or generate them
      const coords = raw.longitude !== undefined && raw.latitude !== undefined
        ? { lon: raw.longitude, lat: raw.latitude }
        : generateCoordinates(raw.id, raw.altitude);

      return {
        id: raw.id,
        name: `Debris ${raw.satellite_id.substring(0, 8)}`,
        altitude: Math.round(raw.altitude),
        velocity: parseFloat(velocityMagnitude.toFixed(1)),
        size,
        mass,
        type: raw.type || type,
        lon: coords.lon,
        lat: coords.lat,
      };
    } catch (error) {
      console.error(`Error processing debris ${raw.id}:`, error);
      // Return a fallback object to prevent crashes
      return {
        id: raw.id,
        name: `Debris ${raw.id}`,
        altitude: raw.altitude || 400,
        velocity: 5.0,
        size: "medium" as DebrisSize,
        mass: 250,
        type: "unknown",
        lon: 0,
        lat: 0,
      };
    }
  });
};

// **FILTERING FUNCTION**
// Apply filters consistently across both components
export const filterDebris = (data: Debris[], filters: Filters): Debris[] => {
  return data.filter(debris => {
    const altitudeInRange = 
      debris.altitude >= filters.altitudeRange[0] &&
      debris.altitude <= filters.altitudeRange[1];
    
    const sizeMatch = 
      filters.sizes.length === 0 || filters.sizes.includes(debris.size);
    
    const velocityMatch = 
      filters.velocity === "all" || 
      getVelocityCategory(debris.velocity) === filters.velocity;
    
    return altitudeInRange && sizeMatch && velocityMatch;
  });
};

// **STATISTICS CALCULATION**
// Generate consistent statistics for both components
export const calculateDebrisStatistics = (debris: Debris[]) => {
  if (!debris || debris.length === 0) {
    return {
      total: 0,
      riskCounts: { high: 0, medium: 0, low: 0 },
      avgAltitude: 0,
      avgVelocity: 0,
      highRiskPercentage: 0,
    };
  }

  const riskCounts: Record<RiskLevel, number> = {
    high: debris.filter(d => calculateRisk(d) === "high").length,
    medium: debris.filter(d => calculateRisk(d) === "medium").length,
    low: debris.filter(d => calculateRisk(d) === "low").length,
  };

  const avgAltitude = Math.round(
    debris.reduce((sum, d) => sum + d.altitude, 0) / debris.length
  );

  const avgVelocity = parseFloat(
    (debris.reduce((sum, d) => sum + d.velocity, 0) / debris.length).toFixed(1)
  );

  const highRiskPercentage = Math.round((riskCounts.high / debris.length) * 100);

  return {
    total: debris.length,
    riskCounts,
    avgAltitude,
    avgVelocity,
    highRiskPercentage,
  };
};