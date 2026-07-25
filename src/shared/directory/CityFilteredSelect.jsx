import React, { useEffect, useMemo, useState } from "react";
import { filterByCity, servesCity, cityHint } from "./byCity.js";

// ============================================================
// Селект перевозчика / представителя, сужённый по городу.
// Один компонент на все четыре места (ведомость перевозчика и форма партии),
// чтобы поведение и формулировки не разъехались.
//
// Три случая (см. byCity.filterByCity):
//   • закреплён один      → подставляется вызывающим кодом, здесь просто показан
//   • закреплено несколько → список сужен, предвыбора нет
//   • не закреплён никто   → показан весь справочник + подпись
//
// «Показать всех» снимает фильтр вручную — это состояние ТОЛЬКО интерфейса,
// в данные не пишется.
//
// Выбранный человек никогда не пропадает из списка: если он не закреплён за
// городом, он всё равно показан и помечен, а выбор не сбрасывается молча.
// ============================================================
export default function CityFilteredSelect({
  items = [],
  city = "",
  value = "",
  onChange,
  kindPlural = "перевозчики",
  kindSingle = "перевозчик",
  placeholder = "— выберите —",
  style,
  compact = false,
}) {
  const [showAll, setShowAll] = useState(false);

  // Сменили город — фильтр снова включается.
  useEffect(() => { setShowAll(false); }, [city]);

  const res = useMemo(() => filterByCity(items, city), [items, city]);
  const selected = useMemo(
    () => (value ? (items || []).find((i) => String(i.id) === String(value)) : null),
    [items, value]
  );

  // Выбранный, но не обслуживающий этот город — повод предупредить, а не сбросить.
  const notServing = !!(selected && city && !servesCity(selected, city));

  const base = showAll ? items : res.list;
  const options = useMemo(() => {
    if (!selected) return base;
    return base.some((i) => String(i.id) === String(selected.id)) ? base : [selected, ...base];
  }, [base, selected]);

  const label = (i) => `${i.name}${i.phone ? ` · ${i.phone}` : ""}`;

  const hint = showAll
    ? "Фильтр по городу снят — показан весь справочник."
    : cityHint(res, city, kindPlural);

  // «Подобрать по городу»: если закреплён ровно один — ставим его,
  // иначе очищаем выбор, чтобы человек выбрал из сужённого списка.
  const pickByCity = () => {
    setShowAll(false);
    onChange(res.autoPick ? res.autoPick.id : "");
  };

  const placeholderText = (!showAll && res.isFiltered && res.matched > 1)
    ? `— выберите (${res.matched} по городу) —`
    : placeholder;

  return (
    <div style={style}>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%" }}
      >
        <option value="">{placeholderText}</option>
        {options.map((i) => (
          <option key={i.id} value={i.id}>
            {label(i)}{city && !servesCity(i, city) ? " · не по этому городу" : ""}
          </option>
        ))}
      </select>

      {notServing && (
        <div style={{ marginTop: 4, fontSize: compact ? "0.68rem" : "0.75rem", color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 4, padding: "3px 6px" }}>
          ⚠ {selected.name} не закреплён за городом «{city}».{" "}
          <button
            type="button"
            onClick={pickByCity}
            style={{ border: "none", background: "none", padding: 0, color: "#b45309", textDecoration: "underline", cursor: "pointer", font: "inherit" }}
          >
            подобрать по городу
          </button>
        </div>
      )}

      {!!city && !notServing && hint && (
        <div className="muted" style={{ marginTop: 3, fontSize: compact ? "0.66rem" : "0.72rem" }}>
          {hint}
        </div>
      )}

      {!!city && (res.isFiltered || showAll) && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          style={{ marginTop: 2, border: "none", background: "none", padding: 0, color: "#2563eb", textDecoration: "underline", cursor: "pointer", fontSize: compact ? "0.66rem" : "0.72rem" }}
        >
          {showAll ? `Фильтровать по городу «${city}»` : `Показать всех (${items.length})`}
        </button>
      )}
    </div>
  );
}
