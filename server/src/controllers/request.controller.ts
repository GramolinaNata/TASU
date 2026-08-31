

// // import { Response } from 'express';
// // import prisma from '../lib/prisma';
// // import { AuthRequest } from '../middlewares/auth.middleware';

// // // Статусы заявок (используются на бэке и фронте)
// // const STATUS = {
// //   REQUEST: 'Заявка',
// //   SENT: 'Отправлено',
// //   CANCELED: 'canceled',
// //   DRAFT: 'draft',
// // } as const;

// // // Безопасный парсинг details с фолбэком на пустой объект
// // function safeParseDetails(raw: any): Record<string, any> {
// //   if (!raw) return {};
// //   if (typeof raw === 'object') return raw;
// //   try {
// //     return JSON.parse(String(raw));
// //   } catch {
// //     return {};
// //   }
// // }

// // // Проверяет что у заявки сформирован документ (ТТН/СМР/Склад)
// // function hasFormedDocument(request: any, details: Record<string, any>): boolean {
// //   if (request.type && request.type !== 'REQUEST' && request.type !== 'SIMPLE') return true;
// //   if (details.docType === 'ttn' || details.docType === 'smr') return true;
// //   if (details.isWarehouse) return true;
// //   return false;
// // }

// // export const getRequests = async (req: AuthRequest, res: Response) => {
// //   try {
// //     // 🆕 ТЗ: Аналитика — фильтры по компании, оплачено/неоплачено, отложенные, завершённые, типу
// //     const {
// //       companyId,
// //       isPaid,                  // 🆕 'true' | 'false' | undefined
// //       isFullyCompleted,        // 🆕 'true' | 'false' | undefined
// //       isDeferred,              // 🆕 'true' — только отложенные
// //       type,                    // 🆕 фильтр по типу (REQUEST/SMR/TTN/SIMPLE)
// //       status,                  // 🆕 фильтр по статусу
// //       dateFrom,                // 🆕 для аналитики — диапазон дат
// //       dateTo,                  // 🆕
// //     } = req.query;

// //     const sortByRaw = (req.query.sortBy as string) || 'createdAt';
// //     const orderRaw = (req.query.order as string) || 'desc';

// //     const ALLOWED_SORT = ['createdAt', 'updatedAt', 'date', 'status', 'type', 'docNumber', 'totalSum'];
// //     const sortBy = ALLOWED_SORT.includes(sortByRaw) ? sortByRaw : 'createdAt';
// //     const order: 'asc' | 'desc' = orderRaw === 'asc' ? 'asc' : 'desc';

// //     const where: any = {};
// //     if (companyId) where.companyId = companyId as string;
// //     if (type) where.type = type as string;
// //     if (status) where.status = status as string;

// //     // 🆕 ТЗ: Аналитика — фильтр по оплате
// //     if (isPaid === 'true') where.isPaid = true;
// //     else if (isPaid === 'false') where.isPaid = false;

// //     // 🆕 ТЗ: Бухгалтер — Активные / Завершённые
// //     if (isFullyCompleted === 'true') where.isFullyCompleted = true;
// //     else if (isFullyCompleted === 'false') where.isFullyCompleted = false;

// //     // 🆕 ТЗ: Аналитика — диапазон по дате создания
// //     if (dateFrom || dateTo) {
// //       where.createdAt = {};
// //       if (dateFrom) where.createdAt.gte = new Date(String(dateFrom));
// //       if (dateTo) where.createdAt.lte = new Date(String(dateTo) + 'T23:59:59.999Z');
// //     }

// //     let requests = await prisma.request.findMany({
// //       where,
// //       include: {
// //         company: true,
// //         manager: { select: { id: true, name: true, email: true } },
// //       },
// //       orderBy: { [sortBy]: order },
// //     });

// //     // 🆕 ТЗ: Отложенные хранятся в details.isDeferredForAccountant — фильтруем после выборки
// //     if (isDeferred === 'true') {
// //       requests = requests.filter((r: any) => {
// //         const d = safeParseDetails(r.details);
// //         return d.isDeferredForAccountant === true;
// //       });
// //     }

// //     res.json(requests);
// //   } catch (error: any) {
// //     console.error('Get requests error:', error);
// //     res.status(500).json({ message: 'Ошибка при получении заявок', details: error.message });
// //   }
// // };

// // export const getRequest = async (req: AuthRequest, res: Response) => {
// //   try {
// //     const { id } = req.params;
// //     const request = await prisma.request.findUnique({
// //       where: { id: id as string },
// //       include: {
// //         company: true,
// //         manager: { select: { id: true, name: true, email: true } },
// //       },
// //     });
// //     if (!request) return res.status(404).json({ message: 'Заявка не найдена' });
// //     res.json(request);
// //   } catch (error: any) {
// //     console.error('Get request error:', error);
// //     res.status(500).json({ message: 'Ошибка при получении заявки', details: error.message });
// //   }
// // };

// // export const createRequest = async (req: AuthRequest, res: Response) => {
// //   try {
// //     const { status, date, companyId, type, docNumber, details, totalSum, ...rest } = req.body;
// //     const route = req.body.route;
// //     const cargo = req.body.cargo;

// //     if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
// //     if (!companyId) return res.status(400).json({ message: 'companyId is required' });

// //     const routeStr = typeof route === 'object' && route !== null ? `${route.fromCity || ''} -> ${route.toCity || ''}` : route;
// //     const cargoStr = typeof cargo === 'object' && cargo !== null ? JSON.stringify(cargo) : cargo;

// //     let detailsStr: string;
// //     if (details !== undefined) {
// //       detailsStr = typeof details === 'string' ? details : JSON.stringify(details);
// //     } else {
// //       detailsStr = JSON.stringify(rest);
// //     }

// //     const newRequest = await prisma.request.create({
// //       data: {
// //         status: status || STATUS.REQUEST,
// //         date: date || new Date().toISOString().split('T')[0],
// //         companyId: companyId,
// //         managerId: req.user.id,
// //         type: type || 'REQUEST',
// //         route: routeStr,
// //         cargo: cargoStr,
// //         docNumber: docNumber,
// //         totalSum: totalSum ? String(totalSum) : '',
// //         details: detailsStr,
// //       } as any,
// //       include: { company: true },
// //     });

// //     res.status(201).json(newRequest);
// //   } catch (error: any) {
// //     console.error('Create request error:', error);
// //     res.status(500).json({ message: 'Ошибка при создании заявки', details: error.message });
// //   }
// // };

// // /**
// //  * Обновление заявки с транзакцией.
// //  * 🆕 ТЗ: Запрет смены компании при редактировании.
// //  * 🆕 ТЗ: При редактировании после завершения бухгалтером — возврат в сток (reEditedAfterCompletion).
// //  */
// // export const updateRequest = async (req: AuthRequest, res: Response) => {
// //   try {
// //     const { id } = req.params;

// //     const result = await prisma.$transaction(async (tx) => {
// //       const existing = await tx.request.findUnique({ where: { id: id as string } });
// //       if (!existing) throw new Error('NOT_FOUND');

// //       const existingDetails = safeParseDetails((existing as any).details);

// //       const { status, date, type, docNumber, companyId, totalSum, ...bodyFields } = req.body;

// //       // 🆕 ТЗ: При редактировании НЕЛЬЗЯ менять компанию.
// //       // Если нужна другая компания — старая заявка аннулируется, создаётся новая (отдельный endpoint).
// //       if (companyId !== undefined && companyId !== existing.companyId) {
// //         throw new Error('CANNOT_CHANGE_COMPANY');
// //       }

// //       // Проверка: отправить бухгалтеру можно только если сформирован СМР/ТТН/Склад
// //       const willSetReadyForAccountant =
// //         bodyFields.readyForAccountant === true ||
// //         (req.body.details && typeof req.body.details === 'object' && req.body.details.readyForAccountant === true);

// //       if (willSetReadyForAccountant && !existingDetails.readyForAccountant) {
// //         const mergedPreview = {
// //           ...existingDetails,
// //           ...bodyFields,
// //           ...(req.body.details && typeof req.body.details === 'object' ? req.body.details : {}),
// //         };
// //         if (!hasFormedDocument({ ...existing, type: type !== undefined ? type : existing.type }, mergedPreview)) {
// //           throw new Error('DOCUMENT_NOT_FORMED');
// //         }
// //       }

// //       const mergedDetails: Record<string, any> = { ...existingDetails, ...bodyFields };
// //       if (req.body.details && typeof req.body.details === 'object') {
// //         Object.assign(mergedDetails, req.body.details);
// //       }

// //       const route = req.body.route !== undefined ? req.body.route : existingDetails.route;
// //       const cargo = req.body.cargo !== undefined ? req.body.cargo : existingDetails.cargo;

// //       let routeStr: string | undefined;
// //       if (route) routeStr = typeof route === 'object' ? `${route.fromCity || ''} -> ${route.toCity || ''}` : route;

// //       let cargoStr: string | undefined;
// //       if (cargo) cargoStr = typeof cargo === 'object' ? JSON.stringify(cargo) : cargo;

// //       // 🆕 ТЗ: Если заявка была завершена бухгалтером и сейчас редактируется менеджером —
// //       // возвращаем её в сток как новую (флаг reEditedAfterCompletion)
// //       const wasFullyCompleted = (existing as any).isFullyCompleted === true;
// //       const isManagerEditing = req.user?.role === 'MANAGER' || req.user?.role === 'ADMIN';

// //       const updateData: any = {
// //         status: status !== undefined ? status : existing.status,
// //         date: date !== undefined ? date : existing.date,
// //         // companyId НЕ обновляем — заблокировано выше
// //         type: type !== undefined ? type : existing.type,
// //         route: routeStr !== undefined ? routeStr : (existing as any).route,
// //         cargo: cargoStr !== undefined ? cargoStr : (existing as any).cargo,
// //         docNumber: docNumber !== undefined ? docNumber : existing.docNumber,
// //         totalSum: totalSum !== undefined ? String(totalSum) : existing.totalSum,
// //         details: JSON.stringify(mergedDetails),
// //       };

