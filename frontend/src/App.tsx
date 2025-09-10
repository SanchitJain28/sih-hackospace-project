import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import Globe from './components/Globe';
import ControlPanel from './components/ControlPanel';
import Alerts from './components/Alerts';
import { debrisJson } from './data/debrisData';
import axios from 'axios';

// Type Definitions
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

interface ApiDebrisData {
  id: string;
  satellite_id: string;
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: {
    x: number;
    y: number;
    z: number;
  };
  timestamp: string;
  satellites: {
    object: string;
  };
}

interface Filters {
  altitudeRange: [number, number];
  sizes: DebrisSize[];
  velocity: VelocityCategory | 'all';
}

// Helper Functions
const getVelocityCategory = (velocity: number): VelocityCategory => {
  if (velocity < 4) return 'slow';
  if (velocity < 7) return 'medium';
  return 'fast';
};

const calculateVelocityMagnitude = (velocity: { x: number; y: number; z: number }): number => {
  return Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);
};

const estimateSize = (altitude: number, velocityMagnitude: number): DebrisSize => {
  // Simple heuristic based on altitude and velocity
  if (altitude < 400 || velocityMagnitude > 8) return 'large';
  if (altitude < 800 || velocityMagnitude > 6) return 'medium';
  return 'small';
};

const estimateMass = (size: DebrisSize): number => {
  switch (size) {
    case 'large': return Math.random() * 1000 + 500; // 500-1500 kg
    case 'medium': return Math.random() * 500 + 50;  // 50-550 kg
    case 'small': return Math.random() * 50 + 1;     // 1-51 kg
  }
};

const transformApiData = (apiData: ApiDebrisData[]): Debris[] => {
  return apiData
    .filter((item) => {
      // Validate required fields
      const isValid = 
        item.latitude !== undefined && 
        item.longitude !== undefined &&
        item.altitude !== undefined &&
        item.velocity !== undefined &&
        typeof item.latitude === 'number' &&
        typeof item.longitude === 'number' &&
        typeof item.altitude === 'number' &&
        !isNaN(item.latitude) &&
        !isNaN(item.longitude) &&
        !isNaN(item.altitude) &&
        item.latitude >= -90 && item.latitude <= 90 &&
        item.longitude >= -180 && item.longitude <= 180 &&
        item.altitude >= 0;

      if (!isValid) {
        console.warn('Invalid debris data:', item);
      }
      return isValid;
    })
    .map((item) => {
      const velocityMagnitude = calculateVelocityMagnitude(item.velocity);
      const size = estimateSize(item.altitude, velocityMagnitude);
      
      return {
        id: item.id,
        name: `Debris-${item.id.slice(0, 8)}`, // Generate name from ID
        altitude: item.altitude,
        velocity: velocityMagnitude,
        size: size,
        mass: estimateMass(size),
        type: item.satellites?.object || 'debris',
        lon: item.longitude,
        lat: item.latitude,
      };
    });
};

// Component Implementation
const App: React.FC = () => {
  const [filters, setFilters] = useState<Filters>({
    altitudeRange: [0, 40000],
    sizes: [],
    velocity: 'all'
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [debrisData, setDebrisData] = useState<Debris[]>(debrisJson as Debris[]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRealDebris = async () => {
    console.log("Fetching real debris data...");
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get("http://localhost:3000/fetch-debris-positions");
      const apiData = response.data?.data;
      
      if (!apiData || !Array.isArray(apiData)) {
        throw new Error("Invalid API response format");
      }
      
      console.log(`Received ${apiData.length} debris items from API`);
      
      const transformedData = transformApiData(apiData);
      console.log(`Transformed to ${transformedData.length} valid debris items`);
      
      setDebrisData(transformedData);
    } catch (error) {
      console.error("Error fetching debris data:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch debris data");
      
      // Fallback to mock data
      console.log("Falling back to mock data");
      setDebrisData(debrisJson as Debris[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRealDebris();
  }, []);

  // Memoize the filtered debris list
  const filteredDebris = useMemo(() => {
    return debrisData.filter(debris => {
      const altitudeInRange = debris.altitude >= filters.altitudeRange[0] && 
                              debris.altitude <= filters.altitudeRange[1];
      const sizeMatch = filters.sizes.length === 0 || filters.sizes.includes(debris.size);
      const velocityMatch = getVelocityCategory(debris.velocity) === filters.velocity || 
                            filters.velocity === 'all';
      
      return altitudeInRange && sizeMatch && velocityMatch;
    });
  }, [debrisData, filters]);
  
  // Calculate overall risk level
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

  // Auto-advance time when simulation is playing
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

      {/* Loading/Error States */}
      {loading && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg z-10">
          Loading debris data...
        </div>
      )}
      
      {error && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg z-10">
          {error}
          <button 
            onClick={fetchRealDebris} 
            className="ml-2 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}
      
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