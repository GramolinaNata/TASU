import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'tasu_super_secret_key_123';

router.get('/acts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`[PUBLIC API] Fetching act with ID: ${id}`);
    
    // Попытка получить токен для проверки авторизации
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    let isAuthenticated = false;
    
    if (token) {
        try {
            jwt.verify(token, JWT_SECRET);
            isAuthenticated = true;
        } catch (e) { /* Игнорируем ошибку, просто считаем гостем */ }
    }

    const request = await prisma.request.findUnique({
      where: { id: id as string },
      include: {
        company: true,
        manager: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!request) {
      return res.status(404).json({ message: 'Заявка не найдена' });
    }

    // Если не авторизован, скрываем сумму в поле details
    if (!isAuthenticated && request.details) {
        try {
            const details = JSON.parse(request.details);
            if (details.totalSum) {
                delete details.totalSum;
                request.details = JSON.stringify(details);
            }
        } catch (e) {
            console.error('[PUBLIC API] Error parsing/cleaning details:', e);
        }
    }

    res.json(request);
  } catch (error: any) {
    console.error('Public get request error:', error);
    res.status(500).json({ message: 'Ошибка при получении заявки', details: error.message });
  }
});

export default router;