// //       if (wasFullyCompleted && isManagerEditing) {
// //         updateData.reEditedAfterCompletion = true;
// //         updateData.isFullyCompleted = false;          // возвращаем в сток
// //         updateData.fullyCompletedAt = null;
// //       }

// //       const updated = await tx.request.update({
// //         where: { id: id as string },
// //         data: updateData,
// //         include: { company: true },
// //       });

// //       return updated;
// //     }, { timeout: 10000 });

// //     res.json(result);
// //   } catch (error: any) {
// //     if (error.message === 'NOT_FOUND') return res.status(404).json({ message: 'Заявка не найдена' });
// //     if (error.message === 'DOCUMENT_NOT_FORMED') {
// //       return res.status(400).json({
// //         message: 'Нельзя отправить заявку бухгалтеру до формирования СМР/ТТН/Склад',
// //       });
// //     }
// //     if (error.message === 'CANNOT_CHANGE_COMPANY') {
// //       return res.status(400).json({
// //         message: 'Нельзя менять компанию у существующей заявки. Аннулируйте текущую и создайте новую.',
// //       });
// //     }
// //     console.error('Update Request Error:', error);
// //     res.status(500).json({ message: 'Ошибка при обновлении заявки', details: error.message });
// //   }
// // };

// // /**
// //  * 🆕 ТЗ: Аннулирование заявки/СМР/ТТН/склад с одновременным созданием новой копии
// //  * (используется когда нужно "сменить компанию" — старая аннулируется, новая создаётся с новым номером и датой).
// //  */
// // export const cancelAndClone = async (req: AuthRequest, res: Response) => {
// //   try {
// //     const { id } = req.params;
// //     const { newCompanyId } = req.body;

// //     if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
// //     if (!newCompanyId) return res.status(400).json({ message: 'newCompanyId is required' });

// //     const result = await prisma.$transaction(async (tx) => {
// //       const existing = await tx.request.findUnique({ where: { id: id as string } });
// //       if (!existing) throw new Error('NOT_FOUND');

// //       // Аннулируем старую
// //       await tx.request.update({
// //         where: { id: id as string },
// //         data: { status: STATUS.CANCELED } as any,
// //       });

// //       // Создаём новую копию с новой компанией, новой датой, без docNumber (получит новый при формировании)
// //       const existingDetails = safeParseDetails((existing as any).details);
// //       const today = new Date().toISOString().split('T')[0];

// //       const cloned = await tx.request.create({
// //         data: {
// //           status: STATUS.REQUEST,
// //           date: today,
// //           companyId: newCompanyId,
// //           managerId: req.user!.id,
// //           type: existing.type,
// //           route: (existing as any).route,
// //           cargo: (existing as any).cargo,
// //           docNumber: null,                    // новый номер появится при формировании
// //           totalSum: existing.totalSum,
// //           details: JSON.stringify({
// //             ...existingDetails,
// //             clonedFrom: existing.id,
// //             readyForAccountant: false,
// //             isProcessedByAccountant: false,
// //           }),
// //         } as any,
// //         include: { company: true },
// //       });

// //       return cloned;
// //     }, { timeout: 10000 });

// //     res.status(201).json(result);
// //   } catch (error: any) {
// //     if (error.message === 'NOT_FOUND') return res.status(404).json({ message: 'Заявка не найдена' });
// //     console.error('cancelAndClone error:', error);
// //     res.status(500).json({ message: 'Ошибка при аннулировании', details: error.message });
// //   }
// // };

// // /**
// //  * ТЗ: Кнопка "Заявка отработана бухгалтером" только у бухгалтера.
// //  */
// // export const completeByAccountant = async (req: AuthRequest, res: Response) => {
// //   try {
// //     const { id } = req.params;
// //     const existing = await prisma.request.findUnique({ where: { id: id as string } });
// //     if (!existing) return res.status(404).json({ message: 'Заявка не найдена' });

// //     const existingDetails = safeParseDetails((existing as any).details);
// //     const newDetails = {
// //       ...existingDetails,
// //       isProcessedByAccountant: true,
// //       isViewedByAccountant: true,
// //     };

// //     const updated = await prisma.request.update({
// //       where: { id: id as string },
// //       data: {
// //         details: JSON.stringify(newDetails),
// //         completedAt: new Date(),
// //       } as any,
// //       include: { company: true },
// //     });

// //     res.json(updated);
// //   } catch (error: any) {
// //     console.error('completeByAccountant error:', error);
// //     res.status(500).json({ message: 'Ошибка при отметке "отработано"', details: error.message });
// //   }
// // };

// // /**
// //  * 🆕 ТЗ: Бухгалтер — финальное завершение работы.
// //  * Когда бухгалтер подтвердил что все документы сформированы и работа завершена,
// //  * заявка переезжает из "Активные" в "Завершённые".
// //  */
// // export const markFullyCompleted = async (req: AuthRequest, res: Response) => {
// //   try {
// //     const { id } = req.params;
// //     const existing = await prisma.request.findUnique({ where: { id: id as string } });
// //     if (!existing) return res.status(404).json({ message: 'Заявка не найдена' });

// //     const updated = await prisma.request.update({
// //       where: { id: id as string },
// //       data: {
// //         isFullyCompleted: true,
// //         fullyCompletedAt: new Date(),
// //         reEditedAfterCompletion: false,    // сбрасываем флаг повторной правки
// //       } as any,
// //       include: { company: true },
// //     });

// //     res.json(updated);
// //   } catch (error: any) {
// //     console.error('markFullyCompleted error:', error);
// //     res.status(500).json({ message: 'Ошибка при завершении', details: error.message });
// //   }
// // };

// // /**
// //  * 🆕 ТЗ: Аналитика — отметка оплаты.
// //  */
// // export const markPaid = async (req: AuthRequest, res: Response) => {
// //   try {
// //     const { id } = req.params;
// //     const { isPaid } = req.body;

// //     const updated = await prisma.request.update({
// //       where: { id: id as string },
// //       data: {
// //         isPaid: isPaid !== false,
// //         paidAt: isPaid !== false ? new Date() : null,
// //       } as any,
// //       include: { company: true },
// //     });

// //     res.json(updated);
// //   } catch (error: any) {
// //     console.error('markPaid error:', error);
// //     res.status(500).json({ message: 'Ошибка при отметке оплаты', details: error.message });
// //   }
// // };

// // /**
// //  * ТЗ: При переносе Заявки/СМР/ТТН из отработанных дата должна быть актуальной.
// //  */
// // export const restoreRequest = async (req: AuthRequest, res: Response) => {
// //   try {
// //     const { id } = req.params;
// //     const existing = await prisma.request.findUnique({ where: { id: id as string } });
// //     if (!existing) return res.status(404).json({ message: 'Заявка не найдена' });

// //     const existingDetails = safeParseDetails((existing as any).details);
// //     const newDetails = {
// //       ...existingDetails,
// //       readyForAccountant: false,
// //       isDeferredForAccountant: false,
// //       isProcessedByAccountant: false,
// //       isViewedByAccountant: false,
// //     };

// //     const today = new Date().toISOString().split('T')[0];

// //     const updated = await prisma.request.update({
// //       where: { id: id as string },
// //       data: {
// //         date: today,
// //         completedAt: null,
// //         isFullyCompleted: false,
// //         fullyCompletedAt: null,
// //         details: JSON.stringify(newDetails),
// //       } as any,
// //       include: { company: true },
// //     });

// //     res.json(updated);
// //   } catch (error: any) {
// //     console.error('restoreRequest error:', error);
// //     res.status(500).json({ message: 'Ошибка при возврате заявки', details: error.message });
// //   }
// // };

// // export const deleteRequest = async (req: AuthRequest, res: Response) => {
// //   try {
// //     const { id } = req.params;
// //     if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
// //     if (req.user.role !== 'ADMIN') {
// //       return res.status(403).json({ message: 'Только администратор может удалять заявки' });
// //     }
// //     await prisma.request.delete({ where: { id: id as string } });
// //     res.json({ message: 'Заявка удалена' });
// //   } catch (error: any) {
// //     console.error('Delete request error:', error);
// //     res.status(500).json({ message: 'Ошибка при удалении заявки', details: error.message });
// //   }
// // };

// // @ts-nocheck
// import { Response } from 'express';
// import prisma from '../lib/prisma';
// import { AuthRequest } from '../middlewares/auth.middleware';

// const STATUS = {
//   REQUEST: 'Заявка',
//   SENT: 'Отправлено',
//   CANCELED: 'canceled',
//   DRAFT: 'draft',
// } as const;

// function safeParseDetails(raw: any): Record<string, any> {
//   if (!raw) return {};
//   if (typeof raw === 'object') return raw;
//   try { return JSON.parse(String(raw)); } catch { return {}; }
// }

// function hasFormedDocument(request: any, details: Record<string, any>): boolean {
//   if (request.type && request.type !== 'REQUEST' && request.type !== 'SIMPLE') return true;
//   if (details.docType === 'ttn' || details.docType === 'smr') return true;
//   if (details.isWarehouse) return true;
//   return false;
// }

// export const getRequests = async (req: AuthRequest, res: Response) => {
//   try {
//     const { companyId, isPaid, isFullyCompleted, isDeferred, type, status, dateFrom, dateTo } = req.query;
//     const sortByRaw = (req.query.sortBy as string) || 'createdAt';
//     const orderRaw = (req.query.order as string) || 'desc';

//     const ALLOWED_SORT = ['createdAt', 'updatedAt', 'date', 'status', 'type', 'docNumber', 'totalSum'];
//     const sortBy = ALLOWED_SORT.includes(sortByRaw) ? sortByRaw : 'createdAt';
//     const order: 'asc' | 'desc' = orderRaw === 'asc' ? 'asc' : 'desc';

//     const where: any = {};

