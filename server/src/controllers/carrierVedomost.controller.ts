import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

// ВАЖНО: считаем max по ВСЕМ записям, включая удалённые и аннулированные —
// иначе номер удалённой ведомости уйдёт следующей, а он уже мог попасть
// в напечатанный отчёт бухгалтера. Не добавлять сюда фильтр deleted/annulled.
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
    // Удалённые (и старые аннулированные — тот же по сути результат: партии
    // освобождены, номер закреплён) с глаз убраны. Записи в базе остаются.
    const where: any = { deleted: false, annulled: false };
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

// Редактирование ведомости + «мягкое» удаление строки.
//
// Строка ведомости = партия внутри снапшота data.rows. Отдельной таблицы строк нет,
// поэтому клиент присылает пересчитанный снапшот и итоги, а сервер сверяет состав
// партий и освобождает те, что из ведомости убрали.
//
// Правила (согласованы с заказчиком):
//   • номер ведомости закреплён навсегда, запись НИКОГДА не удаляется;
//   • убранная партия освобождается (carrierVedomostId = null) и возвращается
//     в «Сформированные» — для пользователя это выглядит как удаление строки;
//   • добавлять партии через этот endpoint нельзя (только убирать) — состав
//     набирается при формировании;
//   • нельзя тронуть партию, уже проведённую в архив бухгалтерии (status='reported'):
//     иначе задним числом поедут выплаты в закрытом отчётном периоде;
//   • нельзя убрать последнюю строку — пустая ведомость смысла не имеет,
//     для этого есть аннулирование;
//   • аннулированная ведомость не редактируется.
export const updateCarrierVedomost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { data, batchIds, totalWeight, carrierSum, loaderSum, representativeSum } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const ved = await tx.carrierVedomost.findUnique({ where: { id: id as string } });
      if (!ved) throw new Error('NOT_FOUND');
      if ((ved as any).annulled) throw new Error('ANNULLED');

      let existingIds: string[] = [];
      try { existingIds = JSON.parse(ved.batchIds || '[]'); } catch { existingIds = []; }

      let nextIds: string[] = existingIds;
      if (Array.isArray(batchIds)) {
        const added = batchIds.filter((b: string) => !existingIds.includes(b));
        if (added.length > 0) throw new Error('CANNOT_ADD_BATCH');
        nextIds = batchIds;
      }
      if (nextIds.length === 0) throw new Error('LAST_ROW');

      const removed = existingIds.filter((b) => !nextIds.includes(b));

      // Партии, проведённые в архив бухгалтерии, не трогаем — ни при удалении строки,
      // ни при правке сумм: отчёт за закрытый период должен остаться неизменным.
      const touched = removed.length > 0 ? removed : existingIds;
      const reported = await tx.batch.findMany({
        where: { id: { in: touched }, status: 'reported' },
        select: { number: true },
      });
      if (reported.length > 0) {
        throw new Error('REPORTED:' + reported.map((b) => b.number).join(', '));
      }

      if (removed.length > 0) {
        // Освобождаем только те партии, что реально числятся за ЭТОЙ ведомостью.
        await tx.batch.updateMany({
          where: { id: { in: removed }, carrierVedomostId: id as string } as any,
          data: { carrierVedomostId: null } as any,
        });
      }

      const updated = await tx.carrierVedomost.update({
        where: { id: id as string },
        data: {
          batchIds: JSON.stringify(nextIds),
          data: data === undefined ? ved.data : (typeof data === 'string' ? data : JSON.stringify(data)),
          totalWeight: totalWeight !== undefined ? parseFloat(totalWeight) || 0 : ved.totalWeight,
          carrierSum: carrierSum !== undefined ? parseFloat(carrierSum) || 0 : ved.carrierSum,
          loaderSum: loaderSum !== undefined ? parseFloat(loaderSum) || 0 : ved.loaderSum,
          representativeSum: representativeSum !== undefined ? parseFloat(representativeSum) || 0 : ved.representativeSum,
        },
      });
      return updated;
    });

    res.json(result);
  } catch (error: any) {
    const msg = String(error.message || '');
    if (msg === 'NOT_FOUND') return res.status(404).json({ message: 'Ведомость перевозчика не найдена' });
    if (msg === 'ANNULLED') return res.status(400).json({ message: 'Ведомость аннулирована — редактировать её нельзя' });
    if (msg === 'CANNOT_ADD_BATCH') return res.status(400).json({ message: 'Через редактирование можно только убирать партии из ведомости, добавлять — нельзя' });
    if (msg === 'LAST_ROW') return res.status(400).json({ message: 'Нельзя убрать последнюю строку ведомости. Если ведомость не нужна — аннулируйте её целиком' });
    if (msg.startsWith('REPORTED:')) {
      return res.status(400).json({
        message: `Партии ${msg.slice('REPORTED:'.length)} уже проведены в архив бухгалтерии. ` +
          `Изменение исказит закрытый отчёт — сначала верните их в «Текущие» в отчёте бухгалтера.`,
      });
    }
    console.error('Update carrier vedomost error:', error);
    res.status(500).json({ message: 'Ошибка при обновлении ведомости', details: error.message });
  }
};

