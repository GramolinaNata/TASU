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
    const cId = req.query.companyId;
    if (cId) where.companyId = String(Array.isArray(cId) ? cId[0] : cId);
    const batches = await prisma.batch.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(batches);
  } catch (error: any) {
    res.status(500).json({ message: 'Ошибка', details: error.message });
  }
};

export const getBatch = async (req: AuthRequest, res: Response) => {
  try {
    const batch = await prisma.batch.findUnique({ where: { id: req.params.id } });
    if (!batch) return res.status(404).json({ message: 'Не найдена' });
    res.json(batch);
  } catch (error: any) {
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
        requestIds: JSON.stringify(b.requestIds || []),
        status: 'created',
      }
    });
    res.status(201).json(batch);
  } catch (error: any) {
    res.status(500).json({ message: 'Ошибка создания', details: error.message });
  }
};

export const updateBatch = async (req: AuthRequest, res: Response) => {
  try {
    const b = req.body;
    const data: any = {
      number: s(b.number),
      city: s(b.city),
      driverName: s(b.driverName),
      driverPhone: s(b.driverPhone),
      carNumber: s(b.carNumber),
      deliveryCost: s(b.deliveryCost),
      status: s(b.status) || 'created',
    };
    const batch = await prisma.batch.update({ where: { id: req.params.id }, data });
    res.json(batch);
  } catch (error: any) {
    res.status(500).json({ message: 'Ошибка обновления', details: error.message });
  }
};

export const deleteBatch = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.batch.delete({ where: { id: req.params.id } });
    res.json({ message: 'Удалено' });
  } catch (error: any) {
    res.status(500).json({ message: 'Ошибка удаления', details: error.message });
  }
};