import React from "react";
import { AlertTriangle, Shield, AlertCircle, Zap } from "lucide-react";

// ---- Type Definitions ----
type RiskLevel = "high" | "medium" | "low";
type DebrisSize = "small" | "medium" | "large";
type VelocityCategory = "slow" | "medium" | "fast";

interface Debris {
  id: string | number;
  name: string;
  altitude: number;
  velocity: number;
  size: DebrisSize;
  mass: number;
  type: string;
  lon: number;
  lat: number;
}

interface Filters {
  altitudeRange: [number, number];
  sizes: DebrisSize[];
  velocity: VelocityCategory | "all";
}

interface AlertsProps {
  debrisData: Debris[];
  filters: Filters;
}

// ---- Helper Functions ----
const calculateRisk = (debris: Debris): RiskLevel => {
  if (debris.altitude < 400 && debris.velocity > 7) return "high";
  if (debris.altitude < 550 && debris.velocity > 5) return "medium";
  return "low";
};

const getVelocityCategory = (velocity: number): VelocityCategory => {
  if (velocity < 4) return "slow";
  if (velocity <= 7) return "medium";
  return "fast";
};

// ---- Component ----
const Alerts: React.FC<AlertsProps> = ({ debrisData, filters }) => {
  // Apply filters from ControlPanel
  const filteredDebris = React.useMemo(() => {
    return debrisData.filter((debris) => {
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
  }, [debrisData, filters]);

  // Risk distribution
  const riskCounts: Record<RiskLevel, number> = {
    high: filteredDebris.filter((d) => calculateRisk(d) === "high").length,
    medium: filteredDebris.filter((d) => calculateRisk(d) === "medium").length,
    low: filteredDebris.filter((d) => calculateRisk(d) === "low").length,
  };

  // Critical alerts = top 3 high-risk debris
  const criticalAlerts = filteredDebris
    .filter((d) => calculateRisk(d) === "high")
    .sort((a, b) => b.velocity - a.velocity)
    .slice(0, 3);

  // Stats
  const calculateAverage = (items: Debris[], key: keyof Debris): number => {
    if (items.length === 0) return 0;
    const total = items.reduce((sum, item) => sum + (item[key] as number), 0);
    return total / items.length;
  };

  const avgAltitude = Math.round(calculateAverage(filteredDebris, "altitude"));
  const avgVelocity = calculateAverage(filteredDebris, "velocity").toFixed(1);
  const highRiskPercentage =
    filteredDebris.length > 0
      ? Math.round((riskCounts.high / filteredDebris.length) * 100)
      : 0;

  // ---- UI ----
  return (
    <div className="space-y-6 p-6 bg-slate-900 h-full overflow-y-auto">
      {/* Risk Assessment */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
          <AlertTriangle className="h-6 w-6 text-red-400" />
          <span>Risk Assessment</span>
        </h2>

        <div className="space-y-3">
          {/* High Risk */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 p-4 rounded-lg border border-red-500 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-6 w-6 text-white" />
                <div>
                  <h3 className="font-bold text-white">High Risk</h3>
                  <p className="text-red-100 text-sm">
                    Low altitude + High velocity
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  {riskCounts.high}
                </div>
                <div className="text-xs text-red-100 uppercase">Objects</div>
              </div>
            </div>
          </div>

          {/* Medium Risk */}
          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-4 rounded-lg border border-yellow-400 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-6 w-6 text-yellow-900" />
                <div>
                  <h3 className="font-bold text-yellow-900">Medium Risk</h3>
                  <p className="text-yellow-800 text-sm">
                    Moderate orbit debris
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-yellow-900">
                  {riskCounts.medium}
                </div>
                <div className="text-xs text-yellow-800 uppercase">Objects</div>
              </div>
            </div>
          </div>

          {/* Low Risk */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 p-4 rounded-lg border border-green-500 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Shield className="h-6 w-6 text-white" />
                <div>
                  <h3 className="font-bold text-white">Low Risk</h3>
                  <p className="text-green-100 text-sm">
                    Safe orbital parameters
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  {riskCounts.low}
                </div>
                <div className="text-xs text-green-100 uppercase">Objects</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
            <Zap className="h-5 w-5 text-yellow-400" />
            <span>Critical Alerts</span>
          </h3>

          <div className="space-y-3">
            {criticalAlerts.map((debris) => (
              <div
                key={debris.id}
                className="bg-slate-800 border border-red-500 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-red-400">{debris.name}</h4>
                  <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                    HIGH RISK
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
                  <div>
                    Altitude:{" "}
                    <span className="text-white">{debris.altitude} km</span>
                  </div>
                  <div>
                    Velocity:{" "}
                    <span className="text-white">{debris.velocity.toFixed(1)}{" "}
                      km/s</span>
                  </div>
                  <div>
                    Size:{" "}
                    <span className="text-white capitalize">{debris.size}</span>
                  </div>
                  <div>
                    Mass: <span className="text-white">{debris.mass} kg</span>
                  </div>
                </div>

                <div className="mt-3 p-2 bg-red-900 bg-opacity-50 rounded border-l-4 border-red-500">
                  <p className="text-red-100 text-sm">
                    ⚠️ Collision risk due to low altitude and high velocity
                    orbital parameters
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h3 className="font-semibold text-white mb-3">Statistics</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Total Objects:</span>
            <span className="text-white font-semibold">
              {filteredDebris.length}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Avg Altitude:</span>
            <span className="text-white font-semibold">{avgAltitude} km</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Avg Velocity:</span>
            <span className="text-white font-semibold">{avgVelocity} km/s</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">High-Risk Objects:</span>
            <span className="text-white font-semibold">
              {highRiskPercentage}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Alerts;
