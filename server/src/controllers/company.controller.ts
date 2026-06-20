// // import { Request, Response } from 'express';
// // import prisma from '../lib/prisma';
// // import { AuthRequest } from '../middlewares/auth.middleware';
// // import { Prisma } from '@prisma/client';

// // export const getCompanies = async (req: AuthRequest, res: Response) => {
// //   try {
// //     const companies = await prisma.company.findMany();
// //     res.json(companies);
// //   } catch (error) {
// //     res.status(500).json({ message: 'Ошибка при получении списка компаний' });
// //   }
// // };

// // export const getCompanyById = async (req: AuthRequest, res: Response) => {
// //   try {
// //     const { id } = req.params;
// //     const company = await prisma.company.findUnique({
// //       where: { id: id as string }
// //     });
// //     if (!company) {
// //       return res.status(404).json({ message: 'Компания не найдена' });
// //     }
// //     res.json(company);
// //   } catch (error) {
// //     res.status(500).json({ message: 'Ошибка при получении данных компании' });
// //   }
// // };

// // export const createCompany = async (req: AuthRequest, res: Response) => {
// //   try {
// //     const { id, ...restData } = req.body;
    
// //     // Подготовка данных для Prisma:
// //     const dataToSave: any = {
// //       name: restData.name,
// //       bin: restData.bin,
// //       address: restData.address,
// //       factAddress: restData.factAddress || "",
// //       phone: restData.phone || "",
// //       director: restData.director || "",
// //       email: restData.email || "",
// //       bank: restData.bank || "",
// //       bik: restData.bik || "",
// //       account: restData.account || "",
// //       kbe: restData.kbe || "",
// //       bankDetails: restData.bankDetails || "",
// //       managerDetails: restData.managerDetails || "",
// //       logo: restData.logo || ""
// //     };

// //     if (id && typeof id === 'string') {
// //        dataToSave.id = id;
// //     }

// //     const newCompany = await prisma.company.create({
// //       data: dataToSave
// //     });
// //     res.status(201).json(newCompany);
// //   } catch (error) {
// //     console.error('Create company error:', error);
// //     res.status(500).json({ message: 'Ошибка при создании компании' });
// //   }
// // };

// // export const updateCompany = async (req: AuthRequest, res: Response) => {
// //   try {
// //     const { id } = req.params;
// //     const { id: _, ...restData } = req.body;
    
// //     if (restData.logo) {
// //       console.log(`[DEBUG] Updating company ${id}, logo received, length: ${restData.logo.length}`);
// //     } else {
// //       console.log(`[DEBUG] Updating company ${id}, NO logo in request`);
// //     }
    
// //     // Подготовка данных для Prisma
// //     const dataToUpdate: any = {};
// //     const fields = [
// //       'name', 'bin', 'address', 'factAddress', 'phone', 
// //       'director', 'email', 'bank', 'bik', 'account', 'kbe',
// //       'bankDetails', 'managerDetails', 'logo'
// //     ];

// //     fields.forEach(f => {
// //       if (restData[f] !== undefined) dataToUpdate[f] = restData[f];
// //     });

// //     const updatedCompany = await prisma.company.update({
// //       where: { id: id as string },
// //       data: dataToUpdate
// //     });
// //     res.json(updatedCompany);
// //   } catch (error: any) {
// //     if (error.code === 'P2025') {
// //        return res.status(404).json({ message: 'Компания не найдена' });
// //     }
// //     res.status(500).json({ message: 'Ошибка при обновлении компании' });
// //   }
// // };

// // export const deleteCompany = async (req: AuthRequest, res: Response) => {
// //   try {
// //     const { id } = req.params;
// //     await prisma.company.delete({
// //       where: { id: id as string }
// //     });
// //     res.json({ message: 'Компания удалена' });
// //   } catch (error: any) {
// //     if (error.code === 'P2025') {
// //        return res.status(404).json({ message: 'Компания не найдена' });
// //     }
// //     res.status(500).json({ message: 'Ошибка при удалении компании' });
// //   }
// // };



