import { Router } from 'express';
import {
  getCarrierVedomosts,
  getCarrierVedomost,
  createCarrierVedomost,
  updateCarrierVedomost,
  annulCarrierVedomost,
  deleteCarrierVedomost,
} from '../controllers/carrierVedomost.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getCarrierVedomosts);
router.get('/:id', authenticateToken, getCarrierVedomost);
router.post('/', authenticateToken, createCarrierVedomost);
router.put('/:id', authenticateToken, updateCarrierVedomost);
router.post('/:id/annul', authenticateToken, annulCarrierVedomost);
router.delete('/:id', authenticateToken, deleteCarrierVedomost);

export default router;