import React, { useState } from "react";

// ============================================================
// Мультиселект городов обслуживания для справочников
// (перевозчики / представители). Города — чипами: клик по «×» убирает,
// ввод + Enter добавляет. Подсказки берутся из тарифов, но список не
// закрытый: можно вписать город, которого ещё нет в тарифах.
//
// value  — массив строк
// onChange(nextArray)
// options — массив строк-подсказок (города тарифов)
// ============================================================
export default function CitiesMultiSelect({ value = [], onChange, options = [], placeholder = "Город и Enter" }) {
  const [draft, setDraft] = useState("");

  const list = Array.isArray(value) ? value : [];
  const same = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

  const add = (raw) => {
    const city = String(raw || "").trim();
    if (!city) return;
    // Один город в списке — один раз, регистр не плодит дубли.
    if (list.some((c) => same(c, city))) { setDraft(""); return; }
    onChange([...list, city]);
    setDraft("");
  };

  const remove = (city) => onChange(list.filter((c) => !same(c, city)));

  const onKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();          // Enter не должен сабмитить форму справочника
      add(draft);
    } else if (e.key === "Backspace" && !draft && list.length > 0) {
      onChange(list.slice(0, -1)); // привычное поведение чипов
    }
  };

  // В подсказках не показываем уже выбранные.
  const free = (options || []).filter((o) => !list.some((c) => same(c, o)));

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
        {list.length === 0 && (
          <span className="muted" style={{ fontSize: "0.78rem" }}>Города не выбраны</span>
        )}
        {list.map((c) => (
          <span
            key={c}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8",
              borderRadius: 999, padding: "2px 8px", fontSize: "0.8rem", fontWeight: 600,
            }}
          >
            {c}
            <button
              type="button"
              onClick={() => remove(c)}
              title={`Убрать «${c}»`}
              style={{ border: "none", background: "none", cursor: "pointer", color: "#1d4ed8", fontSize: "0.95rem", lineHeight: 1, padding: 0 }}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => add(draft)}
          placeholder={placeholder}
          list="cities-suggest-list"
          style={{ flex: 1 }}
        />
        <button type="button" className="btn btn--sm" onClick={() => add(draft)} title="Добавить город">+</button>
        <datalist id="cities-suggest-list">
          {free.map((o) => <option key={o} value={o} />)}
        </datalist>
      </div>
      <div className="muted" style={{ fontSize: "0.72rem", marginTop: 4 }}>
        Города из тарифов подсказываются, но можно вписать любой. По этим городам
        сужается выбор в ведомости перевозчика и в форме партии.
      </div>
    </div>
  );
}
