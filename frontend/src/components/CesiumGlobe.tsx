/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo, useCallback } from 'react';
import { 
  Viewer, 
  Entity, 
  PointGraphics, 
  EllipseGraphics,
  CameraFlyTo
} from 'resium';
import * as Cesium from 'cesium';

// Set your Cesium Ion access token here
const CESIUM_ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyYzQyYjZkMi02N2MyLTQxYjQtYWI4YS1lNGE5YzMyOGVmNjAiLCJpZCI6MzM5Mjg1LCJpYXQiOjE3NTczMTE3Njh9.d5tL7TnhBysu-6-dof3ws9bSvQex7322RBl-eOn_xuU";

// Set the token
if (CESIUM_ACCESS_TOKEN) {
  Cesium.Ion.defaultAccessToken = CESIUM_ACCESS_TOKEN;
}

// Type Definitions
type DebrisSize = "small" | "medium" | "large";
type VelocityCategory = "slow" | "medium" | "fast";
type RiskLevel = "high" | "medium" | "low";

interface Debris {
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

interface Filters {
  altitudeRange: [number, number];
  sizes: DebrisSize[];
  velocity: VelocityCategory | "all";
}

interface GlobeProps {
  debrisData: Debris[];
  filters: Filters;
  fullScreen?: boolean;
}

// Sample debris data for demonstration
const sampleDebrisData: Debris[] = [
  { id: 1, name: "Satellite Fragment A", altitude: 550, velocity: 7.8, size: "large", mass: 150, type: "fragment", lon: 0, lat: 0 },
  { id: 2, name: "Rocket Body B", altitude: 800, velocity: 7.2, size: "large", mass: 2500, type: "rocket body", lon: 45, lat: 30 },
  { id: 3, name: "Debris Piece C", altitude: 400, velocity: 8.1, size: "small", mass: 5, type: "fragment", lon: -120, lat: 35 },
  { id: 4, name: "Solar Panel D", altitude: 1200, velocity: 6.8, size: "medium", mass: 80, type: "solar panel", lon: 120, lat: -20 },
  { id: 5, name: "Antenna Fragment E", altitude: 350, velocity: 8.5, size: "small", mass: 2, type: "antenna", lon: -75, lat: 40 },
];

const defaultFilters: Filters = {
  altitudeRange: [0, 2000],
  sizes: ["small", "medium", "large"],
  velocity: "all"
};

const CesiumResiumGlobe: React.FC<GlobeProps> = ({ 
  debrisData = sampleDebrisData, 
  filters = defaultFilters, 
  fullScreen = false 
}) => {
  const [selectedDebris, setSelectedDebris] = useState<Debris | null>(null);
  const [, setViewer] = useState<Cesium.Viewer | null>(null);

  // Utility Functions
  const calculateRisk = useCallback((debris: Debris): RiskLevel => {
    if (debris.altitude < 600 && debris.velocity > 8) return "high";
    if (debris.altitude < 1000 && debris.velocity > 7) return "medium";
    return "low";
  }, []);

  const getDebrisColor = useCallback((debris: Debris): Cesium.Color => {
    const risk = calculateRisk(debris);
    if (risk === "high") return Cesium.Color.RED;
    if (risk === "medium") return Cesium.Color.ORANGE;
    return Cesium.Color.LIMEGREEN;
  }, [calculateRisk]);

  const getDebrisRenderSize = useCallback((size: DebrisSize): number => {
    if (size === "large") return 10;
    if (size === "medium") return 7;
    return 5;
  }, []);

  const getVelocityCategory = useCallback((velocity: number): VelocityCategory => {
    if (velocity < 4) return "slow";
    if (velocity < 7) return "medium";
    return "fast";
  }, []);

  // Filter debris data
  const filteredDebris = useMemo(() => {
    return debrisData.filter((debris) => {
      const altitudeInRange =
        debris.altitude >= filters.altitudeRange[0] &&
        debris.altitude <= filters.altitudeRange[1];
      const sizeMatch =
        filters.sizes.length === 0 || filters.sizes.includes(debris.size);
      const velocityMatch =
        getVelocityCategory(debris.velocity) === filters.velocity ||
        filters.velocity === "all";
      return altitudeInRange && sizeMatch && velocityMatch;
    });
  }, [debrisData, filters, getVelocityCategory]);

  // Handle entity click
  const handleEntityClick = useCallback((entity: Cesium.Entity) => {
    const debrisData = (entity as any).debrisData;
    if (debrisData) {
      setSelectedDebris(debrisData);
    } else {
      setSelectedDebris(null);
    }
  }, []);

  // Handle viewer ready
  const handleViewerReady = useCallback((viewer: Cesium.Viewer) => {
    setViewer(viewer);
    
    // Configure viewer
    viewer.scene.globe.enableLighting = true;
    viewer.scene.backgroundColor = Cesium.Color.BLACK;
    viewer.scene.globe.showGroundAtmosphere = true;
    viewer.scene.globe.atmosphereHueShift = -0.04;
    viewer.scene.globe.atmosphereBrightnessShift = -0.1;
    viewer.scene.globe.atmosphereSaturationShift = 0.25;

    // Set up click handler
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
    handler.setInputAction((event: any) => {
      const pickedObject = viewer.scene.pick(event.position);
      if (Cesium.defined(pickedObject) && (pickedObject.id as any)?.debrisData) {
        setSelectedDebris((pickedObject.id as any).debrisData);
      } else {
        setSelectedDebris(null);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }, []);

  // Container styles
  const containerClass = fullScreen
    ? "fixed inset-0 w-screen h-screen z-50"
    : "relative w-full h-full min-h-[400px]";

  const cameraDestination = Cesium.Cartesian3.fromDegrees(0, 20, 15000000);
  const cameraOrientation = {
    heading: Cesium.Math.toRadians(0),
    pitch: Cesium.Math.toRadians(-60),
    roll: 0,
  };

  return (
    <div className={containerClass}>
      <Viewer
        full={fullScreen}
        timeline={false}
        animation={false}
        baseLayerPicker={false}
        fullscreenButton={false}
        vrButton={false}
        geocoder={false}
        homeButton={false}
        infoBox={false}
        sceneModePicker={false}
        selectionIndicator={false}
        navigationHelpButton={false}
        creditContainer={document.createElement("div")}
        ref={(ref) => {
          if (ref?.cesiumElement) {
            handleViewerReady(ref.cesiumElement);
          }
        }}
        style={{
          width: '100%',
          height: fullScreen ? '100vh' : '400px',
        }}
      >
        <CameraFlyTo
          destination={cameraDestination}
          orientation={cameraOrientation}
          duration={0}
        />
        
        {filteredDebris.map((debris) => {
          const position = Cesium.Cartesian3.fromDegrees(
            debris.lon,
            debris.lat,
            debris.altitude * 1000 // altitude from km to meters
          );
          const color = getDebrisColor(debris);
          const earthRadius = 6371000; // meters
          const orbitRadius = earthRadius + debris.altitude * 1000;

          return (
            <Entity
              key={debris.id}
              position={position}
              onClick={handleEntityClick}
              ref={(entity) => {
                if (entity?.cesiumElement) {
                  (entity.cesiumElement as any).debrisData = debris;
                }
              }}
            >
              <PointGraphics
                pixelSize={getDebrisRenderSize(debris.size)}
                color={color}
                outlineColor={Cesium.Color.WHITE.withAlpha(0.7)}
                outlineWidth={1}
                scaleByDistance={new Cesium.NearFarScalar(1.5e5, 1.5, 8.0e6, 0.5)}
              />
              {debris.altitude < 2000 && (
                <EllipseGraphics
                  semiMajorAxis={orbitRadius}
                  semiMinorAxis={orbitRadius}
                  material={color.withAlpha(0.2)}
                  height={debris.altitude * 1000}
                  outline={true}
                  outlineColor={color.withAlpha(0.4)}
                  outlineWidth={1}
                />
              )}
            </Entity>
          );
        })}
      </Viewer>

      {/* Selected Debris Info Panel */}
      {selectedDebris && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-80 text-white p-4 rounded-lg backdrop-blur-sm border border-cyan-500 shadow-lg w-64 animate-fade-in">
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-lg text-cyan-300 mb-2">
              {selectedDebris.name}
            </h3>
            <button
              onClick={() => setSelectedDebris(null)}
              className="text-gray-400 hover:text-white text-xl leading-none"
            >
              ×
            </button>
          </div>
          <div className="space-y-1 text-sm">
            <div>
              ID:{" "}
              <span className="text-cyan-300 font-mono">
                {selectedDebris.id}
              </span>
            </div>
            <div>
              Altitude:{" "}
              <span className="text-cyan-300">
                {selectedDebris.altitude} km
              </span>
            </div>
            <div>
              Size:{" "}
              <span className="text-cyan-300 capitalize">
                {selectedDebris.size}
              </span>
            </div>
            <div>
              Velocity:{" "}
              <span className="text-cyan-300">
                {selectedDebris.velocity} km/s
              </span>
            </div>
            <div>
              Mass:{" "}
              <span className="text-cyan-300">{selectedDebris.mass} kg</span>
            </div>
            <div>
              Type:{" "}
              <span className="text-cyan-300 capitalize">
                {selectedDebris.type}
              </span>
            </div>
            <div>
              Risk:{" "}
              <span
                className={`capitalize font-bold ${
                  calculateRisk(selectedDebris) === "high"
                    ? "text-red-400"
                    : calculateRisk(selectedDebris) === "medium"
                    ? "text-yellow-400"
                    : "text-green-400"
                }`}
              >
                {calculateRisk(selectedDebris)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-60 text-white p-3 rounded-lg backdrop-blur-sm border border-slate-700">
        <div className="text-xs space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full border border-red-300"></div>
            <span>High Risk</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-orange-400 rounded-full border border-orange-200"></div>
            <span>Medium Risk</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-lime-500 rounded-full border border-lime-300"></div>
            <span>Low Risk</span>
          </div>
        </div>
      </div>

      {/* Status Panel */}
      <div className="absolute top-4 right-4 bg-black bg-opacity-60 text-white p-2 rounded text-xs font-mono">
        <div>Resium: Ready</div>
        <div>Total Debris: {debrisData?.length || 0}</div>
        <div>Visible: {filteredDebris.length}</div>
      </div>

      {/* Full Screen Exit Button */}
      {fullScreen && (
        <button
          onClick={() => console.log('Exit full screen requested')}
          className="absolute top-4 right-20 bg-black bg-opacity-60 text-white p-2 rounded text-xs hover:bg-opacity-80 transition-colors"
        >
          Exit Full Screen
        </button>
      )}
    </div>
  );
};

export default CesiumResiumGlobe;