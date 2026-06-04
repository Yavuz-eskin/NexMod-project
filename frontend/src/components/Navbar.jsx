import React, { useState, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Gamepad2, ChevronDown, Sparkles, Heart, Search, User, ShieldAlert, LogOut, Settings, Key, UserCog, Palette, Check, AlertCircle, Menu, X } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import './Navbar.css';

function Navbar() {
  const { user, favorites, selectedGame, setSelectedGame, setIsAuthModalOpen, logout, gamesList, token } = useContext(AppContext);
  const [isGameMenuOpen, setIsGameMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Settings Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newAvatarSeed, setNewAvatarSeed] = useState(user?.avatarSeed || '');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState(''); // 'success' or 'error'
  const [loading, setLoading] = useState(false);

  const location = useLocation();

  const selectedGameObject = gamesList.find(g => g.id === selectedGame) || gamesList[0] || { name: 'Yükleniyor...' };
  const [gameSearch, setGameSearch] = useState('');

  const filteredGames = gameSearch.trim() === ''
    ? gamesList
    : gamesList.filter(g => g.name.toLowerCase().includes(gameSearch.toLowerCase()));

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setStatusType('error');
      setStatusMessage('Lütfen tüm şifre alanlarını doldurun.');
      return;
    }
    if (newPassword.length < 6) {
      setStatusType('error');
      setStatusMessage('Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }

    setLoading(true);
    setStatusMessage('');
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Şifre değiştirilemedi.');

      setStatusType('success');
      setStatusMessage('Şifreniz başarıyla güncellendi!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setStatusType('error');
      setStatusMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAvatar = async () => {
    setLoading(true);
    setStatusMessage('');
    try {
      const res = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ avatarSeed: newAvatarSeed })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Profil güncellenemedi.');
      
      // Update local storage and context
      localStorage.setItem('token', data.token);
      localStorage.setItem('avatarSeed', data.avatarSeed);
      
      // Update local context object dynamically
      user.avatarSeed = data.avatarSeed;
      
      setStatusType('success');
      setStatusMessage('Avatar tohumu başarıyla kaydedildi! Sayfa yenileniyor...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      setStatusType('error');
      setStatusMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <nav className="premium-navbar">
      <div className="navbar-container">
        
        {/* Logo */}
        <Link to="/" className="nav-logo" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="logo-icon-wrapper">
            <Sparkles size={24} className="logo-icon" />
          </div>
          <span className="logo-text">Nex<span className="logo-highlight">Mod</span></span>
        </Link>

        {/* Center Navigation & Game Selector */}
        <div className={`nav-center ${isMobileMenuOpen ? 'show' : ''}`}>
          
          {/* Game Selector Dropdown */}
          <div 
            className="game-selector"
            onMouseEnter={() => setIsGameMenuOpen(true)}
            onMouseLeave={() => setIsGameMenuOpen(false)}
          >
            <div className="game-selector-trigger">
              <Gamepad2 size={18} className="game-icon" />
              <input 
                type="text"
                placeholder={selectedGame && selectedGame !== 'all' ? selectedGameObject.name : 'Oyunlar...'}
                value={gameSearch}
                onChange={(e) => {
                  setGameSearch(e.target.value);
                  setIsGameMenuOpen(true);
                }}
                onFocus={() => {
                  setIsGameMenuOpen(true);
                }}
                className="game-search-input"
              />
              <ChevronDown size={16} className={`chevron-icon ${isGameMenuOpen ? 'open' : ''}`} />
            </div>

            {/* Dropdown Menu */}
            <div className={`game-dropdown-menu ${isGameMenuOpen ? 'show' : ''}`}>
              <div className="dropdown-header">
                <span>Popüler Oyunlar</span>
              </div>
              <ul className="game-list">
                {filteredGames.length > 0 ? (
                  filteredGames.map(game => (
                    <li 
                      key={game.id} 
                      className={`game-item ${selectedGame === game.id ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedGame(game.id);
                        setGameSearch('');
                        setIsGameMenuOpen(false);
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <div className={`game-color-dot bg-gradient-to-r ${game.color}`}></div>
                      <span>{game.name}</span>
                    </li>
                  ))
                ) : (
                  <li className="game-item" style={{ pointerEvents: 'none', color: '#94a3b8' }}>
                    Sonuç bulunamadı.
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Navigation Links */}
          <ul className="nav-links">
            <li>
              <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>Keşfet</Link>
            </li>
            <li>
              <Link to="/top-mods" className={`nav-link ${location.pathname === '/top-mods' ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>Çok Sevilenler</Link>
            </li>
            <li>
              <Link to="/favorites" className={`nav-link ${location.pathname === '/favorites' ? 'active' : ''}`} style={{ ...(location.pathname === '/favorites' ? { color: '#ef4444' } : {}), display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => setIsMobileMenuOpen(false)}>
                <Heart size={16} color={location.pathname === '/favorites' ? '#ef4444' : 'currentColor'} /> Favorilerim
                {favorites.length > 0 && (
                  <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
                    {favorites.length}
                  </span>
                )}
              </Link>
            </li>
            {user && (
              <li>
                <Link to="/dashboard" className="nav-link admin-link" onClick={() => setIsMobileMenuOpen(false)}>
                  <ShieldAlert size={16} /> Panel
                </Link>
              </li>
            )}
          </ul>
        </div>

        {/* Right Section (Profile & Dropdown) */}
        <div className="nav-right" style={{ position: 'relative' }}>
          {user ? (
            <div 
              className="user-profile-wrapper"
              onMouseEnter={() => setIsProfileMenuOpen(true)}
              onMouseLeave={() => setIsProfileMenuOpen(false)}
              style={{ position: 'relative' }}
            >
              <div className="user-profile">
                <div className="avatar">
                  <img src={`https://api.dicebear.com/6.x/avataaars/svg?seed=${user.avatarSeed || user.username}`} alt="User Avatar" />
                </div>
                <span className="username">{user.username}</span>
                <ChevronDown size={14} style={{ color: '#94a3b8', marginLeft: '2px' }} />
              </div>

              {/* Profile Dropdown Menu */}
              <div 
                className={`game-dropdown-menu ${isProfileMenuOpen ? 'show' : ''}`} 
                style={{ 
                  right: 0, 
                  left: 'auto', 
                  width: '220px', 
                  transformOrigin: 'top right',
                  marginTop: '4px' 
                }}
              >
                <div className="dropdown-header" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                  <span>Hesap Yönetimi</span>
                </div>
                <ul className="game-list">
                  <li 
                    className="game-item" 
                    onClick={() => {
                      setIsSettingsModalOpen(true);
                      setIsProfileMenuOpen(false);
                      setStatusMessage('');
                    }}
                    style={{ fontSize: '0.9rem', gap: '0.75rem' }}
                  >
                    <Settings size={16} color="#a78bfa" />
                    <span>Ayarlar</span>
                  </li>
                  <li 
                    className="game-item" 
                    onClick={logout}
                    style={{ fontSize: '0.9rem', gap: '0.75rem', color: '#fca5a5' }}
                  >
                    <LogOut size={16} color="#ef4444" />
                    <span>Çıkış Yap</span>
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="user-profile" onClick={() => setIsAuthModalOpen(true)}>
              <div className="avatar" style={{ border: '2px dashed rgba(139, 92, 246, 0.5)' }}>
                <User size={20} style={{ margin: '6px', color: '#94a3b8' }} />
              </div>
              <span className="username" style={{ color: '#94a3b8' }}>Giriş Yap</span>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle Button */}
        <button 
          className="mobile-menu-toggle" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle navigation menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

      </div>

      {/* Account Settings Custom Modal */}
      {isSettingsModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem',
          fontFamily: "'Outfit', sans-serif"
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '520px',
            padding: '2.5rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            position: 'relative'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <UserCog size={24} color="#8b5cf6" /> Hesap Ayarları
              </h2>
              <button 
                onClick={() => setIsSettingsModalOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  color: '#94a3b8',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                ✕
              </button>
            </div>

            {/* Notification Messages */}
            {statusMessage && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: statusType === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: statusType === 'success' ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                color: statusType === 'success' ? '#4ade80' : '#fca5a5',
                padding: '1rem',
                borderRadius: '12px',
                fontSize: '0.9rem',
                marginBottom: '1.5rem',
                lineHeight: 1.4
              }}>
                {statusType === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
                <span>{statusMessage}</span>
              </div>
            )}

            {/* Personalized Avatar Customizer */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.75rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Palette size={18} color="#8b5cf6" /> Avatar Kişiselleştirme
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #8b5cf6', backgroundColor: '#1e293b' }}>
                  <img 
                    src={`https://api.dicebear.com/6.x/avataaars/svg?seed=${newAvatarSeed || user?.username}`} 
                    alt="Yeni Avatar" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <input 
                    type="text" 
                    placeholder="Rastgele kelime girin..."
                    value={newAvatarSeed}
                    onChange={(e) => setNewAvatarSeed(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(15, 23, 42, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px',
                      color: 'white',
                      padding: '0.6rem 0.8rem',
                      fontFamily: 'inherit',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button 
                    onClick={handleUpdateAvatar}
                    disabled={loading}
                    style={{
                      background: 'rgba(139, 92, 246, 0.15)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      color: '#c4b5fd',
                      padding: '0.4rem 1rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      marginTop: '0.5rem',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.25)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.15)'}
                  >
                    Avatarı Kaydet
                  </button>
                </div>
              </div>
            </div>

            {/* Change Password Form */}
            <form onSubmit={handleUpdatePassword}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Key size={18} color="#8b5cf6" /> Şifre Değiştir
              </h3>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Mevcut Şifre</label>
                <input 
                  type="password" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    color: 'white',
                    padding: '0.75rem 1rem',
                    fontFamily: 'inherit',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Yeni Şifre</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    color: 'white',
                    padding: '0.75rem 1rem',
                    fontFamily: 'inherit',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '0.8rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(124, 58, 237, 0.3)',
                  transition: 'all 0.2s',
                  fontFamily: 'inherit'
                }}
                onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
              >
                {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
              </button>
            </form>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
