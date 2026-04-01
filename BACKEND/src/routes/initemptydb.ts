import { Router, Request, Response } from "express";
import { connectArango } from "../database";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    await connectArango(); // or actual init logic
    res.status(200).json({
      status: "success",
      message: "initemptydb performed",
    });
  } catch (error) {
    console.error("initemptydb failed:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      status: "error",
      message: msg,
    });
  }
});

export default router;
