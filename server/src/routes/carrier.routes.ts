import { Router } from 'express';
import { getCarriers, getCarrier, createCarrier, updateCarrier, deleteCarrier } from '../controllers/carrier.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getCarriers);
router.get('/:id', authenticateToken, getCarrier);
router.post('/', authenticateToken, createCarrier);
router.put('/:id', authenticateToken, updateCarrier);
router.delete('/:id', authenticateToken, deleteCarrier);

export default router;