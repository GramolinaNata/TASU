// import React, { useState, useEffect, useMemo } from 'react';
// import { api } from '../../shared/api/api';
// import { Link } from 'react-router-dom';
// import { 
//   LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
//   BarChart, Bar, Cell, PieChart, Pie, Legend, AreaChart, Area
// } from 'recharts';

// const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

// const STATUS_MAP = {
//   'Заявка': 'Новая заявка',
//   'Черновик': 'Черновик',
//   'В работе': 'В процессе',
//   'Завершено': 'Завершено',
//   'Аннулировано': 'Аннулировано',
//   'active': 'Действующий',
//   'canceled': 'Отменен',
//   'Act': 'Акт',
//   'act': 'Акт',
//   'TTN': 'ТТН',
//   'SMR': 'СМР',
//   'REQUEST': 'Заявка',
//   'ttn': 'ТТН',
//   'smr': 'СМР',
//   'draft': 'Черновик',
//   'canceled_req': 'Аннулировано'
// };

// const formatCurrency = (val) => {
//     return new Intl.NumberFormat('ru-KZ', { style: 'currency', currency: 'KZT', maximumFractionDigits: 0 }).format(val);
// };

// export default function AdminStatsPage() {
//   const [data, setData] = useState({
//     requests: [],
//     contracts: [],
//     companies: [],
//     users: []
//   });
//   const [isLoading, setIsLoading] = useState(true);

//   useEffect(() => {
//     const loadAllData = async () => {
//       try {
//         const [reqs, ctrs, comps, usrs] = await Promise.all([
//           api.requests.list(),
//           api.contracts.list(),
//           api.companies.list(),
//           api.users.list()
//         ]);
//         setData({
//           requests: Array.isArray(reqs) ? reqs : [],
//           contracts: Array.isArray(ctrs) ? ctrs : [],
//           companies: Array.isArray(comps) ? comps : [],
//           users: Array.isArray(usrs) ? usrs : []
//         });
//       } catch (err) {
//         console.error("Failed to load stats data", err);
//       } finally {
//         setIsLoading(false);
//       }
//     };
//     loadAllData();
//   }, []);

//   const stats = useMemo(() => {
//     const { requests, contracts, users } = data;
    
//     let totalRevenue = 0;
//     const monthlyData = {}; 
//     const managerStats = {}; 
//     const statusGroups = {};
//     const clientGroups = {};

//     requests.forEach(r => {
//         const date = new Date(r.createdAt);
//         const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
//         if (!monthlyData[monthKey]) monthlyData[monthKey] = { name: monthKey, turnover: 0, count: 0 };
//         monthlyData[monthKey].count += 1;

//         if (r.managerId) {
//             if (!managerStats[r.managerId]) managerStats[r.managerId] = {};
//             if (!managerStats[r.managerId][monthKey]) managerStats[r.managerId][monthKey] = { count: 0, turnover: 0 };
//             managerStats[r.managerId][monthKey].count += 1;
//         }

//         if (r.status !== 'Аннулировано' && r.status !== 'canceled') {
//             let itemDetails = {};
//             try {
//                 itemDetails = typeof r.details === 'string' ? JSON.parse(r.details) : (r.details || {});
//                 const sum = parseFloat(itemDetails.totalSum || 0);
//                 if (!isNaN(sum)) {
//                     totalRevenue += sum;
//                     monthlyData[monthKey].turnover += sum;
//                     if (r.managerId) managerStats[r.managerId][monthKey].turnover += sum;

//                     // Client stats
//                     const cName = itemDetails.customer?.companyName || itemDetails.customer?.fio || 'Не указан';
//                     if (!clientGroups[cName]) clientGroups[cName] = { name: cName, value: 0 };
//                     clientGroups[cName].value += sum;
//                 }
//             } catch(e) {}

