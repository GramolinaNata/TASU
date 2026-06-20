import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getCarriers = async (req: AuthRequest, res: Response) => {
  try {
    const carriers = await prisma.carrier.findMany({ orderBy: { name: 'asc' } });
    res.json(carriers);
  } catch (error: any) {
    console.error('Get carriers error:', error);
    res.status(500).json({ message: 'Ошибка при получении перевозчиков', details: error.message });
  }
};

export const getCarrier = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const carrier = await prisma.carrier.findUnique({ where: { id: id as string } });
    if (!carrier) return res.status(404).json({ message: 'Перевозчик не найден' });
    res.json(carrier);
  } catch (error: any) {
    console.error('Get carrier error:', error);
    res.status(500).json({ message: 'Ошибка при получении перевозчика', details: error.message });
  }
};

export const createCarrier = async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, city } = req.body;
    if (!name) return res.status(400).json({ message: 'name is required' });

    const carrier = await prisma.carrier.create({
      data: {
        name,
        phone: phone || '',
        city: city || '',
      },
    });
    res.status(201).json(carrier);
  } catch (error: any) {
    console.error('Create carrier error:', error);
    res.status(500).json({ message: 'Ошибка при создании перевозчика', details: error.message });
  }
};

export const updateCarrier = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, city } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (city !== undefined) updateData.city = city;

    const updated = await prisma.carrier.update({
      where: { id: id as string },
      data: updateData,
    });
    res.json(updated);
  } catch (error: any) {
    console.error('Update carrier error:', error);
    res.status(500).json({ message: 'Ошибка при обновлении перевозчика', details: error.message });
  }
};

export const deleteCarrier = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.carrier.delete({ where: { id: id as string } });
    res.json({ message: 'Перевозчик удалён' });
  } catch (error: any) {
    console.error('Delete carrier error:', error);
    res.status(500).json({ message: 'Ошибка при удалении перевозчика', details: error.message });
  }
};