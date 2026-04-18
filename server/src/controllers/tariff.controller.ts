import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getTariffs = async (req: Request, res: Response) => {
  try {
    const tariffs = await prisma.tariff.findMany({ orderBy: { city: 'asc' } });
    res.json(tariffs);
  } catch (e) {
    res.status(500).json({ error: 'Ошибка получения тарифов' });
  }
};

export const createTariff = async (req: Request, res: Response) => {
  try {
    const { city, pricePerKg, deliveryPrice, companyId } = req.body;
    if (!city) return res.status(400).json({ error: 'Укажите город' });
    const tariff = await prisma.tariff.create({
      data: {
        city,
        pricePerKg: Number(pricePerKg) || 0,
        deliveryPrice: Number(deliveryPrice) || 0,
        companyId: companyId || null
      }
    });
    res.json(tariff);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(400).json({ error: 'Тариф для этого города уже существует' });
    res.status(500).json({ error: 'Ошибка создания тарифа' });
  }
};

export const updateTariff = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { city, pricePerKg, deliveryPrice } = req.body;
    const tariff = await prisma.tariff.update({
      where: { id },
      data: {
        city,
        pricePerKg: Number(pricePerKg),
        deliveryPrice: Number(deliveryPrice)
      }
    });
    res.json(tariff);
  } catch (e) {
    res.status(500).json({ error: 'Ошибка обновления тарифа' });
  }
};

export const deleteTariff = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.tariff.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка удаления тарифа' });
  }
};