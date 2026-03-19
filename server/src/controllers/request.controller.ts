import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getRequests = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId } = req.query;
    
    const where: any = {};
    if (companyId) {
      where.companyId = companyId as string;
    }

    const requests = await prisma.request.findMany({
      where,
      include: {
        company: true,
        manager: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(requests);
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ message: 'Ошибка при получении заявок' });
  }
};

export const getRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const request = await prisma.request.findUnique({
      where: { id: id as string },
      include: {
        company: true,
        manager: {
          select: {
            id: true,
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
    console.error('Get request error:', error);
    res.status(500).json({ message: 'Ошибка при получении заявки', details: error.message });
  }
};

export const createRequest = async (req: AuthRequest, res: Response) => {
  try {
    console.log('--- ПОПЫТКА СОЗДАНИЯ ЗАЯВКИ ---');
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const { 
      status, 
      date, 
      companyId, 
      type, 
      docNumber,
      ...rest
    } = req.body;

    const route = req.body.route;
    const cargo = req.body.cargo;

    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (!companyId) return res.status(400).json({ message: 'companyId is required' });

    const routeStr = typeof route === 'object' ? `${route.fromCity || ''} -> ${route.toCity || ''}` : route;
    const cargoStr = typeof cargo === 'object' ? JSON.stringify(cargo) : cargo;

    const newRequest = await prisma.request.create({
      data: {
        status: status || 'Заявка',
        date: date || new Date().toISOString().split('T')[0],
        companyId: companyId,
        managerId: req.user.id,
        type: type || 'REQUEST',
        route: routeStr,
        cargo: cargoStr,
        docNumber: docNumber,
        details: JSON.stringify(rest)
      },
      include: {
        company: true
      }
    });

    console.log('Заявка создана успешно:', newRequest.id);
    res.status(201).json(newRequest);
  } catch (error: any) {
    console.error('!!! ОШИБКА ПРИ СОЗДАНИИ ЗАЯВКИ !!!');
    console.error(error);
    res.status(500).json({ 
      message: 'Ошибка при создании заявки',
      details: error.message 
    });
  }
};

export const updateRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const existing = await prisma.request.findUnique({
      where: { id: id as string }
    });
    
    if (!existing) {
      return res.status(404).json({ message: 'Заявка не найдена' });
    }

    const existingDetails = existing.details ? JSON.parse(existing.details) : {};
    
    // Explicitly destructure top-level fields we want to handle separately
    const { 
      status, 
      date, 
      type, 
      docNumber, 
      companyId,
      ...bodyFields 
    } = req.body;

    // Merge existing details with EVERYTHING ELSE from the body
    // This ensures that 'customer', 'receiver', 'route', 'cargoRows' etc are preserved
    // if they are not in req.body, and updated if they are.
    const mergedDetails = {
      ...existingDetails,
      ...bodyFields
    };

    // If body has its own 'details' object, merge it too (for safety)
    if (req.body.details && typeof req.body.details === 'object') {
      Object.assign(mergedDetails, req.body.details);
    }

    // Explicitly handle route and cargo for the DB columns
    const route = req.body.route !== undefined ? req.body.route : existingDetails.route;
    const cargo = req.body.cargo !== undefined ? req.body.cargo : existingDetails.cargo;
    
    const routeStr = typeof route === 'object' ? `${route.fromCity || ''} -> ${route.toCity || ''}` : route;
    const cargoStr = typeof cargo === 'object' ? JSON.stringify(cargo) : cargo;

    const updatedRequest = await prisma.request.update({
      where: { id: id as string },
      data: {
        status: status !== undefined ? status : existing.status,
        date: date !== undefined ? date : existing.date,
        companyId: companyId !== undefined ? companyId : existing.companyId,
        type: type !== undefined ? type : existing.type,
        route: routeStr,
        cargo: cargoStr,
        docNumber: docNumber !== undefined ? docNumber : existing.docNumber,
        details: JSON.stringify(mergedDetails)
      },
      include: {
        company: true
      }
    });

    res.json(updatedRequest);
  } catch (error: any) {
    console.error('Update Request Error:', error);
    res.status(500).json({ message: 'Ошибка при обновлении заявки', details: error.message });
  }
};

export const deleteRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Только администратор может удалять заявки' });
    }
    
    await prisma.request.delete({
      where: { id: id as string }
    });

    res.json({ message: 'Заявка удалена' });
  } catch (error: any) {
    console.error('Delete request error:', error);
    res.status(500).json({ message: 'Ошибка при удалении заявки', details: error.message });
  }
};