// import { Request, Response } from 'express';
// import prisma from '../lib/prisma';
// import { AuthRequest } from '../middlewares/auth.middleware';
// import { Prisma } from '@prisma/client';

// export const getCompanies = async (req: AuthRequest, res: Response) => {
//   try {
//     const companies = await prisma.company.findMany();
//     res.json(companies);
//   } catch (error) {
//     res.status(500).json({ message: 'Ошибка при получении списка компаний' });
//   }
// };

// export const getCompanyById = async (req: AuthRequest, res: Response) => {
//   try {
//     const { id } = req.params;
//     const company = await prisma.company.findUnique({
//       where: { id: id as string }
//     });
//     if (!company) {
//       return res.status(404).json({ message: 'Компания не найдена' });
//     }
//     res.json(company);
//   } catch (error) {
//     res.status(500).json({ message: 'Ошибка при получении данных компании' });
//   }
// };

// export const createCompany = async (req: AuthRequest, res: Response) => {
//   try {
//     const { id, ...restData } = req.body;

//     const dataToSave: any = {
//       name: restData.name,
//       bin: restData.bin,
//       address: restData.address,
//       factAddress: restData.factAddress || "",
//       phone: restData.phone || "",
//       director: restData.director || "",
//       email: restData.email || "",
//       bank: restData.bank || "",
//       bik: restData.bik || "",
//       account: restData.account || "",
//       kbe: restData.kbe || "",
//       bankDetails: restData.bankDetails || "",
//       managerDetails: restData.managerDetails || "",
//       logo: restData.logo || "",
//       // 🆕 ТЗ v2: PNG печати с подписью
//       stamp: restData.stamp || null,
//       // 🆕 ТЗ v2: статус (active по умолчанию)
//       status: restData.status || 'active',
//     };

//     if (id && typeof id === 'string') {
//        dataToSave.id = id;
//     }

//     const newCompany = await prisma.company.create({
//       data: dataToSave
//     });
//     res.status(201).json(newCompany);
//   } catch (error: any) {
//     console.error('Create company error:', error);
//     res.status(500).json({ message: 'Ошибка при создании компании', details: error.message });
//   }
// };

// export const updateCompany = async (req: AuthRequest, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { id: _, ...restData } = req.body;

//     if (restData.logo) {
//       console.log(`[DEBUG] Updating company ${id}, logo received, length: ${restData.logo.length}`);
//     }
//     if (restData.stamp) {
//       console.log(`[DEBUG] Updating company ${id}, stamp received, length: ${restData.stamp.length}`);
//     }
//     if (restData.status) {
//       console.log(`[DEBUG] Updating company ${id}, status -> ${restData.status}`);
//     }

//     const dataToUpdate: any = {};
//     const fields = [
//       'name', 'bin', 'address', 'factAddress', 'phone',
//       'director', 'email', 'bank', 'bik', 'account', 'kbe',
//       'bankDetails', 'managerDetails', 'logo',
//       // 🆕 ТЗ v2
//       'stamp',
//       'status',
//     ];

//     fields.forEach(f => {
//       if (restData[f] !== undefined) dataToUpdate[f] = restData[f];
//     });

//     const updatedCompany = await prisma.company.update({
//       where: { id: id as string },
//       data: dataToUpdate
//     });
//     res.json(updatedCompany);
//   } catch (error: any) {
//     if (error.code === 'P2025') {
//        return res.status(404).json({ message: 'Компания не найдена' });
//     }
//     console.error('Update company error:', error);
//     res.status(500).json({ message: 'Ошибка при обновлении компании', details: error.message });
//   }
// };

// /**
//  * 🆕 ТЗ v2: Физическое удаление запрещено — только аннулирование (status = 'canceled').
//  */
// export const deleteCompany = async (req: AuthRequest, res: Response) => {
//   try {
//     const { id } = req.params;

