import React, { useState, useEffect } from 'react';
import { Activity, Users, Settings, Database } from 'lucide-react';
import './Dashboard.css';

function Dashboard() {
  const [activeTab, setActiveTab] = useState('istatistikler');

  useEffect(() => {
    // Sayfa render olduğunda body arka plan rengini dashboard'un koyu mavisine eşitle
    const originalBodyBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = '#0f172a';
    
    // Bileşenden çıkıldığında orijinal haline geri çevir
    return () => {
      document.body.style.backgroundColor = originalBodyBg;
    };
  }, []);

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
              <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>Burada sisteme kayıtlı kullanıcıları görüntüleyebilir, düzenleyebilir veya silebilirsiniz.</p>
              {/* Gelecekte buraya kullanıcı veri tablosu eklenebilir */}
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
              <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>Sisteme kayıtlı tüm modların onay süreçlerini ve güncellemelerini buradan kontrol edebilirsiniz.</p>
              {/* Gelecekte buraya mod listesi/tablosu eklenebilir */}
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
              <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>Uygulama tercihlerini ve genel yapılandırma seçeneklerini buradan yönetebilirsiniz.</p>
              {/* Gelecekte form alanları vb. eklenebilir */}
            </div>
          </>
        );
      case 'istatistikler':
      default:
        return (
          <>
            <header className="dashboard-header">
              <h1>Sistem İstatistikleri</h1>
            </header>

            <div className="stats-grid">
              <div className="stat-card">
                <h3>Toplam Kullanıcı</h3>
                <p className="stat-value">1,248</p>
              </div>
              <div className="stat-card">
                <h3>Toplam Mod</h3>
                <p className="stat-value">5,432</p>
              </div>
              <div className="stat-card">
                <h3>Bugün Yapılan Aramalar</h3>
                <p className="stat-value">843</p>
              </div>
            </div>

            {/* Son Aktiviteler */}
            <section className="recent-activity">
              <h2>Son Aktiviteler</h2>
              <div className="activity-list">
                <div className="activity-item">
                  <span className="time">10:45</span>
                  <p>Yeni bir mod sisteme eklendi: "Skyrim HD Textures"</p>
                </div>
                <div className="activity-item">
                  <span className="time">09:12</span>
                  <p>Kullanıcı "Ahmet" kayıt oldu.</p>
                </div>
              </div>
            </section>
          </>
        );
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Dashboard Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <h2>Yönetim Paneli</h2>
        </div>
        <ul className="sidebar-menu">
          <li 
            className={activeTab === 'istatistikler' ? 'active' : ''} 
            onClick={() => setActiveTab('istatistikler')}
            style={{ cursor: 'pointer' }}
          >
            <Activity size={20} /> İstatistikler
          </li>
          <li 
            className={activeTab === 'kullanicilar' ? 'active' : ''} 
            onClick={() => setActiveTab('kullanicilar')}
            style={{ cursor: 'pointer' }}
          >
            <Users size={20} /> Kullanıcılar
          </li>
          <li 
            className={activeTab === 'modlar' ? 'active' : ''} 
            onClick={() => setActiveTab('modlar')}
            style={{ cursor: 'pointer' }}
          >
            <Database size={20} /> Mod Veritabanı
          </li>
          <li 
            className={activeTab === 'ayarlar' ? 'active' : ''} 
            onClick={() => setActiveTab('ayarlar')}
            style={{ cursor: 'pointer' }}
          >
            <Settings size={20} /> Ayarlar
          </li>
        </ul>
      </aside>

      {/* Dashboard Main Content */}
      <main className="dashboard-main">
        {renderContent()}
      </main>
    </div>
  );
}

export default Dashboard;
