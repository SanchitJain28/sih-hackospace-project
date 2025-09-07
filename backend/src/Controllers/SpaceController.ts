import { Request, Response } from "express";
import axios from "axios";
import { supabase } from "../utils/supabase/createClient";
import { TLE_DATA } from "../data/TLE-data";
import * as satellite from "satellite.js"; // ✅ fixed import

export const viewTheSpace = async (req: Request, res: Response) => {
  return res.status(201).json({
    status: true,
    message: "You are Viewing The Space !! Enjoy",
  });
};

export const getTLEData = async (req: Request, res: Response) => {
  try {
    const { data } = await axios.get(
      "https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle"
    );
    res.status(201).json({
      status: false,
      data,
      message: "TLE DATA FETCHED SUCCESFULLY",
      code: "SUCCESS",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

export const getTLEDataFast = async (req: Request, res: Response) => {
  try {
    res.status(201).json({
      status: false,
      data: TLE_DATA,
      message: "TLE DATA FETCHED SUCCESFULLY",
      code: "SUCCESS",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

export const SaveSateliteTLEDataToDatabase = async (
  req: Request,
  res: Response
) => {
  try {
    // 1️⃣ Fetch raw TLE data from your fast API

    const rawData = TLE_DATA;

    const lines = rawData.split("\n");

    const tleObjects: {
      name: string;
      norad_id: number;
      tle_line1: string;
      tle_line2: string;
    }[] = [];

    // 2️⃣ Parse every 3 lines: NAME + LINE1 + LINE2
    for (let i = 0; i < lines.length; i += 3) {
      if (!lines[i + 2]) continue; // skip incomplete blocks
      const name = lines[i].trim();
      const tle_line1 = lines[i + 1].trim();
      const tle_line2 = lines[i + 2].trim();
      const norad_id = parseInt(tle_line1.substring(2, 7));

      tleObjects.push({ name, norad_id, tle_line1, tle_line2 });
    }

    const tle = tleObjects[0];

    // 3️⃣ Insert satellites into Supabase in chunks (avoid huge payload)
    const chunkSize = 1000;
    for (let i = 0; i < tleObjects.length; i += chunkSize) {
      const chunk = tleObjects.slice(i, i + chunkSize);
      const { error } = await supabase.from("satellites").insert(chunk);
      if (error) console.error("Insert error:", error);
    }
    const satrec = satellite.twoline2satrec(tle.tle_line1, tle.tle_line2);
    

    // 4️⃣ Optional: calculate current positions for each satellite
    for (const tle of tleObjects) {
      const { data: satData, error } = await supabase
        .from("satellites")
        .select("id")
        .eq("norad_id", tle.norad_id)
        .single();

      console.log(satData);

      if (error || !satData) continue;

      const satrec = satellite.twoline2satrec(tle.tle_line1, tle.tle_line2);
      const now = new Date();
      const pos = satellite.propagate(satrec, now);

      if (!pos?.position) continue;

      const gmst = satellite.gstime(now);
      const positionGd = satellite.eciToGeodetic(pos.position, gmst);

      const latitude = satellite.degreesLat(positionGd.latitude);
      const longitude = satellite.degreesLong(positionGd.longitude);
      const altitude = positionGd.height;

      await supabase.from("satellite_positions").insert([
        {
          satellite_id: satData.id,
          latitude,
          longitude,
          altitude,
          velocity: pos.velocity ? pos.velocity : null,
          timestamp: now,
        },
      ]);
    }

    return res.status(200).json({
      status: true,
      message: `Saved ${tleObjects.length} satellites and their positions`,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};
