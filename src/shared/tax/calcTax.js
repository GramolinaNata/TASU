// Расчёт налога по партии для отчёта бухгалтера.
//
// ЗАЧЕМ ОТДЕЛЬНЫМ МОДУЛЕМ. Раньше расчёт жил тремя строками прямо в
// BookkeeperReportPage. Пока это был один процент от оборота, так было можно;
// с появлением КПН у расчёта есть порядок действий и вычет, который зависит от
// признака официальности перевозки — такое обязано быть покрыто тестами, иначе
// ошибка в налоге всплывёт только при сверке с бухгалтером.
//
// ПОРЯДОК ДЕЙСТВИЙ В ОУР (со слов заказчика, именно в этом порядке):
//   1. от оборота отнять НДС;
//   2. отнять сумму купленной перевозки — ТОЛЬКО если она куплена официально;
//   3. от остатка взять КПН.
//
// Неофициальную перевозку (за наличные) вычитать нельзя: в учёте её нет,
// налоговую базу она не уменьшает. Признак ставит менеджер или бухгалтер.
//
// СТАВКИ НЕ ЗАШИТЫ. Ни 16, ни 10 в коде не встречается: и НДС, и КПН берутся
// из карточки компании. Ставка КПН по умолчанию 0 — пока её не заполнили,
// КПН равен нулю и отчёт считается ровно как до этой правки.

/**
 * @param {object} p
 * @param {number} p.income          оборот (выручка партии)
 * @param {number} p.carrierSum      сумма, уплаченная перевозчику
 * @param {boolean} p.carrierOfficial перевозка куплена официально
 * @param {string} p.taxMode         'none' | 'simplified' | 'our'
 * @param {number} p.taxRate         ставка налога, % (упрощёнка / прочее)
 * @param {number} p.taxExtra        доп. сбор, % (упрощёнка)
 * @param {number} p.vatRate         ставка НДС, % (ОУР)
 * @param {number} p.kpnRate         ставка КПН, % (ОУР)
 * @returns {{vat:number, kpn:number, kpnBase:number, deducted:number, total:number}}
 */
export function calcTax({
  income = 0,
  carrierSum = 0,
  carrierOfficial = false,
  taxMode = 'none',
  taxRate = 0,
  taxExtra = 0,
  vatRate = 0,
  kpnRate = 0,
} = {}) {
  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // Округление до копеек. Через Number.EPSILON — иначе 36 × 0.1 в двоичной
  // арифметике даёт 3.6000000000000005 и в отчёте всплывает мусорный хвост.
  const round2 = (v) => Math.round((v + Number.EPSILON) * 100) / 100;

  const base = num(income);
  const empty = { vat: 0, afterVat: 0, kpn: 0, kpnBase: 0, deducted: 0, net: 0, total: 0 };

  if (taxMode === 'simplified') {
    return { ...empty, total: Math.round(base * ((num(taxRate) + num(taxExtra)) / 100)) };
  }

  if (taxMode === 'our') {
    // Пример заказчика с созвона (оборот 400, официальная перевозка 300):
    //   НДС      = 400 × 16%          = 64      ← от ПОЛНОГО оборота
    //   после НДС= 400 − 64           = 336
    //   − перевозка                   = 36      ← только официальная
    //   КПН      = 36 × 10%           = 3.6     ← ПОСЛЕДНИМ, от остатка
    //   итог     = 36 − 3.6           = 32.4
    //
    // Округляем до копеек, а не до целых тенге: в примере КПН равен 3.6, и
    // округление до целого дало бы 4, а итог 32 вместо 32.4. Считать «примерно»
    // в налоге нельзя, поэтому дробная часть сохраняется.
    const vat = round2(base * (num(vatRate) / 100));
    const afterVat = round2(base - vat);

    // Официальная перевозка уменьшает остаток, неофициальная (за наличные) —
    // нет: в учёте её не существует, базу она не уменьшает.
    const deducted = carrierOfficial ? num(carrierSum) : 0;

    // Остаток не уходит в минус: при перевозке дороже оборота (убыточная
    // партия) отрицательная база дала бы «отрицательный налог», то есть возврат
    // из бюджета. Такого быть не может — остаток обнуляется, КПН равен нулю.
    const kpnBase = Math.max(0, round2(afterVat - deducted));
    const kpn = round2(kpnBase * (num(kpnRate) / 100));

    return {
      vat,
      afterVat,
      deducted,
      kpnBase,
      kpn,
      // «Итог» из примера заказчика — то, что остаётся после НДС, перевозки и КПН.
      net: round2(kpnBase - kpn),
      // Сумма налога (то, что уходит в бюджет) — ею оперирует отчёт.
      total: round2(vat + kpn),
    };
  }

  // 'none' и всё нераспознанное — прежнее поведение: процент от оборота.
  return { ...empty, total: Math.round(base * (num(taxRate) / 100)) };
}

/** Ставки и режим из карточки компании — в одном месте, чтобы не разъезжались. */
export function taxSettingsOf(company) {
  return {
    taxMode: company?.taxMode || 'none',
    taxRate: Number(company?.taxRate) || 0,
    taxExtra: Number(company?.taxExtra) || 0,
    vatRate: Number(company?.vatRate) || 0,
    kpnRate: Number(company?.kpnRate) || 0,
  };
}
