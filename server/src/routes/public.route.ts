import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

router.get('/acts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`[PUBLIC API] Fetching act with ID: ${id}`);
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

    res.json(request);
  } catch (error: any) {
    console.error('Public get request error:', error);
    res.status(500).json({ message: 'Ошибка при получении заявки', details: error.message });
  }
});

export default router;
