import { Router } from 'express';
import { getTariffs, createTariff, updateTariff, deleteTariff } from '../controllers/tariff.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getTariffs);
router.post('/', authenticateToken, createTariff);
router.put('/:id', authenticateToken, updateTariff);
router.delete('/:id', authenticateToken, deleteTariff);

export default router;