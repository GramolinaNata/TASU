// import { Request, Response, NextFunction } from 'express';
// import jwt from 'jsonwebtoken';
// import prisma from '../lib/prisma';

// export interface AuthRequest extends Request {
//   user?: {
//     id: number;
//     email: string;
//     role: string;
//   };
// }

// export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
//   const authHeader = req.headers['authorization'];
//   const token = authHeader && authHeader.split(' ')[1];

//   if (!token) {
//     return res.status(401).json({ message: 'Нет токена доступа' });
//   }

//   jwt.verify(token, process.env.JWT_SECRET || 'tasu_super_secret_key_123', (err: any, user: any) => {
//     if (err) return res.status(403).json({ message: 'Недействительный токен' });
//     req.user = user;
//     next();
//   });
// };

// export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
//   if (req.user?.role !== 'ADMIN') {
//     return res.status(403).json({ message: 'Доступ запрещен. Требуются права администратора.' });
//   }
//   next();
// };


import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Нет токена доступа' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'tasu_super_secret_key_123', (err: any, user: any) => {
    if (err) return res.status(403).json({ message: 'Недействительный токен' });
    req.user = user;
    next();
  });
};

/**
 * Фабрика middleware, проверяющего роль пользователя.
 * Пропускает если роль юзера входит в allowedRoles (или если он ADMIN).
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role) {
      return res.status(401).json({ message: 'Не авторизован' });
    }
    // Админ всегда имеет доступ
    if (role === 'ADMIN' || allowedRoles.includes(role)) {
      return next();
    }
    return res.status(403).json({
      message: `Доступ запрещён. Требуется одна из ролей: ${allowedRoles.join(', ')}`,
    });
  };
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Доступ запрещён. Требуются права администратора.' });
  }
  next();
};

/**
 * Запрет доступа перечисленным ролям (чёрный список).
 *
 * Почему запрет, а не requireRole с белым списком: белый список пришлось бы
 * дополнять при появлении каждой новой роли, и забытая роль молча получила бы
 * доступ. Здесь наоборот — новая роль по умолчанию сохраняет прежние права,
 * а урезается только явно названная.
 *
 * ADMIN не исключается: если админа когда-нибудь понадобится ограничить,
 * это должно делаться явно, а не обходиться молчаливым исключением.
 */
export const denyRoles = (...deniedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role) {
      return res.status(401).json({ message: 'Не авторизован' });
    }
    if (deniedRoles.includes(role)) {
      return res.status(403).json({ message: 'Доступ запрещён для вашей роли.' });
    }
    return next();
  };
};

/**
 * ТЗ: урезанная роль «Менеджер (ограниченный)» — принимает груз, создаёт
 * заявки и партии, но не работает с ведомостью перевозчика и не видит суммы
 * выплат перевозчику и представителю.
 *
 * Ограничение обязано жить на сервере, а не только в интерфейсе: скрытая
 * кнопка при открытом эндпоинте ограничением не является. Закрываем не только
 * действия, но и чтение — ответ по ведомостям перевозчика содержит суммы.
 */
export const denyLimitedOperator = denyRoles('MANAGER2');

/**
 * ТЗ: Кнопка "Заявка отработана бухгалтером" только у бухгалтера.
 * Разрешает доступ бухгалтерам (ACCOUNTANT, ACCOUNTANT2) и админу.
 */
export const requireAccountant = requireRole('ACCOUNTANT', 'ACCOUNTANT2');