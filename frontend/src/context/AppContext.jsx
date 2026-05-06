import React, { createContext, useState, useEffect } from 'react';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [favorites, setFavorites] = useState([]);
  const [selectedGame, setSelectedGame] = useState('all');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [gamesList, setGamesList] = useState([{ id: 'all', name: 'Hiçbiri (Karışık)', color: 'from-gray-400 to-gray-600' }]);

  useEffect(() => {
    fetch('/api/games')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const colors = [
            'from-blue-500 to-cyan-400', 'from-green-500 to-emerald-400', 
            'from-purple-500 to-fuchsia-600', 'from-red-500 to-orange-400',
            'from-amber-500 to-yellow-600', 'from-indigo-500 to-blue-600',
            'from-pink-500 to-rose-400', 'from-teal-400 to-emerald-500'
          ];
          const fetchedGames = data.map((g, index) => ({
            id: g.domain_name,
            name: g.name,
            color: colors[index % colors.length]
          }));
          setGamesList([{ id: 'all', name: 'Hiçbiri (Karışık)', color: 'from-gray-400 to-gray-600' }, ...fetchedGames]);
        }
      })
      .catch(err => console.error("Oyunlar yüklenemedi:", err));
  }, []);

  useEffect(() => {
    if (token) {
      // Decode the JWT or just assume login is valid until fetch fails
      const storedUsername = localStorage.getItem('username');
      if (storedUsername) {
        setUser({ username: storedUsername });
      }

      fetch('/api/user/favorites', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (!res.ok) throw new Error('Token geçersiz');
        return res.json();
      })
      .then(data => {
        setFavorites(data.favorites || []);
      })
      .catch(() => {
        logout();
      });
    }
  }, [token]);

  const login = async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Giriş başarısız');
    
    setToken(data.token);
    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
    setUser({ username: data.username, avatarSeed: data.avatarSeed });
    setFavorites(data.favorites || []);
    setIsAuthModalOpen(false);
  };

  const register = async (username, password) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Kayıt başarısız');
    
    setToken(data.token);
    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
    setUser({ username: data.username, avatarSeed: data.avatarSeed });
    setFavorites(data.favorites || []);
    setIsAuthModalOpen(false);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setFavorites([]);
    localStorage.removeItem('token');
    localStorage.removeItem('username');
  };

  const toggleFavorite = async (mod) => {
    if (!token) {
      setIsAuthModalOpen(true);
      return;
    }
    
    const isFav = favorites.some(f => f.mod_id === mod.mod_id);
    const newFavs = isFav 
      ? favorites.filter(f => f.mod_id !== mod.mod_id)
      : [...favorites, mod];
      
    setFavorites(newFavs);

    try {
      await fetch('/api/user/favorites', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ modData: mod })
      });
    } catch (e) {
      console.error('Favori kaydedilemedi', e);
    }
  };

  return (
    <AppContext.Provider value={{
      user, token, favorites, selectedGame, setSelectedGame,
      isAuthModalOpen, setIsAuthModalOpen, gamesList,
      login, register, logout, toggleFavorite
    }}>
      {children}
    </AppContext.Provider>
  );
};
