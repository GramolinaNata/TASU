import { Router } from "express";
import { getExpenses, createExpense, updateExpense, deleteExpense } from "../controllers/expense.controller";
import { authenticateToken } from "../middlewares/auth.middleware";
const router = Router();
router.get("/", authenticateToken, getExpenses);
router.post("/", authenticateToken, createExpense);
router.put("/:id", authenticateToken, updateExpense);
router.delete("/:id", authenticateToken, deleteExpense);
export default router;