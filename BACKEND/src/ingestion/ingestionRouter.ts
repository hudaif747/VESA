import express, { Request, Response } from 'express';
import { HandshakeValidator } from './validation/HandshakeValidator';
import { SyncOrchestrator } from './SyncOrchestrator';
import { db } from '../database';

// Instantiateorchestrator outside to maintain state across requests
const orchestrator = new SyncOrchestrator(db);
const validator = new HandshakeValidator();

export const getIngestionRouter = () => {
  const router = express.Router();

  // 1. POST /sync/validate
  router.post('/validate', async (req: Request, res: Response): Promise<void> => {
    try {
      const { target_url, dataset_id, overwrite } = req.body;
      if (!target_url || !dataset_id) {
        res.status(400).json({ error: 'target_url and dataset_id are required' });
        return;
      }
      
      if (!overwrite) {
        const exists = await orchestrator.checkDatasetExists(dataset_id);
        if (exists) {
          res.status(409).json({ 
            error: `A dataset with the label '${dataset_id}' already exists.` 
          });
          return;
        }
      }

      const result = await validator.validate(target_url);
      if (!result.valid) {
        let status = 400;
        if (result.reason === 'invalid_schema') status = 422;
        else if (result.reason === 'source_offline' || result.reason === 'unreachable') status = 502;
        
        res.status(status).json(result);
        return;
      }
      res.json(result);
    } catch (error: any) {
      console.error("[Ingestion API] Validation error:", error);
      res.status(500).json({ error: "An unexpected error occurred while verifying the connection. Please try again." });
    }
  });

  // 2. POST /sync/start
  router.post('/start', async (req: Request, res: Response): Promise<void> => {
    try {
      const { target_url, dataset_id, batch_size, total_limit, overwrite } = req.body;
      if (!target_url || !dataset_id) {
        res.status(400).json({ error: 'target_url and dataset_id are required' });
        return;
      }

      // Start the sync process in the background
      orchestrator.sync(target_url, dataset_id, total_limit || 1000, batch_size || 100, overwrite)
        .catch((err) => console.error(`[Ingestion API] Background sync failed:`, err));

      // Small delay to ensure the log document gets created and job_id is populated
      setTimeout(() => {
        const status = orchestrator.getStatus();
        res.status(202).json({ 
          message: 'Sync started.', 
          target_url, 
          dataset_id,
          job_id: status.job_id
        });
      }, 50);
    } catch (error: any) {
      console.error("[Ingestion API] Start error:", error);
      res.status(500).json({ error: "An unexpected error occurred while starting the import." });
    }
  });

  // 3. GET /sync/status
  router.get('/status', (req: Request, res: Response) => {
    res.json(orchestrator.getStatus());
  });

  // 4. POST /sync/stop
  router.post('/stop', (req: Request, res: Response) => {
    orchestrator.stop();
    res.json({ message: 'Stop signal sent to the orchestrator.' });
  });

  return router;
};
