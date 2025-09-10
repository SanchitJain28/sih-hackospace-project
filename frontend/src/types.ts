// Shared type definitions for the Space Debris Tracking System

export type DebrisSize = "small" | "medium" | "large";
export type VelocityCategory = "slow" | "medium" | "fast";
export type RiskLevel = "high" | "medium" | "low";

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

// Props interfaces
export interface GlobeProps {
  debrisData: Debris[];
  filters: Filters;
  fullScreen?: boolean;
}

export interface ControlPanelProps {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  currentTime: number;
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>;
}

// Utility type for velocity categorization
export const VELOCITY_CATEGORIES = {
  slow: { min: 0, max: 4, label: "Slow (< 4 km/s)" },
  medium: { min: 4, max: 7, label: "Medium (4-7 km/s)" },
  fast: { min: 7, max: Infinity, label: "Fast (> 7 km/s)" }
} as const;

// Constants
export const DEBRIS_SIZES: DebrisSize[] = ["small", "medium", "large"];
export const DEFAULT_FILTERS: Filters = {
  altitudeRange: [0, 40000],
  sizes: [],
  velocity: "all",
};