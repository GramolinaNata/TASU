import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const contractController = {
  list: async (req: Request, res: Response) => {
    try {
      const { companyId } = req.query;
      const contracts = await prisma.contract.findMany({
        where: companyId ? { companyId: String(companyId) } : {},
        orderBy: { createdAt: 'desc' },
      });
      res.json(contracts);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },

  get: async (req: Request, res: Response) => {
    try {
      const contract = await prisma.contract.findUnique({
        where: { id: req.params.id },
      });
      if (!contract) return res.status(404).json({ message: 'Contract not found' });
      res.json(contract);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const { actData, ...rest } = req.body;
      // Map actData to details if needed, or keep it separate
      const contract = await prisma.contract.create({
        data: {
          ...rest,
          details: actData ? JSON.stringify(actData) : null,
        },
      });
      res.status(201).json(contract);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { actData, ...rest } = req.body;
      const data: any = { ...rest };
      if (actData) {
        data.details = JSON.stringify(actData);
      }
      
      const contract = await prisma.contract.update({
        where: { id: req.params.id },
        data: data,
      });
      res.json(contract);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      await prisma.contract.delete({
        where: { id: req.params.id },
      });
      res.json({ message: 'Contract deleted' });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },
};