//     // 🆕 ТЗ v2: PRIVATE видит только заявки своей привязанной компании, созданные им самим
//     if (req.user?.role === 'PRIVATE') {
//       const me = await prisma.user.findUnique({
//         where: { id: req.user.id },
//         select: { assignedCompanyId: true },
//       });
//       if (!me?.assignedCompanyId) return res.json([]);
//       where.companyId = me.assignedCompanyId;
//       where.managerId = req.user.id;
//     } else {
//       if (companyId) where.companyId = companyId as string;
//     }

//     if (type) where.type = type as string;
//     if (status) where.status = status as string;

//     if (isPaid === 'true') where.isPaid = true;
//     else if (isPaid === 'false') where.isPaid = false;

//     if (isFullyCompleted === 'true') where.isFullyCompleted = true;
//     else if (isFullyCompleted === 'false') where.isFullyCompleted = false;

//     if (dateFrom || dateTo) {
//       where.createdAt = {};
//       if (dateFrom) where.createdAt.gte = new Date(String(dateFrom));
//       if (dateTo) where.createdAt.lte = new Date(String(dateTo) + 'T23:59:59.999Z');
//     }

//     let requests = await prisma.request.findMany({
//       where,
//       include: { company: true, manager: { select: { id: true, name: true, email: true } } },
//       orderBy: { [sortBy]: order },
//     });

//     if (isDeferred === 'true') {
//       requests = requests.filter((r: any) => safeParseDetails(r.details).isDeferredForAccountant === true);
//     }

//     res.json(requests);
//   } catch (error: any) {
//     console.error('Get requests error:', error);
//     res.status(500).json({ message: 'Ошибка при получении заявок', details: error.message });
//   }
// };

// export const getRequest = async (req: AuthRequest, res: Response) => {
//   try {
//     const { id } = req.params;
//     const request = await prisma.request.findUnique({
//       where: { id: id as string },
//       include: { company: true, manager: { select: { id: true, name: true, email: true } } },
//     });
//     if (!request) return res.status(404).json({ message: 'Заявка не найдена' });

//     // 🆕 ТЗ v2: PRIVATE видит только свои
//     if (req.user?.role === 'PRIVATE') {
//       const me = await prisma.user.findUnique({
//         where: { id: req.user.id },
//         select: { assignedCompanyId: true },
//       });
//       if (request.companyId !== me?.assignedCompanyId || request.managerId !== req.user.id) {
//         return res.status(403).json({ message: 'Доступ запрещён' });
//       }
//     }

//     res.json(request);
//   } catch (error: any) {
//     console.error('Get request error:', error);
//     res.status(500).json({ message: 'Ошибка при получении заявки', details: error.message });
//   }
// };

// export const createRequest = async (req: AuthRequest, res: Response) => {
//   try {
//     const { status, date, companyId, type, docNumber, details, totalSum, ...rest } = req.body;
//     const route = req.body.route;
//     const cargo = req.body.cargo;

//     if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

//     // 🆕 ТЗ v2: PRIVATE — companyId всегда из его assignedCompanyId
//     let finalCompanyId = companyId;
//     if (req.user.role === 'PRIVATE') {
//       const me = await prisma.user.findUnique({
//         where: { id: req.user.id },
//         select: { assignedCompanyId: true },
//       });
//       if (!me?.assignedCompanyId) {
//         return res.status(400).json({ message: 'Частное лицо не привязано к компании' });
//       }
//       finalCompanyId = me.assignedCompanyId;
//     }

//     if (!finalCompanyId) return res.status(400).json({ message: 'companyId is required' });

//     const routeStr = typeof route === 'object' && route !== null ? `${route.fromCity || ''} -> ${route.toCity || ''}` : route;
//     const cargoStr = typeof cargo === 'object' && cargo !== null ? JSON.stringify(cargo) : cargo;

//     let detailsStr: string;
//     if (details !== undefined) {
//       detailsStr = typeof details === 'string' ? details : JSON.stringify(details);
//     } else {
//       detailsStr = JSON.stringify(rest);
//     }

//     const newRequest = await prisma.request.create({
//       data: {
//         status: status || STATUS.REQUEST,
//         date: date || new Date().toISOString().split('T')[0],
//         companyId: finalCompanyId,
//         managerId: req.user.id,
//         type: type || 'REQUEST',
//         route: routeStr,
//         cargo: cargoStr,
//         docNumber: docNumber,
//         totalSum: totalSum ? String(totalSum) : '',
//         details: detailsStr,
//       } as any,
//       include: { company: true },
//     });

//     res.status(201).json(newRequest);
//   } catch (error: any) {
//     console.error('Create request error:', error);
//     res.status(500).json({ message: 'Ошибка при создании заявки', details: error.message });
//   }
// };

// export const updateRequest = async (req: AuthRequest, res: Response) => {
//   try {
//     const { id } = req.params;

//     const result = await prisma.$transaction(async (tx) => {
//       const existing = await tx.request.findUnique({ where: { id: id as string } });
//       if (!existing) throw new Error('NOT_FOUND');

//       // 🆕 ТЗ v2: PRIVATE может редактировать только свои
//       if (req.user?.role === 'PRIVATE') {
//         const me = await tx.user.findUnique({
//           where: { id: req.user.id },
//           select: { assignedCompanyId: true },
//         });
//         if (existing.companyId !== me?.assignedCompanyId || existing.managerId !== req.user.id) {
//           throw new Error('FORBIDDEN');
//         }
//       }

//       const existingDetails = safeParseDetails((existing as any).details);
//       const { status, date, type, docNumber, companyId, totalSum, ...bodyFields } = req.body;

//       // 🆕 ТЗ: Запрет смены компании
//       if (companyId !== undefined && companyId !== existing.companyId) {
//         throw new Error('CANNOT_CHANGE_COMPANY');
//       }

//       const willSetReadyForAccountant =
//         bodyFields.readyForAccountant === true ||
//         (req.body.details && typeof req.body.details === 'object' && req.body.details.readyForAccountant === true);

//       if (willSetReadyForAccountant && !existingDetails.readyForAccountant) {
//         const mergedPreview = {
//           ...existingDetails,
//           ...bodyFields,
//           ...(req.body.details && typeof req.body.details === 'object' ? req.body.details : {}),
//         };
//         if (!hasFormedDocument({ ...existing, type: type !== undefined ? type : existing.type }, mergedPreview)) {
//           throw new Error('DOCUMENT_NOT_FORMED');
//         }
//       }

//       const mergedDetails: Record<string, any> = { ...existingDetails, ...bodyFields };
//       if (req.body.details && typeof req.body.details === 'object') {
//         Object.assign(mergedDetails, req.body.details);
//       }

//       const route = req.body.route !== undefined ? req.body.route : existingDetails.route;
//       const cargo = req.body.cargo !== undefined ? req.body.cargo : existingDetails.cargo;

//       let routeStr: string | undefined;
//       if (route) routeStr = typeof route === 'object' ? `${route.fromCity || ''} -> ${route.toCity || ''}` : route;

//       let cargoStr: string | undefined;
//       if (cargo) cargoStr = typeof cargo === 'object' ? JSON.stringify(cargo) : cargo;

//       const wasFullyCompleted = (existing as any).isFullyCompleted === true;
//       const isManagerEditing = req.user?.role === 'MANAGER' || req.user?.role === 'ADMIN';

//       const updateData: any = {
//         status: status !== undefined ? status : existing.status,
//         date: date !== undefined ? date : existing.date,
//         type: type !== undefined ? type : existing.type,
//         route: routeStr !== undefined ? routeStr : (existing as any).route,
//         cargo: cargoStr !== undefined ? cargoStr : (existing as any).cargo,
//         docNumber: docNumber !== undefined ? docNumber : existing.docNumber,
//         totalSum: totalSum !== undefined ? String(totalSum) : existing.totalSum,
//         details: JSON.stringify(mergedDetails),
//       };

//       if (wasFullyCompleted && isManagerEditing) {
//         updateData.reEditedAfterCompletion = true;
//         updateData.isFullyCompleted = false;
//         updateData.fullyCompletedAt = null;
//       }

//       const updated = await tx.request.update({
//         where: { id: id as string },
//         data: updateData,
//         include: { company: true },
//       });

//       return updated;
//     }, { timeout: 10000 });

//     res.json(result);
//   } catch (error: any) {
//     if (error.message === 'NOT_FOUND') return res.status(404).json({ message: 'Заявка не найдена' });
//     if (error.message === 'FORBIDDEN') return res.status(403).json({ message: 'Доступ запрещён' });
//     if (error.message === 'DOCUMENT_NOT_FORMED') {
//       return res.status(400).json({ message: 'Нельзя отправить заявку бухгалтеру до формирования СМР/ТТН/Склад' });
//     }
//     if (error.message === 'CANNOT_CHANGE_COMPANY') {
//       return res.status(400).json({ message: 'Нельзя менять компанию у существующей заявки. Аннулируйте текущую и создайте новую.' });
//     }
//     console.error('Update Request Error:', error);
//     res.status(500).json({ message: 'Ошибка при обновлении заявки', details: error.message });
//   }
// };

// export const cancelAndClone = async (req: AuthRequest, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { newCompanyId } = req.body;

//     if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
//     if (!newCompanyId) return res.status(400).json({ message: 'newCompanyId is required' });

//     const result = await prisma.$transaction(async (tx) => {
//       const existing = await tx.request.findUnique({ where: { id: id as string } });
//       if (!existing) throw new Error('NOT_FOUND');

//       await tx.request.update({
//         where: { id: id as string },
//         data: { status: STATUS.CANCELED } as any,
//       });

//       const existingDetails = safeParseDetails((existing as any).details);
//       const today = new Date().toISOString().split('T')[0];

//       const cloned = await tx.request.create({
//         data: {
//           status: STATUS.REQUEST,
//           date: today,
//           companyId: newCompanyId,
//           managerId: req.user!.id,
//           type: existing.type,
//           route: (existing as any).route,
//           cargo: (existing as any).cargo,
//           docNumber: null,
//           totalSum: existing.totalSum,
//           details: JSON.stringify({
//             ...existingDetails,
//             clonedFrom: existing.id,
//             readyForAccountant: false,
//             isProcessedByAccountant: false,
//           }),
//         } as any,
//         include: { company: true },
//       });

