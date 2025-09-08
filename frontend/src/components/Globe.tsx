/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Cesium from "cesium";
import React, { useEffect, useRef, useState } from "react";

// Set your Cesium Ion access token here
// You can get a free token from https://cesium.com/ion/
const CESIUM_ACCESS_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyYzQyYjZkMi02N2MyLTQxYjQtYWI4YS1lNGE5YzMyOGVmNjAiLCJpZCI6MzM5Mjg1LCJpYXQiOjE3NTczMTE3Njh9.d5tL7TnhBysu-6-dof3ws9bSvQex7322RBl-eOn_xuU";

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
  fullScreen?: boolean; // New prop to control full screen mode
}

const Globe: React.FC<GlobeProps> = ({ debrisData, filters, fullScreen = false }) => {
  const cesiumContainer = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const debrisEntitiesRef = useRef<Cesium.Entity[]>([]);
  const [selectedDebris, setSelectedDebris] = useState<Debris | null>(null);
  const [cesiumLoaded, setCesiumLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Cesium viewer
  useEffect(() => {
    if (!cesiumContainer.current || viewerRef.current) return;

    try {
      if (CESIUM_ACCESS_TOKEN) {
        Cesium.Ion.defaultAccessToken = CESIUM_ACCESS_TOKEN;
      } else {
        console.warn(
          "Cesium ION Access Token not provided. Some features may not work."
        );
      }

      const viewer = new Cesium.Viewer(cesiumContainer.current, {
        timeline: false,
        animation: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        vrButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        navigationHelpButton: false,
        creditContainer: document.createElement("div"), // Hides the default credit display
        terrainProvider: undefined,
      });

      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(0, 20, 15000000),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-60),
          roll: 0,
        },
      });

      viewer.scene.globe.enableLighting = true;
      viewer.scene.backgroundColor = Cesium.Color.BLACK;
      // Improve atmosphere rendering
      viewer.scene.globe.showGroundAtmosphere = true;
      viewer.scene.globe.atmosphereHueShift = -0.04;
      viewer.scene.globe.atmosphereBrightnessShift = -0.1;
      viewer.scene.globe.atmosphereSaturationShift = 0.25;

      const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
      handler.setInputAction((event: any) => {
        const pickedObject = viewer.scene.pick(event.position);
        if (
          Cesium.defined(pickedObject) &&
          (pickedObject.id as any)?.debrisData
        ) {
          setSelectedDebris((pickedObject.id as any).debrisData);
        } else {
          setSelectedDebris(null);
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

      // Force resize after initialization to ensure proper dimensions
      setTimeout(() => {
        viewer.resize();
        setCesiumLoaded(true);
        setError(null);
      }, 100);

      viewerRef.current = viewer;
    } catch (err) {
      console.error("Error initializing Cesium viewer:", err);
      setError(`Failed to initialize Cesium: ${err}`);
    }

    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        try {
          viewerRef.current.destroy();
        } catch (err) {
          console.error("Error destroying viewer:", err);
        }
        viewerRef.current = null;
      }
    };
  }, []);

  // Handle window resize to keep Cesium responsive
  useEffect(() => {
    const handleResize = () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update debris entities based on data and filters
  useEffect(() => {
    if (!cesiumLoaded || !viewerRef.current || !debrisData) return;

    const viewer = viewerRef.current;

    try {
      // Clear all previous debris-related entities
      debrisEntitiesRef.current.forEach((entity) => {
        viewer.entities.remove(entity);
      });
      debrisEntitiesRef.current = [];

      const filteredDebris = debrisData.filter((debris) => {
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

      const newEntities: Cesium.Entity[] = [];
      filteredDebris.forEach((debris) => {
        try {
          const position = Cesium.Cartesian3.fromDegrees(
            debris.lon,
            debris.lat,
            debris.altitude * 1000 // altitude from km to meters
          );
          const color = getDebrisColor(debris);

          // FIX: The orbital path is now an ellipse graphic attached to the main entity.
          // This solves the memory leak (it's removed with the parent entity) and
          // renders a more visually representative orbit at the correct altitude.
          let ellipseGraphics;
          if (debris.altitude < 2000) {
            const earthRadius = 6371000; // meters
            const orbitRadius = earthRadius + debris.altitude * 1000;
            ellipseGraphics = {
              semiMajorAxis: orbitRadius,
              semiMinorAxis: orbitRadius,
              material: color.withAlpha(0.2),
              height: debris.altitude * 1000,
              outline: true,
              outlineColor: color.withAlpha(0.4),
              outlineWidth: 1,
            };
          }

          const entity = viewer.entities.add({
            position,
            point: {
              pixelSize: getDebrisRenderSize(debris.size),
              color,
              outlineColor: Cesium.Color.WHITE.withAlpha(0.7),
              outlineWidth: 1,
              scaleByDistance: new Cesium.NearFarScalar(1.5e5, 1.5, 8.0e6, 0.5),
            },
            ellipse: ellipseGraphics, // Add the ellipse here
          });

          // Attach original data to the entity for easy access on click
          (entity as any).debrisData = debris;
          newEntities.push(entity);
        } catch (err) {
          console.error("Error adding debris entity:", err);
        }
      });

      debrisEntitiesRef.current = newEntities;
    } catch (error) {
      console.log(error);
      console.error("Error updating debris entities:");
      setError(`Failed to update debris:`);
    }
  }, [cesiumLoaded, debrisData, filters]);

  // Utility Functions
  const calculateRisk = (debris: Debris): RiskLevel => {
    // Simplified risk calculation
    if (debris.altitude < 600 && debris.velocity > 8) return "high";
    if (debris.altitude < 1000 && debris.velocity > 7) return "medium";
    return "low";
  };

  const getDebrisColor = (debris: Debris): Cesium.Color => {
    const risk = calculateRisk(debris);
    if (risk === "high") return Cesium.Color.RED;
    if (risk === "medium") return Cesium.Color.ORANGE;
    return Cesium.Color.LIMEGREEN;
  };

  const getDebrisRenderSize = (size: DebrisSize): number => {
    if (size === "large") return 10;
    if (size === "medium") return 7;
    return 5;
  };

  const getVelocityCategory = (velocity: number): VelocityCategory => {
    if (velocity < 4) return "slow";
    if (velocity < 7) return "medium";
    return "fast";
  };

  // Container styles - support both full screen and embedded modes
  const containerClass = fullScreen
    ? "fixed inset-0 w-screen h-screen z-50"
    : "relative w-full h-full min-h-[400px]";

  // The error display component is very well made and helpful for debugging setup issues.
  if (error) {
    return (
      <div className={`${containerClass} bg-gray-900 flex items-center justify-center`}>
        <div className="text-center text-white p-8 max-w-2xl">
          <h3 className="text-xl font-bold text-red-400 mb-4">
            Cesium Loading Error
          </h3>
          <p className="text-gray-300 mb-4 text-sm">{error}</p>
          <div className="text-sm text-gray-400 text-left">
            <p className="font-semibold mb-2">To fix this issue:</p>
            <div className="bg-gray-800 p-4 rounded-lg space-y-3">
              <div>
                <strong>1. Install CesiumJS:</strong>
                <code className="block bg-gray-700 px-3 py-2 rounded mt-1">
                  npm install cesium
                </code>
              </div>

              <div>
                <strong>2. Update your vite.config.ts:</strong>
                <code className="block bg-gray-700 px-3 py-2 rounded mt-1 text-xs whitespace-pre">{`import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: 'node_modules/cesium/Build/Cesium/Workers', dest: 'cesium' },
        { src: 'node_modules/cesium/Build/Cesium/ThirdParty', dest: 'cesium' },
        { src: 'node_modules/cesium/Build/Cesium/Assets', dest: 'cesium' },
        { src: 'node_modules/cesium/Build/Cesium/Widgets', dest: 'cesium' }
      ]
    })
  ],
  define: {
    CESIUM_BASE_URL: JSON.stringify('/cesium/')
  }
})`}</code>
              </div>

              <div>
                <strong>3. Install vite-plugin-static-copy:</strong>
                <code className="block bg-gray-700 px-3 py-2 rounded mt-1">
                  npm install --save-dev vite-plugin-static-copy
                </code>
              </div>

              <div>
                <strong>4. Get access token from:</strong>{" "}
                <a
                  href="https://cesium.com/ion/"
                  className="text-blue-400 underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  cesium.com/ion
                </a>
              </div>
            </div>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  // if (!cesiumLoaded) {
  //   return (
  //     <div className={`${containerClass} bg-gray-900 flex items-center justify-center`}>
  //       <div className="text-center text-white">
  //         <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-500 mx-auto mb-4"></div>
  //         <p>Loading Cesium Globe...</p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className={containerClass}>
      <div 
        ref={cesiumContainer} 
        className="w-full h-full"
        style={{ 
          width: '100%', 
          height: '100%',
          minHeight: fullScreen ? '100vh' : '400px'
        }} 
      />

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

      <div className="absolute top-4 right-4 bg-black bg-opacity-60 text-white p-2 rounded text-xs font-mono">
        <div>Cesium: {cesiumLoaded ? "Ready" : "Loading..."}</div>
        <div>Total Debris: {debrisData?.length || 0}</div>
        <div>Visible: {debrisEntitiesRef.current.length}</div>
      </div>

      {fullScreen && (
        <button
          onClick={() => {
            // You can pass this as a prop or handle it in parent component
            console.log('Exit full screen requested');
          }}
          className="absolute top-4 right-20 bg-black bg-opacity-60 text-white p-2 rounded text-xs hover:bg-opacity-80 transition-colors"
        >
          Exit Full Screen
        </button>
      )}
    </div>
  );
};

export default Globe;