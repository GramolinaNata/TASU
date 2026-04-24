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
 * ТЗ: Кнопка "Заявка отработана бухгалтером" только у бухгалтера.
 * Разрешает доступ бухгалтерам (ACCOUNTANT, ACCOUNTANT2) и админу.
 */
export const requireAccountant = requireRole('ACCOUNTANT', 'ACCOUNTANT2');