//             // Status stats - use details for extended state
//             const isReady = !!itemDetails.readyForAccountant;
//             const isWarehouse = !!itemDetails.isWarehouse;
//             const isDone = isReady && !!itemDetails.snoIssued && !!itemDetails.avrSent;

//             const statusLabel = isDone ? 'Отработано' : (isReady ? 'В бухгалтерии' : (isWarehouse ? 'Склад' : 'Актив'));
//             statusGroups[statusLabel] = (statusGroups[statusLabel] || 0) + 1;
//         }
//     });

//     const counts = {
//         ttn: requests.filter(r => r.type === 'TTN' || (r.details && r.details.includes('"docType":"ttn"'))).length,
//         smr: requests.filter(r => r.type === 'SMR' || (r.details && r.details.includes('"docType":"smr"'))).length,
//         warehouse: requests.filter(r => {
//             try {
//                 const d = typeof r.details === 'string' ? JSON.parse(r.details) : r.details;
//                 return d?.isWarehouse;
//             } catch(e) { return false; }
//         }).length,
//         contracts: contracts.length
//     };

//     const recent = [...requests]
//         .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
//         .slice(0, 8);

//     const sortedMonths = Object.keys(monthlyData).sort();
//     const chartData = sortedMonths.map(m => ({
//         name: new Date(`${m}-01`).toLocaleDateString('ru-RU', { month: 'short' }),
//         revenue: monthlyData[m].turnover,
//         count: monthlyData[m].count
//     }));

//     const statusData = Object.entries(statusGroups).map(([name, value]) => ({ name, value }));
//     const topClients = Object.values(clientGroups).sort((a,b) => b.value - a.value).slice(0, 5);

//     const managerMatrix = users.map(u => {
//         const months = sortedMonths.slice(-6).map(m => ({
//             key: m,
//             ...(managerStats[u.id]?.[m] || { count: 0, turnover: 0 })
//         }));
//         const totalCount = months.reduce((acc, curr) => acc + curr.count, 0);
//         const totalTurnover = months.reduce((acc, curr) => acc + curr.turnover, 0);
//         return { ...u, months, totalCount, totalTurnover };
//     }).filter(m => m.totalCount > 0);

//     return { totalRevenue, counts, recent, chartData, managerMatrix, sortedMonths: sortedMonths.slice(-6), statusData, topClients };
//   }, [data]);

//   if (isLoading) return <div className="muted" style={{ padding: 40, textAlign: 'center' }}>Загрузка аналитики...</div>;

//   return (
//     <div className="admin_stats dashboard">
//       <div className="topbar">
//         <div>
//             <div className="crumbs">Администрирование / Аналитика</div>
//             <h1>Обзор системы</h1>
//         </div>
//       </div>

//       <div className="stats_grid" style={{ marginTop: 24 }}>
//         <div className="stat_card blue">
//             <div className="stat_label"><span>💰</span> Общий оборот</div>
//             <div className="stat_value">{formatCurrency(stats.totalRevenue)}</div>
//         </div>
//         <div className="stat_card green">
//             <div className="stat_label"><span>📝</span> Всего документов</div>
//             <div className="stat_value">{data.requests.length}</div>
//         </div>
//         <div className="stat_card orange">
//             <div className="stat_label"><span>🤝</span> Компаний в базе</div>
//             <div className="stat_value">{data.companies.length}</div>
//         </div>
//         <div className="stat_card red">
//             <div className="stat_label"><span>📜</span> Договоров</div>
//             <div className="stat_value">{stats.counts.contracts}</div>
//         </div>
//       </div>

