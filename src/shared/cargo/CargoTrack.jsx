import React from "react";
import {
  CARGO_FLOW, cargoLabel, cargoEventsFrom, reachedCargoSteps, normalizeCargoStatus,
  cargoStatusFromDocStatus,
} from "./cargoStatus.js";
import { roleName } from "../auth/roles.js";

/**
 * Показ движения груза: где груз сейчас и кто его туда двинул.
 *
 * ОДИН КОМПОНЕНТ НА ТРИ ЭКРАНА. Полоса маршрута и журнал сначала жили внутри
 * кабинета ролей. Но по ТЗ операционный менеджер контролирует все этапы, а
 * менеджеру и админу надо видеть, где груз, не выходя из карточки заявки —
 * то есть одно и то же нужно в трёх местах. Три копии разъехались бы на
 * первой же правке маршрута.
 */

function fmtDateTime(v) {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleString("ru", { dateStyle: "short", timeStyle: "short" });
}

/** Полоса маршрута: пройденное закрашено, текущее выделено, необязательное пунктиром. */
export function CargoFlowStrip({ current, events }) {
  const cur = normalizeCargoStatus(current);
  const reached = new Set(reachedCargoSteps(events));
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {CARGO_FLOW.map((s) => {
        const isNow = s.key === cur;
        const done = reached.has(s.key) && !isNow;
        return (
          <span
            key={s.key}
            style={{
              padding: "2px 8px", borderRadius: 999, fontSize: "0.7rem", fontWeight: 600,
              border: `1px solid ${isNow ? "#1890ff" : done ? "#b7eb8f" : "#e5e7eb"}`,
              background: isNow ? "#e6f7ff" : done ? "#f6ffed" : "#fafafa",
              color: isNow ? "#0050b3" : done ? "#389e0d" : "#9ca3af",
              borderStyle: s.optional && !done && !isNow ? "dashed" : "solid",
            }}
          >
            {cargoLabel(s.key)}
          </span>
        );
      })}
    </div>
  );
}

/** Кто и когда отмечал. Откаты показываем — они часть истории. */
export function CargoJournal({ events }) {
  const list = cargoEventsFrom(events);
  if (!list.length) {
    return <div className="muted" style={{ fontSize: "0.78rem" }}>Отметок пока нет.</div>;
  }
  return (
    <div style={{ display: "grid", gap: 4 }}>
      {list.map((e, i) => (
        <div key={i} style={{ fontSize: "0.78rem", color: "#64748b", display: "flex", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600, color: e.back ? "#cf1322" : "#334155", minWidth: 170 }}>
            {e.back ? "↩ откат: " : ""}{cargoLabel(e.status)}
          </span>
          <span style={{ minWidth: 110 }}>{fmtDateTime(e.at)}</span>
          <span>
            {/* Имя человека, а не только роль. У записей, сделанных до того,
                как имя начали сохранять, остаётся одна роль — врать про автора
                нельзя, лучше показать то, что есть. */}
            {e.byName || (e.byRole ? roleName(e.byRole) : "—")}
            {e.byName && e.byRole ? ` · ${roleName(e.byRole)}` : ""}
            {/* Отметка, восстановленная засевом: движение было раньше журнала,
                автора тогда просто не записывали. */}
            {e.seeded ? " · восстановлено" : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Готовый блок для карточки заявки.
 *
 * @param {object} act        накладная (нужны cargoStatus, cargoStatusAt, cargoEvents)
 * @param {boolean} [journal] показывать журнал (по умолчанию да)
 */
export default function CargoTrack({ act, journal = true, title = "Движение груза" }) {
  const stored = normalizeCargoStatus(act?.cargoStatus);
  const events = cargoEventsFrom(act?.cargoEvents);

  // СТАРЫЕ НАКЛАДНЫЕ. До появления cargoStatus курьерский экран писал движение
  // прямо в статус документа («Забрано», «Доставлено»). У таких записей поле
  // груза пусто, и без запасного чтения карточка показала бы менеджеру «не в
  // пути» по грузу, который давно выдали. Запасное чтение включается ТОЛЬКО
  // при пустом cargoStatus: выводить движение из рабочего процесса документа
  // у живых записей нельзя — это разные оси (см. шапку cargoStatus.js).
  const legacy = stored ? "" : cargoStatusFromDocStatus(act?.status);
  const cur = stored || legacy;
  const started = cur !== "" || events.length > 0;

  return (
    <div className="card" style={{ marginTop: 14, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div className="info_title">{title}</div>
        <div style={{ fontWeight: 700, color: started ? "#0050b3" : "#9ca3af" }}>
          {cargoLabel(cur)}
          {act?.cargoStatusAt && started && (
            <span className="muted" style={{ fontWeight: 400, fontSize: "0.8rem", marginLeft: 8 }}>
              {fmtDateTime(act.cargoStatusAt)}
            </span>
          )}
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <CargoFlowStrip current={cur} events={events} />
      </div>

      {journal && (
        <div style={{ marginTop: 12, borderTop: "1px solid var(--line, #eee)", paddingTop: 10 }}>
          <CargoJournal events={events} />
        </div>
      )}

      {legacy && (
        <div className="muted" style={{ fontSize: "0.78rem", marginTop: 10 }}>
          Отметка взята из статуса документа — накладная оформлена до того, как
          движение груза стали вести отдельно.
        </div>
      )}

      {!started && (
        <div className="muted" style={{ fontSize: "0.78rem", marginTop: 10 }}>
          Груз ещё не в пути. Отметки ставят кладовщик и курьеры в своих кабинетах
          или сканированием наклейки.
        </div>
      )}
    </div>
  );
}
