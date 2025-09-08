import React from "react";
import {
  Settings,
  RotateCcw,
  Filter,
  Play,
  Pause,
  SkipForward,
  SkipBack,
} from "lucide-react";

// ## Type Definitions

// It's good practice to share these types across components that use them.
// You could move these to a central `types.ts` file.
type DebrisSize = "small" | "medium" | "large";
type VelocityCategory = "slow" | "medium" | "fast";

// Interface for the filter state object
interface Filters {
  altitudeRange: [number, number];
  sizes: DebrisSize[];
  velocity: VelocityCategory | "all";
}

// Interface for the component's props
interface ControlPanelProps {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  currentTime: number;
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>;
}

// ## Component Implementation

const ControlPanel: React.FC<ControlPanelProps> = ({
  filters,
  setFilters,
  isPlaying,
  setIsPlaying,
  currentTime,
  setCurrentTime,
}) => {
  const handleAltitudeChange = (value: string, index: 0 | 1) => {
    // Create a mutable copy of the tuple
    const newRange: [number, number] = [...filters.altitudeRange];
    newRange[index] = parseInt(value, 10);
    setFilters((prev) => ({ ...prev, altitudeRange: newRange }));
  };

  const handleSizeChange = (size: DebrisSize) => {
    const newSizes = filters.sizes.includes(size)
      ? filters.sizes.filter((s) => s !== size)
      : [...filters.sizes, size];
    setFilters((prev) => ({ ...prev, sizes: newSizes }));
  };

  const handleVelocityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters((prev) => ({
      ...prev,
      velocity: e.target.value as VelocityCategory | "all",
    }));
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(parseInt(e.target.value, 10));
  };

  const resetFilters = () => {
    setFilters({
      altitudeRange: [0, 40000],
      sizes: [],
      velocity: "all",
    });
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const DEBRIS_SIZES: DebrisSize[] = ["small", "medium", "large"];

  return (
    <div className="w-80 bg-gradient-to-b from-slate-900 to-slate-800 text-white shadow-2xl border-r border-slate-700 h-full overflow-y-auto">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center space-x-3 mb-4">
          <Settings className="h-6 w-6 text-cyan-400" />
          <h2 className="text-xl font-bold">Control Panel</h2>
        </div>

        <button
          onClick={resetFilters}
          className="flex items-center space-x-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors w-full justify-center"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Reset Filters</span>
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Altitude Range */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-cyan-400" />
            <label className="font-semibold">Altitude Range (km)</label>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-300 block mb-1">
                Minimum: {filters.altitudeRange[0]} km
              </label>
              <input
                placeholder="Type range"
                type="range"
                min="0"
                max="40000"
                step="100"
                value={filters.altitudeRange[0]}
                onChange={(e) => handleAltitudeChange(e.target.value, 0)}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            <div>
              <label className="text-sm text-gray-300 block mb-1">
                Maximum: {filters.altitudeRange[1]} km
              </label>
              <input
                title="range"
                type="range"
                min="0"
                max="40000"
                step="100"
                value={filters.altitudeRange[1]}
                onChange={(e) => handleAltitudeChange(e.target.value, 1)}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
          </div>
        </div>

        {/* Size Filters */}
        <div className="space-y-3">
          <label className="font-semibold">Debris Size</label>
          <div className="space-y-2">
            {DEBRIS_SIZES.map((size) => (
              <label
                key={size}
                className="flex items-center space-x-3 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={filters.sizes.includes(size)}
                  onChange={() => handleSizeChange(size)}
                  className="w-4 h-4 text-cyan-500 bg-slate-700 border-slate-600 rounded focus:ring-cyan-500"
                />
                <span className="capitalize">{size}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Velocity Filter */}
        <div className="space-y-3">
          <label className="font-semibold">Velocity Category</label>
          <select
            title="value"
            value={filters.velocity}
            onChange={handleVelocityChange}
            className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
          >
            <option value="all">All Velocities</option>
            <option value="slow">Slow (&lt; 4 km/s)</option>
            <option value="medium">Medium (4-7 km/s)</option>
            <option value="fast">Fast (&gt; 7 km/s)</option>
          </select>
        </div>

        {/* Time Controls */}
        <div className="space-y-4 pt-4 border-t border-slate-700">
          <label className="font-semibold">Simulation Controls</label>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentTime((prev) => Math.max(0, prev - 10))}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              aria-label="Skip back"
            >
              <SkipBack className="h-4 w-4" />
            </button>

            <button
              onClick={togglePlayPause}
              className="p-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
              aria-label={isPlaying ? "Pause simulation" : "Play simulation"}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </button>

            <button
              onClick={() => setCurrentTime((prev) => Math.min(100, prev + 10))}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              aria-label="Skip forward"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>

          <div>
            <label className="text-sm text-gray-300 block mb-2">
              Time: {currentTime}%
            </label>
            <input
              placeholder="type range"
              name="range"
              type="range"
              min="0"
              max="100"
              value={currentTime}
              onChange={handleTimeChange}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
        </div>
      </div>

      {/* Note: In a standard React setup (without Next.js), you'd typically use a <style> tag or a CSS file. */}
      <style>
        {`
          .slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #06b6d4; /* Tailwind's cyan-500 */
            cursor: pointer;
            transition: background-color 0.2s ease-in-out;
          }
          .slider::-webkit-slider-thumb:hover {
            background: #0891b2; /* Tailwind's cyan-600 */
          }
          
          .slider::-moz-range-thumb {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #06b6d4;
            cursor: pointer;
            border: none;
            transition: background-color 0.2s ease-in-out;
          }
          .slider::-moz-range-thumb:hover {
            background: #0891b2;
          }
        `}
      </style>
    </div>
  );
};

export default ControlPanel;
