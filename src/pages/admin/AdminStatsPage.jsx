import React, { useState, useEffect } from 'react';
import { api } from '../../shared/api/api';

export default function AdminStatsPage() {
  const [stats, setStats] = useState({
    totalRequests: 0,
    byStatus: {},
    byType: {},
    recentActivity: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const requests = await api.requests.list();
        
        const byStatus = {};
        const byType = {};
        
        requests.forEach(r => {
          byStatus[r.status] = (byStatus[r.status] || 0) + 1;
          byType[r.type] = (byType[r.type] || 0) + 1;
        });

        setStats({
          totalRequests: requests.length,
          byStatus,
          byType,
          recentActivity: requests.slice(0, 5)
        });
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  if (isLoading) return <div>Загрузка статистики...</div>;

  return (
    <div className="admin_stats">
      <h1>Общая статистика</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Всего заявок</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{stats.totalRequests}</div>
        </div>
        
        {Object.entries(stats.byType).map(([type, count]) => (
          <div key={type} className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{type}</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{count}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2.5rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3>Статусы</h3>
          <div style={{ marginTop: '1rem' }}>
            {Object.entries(stats.byStatus).map(([status, count]) => (
              <div key={status} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                <span>{status}</span>
                <span style={{ fontWeight: 'bold' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <h3>Последние действия</h3>
          <div style={{ marginTop: '1rem' }}>
            {stats.recentActivity.map(req => (
              <div key={req.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{req.type} #{req.docNumber || 'б/н'}</strong>
                  <span style={{ color: 'var(--text-muted)' }}>{new Date(req.createdAt).toLocaleDateString()}</span>
                </div>
                <div style={{ color: 'var(--text-muted)' }}>{req.company?.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
