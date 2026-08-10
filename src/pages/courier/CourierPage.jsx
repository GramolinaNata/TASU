import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../shared/api/api.js";
import Loader from "../../shared/components/Loader";
import { useAuth } from "../../shared/auth/AuthContext";
import { isVisibleToCourier } from "../../shared/courier/courierCity.js";

function formatDisplayDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('ru');
}

const STATUS_COLORS = {
  'Забрано': { bg: '#e6f7ff', color: '#1890ff' },
  'Доставлено': { bg: '#f6ffed', color: '#52c41a' },
  'Заявка': { bg: '#fffbe6', color: '#faad14' },
  'act': { bg: '#f6ffed', color: '#52c41a' },
  'draft': { bg: '#f5f5f5', color: '#999' },
};

export default function CourierPage() {
  const { user } = useAuth();
  // ТЗ: курьер работает по своему городу. Город назначает администратор
  // в «Персонале»; пока не назначен — список пуст (см. ниже).
  const courierCity = user?.city || "";
  const [acts, setActs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      try {
        const list = await api.requests.list();
        if (Array.isArray(list)) {
          const parsed = list.map(a => {
            let details = {};
            if (a.details) {
              try { details = typeof a.details === 'string' ? JSON.parse(a.details) : a.details; }
              catch (e) {}
            }
            return { ...a, ...details };
          });
          // Фильтр продублирован с сервером намеренно: интерфейс не должен
          // зависеть от того, что вернул API. Серверный фильтр — главный,
          // без него курьер получил бы всё простым запросом мимо интерфейса.
          setActs(parsed.filter(a => isVisibleToCourier(a, courierCity)));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [courierCity]);

  const filtered = acts.filter(a => {
    const s = search.trim().toLowerCase();
    const matchSearch = !s || [
      a.docNumber, a.number,
      a.customer?.fio, a.customer?.companyName,
      a.route?.fromCity, a.route?.toCity
    ].filter(Boolean).join(' ').toLowerCase().includes(s);
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // ТЗ: город не назначен — показываем подсказку вместо списка, а не всё
  // подряд. Пустое поле означает «доступ не настроен»: иначе новый курьер
  // до настройки видел бы заявки всех городов и компаний.
  if (!courierCity) {
    return (
      <>
        <div className="navbar">
          <h1>Мои доставки</h1>
        </div>
        <div className="card" style={{ marginTop: 24, padding: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📍</div>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Город не назначен</div>
          <div className="muted">
            Обратитесь к администратору — он задаёт город в разделе «Персонал».
            До этого список доставок пуст.
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1>Мои доставки</h1>
          <div className="chip">📍 {courierCity}</div>
        </div>
      </div>

      <div className="filter" style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div className="field" style={{ minWidth: 200, flex: 1 }}>
          <div className="label">Поиск</div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Номер, заказчик, город..." />
        </div>
        <div className="field" style={{ width: 160 }}>
          <div className="label">Статус</div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">Все</option>
            <option value="Заявка">Заявка</option>
            <option value="Забрано">Забрано</option>
            <option value="Доставлено">Доставлено</option>
          </select>
        </div>
      </div>

      <div className="table_wrap" style={{ marginTop: 16 }}>
        {loading ? <Loader /> : (
          <table className="table_fixed">
            <thead>
              <tr>
                <th style={{ width: 120 }}>Номер</th>
                <th style={{ width: 100 }}>Дата</th>
                <th>Заказчик</th>
                <th>Маршрут</th>
                <th style={{ width: 80 }}>Мест</th>
                <th style={{ width: 90 }}>Вес</th>
                <th style={{ width: 120 }}>Статус</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted" style={{ padding: 16 }}>Нет доставок.</td>
                </tr>
              ) : (
                filtered.map(a => {
                  const statusStyle = STATUS_COLORS[a.status] || { bg: '#f5f5f5', color: '#999' };
                  return (
                    <tr key={a.id}>
                      <td className="num">
                        <Link to={`/courier/acts/${a.id}`}>
                          {a.docNumber || a.number || a.id?.slice(0, 8)}
                        </Link>
                      </td>
                      <td>{formatDisplayDate(a.createdAt || a.date)}</td>
                      <td>{a.customer?.companyName || a.customer?.fio || "—"}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {a.route?.fromCity || "—"} → {a.route?.toCity || "—"}
                      </td>
                      <td>{a.totals?.seats || "—"}</td>
                      <td>{a.totals?.weight ? `${a.totals.weight} кг` : "—"}</td>
                      <td>
                        <span className="badge" style={{ background: statusStyle.bg, color: statusStyle.color, padding: '2px 8px', fontSize: '0.75rem' }}>
                          {a.status || "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}