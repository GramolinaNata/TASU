import { Router } from 'express';
import * as counterpartyController from '../controllers/counterparty.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', counterpartyController.getCounterparties);
router.get('/:id', counterpartyController.getCounterparty);
router.post('/', counterpartyController.createCounterparty);
router.put('/:id', counterpartyController.updateCounterparty);
router.delete('/:id', counterpartyController.deleteCounterparty);

export default router;
