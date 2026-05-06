import React, { useState, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Gamepad2, ChevronDown, Sparkles, Heart, Search, User, ShieldAlert, LogOut } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import './Navbar.css';

const games = [
  { id: 'skyrimspecialedition', name: 'Skyrim Special Edition', color: 'from-blue-500 to-cyan-400' },
  { id: 'fallout4', name: 'Fallout 4', color: 'from-green-500 to-emerald-400' },
  { id: 'witcher3', name: 'The Witcher 3', color: 'from-red-500 to-orange-400' },
  { id: 'all', name: 'Hiçbiri (Karışık)', color: 'from-yellow-400 to-yellow-600' }
];

function Navbar() {
  const { user, favorites, selectedGame, setSelectedGame, setIsAuthModalOpen, logout } = useContext(AppContext);
  const [isGameMenuOpen, setIsGameMenuOpen] = useState(false);
  const location = useLocation();

  const selectedGameObject = games.find(g => g.id === selectedGame) || games[0];
  const [gameSearch, setGameSearch] = useState('');

  const filteredGames = gameSearch.trim() === ''
    ? games
    : games.filter(g => g.name.toLowerCase().includes(gameSearch.toLowerCase()));

  return (
    <nav className="premium-navbar">
      <div className="navbar-container">
        
        {/* Logo */}
        <Link to="/" className="nav-logo">
          <div className="logo-icon-wrapper">
            <Sparkles size={24} className="logo-icon" />
          </div>
          <span className="logo-text">Nex<span className="logo-highlight">Mod</span></span>
        </Link>

        {/* Center Navigation & Game Selector */}
        <div className="nav-center">
          
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
                placeholder="Oyunlar..."
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
              <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Keşfet</Link>
            </li>
            <li>
              <Link to="/top-mods" className={`nav-link ${location.pathname === '/top-mods' ? 'active' : ''}`}>Çok Sevilenler</Link>
            </li>
            <li>
              <Link to="/favorites" className={`nav-link ${location.pathname === '/favorites' ? 'active' : ''}`} style={{ ...(location.pathname === '/favorites' ? { color: '#ef4444' } : {}), display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                <Link to="/dashboard" className="nav-link admin-link">
                  <ShieldAlert size={16} /> Panel
                </Link>
              </li>
            )}
          </ul>
        </div>

        {/* Right Section (Profile) */}
        <div className="nav-right">
          {user ? (
            <div className="user-profile" style={{ position: 'relative', group: 'hover' }} onClick={logout} title="Çıkış Yap">
              <div className="avatar">
                <img src={`https://api.dicebear.com/6.x/avataaars/svg?seed=${user.avatarSeed || user.username}`} alt="User Avatar" />
              </div>
              <span className="username">{user.username}</span>
              <LogOut size={16} style={{ marginLeft: '0.5rem', color: '#ef4444' }} />
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

      </div>
    </nav>
  );
}

export default Navbar;
