
// // @ts-nocheck
// import { Request, Response } from 'express';
// import { PrismaClient } from '@prisma/client';

// const prisma = new PrismaClient();

// export const getTariffs = async (req: Request, res: Response) => {
//   try {
//     const tariffs = await prisma.tariff.findMany({ orderBy: { city: 'asc' } });
//     res.json(tariffs);
//   } catch (e: any) {
//     console.error('getTariffs error:', e);
//     res.status(500).json({ error: 'Ошибка получения тарифов', details: e.message });
//   }
// };

// export const createTariff = async (req: Request, res: Response) => {
//   try {
//     const {
//       city,
//       pricePerKg,
//       deliveryPrice,
//       companyId,
//       // 🆕 ТЗ v2
//       weightRanges,
//       extraSum,
//       isPrivate,
//     } = req.body;

//     if (!city) return res.status(400).json({ error: 'Укажите город' });

//     const tariff = await prisma.tariff.create({
//       data: {
//         city,
//         pricePerKg: Number(pricePerKg) || 0,
//         deliveryPrice: Number(deliveryPrice) || 0,
//         companyId: companyId || null,
//         // 🆕 ТЗ v2
//         weightRanges: weightRanges || null,
//         extraSum: Number(extraSum) || 0,
//         isPrivate: !!isPrivate,
//       }
//     });
//     res.json(tariff);
//   } catch (e: any) {
//     console.error('createTariff error:', e);
//     if (e.code === 'P2002') {
//       return res.status(400).json({ error: 'Тариф для этого города уже существует' });
//     }
//     res.status(500).json({ error: 'Ошибка создания тарифа', details: e.message });
//   }
// };

// export const updateTariff = async (req: Request, res: Response) => {
//   try {
//     const id = req.params.id as string;
//     const {
//       city,
//       pricePerKg,
//       deliveryPrice,
//       // 🆕 ТЗ v2
//       weightRanges,
//       extraSum,
//       isPrivate,
//     } = req.body;

//     // Собираем только переданные поля (чтобы не затирать null'ами)
//     const data: any = {};
//     if (city !== undefined) data.city = city;
//     if (pricePerKg !== undefined) data.pricePerKg = Number(pricePerKg) || 0;
//     if (deliveryPrice !== undefined) data.deliveryPrice = Number(deliveryPrice) || 0;
//     if (weightRanges !== undefined) data.weightRanges = weightRanges; // null или объект
//     if (extraSum !== undefined) data.extraSum = Number(extraSum) || 0;
//     if (isPrivate !== undefined) data.isPrivate = !!isPrivate;

//     const tariff = await prisma.tariff.update({
//       where: { id },
//       data,
//     });
//     res.json(tariff);
//   } catch (e: any) {
//     console.error('updateTariff error:', e);
//     if (e.code === 'P2002') {
//       return res.status(400).json({ error: 'Тариф для этого города уже существует' });
//     }
//     res.status(500).json({ error: 'Ошибка обновления тарифа', details: e.message });
//   }
// };

// export const deleteTariff = async (req: Request, res: Response) => {
//   try {
//     const id = req.params.id as string;
//     await prisma.tariff.delete({ where: { id } });
//     res.json({ success: true });
//   } catch (e: any) {
//     console.error('deleteTariff error:', e);
//     res.status(500).json({ error: 'Ошибка удаления тарифа', details: e.message });
//   }
// };


// @ts-nocheck
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 🆕 Суффикс для тарифов частных лиц — обходим уникальность city без миграции БД
const PRIVATE_SUFFIX = '__PRIVATE';

// Хелпер: добавить суффикс перед записью в БД
function cityForDb(city: string, isPrivate: boolean): string {
  const clean = String(city || '').trim();
  if (!clean) return clean;
  if (isPrivate) return clean + PRIVATE_SUFFIX;
  return clean;
}

// Хелпер: убрать суффикс перед отправкой клиенту
function stripPrivateSuffix(city: string): string {
  if (!city) return city;
  return city.replace(PRIVATE_SUFFIX, '');
}

// Хелпер: маппинг тарифа из БД в формат для клиента (с чистым city)
function mapTariffOut(t: any) {
  return { ...t, city: stripPrivateSuffix(t.city) };
}

