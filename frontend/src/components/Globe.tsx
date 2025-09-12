/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Cesium from "cesium";
import React, { useEffect, useRef, useState } from "react";

import type { Debris, Filters, DebrisSize } from "../utils/debrisUtils";
import { calculateRisk, filterDebris} from "../utils/debrisUtils"; // Import shared utilities

// Set your Cesium Ion access token here
const CESIUM_ACCESS_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyYzQyYjZkMi02N2MyLTQxYjQtYWI4YS1lNGE5YzMyOGVmNjAiLCJpZCI6MzM5Mjg1LCJpYXQiOjE3NTczMTE3Njh9.d5tL7TnhBysu-6-dof3ws9bSvQex7322RBl-eOn_xuU";

interface GlobeProps {
  debrisData: Debris[];
  filters: Filters;
  fullScreen?: boolean;
}

const Globe: React.FC<GlobeProps> = ({
  debrisData,
  filters,
  fullScreen = false,
}) => {
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
        timeline: true,
        animation: true,
        baseLayerPicker: true,
        fullscreenButton: false,
        vrButton: true,
        geocoder: true,
        homeButton: true,
        infoBox: true,
         
        sceneModePicker: true,
        selectionIndicator: false,
        navigationHelpButton: true,
        creditContainer: document.createElement("div"),
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

      viewer.scene.globe.enableLighting = false;
      viewer.scene.backgroundColor = Cesium.Color.BLACK;
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

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.resize();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Update debris entities using shared filtering logic
  useEffect(() => {
    if (!cesiumLoaded || !viewerRef.current || !debrisData) return;

    const viewer = viewerRef.current;

    try {
      // Clear all previous debris-related entities
      debrisEntitiesRef.current.forEach((entity) => {
        viewer.entities.remove(entity);
      });
      debrisEntitiesRef.current = [];

      // Use shared filtering function for consistency
      const filteredDebris = filterDebris(debrisData, filters);
      const newEntities: Cesium.Entity[] = [];

      // Add debris points
      filteredDebris.forEach((debris: any) => {
        try {
          const position = Cesium.Cartesian3.fromDegrees(
            debris.lon,
            debris.lat,
            debris.altitude * 1000 // altitude from km to meters
          );
          const color = getDebrisColor(debris);

          const entity = viewer.entities.add({
            position,
            point: {
              pixelSize: getDebrisRenderSize(debris.size),
              color,
              outlineColor: Cesium.Color.WHITE.withAlpha(0.7),
              outlineWidth: 1,
              scaleByDistance: new Cesium.NearFarScalar(1.5e5, 1.5, 8.0e6, 0.5),
            },
          });

          (entity as any).debrisData = debris;
          newEntities.push(entity);
        } catch (err) {
          console.error("Error adding debris entity:", err);
        }
      });

      // Add connection lines for nearby debris
      for (let i = 0; i < filteredDebris.length; i++) {
        for (let j = i + 1; j < filteredDebris.length; j++) {
          const d1 = filteredDebris[i];
          const d2 = filteredDebris[j];

          const pos1 = Cesium.Cartesian3.fromDegrees(
            d1.lon,
            d1.lat,
            d1.altitude * 1000
          );
          const pos2 = Cesium.Cartesian3.fromDegrees(
            d2.lon,
            d2.lat,
            d2.altitude * 1000
          );

          const distance = Cesium.Cartesian3.distance(pos1, pos2);

          if (distance < 500000) {
            const line = viewer.entities.add({
              polyline: {
                positions: [pos1, pos2],
                width: 1,
                material: Cesium.Color.CYAN.withAlpha(0.3),
              },
            });
            newEntities.push(line);
          }
        }
      }

      debrisEntitiesRef.current = newEntities;
    } catch (error) {
      console.error("Error updating debris entities:", error);
      setError(`Failed to update debris`);
    }
  }, [cesiumLoaded, debrisData, filters]);

  // Use shared risk calculation for consistent coloring
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

  // Container styles
  const containerClass = fullScreen
    ? "fixed inset-0 w-screen h-screen z-50"
    : "relative w-full h-full min-h-[400px]";

  // Error display
  if (error) {
    return (
      <div
        className={`${containerClass} bg-gray-900 flex items-center justify-center`}
      >
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

  return (
    <div className={containerClass}>
      <div
        ref={cesiumContainer}
        className="w-full h-full"
        style={{
          width: "100%",
          height: "100%",
          minHeight: fullScreen ? "100vh" : "400px",
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

      <div className="absolute top-4 left-12 bg-black bg-opacity-60 text-white p-2 rounded text-xs font-mono">
        <div>Cesium: {cesiumLoaded ? "Ready" : "Loading..."}</div>
        <div>Total Debris: {debrisData?.length || 0}</div>
        <div>Visible: {debrisEntitiesRef.current.length}</div>
      </div>

      {fullScreen && (
        <button
          onClick={() => {
            console.log("Exit full screen requested");
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
