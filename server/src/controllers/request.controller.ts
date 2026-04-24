// // @ts-nocheck
// import { Response } from 'express';
// import prisma from '../lib/prisma';
// import { AuthRequest } from '../middlewares/auth.middleware';

// export const getRequests = async (req: AuthRequest, res: Response) => {
//   try {
//     const { companyId } = req.query;
//     const where: any = {};
//     if (companyId) {
//       where.companyId = companyId as string;
//     }
//     const requests = await prisma.request.findMany({
//       where,
//       include: {
//         company: true,
//         manager: {
//           select: { id: true, name: true, email: true }
//         }
//       },
//       orderBy: { createdAt: 'desc' }
//     });
//     res.json(requests);
//   } catch (error) {
//     console.error('Get requests error:', error);
//     res.status(500).json({ message: 'Ошибка при получении заявок' });
//   }
// };

// export const getRequest = async (req: AuthRequest, res: Response) => {
//   try {
//     const { id } = req.params;
//     const request = await prisma.request.findUnique({
//       where: { id: id as string },
//       include: {
//         company: true,
//         manager: {
//           select: { id: true, name: true, email: true }
//         }
//       }
//     });
//     if (!request) {
//       return res.status(404).json({ message: 'Заявка не найдена' });
//     }
//     res.json(request);
//   } catch (error: any) {
//     console.error('Get request error:', error);
//     res.status(500).json({ message: 'Ошибка при получении заявки', details: error.message });
//   }
// };

// export const createRequest = async (req: AuthRequest, res: Response) => {
//   try {
//     const {
//       status,
//       date,
//       companyId,
//       type,
//       docNumber,
//       details,
//       totalSum,
//       ...rest
//     } = req.body;

//     const route = req.body.route;
//     const cargo = req.body.cargo;

//     if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
//     if (!companyId) return res.status(400).json({ message: 'companyId is required' });

//     const routeStr = typeof route === 'object' ? `${route.fromCity || ''} -> ${route.toCity || ''}` : route;
//     const cargoStr = typeof cargo === 'object' ? JSON.stringify(cargo) : cargo;

//     // Если details передан как строка — используем его напрямую
//     // Если как объект — сериализуем
//     // Если не передан — сохраняем rest
//     let detailsStr: string;
//     if (details !== undefined) {
//       detailsStr = typeof details === 'string' ? details : JSON.stringify(details);
//     } else {
//       detailsStr = JSON.stringify(rest);
//     }

//     const newRequest = await prisma.request.create({
//       data: {
//         status: status || 'Заявка',
//         date: date || new Date().toISOString().split('T')[0],
//         companyId: companyId,
//         managerId: req.user.id,
//         type: type || 'REQUEST',
//         route: routeStr,
//         cargo: cargoStr,
//         docNumber: docNumber,
//         totalSum: totalSum ? String(totalSum) : '',
//         details: detailsStr
//       },
//       include: { company: true }
//     });

//     res.status(201).json(newRequest);
//   } catch (error: any) {
//     console.error('Create request error:', error);
//     res.status(500).json({
//       message: 'Ошибка при создании заявки',
//       details: error.message
//     });
//   }
// };

// export const updateRequest = async (req: AuthRequest, res: Response) => {
//   try {
//     const { id } = req.params;

//     const existing = await prisma.request.findUnique({
//       where: { id: id as string }
//     });

//     if (!existing) {
//       return res.status(404).json({ message: 'Заявка не найдена' });
//     }

//     const existingDetails = existing.details ? JSON.parse(existing.details) : {};

//     const {
//       status,
//       date,
//       type,
//       docNumber,
//       companyId,
//       totalSum,
//       ...bodyFields
//     } = req.body;

//     const mergedDetails = {
//       ...existingDetails,
//       ...bodyFields
//     };

//     if (req.body.details && typeof req.body.details === 'object') {
//       Object.assign(mergedDetails, req.body.details);
//     }

//     const route = req.body.route !== undefined ? req.body.route : existingDetails.route;
//     const cargo = req.body.cargo !== undefined ? req.body.cargo : existingDetails.cargo;

//     let routeStr = undefined;
//     if (route) {
//       routeStr = typeof route === 'object' ? `${route.fromCity || ''} -> ${route.toCity || ''}` : route;
//     }

//     let cargoStr = undefined;
//     if (cargo) {
//       cargoStr = typeof cargo === 'object' ? JSON.stringify(cargo) : cargo;
//     }

//     const updatedRequest = await prisma.request.update({
//       where: { id: id as string },
//       data: {
//         status: status !== undefined ? status : existing.status,
//         date: date !== undefined ? date : existing.date,
//         companyId: companyId !== undefined ? companyId : existing.companyId,
//         type: type !== undefined ? type : existing.type,
//         route: routeStr,
//         cargo: cargoStr,
//         docNumber: docNumber !== undefined ? docNumber : existing.docNumber,
//         totalSum: totalSum !== undefined ? String(totalSum) : existing.totalSum,
//         details: JSON.stringify(mergedDetails)
//       },
//       include: { company: true }
//     });

