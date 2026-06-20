import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getRepresentatives = async (req: AuthRequest, res: Response) => {
  try {
    const reps = await prisma.representative.findMany({ orderBy: { name: 'asc' } });
    res.json(reps);
  } catch (error: any) {
    console.error('Get representatives error:', error);
    res.status(500).json({ message: 'Ошибка при получении представителей', details: error.message });
  }
};

export const getRepresentative = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const rep = await prisma.representative.findUnique({ where: { id: id as string } });
    if (!rep) return res.status(404).json({ message: 'Представитель не найден' });
    res.json(rep);
  } catch (error: any) {
    console.error('Get representative error:', error);
    res.status(500).json({ message: 'Ошибка при получении представителя', details: error.message });
  }
};

export const createRepresentative = async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, city } = req.body;
    if (!name) return res.status(400).json({ message: 'name is required' });

    const rep = await prisma.representative.create({
      data: {
        name,
        phone: phone || '',
        city: city || '',
      },
    });
    res.status(201).json(rep);
  } catch (error: any) {
    console.error('Create representative error:', error);
    res.status(500).json({ message: 'Ошибка при создании представителя', details: error.message });
  }
};

export const updateRepresentative = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, city } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (city !== undefined) updateData.city = city;

    const updated = await prisma.representative.update({
      where: { id: id as string },
      data: updateData,
    });
    res.json(updated);
  } catch (error: any) {
    console.error('Update representative error:', error);
    res.status(500).json({ message: 'Ошибка при обновлении представителя', details: error.message });
  }
};

export const deleteRepresentative = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.representative.delete({ where: { id: id as string } });
    res.json({ message: 'Представитель удалён' });
  } catch (error: any) {
    console.error('Delete representative error:', error);
    res.status(500).json({ message: 'Ошибка при удалении представителя', details: error.message });
  }
};