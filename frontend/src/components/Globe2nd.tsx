/* eslint-disable @typescript-eslint/no-explicit-any */

import * as Cesium from "cesium";
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";

// Set your Cesium Ion access token here
const CESIUM_ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyYzQyYjZkMi02N2MyLTQxYjQtYWI4YS1lNGE5YzMyOGVmNjAiLCJpZCI6MzM5Mjg1LCJpYXQiOjE3NTczMTE3Njh9.d5tL7TnhBysu-6-dof3ws9bSvQex7322RBl-eOn_xuU";

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
  onFullScreenToggle?: () => void;
  onDebrisSelect?: (debris: Debris | null) => void;
}

// Custom hook for Cesium viewer management
const useCesiumViewer = (containerRef: React.RefObject<HTMLDivElement>) => {
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const [isReady, setIsReady] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    const initViewer = async () => {
      try {
        // Set the access token
        if (CESIUM_ACCESS_TOKEN) {
          Cesium.Ion.defaultAccessToken = CESIUM_ACCESS_TOKEN;
        }

        // Create viewer with optimized settings
        const viewer = new Cesium.Viewer(containerRef.current!, {
          // UI Controls
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
          creditContainer: document.createElement("div"),
          
          // Performance optimizations
          requestRenderMode: true,
          maximumRenderTimeChange: Infinity,
          
          // Terrain provider
          terrainProvider: undefined,
        });

        // Configure scene
        viewer.scene.globe.enableLighting = true;
        viewer.scene.backgroundColor = Cesium.Color.BLACK;
        viewer.scene.globe.showGroundAtmosphere = true;
        viewer.scene.globe.atmosphereHueShift = -0.04;
        viewer.scene.globe.atmosphereBrightnessShift = -0.1;
        viewer.scene.globe.atmosphereSaturationShift = 0.25;

        // Set initial camera position
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(0, 20, 15000000),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-60),
            roll: 0,
          },
        });

        // Performance optimizations
        viewer.scene.globe.tileCacheSize = 100;
        viewer.scene.requestRenderMode = true;

        viewerRef.current = viewer;
        
        // Force resize and set ready state
        setTimeout(() => {
          viewer.resize();
          setIsReady(true);
          setError(null);
        }, 100);

      } catch (err) {
        console.error("Error initializing Cesium viewer:", err);
        setError(`Failed to initialize Cesium: ${err}`);
      }
    };

    initViewer();

    // Cleanup
    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        try {
          viewerRef.current.destroy();
        } catch (err) {
          console.error("Error destroying viewer:", err);
        }
      }
      viewerRef.current = null;
      setIsReady(false);
    };
  }, []);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { viewer: viewerRef.current, isReady, error };
};

// Utility functions
const calculateRisk = (debris: Debris): RiskLevel => {
  if (debris.altitude < 200 && debris.velocity > 8) return "high";
  if (debris.altitude < 400 && debris.velocity > 7) return "medium";
  return "low";
};

const getDebrisColor = (debris: Debris): Cesium.Color => {
  const risk = calculateRisk(debris);
  switch (risk) {
    case "high": return Cesium.Color.RED;
    case "medium": return Cesium.Color.ORANGE;
    default: return Cesium.Color.LIMEGREEN;
  }
};

const getDebrisRenderSize = (size: DebrisSize): number => {
  switch (size) {
    case "large": return 10;
    case "medium": return 7;
    default: return 5;
  }
};

const getVelocityCategory = (velocity: number): VelocityCategory => {
  if (velocity < 4) return "slow";
  if (velocity < 7) return "medium";
  return "fast";
};

