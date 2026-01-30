import express, { Request, Response, Router } from "express";
import {
  getServices,
  toAdapterIds,
  toLegacyDatasets,
  type LegacyDataset,
  type AdapterDatasetID,
} from "../gateway";
import {
  fetchPersistedDatasetIds,
  filterCommonDatasetIds,
} from "../helper/getPersistedDatasetId";
import { IDatasetID } from "../types/types";

const router: Router = express.Router(); // Initialize the router

let keys: IDatasetID[][] = []; // Initialize keys as an empty array

router.post("/persist", async (req: Request, res: Response) => {
  try {
    keys.push(req.body.key);
    console.log("Keys for POST request:", keys);

    // Fetch persisted dataset IDs
    const persistedDatasetId = await fetchPersistedDatasetIds();

    // Filter common dataset IDs while maintaining the nested structure
    const commonDatasetIds = filterCommonDatasetIds(keys, persistedDatasetId);

    console.log("Persisted Dataset IDs:", persistedDatasetId);
    console.log("Common Dataset IDs:", commonDatasetIds);

    // Use gateway service to get datasets
    const { datasetService } = getServices();
    const adapterIds = toAdapterIds(commonDatasetIds.flat()) as AdapterDatasetID[];
    const datasets = await datasetService.getByIds(adapterIds);
    const result: LegacyDataset[] = toLegacyDatasets(datasets);

    res.status(200).json({ result });
    keys = []; // Reset the keys array
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    keys.push(req.body.key);
    console.log("Keys for POST request:", keys);

    // Use gateway service to get datasets
    const { datasetService } = getServices();
    const adapterIds = toAdapterIds(keys.flat()) as AdapterDatasetID[];
    const datasets = await datasetService.getByIds(adapterIds);
    const result: LegacyDataset[] = toLegacyDatasets(datasets);

    res.status(200).json({ result });
    keys = []; // Reset the keys array
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/all", async (req: Request, res: Response) => {
  try {
    // Use gateway service to get all datasets
    const { datasetService } = getServices();
    const datasets = await datasetService.getAll();
    const result: LegacyDataset[] = toLegacyDatasets(datasets);

    res.status(200).json({ result });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

/* 
    In this route you can send the Dataset_id by post request
    and get the dataset object as a response.
*/

/**
 *  POST request to /main with the Dataset_id returns the dataset objects of only the dataset_id which is posted.
 *
 *  POST request to /main/persist with the Dataset_id returns the dataset objects of the dataset_id which is posted
 *  and also checks if the dataset_id is persisted or not amd returns only the persisted datasets.
 *
 * GET request to /main/all returns all the dataset objects of all the dataset_id  which is used
 * in the initial page load and when the user clicks on the reset button.
 *
 */
