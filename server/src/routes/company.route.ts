import { Router } from 'express';
import { getCompanies, getCompanyById, createCompany, updateCompany, deleteCompany } from '../controllers/company.controller';
import { authenticateToken, requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken); // Все роуты требуют авторизации

router.get('/', getCompanies);
router.get('/:id', getCompanyById);
router.post('/', createCompany);
router.put('/:id', updateCompany);
router.delete('/:id', requireAdmin, deleteCompany); // Удалять может только админ

const companyRouter = router;
export default companyRouter;
