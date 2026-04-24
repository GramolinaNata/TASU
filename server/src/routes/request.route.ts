// import { Router } from 'express';
// import { getRequests, getRequest, createRequest, updateRequest, deleteRequest } from '../controllers/request.controller';
// import { authenticateToken } from '../middlewares/auth.middleware';

// const router = Router();

// router.use(authenticateToken);

// router.get('/', getRequests);
// router.get('/:id', getRequest);
// router.post('/', createRequest);
// router.put('/:id', updateRequest);
// router.delete('/:id', deleteRequest);

// export default router;



import { Router } from 'express';
import {
  getRequests,
  getRequest,
  createRequest,
  updateRequest,
  deleteRequest,
  completeByAccountant,
  restoreRequest,
} from '../controllers/request.controller';
import { authenticateToken, requireAccountant } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getRequests);
router.get('/:id', getRequest);
router.post('/', createRequest);
router.put('/:id', updateRequest);
router.delete('/:id', deleteRequest);

// ТЗ: Кнопка "Заявка отработана бухгалтером" только у бухгалтера
router.post('/:id/complete-by-accountant', requireAccountant, completeByAccountant);

// ТЗ: При переносе из отработанных дата должна быть актуальной
router.post('/:id/restore', restoreRequest);

export default router;