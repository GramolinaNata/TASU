import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../shared/api/api';
import { Link } from 'react-router-dom';

const STATUS_MAP = {
  'Заявка': 'Новая заявка',
  'Черновик': 'Черновик',
  'В работе': 'В процессе',
  'Завершено': 'Завершено',
  'Аннулировано': 'Аннулировано',
  'active': 'Действующий',
  'canceled': 'Отменен',
  'Act': 'Акт',
  'TTN': 'ТТН',
  'SMR': 'СМР',
  'REQUEST': 'Заявка',
  'ttn': 'ТТН',
  'smr': 'СМР',
  'draft': 'Черновик',
  'canceled_req': 'Аннулировано'
};

const formatCurrency = (val) => {
    return new Intl.NumberFormat('ru-KZ', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(val);
};

export default function AdminStatsPage() {
  const [data, setData] = useState({
    requests: [],
    contracts: [],
    companies: [],
    users: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        const [reqs, ctrs, comps, usrs] = await Promise.all([
          api.requests.list(),
          api.contracts.list(),
          api.companies.list(),
          api.users.list()
        ]);
        setData({
          requests: Array.isArray(reqs) ? reqs : [],
          contracts: Array.isArray(ctrs) ? ctrs : [],
          companies: Array.isArray(comps) ? comps : [],
          users: Array.isArray(usrs) ? usrs : []
        });
      } catch (err) {
        console.error("Failed to load stats data", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadAllData();
  }, []);

  const stats = useMemo(() => {
    const { requests, contracts, users } = data;
    
    // Financial metrics & Monthly Dynamics
    let totalRevenue = 0;
    const monthlyData = {}; // { 'YYYY-MM': { turnover: 0, count: 0 } }
    const managerStats = {}; // { managerId: { 'YYYY-MM': { count: 0, turnover: 0 } } }

    requests.forEach(r => {
        const date = new Date(r.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        // General monthly
        if (!monthlyData[monthKey]) monthlyData[monthKey] = { turnover: 0, count: 0 };
        monthlyData[monthKey].count += 1;

        // Manager specific
        if (r.managerId) {
            if (!managerStats[r.managerId]) managerStats[r.managerId] = {};
            if (!managerStats[r.managerId][monthKey]) managerStats[r.managerId][monthKey] = { count: 0, turnover: 0 };
            managerStats[r.managerId][monthKey].count += 1;
        }

        if (r.status !== 'Аннулировано') {
            try {
                const details = typeof r.details === 'string' ? JSON.parse(r.details) : (r.details || {});
                const sum = parseFloat(details.totalSum || 0);
                if (!isNaN(sum)) {
                    totalRevenue += sum;
                    monthlyData[monthKey].turnover += sum;
                    if (r.managerId) managerStats[r.managerId][monthKey].turnover += sum;
                }
            } catch(e) {}
        }
    });

    // Counts by type
    const counts = {
        ttn: requests.filter(r => r.type === 'TTN' || (r.details && r.details.includes('"docType":"ttn"'))).length,
        smr: requests.filter(r => r.type === 'SMR' || (r.details && r.details.includes('"docType":"smr"'))).length,
        warehouse: requests.filter(r => {
            try {
                const d = typeof r.details === 'string' ? JSON.parse(r.details) : r.details;
                return d?.isWarehouse;
            } catch(e) { return false; }
        }).length,
        contracts: contracts.length
    };

    // Activity feed
    const recent = [...requests]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 8);

    // Group monthly stats (last 6 months)
    const sortedMonths = Object.keys(monthlyData).sort().reverse().slice(0, 6).reverse();
    const chartData = sortedMonths.map(m => ({
        key: m,
        label: new Date(`${m}-01`).toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }),
        ...monthlyData[m]
    }));

    // Manager matrix
    const managerMatrix = users.map(u => {
        const months = sortedMonths.map(m => ({
            key: m,
            ...(managerStats[u.id]?.[m] || { count: 0, turnover: 0 })
        }));
        const totalCount = months.reduce((acc, curr) => acc + curr.count, 0);
        const totalTurnover = months.reduce((acc, curr) => acc + curr.turnover, 0);
        return { ...u, months, totalCount, totalTurnover };
    }).filter(m => m.totalCount > 0); // Only active managers in chart

    return { totalRevenue, counts, recent, chartData, managerMatrix, sortedMonths };
  }, [data]);

  if (isLoading) return <div className="muted" style={{ padding: 40, textAlign: 'center' }}>Загрузка аналитики...</div>;

  const maxMonthlyTurnover = Math.max(...stats.chartData.map(d => d.turnover), 1);

  return (
    <div className="admin_stats">
      <div className="topbar">
        <div>
            <div className="crumbs">Администрирование / Аналитика</div>
            <h1>Обзор системы</h1>
        </div>
      </div>

      <div className="stats_grid" style={{ marginTop: 24 }}>
        <div className="stat_card blue">
            <div className="stat_label">
                <span>💰</span> Общий оборот (активные)
            </div>
            <div className="stat_value">{formatCurrency(stats.totalRevenue)}</div>
            <div className="stat_trend trend_up">↑ На основе всех заявок</div>
        </div>

        <div className="stat_card green">
            <div className="stat_label">
                <span>📝</span> Всего документов
            </div>
            <div className="stat_value">{data.requests.length}</div>
            <div className="stat_trend">Проведенные через систему</div>
        </div>

        <div className="stat_card orange">
            <div className="stat_label">
                <span>🤝</span> Активных компаний
            </div>
            <div className="stat_value">{data.companies.length}</div>
            <div className="stat_trend trend_up">↑ Зарегистрировано в базе</div>
        </div>

        <div className="stat_card red">
            <div className="stat_label">
                <span>📜</span> Заключено договоров
            </div>
            <div className="stat_value">{stats.counts.contracts}</div>
            <div className="stat_trend">Транспортные и складские</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, marginTop: 12 }}>
        <div className="activity_feed_container">
            <div className="content_wrapper glass_panel" style={{ height: '100%' }}>
                <h3 style={{ marginBottom: 20 }}>📊 Динамика оборота по месяцам</h3>
                <div className="chart_container">
                    {stats.chartData.map((d, i) => (
                        <div key={i} className="bar_row">
                            <div className="bar_label">{d.label}</div>
                            <div className="bar_track">
                                <div className="bar_fill" style={{ width: `${(d.turnover / maxMonthlyTurnover) * 100}%` }}></div>
                            </div>
                            <div className="bar_value">{formatCurrency(d.turnover)}</div>
                        </div>
                    ))}
                    {stats.chartData.length === 0 && <div className="muted">Нет данных для графиков</div>}
                </div>

                <h3 style={{ marginBottom: 20, marginTop: 40 }}>📦 Распределение услуг</h3>
                <div className="activity_feed">
                    <div className="activity_item">
                        <div className="activity_icon" style={{ background: '#e6f7ff', color: '#1890ff' }}>🚚</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 800 }}>Транспортные накладные (ТТН)</div>
                            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Оформленные перевозки по РК</div>
                        </div>
                        <div style={{ fontWeight: 900, fontSize: 18 }}>{stats.counts.ttn}</div>
                    </div>
                    <div className="activity_item">
                        <div className="activity_icon" style={{ background: '#f6ffed', color: '#52c41a' }}>🌍</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 800 }}>Международные накладные (CMR)</div>
                            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Экспортно-импортные операции</div>
                        </div>
                        <div style={{ fontWeight: 900, fontSize: 18 }}>{stats.counts.smr}</div>
                    </div>
                    <div className="activity_item">
                        <div className="activity_icon" style={{ background: '#fff7e6', color: '#faad14' }}>📦</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 800 }}>Складские услуги</div>
                            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Хранение и обработка грузов</div>
                        </div>
                        <div style={{ fontWeight: 900, fontSize: 18 }}>{stats.counts.warehouse}</div>
                    </div>
                </div>
            </div>
        </div>

        <div className="content_wrapper glass_panel">
            <h3 style={{ marginBottom: 20 }}>🕒 Последняя активность</h3>
            <div className="activity_feed">
                {stats.recent.map(r => {
                    const isWarehouse = r.details && (typeof r.details === 'string' ? r.details.includes('"isWarehouse":true') : r.details.isWarehouse);
                    let targetUrl = `/acts/${r.id}`;
                    if (r.type === 'TTN' || (r.details && r.details.includes('"docType":"ttn"'))) targetUrl = `/requests/${r.id}`;
                    else if (r.type === 'SMR' || (r.details && r.details.includes('"docType":"smr"'))) targetUrl = `/smr/${r.id}`;
                    else if (isWarehouse) targetUrl = `/warehouse/${r.id}`;

                    return (
                        <Link key={r.id} to={targetUrl} className="activity_item" style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div className="activity_icon" style={{ background: '#f5f5f5' }}>
                                {r.type === 'TTN' ? '🚚' : r.type === 'SMR' ? '🗺️' : isWarehouse ? '📦' : '📄'}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {STATUS_MAP[r.type] || r.type} #{r.docNumber || 'б/н'}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                                    {r.company?.name || 'Компания не указана'}
                                </div>
                                <div style={{ marginTop: 4 }}>
                                    <span className="manager_badge">👨‍💻 {r.manager?.name || 'Система'}</span>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div className="badge" style={{ fontSize: 10, padding: '2px 8px' }}>
                                    {STATUS_MAP[r.status] || r.status}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                                    {new Date(r.createdAt).toLocaleDateString()}
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
            <Link to="/acts" className="btn btn--sm btn--ghost" style={{ width: '100%', marginTop: 16 }}>Смотреть все заявки</Link>
        </div>
      </div>

      <div className="content_wrapper glass_panel" style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 20 }}>👩‍💼 Эффективность менеджеров (по месяцам)</h3>
          <div className="table_scroll">
              <table className="table_fixed">
                  <thead>
                      <tr>
                          <th style={{ minWidth: 200 }}>Менеджер</th>
                          {stats.chartData.map(d => (
                              <th key={d.key} style={{ textAlign: 'center', fontSize: 11 }}>{d.label}</th>
                          ))}
                          <th style={{ textAlign: 'center', background: '#f9f9f9' }}>Итого</th>
                      </tr>
                  </thead>
                  <tbody>
                      {stats.managerMatrix.map(m => (
                          <tr key={m.id}>
                              <td>
                                  <div style={{ fontWeight: 800 }}>{m.name}</div>
                                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>{m.email}</div>
                              </td>
                              {m.months.map((mon, idx) => (
                                  <td key={idx} style={{ textAlign: 'center' }}>
                                      <div style={{ fontWeight: 800 }}>{mon.count} за <span style={{ fontSize: 10, color: 'var(--muted)' }}>докум.</span></div>
                                      <div style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>
                                          {mon.turnover > 0 ? formatCurrency(mon.turnover) : '—'}
                                      </div>
                                  </td>
                              ))}
                              <td style={{ textAlign: 'center', background: '#fcfcfc' }}>
                                  <div style={{ fontWeight: 900, color: 'var(--info)' }}>{m.totalCount}</div>
                                  <div style={{ fontSize: 12, fontWeight: 900 }}>{formatCurrency(m.totalTurnover)}</div>
                              </td>
                          </tr>
                      ))}
                      {stats.managerMatrix.length === 0 && (
                          <tr><td colSpan={stats.chartData.length + 2} className="muted" style={{ textAlign: 'center', padding: 20 }}>Активность менеджеров не зафиксирована</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
}
