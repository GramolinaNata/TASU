// @ts-nocheck
import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

const s = (v: any): string => {
  const r = Array.isArray(v) ? v[0] : v;
  return r === undefined || r === null ? '' : String(r);
};

export const getBatches = async (req: AuthRequest, res: Response) => {
  try {
    const where: any = {};
    const batches = await prisma.batch.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(batches);
  } catch (error: any) {
    console.error('getBatches error:', error);
    res.status(500).json({ message: 'Ошибка', details: error.message });
  }
};

export const getBatch = async (req: AuthRequest, res: Response) => {
  try {
    const batch = await prisma.batch.findUnique({ where: { id: req.params.id } });
    if (!batch) return res.status(404).json({ message: 'Не найдена' });
    res.json(batch);
  } catch (error: any) {
    console.error('getBatch error:', error);
    res.status(500).json({ message: 'Ошибка', details: error.message });
  }
};

export const createBatch = async (req: AuthRequest, res: Response) => {
  try {
    const b = req.body;
    if (!b.number || !b.city) return res.status(400).json({ message: 'Заполните поля' });

    const batch = await prisma.batch.create({
      data: {
        number: s(b.number),
        city: s(b.city),
        driverName: s(b.driverName),
        driverPhone: s(b.driverPhone),
        carNumber: s(b.carNumber),
        deliveryCost: s(b.deliveryCost),
        requestIds: typeof b.requestIds === 'string' ? b.requestIds : JSON.stringify(b.requestIds || []),
        status: 'created',
        // 🆕 ТЗ v2
        isFormed: !!b.isFormed,
        formedAt: b.formedAt ? new Date(b.formedAt) : null,
        vedomostData: b.vedomostData || null,
        totalSeats: b.totalSeats ? Number(b.totalSeats) : 0,
        totalWeight: b.totalWeight ? Number(b.totalWeight) : 0,
      }
    });
    res.status(201).json(batch);
  } catch (error: any) {
    console.error('createBatch error:', error);
    res.status(500).json({ message: 'Ошибка создания', details: error.message });
  }
};

export const updateBatch = async (req: AuthRequest, res: Response) => {
  try {
    const b = req.body;

    // Собираем только переданные поля (partial update)
    const data: any = {};
    if (b.number !== undefined) data.number = s(b.number);
    if (b.city !== undefined) data.city = s(b.city);
    if (b.driverName !== undefined) data.driverName = s(b.driverName);
    if (b.driverPhone !== undefined) data.driverPhone = s(b.driverPhone);
    if (b.carNumber !== undefined) data.carNumber = s(b.carNumber);
    if (b.deliveryCost !== undefined) data.deliveryCost = s(b.deliveryCost);
    if (b.status !== undefined) data.status = s(b.status);
    if (b.requestIds !== undefined) {
      data.requestIds = typeof b.requestIds === 'string'
        ? b.requestIds
        : JSON.stringify(b.requestIds || []);
    }

    // 🆕 ТЗ v2: Сформированная партия
    if (b.isFormed !== undefined) data.isFormed = !!b.isFormed;
    if (b.formedAt !== undefined) {
      data.formedAt = b.formedAt ? new Date(b.formedAt) : null;
    }
    if (b.vedomostData !== undefined) data.vedomostData = b.vedomostData;
    if (b.totalSeats !== undefined) data.totalSeats = Number(b.totalSeats) || 0;
    if (b.totalWeight !== undefined) data.totalWeight = Number(b.totalWeight) || 0;

    const batch = await prisma.batch.update({ where: { id: req.params.id }, data });
    res.json(batch);
  } catch (error: any) {
    console.error('updateBatch error:', error);
    res.status(500).json({ message: 'Ошибка обновления', details: error.message });
  }
};

export const deleteBatch = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.batch.delete({ where: { id: req.params.id } });
    res.json({ message: 'Удалено' });
  } catch (error: any) {
    console.error('deleteBatch error:', error);
    res.status(500).json({ message: 'Ошибка удаления', details: error.message });
  }
};