// LEGACY: кнопки «Аннулировать» в интерфейсе больше нет — заказчик свёл всё
// к одной кнопке «Удалить» (мягкое удаление ниже). Эндпоинт оставлен, чтобы не
// ломать старые ссылки; новые аннулирования через UI не создаются.
// ВНИМАНИЕ: здесь НЕТ проверки на архив бухгалтерии — в отличие от удаления.
// Если эндпоинт когда-нибудь вернут в UI, проверку надо добавить.
//
// ТЗ: аннулирование ведомости (удалять нельзя). Ведомость помечается annulled=true,
// номер сохраняется за ней, а входившие партии освобождаются (carrierVedomostId=null)
// и возвращаются в раздел «Сформированные» для сборки в новую ведомость.
export const annulCarrierVedomost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await prisma.$transaction(async (tx) => {
      const ved = await tx.carrierVedomost.findUnique({ where: { id: id as string } });
      if (!ved) throw new Error('NOT_FOUND');

      // Освобождаем партии этой ведомости
      await tx.batch.updateMany({
        where: { carrierVedomostId: id as string } as any,
        data: { carrierVedomostId: null } as any,
      });

      // Помечаем аннулированной (НЕ удаляем — номер остаётся за ней)
      const updated = await tx.carrierVedomost.update({
        where: { id: id as string },
        data: { annulled: true, annulledAt: new Date() } as any,
      });
      return updated;
    });
    res.json(result);
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ message: 'Ведомость перевозчика не найдена' });
    console.error('Annul carrier vedomost error:', error);
    res.status(500).json({ message: 'Ошибка при аннулировании ведомости', details: error.message });
  }
};

// ТЗ: удаление ведомости ЦЕЛИКОМ — мягкое, той же механикой, что и мягкое
// удаление строки. Ведомость уходит с глаз, её партии освобождаются и
// возвращаются в «Сформированные», но запись из базы НЕ стирается и номер
// закреплён за ней навсегда.
//
// Жёсткого DELETE здесь больше нет намеренно: он переиспользовал номера
// (следующая ведомость получала номер удалённой, уже попавший в напечатанный
// отчёт) и сдвигал отчёт бухгалтера.
//
// Как и у строки, блокируем удаление, если хоть одна партия ведомости уже
// проведена в архив бухгалтерии (status='reported') — иначе задним числом
// поедут выплаты в закрытом отчётном периоде.
export const deleteCarrierVedomost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await prisma.$transaction(async (tx) => {
      const ved = await tx.carrierVedomost.findUnique({ where: { id: id as string } });
      if (!ved) throw new Error('NOT_FOUND');
      // Повторное удаление — не ошибка: партии уже освобождены, метка стоит.
      if ((ved as any).deleted) return ved;

      const reported = await tx.batch.findMany({
        where: { carrierVedomostId: id as string, status: 'reported' } as any,
        select: { number: true },
      });
      if (reported.length > 0) {
        throw new Error('REPORTED:' + reported.map((b) => b.number).join(', '));
      }

      await tx.batch.updateMany({
        where: { carrierVedomostId: id as string } as any,
        data: { carrierVedomostId: null } as any,
      });

      return await tx.carrierVedomost.update({
        where: { id: id as string },
        data: { deleted: true, deletedAt: new Date() } as any,
      });
    });

    res.json({ message: 'Ведомость перевозчика удалена', vedomost: result });
  } catch (error: any) {
    const msg = String(error.message || '');
    if (msg === 'NOT_FOUND') return res.status(404).json({ message: 'Ведомость перевозчика не найдена' });
    if (msg.startsWith('REPORTED:')) {
      return res.status(400).json({
        message: `Партии ${msg.slice('REPORTED:'.length)} уже проведены в архив бухгалтерии. ` +
          `Удаление ведомости исказит закрытый отчёт — сначала верните их в «Текущие» в отчёте бухгалтера.`,
      });
    }
    console.error('Delete carrier vedomost error:', error);
    res.status(500).json({ message: 'Ошибка при удалении ведомости', details: error.message });
  }
};