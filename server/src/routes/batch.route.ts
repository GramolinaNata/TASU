import { Router } from 'express';
import { getBatches, getBatch, createBatch, updateBatch, deleteBatch } from '../controllers/batch.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticateToken);
router.get('/', getBatches);
router.get('/:id', getBatch);
router.post('/', createBatch);
router.put('/:id', updateBatch);
router.delete('/:id', deleteBatch);

export default router;