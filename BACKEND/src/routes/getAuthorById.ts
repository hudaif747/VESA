import express, { Request, Response, Router } from "express";
import {
  getServices,
  toAdapterIds,
  toLegacyAuthors,
  type LegacyAuthor,
  type AdapterDatasetID,
} from "../gateway";
import { IDatasetID } from "../types/types";

const router: Router = express.Router(); // Initialize the router

let keys: IDatasetID[] = []; // Initialize keys as an empty array

router.post("/", async (req: Request, res: Response) => {
  try {
    keys = req.body.keys;

    // Use gateway service to get authors
    const { authorService } = getServices();
    const adapterIds = toAdapterIds(keys) as AdapterDatasetID[];
    const authors = await authorService.getAuthorsForDatasets(adapterIds);
    const result: LegacyAuthor[] = toLegacyAuthors(authors);

    res.status(200).json({ result });
  } catch (err) {
    res.status(500).json({ error: err || "Internal Server Error" });
  }
});

router.get("/all", async (req: Request, res: Response) => {
  try {
    // Use gateway service to get all authors
    const { authorService } = getServices();
    const authors = await authorService.getAllAuthors();
    const result: LegacyAuthor[] = toLegacyAuthors(authors);

    res.status(200).json({ result });
  } catch (err) {
    res.status(500).json({ error: err || "Internal Server Error" });
  }
});

export default router;
