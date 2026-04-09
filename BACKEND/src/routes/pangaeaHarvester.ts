import express, { Request, Response } from "express";
import { harvestPangaea } from "../services/pangaea/harvester";
import { db } from "../database";

const router = express.Router();

router.post("/run", async (req: Request, res: Response) => {
  try {
    const limit = req.body.limit || 10;
    const targetDb = db.database("vesa2db");

    // Background execution to avoid timeout
    harvestPangaea(targetDb, limit).catch((err) =>
      console.error("BG Harvest Error:", err),
    );

    res.status(202).json({
      message: "Harvesting started in the background.",
      target_limit: limit,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
