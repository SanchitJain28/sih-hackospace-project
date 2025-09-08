import { Request, Response } from "express";
import axios from "axios";
import { supabase } from "../utils/supabase/createClient";
import { TLE_DATA } from "../data/TLE-data";
import * as satellite from "satellite.js";

// Types for better type safety
interface TLEObject {
  name: string;
  norad_id: number;
  tle_line1: string;
  tle_line2: string;
  object_type: 'satellite' | 'debris';
}

interface SatellitePosition {
  satellite_id: string;
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: {
    x: number;
    y: number;
    z: number;
  } | null;
  timestamp: Date;
}

// Celestrak data sources configuration
const CELESTRAK_SOURCES = {
  satellites: {
    starlink: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle',
    stations: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle',
    active: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle',
    geo: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=geo&FORMAT=tle'
  },
  debris: {
    debris: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=debris&FORMAT=tle',
    analyst: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=analyst&FORMAT=tle'
  }
};

// Utility function to parse TLE data
const parseTLEData = (rawData: string, objectType: 'satellite' | 'debris' = 'satellite'): TLEObject[] => {
  const lines = rawData.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const tleObjects: TLEObject[] = [];

  for (let i = 0; i < lines.length; i += 3) {
    if (i + 2 >= lines.length) continue; // Skip incomplete blocks
    
    const name = lines[i];
    const tle_line1 = lines[i + 1];
    const tle_line2 = lines[i + 2];
    
    // Validate TLE format
    if (!tle_line1.startsWith('1 ') || !tle_line2.startsWith('2 ')) {
      console.warn(`Invalid TLE format for ${name}`);
      continue;
    }

    try {
      const norad_id = parseInt(tle_line1.substring(2, 7));
      if (isNaN(norad_id)) {
        console.warn(`Invalid NORAD ID for ${name}`);
        continue;
      }

      tleObjects.push({
        name,
        norad_id,
        tle_line1,
        tle_line2,
        object_type: objectType
      });
    } catch (error) {
      console.warn(`Error parsing TLE for ${name}:`, error);
    }
  }

  return tleObjects;
};

// Enhanced TLE data fetcher with multiple sources
export const fetchTLEFromCelestrak = async (source: string): Promise<string> => {
  try {
    const { data } = await axios.get(source, {
      timeout: 30000, // 30 second timeout
      headers: {
        'User-Agent': 'Space-Tracker-API/1.0'
      }
    });
    return data;
  } catch (error) {
    console.error(`Failed to fetch TLE data from ${source}:`, error);
    throw new Error(`Failed to fetch TLE data: ${error}`);
  }
};

