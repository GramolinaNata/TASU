import { Router } from 'express';
import {
  getCarrierVedomosts,
  getCarrierVedomost,
  createCarrierVedomost,
  updateCarrierVedomost,
  annulCarrierVedomost,
  deleteCarrierVedomost,
} from '../controllers/carrierVedomost.controller';
import { authenticateToken, denyLimitedOperator } from '../middlewares/auth.middleware';

const router = Router();

// ТЗ: ведомость перевозчика целиком закрыта для урезанной роли — и запись,
// и ЧТЕНИЕ. Чтение тоже: в ответе едут carrierSum, representativeSum, loaderSum
// и снапшот data со всей разбивкой по партиям, то есть ровно те суммы выплат,
// которые этой роли видеть нельзя. Прятать их в интерфейсе бессмысленно,
// пока API отдаёт их любому, кто дёрнет эндпоинт напрямую.
router.use(authenticateToken, denyLimitedOperator);

router.get('/', getCarrierVedomosts);
router.get('/:id', getCarrierVedomost);
router.post('/', createCarrierVedomost);
router.put('/:id', updateCarrierVedomost);
router.post('/:id/annul', annulCarrierVedomost);
router.delete('/:id', deleteCarrierVedomost);

export default router;