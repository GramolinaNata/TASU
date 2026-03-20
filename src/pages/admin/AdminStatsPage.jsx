import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../shared/api/api';
import { Link } from 'react-router-dom';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, PieChart, Pie, Legend, AreaChart, Area
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const STATUS_MAP = {
  'Заявка': 'Новая заявка',
  'Черновик': 'Черновик',
  'В работе': 'В процессе',
  'Завершено': 'Завершено',
  'Аннулировано': 'Аннулировано',
  'active': 'Действующий',
  'canceled': 'Отменен',
  'Act': 'Акт',
  'act': 'Акт',
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
    
    let totalRevenue = 0;
    const monthlyData = {}; 
    const managerStats = {}; 
    const statusGroups = {};
    const clientGroups = {};

    requests.forEach(r => {
        const date = new Date(r.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) monthlyData[monthKey] = { name: monthKey, turnover: 0, count: 0 };
        monthlyData[monthKey].count += 1;

        if (r.managerId) {
            if (!managerStats[r.managerId]) managerStats[r.managerId] = {};
            if (!managerStats[r.managerId][monthKey]) managerStats[r.managerId][monthKey] = { count: 0, turnover: 0 };
            managerStats[r.managerId][monthKey].count += 1;
        }

        if (r.status !== 'Аннулировано' && r.status !== 'canceled') {
            let itemDetails = {};
            try {
                itemDetails = typeof r.details === 'string' ? JSON.parse(r.details) : (r.details || {});
                const sum = parseFloat(itemDetails.totalSum || 0);
                if (!isNaN(sum)) {
                    totalRevenue += sum;
                    monthlyData[monthKey].turnover += sum;
                    if (r.managerId) managerStats[r.managerId][monthKey].turnover += sum;

                    // Client stats
                    const cName = itemDetails.customer?.companyName || itemDetails.customer?.fio || 'Не указан';
                    if (!clientGroups[cName]) clientGroups[cName] = { name: cName, value: 0 };
                    clientGroups[cName].value += sum;
                }
            } catch(e) {}

            // Status stats - use details for extended state
            const isReady = !!itemDetails.readyForAccountant;
            const isWarehouse = !!itemDetails.isWarehouse;
            const isDone = isReady && !!itemDetails.snoIssued && !!itemDetails.avrSent;

            const statusLabel = isDone ? 'Отработано' : (isReady ? 'В бухгалтерии' : (isWarehouse ? 'Склад' : 'Актив'));
            statusGroups[statusLabel] = (statusGroups[statusLabel] || 0) + 1;
        }
    });

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

    const recent = [...requests]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 8);

    const sortedMonths = Object.keys(monthlyData).sort();
    const chartData = sortedMonths.map(m => ({
        name: new Date(`${m}-01`).toLocaleDateString('ru-RU', { month: 'short' }),
        revenue: monthlyData[m].turnover,
        count: monthlyData[m].count
    }));

    const statusData = Object.entries(statusGroups).map(([name, value]) => ({ name, value }));
    const topClients = Object.values(clientGroups).sort((a,b) => b.value - a.value).slice(0, 5);

    const managerMatrix = users.map(u => {
        const months = sortedMonths.slice(-6).map(m => ({
            key: m,
            ...(managerStats[u.id]?.[m] || { count: 0, turnover: 0 })
        }));
        const totalCount = months.reduce((acc, curr) => acc + curr.count, 0);
        const totalTurnover = months.reduce((acc, curr) => acc + curr.turnover, 0);
        return { ...u, months, totalCount, totalTurnover };
    }).filter(m => m.totalCount > 0);

    return { totalRevenue, counts, recent, chartData, managerMatrix, sortedMonths: sortedMonths.slice(-6), statusData, topClients };
  }, [data]);

  if (isLoading) return <div className="muted" style={{ padding: 40, textAlign: 'center' }}>Загрузка аналитики...</div>;

  return (
    <div className="admin_stats dashboard">
      <div className="topbar">
        <div>
            <div className="crumbs">Администрирование / Аналитика</div>
            <h1>Обзор системы</h1>
        </div>
      </div>

      <div className="stats_grid" style={{ marginTop: 24 }}>
        <div className="stat_card blue">
            <div className="stat_label"><span>💰</span> Общий оборот</div>
            <div className="stat_value">{formatCurrency(stats.totalRevenue)}</div>
        </div>
        <div className="stat_card green">
            <div className="stat_label"><span>📝</span> Всего документов</div>
            <div className="stat_value">{data.requests.length}</div>
        </div>
        <div className="stat_card orange">
            <div className="stat_label"><span>🤝</span> Компаний в базе</div>
            <div className="stat_value">{data.companies.length}</div>
        </div>
        <div className="stat_card red">
            <div className="stat_label"><span>📜</span> Договоров</div>
            <div className="stat_value">{stats.counts.contracts}</div>
        </div>
      </div>

      {/* Advanced Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24, marginTop: 24 }}>
        <div className="card glass_panel" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 20 }}>📈 Динамика выручки</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <AreaChart data={stats.chartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" tickFormatter={(v) => `${v/1000}k`} />
                <Tooltip 
                  formatter={(v) => formatCurrency(v)} 
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 8 }}
                />
                <Area type="monotone" dataKey="revenue" name="Выручка" stroke="#8884d8" fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card glass_panel" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 20 }}>📊 Статусы документов</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={stats.statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 8 }} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, marginTop: 24 }}>
        <div className="card glass_panel" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 20 }}>🏆 Топ клиентов по объему</h3>
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <BarChart data={stats.topClients} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--line)" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={150} stroke="var(--text)" fontSize={11} />
                <Tooltip 
                  formatter={(v) => formatCurrency(v)}
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 8 }}
                 />
                <Bar dataKey="value" name="Оборот" radius={[0, 4, 4, 0]}>
                  {stats.topClients.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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

      <div className="content_wrapper glass_panel" style={{ marginTop: 24, padding: 24 }}>
          <h3 style={{ marginBottom: 20 }}>👩‍💼 Эффективность менеджеров (последние 6 месяцев)</h3>
          <div className="table_scroll">
              <table className="table_fixed">
                  <thead>
                      <tr>
                          <th style={{ minWidth: 200 }}>Менеджер</th>
                          {stats.sortedMonths.map(m => (
                              <th key={m} style={{ textAlign: 'center', fontSize: 11 }}>
                                {new Date(`${m}-01`).toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' })}
                              </th>
                          ))}
                          <th style={{ textAlign: 'center' }}>Итого</th>
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
                                      <div style={{ fontWeight: 800 }}>{mon.count} <span style={{ fontSize: 10, color: 'var(--muted)' }}>док.</span></div>
                                      <div style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>
                                          {mon.turnover > 0 ? formatCurrency(mon.turnover) : '—'}
                                      </div>
                                  </td>
                              ))}
                              <td style={{ textAlign: 'center' }}>
                                  <div style={{ fontWeight: 900, color: 'var(--info)' }}>{m.totalCount}</div>
                                  <div style={{ fontSize: 12, fontWeight: 900 }}>{formatCurrency(m.totalTurnover)}</div>
                              </td>
                          </tr>
                      ))}
                      {stats.managerMatrix.length === 0 && (
                          <tr><td colSpan={stats.sortedMonths.length + 2} className="muted" style={{ textAlign: 'center', padding: 20 }}>Активность менеджеров не зафиксирована</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
}
