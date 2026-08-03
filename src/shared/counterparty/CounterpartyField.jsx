// ============================================================
// Поле «ФИО / Название» с инлайн-подсказкой контрагентов из базы.
//
// ЗАЧЕМ. Раньше поиск контрагента был отдельным шагом — кнопка «Найти в базе»
// открывала модалку. Менеджеры про неё забывали и вбивали данные руками,
// из-за чего в справочнике плодились дубли одного и того же контрагента.
// Теперь совпадения всплывают прямо по ходу набора: выбрал — подставились
// все поля стороны, не выбрал — заполняешь как обычно.
//
// Поиск идёт по УЖЕ загруженному массиву контрагентов (его страница заявки
// грузит один раз при открытии), поэтому в сеть на каждое нажатие не ходим.
//
// Дедуп при сохранении не здесь: им занимается upsertCounterparty —
// ключ различения телефон по цифрам, общий для частных и юрлиц.
// ============================================================

import React, { useMemo, useRef, useState } from "react";

import { findCounterpartyHints, subtitle } from "./counterpartyMatch.js";

export default function CounterpartyField({
  value,
  onChange,
  onPick,
  items,
  placeholder,
  disabled,
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const blurTimer = useRef(null);

  const hints = useMemo(() => findCounterpartyHints(items, value), [items, value]);

  const pick = (cp) => {
    onPick(cp);
    setOpen(false);
    setActive(0);
  };

  const onKeyDown = (e) => {
    if (!open || hints.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % hints.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i - 1 + hints.length) % hints.length); }
    else if (e.key === "Enter") { e.preventDefault(); pick(hints[active]); }
    else if (e.key === "Escape") { setOpen(false); }
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        // Клик по подсказке сначала снимает фокус с поля. Закрываем список
        // с задержкой, иначе он исчезнет раньше, чем сработает выбор.
        onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 150); }}
        onKeyDown={onKeyDown}
      />

      {open && hints.length > 0 && (
        <div
          style={{
            position: "absolute", top: "100%", left: 0, right: 0, zIndex: 30,
            background: "#fff", border: "1px solid #d9d9d9", borderRadius: 6,
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)", maxHeight: 260, overflowY: "auto",
          }}
          onMouseDown={() => clearTimeout(blurTimer.current)}
        >
          {hints.map((cp, i) => (
            <div
              key={cp.id || i}
              onClick={() => pick(cp)}
              onMouseEnter={() => setActive(i)}
              style={{
                padding: "7px 10px", cursor: "pointer",
                background: i === active ? "#eff6ff" : "transparent",
                borderBottom: i < hints.length - 1 ? "1px solid #f1f5f9" : "none",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{cp.name || "—"}</div>
              {subtitle(cp) && (
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{subtitle(cp)}</div>
              )}
            </div>
          ))}
          <div style={{ padding: "5px 10px", fontSize: "0.7rem", color: "#94a3b8", background: "#f8fafc" }}>
            Выберите совпадение или продолжайте вводить — создастся новый контрагент
          </div>
        </div>
      )}
    </div>
  );
}