// Debris entities manager hook
const useDebrisEntities = (
  viewer: Cesium.Viewer | null,
  debrisData: Debris[],
  filters: Filters,
  onDebrisSelect?: (debris: Debris | null) => void
) => {
  const entitiesRef = useRef<Cesium.Entity[]>([]);
  const handlerRef = useRef<Cesium.ScreenSpaceEventHandler | null>(null);

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
  }, [debrisData, filters]);

  // Create entity for debris
  const createDebrisEntity = useCallback((debris: Debris): Cesium.Entity | null => {
    if (!viewer) return null;

    try {
      const position = Cesium.Cartesian3.fromDegrees(
        debris.lon,
        debris.lat,
        debris.altitude * 1000
      );
      const color = getDebrisColor(debris);

      // Create orbital path for objects below 2000km
      let ellipseGraphics;
      if (debris.altitude < 2000) {
        const earthRadius = 6371000; // meters
        const orbitRadius = earthRadius + debris.altitude * 1000;
        ellipseGraphics = {
          semiMajorAxis: orbitRadius,
          semiMinorAxis: orbitRadius,
          material: color.withAlpha(0.15),
          height: debris.altitude * 1000,
          outline: true,
          outlineColor: color.withAlpha(0.3),
          outlineWidth: 1,
        };
      }

      const entity = viewer.entities.add({
        position,
        point: {
          pixelSize: getDebrisRenderSize(debris.size),
          color,
          outlineColor: Cesium.Color.WHITE.withAlpha(0.8),
          outlineWidth: 1,
          scaleByDistance: new Cesium.NearFarScalar(1.5e5, 1.5, 8.0e6, 0.5),
          heightReference: Cesium.HeightReference.NONE,
        },
        ellipse: ellipseGraphics,
        label: {
          text: debris.name,
          font: "12pt sans-serif",
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -40),
          show: false, // Only show on hover/selection
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });

      // Attach debris data to entity
      (entity as any).debrisData = debris;
      return entity;
    } catch (err) {
      console.error("Error creating debris entity:", err);
      return null;
    }
  }, [viewer]);

  // Update entities when data or filters change
  useEffect(() => {
    if (!viewer) return;

    // Clear existing entities
    entitiesRef.current.forEach((entity) => {
      viewer.entities.remove(entity);
    });
    entitiesRef.current = [];

    // Create new entities
    const newEntities: Cesium.Entity[] = [];
    filteredDebris.forEach((debris) => {
      const entity = createDebrisEntity(debris);
      if (entity) {
        newEntities.push(entity);
      }
    });

    entitiesRef.current = newEntities;

    // Request render update
    viewer.scene.requestRender();
  }, [viewer, filteredDebris, createDebrisEntity]);

  // Setup click handler
  useEffect(() => {
    if (!viewer || !onDebrisSelect) return;

    // Clean up existing handler
    if (handlerRef.current) {
      handlerRef.current.destroy();
    }

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler.setInputAction((event: any) => {
      const pickedObject = viewer.scene.pick(event.position);
      if (Cesium.defined(pickedObject) && (pickedObject.id as any)?.debrisData) {
        const debris = (pickedObject.id as any).debrisData;
        onDebrisSelect(debris);
        
        // Show label for selected debris
        entitiesRef.current.forEach(entity => {
          if (entity.label) entity.label.show = false;
        });
        if (pickedObject.id.label) {
          pickedObject.id.label.show = true;
        }
      } else {
        onDebrisSelect(null);
        // Hide all labels
        entitiesRef.current.forEach(entity => {
          if (entity.label) entity.label.show = false;
        });
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    handlerRef.current = handler;

    return () => {
      if (handlerRef.current) {
        handlerRef.current.destroy();
        handlerRef.current = null;
      }
    };
  }, [viewer, onDebrisSelect]);

  return { visibleCount: entitiesRef.current.length };
};

// Error display component
const ErrorDisplay: React.FC<{ error: string; fullScreen: boolean }> = ({ error, fullScreen }) => {
  const containerClass = fullScreen
    ? "fixed inset-0 w-screen h-screen z-50"
    : "relative w-full h-full min-h-[400px]";

  return (
    <div className={`${containerClass} bg-gray-900 flex items-center justify-center`}>
      <div className="text-center text-white p-8 max-w-2xl">
        <h3 className="text-xl font-bold text-red-400 mb-4">
          Cesium Loading Error
        </h3>
        <p className="text-gray-300 mb-4 text-sm">{error}</p>
        <div className="text-sm text-gray-400 text-left">
          <p className="font-semibold mb-2">Setup Instructions:</p>
          <div className="bg-gray-800 p-4 rounded-lg space-y-3">
            <div>
              <strong>1. Install CesiumJS:</strong>
              <code className="block bg-gray-700 px-3 py-2 rounded mt-1">
                npm install cesium
              </code>
            </div>
            <div>
              <strong>2. Configure Vite (vite.config.ts):</strong>
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
              <strong>3. Install plugin:</strong>
              <code className="block bg-gray-700 px-3 py-2 rounded mt-1">
                npm install --save-dev vite-plugin-static-copy
              </code>
            </div>
            <div>
              <strong>4. Get token:</strong>{" "}
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
};

// Loading component
const LoadingDisplay: React.FC<{ fullScreen: boolean }> = ({ fullScreen }) => {
  const containerClass = fullScreen
    ? "fixed inset-0 w-screen h-screen z-50"
    : "relative w-full h-full min-h-[400px]";

  return (
    <div className={`${containerClass} bg-gray-900 flex items-center justify-center`}>
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-500 mx-auto mb-4"></div>
        <p>Initializing Cesium Globe...</p>
      </div>
    </div>
  );
};

// Debris info panel component
const DebrisInfoPanel: React.FC<{ debris: Debris; onClose: () => void }> = ({ debris, onClose }) => (
  <div className="absolute top-4 left-4 bg-black bg-opacity-90 text-white p-4 rounded-lg backdrop-blur-sm border border-cyan-500 shadow-xl w-72 animate-fade-in">
    <div className="flex justify-between items-start mb-3">
      <h3 className="font-bold text-lg text-cyan-300">
        {debris.name}
      </h3>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-white text-xl leading-none transition-colors"
      >
        ×
      </button>
    </div>
    <div className="grid grid-cols-2 gap-2 text-sm">
      <div>
        <span className="text-gray-400">ID:</span>
        <div className="text-cyan-300 font-mono">{debris.id}</div>
      </div>
      <div>
        <span className="text-gray-400">Type:</span>
        <div className="text-cyan-300 capitalize">{debris.type}</div>
      </div>
      <div>
        <span className="text-gray-400">Altitude:</span>
        <div className="text-cyan-300">{debris.altitude} km</div>
      </div>
      <div>
        <span className="text-gray-400">Size:</span>
        <div className="text-cyan-300 capitalize">{debris.size}</div>
      </div>
      <div>
        <span className="text-gray-400">Velocity:</span>
        <div className="text-cyan-300">{debris.velocity} km/s</div>
      </div>
      <div>
        <span className="text-gray-400">Mass:</span>
        <div className="text-cyan-300">{debris.mass} kg</div>
      </div>
    </div>
    <div className="mt-3 pt-3 border-t border-gray-600">
      <span className="text-gray-400">Risk Level:</span>
      <div
        className={`inline-block ml-2 px-2 py-1 rounded text-xs font-bold ${
          calculateRisk(debris) === "high"
            ? "bg-red-600 text-white"
            : calculateRisk(debris) === "medium"
            ? "bg-yellow-600 text-white"
            : "bg-green-600 text-white"
        }`}
      >
        {calculateRisk(debris).toUpperCase()}
      </div>
    </div>
  </div>
);

// Legend component
const Legend: React.FC = () => (
  <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white p-3 rounded-lg backdrop-blur-sm border border-slate-600">
    <div className="text-xs space-y-2">
      <div className="text-gray-300 font-semibold mb-2">Risk Levels</div>
      {[
        { color: "bg-red-500", label: "High Risk", border: "border-red-300" },
        { color: "bg-orange-400", label: "Medium Risk", border: "border-orange-200" },
        { color: "bg-lime-500", label: "Low Risk", border: "border-lime-300" },
      ].map(({ color, label, border }) => (
        <div key={label} className="flex items-center space-x-2">
          <div className={`w-3 h-3 ${color} rounded-full border ${border}`}></div>
          <span>{label}</span>
        </div>
      ))}
    </div>
  </div>
);

// Status panel component
const StatusPanel: React.FC<{ isReady: boolean; totalDebris: number; visibleCount: number }> = ({
  isReady,
  totalDebris,
  visibleCount,
}) => (
  <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white p-3 rounded-lg text-xs font-mono border border-slate-600">
    <div className="space-y-1">
      <div>Status: <span className={isReady ? "text-green-400" : "text-yellow-400"}>{isReady ? "Ready" : "Loading..."}</span></div>
      <div>Total Debris: <span className="text-cyan-300">{totalDebris}</span></div>
      <div>Visible: <span className="text-cyan-300">{visibleCount}</span></div>
    </div>
  </div>
);

// Main Globe component
const Globe: React.FC<GlobeProps> = ({ 
  debrisData, 
  filters, 
  fullScreen = false, 
  onFullScreenToggle,
  onDebrisSelect 
}) => {
  const cesiumContainer = useRef<HTMLDivElement>(null);
  const [selectedDebris, setSelectedDebris] = useState<Debris | null>(null);
  
  const { viewer, isReady, error } = useCesiumViewer(cesiumContainer);
  
  const handleDebrisSelect = useCallback((debris: Debris | null) => {
    setSelectedDebris(debris);
    onDebrisSelect?.(debris);
  }, [onDebrisSelect]);
  
  const { visibleCount } = useDebrisEntities(viewer, debrisData, filters, handleDebrisSelect);

  const containerClass = fullScreen
    ? "fixed inset-0 w-screen h-screen z-50"
    : "relative w-full h-full min-h-[400px]";

  if (error) {
    return <ErrorDisplay error={error} fullScreen={fullScreen} />;
  }

  if (!isReady) {
    return <LoadingDisplay fullScreen={fullScreen} />;
  }

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
        <DebrisInfoPanel
          debris={selectedDebris}
          onClose={() => handleDebrisSelect(null)}
        />
      )}

      <Legend />
      
      <StatusPanel
        isReady={isReady}
        totalDebris={debrisData?.length || 0}
        visibleCount={visibleCount}
      />

      {fullScreen && onFullScreenToggle && (
        <button
          onClick={onFullScreenToggle}
          className="absolute top-4 right-32 bg-black bg-opacity-70 text-white p-2 rounded text-sm hover:bg-opacity-90 transition-colors border border-slate-600"
        >
          Exit Full Screen
        </button>
      )}
    </div>
  );
};

