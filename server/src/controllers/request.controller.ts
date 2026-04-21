// @ts-nocheck
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
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
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
          select: { id: true, name: true, email: true }
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
    const {
      status,
      date,
      companyId,
      type,
      docNumber,
      details,
      totalSum,
      ...rest
    } = req.body;

    const route = req.body.route;
    const cargo = req.body.cargo;

    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (!companyId) return res.status(400).json({ message: 'companyId is required' });

    const routeStr = typeof route === 'object' ? `${route.fromCity || ''} -> ${route.toCity || ''}` : route;
    const cargoStr = typeof cargo === 'object' ? JSON.stringify(cargo) : cargo;

    // Если details передан как строка — используем его напрямую
    // Если как объект — сериализуем
    // Если не передан — сохраняем rest
    let detailsStr: string;
    if (details !== undefined) {
      detailsStr = typeof details === 'string' ? details : JSON.stringify(details);
    } else {
      detailsStr = JSON.stringify(rest);
    }

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
        totalSum: totalSum ? String(totalSum) : '',
        details: detailsStr
      },
      include: { company: true }
    });

    res.status(201).json(newRequest);
  } catch (error: any) {
    console.error('Create request error:', error);
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

    const {
      status,
      date,
      type,
      docNumber,
      companyId,
      totalSum,
      ...bodyFields
    } = req.body;

    const mergedDetails = {
      ...existingDetails,
      ...bodyFields
    };

    if (req.body.details && typeof req.body.details === 'object') {
      Object.assign(mergedDetails, req.body.details);
    }

    const route = req.body.route !== undefined ? req.body.route : existingDetails.route;
    const cargo = req.body.cargo !== undefined ? req.body.cargo : existingDetails.cargo;

    let routeStr = undefined;
    if (route) {
      routeStr = typeof route === 'object' ? `${route.fromCity || ''} -> ${route.toCity || ''}` : route;
    }

    let cargoStr = undefined;
    if (cargo) {
      cargoStr = typeof cargo === 'object' ? JSON.stringify(cargo) : cargo;
    }

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
        totalSum: totalSum !== undefined ? String(totalSum) : existing.totalSum,
        details: JSON.stringify(mergedDetails)
      },
      include: { company: true }
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
