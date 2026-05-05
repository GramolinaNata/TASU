// import { Response } from 'express';
// import prisma from '../lib/prisma';
// import { AuthRequest } from '../middlewares/auth.middleware';

// export const getCounterparties = async (req: AuthRequest, res: Response) => {
//   try {
//     const { companyId } = req.query;
//     // We ignore companyId for now as the user wants them to be global
//     const counterparties = await prisma.counterparty.findMany({
//       orderBy: { name: 'asc' }
//     });

//     res.json(counterparties);
//   } catch (error) {
//     console.error('Get counterparties error:', error);
//     res.status(500).json({ message: 'Ошибка при получении контрагентов' });
//   }
// };

// export const getCounterparty = async (req: AuthRequest, res: Response) => {
//   try {
//     const { id } = req.params;
//     const cp = await prisma.counterparty.findUnique({
//       where: { id: id as string }
//     });

//     if (!cp) return res.status(404).json({ message: 'Контрагент не найден' });
//     res.json(cp);
//   } catch (error) {
//     console.error('Get counterparty error:', error);
//     res.status(500).json({ message: 'Ошибка при получении контрагента' });
//   }
// };

// export const createCounterparty = async (req: AuthRequest, res: Response) => {
//   try {
//     const { companyId, name, phone, email, companyName, bin, address, bank, bik, account, kbe } = req.body;
    
//     if (!companyId) return res.status(400).json({ message: 'companyId is required' });
//     if (!name) return res.status(400).json({ message: 'name is required' });

//     const newCp = await prisma.counterparty.create({
//       data: {
//         companyId,
//         name,
//         phone: phone || '',
//         email: email || '',
//         companyName: companyName || '',
//         bin: bin || '',
//         address: address || '',
//         bank: bank || '',
//         bik: bik || '',
//         account: account || '',
//         kbe: kbe || ''
//       }
//     });

//     res.status(201).json(newCp);
//   } catch (error) {
//     console.error('Create counterparty error:', error);
//     res.status(500).json({ message: 'Ошибка при создании контрагента' });
//   }
// };

// export const updateCounterparty = async (req: AuthRequest, res: Response) => {
//   try {
//     const { id } = req.params;
//     const data = req.body;

//     const updated = await prisma.counterparty.update({
//       where: { id: id as string },
//       data
//     });

//     res.json(updated);
//   } catch (error) {
//     console.error('Update counterparty error:', error);
//     res.status(500).json({ message: 'Ошибка при обновлении контрагента' });
//   }
// };

// export const deleteCounterparty = async (req: AuthRequest, res: Response) => {
//   try {
//     const { id } = req.params;
//     await prisma.counterparty.delete({
//       where: { id: id as string }
//     });
//     res.json({ message: 'Контрагент удален' });
//   } catch (error) {
//     console.error('Delete counterparty error:', error);
//     res.status(500).json({ message: 'Ошибка при удалении контрагента' });
//   }
// };


import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getCounterparties = async (req: AuthRequest, res: Response) => {
  try {
    const counterparties = await prisma.counterparty.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(counterparties);
  } catch (error: any) {
    console.error('Get counterparties error:', error);
    res.status(500).json({ message: 'Ошибка при получении контрагентов', details: error.message });
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
  } catch (error: any) {
    console.error('Get counterparty error:', error);
    res.status(500).json({ message: 'Ошибка при получении контрагента', details: error.message });
  }
};

export const createCounterparty = async (req: AuthRequest, res: Response) => {
  try {
    const {
      companyId,
      name,
      phone,
      email,
      companyName,
      bin,
      address,
      bank,
      bik,
      account,
      kbe,
      director,
      // 🆕 ТЗ v2: контактный номер контрагента
      contactPhone,
    } = req.body;

    if (!companyId) return res.status(400).json({ message: 'companyId is required' });
    if (!name) return res.status(400).json({ message: 'name is required' });

    const data: any = {
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
      kbe: kbe || '',
      director: director || '',
    };

    // 🆕 ТЗ v2: contactPhone — отдельное поле для дополнительного контактного номера
    if (contactPhone !== undefined) data.contactPhone = contactPhone;

    const newCp = await prisma.counterparty.create({ data });
    res.status(201).json(newCp);
  } catch (error: any) {
    console.error('Create counterparty error:', error);
    res.status(500).json({ message: 'Ошибка при создании контрагента', details: error.message });
  }
};

export const updateCounterparty = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      phone,
      email,
      companyName,
      bin,
      address,
      bank,
      bik,
      account,
      kbe,
      director,
      // 🆕 ТЗ v2
      contactPhone,
    } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (companyName !== undefined) updateData.companyName = companyName;
    if (bin !== undefined) updateData.bin = bin;
    if (address !== undefined) updateData.address = address;
    if (bank !== undefined) updateData.bank = bank;
    if (bik !== undefined) updateData.bik = bik;
    if (account !== undefined) updateData.account = account;
    if (kbe !== undefined) updateData.kbe = kbe;
    if (director !== undefined) updateData.director = director;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone;

    const updated = await prisma.counterparty.update({
      where: { id: id as string },
      data: updateData,
    });
    res.json(updated);
  } catch (error: any) {
    console.error('Update counterparty error:', error);
    res.status(500).json({ message: 'Ошибка при обновлении контрагента', details: error.message });
  }
};

export const deleteCounterparty = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.counterparty.delete({
      where: { id: id as string }
    });
    res.json({ message: 'Контрагент удалён' });
  } catch (error: any) {
    console.error('Delete counterparty error:', error);
    res.status(500).json({ message: 'Ошибка при удалении контрагента', details: error.message });
  }
};