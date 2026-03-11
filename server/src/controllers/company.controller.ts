import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { Prisma } from '@prisma/client';

export const getCompanies = async (req: AuthRequest, res: Response) => {
  try {
    const companies = await prisma.company.findMany();
    res.json(companies);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении списка компаний' });
  }
};

export const getCompanyById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const company = await prisma.company.findUnique({
      where: { id: id as string }
    });
    if (!company) {
      return res.status(404).json({ message: 'Компания не найдена' });
    }
    res.json(company);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении данных компании' });
  }
};

export const createCompany = async (req: AuthRequest, res: Response) => {
  try {
    const { id, ...restData } = req.body;
    
    // Подготовка данных для Prisma:
    const dataToSave: any = {
      name: restData.name,
      bin: restData.bin,
      address: restData.address,
      factAddress: restData.factAddress || "",
      phone: restData.phone || "",
      director: restData.director || "",
      email: restData.email || "",
      bank: restData.bank || "",
      bik: restData.bik || "",
      account: restData.account || "",
      kbe: restData.kbe || "",
      bankDetails: restData.bankDetails || "",
      managerDetails: restData.managerDetails || ""
    };

    if (id && typeof id === 'string') {
       dataToSave.id = id;
    }

    const newCompany = await prisma.company.create({
      data: dataToSave
    });
    res.status(201).json(newCompany);
  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({ message: 'Ошибка при создании компании' });
  }
};

export const updateCompany = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { id: _, ...restData } = req.body;
    
    // Подготовка данных для Prisma
    const dataToUpdate: any = {};
    const fields = [
      'name', 'bin', 'address', 'factAddress', 'phone', 
      'director', 'email', 'bank', 'bik', 'account', 'kbe',
      'bankDetails', 'managerDetails'
    ];

    fields.forEach(f => {
      if (restData[f] !== undefined) dataToUpdate[f] = restData[f];
    });

    const updatedCompany = await prisma.company.update({
      where: { id: id as string },
      data: dataToUpdate
    });
    res.json(updatedCompany);
  } catch (error: any) {
    if (error.code === 'P2025') {
       return res.status(404).json({ message: 'Компания не найдена' });
    }
    res.status(500).json({ message: 'Ошибка при обновлении компании' });
  }
};

export const deleteCompany = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.company.delete({
      where: { id: id as string }
    });
    res.json({ message: 'Компания удалена' });
  } catch (error: any) {
    if (error.code === 'P2025') {
       return res.status(404).json({ message: 'Компания не найдена' });
    }
    res.status(500).json({ message: 'Ошибка при удалении компании' });
  }
};
