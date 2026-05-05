
import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

/**
 * Получение списка расходов.
 * 🆕 ТЗ: Аналитика — фильтры по компании, диапазону дат, привязке к накладной.
 */
export const getExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const {
      companyId,
      requestId,    // 🆕 расходы по конкретной накладной
      category,     // 🆕 фильтр по категории
      dateFrom,     // 🆕 диапазон
      dateTo,       // 🆕
    } = req.query;

    const where: any = {};
    if (companyId) where.companyId = String(companyId);
    if (requestId) where.requestId = String(requestId);
    if (category) where.category = String(category);

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = String(dateFrom);
      if (dateTo) where.date.lte = String(dateTo);
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
    });
    res.json(expenses);
  } catch (error: any) {
    console.error('getExpenses error:', error);
    res.status(500).json({ message: 'Ошибка при получении расходов', details: error.message });
  }
};

/**
 * 🆕 ТЗ: Аналитика — расчёт расходов.
 * Возвращает агрегаты: общая сумма, по категориям, по компаниям, по периоду.
 * GET /api/expenses/summary?companyId=...&dateFrom=...&dateTo=...
 */
export const getExpensesSummary = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, dateFrom, dateTo } = req.query;

    const where: any = {};
    if (companyId) where.companyId = String(companyId);
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = String(dateFrom);
      if (dateTo) where.date.lte = String(dateTo);
    }

    const expenses = await prisma.expense.findMany({ where });

    // Общая сумма
    const totalAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // По категориям
    const byCategoryMap = new Map<string, number>();
    expenses.forEach((e) => {
      const k = e.category || 'Без категории';
      byCategoryMap.set(k, (byCategoryMap.get(k) || 0) + (e.amount || 0));
    });
    const byCategory = Array.from(byCategoryMap.entries()).map(([category, amount]) => ({
      category,
      amount,
    }));

    // По компаниям
    const byCompanyMap = new Map<string, number>();
    expenses.forEach((e) => {
      const k = e.companyId || 'Без компании';
      byCompanyMap.set(k, (byCompanyMap.get(k) || 0) + (e.amount || 0));
    });
    const byCompany = Array.from(byCompanyMap.entries()).map(([companyId, amount]) => ({
      companyId,
      amount,
    }));

    res.json({
      totalAmount,
      count: expenses.length,
      byCategory,
      byCompany,
    });
  } catch (error: any) {
    console.error('getExpensesSummary error:', error);
    res.status(500).json({ message: 'Ошибка при расчёте расходов', details: error.message });
  }
};

/**
 * Создание расхода.
 * 🆕 ТЗ: Возможность создать расход на существующую накладную (requestId).
 *        Если requestId указан — категория по умолчанию "Перевозка".
 */
export const createExpense = async (req: AuthRequest, res: Response) => {
  try {
    const { date, category, description, amount, docNumber, companyId, requestId } = req.body;

    if (!date || !amount) {
      return res.status(400).json({ message: 'Поля date и amount обязательны' });
    }

    const userId: number | null = req.user?.id ?? null;

    // 🆕 Если указана накладная и не задана категория — ставим "Перевозка"
    let finalCategory = category ? String(category) : '';
    if (requestId && !finalCategory) finalCategory = 'Перевозка';
    if (!finalCategory) {
      return res.status(400).json({ message: 'Поле category обязательно' });
    }

    // 🆕 Если указан requestId — проверим что заявка существует и подтянем companyId
    let finalCompanyId = companyId ? String(companyId) : null;
    if (requestId) {
      const r = await prisma.request.findUnique({ where: { id: String(requestId) } });
      if (!r) return res.status(404).json({ message: 'Накладная не найдена' });
      if (!finalCompanyId) finalCompanyId = r.companyId;
    }

    const expense = await prisma.expense.create({
      data: {
        date: String(date),
        category: finalCategory,
        description: description ? String(description) : '',
        amount: parseFloat(amount),
        docNumber: docNumber ? String(docNumber) : '',
        companyId: finalCompanyId,
        userId,
        requestId: requestId ? String(requestId) : null,
      } as any,
    });

    res.status(201).json(expense);
  } catch (error: any) {
    console.error('createExpense error:', error);
    res.status(500).json({ message: 'Ошибка при создании расхода', details: error.message });
  }
};

export const updateExpense = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { date, category, description, amount, docNumber, requestId } = req.body;

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        date: String(date),
        category: String(category),
        description: description ? String(description) : '',
        amount: parseFloat(amount),
        docNumber: docNumber ? String(docNumber) : '',
        requestId: requestId !== undefined ? (requestId ? String(requestId) : null) : undefined,
      } as any,
    });
    res.json(updated);
  } catch (error: any) {
    console.error('updateExpense error:', error);
    res.status(500).json({ message: 'Ошибка при обновлении расхода', details: error.message });
  }
};

export const deleteExpense = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.expense.delete({ where: { id } });
    res.json({ message: 'deleted' });
  } catch (error: any) {
    console.error('deleteExpense error:', error);
    res.status(500).json({ message: 'Ошибка при удалении расхода', details: error.message });
  }
};