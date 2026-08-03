// ============================================================
// Единая обёртка для показа денег в интерфейсе.
//
// ЗАЧЕМ. Роль «Менеджер (ограниченный)» не должна видеть суммы нигде.
// Раньше такие проверки писались вручную в каждом месте: в итоге один и тот
// же по смыслу guard жил в DeferredPage и отсутствовал в «Заявках», «ТТН»
// и «СМР». Теперь всё идёт через один флаг canSeeMoney из AuthContext,
// и новое место может протечь только если сумму вывели мимо этих обёрток —
// а это видно на ревью.
//
// ВАЖНО: обёртки скрывают ТОЛЬКО отображение. Данные и расчёт не трогаются:
// сумма как считалась и сохранялась, так и продолжает — роль просто её не видит.
//
// Ячейки таблиц (MoneyTh/MoneyTd) возвращают null, то есть колонка исчезает
// целиком. Поэтому заголовок и ячейку нужно оборачивать ПАРОЙ, иначе разъедется
// разметка. В таблицах с colSpan его надо уменьшать на скрытые колонки — для
// этого есть moneyColSpan().
// ============================================================

import React from "react";
import { useAuth } from "../auth/AuthContext";

export function useCanSeeMoney() {
  const { canSeeMoney } = useAuth();
  // Пока контекст не прогрузился — считаем, что показывать нельзя:
  // лучше мигнуть пустотой, чем показать сумму тому, кому не положено.
  return canSeeMoney !== false;
}

// Число → «12 500 тг». Пустое/нечисловое значение даёт прочерк.
export function formatMoney(value, suffix = "тг") {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString()}${suffix ? " " + suffix : ""}`;
}

// Инлайновая сумма внутри текста или ячейки.
export function Money({ value, suffix = "тг", fallback = null }) {
  if (!useCanSeeMoney()) return fallback;
  return <>{formatMoney(value, suffix)}</>;
}

// Заголовок денежной колонки. Скрыт — колонки нет.
export function MoneyTh({ children, ...rest }) {
  if (!useCanSeeMoney()) return null;
  return <th {...rest}>{children}</th>;
}

// Ячейка денежной колонки. Либо готовое value, либо произвольный children.
export function MoneyTd({ value, suffix = "тг", children, ...rest }) {
  if (!useCanSeeMoney()) return null;
  return <td {...rest}>{children !== undefined ? children : formatMoney(value, suffix)}</td>;
}

// Блок (плашка, поле формы, строка карточки) с суммой.
export function MoneyBlock({ children }) {
  if (!useCanSeeMoney()) return null;
  return <>{children}</>;
}

// colSpan с поправкой на скрытые денежные колонки.
// moneyColSpan(10, 2) → 10 когда деньги видны, 8 когда скрыты.
export function useMoneyColSpan() {
  const visible = useCanSeeMoney();
  return (full, moneyColumns = 1) => (visible ? full : full - moneyColumns);
}
