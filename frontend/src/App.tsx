import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import Globe from './components/Globe';
import ControlPanel from './components/ControlPanel';
import Alerts from './components/Alerts';
import { debrisJson } from './data/debrisData';
// Import your debris data - adjust the path as needed

// ## Type Definitions
// It's good practice to place these in a shared `types.ts` file in a larger application.

type DebrisSize = 'small' | 'medium' | 'large';
type VelocityCategory = 'slow' | 'medium' | 'fast';
type RiskLevel = 'high' | 'medium' | 'low';

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
  velocity: VelocityCategory | 'all';
}

// Cast the imported JSON data to our Debris array type.
const debrisData: Debris[] = debrisJson as Debris[];

// ## Helper Function
const getVelocityCategory = (velocity: number): VelocityCategory => {
  if (velocity < 4) return 'slow';
  if (velocity < 7) return 'medium';
  return 'fast';
};

// ## Component Implementation

const App: React.FC = () => {
  const [filters, setFilters] = useState<Filters>({
    altitudeRange: [0, 40000],
    sizes: [],
    velocity: 'all'
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);

  // Memoize the filtered debris list to avoid recalculating on every render.
  const filteredDebris = useMemo(() => {
    return debrisData.filter(debris => {
      const altitudeInRange = debris.altitude >= filters.altitudeRange[0] && 
                              debris.altitude <= filters.altitudeRange[1];
      const sizeMatch = filters.sizes.length === 0 || filters.sizes.includes(debris.size);
      const velocityMatch = getVelocityCategory(debris.velocity) === filters.velocity || 
                            filters.velocity === 'all';
      
      return altitudeInRange && sizeMatch && velocityMatch;
    });
  }, [filters]);
  
  // Calculate overall risk level based on the memoized filtered list.
  const overallRisk = useMemo<RiskLevel>(() => {
    if (filteredDebris.length === 0) return 'low';

    const highRiskCount = filteredDebris.filter(d => 
      d.altitude < 600 && d.velocity > 8
    ).length;
    
    const riskPercentage = highRiskCount / filteredDebris.length;
    
    if (riskPercentage > 0.3) return 'high';
    if (riskPercentage > 0.1) return 'medium';
    return 'low';
  }, [filteredDebris]);

  // Effect to auto-advance time when the simulation is playing.
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setCurrentTime(prev => (prev >= 100 ? 0 : prev + 1));
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isPlaying]);

  return (
    <div className="h-screen bg-black text-white overflow-hidden flex flex-col">
      <Header 
        debrisCount={filteredDebris.length}
        riskLevel={overallRisk}
      />

      {/* <CesiumGlobe debrisData={debrisJson}/> */}
      
      <div className="flex flex-1 h-[calc(100vh-80px)]">
        <ControlPanel 
          filters={filters}
          setFilters={setFilters}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          currentTime={currentTime}
          setCurrentTime={setCurrentTime}
        />
        
        <div className="flex-1 relative">
          <Globe 
            debrisData={debrisData}
            filters={filters}
          />
        </div>
        
        <div className="w-96">
          <Alerts 
            debrisData={debrisData}
            filters={filters}
          />
        </div>
      </div>
    </div>
  );
}

export default App;