//       {/* Advanced Charts Section */}
//       <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24, marginTop: 24 }}>
//         <div className="card glass_panel" style={{ padding: 24 }}>
//           <h3 style={{ marginBottom: 20 }}>📈 Динамика выручки</h3>
//           <div style={{ width: '100%', height: 300 }}>
//             <ResponsiveContainer>
//               <AreaChart data={stats.chartData}>
//                 <defs>
//                   <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
//                     <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
//                     <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
//                   </linearGradient>
//                 </defs>
//                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
//                 <XAxis dataKey="name" stroke="var(--text-muted)" />
//                 <YAxis stroke="var(--text-muted)" tickFormatter={(v) => `${v/1000}k`} />
//                 <Tooltip 
//                   formatter={(v) => formatCurrency(v)} 
//                   contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 8 }}
//                 />
//                 <Area type="monotone" dataKey="revenue" name="Выручка" stroke="#8884d8" fillOpacity={1} fill="url(#colorRev)" />
//               </AreaChart>
//             </ResponsiveContainer>
//           </div>
//         </div>

//         <div className="card glass_panel" style={{ padding: 24 }}>
//           <h3 style={{ marginBottom: 20 }}>📊 Статусы документов</h3>
//           <div style={{ width: '100%', height: 300 }}>
//             <ResponsiveContainer>
//               <PieChart>
//                 <Pie
//                   data={stats.statusData}
//                   cx="50%"
//                   cy="50%"
//                   innerRadius={60}
//                   outerRadius={80}
//                   paddingAngle={5}
//                   dataKey="value"
//                 >
//                   {stats.statusData.map((entry, index) => (
//                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
//                   ))}
//                 </Pie>
//                 <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 8 }} />
//                 <Legend verticalAlign="bottom" height={36}/>
//               </PieChart>
//             </ResponsiveContainer>
//           </div>
//         </div>
//       </div>

//       <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, marginTop: 24 }}>
//         <div className="card glass_panel" style={{ padding: 24 }}>
//           <h3 style={{ marginBottom: 20 }}>🏆 Топ клиентов по объему</h3>
//           <div style={{ width: '100%', height: 350 }}>
//             <ResponsiveContainer>
//               <BarChart data={stats.topClients} layout="vertical">
//                 <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--line)" />
//                 <XAxis type="number" hide />
//                 <YAxis dataKey="name" type="category" width={150} stroke="var(--text)" fontSize={11} />
//                 <Tooltip 
//                   formatter={(v) => formatCurrency(v)}
//                   contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 8 }}
//                  />
//                 <Bar dataKey="value" name="Оборот" radius={[0, 4, 4, 0]}>
//                   {stats.topClients.map((entry, index) => (
//                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
//                   ))}
//                 </Bar>
//               </BarChart>
//             </ResponsiveContainer>
//           </div>
//         </div>

//         <div className="content_wrapper glass_panel">
//             <h3 style={{ marginBottom: 20 }}>🕒 Последняя активность</h3>
//             <div className="activity_feed">
//                 {stats.recent.map(r => {
//                     const isWarehouse = r.details && (typeof r.details === 'string' ? r.details.includes('"isWarehouse":true') : r.details.isWarehouse);
//                     let targetUrl = `/acts/${r.id}`;
//                     if (r.type === 'TTN' || (r.details && r.details.includes('"docType":"ttn"'))) targetUrl = `/requests/${r.id}`;
//                     else if (r.type === 'SMR' || (r.details && r.details.includes('"docType":"smr"'))) targetUrl = `/smr/${r.id}`;
//                     else if (isWarehouse) targetUrl = `/warehouse/${r.id}`;