export const getTariffs = async (req: Request, res: Response) => {
  try {
    const tariffs = await prisma.tariff.findMany({ orderBy: { city: 'asc' } });
    res.json(tariffs.map(mapTariffOut));
  } catch (e: any) {
    console.error('getTariffs error:', e);
    res.status(500).json({ error: 'Ошибка получения тарифов', details: e.message });
  }
};

export const createTariff = async (req: Request, res: Response) => {
  try {
    const {
      city,
      fromCity,
      pricePerKg,
      deliveryPrice,
      companyId,
      // 🆕 ТЗ v2
      weightRanges,
      extraSum,
      isPrivate,
    } = req.body;

    if (!city) return res.status(400).json({ error: 'Укажите город' });

    const cityToSave = cityForDb(city, !!isPrivate);
    const fromCityToSave = String(fromCity || '').trim() || 'Алматы';

    const tariff = await prisma.tariff.create({
      data: {
        city: cityToSave,
        fromCity: fromCityToSave,
        pricePerKg: Number(pricePerKg) || 0,
        deliveryPrice: Number(deliveryPrice) || 0,
        companyId: companyId || null,
        weightRanges: weightRanges || null,
        extraSum: Number(extraSum) || 0,
        isPrivate: !!isPrivate,
      }
    });

    // Возвращаем клиенту чистый city (без суффикса)
    res.json(mapTariffOut(tariff));
  } catch (e: any) {
    console.error('createTariff error:', e);
    if (e.code === 'P2002') {
      return res.status(400).json({ error: 'Тариф для этого города уже существует' });
    }
    res.status(500).json({ error: 'Ошибка создания тарифа', details: e.message });
  }
};

export const updateTariff = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const {
      city,
      fromCity,
      pricePerKg,
      deliveryPrice,
      // 🆕 ТЗ v2
      weightRanges,
      extraSum,
      isPrivate,
    } = req.body;

    // Собираем только переданные поля (чтобы не затирать null'ами)
    const data: any = {};
    if (fromCity !== undefined) data.fromCity = String(fromCity || '').trim() || 'Алматы';

    // 🆕 Если передан isPrivate — узнаём актуальное значение для расчёта city
    let isPrivateForCity: boolean | undefined = undefined;
    if (isPrivate !== undefined) {
      isPrivateForCity = !!isPrivate;
      data.isPrivate = !!isPrivate;
    }

    if (city !== undefined) {
      // Если isPrivate не передан в body — берём из БД
      if (isPrivateForCity === undefined) {
        const existing = await prisma.tariff.findUnique({ where: { id } });
        isPrivateForCity = !!existing?.isPrivate;
      }
      data.city = cityForDb(city, isPrivateForCity);
    } else if (isPrivateForCity !== undefined) {
      // 🆕 Если меняем только isPrivate (без city) — нужно пересохранить city с/без суффикса
      const existing = await prisma.tariff.findUnique({ where: { id } });
      if (existing) {
        const cleanCity = stripPrivateSuffix(existing.city);
        data.city = cityForDb(cleanCity, isPrivateForCity);
      }
    }

    if (pricePerKg !== undefined) data.pricePerKg = Number(pricePerKg) || 0;
    if (deliveryPrice !== undefined) data.deliveryPrice = Number(deliveryPrice) || 0;
    if (weightRanges !== undefined) data.weightRanges = weightRanges;
    if (extraSum !== undefined) data.extraSum = Number(extraSum) || 0;

    const tariff = await prisma.tariff.update({
      where: { id },
      data,
    });

    res.json(mapTariffOut(tariff));
  } catch (e: any) {
    console.error('updateTariff error:', e);
    if (e.code === 'P2002') {
      return res.status(400).json({ error: 'Тариф для этого города уже существует' });
    }
    res.status(500).json({ error: 'Ошибка обновления тарифа', details: e.message });
  }
};

export const deleteTariff = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.tariff.delete({ where: { id } });
    res.json({ success: true });
  } catch (e: any) {
    console.error('deleteTariff error:', e);
    res.status(500).json({ error: 'Ошибка удаления тарифа', details: e.message });
  }
};