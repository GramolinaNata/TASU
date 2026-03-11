import { Router } from 'express';
import { contractController } from '../controllers/contract.controller';

const router = Router();

router.get('/', contractController.list);
router.get('/:id', contractController.get);
router.post('/', contractController.create);
router.put('/:id', contractController.update);
router.delete('/:id', contractController.delete);

export default router;
