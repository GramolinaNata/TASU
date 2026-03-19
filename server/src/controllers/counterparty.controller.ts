import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getCounterparties = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId } = req.query;
    // We ignore companyId for now as the user wants them to be global
    const counterparties = await prisma.counterparty.findMany({
      orderBy: { name: 'asc' }
    });

    res.json(counterparties);
  } catch (error) {
    console.error('Get counterparties error:', error);
    res.status(500).json({ message: 'Ошибка при получении контрагентов' });
  }
};

export const getCounterparty = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const cp = await prisma.counterparty.findUnique({
      where: { id: id as string }
    });

    if (!cp) return res.status(404).json({ message: 'Контрагент не найден' });
    res.json(cp);
  } catch (error) {
    console.error('Get counterparty error:', error);
    res.status(500).json({ message: 'Ошибка при получении контрагента' });
  }
};

export const createCounterparty = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, name, phone, email, companyName, bin, address, bank, bik, account, kbe } = req.body;
    
    if (!companyId) return res.status(400).json({ message: 'companyId is required' });
    if (!name) return res.status(400).json({ message: 'name is required' });

    const newCp = await prisma.counterparty.create({
      data: {
        companyId,
        name,
        phone: phone || '',
        email: email || '',
        companyName: companyName || '',
        bin: bin || '',
        address: address || '',
        bank: bank || '',
        bik: bik || '',
        account: account || '',
        kbe: kbe || ''
      }
    });

    res.status(201).json(newCp);
  } catch (error) {
    console.error('Create counterparty error:', error);
    res.status(500).json({ message: 'Ошибка при создании контрагента' });
  }
};

export const updateCounterparty = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const updated = await prisma.counterparty.update({
      where: { id: id as string },
      data
    });

    res.json(updated);
  } catch (error) {
    console.error('Update counterparty error:', error);
    res.status(500).json({ message: 'Ошибка при обновлении контрагента' });
  }
};

export const deleteCounterparty = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.counterparty.delete({
      where: { id: id as string }
    });
    res.json({ message: 'Контрагент удален' });
  } catch (error) {
    console.error('Delete counterparty error:', error);
    res.status(500).json({ message: 'Ошибка при удалении контрагента' });
  }
};
