import React, { useState, useEffect, useContext } from 'react';
import { Activity, Users, Settings, Database, RefreshCw } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import './Dashboard.css';

function Dashboard() {
  const { token } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('istatistikler');
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchStats = async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error('Veriler alınamadı');
      const data = await res.json();
      setStats(data);
      setLastUpdated(new Date().toLocaleTimeString('tr-TR'));
    } catch (err) {
      setStatsError(err.message);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'istatistikler') {
      fetchStats();
      const interval = setInterval(fetchStats, 60000); // 60 saniyede bir yenile
      return () => clearInterval(interval);
    }
  }, [activeTab, token]);

  const renderContent = () => {
    switch (activeTab) {
      case 'kullanicilar':
        return (
          <>
            <header className="dashboard-header">
              <h1>Kullanıcılar</h1>
            </header>
            <div className="tab-content" style={{ marginTop: '20px', padding: '20px', backgroundColor: 'var(--card-bg)', borderRadius: '12px' }}>
              <h2>Kullanıcı Yönetimi</h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>
                Burada sisteme kayıtlı kullanıcıları görüntüleyebilir, düzenleyebilir veya silebilirsiniz.
              </p>
            </div>
          </>
        );

      case 'modlar':
        return (
          <>
            <header className="dashboard-header">
              <h1>Mod Veritabanı</h1>
            </header>
            <div className="tab-content" style={{ marginTop: '20px', padding: '20px', backgroundColor: 'var(--card-bg)', borderRadius: '12px' }}>
              <h2>Mod Yönetimi</h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>
                Sisteme kayıtlı tüm modların onay süreçlerini ve güncellemelerini buradan kontrol edebilirsiniz.
              </p>
            </div>
          </>
        );

      case 'ayarlar':
        return (
          <>
            <header className="dashboard-header">
              <h1>Ayarlar</h1>
            </header>
            <div className="tab-content" style={{ marginTop: '20px', padding: '20px', backgroundColor: 'var(--card-bg)', borderRadius: '12px' }}>
              <h2>Sistem Ayarları</h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>
                Uygulama tercihlerini ve genel yapılandırma seçeneklerini buradan yönetebilirsiniz.
              </p>
            </div>
          </>
        );

      case 'istatistikler':
      default:
        return (
          <>
            <header className="dashboard-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <h1>Sistem İstatistikleri</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {lastUpdated && (
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Son güncelleme: {lastUpdated}
                  </span>
                )}
                <button
                  onClick={fetchStats}
                  disabled={statsLoading}
                  style={{
                    background: 'rgba(139,92,246,0.15)',
                    border: '1px solid rgba(139,92,246,0.3)',
                    color: '#a78bfa',
                    borderRadius: '8px',
                    padding: '0.4rem 0.8rem',
                    cursor: statsLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit'
                  }}
                >
                  <RefreshCw size={14} style={{ animation: statsLoading ? 'spin 1s linear infinite' : 'none' }} />
                  Yenile
                </button>
              </div>
            </header>

            {statsError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', color: '#fca5a5' }}>
                ⚠️ Veriler yüklenemedi: {statsError}
              </div>
            )}

            <div className="stats-grid">
              <div className="stat-card">
                <h3>Toplam Kullanıcı</h3>
                <p className="stat-value" style={statsLoading ? { color: '#334155' } : {}}>
                  {statsLoading ? '—' : (stats?.totalUsers?.toLocaleString('tr-TR') ?? '—')}
                </p>
              </div>
              <div className="stat-card">
                <h3>Toplam Mod</h3>
                <p className="stat-value" style={statsLoading ? { color: '#334155' } : {}}>
                  {statsLoading ? '—' : (stats?.totalMods?.toLocaleString('tr-TR') ?? '—')}
                </p>
              </div>
              <div className="stat-card">
                <h3>Bugün Yapılan Aramalar</h3>
                <p className="stat-value" style={statsLoading ? { color: '#334155' } : {}}>
                  {statsLoading ? '—' : (stats?.dailySearches?.toLocaleString('tr-TR') ?? '—')}
                </p>
              </div>
            </div>

            <section className="recent-activity">
              <h2>Son Aktiviteler (Son Eklenen 10 Mod)</h2>
              <div className="activity-list">
                {stats?.recentMods && stats.recentMods.length > 0 ? (
                  stats.recentMods.map((mod) => (
                    <div key={mod._id} className="activity-item" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem' }}>
                      {mod.picture_url ? (
                        <img 
                          src={mod.picture_url} 
                          alt={mod.name} 
                          style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} 
                        />
                      ) : (
                        <div style={{ width: '40px', height: '40px', borderRadius: '6px', backgroundColor: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa' }}>
                          <Database size={16} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 500, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {mod.name}
                        </p>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          Oyun: {mod.domain_name} | Yazar: {mod.author || 'Bilinmiyor'}
                        </span>
                      </div>
                      <span className="time" style={{ fontSize: '0.8rem', color: '#a78bfa', background: 'rgba(139,92,246,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                        Yeni Mod
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '1rem', color: '#64748b', textAlign: 'center' }}>
                    Yükleniyor veya eklenen mod bulunamadı...
                  </div>
                )}
              </div>
            </section>

            <style>{`
              @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
          </>
        );
    }
  };

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <h2>Yönetim Paneli</h2>
        </div>
        <ul className="sidebar-menu">
          <li className={activeTab === 'istatistikler' ? 'active' : ''} onClick={() => setActiveTab('istatistikler')}>
            <Activity size={20} /> İstatistikler
          </li>
          <li className={activeTab === 'kullanicilar' ? 'active' : ''} onClick={() => setActiveTab('kullanicilar')}>
            <Users size={20} /> Kullanıcılar
          </li>
          <li className={activeTab === 'modlar' ? 'active' : ''} onClick={() => setActiveTab('modlar')}>
            <Database size={20} /> Mod Veritabanı
          </li>
          <li className={activeTab === 'ayarlar' ? 'active' : ''} onClick={() => setActiveTab('ayarlar')}>
            <Settings size={20} /> Ayarlar
          </li>
        </ul>
      </aside>

      <main className="dashboard-main">
        {renderContent()}
      </main>
    </div>
  );
}

export default Dashboard;
