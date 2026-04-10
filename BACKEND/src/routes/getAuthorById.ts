import { Request, Response, Router } from "express";
import {
  getServices,
  toLegacyAuthors,
  type LegacyAuthor,
  type AdapterDatasetID,
} from "../gateway";
import { IDatasetID } from "../types/types";

const router: Router = Router();

const normalizeIds = (value: IDatasetID | IDatasetID[]): AdapterDatasetID[] =>
  (Array.isArray(value) ? value : [value]) as AdapterDatasetID[];

router.post("/", async (req: Request, res: Response) => {
  try {
    const datasetIds = normalizeIds(req.body.keys);
    const { authorService } = getServices();
    const authors = await authorService.getAuthorsForDatasets(datasetIds);
    const result: LegacyAuthor[] = toLegacyAuthors(authors);
    res.status(200).json({ result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    res.status(500).json({ error: message });
  }
});

router.get("/all", async (_req: Request, res: Response) => {
  try {
    const { authorService } = getServices();
    const authors = await authorService.getAllAuthors();
    const result: LegacyAuthor[] = toLegacyAuthors(authors);
    res.status(200).json({ result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    res.status(500).json({ error: message });
  }
});

export default router;
