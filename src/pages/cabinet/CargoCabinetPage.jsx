import React, { useEffect, useMemo, useState } from "react";
import { api } from "../../shared/api/api.js";
import { useAuth } from "../../shared/auth/AuthContext";
import { roleName } from "../../shared/auth/roles.js";
import { cabinetFor, cabinetActions } from "../../shared/cargo/cabinets.js";
import { cargoLabel, cargoActionLabel } from "../../shared/cargo/cargoStatus.js";
// Полоса маршрута и журнал — общие с карточкой заявки: одно и то же нужно
// в кабинете, у менеджера и у админа, три копии разъехались бы.
import { CargoFlowStrip, CargoJournal } from "../../shared/cargo/CargoTrack.jsx";

/**
 * Кабинет движения груза — общий экран для кладовщика, местного и
 * регионального курьера и операционного менеджера.
 *
 * ЧТО ЗДЕСЬ НЕТ И НЕ ДОЛЖНО БЫТЬ: сумм, реквизитов, телефонов сторон, состава
 * услуг. Они сюда не «спрятаны» — их не отдаёт сервер (getCabinetRequests):
 * скрытая колонка ограничением не является, данные всё равно лежали бы в
 * ответе API.
 *
 * НАБОР КНОПОК — пересечение движка и кабинета. Что разрешено роли из текущего
 * статуса, решает cargoStatus.js; что показывать — CABINETS[].steps. Кабинет
 * СУЖАЕТ, а не расширяет: сервер проверяет широкое правило сам.
 */

function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("ru");
}

function fmtDateTime(v) {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleString("ru", { dateStyle: "short", timeStyle: "short" });
}