//       return cloned;
//     }, { timeout: 10000 });

//     res.status(201).json(result);
//   } catch (error: any) {
//     if (error.message === 'NOT_FOUND') return res.status(404).json({ message: 'Заявка не найдена' });
//     console.error('cancelAndClone error:', error);
//     res.status(500).json({ message: 'Ошибка при аннулировании', details: error.message });
//   }
// };

// export const completeByAccountant = async (req: AuthRequest, res: Response) => {
//   try {
//     const { id } = req.params;
//     const existing = await prisma.request.findUnique({ where: { id: id as string } });
//     if (!existing) return res.status(404).json({ message: 'Заявка не найдена' });

//     const existingDetails = safeParseDetails((existing as any).details);
//     const newDetails = { ...existingDetails, isProcessedByAccountant: true, isViewedByAccountant: true };

//     const updated = await prisma.request.update({
//       where: { id: id as string },
//       data: { details: JSON.stringify(newDetails), completedAt: new Date() } as any,
//       include: { company: true },
//     });

//     res.json(updated);
//   } catch (error: any) {
//     console.error('completeByAccountant error:', error);
//     res.status(500).json({ message: 'Ошибка при отметке "отработано"', details: error.message });
//   }
// };

// export const markFullyCompleted = async (req: AuthRequest, res: Response) => {
//   try {
//     const { id } = req.params;
//     const existing = await prisma.request.findUnique({ where: { id: id as string } });
//     if (!existing) return res.status(404).json({ message: 'Заявка не найдена' });

//     const updated = await prisma.request.update({
//       where: { id: id as string },
//       data: {
//         isFullyCompleted: true,
//         fullyCompletedAt: new Date(),
//         reEditedAfterCompletion: false,
//       } as any,
//       include: { company: true },
//     });

//     res.json(updated);
//   } catch (error: any) {
//     console.error('markFullyCompleted error:', error);
//     res.status(500).json({ message: 'Ошибка при завершении', details: error.message });
//   }
// };

// export const markPaid = async (req: AuthRequest, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { isPaid } = req.body;

//     const updated = await prisma.request.update({
//       where: { id: id as string },
//       data: {
//         isPaid: isPaid !== false,
//         paidAt: isPaid !== false ? new Date() : null,
//       } as any,
//       include: { company: true },
//     });

//     res.json(updated);
//   } catch (error: any) {
//     console.error('markPaid error:', error);
//     res.status(500).json({ message: 'Ошибка при отметке оплаты', details: error.message });
//   }
// };

// export const restoreRequest = async (req: AuthRequest, res: Response) => {
//   try {
//     const { id } = req.params;
//     const existing = await prisma.request.findUnique({ where: { id: id as string } });
//     if (!existing) return res.status(404).json({ message: 'Заявка не найдена' });

//     const existingDetails = safeParseDetails((existing as any).details);
//     const newDetails = {
//       ...existingDetails,
//       readyForAccountant: false,
//       isDeferredForAccountant: false,
//       isProcessedByAccountant: false,
//       isViewedByAccountant: false,
//     };

//     const today = new Date().toISOString().split('T')[0];

//     const updated = await prisma.request.update({
//       where: { id: id as string },
//       data: {
//         date: today,
//         completedAt: null,
//         isFullyCompleted: false,
//         fullyCompletedAt: null,
//         details: JSON.stringify(newDetails),
//       } as any,
//       include: { company: true },
//     });

//     res.json(updated);
//   } catch (error: any) {
//     console.error('restoreRequest error:', error);
//     res.status(500).json({ message: 'Ошибка при возврате заявки', details: error.message });
//   }
// };

// export const deleteRequest = async (req: AuthRequest, res: Response) => {
//   try {
//     const { id } = req.params;
//     if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
//     if (req.user.role !== 'ADMIN') {
//       return res.status(403).json({ message: 'Только администратор может удалять заявки' });
//     }
//     await prisma.request.delete({ where: { id: id as string } });
//     res.json({ message: 'Заявка удалена' });
//   } catch (error: any) {
//     console.error('Delete request error:', error);
//     res.status(500).json({ message: 'Ошибка при удалении заявки', details: error.message });
//   }
// };



// @ts-nocheck
import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
// ТЗ: токены одноразовых ссылок генерируются на сервере — клиентский был бы предсказуем.
import { randomUUID } from 'crypto';
// Цепочка подписей. Зеркало src/shared/sign/signChain.js — см. комментарий там.
import { SIGN_ROLE, isKnownSignRole, canSign, canFormDocument, hasDocument } from '../lib/signChain';

const STATUS = {
  REQUEST: 'Заявка',
  SENT: 'Отправлено',
  CANCELED: 'canceled',
  DRAFT: 'draft',
} as const;

function safeParseDetails(raw: any): Record<string, any> {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(String(raw)); } catch { return {}; }
}

/**
 * ТЗ: доступ курьера по городу.
 *
 * ⚠️ ЗЕРКАЛО ФРОНТА: src/shared/courier/courierCity.js. При правке менять
 * в ОБОИХ местах. Общий модуль сделать нельзя — образ бэка собирается из
 * каталога server/ и до src/ не достаёт.
 *
 * 'toCity' — куда доставляют, 'fromCity' — откуда забирают. Заказчик указал
 * город назначения; вопрос не окончательный (курьер ведёт заявку целиком:
 * и «Забрал», и «Доставил»), поэтому переключается одной строкой.
 */
const COURIER_CITY_FIELD: 'toCity' | 'fromCity' = 'toCity';

/** Города вводят руками, регистр и пробелы гуляют — сравниваем нормализованно. */
function normalizeCity(value: any): string {
  return String(value || '').trim().toLowerCase();
}

/** Город заявки, по которому её видит курьер. */
function requestCityForCourier(details: Record<string, any>): string {
  const route = details?.route;
  if (route && typeof route === 'object') return route[COURIER_CITY_FIELD] || '';
  return '';
}

function hasFormedDocument(request: any, details: Record<string, any>): boolean {
  if (request.type && request.type !== 'REQUEST' && request.type !== 'SIMPLE') return true;
  if (details.docType === 'ttn' || details.docType === 'smr') return true;
  if (details.isWarehouse) return true;
  return false;
}

// 🆕 Генерация нового номера документа при клонировании
function generateClonedDocNumber(originalNumber: string | null): string {
  if (!originalNumber) {
    return `R-${Date.now().toString().slice(-7)}`;
  }
  // Если номер был типа "А1234567" - добавляем "-копия-NN"
  // Если уже была копия - инкрементируем
  const copyMatch = originalNumber.match(/^(.+?)(?:-копия-(\d+))?$/);
  if (copyMatch) {
    const base = copyMatch[1];
    const copyNum = copyMatch[2] ? parseInt(copyMatch[2], 10) + 1 : 2;
    return `${base}-копия-${copyNum}`;
  }
  return `${originalNumber}-копия`;
}

export const getRequests = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, isPaid, isFullyCompleted, isDeferred, type, status, dateFrom, dateTo } = req.query;
    const sortByRaw = (req.query.sortBy as string) || 'createdAt';
    const orderRaw = (req.query.order as string) || 'desc';

    const ALLOWED_SORT = ['createdAt', 'updatedAt', 'date', 'status', 'type', 'docNumber', 'totalSum'];
    const sortBy = ALLOWED_SORT.includes(sortByRaw) ? sortByRaw : 'createdAt';
    const order: 'asc' | 'desc' = orderRaw === 'asc' ? 'asc' : 'desc';

    const where: any = {};

    if (req.user?.role === 'PRIVATE') {
      const me = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { assignedCompanyId: true },
      });
      if (!me?.assignedCompanyId) return res.json([]);
      where.companyId = me.assignedCompanyId;
      // PRIVATE менеджеры видят все накладные своей компании (друг друга)
    } else {
      if (companyId) where.companyId = companyId as string;
    }

    if (type) where.type = type as string;
    if (status) where.status = status as string;

    if (isPaid === 'true') where.isPaid = true;
    else if (isPaid === 'false') where.isPaid = false;

    if (isFullyCompleted === 'true') where.isFullyCompleted = true;
    else if (isFullyCompleted === 'false') where.isFullyCompleted = false;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(String(dateFrom));
      if (dateTo) where.createdAt.lte = new Date(String(dateTo) + 'T23:59:59.999Z');
    }

    let requests = await prisma.request.findMany({
      where,
      include: { company: true, manager: { select: { id: true, name: true, email: true } } },
      orderBy: { [sortBy]: order },
    });

    if (isDeferred === 'true') {
      requests = requests.filter((r: any) => safeParseDetails(r.details).isDeferredForAccountant === true);
    }

    // ТЗ: курьер видит только заявки своего города. Проверка обязана быть
    // здесь, а не только в интерфейсе: скрытая строка в таблице ограничением
    // не является — без этого фильтра курьер получил бы все заявки всех
    // компаний простым запросом к API.
    //
    // Город не назначен → пустой список. Пустое поле означает «доступ не
    // настроен», а не «доступ ко всему»: иначе новый курьер до настройки
    // видел бы всю базу.
    if (req.user?.role === 'COURIER') {
      const me = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { city: true },
      });
      const city = normalizeCity((me as any)?.city);
      if (!city) return res.json([]);
      requests = requests.filter(
        (r: any) => normalizeCity(requestCityForCourier(safeParseDetails(r.details))) === city
      );
    }

    res.json(requests);
  } catch (error: any) {
    console.error('Get requests error:', error);
    res.status(500).json({ message: 'Ошибка при получении заявок', details: error.message });
  }
};

