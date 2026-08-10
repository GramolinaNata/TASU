// Прогон аналитики ДО и ПОСЛЕ отметки оплаты у частной накладной.
//
// Логика скопирована из src/pages/admin/AdminStatsPage.jsx один в один:
//   filteredRequests (:475-491)  →  stats (:525-600)  +  paidCount/unpaidCount (:512-522)
// Цель — увидеть на РЕАЛЬНЫХ данных, какие цифры сдвинутся, а какие нет.
//
// Запуск: node scripts/check-analytics-ispaid.mjs --url=postgresql://...
import { PrismaClient } from "@prisma/client";

const urlArg = process.argv.find((a) => a.startsWith("--url="));
const DB_URL = urlArg ? urlArg.slice("--url=".length) : process.env.DATABASE_URL;
if (!DB_URL) { console.error("Нужен --url=..."); process.exit(1); }
const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });

const parseDetails = (raw) => {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try { return JSON.parse(raw); } catch { return {}; }
};

// AdminStatsPage:392-398
const getRequestSum = (r) => {
  const fromField = parseFloat(r.totalSum);
  if (!isNaN(fromField) && fromField > 0) return fromField;
  const d = parseDetails(r.details);
  const fromDetails = parseFloat(d.totalSum || 0);
  return isNaN(fromDetails) ? 0 : fromDetails;
};

// AdminStatsPage:475-491
function filteredRequests(all, { filterPaid = "all" } = {}) {
  let arr = all;
  if (filterPaid === "paid") arr = arr.filter((r) => r.isPaid === true);
  else if (filterPaid === "unpaid") arr = arr.filter((r) => r.isPaid !== true);
  return arr;
}

// AdminStatsPage:525-600
function stats(requests) {
  let totalRevenue = 0;
  const monthly = {}, statusGroups = {}, clientGroups = {};
  requests.forEach((r) => {
    const d = new Date(r.createdAt);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthly[m]) monthly[m] = { turnover: 0, count: 0 };
    monthly[m].count += 1;
    if (r.status !== "Аннулировано" && r.status !== "canceled") {
      const det = parseDetails(r.details);
      const sum = getRequestSum(r);
      if (sum > 0) {
        totalRevenue += sum;
        monthly[m].turnover += sum;
        const c = det.customer?.companyName || det.customer?.fio || "Не указан";
        clientGroups[c] = (clientGroups[c] || 0) + sum;
      }
      const label = r.isFullyCompleted ? "Завершено"
        : det.isDeferredForAccountant ? "Отложено"
        : det.readyForAccountant ? "В бухгалтерии"
        : det.isWarehouse ? "Склад" : "Актив";
      statusGroups[label] = (statusGroups[label] || 0) + 1;
    }
  });
  return {
    записей: requests.length,
    оборот: Math.round(totalRevenue),
    месяцев: Object.keys(monthly).length,
    ттн: requests.filter((r) => r.type === "TTN" || (r.details && r.details.includes('"docType":"ttn"'))).length,
    смр: requests.filter((r) => r.type === "SMR" || (r.details && r.details.includes('"docType":"smr"'))).length,
    склад: requests.filter((r) => parseDetails(r.details).isWarehouse).length,
    топКлиентов: Object.keys(clientGroups).length,
    статусов: Object.keys(statusGroups).length,
  };
}

const all = await prisma.request.findMany({
  select: { id: true, type: true, status: true, totalSum: true, details: true,
            createdAt: true, isPaid: true, isFullyCompleted: true, companyId: true },
});

const частные = all.filter((r) => r.type === "SIMPLE");
const цель = частные.find((r) => r.status !== "canceled" && getRequestSum(r) > 0) || частные[0];

// «После»: та же выборка, у одной частной поднят isPaid.
const после = all.map((r) => (r.id === цель.id ? { ...r, isPaid: true } : r));

const режимы = ["all", "paid", "unpaid"];
const РУ = { all: "фильтр ВЫКЛ (по умолчанию)", paid: "фильтр «Оплачено»", unpaid: "фильтр «Не оплачено»" };

console.log(`\nВсего накладных: ${all.length}  (частных: ${частные.length}, юрлиц: ${all.length - частные.length})`);
console.log(`Отмечаем оплату у частной: сумма ${getRequestSum(цель)} тг, статус ${цель.status}\n`);

for (const режим of режимы) {
  const до = stats(filteredRequests(all, { filterPaid: режим }));
  const по = stats(filteredRequests(после, { filterPaid: режим }));
  console.log("─".repeat(72));
  console.log(РУ[режим]);
  const ключи = Object.keys(до);
  const строки = ключи.map((k) => ({
    метрика: k, до: до[k], после: по[k],
    изменение: по[k] - до[k] === 0 ? "—" : (по[k] - до[k] > 0 ? `+${по[k] - до[k]}` : `${по[k] - до[k]}`),
  }));
  console.table(строки);
}

// Бейджи (AdminStatsPage:512-522) — считаются от ПОЛНОГО набора, не от filteredRequests
const бейдж = (arr) => ({
  оплачено: arr.filter((r) => r.isPaid === true).length,
  неОплачено: arr.filter((r) => r.isPaid !== true).length,
});
console.log("─".repeat(72));
console.log("Бейджи над списком:");
console.table([{ ...бейдж(all), когда: "до" }, { ...бейдж(после), когда: "после" }]);

await prisma.$disconnect();