//                     return (
//                         <Link key={r.id} to={targetUrl} className="activity_item" style={{ textDecoration: 'none', color: 'inherit' }}>
//                             <div className="activity_icon" style={{ background: '#f5f5f5' }}>
//                                 {r.type === 'TTN' ? '🚚' : r.type === 'SMR' ? '🗺️' : isWarehouse ? '📦' : '📄'}
//                             </div>
//                             <div style={{ flex: 1 }}>
//                                 <div style={{ fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
//                                     {STATUS_MAP[r.type] || r.type} #{r.docNumber || 'б/н'}
//                                 </div>
//                                 <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
//                                     {r.company?.name || 'Компания не указана'}
//                                 </div>
//                                 <div style={{ marginTop: 4 }}>
//                                     <span className="manager_badge">👨‍💻 {r.manager?.name || 'Система'}</span>
//                                 </div>
//                             </div>
//                             <div style={{ textAlign: 'right' }}>
//                                 <div className="badge" style={{ fontSize: 10, padding: '2px 8px' }}>
//                                     {STATUS_MAP[r.status] || r.status}
//                                 </div>
//                                 <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
//                                     {new Date(r.createdAt).toLocaleDateString()}
//                                 </div>
//                             </div>
//                         </Link>
//                     );
//                 })}
//             </div>
//             <Link to="/acts" className="btn btn--sm btn--ghost" style={{ width: '100%', marginTop: 16 }}>Смотреть все заявки</Link>
//         </div>
//       </div>

//       <div className="content_wrapper glass_panel" style={{ marginTop: 24, padding: 24 }}>
//           <h3 style={{ marginBottom: 20 }}>👩‍💼 Эффективность менеджеров (последние 6 месяцев)</h3>
//           <div className="table_scroll">
//               <table className="table_fixed">
//                   <thead>
//                       <tr>
//                           <th style={{ minWidth: 200 }}>Менеджер</th>
//                           {stats.sortedMonths.map(m => (
//                               <th key={m} style={{ textAlign: 'center', fontSize: 11 }}>
//                                 {new Date(`${m}-01`).toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' })}
//                               </th>
//                           ))}
//                           <th style={{ textAlign: 'center' }}>Итого</th>
//                       </tr>
//                   </thead>
//                   <tbody>
//                       {stats.managerMatrix.map(m => (
//                           <tr key={m.id}>
//                               <td>
//                                   <div style={{ fontWeight: 800 }}>{m.name}</div>
//                                   <div style={{ fontSize: 10, color: 'var(--muted)' }}>{m.email}</div>
//                               </td>
//                               {m.months.map((mon, idx) => (
//                                   <td key={idx} style={{ textAlign: 'center' }}>
//                                       <div style={{ fontWeight: 800 }}>{mon.count} <span style={{ fontSize: 10, color: 'var(--muted)' }}>док.</span></div>
//                                       <div style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>
//                                           {mon.turnover > 0 ? formatCurrency(mon.turnover) : '—'}
//                                       </div>
//                                   </td>
//                               ))}
//                               <td style={{ textAlign: 'center' }}>
//                                   <div style={{ fontWeight: 900, color: 'var(--info)' }}>{m.totalCount}</div>
//                                   <div style={{ fontSize: 12, fontWeight: 900 }}>{formatCurrency(m.totalTurnover)}</div>
//                               </td>
//                           </tr>
//                       ))}
//                       {stats.managerMatrix.length === 0 && (
//                           <tr><td colSpan={stats.sortedMonths.length + 2} className="muted" style={{ textAlign: 'center', padding: 20 }}>Активность менеджеров не зафиксирована</td></tr>
//                       )}
//                   </tbody>
//               </table>
//           </div>
//       </div>
//     </div>
//   );
// }



import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../shared/api/api';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend, AreaChart, Area
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

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

// Безопасный парсинг details
const parseDetails = (raw) => {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return {}; }
};

// Извлечение суммы заявки (приоритет: totalSum поле → details.totalSum)
const getRequestSum = (r) => {
  const fromField = parseFloat(r.totalSum);
  if (!isNaN(fromField) && fromField > 0) return fromField;
  const d = parseDetails(r.details);
  const fromDetails = parseFloat(d.totalSum || 0);
  return isNaN(fromDetails) ? 0 : fromDetails;
};

