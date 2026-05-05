
// import { Router } from 'express';
// import {
//   getRequests,
//   getRequest,
//   createRequest,
//   updateRequest,
//   deleteRequest,
//   completeByAccountant,
//   restoreRequest,
// } from '../controllers/request.controller';
// import { authenticateToken, requireAccountant } from '../middlewares/auth.middleware';

// const router = Router();

// router.use(authenticateToken);

// router.get('/', getRequests);
// router.get('/:id', getRequest);
// router.post('/', createRequest);
// router.put('/:id', updateRequest);
// router.delete('/:id', deleteRequest);

// // ТЗ: Кнопка "Заявка отработана бухгалтером" только у бухгалтера
// router.post('/:id/complete-by-accountant', requireAccountant, completeByAccountant);

// // ТЗ: При переносе из отработанных дата должна быть актуальной
// router.post('/:id/restore', restoreRequest);

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
  // 🆕 ТЗ
  cancelAndClone,
  markFullyCompleted,
  markPaid,
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

// 🆕 ТЗ: Бухгалтер — финальное завершение работы (Активные → Завершённые)
router.post('/:id/mark-fully-completed', requireAccountant, markFullyCompleted);

// 🆕 ТЗ: Аналитика — отметка оплаты
router.post('/:id/mark-paid', markPaid);

// 🆕 ТЗ: Редактирование — нельзя менять компанию.
// Старая заявка аннулируется, создаётся новая с новым номером и датой.
router.post('/:id/cancel-and-clone', cancelAndClone);

export default router;