// ============================================================
// ВЫДАЧА ДЛЯ КАБИНЕТОВ ДВИЖЕНИЯ ГРУЗА.
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ ЭНДПОИНТ, А НЕ ФИЛЬТР В getRequests. Кабинету кладовщика и
// курьеров нужно ровно движение: номер, направление, адреса, места, вес,
// статус. Суммы, реквизиты, телефоны сторон и состав услуг им не нужны — и не
// должны доезжать. Спрятать колонку в интерфейсе ограничением не является:
// данные всё равно ушли бы в браузер и лежали в ответе API. Тот же принцип
// уже применён к публичным ссылкам (accessLink.publicCargoView).
//
// ⚠️ ЗЕРКАЛО ФРОНТА: src/shared/cargo/cabinets.js (CABINETS[].scope).
// ============================================================
const CABINET_SCOPE: Record<string, 'fromCity' | 'toCity' | 'all'> = {
  // Склад и местный курьер работают с грузом ДО отправки — их город
  // отправления. Региональный принимает и выдаёт — его город назначения.
  WAREHOUSE_KEEPER: 'fromCity',
  COURIER_LOCAL: 'fromCity',
  COURIER_REGION: 'toCity',
  OPS_MANAGER: 'all',
};

/** Урезанный вид накладной для кабинета. Ни сумм, ни персональных данных. */
function cabinetView(r: any) {
  const d = safeParseDetails(r.details);
  const route = d.route || {};
  const totals = d.totals || {};
  return {
    id: r.id,
    docNumber: r.docNumber || '',
    date: r.date || '',
    fromCity: route.fromCity || '',
    toCity: route.toCity || '',
    fromAddress: route.fromAddress || '',
    toAddress: route.toAddress || '',
    cargoText: d.cargoText || '',
    seats: Number(totals.seats) || 0,
    weight: Number(totals.weight) || 0,
    cargoStatus: normalizeCargo(r.cargoStatus),
    cargoStatusAt: r.cargoStatusAt || null,
    cargoEvents: parseCargoEvents(r.cargoEvents),
  };
}

export const getCabinetRequests = async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role || '';
    const scope = CABINET_SCOPE[role];
    if (!scope) {
      return res.status(403).json({ message: 'У этой роли нет кабинета движения груза' });
    }

    let city = '';
    if (scope !== 'all') {
      const me = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { city: true },
      });
      city = normalizeCity((me as any)?.city);
      // Город не назначен — пустой список, а не «всё». Пустое поле означает
      // «доступ не настроен»: иначе новый кладовщик до настройки видел бы
      // весь груз всех компаний. То же правило, что у курьера.
      if (!city) return res.json({ city: '', scope, items: [] });
    }

    const rows = await prisma.request.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const items = rows
      .filter((r: any) => {
        // Аннулированные не показываем НИКОМУ, включая операционного
        // менеджера: груза по такой накладной нет, а в урезанной выдаче
        // кабинета поля status нет вовсе — отличить живую от аннулированной
        // на экране было бы нечем. Кладовщик успел провести аннулированную
        // через приёмку и отпуск склада именно из-за этого.
        if (CARGO_BLOCKING_DOC_STATUSES.includes(String(r.status || ''))) return false;
        if (scope === 'all') return true;
        const d: any = safeParseDetails(r.details);
        return normalizeCity(d?.route?.[scope]) === city;
      })
      .map(cabinetView);

    res.json({ city, scope, items });
  } catch (error: any) {
    console.error('getCabinetRequests error:', error);
    res.status(500).json({ message: 'Ошибка при получении груза', details: error.message });
  }
};

export const getRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const request = await prisma.request.findUnique({
      where: { id: id as string },
      include: { company: true, manager: { select: { id: true, name: true, email: true } } },
    });
    if (!request) return res.status(404).json({ message: 'Заявка не найдена' });

   if (req.user?.role === 'PRIVATE') {
        const me = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: { assignedCompanyId: true },
        });
        if (request.companyId !== me?.assignedCompanyId) {
          return res.status(403).json({ message: 'Доступ запрещён' });
        }
      }

    res.json(request);
  } catch (error: any) {
    console.error('Get request error:', error);
    res.status(500).json({ message: 'Ошибка при получении заявки', details: error.message });
  }
};

/**
 * ТЗ: аккуратная сквозная нумерация накладных частных лиц — 1, 2, 3…
 *
 * ПОЧЕМУ НА СЕРВЕРЕ. Раньше номер считал клиент: тянул весь список, брал
 * максимум, прибавлял единицу. Отсюда два дефекта. Первый — при сбое запроса
 * срабатывал аварийный фоллбэк «А» + время в миллисекундах, и появлялись те
 * самые «непонятные цифры» вида А6016146, после которых серия уезжала
 * в миллионы навсегда. Второй — гонка: два менеджера, оформляющие приём
 * одновременно, получали один и тот же максимум, и второй упирался в @unique.
 * На сервере номер выдаётся в одной транзакции с созданием записи.
 *
 * ФОРМАТ. Голое число без префикса. Старые номера частных (А000001…) остаются
 * как есть и с новыми не пересекаются: это разные строки, @unique не сработает.
 * Перенумеровывать старое нельзя — номера ушли на печатные наклейки, чеки
 * и в QR-код, которые уже у клиентов на руках.
 *
 * Последовательность ОДНА на все компании: docNumber уникален глобально,
 * поэтому «своя нумерация с 1 у каждой компании» столкнулась бы на первом же
 * совпадении.
 */
const NUMERIC_DOC_NUMBER = /^\d+$/;

async function nextSimpleDocNumber(tx: any): Promise<string> {
  const rows = await tx.$queryRawUnsafe<Array<{ max: number | null }>>(
    `SELECT COALESCE(MAX(CAST("docNumber" AS BIGINT)), 0)::int AS max
       FROM "Request"
      WHERE "docNumber" ~ '^[0-9]+$'`
  );
  const max = Number(rows?.[0]?.max) || 0;
  return String(max + 1);
}

/** Частная накладная: по типу или по признаку в details. */
function isSimpleRequest(type: any, details: Record<string, any>): boolean {
  return type === 'SIMPLE' || details?.isSimple === true;
}

export const createRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { status, date, companyId, type, docNumber, details, totalSum, ...rest } = req.body;
    const route = req.body.route;
    const cargo = req.body.cargo;

    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    let finalCompanyId = companyId;
    if (req.user.role === 'PRIVATE') {
      const me = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { assignedCompanyId: true },
      });
      if (!me?.assignedCompanyId) {
        return res.status(400).json({ message: 'Частное лицо не привязано к компании' });
      }
      finalCompanyId = me.assignedCompanyId;
    }

    if (!finalCompanyId) return res.status(400).json({ message: 'companyId is required' });

    const routeStr = typeof route === 'object' && route !== null ? `${route.fromCity || ''} -> ${route.toCity || ''}` : route;
    const cargoStr = typeof cargo === 'object' && cargo !== null ? JSON.stringify(cargo) : cargo;

    let detailsStr: string;
    if (details !== undefined) {
      detailsStr = typeof details === 'string' ? details : JSON.stringify(details);
    } else {
      detailsStr = JSON.stringify(rest);
    }

    const baseData = {
      status: status || STATUS.REQUEST,
      date: date || new Date().toISOString().split('T')[0],
      companyId: finalCompanyId,
      managerId: req.user.id,
      type: type || 'REQUEST',
      route: routeStr,
      cargo: cargoStr,
      totalSum: totalSum ? String(totalSum) : '',
      details: detailsStr,
    };

    // Номер частной накладной выдаёт сервер. Клиент может прислать свой —
    // тогда уважаем его (так работают юрлица и импорт), но если поле пустое,
    // берём следующий номер сквозной последовательности.
    const parsedDetails = safeParseDetails(detailsStr);
    const needsNumber = !docNumber && isSimpleRequest(type, parsedDetails);

    let newRequest;
    if (!needsNumber) {
      newRequest = await prisma.request.create({
        data: { ...baseData, docNumber } as any,
        include: { company: true },
      });
    } else {
      // Между вычислением максимума и вставкой номер может занять параллельный
      // запрос — тогда Prisma отдаёт P2002 по уникальному docNumber. Повторяем
      // с пересчётом: несколько попыток надёжнее любой блокировки и не держат
      // таблицу. Практически хватает первой.
      const ATTEMPTS = 5;
      let lastError: any = null;
      for (let i = 0; i < ATTEMPTS; i++) {
        try {
          newRequest = await prisma.$transaction(async (tx) => {
            const number = await nextSimpleDocNumber(tx);
            return tx.request.create({
              data: { ...baseData, docNumber: number } as any,
              include: { company: true },
            });
          });
          break;
        } catch (e: any) {
          lastError = e;
          const isDuplicate = e?.code === 'P2002';
          if (!isDuplicate) throw e;
        }
      }
      if (!newRequest) {
        console.error('createRequest: не удалось подобрать номер', lastError);
        return res.status(409).json({ message: 'Не удалось присвоить номер накладной, повторите сохранение' });
      }
    }

    res.status(201).json(newRequest);
  } catch (error: any) {
    console.error('Create request error:', error);
    res.status(500).json({ message: 'Ошибка при создании заявки', details: error.message });
  }
};

