import { Router } from 'express';
import { getRepresentatives, getRepresentative, createRepresentative, updateRepresentative, deleteRepresentative } from '../controllers/representative.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getRepresentatives);
router.get('/:id', authenticateToken, getRepresentative);
router.post('/', authenticateToken, createRepresentative);
router.put('/:id', authenticateToken, updateRepresentative);
router.delete('/:id', authenticateToken, deleteRepresentative);

export default router;