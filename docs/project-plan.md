# Our problem statement is to build a system that detects and predicts space debris in real time to keep astronauts and spacecraft safe, using AI/ML and space weather data for accurate collision avoidance, ultimately making space exploration more efficient and safe.

## 1. Frontend Team (2 members)

### Tech: React/Next.js (fast setup), Tailwind for UI (since you love it), maybe CesiumJS/Three.js for 3D space visualization.
Responsibilities:

### UI/UX: Clean dashboard for astronauts/space agencies.
Visualization: 3D earth model + live debris objects orbiting around it.
Alert System: Red/yellow/green indicators for predicted collision risk.
Controls: Filters for altitude, size, velocity, orbit path.
Integration: Consume backend API for live debris + predictions.
Deliverables:
Interactive dashboard (web-based)
Real-time debris visualization (like Google Earth but scarier)
Alert notifications in the UI

### 🌍 3D Visualization Tools

For making Earth, orbits, and debris movement look cool:

Three.js
→ Web-based 3D engine (tons of earth + orbit demos).

CesiumJS
→ Satellite/space visualization powerhouse (already has globe, coordinates, time progression).

NASA Web WorldWind
→ Another globe API from NASA, less fancy but space-authentic.

Kepler.gl
(by Uber) → If you want fast geo-based visualizations without much coding.


# Here are some goldmines:

NASA's openmct
 → Open source mission control framework (good for dashboards).

AnalyticalGraphicsInc/cesium
 → The main repo for Cesium (lots of Earth visualization examples).

Skyfield Examples
 → Satellite/debris tracking with Python.

satellite-js
 → JS library for satellite positions & orbits (works with Cesium!).

Kepler.gl Demos
 → Quick interactive map visualizations.

# 🛰️ Backend Stack with Node.js

Framework:

Express.js → lightweight, quick REST APIs.

(Or NestJS if you want structure, but Express is hackathon-friendly.)

Data Fetch & Processing:

satellite-js → parse TLE data, predict orbits & debris movement.

node-fetch / axios → call external APIs (NASA, NOAA, Celestrak).

Database:

MongoDB / Supabase (Postgres) → store debris positions, historical weather data, predictions.

MongoDB is faster for hackathon since JSON-in/out = easy.

## 🌐 APIs You Can Use in Node
Space Debris / Satellites

Celestrak
 → GET TLEs → feed into satellite-js.

Space-Track.org
 → More detailed satellite + debris catalog (needs login).

Space Weather

NASA DONKI
 → Events: solar flares, CMEs, geomagnetic storms.

NOAA SWPC
 → Real-time geomagnetic/solar weather.

Earth Weather (optional, for drag effects)

OpenWeatherMap API → Real atmospheric data if you wanna flex.

## ⚙️ Flow (Node.js Backend)

### Data Collector
Cron jobs fetch fresh TLEs from Celestrak.
Fetch space weather from NASA/NOAA APIs.
Processing Layer
Use satellite-js to convert TLE → satellite/debris positions in ECI/ECEF coords.
Run basic prediction (linear extrapolation, or time-series ML model via TensorFlow.js).
Database
Store current & predicted debris positions + weather influence.

### API Layer (Express)
/api/debris → returns live/predicted debris positions.
/api/spaceweather → returns space weather events.
/api/collision-risk → endpoint that checks if ISS/satellite trajectory intersects debris.

Frontend (React + Cesium) consumes these APIs.

#  AI/ML 

Tech: Python, TensorFlow/PyTorch, maybe Scikit-learn for quick prototyping.
Responsibilities:
Prediction Model: Train/test ML model to predict debris trajectory using orbital mechanics + space weather data.
Collision Detection: Given spacecraft trajectory, check risk of collision.
Integration: Export results via backend-friendly format (CSV/JSON).
Creative Edge: Add anomaly detection (e.g., sudden orbit drift due to solar storms).
Deliverables:
ML model (trained on sample datasets)
API-ready script/notebook for predictions
Space weather factor integration (solar wind, geomagnetic storms, etc.)