export default function AdminStatsPage() {
  const [data, setData] = useState({
    requests: [],
    contracts: [],
    companies: [],
    users: []
  });
  const [expensesSummary, setExpensesSummary] = useState({
    totalAmount: 0, count: 0, byCategory: [], byCompany: []
  });
  const [isLoading, setIsLoading] = useState(true);

  // 🆕 ТЗ v2: фильтры
  const [filterCompanyId, setFilterCompanyId] = useState('');
  const [filterMonth, setFilterMonth] = useState(''); // '' = все месяцы, иначе 'YYYY-MM'
  const [filterPaid, setFilterPaid] = useState('all');     // 'all' | 'paid' | 'unpaid'
  const [showDeferred, setShowDeferred] = useState(false); // 🆕 показать только отложенные

  // Загрузка справочников и заявок
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
        console.error('Failed to load stats data', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadAllData();
  }, []);

  // 🆕 ТЗ v2: Расчёт расходов (загружается с фильтром по компании)
  useEffect(() => {
    const loadSummary = async () => {
      try {
        const params = {};
        if (filterCompanyId) params.companyId = filterCompanyId;
        const summary = await api.expenses.summary(params);
        setExpensesSummary(summary || { totalAmount: 0, count: 0, byCategory: [], byCompany: [] });
      } catch (err) {
        console.error('Failed to load expenses summary', err);
      }
    };
    loadSummary();
  }, [filterCompanyId]);

  // 🆕 ТЗ v2: Применяем фильтры к заявкам перед расчётом статистики
  const filteredRequests = useMemo(() => {
    let arr = data.requests;
    if (filterCompanyId) arr = arr.filter(r => r.companyId === filterCompanyId);
    if (filterMonth) {
      arr = arr.filter(r => {
        const d = new Date(r.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return key === filterMonth;
      });
    }
    if (filterPaid === 'paid') arr = arr.filter(r => r.isPaid === true);
    else if (filterPaid === 'unpaid') arr = arr.filter(r => r.isPaid !== true);
    if (showDeferred) {
      arr = arr.filter(r => parseDetails(r.details).isDeferredForAccountant === true);
    }
    return arr;
  }, [data.requests, filterCompanyId, filterMonth, filterPaid, showDeferred]);

  // Список доступных месяцев для выпадашки (из всех заявок, свежие сверху)
  const availableMonths = useMemo(() => {
    const set = new Set();
    (data.requests || []).forEach(r => {
      if (!r.createdAt) return;
      const d = new Date(r.createdAt);
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    });
    return Array.from(set).sort().reverse();
  }, [data.requests]);

  // 🆕 ТЗ v2: Количество отложенных (всегда из полного списка, для бейджа)
  const deferredCount = useMemo(() => {
    let arr = data.requests;
    if (filterCompanyId) arr = arr.filter(r => r.companyId === filterCompanyId);
    return arr.filter(r => parseDetails(r.details).isDeferredForAccountant === true).length;
  }, [data.requests, filterCompanyId]);

  // 🆕 ТЗ v2: Количество оплаченных и неоплаченных для бейджей
  const paidCount = useMemo(() => {
    let arr = data.requests;
    if (filterCompanyId) arr = arr.filter(r => r.companyId === filterCompanyId);
    return arr.filter(r => r.isPaid === true).length;
  }, [data.requests, filterCompanyId]);

  const unpaidCount = useMemo(() => {
    let arr = data.requests;
    if (filterCompanyId) arr = arr.filter(r => r.companyId === filterCompanyId);
    return arr.filter(r => r.isPaid !== true).length;
  }, [data.requests, filterCompanyId]);

  const stats = useMemo(() => {
    const requests = filteredRequests;
    const { contracts, users } = data;

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
        const itemDetails = parseDetails(r.details);
        const sum = getRequestSum(r);

        if (sum > 0) {
          totalRevenue += sum;
          monthlyData[monthKey].turnover += sum;
          if (r.managerId) managerStats[r.managerId][monthKey].turnover += sum;

          const cName = itemDetails.customer?.companyName || itemDetails.customer?.fio || 'Не указан';
          if (!clientGroups[cName]) clientGroups[cName] = { name: cName, value: 0 };
          clientGroups[cName].value += sum;
        }

        const isReady = !!itemDetails.readyForAccountant;
        const isWarehouse = !!itemDetails.isWarehouse;
        const isDone = !!r.isFullyCompleted;
        const isDeferred = !!itemDetails.isDeferredForAccountant;

        let statusLabel;
        if (isDone) statusLabel = 'Завершено';
        else if (isDeferred) statusLabel = 'Отложено';
        else if (isReady) statusLabel = 'В бухгалтерии';
        else if (isWarehouse) statusLabel = 'Склад';
        else statusLabel = 'Актив';

        statusGroups[statusLabel] = (statusGroups[statusLabel] || 0) + 1;
      }
    });

    const counts = {
      ttn: requests.filter(r => r.type === 'TTN' || (r.details && r.details.includes('"docType":"ttn"'))).length,
      smr: requests.filter(r => r.type === 'SMR' || (r.details && r.details.includes('"docType":"smr"'))).length,
      warehouse: requests.filter(r => parseDetails(r.details).isWarehouse).length,
      contracts: contracts.length
    };

    const recent = [...requests]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8);

    const sortedMonths = [...Object.keys(monthlyData)].sort();
    const chartData = sortedMonths.map(m => ({
      name: new Date(`${m}-01`).toLocaleDateString('ru-RU', { month: 'short' }),
      revenue: monthlyData[m].turnover,
      count: monthlyData[m].count
    }));

    const statusData = Object.entries(statusGroups).map(([name, value]) => ({ name, value }));
    const topClients = [...Object.values(clientGroups)].sort((a, b) => b.value - a.value).slice(0, 5);

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
  }, [filteredRequests, data.contracts, data.users]);

  // 🆕 ТЗ v2: Маржа = выручка − расходы
  const margin = stats.totalRevenue - (expensesSummary.totalAmount || 0);
  const marginPercent = stats.totalRevenue > 0
    ? ((margin / stats.totalRevenue) * 100).toFixed(1)
    : 0;

  if (isLoading) return <div className="muted" style={{ padding: 40, textAlign: 'center' }}>Загрузка аналитики...</div>;

  return (
    <div className="admin_stats dashboard">
      <div className="topbar">
        <div>
          <div className="crumbs">Администрирование / Аналитика</div>
          <h1>Обзор системы</h1>
        </div>
      </div>

      {/* 🆕 ТЗ v2: Панель фильтров */}
      {/* 🆕 ТЗ v2: Панель фильтров */}
      <div
        className="card glass_panel filters_panel"
        style={{
          padding: '14px 18px',
          marginTop: 24,
          display: 'flex',
          gap: 20,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {/* Организация */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 240 }}>
          <label style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            🏢 Организация
          </label>
          <select
            value={filterCompanyId}
            onChange={(e) => setFilterCompanyId(e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: 10,
              border: '1px solid var(--line)',
              background: filterCompanyId ? 'rgba(0,136,254,0.06)' : 'var(--card)',
              color: 'var(--text)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              outline: 'none',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#8884d8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; }}
          >
            <option value="">Все организации</option>
            {data.companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Месяц */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 180 }}>
          <label style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            📅 Месяц
          </label>
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: 10,
              border: '1px solid var(--line)',
              background: filterMonth ? 'rgba(0,136,254,0.06)' : 'var(--card)',
              color: 'var(--text)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              outline: 'none',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#8884d8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; }}
          >
            <option value="">Все месяцы</option>
            {availableMonths.map(m => (
              <option key={m} value={m}>
                {new Date(`${m}-01`).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>
        </div>

        {/* Разделитель */}
        <div style={{ width: 1, height: 40, background: 'var(--line)' }} />

        {/* Оплата — сегмент-контрол */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            💳 Оплата
          </label>
          <div
            style={{
              display: 'inline-flex',
              borderRadius: 10,
              border: '1px solid var(--line)',
              padding: 3,
              background: 'var(--card)',
              gap: 2,
            }}
          >
            {[
              { key: 'all', label: 'Все', count: null },
              { key: 'paid', label: '✓ Оплачено', count: paidCount, color: '#22c55e' },
              { key: 'unpaid', label: '✕ Не оплачено', count: unpaidCount, color: '#ef4444' },
            ].map(opt => {
              const active = filterPaid === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setFilterPaid(opt.key)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    border: 'none',
                    background: active ? (opt.color || '#8884d8') : 'transparent',
                    color: active ? '#fff' : 'var(--text)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: active ? '0 2px 6px rgba(0,0,0,0.12)' : 'none',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  {opt.label}
                  {opt.count !== null && (
                    <span style={{
                      marginLeft: 6,
                      padding: '1px 7px',
                      borderRadius: 10,
                      background: active ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.06)',
                      fontSize: 11,
                      fontWeight: 700,
                    }}>
                      {opt.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Разделитель */}
        <div style={{ width: 1, height: 40, background: 'var(--line)' }} />

        {/* Отложенные */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            ⏱️ Отложенные
          </label>
          <button
            onClick={() => setShowDeferred(v => !v)}
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              border: `1px solid ${showDeferred ? '#f59e0b' : 'var(--line)'}`,
              background: showDeferred ? '#f59e0b' : (deferredCount > 0 ? 'rgba(245,158,11,0.08)' : 'var(--card)'),
              color: showDeferred ? '#fff' : (deferredCount > 0 ? '#f59e0b' : 'var(--text)'),
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: showDeferred ? '0 2px 6px rgba(245,158,11,0.3)' : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              if (!showDeferred) e.currentTarget.style.borderColor = '#f59e0b';
            }}
            onMouseLeave={(e) => {
              if (!showDeferred) e.currentTarget.style.borderColor = 'var(--line)';
            }}
          >
            <span>🕐 Отложено</span>
            <span style={{
              padding: '1px 8px',
              borderRadius: 10,
              background: showDeferred ? 'rgba(255,255,255,0.25)' : 'rgba(245,158,11,0.15)',
              color: showDeferred ? '#fff' : '#f59e0b',
              fontSize: 11,
              fontWeight: 800,
            }}>
              {deferredCount}
            </span>
          </button>
        </div>

        {/* Сброс — справа */}
        {(filterCompanyId || filterMonth || filterPaid !== 'all' || showDeferred) && (
          <button
            onClick={() => { setFilterCompanyId(''); setFilterMonth(''); setFilterPaid('all'); setShowDeferred(false); }}
            style={{
              marginLeft: 'auto',
              padding: '8px 14px',
              borderRadius: 10,
              border: '1px solid var(--line)',
              background: 'transparent',
              color: 'var(--muted)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.06)';
              e.currentTarget.style.borderColor = '#ef4444';
              e.currentTarget.style.color = '#ef4444';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'var(--line)';
              e.currentTarget.style.color = 'var(--muted)';
            }}
          >
            ✕ Сбросить
          </button>
        )}
      </div>

      {/* Карточки KPI */}
      <div className="stats_grid" style={{ marginTop: 24 }}>
        <div className="stat_card blue">
          <div className="stat_label"><span>💰</span> Выручка</div>
          <div className="stat_value">{formatCurrency(stats.totalRevenue)}</div>
        </div>
        <div className="stat_card red">
          <div className="stat_label"><span>💸</span> Расходы</div>
          <div className="stat_value">{formatCurrency(expensesSummary.totalAmount || 0)}</div>
        </div>
        <div className="stat_card green">
          <div className="stat_label"><span>📊</span> Маржа ({marginPercent}%)</div>
          <div className="stat_value" style={{ color: margin >= 0 ? 'var(--success, #22c55e)' : 'var(--danger, #ef4444)' }}>
            {formatCurrency(margin)}
          </div>
        </div>
        <div className="stat_card orange">
          <div className="stat_label"><span>📝</span> Документов</div>
          <div className="stat_value">{filteredRequests.length}</div>
        </div>
      </div>

      {/* Графики */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24, marginTop: 24 }}>
        <div className="card glass_panel" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 20 }}>📈 Динамика выручки</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <AreaChart data={stats.chartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" />
                <YAxis stroke="var(--text-muted)" tickFormatter={(v) => `${v / 1000}k`} />
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
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 🆕 ТЗ v2: Расчёт расходов */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
        <div className="card glass_panel" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 20 }}>💸 Расходы по категориям</h3>
          {expensesSummary.byCategory && expensesSummary.byCategory.length > 0 ? (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={expensesSummary.byCategory}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="category" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip
                    formatter={(v) => formatCurrency(v)}
                    contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 8 }}
                  />
                  <Bar dataKey="amount" name="Сумма" radius={[4, 4, 0, 0]}>
                    {expensesSummary.byCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="muted" style={{ padding: 40, textAlign: 'center' }}>Нет расходов в выбранном периоде</div>
          )}
        </div>

        <div className="card glass_panel" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 20 }}>📋 Сводка расходов</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ color: 'var(--muted)' }}>Всего записей</span>
              <strong>{expensesSummary.count || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ color: 'var(--muted)' }}>Общая сумма</span>
              <strong style={{ color: 'var(--danger, #ef4444)' }}>{formatCurrency(expensesSummary.totalAmount || 0)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ color: 'var(--muted)' }}>Категорий</span>
              <strong>{expensesSummary.byCategory?.length || 0}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
              <span style={{ color: 'var(--muted)' }}>Маржа (выручка − расходы)</span>
              <strong style={{ color: margin >= 0 ? 'var(--success, #22c55e)' : 'var(--danger, #ef4444)' }}>
                {formatCurrency(margin)} ({marginPercent}%)
              </strong>
            </div>
          </div>

          {expensesSummary.byCategory && expensesSummary.byCategory.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Топ категории</div>
              {[...expensesSummary.byCategory]
  .sort((a, b) => b.amount - a.amount)
  .slice(0, 5)
                .map((c, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                    <span>{c.category}</span>
                    <span style={{ fontWeight: 700 }}>{formatCurrency(c.amount)}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Топ клиентов и активность */}
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
              const det = parseDetails(r.details);
              const isWarehouse = !!det.isWarehouse;
              let targetUrl = `/acts/${r.id}`;
              if (r.type === 'TTN' || det.docType === 'ttn') targetUrl = `/requests/${r.id}`;
              else if (r.type === 'SMR' || det.docType === 'smr') targetUrl = `/smr/${r.id}`;
              else if (isWarehouse) targetUrl = `/warehouse/${r.id}`;

              return (
                <Link key={r.id} to={targetUrl} className="activity_item" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="activity_icon" style={{ background: '#f5f5f5' }}>
                    {r.type === 'TTN' ? '🚚' : r.type === 'SMR' ? '🗺️' : isWarehouse ? '📦' : '📄'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {STATUS_MAP[r.type] || r.type} #{r.docNumber || 'б/н'}
                      {r.isPaid && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(34,197,94,0.15)', color: 'var(--success, #22c55e)' }}>✓ Оплачено</span>}
                      {r.isFullyCompleted && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'rgba(0,136,254,0.15)', color: 'var(--info, #0088FE)' }}>Завершено</span>}
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
            {stats.recent.length === 0 && (
              <div className="muted" style={{ padding: 20, textAlign: 'center' }}>Нет данных по выбранным фильтрам</div>
            )}
          </div>
          <Link to="/acts" className="btn btn--sm btn--ghost" style={{ width: '100%', marginTop: 16 }}>Смотреть все заявки</Link>
        </div>
      </div>

      {/* Эффективность менеджеров */}
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