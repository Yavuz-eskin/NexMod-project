import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2, ChevronDown, Sparkles, Heart, Search, User, ShieldAlert } from 'lucide-react';
import './Navbar.css';

const games = [
  { id: 'skyrim', name: 'Skyrim Special Edition', color: 'from-blue-500 to-cyan-400' },
  { id: 'fallout4', name: 'Fallout 4', color: 'from-green-500 to-emerald-400' },
  { id: 'witcher3', name: 'The Witcher 3', color: 'from-red-500 to-orange-400' },
  { id: 'cyberpunk', name: 'Cyberpunk 2077', color: 'from-yellow-400 to-yellow-600' }
];

function Navbar() {
  const [isGameMenuOpen, setIsGameMenuOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState(games[0]);

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
              <span className="selected-game-name">{selectedGame.name}</span>
              <ChevronDown size={16} className={`chevron-icon ${isGameMenuOpen ? 'open' : ''}`} />
            </div>

            {/* Dropdown Menu */}
            <div className={`game-dropdown-menu ${isGameMenuOpen ? 'show' : ''}`}>
              <div className="dropdown-header">
                <span>Popüler Oyunlar</span>
              </div>
              <ul className="game-list">
                {games.map(game => (
                  <li 
                    key={game.id} 
                    className={`game-item ${selectedGame.id === game.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedGame(game);
                      setIsGameMenuOpen(false);
                    }}
                  >
                    <div className={`game-color-dot bg-gradient-to-r ${game.color}`}></div>
                    <span>{game.name}</span>
                  </li>
                ))}
              </ul>
              <div className="dropdown-footer">
                <Search size={14} />
                <span>Tüm oyunlarda ara...</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <ul className="nav-links">
            <li>
              <Link to="/" className="nav-link active">Keşfet</Link>
            </li>
            <li>
              <Link to="/" className="nav-link">Çok Sevilenler</Link>
            </li>
            <li>
              <Link to="/dashboard" className="nav-link admin-link">
                <ShieldAlert size={16} /> Panel
              </Link>
            </li>
          </ul>
        </div>

        {/* Right Section (Profile & Favorites) */}
        <div className="nav-right">
          <button className="icon-btn favorites-btn">
            <Heart size={20} />
            <span className="badge">3</span>
          </button>
          
          <div className="user-profile">
            <div className="avatar">
              <img src="https://api.dicebear.com/6.x/avataaars/svg?seed=Felix" alt="User Avatar" />
            </div>
            <span className="username">Kullanıcı</span>
          </div>
        </div>

      </div>
    </nav>
  );
}

export default Navbar;
