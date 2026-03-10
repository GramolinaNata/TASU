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

export const createCompany = async (req: AuthRequest, res: Response) => {
  try {
    const { id, ...restData } = req.body;
    
    // Подготовка данных для Prisma:
    const dataToSave: any = {
      name: restData.name,
      bin: restData.bin,
      address: restData.address,
      director: restData.director || "",
      bankDetails: restData.bankDetails || "",
      managerDetails: restData.managerDetails || "",
      email: restData.email || ""
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
    if (restData.name !== undefined) dataToUpdate.name = restData.name;
    if (restData.bin !== undefined) dataToUpdate.bin = restData.bin;
    if (restData.address !== undefined) dataToUpdate.address = restData.address;
    if (restData.director !== undefined) dataToUpdate.director = restData.director;
    if (restData.bankDetails !== undefined) dataToUpdate.bankDetails = restData.bankDetails;
    if (restData.managerDetails !== undefined) dataToUpdate.managerDetails = restData.managerDetails;
    if (restData.email !== undefined) dataToUpdate.email = restData.email;

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
