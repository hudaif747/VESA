import express, { Request, Response, Router } from "express";
import {
  getServices,
  toLegacyKeywords,
  type LegacyKeyword,
  type AdapterDatasetID,
} from "../gateway";
import { IDatasetID } from "../types/types";

const router: Router = express.Router(); // Initialize the router

let keys: IDatasetID[] = []; // Initialize keys as an empty array

router.post("/", async (req: Request, res: Response) => {
  try {
    keys.push(req.body.key); // Push the dataset_id to the keys array

    // Use gateway service to get keywords
    const { keywordService } = getServices();
    const datasetIds = keys as AdapterDatasetID[];
    const keywords = await keywordService.getKeywordsForDatasets(datasetIds);
    const result: LegacyKeyword[] = toLegacyKeywords(keywords);

    res.status(200).json({ result });
    keys = []; // Reset the keys array
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/all", async (req: Request, res: Response) => {
  try {
    // Use gateway service to get all keywords
    const { keywordService } = getServices();
    const keywords = await keywordService.getAllKeywords();
    const result: LegacyKeyword[] = toLegacyKeywords(keywords);

    res.status(200).json({ result });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

/*
  keyword {
    keyword: string;
    count: number;
    ^dataset_id: IDatasetID[];
  }
*/

/**
 * This file is a route that is used to get the keywords of a dataset by its id.
 * The route is accessed by a POST request to /keywords.
 */

/**
 * This is used for the Wordcloud component.
 * When a single keyword is clicked, the ^dataset_id array of that
 * keyword is sent to the backend and all the datasets/keywords with that
 * dataset_ids are returned.
 */