export const updateRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.request.findUnique({ where: { id: id as string } });
      if (!existing) throw new Error('NOT_FOUND');

      if (req.user?.role === 'PRIVATE') {
        const me = await tx.user.findUnique({
          where: { id: req.user.id },
          select: { assignedCompanyId: true },
        });
       if (existing.companyId !== me?.assignedCompanyId) {
          throw new Error('FORBIDDEN');
        }
      }

      const existingDetails = safeParseDetails((existing as any).details);
      const { status, date, type, docNumber, companyId, totalSum, ...bodyFields } = req.body;

      // ВОРОТА ЦЕПОЧКИ ПОДПИСЕЙ: перевозочный документ не формируется, пока
      // клиент не подписал заявку.
      //
      // Проверяем именно ПЕРЕХОД «не документ → документ», а не «стало
      // документом». Иначе редактирование уже сформированной ТТН падало бы с
      // отказом: форма правки шлёт type в каждом запросе, и «целевое значение
      // — ттн» стоит там всегда.
      //
      // Проверка на сервере, а не только кнопкой: скрытая кнопка ограничением
      // не является, эндпоинт открыт для любого запроса с токеном.
      const becomingDoc =
        !hasDocument(existing) &&
        hasDocument({ docType: (bodyFields as any).docType, type });
      if (becomingDoc) {
        const gate = canFormDocument(existing);
        if (!gate.ok) {
          return res.status(409).json({ message: gate.reason });
        }
      }

      // ⚠️ ЗЕРКАЛО src/shared/acts/mergeRequest.js (COLUMN_OWNED).
      //
      // Завершение и оплата живут в КОЛОНКАХ и меняются только выделенными
      // эндпоинтами: mark-fully-completed (закрыт requireAccountant), mark-paid,
      // restore. Обычный update не должен их касаться.
      //
      // Раньше любое такое поле в теле запроса просто проваливалось в details
      // (оно не разбирается выше и попадает в bodyFields). Копия в details
      // потом перекрывала колонку в списках — и накладная показывалась
      // завершённой мимо бухгалтера. На проде такие копии уже есть у 5 записей.
      // Убираем их из тела и заодно чистим уже накопленный мусор в details.
      const COLUMN_OWNED = [
        'isFullyCompleted', 'fullyCompletedAt', 'isPaid', 'paidAt', 'reEditedAfterCompletion',
      ];
      for (const key of COLUMN_OWNED) {
        delete (bodyFields as any)[key];
        delete (existingDetails as any)[key];
      }

      // details может прийти ОБЪЕКТОМ (ActCreatePage шлёт поля плоско) либо СТРОКОЙ
      // JSON (форма редактирования частной накладной). Раньше строка молча терялась:
      // сырой ключ details подмешивался внутрь самих details, а слияние пропускалось
      // по typeof !== 'object' — правки (вес, места) не сохранялись, ответ был 200.
      // Теперь строку парсим, а сырой ключ из bodyFields убираем, чтобы он не попал
      // внутрь details мусором.
      const incomingDetails: Record<string, any> | null =
        typeof req.body.details === 'string'
          ? safeParseDetails(req.body.details)
          : (req.body.details && typeof req.body.details === 'object' ? req.body.details : null);
      delete (bodyFields as any).details;

      // Смену ИП через обычное редактирование НЕ делаем: старый номер не должен
      // «переезжать» в новый ИП. Перевод — только через аннулирование + создание
      // новой заявки (endpoint cancel-and-clone): старая → canceled, номер остаётся
      // за ней; новая получает следующий номер целевого ИП.
      if (companyId !== undefined && companyId !== existing.companyId) {
        throw new Error('CANNOT_CHANGE_COMPANY');
      }

      // Проверка «отправить бухгалтеру» смотрит и на details-строку тоже — иначе
      // такой клиент проскочил бы мимо hasFormedDocument.
      const willSetReadyForAccountant =
        bodyFields.readyForAccountant === true ||
        (incomingDetails !== null && incomingDetails.readyForAccountant === true);

      if (willSetReadyForAccountant && !existingDetails.readyForAccountant) {
        const mergedPreview = {
          ...existingDetails,
          ...bodyFields,
          ...(incomingDetails || {}),
        };
        if (!hasFormedDocument({ ...existing, type: type !== undefined ? type : existing.type }, mergedPreview)) {
          throw new Error('DOCUMENT_NOT_FORMED');
        }
      }

      const mergedDetails: Record<string, any> = { ...existingDetails, ...bodyFields };
      if (incomingDetails) {
        Object.assign(mergedDetails, incomingDetails);
      }

      // Денормализованные колонки route/cargo: берём из плоского поля, иначе из
      // присланных details (клиент со строкой details меняет город именно там),
      // иначе оставляем прежнее значение.
      const route = req.body.route !== undefined
        ? req.body.route
        : (incomingDetails && incomingDetails.route !== undefined ? incomingDetails.route : existingDetails.route);
      const cargo = req.body.cargo !== undefined
        ? req.body.cargo
        : (incomingDetails && incomingDetails.cargo !== undefined ? incomingDetails.cargo : existingDetails.cargo);

      let routeStr: string | undefined;
      if (route) routeStr = typeof route === 'object' ? `${route.fromCity || ''} -> ${route.toCity || ''}` : route;

      let cargoStr: string | undefined;
      if (cargo) cargoStr = typeof cargo === 'object' ? JSON.stringify(cargo) : cargo;

      const wasFullyCompleted = (existing as any).isFullyCompleted === true;
      const isManagerEditing = req.user?.role === 'MANAGER' || req.user?.role === 'ADMIN';

      const updateData: any = {
        status: status !== undefined ? status : existing.status,
        date: date !== undefined ? date : existing.date,
        type: type !== undefined ? type : existing.type,
        route: routeStr !== undefined ? routeStr : (existing as any).route,
        cargo: cargoStr !== undefined ? cargoStr : (existing as any).cargo,
        docNumber: docNumber !== undefined ? docNumber : existing.docNumber,
        totalSum: totalSum !== undefined ? String(totalSum) : existing.totalSum,
        details: JSON.stringify(mergedDetails),
      };

      if (wasFullyCompleted && isManagerEditing) {
        updateData.reEditedAfterCompletion = true;
        updateData.isFullyCompleted = false;
        updateData.fullyCompletedAt = null;
      }

      const updated = await tx.request.update({
        where: { id: id as string },
        data: updateData,
        include: { company: true },
      });

      return updated;
    }, { timeout: 10000 });

    res.json(result);
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ message: 'Заявка не найдена' });
    if (error.message === 'FORBIDDEN') return res.status(403).json({ message: 'Доступ запрещён' });
    if (error.message === 'DOCUMENT_NOT_FORMED') {
      return res.status(400).json({ message: 'Нельзя отправить заявку бухгалтеру до формирования СМР/ТТН/Склад' });
    }
    if (error.message === 'CANNOT_CHANGE_COMPANY') {
      return res.status(400).json({ message: 'Нельзя сменить ИП у существующей заявки. Используйте «Перевести на другой ИП»: старая аннулируется, в новом ИП создастся новая заявка со своим номером.' });
    }
    console.error('Update Request Error:', error);
    res.status(500).json({ message: 'Ошибка при обновлении заявки', details: error.message });
  }
};

/**
 * 🆕 ТЗ v2: Аннулировать и создать новую копию ПОЛНОСТЬЮ.
 * Старая → canceled. Новая → копирует ВСЕ данные (включая details JSON), получает новый docNumber.
 * Если newCompanyId передан — используем его, иначе — компанию старой заявки.
 */
export const cancelAndClone = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newCompanyId, newDocNumber } = req.body || {};

    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.request.findUnique({ where: { id: id as string } });
      if (!existing) throw new Error('NOT_FOUND');

      const targetCompanyId = newCompanyId || existing.companyId;

      // Аннулируем старую
      await tx.request.update({
        where: { id: id as string },
        data: { status: STATUS.CANCELED } as any,
      });

      const existingDetails = safeParseDetails((existing as any).details);
      const today = new Date().toISOString().split('T')[0];

      // Номер новой заявки: если фронт прислал следующий номер целевого ИП
      // (genNumber(targetCompany)) — используем его; иначе fallback на «-копия».
      const docNumberFinal = (newDocNumber && String(newDocNumber).trim())
        ? String(newDocNumber).trim()
        : generateClonedDocNumber(existing.docNumber);

      // 🆕 Чистим details от служебных флагов чтоб клон был "свежим",
      // но сохраняем ВСЕ полезные данные (customer, receiver, route, cargo, services, etc.)
      const cleanDetails = {
        ...existingDetails,
        clonedFrom: existing.id,
        clonedFromNumber: existing.docNumber,
        readyForAccountant: false,
        isProcessedByAccountant: false,
        isFullyCompleted: false,
        isDeferredForAccountant: false,
        isViewedByAccountant: false,
        isViewedByManager: false,
        updatedByAccountant: false,
        snoIssued: false,
        avrSent: false,
        esfIssued: false,
        reEditedAfterCompletion: false,
        // 🆕 Дублируем docNumber внутри details чтоб фронт его подцепил
        docNumber: docNumberFinal,
      };

      const cloned = await tx.request.create({
        data: {
          status: STATUS.REQUEST,
          date: today,
          companyId: targetCompanyId,
          managerId: req.user!.id,
          type: existing.type,
          route: (existing as any).route,
          cargo: (existing as any).cargo,
          docNumber: docNumberFinal,                  // номер целевого ИП (или -копия fallback)
          totalSum: existing.totalSum,
          details: JSON.stringify(cleanDetails),
        } as any,
        include: { company: true },
      });

      return cloned;
    }, { timeout: 10000 });

    res.status(201).json(result);
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ message: 'Заявка не найдена' });
    console.error('cancelAndClone error:', error);
    res.status(500).json({ message: 'Ошибка при аннулировании', details: error.message });
  }
};

export const completeByAccountant = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.request.findUnique({ where: { id: id as string } });
    if (!existing) return res.status(404).json({ message: 'Заявка не найдена' });

    const existingDetails = safeParseDetails((existing as any).details);
    const newDetails = { ...existingDetails, isProcessedByAccountant: true, isViewedByAccountant: true };

    const updated = await prisma.request.update({
      where: { id: id as string },
      data: { details: JSON.stringify(newDetails), completedAt: new Date() } as any,
      include: { company: true },
    });

    res.json(updated);
  } catch (error: any) {
    console.error('completeByAccountant error:', error);
    res.status(500).json({ message: 'Ошибка при отметке "отработано"', details: error.message });
  }
};

export const markFullyCompleted = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.request.findUnique({ where: { id: id as string } });
    if (!existing) return res.status(404).json({ message: 'Заявка не найдена' });

    const updated = await prisma.request.update({
      where: { id: id as string },
      data: {
        isFullyCompleted: true,
        fullyCompletedAt: new Date(),
        reEditedAfterCompletion: false,
      } as any,
      include: { company: true },
    });

    res.json(updated);
  } catch (error: any) {
    console.error('markFullyCompleted error:', error);
    res.status(500).json({ message: 'Ошибка при завершении', details: error.message });
  }
};

