import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

async function genVedomostNumber(): Promise<string> {
  const all = await prisma.carrierVedomost.findMany({ select: { number: true } });
  let maxNum = 0;
all.forEach((v: { number: string }) => {    const m = (v.number || '').match(/^ВП(\d+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxNum) maxNum = n;
    }
  });
  return 'ВП' + String(maxNum + 1).padStart(6, '0');
}

export const getCarrierVedomosts = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId } = req.query;
    const where: any = {};
    if (companyId) where.companyId = companyId as string;
    const list = await prisma.carrierVedomost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json(list);
  } catch (error: any) {
    console.error('Get carrier vedomosts error:', error);
    res.status(500).json({ message: 'Ошибка при получении ведомостей перевозчика', details: error.message });
  }
};

export const getCarrierVedomost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const v = await prisma.carrierVedomost.findUnique({ where: { id: id as string } });
    if (!v) return res.status(404).json({ message: 'Ведомость перевозчика не найдена' });
    res.json(v);
  } catch (error: any) {
    console.error('Get carrier vedomost error:', error);
    res.status(500).json({ message: 'Ошибка при получении ведомости', details: error.message });
  }
};

// ТЗ: ведомость перевозчика формируется ТОЛЬКО из уже сформированных партий (isFormed=true),
// и партия не может участвовать в двух ведомостях перевозчика одновременно
export const createCarrierVedomost = async (req: AuthRequest, res: Response) => {
  try {
    const { batchIds, companyId, data, totalWeight, carrierSum, loaderSum, representativeSum } = req.body;

    if (!Array.isArray(batchIds) || batchIds.length === 0) {
      return res.status(400).json({ message: 'Не выбраны партии для формирования ведомости' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const batches = await tx.batch.findMany({ where: { id: { in: batchIds } } });

      if (batches.length !== batchIds.length) {
        throw new Error('BATCH_NOT_FOUND');
      }
      const notFormed = batches.find(b => !b.isFormed);
      if (notFormed) {
        throw new Error('BATCH_NOT_FORMED');
      }
      const alreadyUsed = batches.find(b => !!(b as any).carrierVedomostId);
      if (alreadyUsed) {
        throw new Error('BATCH_ALREADY_USED');
      }

      const number = await genVedomostNumber();

      const vedomost = await tx.carrierVedomost.create({
        data: {
          number,
          companyId: companyId || null,
          batchIds: JSON.stringify(batchIds),
          data: typeof data === 'string' ? data : JSON.stringify(data || {}),
          totalWeight: parseFloat(totalWeight) || 0,
          carrierSum: parseFloat(carrierSum) || 0,
          loaderSum: parseFloat(loaderSum) || 0,
          representativeSum: parseFloat(representativeSum) || 0,
        },
      });

      await tx.batch.updateMany({
        where: { id: { in: batchIds } },
        data: { carrierVedomostId: vedomost.id } as any,
      });

      return vedomost;
    });

    res.status(201).json(result);
  } catch (error: any) {
    if (error.message === 'BATCH_NOT_FOUND') {
      return res.status(400).json({ message: 'Одна или несколько партий не найдены' });
    }
    if (error.message === 'BATCH_NOT_FORMED') {
      return res.status(400).json({ message: 'Ведомость перевозчика можно сформировать только из УЖЕ сформированных партий' });
    }
    if (error.message === 'BATCH_ALREADY_USED') {
      return res.status(400).json({ message: 'Одна из партий уже включена в другую ведомость перевозчика' });
    }
    console.error('Create carrier vedomost error:', error);
    res.status(500).json({ message: 'Ошибка при создании ведомости перевозчика', details: error.message });
  }
};

export const deleteCarrierVedomost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.$transaction(async (tx) => {
      await tx.batch.updateMany({
        where: { carrierVedomostId: id as string } as any,
        data: { carrierVedomostId: null } as any,
      });
      await tx.carrierVedomost.delete({ where: { id: id as string } });
    });
    res.json({ message: 'Ведомость перевозчика удалена' });
  } catch (error: any) {
    console.error('Delete carrier vedomost error:', error);
    res.status(500).json({ message: 'Ошибка при удалении ведомости', details: error.message });
  }
};