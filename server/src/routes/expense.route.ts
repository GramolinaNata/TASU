// import { Router } from "express";
// import { getExpenses, createExpense, updateExpense, deleteExpense } from "../controllers/expense.controller";
// import { authenticateToken } from "../middlewares/auth.middleware";
// const router = Router();
// router.get("/", authenticateToken, getExpenses);
// router.post("/", authenticateToken, createExpense);
// router.put("/:id", authenticateToken, updateExpense);
// router.delete("/:id", authenticateToken, deleteExpense);
// export default router;

import { Router } from 'express';
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpensesSummary, // 🆕 ТЗ: Аналитика — расчёт расходов
} from '../controllers/expense.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

// 🆕 ТЗ: Аналитика — расчёт расходов (агрегаты по компании, категории, периоду)
// ВАЖНО: должен идти ДО router.get('/:id'), если он есть, иначе перехватит
router.get('/summary', getExpensesSummary);

router.get('/', getExpenses);
router.post('/', createExpense);
router.put('/:id', updateExpense);
router.delete('/:id', deleteExpense);

export default router;