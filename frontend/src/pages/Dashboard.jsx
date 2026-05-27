import React, { useState, useEffect, useContext } from 'react';
import { Activity, Database, Settings, RefreshCw } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import './Dashboard.css';

function Dashboard() {
  const { token, user } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('istatistikler');
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [crawlerTriggering, setCrawlerTriggering] = useState(false);

  const handleRunCrawler = async () => {
    setCrawlerTriggering(true);
    try {
      const res = await fetch('/api/admin/run-crawler', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'İşlem başarısız');
      alert(data.message);
      fetchStats();
    } catch (err) {
      alert(`Hata: ${err.message}`);
    } finally {
      setCrawlerTriggering(false);
    }
  };

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
      setLoadingState();
    }
  };

  const setLoadingState = () => {
    // Küçük bir gecikme ekleyerek UX'i iyileştirelim
    setTimeout(() => {
      setStatsLoading(false);
    }, 300);
  };

  useEffect(() => {
    if (activeTab === 'istatistikler' || activeTab === 'modlar') {
      fetchStats();
      const interval = setInterval(fetchStats, 60000); // 60 saniyede bir yenile
      return () => clearInterval(interval);
    }
  }, [activeTab, token]);

  const getGameInfo = (domain) => {
    const games = {
      'skyrimspecialedition': { name: 'Skyrim Special Edition', color: '#6366f1', icon: '❄️' },
      'fallout4': { name: 'Fallout 4', color: '#eab308', icon: '☢️' },
      'falloutnewvegas': { name: 'Fallout New Vegas', color: '#f97316', icon: '🎲' },
      'oblivion': { name: 'Oblivion', color: '#ef4444', icon: '⚔️' },
      'stardewvalley': { name: 'Stardew Valley', color: '#22c55e', icon: '🌾' },
      'cyberpunk2077': { name: 'Cyberpunk 2077', color: '#eab308', icon: '⚡' },
      'baldursgate3': { name: "Baldur's Gate 3", color: '#ec4899', icon: '🐉' },
      'starfield': { name: 'Starfield', color: '#3b82f6', icon: '🚀' },
      'witcher3': { name: 'The Witcher 3', color: '#b91c1c', icon: '🐺' },
      'skyrim': { name: 'Skyrim Classic', color: '#818cf8', icon: '⚔️' },
      'valheim': { name: 'Valheim', color: '#f59e0b', icon: '⛵' },
      'subnautica': { name: 'Subnautica', color: '#06b6d4', icon: '🌊' }
    };
    return games[domain] || { name: domain.charAt(0).toUpperCase() + domain.slice(1), color: '#a855f7', icon: '🎮' };
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'modlar':
        return (
          <>
            <header className="dashboard-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <h1>Mod Veritabanı Dağılımı</h1>
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

            <div style={{ marginTop: '20px', padding: '24px', backgroundColor: 'rgba(30,41,59,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
              <h2 style={{ marginBottom: '1.75rem', fontSize: '1.25rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Database size={20} color="#8b5cf6" /> Veritabanındaki Oyunların Mod Sayıları
              </h2>
              
              {statsLoading ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#8b5cf6' }}>
                  <RefreshCw size={40} style={{ animation: 'spin 1.5s linear infinite' }} />
                  <p style={{ marginTop: '1rem', color: '#94a3b8' }}>Veritabanı taranıyor...</p>
                </div>
              ) : !stats?.gameStats || stats.gameStats.length === 0 ? (
                <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>Veritabanında henüz mod dağılım verisi bulunmuyor.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                  {stats.gameStats.map((gameStat) => {
                    const gameInfo = getGameInfo(gameStat._id);
                    const percentage = stats.totalMods ? Math.max(1, Math.round((gameStat.count / stats.totalMods) * 100)) : 0;
                    return (
                      <div key={gameStat._id} style={{
                        background: 'rgba(15, 23, 42, 0.4)',
                        border: `1px solid rgba(255, 255, 255, 0.03)`,
                        borderLeft: `4px solid ${gameInfo.color}`,
                        borderRadius: '12px',
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'default'
                      }}
                      className="game-stat-card"
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-5px) scale(1.02)';
                        e.currentTarget.style.boxShadow = `0 10px 20px -10px ${gameInfo.color}30`;
                        e.currentTarget.style.borderColor = `${gameInfo.color}40`;
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.03)';
                      }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '2rem', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.15))' }}>{gameInfo.icon}</span>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={gameInfo.name}>
                              {gameInfo.name}
                            </h3>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>domain: {gameStat._id}</span>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '0.25rem' }}>
                          <span style={{ fontSize: '1.5rem', fontWeight: 700, color: gameInfo.color }}>
                            {gameStat.count.toLocaleString('tr-TR')}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 500 }}>
                            %{percentage} pay
                          </span>
                        </div>
                        
                        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '99px', overflow: 'hidden' }}>
                          <div style={{ width: `${percentage}%`, height: '100%', background: gameInfo.color, borderRadius: '99px', transition: 'width 0.5s ease-out' }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        );

      case 'admin':
        if (!user || user.role !== 'admin') {
          return (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '60vh',
              textAlign: 'center',
              padding: '2rem'
            }}>
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '24px',
                padding: '3rem',
                maxWidth: '500px',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
              }}>
                <span style={{ fontSize: '4rem', display: 'block', marginBottom: '1.5rem' }}>🛡️</span>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem' }}>Erişim Engellendi</h1>
                <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: 1.6, margin: 0 }}>
                  Bu sekme yalnızca yönetici (admin) yetkilerine sahip hesaplar tarafından görüntülenebilir. Yetkili bir hesapla giriş yaptığınızdan emin olun.
                </p>
              </div>
            </div>
          );
        }
        return (
          <>
            <header className="dashboard-header">
              <h1>Sistem Kontrol & Ayarlar</h1>
            </header>
            
            {/* Canlı Sistem Durum Paneli */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '20px' }}>
              <div style={{
                background: 'rgba(30, 41, 59, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '16px',
                padding: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backdropFilter: 'blur(10px)'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Veritabanı Durumu</h3>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', display: 'block', marginTop: '0.25rem' }}>MongoDB Atlas</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(34, 197, 94, 0.1)', padding: '0.4rem 0.8rem', borderRadius: '99px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                  <span style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', display: 'inline-block' }}></span>
                  <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 600 }}>Aktif</span>
                </div>
              </div>

              <div style={{
                background: 'rgba(30, 41, 59, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '16px',
                padding: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backdropFilter: 'blur(10px)'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>NexusMods API</h3>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', display: 'block', marginTop: '0.25rem' }}>Bağlantı Durumu</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(34, 197, 94, 0.1)', padding: '0.4rem 0.8rem', borderRadius: '99px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                  <span style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', display: 'inline-block' }}></span>
                  <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 600 }}>Hazır</span>
                </div>
              </div>

              <div style={{
                background: 'rgba(30, 41, 59, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '16px',
                padding: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backdropFilter: 'blur(10px)'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.85rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>Yapay Zeka Durumu</h3>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', display: 'block', marginTop: '0.25rem' }}>Gemini AI (1.5)</span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  background: stats?.geminiStatus ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                  padding: '0.4rem 0.8rem', 
                  borderRadius: '99px', 
                  border: stats?.geminiStatus ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)' 
                }}>
                  <span style={{ width: '8px', height: '8px', background: stats?.geminiStatus ? '#22c55e' : '#ef4444', borderRadius: '50%', display: 'inline-block' }}></span>
                  <span style={{ fontSize: '0.75rem', color: stats?.geminiStatus ? '#4ade80' : '#fca5a5', fontWeight: 600 }}>
                    {stats?.geminiStatus ? 'Aktif' : 'Çevrimdışı'}
                  </span>
                </div>
              </div>
            </div>

            {/* Manuel Robot Yönetim Widget'ı */}
            <div style={{ marginTop: '24px', padding: '24px', backgroundColor: 'rgba(30,41,59,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                <div style={{ flex: 1, minWidth: '250px' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    🤖 NexusMods Tarayıcı Robot Kontrolü
                  </h2>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.5rem', margin: 0, lineHeight: 1.5 }}>
                    Her gece 03:00'te çalışan otomatik tarama botunu şu anda manuel olarak anında başlatabilirsiniz. 
                    Robot arka planda yeni modları arayacak ve veritabanınıza ekleyecektir.
                  </p>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Robot Durumu:</span>
                    <span style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: stats?.isCrawlerRunning ? '#fbbf24' : '#34d399',
                      background: stats?.isCrawlerRunning ? 'rgba(251,191,36,0.1)' : 'rgba(52,211,153,0.1)',
                      border: stats?.isCrawlerRunning ? '1px solid rgba(251,191,36,0.2)' : '1px solid rgba(52,211,153,0.2)',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '99px'
                    }}>
                      {stats?.isCrawlerRunning ? 'Çalışıyor ⏳' : 'Boşta ✅'}
                    </span>
                  </div>
                  
                  <button
                    onClick={handleRunCrawler}
                    disabled={stats?.isCrawlerRunning || crawlerTriggering}
                    style={{
                      background: stats?.isCrawlerRunning ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                      color: stats?.isCrawlerRunning ? '#64748b' : 'white',
                      border: 'none',
                      padding: '0.8rem 1.5rem',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: (stats?.isCrawlerRunning || crawlerTriggering) ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: stats?.isCrawlerRunning ? 'none' : '0 4px 15px rgba(124, 58, 237, 0.3)',
                      fontFamily: 'inherit',
                      fontSize: '0.9rem'
                    }}
                  >
                    {crawlerTriggering ? 'Tetikleniyor...' : stats?.isCrawlerRunning ? 'Robot Çalışıyor...' : 'Robotu Manuel Başlat'}
                  </button>
                </div>
              </div>
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
                <h3>Toplam Kayıtlı Mod</h3>
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
              <div className="stat-card">
                <h3>Kayıtlı Oyun Çeşidi</h3>
                <p className="stat-value" style={statsLoading ? { color: '#334155' } : {}}>
                  {statsLoading ? '—' : (stats?.gameStats?.length ?? '—')}
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
          <li className={activeTab === 'modlar' ? 'active' : ''} onClick={() => setActiveTab('modlar')}>
            <Database size={20} /> Mod Veritabanı
          </li>
          {user && user.role === 'admin' && (
            <li className={activeTab === 'admin' ? 'active' : ''} onClick={() => setActiveTab('admin')}>
              <Settings size={20} /> Admin
            </li>
          )}
        </ul>
      </aside>

      <main className="dashboard-main">
        {renderContent()}
      </main>
    </div>
  );
}

export default Dashboard;