/**
 * ТЗ: движение груза по сканированию QR.
 *
 * ⚠️ ЗЕРКАЛО ФРОНТА: src/shared/cargo/cargoStatus.js. При правке цепочки или
 * ролей менять в ОБОИХ местах. Общий модуль сделать нельзя — образ бэка
 * собирается из каталога server/ и до src/ не достаёт.
 */
// ПОЛНЫЙ МАРШРУТ. Прежние четыре шага остались опорными (optional:false) и на
// своих местах, новые вставлены между ними необязательными: не всякий груз
// проходит склад — часть едет от отправителя сразу на фуру. Правило перехода:
// вперёд можно на шаг, между которым и текущим лежат ТОЛЬКО необязательные
// шаги; перескок через опорный запрещён, как и раньше.
// entry — шагом можно НАЧАТЬ цепочку, когда груз ещё «не в пути». Их два:
// курьер забрал у отправителя ЛИБО клиент привёз груз на склад сам. Без
// второго у кладовщика не было ни одной доступной кнопки.
const CARGO_FLOW: { key: string; optional: boolean; entry?: boolean; roles: string[] }[] = [
  { key: 'picked_up',    optional: false, entry: true, roles: ['COURIER', 'MANAGER', 'ADMIN', 'OPS_MANAGER', 'COURIER_LOCAL'] },
  { key: 'wh_accepted',  optional: true,  entry: true, roles: ['COURIER', 'MANAGER', 'ADMIN', 'OPS_MANAGER', 'WAREHOUSE_KEEPER'] },
  { key: 'wh_released',  optional: true,  roles: ['COURIER', 'MANAGER', 'ADMIN', 'OPS_MANAGER', 'WAREHOUSE_KEEPER'] },
  { key: 'courier_took', optional: true,  roles: ['COURIER', 'MANAGER', 'ADMIN', 'OPS_MANAGER', 'COURIER_LOCAL'] },
  { key: 'loaded',       optional: false, roles: ['COURIER', 'MANAGER', 'ADMIN', 'OPS_MANAGER', 'COURIER_LOCAL', 'WAREHOUSE_KEEPER'] },
  { key: 'in_transit',   optional: true,  roles: ['COURIER', 'MANAGER', 'ADMIN', 'OPS_MANAGER', 'COURIER_REGION'] },
  { key: 'region_took',  optional: true,  roles: ['COURIER', 'MANAGER', 'ADMIN', 'OPS_MANAGER', 'COURIER_REGION'] },
  { key: 'rep_received', optional: false, roles: ['COURIER', 'MANAGER', 'ADMIN', 'OPS_MANAGER', 'COURIER_REGION'] },
  { key: 'delivered',    optional: false, roles: ['COURIER', 'MANAGER', 'ADMIN', 'OPS_MANAGER', 'COURIER_REGION'] },
];
const CARGO_FLOW_KEYS = CARGO_FLOW.map((s) => s.key);
// Статусы ДОКУМЕНТА, при которых груз двигать нельзя.
// ⚠️ ЗЕРКАЛО src/shared/cargo/cargoStatus.js (CARGO_BLOCKING_DOC_STATUSES).
const CARGO_BLOCKING_DOC_STATUSES = ['canceled'];
const CARGO_CHAIN = CARGO_FLOW.filter((s) => !s.optional).map((s) => s.key);
const CARGO_ALL_ROLES = Array.from(new Set(CARGO_FLOW.reduce<string[]>((a, s) => a.concat(s.roles), [])));
// Операционный менеджер контролирует все этапы — контроль без права исправить
// чужую ошибку контролем не является.
const CARGO_REVERT_ROLES = ['MANAGER', 'ADMIN', 'OPS_MANAGER'];

const cargoIndex = (key: string) => CARGO_FLOW_KEYS.indexOf(key);
const cargoStep = (key: string) => CARGO_FLOW.find((s) => s.key === key);

// КАРТА СТАРЫХ ЗНАЧЕНИЙ. Прежняя четвёрка — тождественно (обещание записано
// буквами: первый же переименованный шаг обязан появиться здесь, а не тихо
// оборвать историю едущего груза). Плюс протечка из Request.status: до
// появления cargoStatus курьерский экран писал движение прямо в статус
// документа значениями «Забрано»/«Доставлено».
// ⚠️ ЗЕРКАЛО src/shared/cargo/cargoStatus.js (CARGO_LEGACY_MAP).
const CARGO_LEGACY_MAP: Record<string, string> = {
  picked_up: 'picked_up',
  loaded: 'loaded',
  rep_received: 'rep_received',
  delivered: 'delivered',
  'забрано': 'picked_up',
  'доставлено': 'delivered',
};

/**
 * Значение из базы → шаг маршрута. Не распознали — '' («не в пути»).
 * Список ДОПУСТИМЫХ на вход значений карта не расширяет: target проверяется
 * по CARGO_FLOW_KEYS, «Забрано» прислать по-прежнему нельзя.
 */
function normalizeCargo(value: any): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (CARGO_FLOW_KEYS.includes(raw)) return raw;
  return CARGO_LEGACY_MAP[raw] || CARGO_LEGACY_MAP[raw.toLowerCase()] || '';
}

function nextCargo(current: string): string | null {
  const cur = normalizeCargo(current);
  const from = cur === '' ? -1 : cargoIndex(cur);
  for (let i = from + 1; i < CARGO_FLOW.length; i++) {
    if (!CARGO_FLOW[i].optional) return CARGO_FLOW[i].key;
  }
  return null;
}

function prevCargo(current: string): string | null {
  const i = cargoIndex(current);
  if (i < 0) return null;
  for (let k = i - 1; k >= 0; k--) {
    if (!CARGO_FLOW[k].optional) return CARGO_FLOW[k].key;
  }
  return '';
}

/** Лежат ли между позициями только необязательные шаги. */
function onlyOptionalBetween(a: number, b: number): boolean {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  for (let i = lo + 1; i < hi; i++) {
    if (!CARGO_FLOW[i].optional) return false;
  }
  return true;
}

/**
 * Достижим ли шаг вперёд. fromIdx = -1 — груз ещё «не в пути».
 * Перескакивать можно только через необязательные шаги; начать цепочку —
 * с любого входного (забор у отправителя или приёмка на склад).
 */
function canReachForward(fromIdx: number, toIdx: number): boolean {
  if (toIdx <= fromIdx) return false;
  if (fromIdx === -1 && CARGO_FLOW[toIdx]?.entry) return true;
  return onlyOptionalBetween(fromIdx, toIdx);
}

/** Журнал движения: колонка Json, у старых записей — null. */
function parseCargoEvents(raw: any): any[] {
  if (Array.isArray(raw)) return raw.filter((e) => e && typeof e === 'object');
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((e: any) => e && typeof e === 'object') : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Смена статуса груза. Проверка допустимости перехода И роли стоит ЗДЕСЬ:
 * скрытая кнопка в интерфейсе ограничением не является — эндпоинт открыт
 * для любого запроса с токеном.
 *
 * Существующий Request.status не трогается: движение груза и рабочий процесс
 * документа — разные оси.
 */
export const setCargoStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const target = String(req.body?.cargoStatus || '');
    const role = req.user?.role || '';

    if (!CARGO_FLOW_KEYS.includes(target)) {
      return res.status(400).json({ message: 'Неизвестный статус груза' });
    }
    if (!CARGO_ALL_ROLES.includes(role)) {
      return res.status(403).json({ message: 'Эта роль не отмечает движение груза' });
    }
    // Шаг разрешён не всякой роли, которая вообще двигает груз: кладовщик
    // отмечает склад и погрузку, но не выдачу получателю.
    if (!cargoStep(target)?.roles.includes(role)) {
      return res.status(403).json({ message: 'Эта роль не отмечает такой шаг движения груза' });
    }

    const existing = await prisma.request.findUnique({ where: { id: id as string } });
    if (!existing) return res.status(404).json({ message: 'Накладная не найдена' });

    // Аннулированную накладную не двигают: груза по ней нет. Проверка на
    // СЕРВЕРЕ, а не только скрытием из списка — эндпоинт открыт для любого
    // запроса с токеном, а ссылка на карточку могла остаться открытой во
    // вкладке ещё до аннулирования.
    if (CARGO_BLOCKING_DOC_STATUSES.includes(String((existing as any).status || ''))) {
      return res.status(409).json({ message: 'Накладная аннулирована — груз по ней не двигают' });
    }

    // Текущий статус читаем через карту: у записи из прежних времён в поле
    // может лежать «Забрано» — считать такой груз нетронутым значило бы
    // предложить водителю забрать его второй раз.
    const current = normalizeCargo((existing as any).cargoStatus);

    // Повторный скан одной наклейки — не ошибка: водитель мог приложить
    // телефон дважды. Отвечаем успехом, ничего не меняя.
    if (target === current) {
      return res.json({ ...existing, alreadySet: true });
    }

    const fromIdx = current === '' ? -1 : cargoIndex(current);
    const toIdx = cargoIndex(target);
    const isForward = canReachForward(fromIdx, toIdx);
    const isBack = toIdx < fromIdx && onlyOptionalBetween(toIdx, fromIdx);

    if (!isForward && !isBack) {
      return res.status(400).json({
        message: 'Нельзя перескочить шаг цепочки движения груза',
        current,
        expected: nextCargo(current),
      });
    }
    if (isBack && !CARGO_REVERT_ROLES.includes(role)) {
      return res.status(403).json({ message: 'Отменить шаг может только менеджер или администратор' });
    }

    // Журнал: пишем КАЖДУЮ отметку, включая откат. Прежние записи не трогаем —
    // история движения затирается только вместе с накладной.
    const events = parseCargoEvents((existing as any).cargoEvents);

    // ЗАСЕВ ИСТОРИИ ДЛЯ ЕДУЩЕГО ГРУЗА. Журнал появился позже самого движения:
    // у накладной может стоять «погружен на фуру», а истории — ни строки.
    // Без этой записи журнал начинался бы с середины пути, и в кабинете
    // операционного менеджера груз выглядел бы как никогда не забиравшийся.
    // Автор неизвестен честно: тогда его просто не записывали.
    if (events.length === 0 && current !== '') {
      events.push({
        status: current,
        at: ((existing as any).cargoStatusAt || (existing as any).updatedAt || new Date()).toISOString?.()
          || new Date().toISOString(),
        byId: null,
        byName: '',
        byRole: '',
        back: false,
        seeded: true, // отметка «восстановлено, а не зафиксировано в момент события»
      });
    }

    // ИМЯ АВТОРА берём из базы, а не из токена: в JWT кладутся только
    // { id, email, role } — имени там нет, и byName писался ПУСТЫМ. Журнал
    // заводился ради ответа «кто отметил», а отвечал лишь «какая роль».
    //
    // Имя записываем СНИМКОМ, на момент события: журнал должен показывать,
    // кто отметил тогда, а не как этого человека зовут в справочнике сейчас
    // (его могли переименовать или удалить).
    let byName = '';
    if (req.user?.id != null) {
      const actor = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { name: true, email: true },
      });
      byName = (actor?.name || actor?.email || '').trim();
    }

    events.push({
      status: target,
      at: new Date().toISOString(),
      byId: req.user?.id ?? null,
      byName,
      byRole: role,
      back: isBack,
    });

    const updated = await prisma.request.update({
      where: { id: id as string },
      data: { cargoStatus: target, cargoStatusAt: new Date(), cargoEvents: events } as any,
      include: { company: true },
    });
    res.json(updated);
  } catch (error: any) {
    console.error('setCargoStatus error:', error);
    res.status(500).json({ message: 'Ошибка смены статуса груза', details: error.message });
  }
};