// Test TLE parsing with satellite-js
export const testTLEParsing = async (req: Request, res: Response) => {
  try {
    const sampleTLE = TLE_DATA.split('\n').slice(0, 3);
    if (sampleTLE.length < 3) {
      return res.status(400).json({
        status: false,
        message: "Insufficient TLE data for testing"
      });
    }

    const name = sampleTLE[0].trim();
    const line1 = sampleTLE[1].trim();
    const line2 = sampleTLE[2].trim();

    // Test satellite-js parsing
    const satrec = satellite.twoline2satrec(line1, line2);
    const now = new Date();
    const positionAndVelocity = satellite.propagate(satrec, now);

    if (positionAndVelocity?.position && positionAndVelocity.velocity) {
      const gmst = satellite.gstime(now);
      const positionGd = satellite.eciToGeodetic(positionAndVelocity.position, gmst);
      
      const latitude = satellite.degreesLat(positionGd.latitude);
      const longitude = satellite.degreesLong(positionGd.longitude);
      const altitude = positionGd.height;

      return res.status(200).json({
        status: true,
        message: "TLE parsing test successful",
        data: {
          satellite: {
            name,
            norad_id: parseInt(line1.substring(2, 7))
          },
          position: {
            latitude,
            longitude,
            altitude
          },
          velocity: positionAndVelocity.velocity,
          timestamp: now
        }
      });
    } else {
      return res.status(400).json({
        status: false,
        message: "Failed to calculate satellite position"
      });
    }
  } catch (error) {
    console.error("TLE parsing test failed:", error);
    return res.status(500).json({
      status: false,
      message: "TLE parsing test failed",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// API endpoint for debris data
export const getDebrisData = async (req: Request, res: Response) => {
  try {
    const { source = 'debris' } = req.query;
    const debrisSource = CELESTRAK_SOURCES.debris[source as keyof typeof CELESTRAK_SOURCES.debris];
    
    if (!debrisSource) {
      return res.status(400).json({
        status: false,
        message: "Invalid debris source. Available sources: debris, analyst"
      });
    }

    const rawData = await fetchTLEFromCelestrak(debrisSource);
    const debrisTLEs = parseTLEData(rawData, 'debris');

    res.status(200).json({
      status: true,
      data: {
        source: source,
        count: debrisTLEs.length,
        objects: debrisTLEs
      },
      message: "Debris data fetched successfully"
    });
  } catch (error) {
    console.error("Error fetching debris data:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch debris data",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// API endpoint for space weather data
export const getSpaceWeatherData = async (req: Request, res: Response) => {
  try {
    // Fetch space weather data from NOAA or other sources
    const spaceWeatherUrl = 'https://services.swpc.noaa.gov/json/solar-cycle/observed-solar-cycle-indices.json';
    
    const { data: solarData } = await axios.get(spaceWeatherUrl, {
      timeout: 15000
    });

    // You can also add more space weather data sources
    const geostormUrl = 'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json';
    const { data: geostormData } = await axios.get(geostormUrl, {
      timeout: 15000
    });

    res.status(200).json({
      status: true,
      data: {
        solar_cycle: solarData.slice(-30), // Last 30 data points
        planetary_k_index: geostormData.slice(-24), // Last 24 hours
        timestamp: new Date()
      },
      message: "Space weather data fetched successfully"
    });
  } catch (error) {
    console.error("Error fetching space weather data:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch space weather data",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Enhanced satellite data fetching with multiple sources
export const getSatelliteData = async (req: Request, res: Response) => {
  try {
    const { source = 'starlink', calculate_positions = 'false' } = req.query;
    const satelliteSource = CELESTRAK_SOURCES.satellites[source as keyof typeof CELESTRAK_SOURCES.satellites];
    
    if (!satelliteSource) {
      return res.status(400).json({
        status: false,
        message: "Invalid satellite source. Available sources: starlink, stations, active, geo"
      });
    }

    const rawData = await fetchTLEFromCelestrak(satelliteSource);
    const satelliteTLEs = parseTLEData(rawData, 'satellite');

    let response: any = {
      status: true,
      data: {
        source: source,
        count: satelliteTLEs.length,
        objects: satelliteTLEs
      },
      message: "Satellite data fetched successfully"
    };

    // Calculate current positions if requested
    if (calculate_positions === 'true') {
      const positions: any[] = [];
      const now = new Date();

      for (const tle of satelliteTLEs.slice(0, 10)) { // Limit to first 10 for performance
        try {
          const satrec = satellite.twoline2satrec(tle.tle_line1, tle.tle_line2);
          const positionAndVelocity = satellite.propagate(satrec, now);

          if (positionAndVelocity?.position) {
            const gmst = satellite.gstime(now);
            const positionGd = satellite.eciToGeodetic(positionAndVelocity.position, gmst);
            
            positions.push({
              norad_id: tle.norad_id,
              name: tle.name,
              latitude: satellite.degreesLat(positionGd.latitude),
              longitude: satellite.degreesLong(positionGd.longitude),
              altitude: positionGd.height,
              velocity: positionAndVelocity.velocity
            });
          }
        } catch (error) {
          console.warn(`Failed to calculate position for ${tle.name}:`, error);
        }
      }

      response.data.current_positions = positions;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching satellite data:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch satellite data",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Improved database save function with batch processing and error handling
export const saveSatelliteDataToDatabase = async (req: Request, res: Response) => {
  try {
    const { 
      source = 'starlink', 
      calculate_positions = 'true',
      object_type = 'satellite' 
    } = req.body;

    let rawData: string;
    
    // Fetch fresh data or use cached data
    if (source === 'fast') {
      rawData = TLE_DATA;
    } else {
      const sourceUrl = object_type === 'debris' 
        ? CELESTRAK_SOURCES.debris[source as keyof typeof CELESTRAK_SOURCES.debris]
        : CELESTRAK_SOURCES.satellites[source as keyof typeof CELESTRAK_SOURCES.satellites];
      
      if (!sourceUrl) {
        return res.status(400).json({
          status: false,
          message: "Invalid source specified"
        });
      }
      
      rawData = await fetchTLEFromCelestrak(sourceUrl);
    }

    const tleObjects = parseTLEData(rawData, object_type);
    
    if (tleObjects.length === 0) {
      return res.status(400).json({
        status: false,
        message: "No valid TLE objects found"
      });
    }

    let savedCount = 0;
    let positionCount = 0;
    const chunkSize = 100; // Smaller chunks for better error handling

    // Save satellites/debris in chunks
    for (let i = 0; i < tleObjects.length; i += chunkSize) {
      const chunk = tleObjects.slice(i, i + chunkSize);
      
      try {
        const { error, count } = await supabase
          .from("satellites")
          .upsert(chunk, { 
            onConflict: 'norad_id',
            count: 'exact'
          });
        
        if (error) {
          console.error(`Insert error for chunk ${i}-${i + chunkSize}:`, error);
        } else {
          savedCount += count || 0;
        }
      } catch (error) {
        console.error(`Database error for chunk ${i}-${i + chunkSize}:`, error);
      }
    }

    // Calculate and save positions if requested
    if (calculate_positions === 'true' || calculate_positions === true) {
      const now = new Date();
      const positions: SatellitePosition[] = [];

      for (const tle of tleObjects) {
        try {
          // Get satellite ID from database
          const { data: satData, error } = await supabase
            .from("satellites")
            .select("id")
            .eq("norad_id", tle.norad_id)
            .single();

          if (error || !satData) continue;

          const satrec = satellite.twoline2satrec(tle.tle_line1, tle.tle_line2);
          const positionAndVelocity = satellite.propagate(satrec, now);

          if (!positionAndVelocity?.position) continue;

          const gmst = satellite.gstime(now);
          const positionGd = satellite.eciToGeodetic(positionAndVelocity.position, gmst);

          const position: SatellitePosition = {
            satellite_id: satData.id,
            latitude: satellite.degreesLat(positionGd.latitude),
            longitude: satellite.degreesLong(positionGd.longitude),
            altitude: positionGd.height,
            velocity: positionAndVelocity.velocity ? {
              x: positionAndVelocity.velocity.x,
              y: positionAndVelocity.velocity.y,
              z: positionAndVelocity.velocity.z
            } : null,
            timestamp: now
          };

          positions.push(position);
        } catch (error) {
          console.warn(`Failed to calculate position for ${tle.name}:`, error);
        }
      }

      // Save positions in chunks
      for (let i = 0; i < positions.length; i += chunkSize) {
        const chunk = positions.slice(i, i + chunkSize);
        
        try {
          const { error, count } = await supabase
            .from("satellite_positions")
            .insert(chunk, { count: 'exact' });
          
          if (error) {
            console.error(`Position insert error for chunk ${i}-${i + chunkSize}:`, error);
          } else {
            positionCount += count || 0;
          }
        } catch (error) {
          console.error(`Position database error for chunk ${i}-${i + chunkSize}:`, error);
        }
      }
    }

    return res.status(200).json({
      status: true,
      message: `Successfully processed ${tleObjects.length} objects`,
      data: {
        total_objects: tleObjects.length,
        saved_objects: savedCount,
        calculated_positions: positionCount,
        source: source,
        object_type: object_type
      }
    });

  } catch (error) {
    console.error("Database save error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to save data to database",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Original functions (updated for consistency)
export const viewTheSpace = async (req: Request, res: Response) => {
  return res.status(200).json({
    status: true,
    message: "You are Viewing The Space!! Enjoy",
    endpoints: {
      debris: "/api/debris",
      spaceweather: "/api/spaceweather", 
      satellites: "/api/satellites",
      test: "/api/test-tle"
    }
  });
};

export const getTLEData = async (req: Request, res: Response) => {
  try {
    const rawData = await fetchTLEFromCelestrak(CELESTRAK_SOURCES.satellites.starlink);
    
    res.status(200).json({
      status: true,
      data: rawData,
      message: "TLE data fetched successfully",
      code: "SUCCESS"
    });
  } catch (error) {
    console.error("Error fetching TLE data:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch TLE data",
      error: error instanceof Error ? error.message : 'Internal Server Error'
    });
  }
};

export const getTLEDataFast = async (req: Request, res: Response) => {
  try {
    res.status(200).json({
      status: true,
      data: TLE_DATA,
      message: "TLE data fetched successfully (cached)",
      code: "SUCCESS"
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error"
    });
  }
};