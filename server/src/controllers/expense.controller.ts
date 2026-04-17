import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.query.companyId as string | undefined;
    const where = companyId ? { companyId } : {};
    const expenses = await prisma.expense.findMany({ where, orderBy: { date: 'desc' } });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'error' });
  }
};

export const createExpense = async (req: AuthRequest, res: Response) => {
  try {
    const { date, category, description, amount, docNumber, companyId } = req.body;
    if (!date || !category || !amount) return res.status(400).json({ message: 'required' });
    const userId: number | null = req.user?.id ?? null;
    const expense = await prisma.expense.create({
      data: {
        date: String(date),
        category: String(category),
        description: description ? String(description) : '',
        amount: parseFloat(amount),
        docNumber: docNumber ? String(docNumber) : '',
        companyId: companyId ? String(companyId) : null,
        userId,
      }
    });
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: 'error' });
  }
};

export const updateExpense = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { date, category, description, amount, docNumber } = req.body;
    const updated = await prisma.expense.update({
      where: { id },
      data: {
        date: String(date),
        category: String(category),
        description: description ? String(description) : '',
        amount: parseFloat(amount),
        docNumber: docNumber ? String(docNumber) : '',
      }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'error' });
  }
};

export const deleteExpense = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.expense.delete({ where: { id } });
    res.json({ message: 'deleted' });
  } catch (error) {
    res.status(500).json({ message: 'error' });
  }
};