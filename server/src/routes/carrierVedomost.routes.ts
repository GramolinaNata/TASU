import { Router } from 'express';
import {
  getCarrierVedomosts,
  getCarrierVedomost,
  createCarrierVedomost,
  deleteCarrierVedomost,
} from '../controllers/carrierVedomost.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getCarrierVedomosts);
router.get('/:id', authenticateToken, getCarrierVedomost);
router.post('/', authenticateToken, createCarrierVedomost);
router.delete('/:id', authenticateToken, deleteCarrierVedomost);

export default router;