//     res.json(updatedRequest);
//   } catch (error: any) {
//     console.error('Update Request Error:', error);
//     res.status(500).json({ message: 'Ошибка при обновлении заявки', details: error.message });
//   }
// };

// export const deleteRequest = async (req: AuthRequest, res: Response) => {
//   try {
//     const { id } = req.params;
//     if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
//     if (req.user.role !== 'ADMIN') {
//       return res.status(403).json({ message: 'Только администратор может удалять заявки' });
//     }
//     await prisma.request.delete({
//       where: { id: id as string }
//     });
//     res.json({ message: 'Заявка удалена' });
//   } catch (error: any) {
//     console.error('Delete request error:', error);
//     res.status(500).json({ message: 'Ошибка при удалении заявки', details: error.message });
//   }
// };



import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

// Статусы заявок (используются на бэке и фронте)
const STATUS = {
  REQUEST: 'Заявка',
  SENT: 'Отправлено',
  CANCELED: 'canceled',
  DRAFT: 'draft',
} as const;

// Безопасный парсинг details с фолбэком на пустой объект
function safeParseDetails(raw: any): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(String(raw));
  } catch {
    return {};
  }
}

// Проверяет что у заявки сформирован документ (ТТН/СМР/Склад)
function hasFormedDocument(request: any, details: Record<string, any>): boolean {
  if (request.type && request.type !== 'REQUEST' && request.type !== 'SIMPLE') return true;
  if (details.docType === 'ttn' || details.docType === 'smr') return true;
  if (details.isWarehouse) return true;
  return false;
}

export const getRequests = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId } = req.query;
    const sortByRaw = (req.query.sortBy as string) || 'createdAt';
    const orderRaw = (req.query.order as string) || 'desc';

    const ALLOWED_SORT = ['createdAt', 'updatedAt', 'date', 'status', 'type', 'docNumber', 'totalSum'];
    const sortBy = ALLOWED_SORT.includes(sortByRaw) ? sortByRaw : 'createdAt';
    const order: 'asc' | 'desc' = orderRaw === 'asc' ? 'asc' : 'desc';

    const where: any = {};
    if (companyId) where.companyId = companyId as string;

    const requests = await prisma.request.findMany({
      where,
      include: {
        company: true,
        manager: { select: { id: true, name: true, email: true } },
      },
      orderBy: { [sortBy]: order },
    });

    res.json(requests);
  } catch (error: any) {
    console.error('Get requests error:', error);
    res.status(500).json({ message: 'Ошибка при получении заявок', details: error.message });
  }
};

export const getRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const request = await prisma.request.findUnique({
      where: { id: id as string },
      include: {
        company: true,
        manager: { select: { id: true, name: true, email: true } },
      },
    });
    if (!request) return res.status(404).json({ message: 'Заявка не найдена' });
    res.json(request);
  } catch (error: any) {
    console.error('Get request error:', error);
    res.status(500).json({ message: 'Ошибка при получении заявки', details: error.message });
  }
};

export const createRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { status, date, companyId, type, docNumber, details, totalSum, ...rest } = req.body;
    const route = req.body.route;
    const cargo = req.body.cargo;

    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (!companyId) return res.status(400).json({ message: 'companyId is required' });

    const routeStr = typeof route === 'object' && route !== null ? `${route.fromCity || ''} -> ${route.toCity || ''}` : route;
    const cargoStr = typeof cargo === 'object' && cargo !== null ? JSON.stringify(cargo) : cargo;

    let detailsStr: string;
    if (details !== undefined) {
      detailsStr = typeof details === 'string' ? details : JSON.stringify(details);
    } else {
      detailsStr = JSON.stringify(rest);
    }

    const newRequest = await prisma.request.create({
      data: {
        status: status || STATUS.REQUEST,
        date: date || new Date().toISOString().split('T')[0],
        companyId: companyId,
        managerId: req.user.id,
        type: type || 'REQUEST',
        route: routeStr,
        cargo: cargoStr,
        docNumber: docNumber,
        totalSum: totalSum ? String(totalSum) : '',
        details: detailsStr,
      } as any,
      include: { company: true },
    });

    res.status(201).json(newRequest);
  } catch (error: any) {
    console.error('Create request error:', error);
    res.status(500).json({ message: 'Ошибка при создании заявки', details: error.message });
  }
};

/**
 * Обновление заявки с транзакцией (фикс бага "зависает при одновременной работе").
 * Блокирует отправку бухгалтеру без сформированного документа (ТЗ).
 */