//     const existing = await prisma.company.findUnique({ where: { id: id as string } });
//     if (!existing) {
//       return res.status(404).json({ message: 'Компания не найдена' });
//     }

//     return res.status(403).json({
//       message: 'Удаление компаний запрещено. Используйте аннулирование (PUT с { status: "canceled" }).',
//     });
//   } catch (error: any) {
//     res.status(500).json({ message: 'Ошибка', details: error.message });
//   }
// };

// @ts-nocheck
import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getCompanies = async (req: AuthRequest, res: Response) => {
  try {
    // 🆕 ТЗ v2: PRIVATE видит только свою привязанную компанию (для логотипа в наклейках)
    if (req.user?.role === 'PRIVATE') {
      const me = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { assignedCompanyId: true },
      });
      if (!me?.assignedCompanyId) return res.json([]);
      const company = await prisma.company.findUnique({ where: { id: me.assignedCompanyId } });
      return res.json(company ? [company] : []);
    }

    const companies = await prisma.company.findMany();
    res.json(companies);
  } catch (error: any) {
    console.error('getCompanies error:', error);
    res.status(500).json({ message: 'Ошибка при получении списка компаний', details: error.message });
  }
};

export const getCompanyById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const company = await prisma.company.findUnique({
      where: { id: id as string }
    });
    if (!company) return res.status(404).json({ message: 'Компания не найдена' });

    // 🆕 ТЗ v2: PRIVATE может смотреть только свою компанию
    if (req.user?.role === 'PRIVATE') {
      const me = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { assignedCompanyId: true },
      });
      if (me?.assignedCompanyId !== company.id) {
        return res.status(403).json({ message: 'Доступ запрещён' });
      }
    }

    res.json(company);
  } catch (error: any) {
    res.status(500).json({ message: 'Ошибка при получении данных компании', details: error.message });
  }
};

export const createCompany = async (req: AuthRequest, res: Response) => {
  try {
    const { id, ...restData } = req.body;

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
      managerDetails: restData.managerDetails || "",
     logo: restData.logo || "",
      stamp: restData.stamp || null,
      status: restData.status || 'active',
      taxRate: parseFloat(restData.taxRate) || 0,
    };

    if (id && typeof id === 'string') dataToSave.id = id;

    const newCompany = await prisma.company.create({ data: dataToSave });
    res.status(201).json(newCompany);
  } catch (error: any) {
    console.error('Create company error:', error);
    res.status(500).json({ message: 'Ошибка при создании компании', details: error.message });
  }
};

export const updateCompany = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { id: _, ...restData } = req.body;

    if (restData.logo) console.log(`[DEBUG] Update company ${id}, logo length: ${restData.logo.length}`);
    if (restData.stamp) console.log(`[DEBUG] Update company ${id}, stamp length: ${restData.stamp.length}`);
    if (restData.status) console.log(`[DEBUG] Update company ${id}, status -> ${restData.status}`);

    const dataToUpdate: any = {};
    const fields = [
      'name', 'bin', 'address', 'factAddress', 'phone',
      'director', 'email', 'bank', 'bik', 'account', 'kbe',
      'bankDetails', 'managerDetails', 'logo',
      'stamp', 'status', 'taxRate',
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
    console.error('Update company error:', error);
    res.status(500).json({ message: 'Ошибка при обновлении компании', details: error.message });
  }
};

/**
 * ТЗ v2: Физическое удаление запрещено — только аннулирование.
 */
export const deleteCompany = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.company.findUnique({ where: { id: id as string } });
    if (!existing) return res.status(404).json({ message: 'Компания не найдена' });

    return res.status(403).json({
      message: 'Удаление компаний запрещено. Используйте аннулирование (PUT с { status: "canceled" }).',
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Ошибка', details: error.message });
  }
};