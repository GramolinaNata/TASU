// ============================================================
// Клиентский upsert контрагента в справочник по ТЕЛЕФОНУ.
// Ключ различения — телефон (по цифрам). Тот же телефон в рамках
// компании → обновляем существующего, иначе создаём. Без телефона
// не сохраняем (нечем различать — иначе плодятся копии).
// Используется и частными (SimpleActPage), и юр. лицами (ActCreatePage).
// ============================================================
import { api } from "../api/api.js";

export const phoneDigits = (p) => String(p || "").replace(/\D/g, "");

// Поля, которые обновляем у уже существующего контрагента (если изменились).
const PATCH_FIELDS = ["name", "companyName", "email", "bin", "address", "bank", "bik", "account", "kbe", "director", "contactPhone"];

// payload: { companyId, name, phone, ...прочие поля контрагента } + уже загруженный list.
// Возвращает контрагента (существующего/созданного) или null (нет телефона/имени).
export async function upsertCounterparty(payload, list) {
  const { companyId, phone } = payload;
  const d = phoneDigits(phone);
  const nm = String(payload.name || "").trim();
  if (!nm || !d) return null; // ключ — телефон

  const arr = Array.isArray(list) ? list : [];
  const found = arr.find(c => c.companyId === companyId && phoneDigits(c.phone) === d);

  if (found) {
    // Обновляем только реально изменившиеся заполненные поля.
    const patch = {};
    PATCH_FIELDS.forEach(k => {
      const v = k === "name" ? nm : payload[k];
      if (v != null && v !== "" && v !== found[k]) patch[k] = v;
    });
    if (Object.keys(patch).length) {
      try { return await api.counterparties.update(found.id, patch); } catch { return found; }
    }
    return found;
  }

  try {
    return await api.counterparties.create({ ...payload, name: nm });
  } catch {
    return null;
  }
}
