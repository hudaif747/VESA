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
      const { target_url } = req.body;
      if (!target_url) {
        res.status(400).json({ error: 'target_url is required' });
        return;
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
      res.status(500).json({ error: error.message });
    }
  });

  // 2. POST /sync/start
  router.post('/start', async (req: Request, res: Response): Promise<void> => {
    try {
      const { target_url, dataset_id, batch_size, total_limit } = req.body;
      if (!target_url || !dataset_id) {
        res.status(400).json({ error: 'target_url and dataset_id are required' });
        return;
      }

      orchestrator.sync(target_url, dataset_id, total_limit || 1000, batch_size || 100)
        .catch((err) => console.error(`[Ingestion API] Background sync failed:`, err));

      res.status(202).json({ 
        message: 'Sync started.', 
        target_url, 
        dataset_id 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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
