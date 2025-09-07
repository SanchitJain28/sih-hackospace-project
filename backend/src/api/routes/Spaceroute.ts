import { Router } from "express";
import { getTLEData, getTLEDataFast, SaveSateliteTLEDataToDatabase, viewTheSpace } from "../../Controllers/SpaceController";

const router = Router();

router.get("/api/space", viewTheSpace);
router.get("/api/get-TLE-data",getTLEData)
router.get("/api/get-TLE-data-fast",getTLEDataFast)
router.post("/api/save-tle-data-db",SaveSateliteTLEDataToDatabase)

export default router