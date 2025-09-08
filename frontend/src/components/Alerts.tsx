import React from 'react';
import { AlertTriangle, Shield, AlertCircle, Zap } from 'lucide-react';

// Define types for debris object
type Debris = {
  id: string | number;
  name: string;
  altitude: number; // in km
  velocity: number; // in km/s
  size: 'small' | 'medium' | 'large' | string;
  mass: number; // in kg
};

// Define types for filters
type Filters = {
  altitudeRange: [number, number];
  sizes: string[];
  velocity: 'slow' | 'medium' | 'fast' | 'all';
};

// Define component props
interface AlertsProps {
  debrisData: Debris[];
  filters: Filters;
}

const Alerts: React.FC<AlertsProps> = ({ debrisData, filters }) => {
  const calculateRisk = (debris: Debris): 'high' | 'medium' | 'low' => {
    if (debris.altitude < 600 && debris.velocity > 8) return 'high';
    if (debris.altitude < 1000 && debris.velocity > 7) return 'medium';
    return 'low';
  };

  const getVelocityCategory = (velocity: number): 'slow' | 'medium' | 'fast' => {
    if (velocity < 4) return 'slow';
    if (velocity < 7) return 'medium';
    return 'fast';
  };

  const filterDebris = (data: Debris[]): Debris[] => {
    return data.filter((debris) => {
      const altitudeInRange =
        debris.altitude >= filters.altitudeRange[0] &&
        debris.altitude <= filters.altitudeRange[1];

      const sizeMatch =
        filters.sizes.length === 0 || filters.sizes.includes(debris.size);

      const velocityMatch =
        getVelocityCategory(debris.velocity) === filters.velocity ||
        filters.velocity === 'all';

      return altitudeInRange && sizeMatch && velocityMatch;
    });
  };

  const filteredDebris = filterDebris(debrisData);

  const riskCounts = {
    high: filteredDebris.filter((d) => calculateRisk(d) === 'high').length,
    medium: filteredDebris.filter((d) => calculateRisk(d) === 'medium').length,
    low: filteredDebris.filter((d) => calculateRisk(d) === 'low').length,
  };

  const criticalAlerts = filteredDebris
    .filter((d) => calculateRisk(d) === 'high')
    .sort((a, b) => b.velocity - a.velocity)
    .slice(0, 3);

  return (
    <div className="space-y-6 p-6 bg-slate-900 h-full overflow-y-auto">
      <div>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
          <AlertTriangle className="h-6 w-6 text-red-400" />
          <span>Risk Assessment</span>
        </h2>

        {/* Risk Level Cards */}
        <div className="space-y-3">
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

          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-4 rounded-lg border border-yellow-400 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-6 w-6 text-yellow-900" />
                <div>
                  <h3 className="font-bold text-yellow-900">Medium Risk</h3>
                  <p className="text-yellow-800 text-sm">Moderate orbit debris</p>
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

          <div className="bg-gradient-to-r from-green-600 to-green-700 p-4 rounded-lg border border-green-500 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Shield className="h-6 w-6 text-white" />
                <div>
                  <h3 className="font-bold text-white">Low Risk</h3>
                  <p className="text-green-100 text-sm">Safe orbital parameters</p>
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
                    Altitude: <span className="text-white">{debris.altitude} km</span>
                  </div>
                  <div>
                    Velocity: <span className="text-white">{debris.velocity} km/s</span>
                  </div>
                  <div>
                    Size:{' '}
                    <span className="text-white capitalize">{debris.size}</span>
                  </div>
                  <div>
                    Mass: <span className="text-white">{debris.mass} kg</span>
                  </div>
                </div>

                <div className="mt-3 p-2 bg-red-900 bg-opacity-50 rounded border-l-4 border-red-500">
                  <p className="text-red-100 text-sm">
                    ⚠️ Collision risk due to low altitude and high velocity orbital
                    parameters
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistics */}
      {filteredDebris.length > 0 && (
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
              <span className="text-white font-semibold">
                {Math.round(
                  filteredDebris.reduce((sum, d) => sum + d.altitude, 0) /
                    filteredDebris.length
                )}{' '}
                km
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Avg Velocity:</span>
              <span className="text-white font-semibold">
                {(
                  filteredDebris.reduce((sum, d) => sum + d.velocity, 0) /
                  filteredDebris.length
                ).toFixed(1)}{' '}
                km/s
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Risk Distribution:</span>
              <span className="text-white font-semibold">
                {Math.round((riskCounts.high / filteredDebris.length) * 100)}% High
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Alerts;
