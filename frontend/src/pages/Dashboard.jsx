import React from 'react';
import { Activity, Users, Settings, Database } from 'lucide-react';
import './Dashboard.css';

function Dashboard() {
  return (
    <div className="dashboard-layout">
      {/* Dashboard Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <h2>Yönetim Paneli</h2>
        </div>
        <ul className="sidebar-menu">
          <li className="active"><Activity size={20} /> İstatistikler</li>
          <li><Users size={20} /> Kullanıcılar</li>
          <li><Database size={20} /> Mod Veritabanı</li>
          <li><Settings size={20} /> Ayarlar</li>
        </ul>
      </aside>

      {/* Dashboard Main Content */}
      <main className="dashboard-main">
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
      </main>
    </div>
  );
}

export default Dashboard;
