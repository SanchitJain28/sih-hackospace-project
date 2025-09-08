import { Router } from "express";
import {
  viewTheSpace,
  getTLEData,
  getTLEDataFast,
  saveSatelliteDataToDatabase,
  getDebrisData,
  getSpaceWeatherData,
  getSatelliteData,
  testTLEParsing
} from '../../Controllers/SpaceController';

const router = Router();

// Base space endpoint
router.get("/", viewTheSpace);

// TLE Data endpoints
router.get("/tle", getTLEData);
router.get("/tle/fast", getTLEDataFast);
router.post("/tle/save", saveSatelliteDataToDatabase);
router.get("/tle/test", testTLEParsing);

// Debris data endpoint
router.get("/debris", getDebrisData);

// Space weather endpoint  
router.get("/spaceweather", getSpaceWeatherData);

// Enhanced satellite data endpoint
router.get("/satellites", getSatelliteData);

// Batch save endpoint
router.post("/save", saveSatelliteDataToDatabase);

export default router;