// Generate sample debris data for demonstration
const generateSampleDebrisData = (): Debris[] => {
  const sizes: DebrisSize[] = ["small", "medium", "large"];
  const types = ["satellite", "rocket body", "fragment", "payload"];
  const debris: Debris[] = [];

  for (let i = 0; i < 500; i++) {
    debris.push({
      id: `debris-${i + 1}`,
      name: `Object ${i + 1}`,
      altitude: Math.random() * 2000 + 200, // 200-2200 km
      velocity: Math.random() * 10 + 3, // 3-13 km/s
      size: sizes[Math.floor(Math.random() * sizes.length)],
      mass: Math.random() * 1000 + 1, // 1-1000 kg
      type: types[Math.floor(Math.random() * types.length)],
      lon: (Math.random() - 0.5) * 360, // -180 to 180
      lat: (Math.random() - 0.5) * 180, // -90 to 90
    });
  }

  return debris;
};

// Demo component
const CesiumGlobeDemo: React.FC = () => {
  const [debrisData] = useState<Debris[]>(generateSampleDebrisData());
  const [filters, setFilters] = useState<Filters>({
    altitudeRange: [200, 2000],
    sizes: ["small", "medium", "large"],
    velocity: "all",
  });
  const [fullScreen, setFullScreen] = useState(false);

  return (
    <div className="w-full h-screen bg-gray-900">
      <div className="h-full">
        <Globe
          debrisData={debrisData}
          filters={filters}
          fullScreen={fullScreen}
          onFullScreenToggle={() => setFullScreen(false)}
          onDebrisSelect={(debris) => {
            if (debris) {
              console.log("Selected debris:", debris);
            }
          }}
        />
      </div>
      
      {!fullScreen && (
        <div className="absolute bottom-4 right-4">
          <button
            onClick={() => setFullScreen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors"
          >
            Full Screen
          </button>
        </div>
      )}
    </div>
  );
};

export default CesiumGlobeDemo;