/**
 * Поиск накладной по человеческому номеру — для СТАРЫХ наклеек, где в QR
 * записана строка TASU-<номер>-... вместо ссылки. Без этого весь уже
 * отгруженный груз перестал бы сканироваться.
 */
export const findByDocNumber = async (req: AuthRequest, res: Response) => {
  try {
    const num = String(req.query.docNumber || '').trim();
    if (!num) return res.status(400).json({ message: 'Не указан номер' });

    // ⚠️ ЗЕРКАЛО src/shared/acts/docNumber.js (docNumberVariants).
    // Номер ПЕЧАТАЕТСЯ дополненным до шести знаков (000042), а ХРАНИТСЯ голым
    // числом (42). Без этого поиск по напечатанной наклейке не находил бы
    // ничего: человек вводит ровно то, что видит на бумаге.
    // Ищем оба написания — и на случай, если часть записей когда-то сохранили
    // уже дополненными.
    const isPlain = /^\d+$/.test(num);
    const variants = new Set<string>([num]);
    if (isPlain) {
      const plain = num.replace(/^0+/, '') || '0';
      variants.add(plain);
      variants.add(plain.padStart(6, '0'));
    }

    const found = await prisma.request.findFirst({
      where: { docNumber: { in: [...variants] } },
      include: { company: true },
    });
    if (!found) return res.status(404).json({ message: `Накладная ${num} не найдена` });
    res.json(found);
  } catch (error: any) {
    console.error('findByDocNumber error:', error);
    res.status(500).json({ message: 'Ошибка поиска', details: error.message });
  }
};

export const markPaid = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isPaid } = req.body;
    const wantPaid = isPaid !== false;

    // ⚠️ ЗЕРКАЛО src/shared/acts/completion.js (canComplete).
    //
    // ТЗ: цепочка строгая — Активные → (менеджер) Обработанные →
    // (бухгалтер) Завершённые. Завершать можно ТОЛЬКО из «Обработанных».
    //
    // Проверка нужна ИМЕННО ЗДЕСЬ, а не только в интерфейсе: раньше правило
    // сводилось к тому, на какой вкладке нарисована кнопка. Устаревший список
    // в соседней вкладке браузера — и завершалась накладная, которую менеджер
    // ещё не обработал, причём молча.
    //
    // Снятие отметки (wantPaid === false) не ограничиваем: это исправление
    // ошибки бухгалтера, и запирать его нельзя.
    if (wantPaid) {
      const existing = await prisma.request.findUnique({ where: { id: id as string } });
      if (!existing) return res.status(404).json({ message: 'Накладная не найдена' });

      const status = String((existing as any).status || '').trim();
      if (status === 'canceled') {
        return res.status(409).json({ message: 'Накладная аннулирована — завершить нельзя' });
      }
      if (status !== 'done') {
        const RU: Record<string, string> = {
          act: 'В стоке', sent: 'Подано', done: 'Обработанные',
          deferred: 'Отложенные', canceled: 'Аннулированные',
        };
        return res.status(409).json({
          message: `Завершить нельзя: накладная сейчас «${RU[status] || status || 'без статуса'}». ` +
                   `Сначала менеджер переводит её в «Обработанные».`,
        });
      }
    }

    const updated = await prisma.request.update({
      where: { id: id as string },
      data: {
        isPaid: wantPaid,
        paidAt: wantPaid ? new Date() : null,
      } as any,
      include: { company: true },
    });

    res.json(updated);
  } catch (error: any) {
    console.error('markPaid error:', error);
    res.status(500).json({ message: 'Ошибка при отметке оплаты', details: error.message });
  }
};

export const restoreRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.request.findUnique({ where: { id: id as string } });
    if (!existing) return res.status(404).json({ message: 'Заявка не найдена' });

    const existingDetails = safeParseDetails((existing as any).details);
    const newDetails: Record<string, any> = {
      ...existingDetails,
      readyForAccountant: false,
      isDeferredForAccountant: false,
      isProcessedByAccountant: false,
      isViewedByAccountant: false,
    };
    // Возврат гасит КОЛОНКУ isFullyCompleted — но копия в details оставалась
    // и перекрывала её в списках: накладная возвращалась в работу и при этом
    // продолжала висеть в «Завершённых». Чистим копию здесь же.
    delete newDetails.isFullyCompleted;
    delete newDetails.fullyCompletedAt;

    const today = new Date().toISOString().split('T')[0];

    const updated = await prisma.request.update({
      where: { id: id as string },
      data: {
        date: today,
        completedAt: null,
        isFullyCompleted: false,
        fullyCompletedAt: null,
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
/**
 * ТЗ: выдача одноразовой ссылки наёмному водителю или получателю.
 *
 * Токен генерируется НА СЕРВЕРЕ (crypto.randomUUID): сгенерированный на
 * клиенте был бы предсказуем, а ссылка — угадываема.
 *
 * Срок по умолчанию 3 дня: рейсы междугородние, суток мало.
 */
export const issueAccessLink = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const role = req.user?.role || '';
    if (!['MANAGER', 'ADMIN'].includes(role)) {
      return res.status(403).json({ message: 'Ссылки выдают менеджер и администратор' });
    }

    const purpose = String(req.body?.purpose || 'cargo');
    if (!['cargo', 'sign'].includes(purpose)) {
      return res.status(400).json({ message: 'Неизвестное назначение ссылки' });
    }
    const daysRaw = Number(req.body?.days);
    const days = [1, 3, 7].includes(daysRaw) ? daysRaw : 3;

    const existing = await prisma.request.findUnique({ where: { id: id as string } });
    if (!existing) return res.status(404).json({ message: 'Накладная не найдена' });

    // РОЛЬ ПОДПИСИ. Умолчание 'receiver' — то, чем ссылка была до цепочки:
    // старый вызов без signRole обязан вести себя как раньше.
    let signRole: string | undefined;
    if (purpose === 'sign') {
      signRole = String(req.body?.signRole || SIGN_ROLE.RECEIVER);
      if (!isKnownSignRole(signRole)) {
        return res.status(400).json({ message: 'Неизвестная роль подписи' });
      }
      // Ссылку на подпись документа, которого нет, выдавать бессмысленно:
      // человек откроет её и упрётся. Проверяем на выдаче, а не только при
      // подписании — ошибку лучше показать менеджеру, чем клиенту.
      const gate = canSign(existing, signRole);
      if (!gate.ok) {
        return res.status(409).json({ message: gate.reason || 'Сейчас эту подпись собрать нельзя' });
      }
    }

    const prev = Array.isArray((existing as any).accessTokens) ? (existing as any).accessTokens : [];
    const entry: any = {
      token: randomUUID(),
      purpose,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + days * 86400000).toISOString(),
      usedAt: null,
      revokedAt: null,
      issuedBy: req.user?.id ?? null,
    };
    if (signRole) entry.signRole = signRole;

    await prisma.request.update({
      where: { id: id as string },
      data: { accessTokens: [...prev, entry] as any },
    });
    res.json(entry);
  } catch (error: any) {
    console.error('issueAccessLink error:', error);
    res.status(500).json({ message: 'Ошибка выдачи ссылки', details: error.message });
  }
};

/** Досрочный отзыв ссылки — третий предохранитель. */
export const revokeAccessLink = async (req: AuthRequest, res: Response) => {
  try {
    const { id, token } = req.params;
    const role = req.user?.role || '';
    if (!['MANAGER', 'ADMIN'].includes(role)) {
      return res.status(403).json({ message: 'Ссылки отзывают менеджер и администратор' });
    }
    const existing = await prisma.request.findUnique({ where: { id: id as string } });
    if (!existing) return res.status(404).json({ message: 'Накладная не найдена' });

    const prev = Array.isArray((existing as any).accessTokens) ? (existing as any).accessTokens : [];
    const next = prev.map((t: any) =>
      t && t.token === token && !t.revokedAt ? { ...t, revokedAt: new Date().toISOString() } : t
    );
    await prisma.request.update({
      where: { id: id as string },
      data: { accessTokens: next as any },
    });
    res.json({ ok: true });
  } catch (error: any) {
    console.error('revokeAccessLink error:', error);
    res.status(500).json({ message: 'Ошибка отзыва ссылки', details: error.message });
  }
};