export const updateRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.request.findUnique({ where: { id: id as string } });
      if (!existing) throw new Error('NOT_FOUND');

      const existingDetails = safeParseDetails((existing as any).details);

      const { status, date, type, docNumber, companyId, totalSum, ...bodyFields } = req.body;

      // Проверка: отправить бухгалтеру можно только если сформирован СМР/ТТН/Склад
      const willSetReadyForAccountant =
        bodyFields.readyForAccountant === true ||
        (req.body.details && typeof req.body.details === 'object' && req.body.details.readyForAccountant === true);

      if (willSetReadyForAccountant && !existingDetails.readyForAccountant) {
        const mergedPreview = {
          ...existingDetails,
          ...bodyFields,
          ...(req.body.details && typeof req.body.details === 'object' ? req.body.details : {}),
        };
        if (!hasFormedDocument({ ...existing, type: type !== undefined ? type : existing.type }, mergedPreview)) {
          throw new Error('DOCUMENT_NOT_FORMED');
        }
      }

      const mergedDetails: Record<string, any> = { ...existingDetails, ...bodyFields };
      if (req.body.details && typeof req.body.details === 'object') {
        Object.assign(mergedDetails, req.body.details);
      }

      const route = req.body.route !== undefined ? req.body.route : existingDetails.route;
      const cargo = req.body.cargo !== undefined ? req.body.cargo : existingDetails.cargo;

      let routeStr: string | undefined;
      if (route) routeStr = typeof route === 'object' ? `${route.fromCity || ''} -> ${route.toCity || ''}` : route;

      let cargoStr: string | undefined;
      if (cargo) cargoStr = typeof cargo === 'object' ? JSON.stringify(cargo) : cargo;

      const updated = await tx.request.update({
        where: { id: id as string },
        data: {
          status: status !== undefined ? status : existing.status,
          date: date !== undefined ? date : existing.date,
          companyId: companyId !== undefined ? companyId : existing.companyId,
          type: type !== undefined ? type : existing.type,
          route: routeStr !== undefined ? routeStr : (existing as any).route,
          cargo: cargoStr !== undefined ? cargoStr : (existing as any).cargo,
          docNumber: docNumber !== undefined ? docNumber : existing.docNumber,
          totalSum: totalSum !== undefined ? String(totalSum) : existing.totalSum,
          details: JSON.stringify(mergedDetails),
        } as any,
        include: { company: true },
      });

      return updated;
    }, { timeout: 10000 });

    res.json(result);
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ message: 'Заявка не найдена' });
    if (error.message === 'DOCUMENT_NOT_FORMED') {
      return res.status(400).json({
        message: 'Нельзя отправить заявку бухгалтеру до формирования СМР/ТТН/Склад',
      });
    }
    console.error('Update Request Error:', error);
    res.status(500).json({ message: 'Ошибка при обновлении заявки', details: error.message });
  }
};

/**
 * ТЗ: Кнопка "Заявка отработана бухгалтером" только у бухгалтера.
 * Отдельный endpoint, защищён middleware requireAccountant на уровне роутера.
 */
export const completeByAccountant = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.request.findUnique({ where: { id: id as string } });
    if (!existing) return res.status(404).json({ message: 'Заявка не найдена' });

    const existingDetails = safeParseDetails((existing as any).details);
    const newDetails = {
      ...existingDetails,
      isProcessedByAccountant: true,
      isViewedByAccountant: true,
    };

    const updated = await prisma.request.update({
      where: { id: id as string },
      data: {
        details: JSON.stringify(newDetails),
        completedAt: new Date(),
      } as any,
      include: { company: true },
    });

    res.json(updated);
  } catch (error: any) {
    console.error('completeByAccountant error:', error);
    res.status(500).json({ message: 'Ошибка при отметке "отработано"', details: error.message });
  }
};

/**
 * ТЗ: При переносе Заявки/СМР/ТТН из отработанных дата должна быть актуальной.
 * Сбрасывает флаги и проставляет today.
 */
export const restoreRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.request.findUnique({ where: { id: id as string } });
    if (!existing) return res.status(404).json({ message: 'Заявка не найдена' });

    const existingDetails = safeParseDetails((existing as any).details);
    const newDetails = {
      ...existingDetails,
      readyForAccountant: false,
      isDeferredForAccountant: false,
      isProcessedByAccountant: false,
      isViewedByAccountant: false,
    };

    const today = new Date().toISOString().split('T')[0];

    const updated = await prisma.request.update({
      where: { id: id as string },
      data: {
        date: today,
        completedAt: null,
        details: JSON.stringify(newDetails),
      } as any,
      include: { company: true },
    });

    res.json(updated);
  } catch (error: any) {
    console.error('restoreRequest error:', error);
    res.status(500).json({ message: 'Ошибка при возврате заявки', details: error.message });
  }
};

export const deleteRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Только администратор может удалять заявки' });
    }
    await prisma.request.delete({ where: { id: id as string } });
    res.json({ message: 'Заявка удалена' });
  } catch (error: any) {
    console.error('Delete request error:', error);
    res.status(500).json({ message: 'Ошибка при удалении заявки', details: error.message });
  }
};