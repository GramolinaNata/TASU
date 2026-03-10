import { Router } from 'express';
import { getRequests, getRequest, createRequest, updateRequest, deleteRequest } from '../controllers/request.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getRequests);
router.get('/:id', getRequest);
router.post('/', createRequest);
router.put('/:id', updateRequest);
router.delete('/:id', deleteRequest);

export default router;
