// import { Request, Response } from 'express';
// import prisma from '../lib/prisma';
// import bcrypt from 'bcryptjs';
// import { AuthRequest } from '../middlewares/auth.middleware';

// export const getUsers = async (req: AuthRequest, res: Response) => {
//   try {
//     const users = await prisma.user.findMany({
//       select: {
//         id: true,
//         email: true,
//         name: true,
//         role: true,
//         createdAt: true
//       },
//       orderBy: {
//         createdAt: 'desc'
//       }
//     });
//     res.json(users);
//   } catch (error) {
//     res.status(500).json({ message: 'Ошибка при получении пользователей' });
//   }
// };

// export const createUser = async (req: AuthRequest, res: Response) => {
//   try {
//     console.log('Попытка создания пользователя. Данные:', req.body);
//     const { email, password, name, role } = req.body;

//     const existingUser = await prisma.user.findUnique({ where: { email } });
//     if (existingUser) {
//       return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     const newUser = await prisma.user.create({
//       data: {
//         email,
//         password: hashedPassword,
//         name,
//         role: role || 'MANAGER'
//       },
//       select: {
//         id: true,
//         email: true,
//         name: true,
//         role: true,
//         createdAt: true
//       }
//     });

//     res.status(201).json(newUser);
//   } catch (error: any) {
//     console.error('!!! ОШИБКА ПРИ СОЗДАНИИ ПОЛЬЗОВАТЕЛЯ !!!');
//     console.error(error);
//     res.status(500).json({ 
//       message: 'Ошибка при создании пользователя',
//       details: error.message 
//     });
//   }
// };

// export const updateUser = async (req: AuthRequest, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { email, name, role, password } = req.body;

//     const updateData: any = { email, name, role };
    
//     if (password) {
//       updateData.password = await bcrypt.hash(password, 10);
//     }

//     const updatedUser = await prisma.user.update({
//       where: { id: parseInt(id as string) },
//       data: updateData,
//       select: {
//         id: true,
//         email: true,
//         name: true,
//         role: true
//       }
//     });

//     res.json(updatedUser);
//   } catch (error) {
//     res.status(500).json({ message: 'Ошибка при обновлении пользователя' });
//   }
// };

// export const deleteUser = async (req: AuthRequest, res: Response) => {
//   try {
//     const { id } = req.params;
    
//     // Защита от удаления самого себя
//     if (req.user?.id === parseInt(id as string)) {
//       return res.status(400).json({ message: 'Вы не можете удалить свою учётную запись' });
//     }

//     await prisma.user.delete({
//       where: { id: parseInt(id as string) }
//     });

//     res.json({ message: 'Пользователь удален' });
//   } catch (error) {
//     res.status(500).json({ message: 'Ошибка при удалении пользователя' });
//   }
// };


import { Response } from 'express';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middlewares/auth.middleware';

const ALLOWED_USER_SORT = ['id', 'email', 'name', 'role', 'createdAt', 'updatedAt'] as const;
type UserSortField = typeof ALLOWED_USER_SORT[number];

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const sortByRaw = (req.query.sortBy as string) || 'createdAt';
    const orderRaw = (req.query.order as string) || 'desc';

    const sortBy: UserSortField = (ALLOWED_USER_SORT as readonly string[]).includes(sortByRaw)
      ? (sortByRaw as UserSortField)
      : 'createdAt';
    const order: 'asc' | 'desc' = orderRaw === 'asc' ? 'asc' : 'desc';

    const isAdmin = req.user?.role === 'ADMIN';

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        plainPassword: isAdmin,
      },
      orderBy: { [sortBy]: order },
    });

    res.json(users);
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Ошибка при получении пользователей', details: error.message });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ message: 'email, password и name обязательны' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        plainPassword: password,
        name,
        role: role || 'MANAGER',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        plainPassword: true,
      },
    });

    res.status(201).json(newUser);
  } catch (error: any) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Ошибка при создании пользователя', details: error.message });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { email, name, role, password } = req.body;

    const updateData: any = {};
    if (email !== undefined) updateData.email = email;
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
      updateData.plainPassword = password;
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id as string) },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        plainPassword: true,
      },
    });

    res.json(updatedUser);
  } catch (error: any) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Ошибка при обновлении пользователя', details: error.message });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (req.user?.id === parseInt(id as string)) {
      return res.status(400).json({ message: 'Вы не можете удалить свою учётную запись' });
    }

    await prisma.user.delete({
      where: { id: parseInt(id as string) },
    });

    res.json({ message: 'Пользователь удалён' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Ошибка при удалении пользователя', details: error.message });
  }
};