export default function CargoCabinetPage() {
  const { user, logout } = useAuth();
  const cabinet = cabinetFor(user?.role);

  const [items, setItems] = useState([]);
  const [city, setCity] = useState("");
  const [scope, setScope] = useState("all");
  // ПОЧЕМУ ДВА ФЛАГА, А НЕ ОДИН.
  //
  // Было `loading`, поднятый в true при монтировании, и кнопка «Обновить» с
  // disabled={loading}. Пока первый запрос не завершится, кнопка мертва — а
  // если запрос повис (спящий телефон, потерянная сеть), она мертва НАВСЕГДА:
  // снять флаг больше некому. Кладовщик в таком состоянии не может даже
  // повторить попытку — единственное, что ему остаётся, перезагрузить страницу.
  //
  // firstLoad отвечает только за первую отрисовку, refreshing — за ручное
  // обновление. Кнопка блокируется исключительно на время СВОЕГО запроса.
  const [firstLoad, setFirstLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [search, setSearch] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);

  const load = async () => {
    setRefreshing(true);
    try {
      setError("");
      const data = await api.requests.cabinetList();
      setItems(Array.isArray(data?.items) ? data.items : []);
      setCity(data?.city || "");
      setScope(data?.scope || "all");
      // Отметка времени — единственное видимое доказательство, что нажатие
      // сработало. Без неё список после обновления выглядит тем же самым,
      // и кнопка кажется сломанной, даже когда исправно отработала.
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e.message || "Не удалось загрузить груз");
    } finally {
      setRefreshing(false);
      setFirstLoad(false);
    }
  };

  useEffect(() => { load(); }, [user?.role]);

  const move = async (id, status) => {
    setBusyId(id);
    try {
      await api.requests.setCargoStatus(id, status);
      await load();
    } catch (e) {
      alert("Не удалось отметить: " + (e.message || e));
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((a) => {
      // «Только в работе» прячет уже выданный груз — он в кабинете только мешает.
      if (onlyActive && a.cargoStatus === "delivered") return false;
      if (!q) return true;
      return [a.docNumber, a.fromCity, a.toCity, a.toAddress, a.cargoText]
        .some((v) => String(v || "").toLowerCase().includes(q));
    });
  }, [items, search, onlyActive]);

  if (!cabinet) {
    return (
      <div style={{ padding: 32, textAlign: "center" }}>
        <h2>Кабинет недоступен</h2>
        <p className="muted">Для роли «{roleName(user?.role)}» кабинет движения груза не настроен.</p>
        <button className="btn" onClick={logout}>Выйти</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 4 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.4rem" }}>
            {cabinet.icon} {cabinet.title}
          </h1>
          <div className="muted" style={{ fontSize: "0.85rem" }}>{cabinet.subtitle}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 600 }}>{user?.name || user?.email}</div>
          <div className="muted" style={{ fontSize: "0.8rem" }}>
            {roleName(user?.role)}{scope !== "all" && city ? ` · ${city}` : ""}
          </div>
          <button className="btn btn--sm" onClick={logout} style={{ marginTop: 6 }}>Выйти</button>
        </div>
      </div>

      {/* Город не назначен — это не «пустой день», а ненастроенный доступ.
          Говорим прямо, иначе человек будет ждать груз, которого не увидит. */}
      {scope !== "all" && !city && (
        <div className="card" style={{ padding: 16, marginTop: 16, background: "#fff7e6", border: "1px solid #ffd591" }}>
          <b>Город не назначен.</b>{" "}
          <span className="muted">
            Пока администратор не укажет город в «Персонале», список остаётся пустым — это защита,
            а не ошибка: иначе была бы видна вся база.
          </span>
        </div>
      )}

      <div className="card" style={{ padding: 12, marginTop: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <input
          placeholder="Номер, город, адрес, груз…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 220 }}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", cursor: "pointer" }}>
          <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} />
          Только в работе
        </label>
        <button className="btn btn--sm" onClick={() => load()} disabled={refreshing}>
          {refreshing ? "Обновляю…" : "Обновить"}
        </button>
        <span className="muted" style={{ fontSize: "0.8rem" }}>
          {firstLoad ? "Загрузка…" : `${filtered.length} из ${items.length}`}
          {updatedAt && !refreshing ? ` · обновлено в ${updatedAt.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : ""}
        </span>
      </div>

      {error && (
        <div className="card" style={{ padding: 16, marginTop: 16, background: "#fff1f0", border: "1px solid #ffa39e" }}>
          {error}
        </div>
      )}

      {!firstLoad && !refreshing && !error && filtered.length === 0 && (
        <div className="card muted" style={{ padding: 24, marginTop: 16, textAlign: "center" }}>
          Груза нет.
        </div>
      )}

      <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
        {filtered.map((a) => {
          const actions = cabinetActions(cabinet, a.cargoStatus, user?.role);
          return (
            <div key={a.id} className="card" style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>
                    №{a.docNumber || "—"}
                    <span className="muted" style={{ fontWeight: 400, fontSize: "0.8rem", marginLeft: 8 }}>
                      {fmtDate(a.date)}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.9rem", marginTop: 2 }}>
                    {a.fromCity || "—"} → {a.toCity || "—"}
                  </div>
                  {/* Адрес показываем тот, который роли нужен: складу и местному
                      курьеру — откуда забирать, региональному — куда везти. */}
                  <div className="muted" style={{ fontSize: "0.82rem" }}>
                    {cabinet.scope === "toCity"
                      ? (a.toAddress ? `Выгрузка: ${a.toAddress}` : "")
                      : (a.fromAddress ? `Погрузка: ${a.fromAddress}` : "")}
                  </div>
                  {a.cargoText && (
                    <div className="muted" style={{ fontSize: "0.82rem", marginTop: 2 }}>{a.cargoText}</div>
                  )}
                </div>
                <div style={{ textAlign: "right", minWidth: 120 }}>
                  <div style={{ fontSize: "0.85rem" }}>{a.seats || 0} мест · {a.weight || 0} кг</div>
                  <div style={{ marginTop: 4, fontWeight: 700, fontSize: "0.85rem", color: "#0050b3" }}>
                    {cargoLabel(a.cargoStatus)}
                  </div>
                  {a.cargoStatusAt && (
                    <div className="muted" style={{ fontSize: "0.72rem" }}>{fmtDateTime(a.cargoStatusAt)}</div>
                  )}
                </div>
              </div>

              <CargoFlowStrip current={a.cargoStatus} events={a.cargoEvents} />

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                {actions.length === 0 ? (
                  <span className="muted" style={{ fontSize: "0.8rem" }}>
                    Сейчас ваших действий по этому грузу нет.
                  </span>
                ) : (
                  actions.map((s) => (
                    <button
                      key={s}
                      className="btn btn--accent"
                      disabled={busyId === a.id}
                      onClick={() => move(a.id, s)}
                    >
                      {busyId === a.id ? "Отмечаю…" : cargoActionLabel(s)}
                    </button>
                  ))
                )}
              </div>

              {cabinet.showJournal && (
                <div style={{ marginTop: 10, borderTop: "1px solid var(--line, #eee)", paddingTop: 8 }}>
                  <CargoJournal events={a.cargoEvents} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
