import React, { useState, useEffect, useContext } from 'react';
import { Sparkles, Heart } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import './Home.css';

function Home({ isTopMods = false, isFavorites = false }) {
  const { favorites, toggleFavorite, selectedGame } = useContext(AppContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [mods, setMods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInitialMods = async () => {
      try {
        setLoading(true);
        if (isFavorites) {
          setMods(favorites);
          setLoading(false);
          return;
        }

        const endpoint = isTopMods 
          ? `/api/top-mods?game=${selectedGame.id || 'skyrimspecialedition'}` 
          : `/api/search?q=&game=${selectedGame.id || 'skyrimspecialedition'}`;
          
        const response = await fetch(endpoint);
        if (response.ok) {
          const data = await response.json();
          setMods(data.mods && data.mods.length > 0 ? data.mods : getMockMods());
        } else {
          setMods(getMockMods());
        }
      } catch (error) {
        console.error("Modlar yüklenemedi:", error);
        setMods(getMockMods());
      } finally {
        setLoading(false);
      }
    };

    fetchInitialMods();
  }, [isTopMods, isFavorites, selectedGame, favorites.length]); // Add favorites.length so it updates if we remove fav in fav view

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || isFavorites) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&game=${selectedGame.id || 'skyrimspecialedition'}`);
      if (response.ok) {
        const data = await response.json();
        setMods(data.mods || []);
      }
    } catch (error) {
      console.error("Arama hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
  };

  const getMockMods = () => [
    { mod_id: 1, name: "NPC Map Locations", author: "Bilinmiyor", summary: "See NPC and players on the map, with an optional minimap....", picture_url: "https://via.placeholder.com/400x200/1e293b/34d399?text=Map+Locations" },
    { mod_id: 2, name: "Skyrim Script Extender (SKSE64)", author: "SKSE Team", summary: "The Skyrim Script Extender (SKSE) is a tool used by many Skyrim mods that...", picture_url: "https://via.placeholder.com/400x200/1e293b/8b5cf6?text=SKSE" },
    { mod_id: 3, name: "FSMP - Faster HDT-SMP", author: "Bilinmiyor", summary: "Faster physics for capes, clothes, hair, etc!...", picture_url: "https://via.placeholder.com/400x200/1e293b/60a5fa?text=FSMP" },
    { mod_id: 4, name: "Immersive Armors", author: "Hothtrooper44", summary: "Immersive Armors seeks to drastically enhance the variety of armors in the world of Skyrim in a lore...", picture_url: "https://via.placeholder.com/400x200/1e293b/f87171?text=Immersive+Armors" }
  ];

  const getPageTitle = () => {
    if (isFavorites) return { icon: <Heart className="icon" size={28} color="#ef4444" />, title: ' Favori Modlarım', subtitle: 'Kaydettiğiniz tüm favori modlarınız.' };
    if (isTopMods) return { icon: <Heart className="icon" size={28} />, title: ' En Çok Sevilen Modlar', subtitle: 'Topluluğun en çok indirdiği ve beğendiği modlar.' };
    return { icon: <Sparkles className="icon" size={28} />, title: ' Yapay Zeka Arama Sonuçları', subtitle: 'Veritabanımızda 1000 mod taranarak en iyi sonuçlar listelendi.' };
  };

  const pageInfo = getPageTitle();

  return (
    <div className="home-container">
      {!isTopMods && !isFavorites && (
        <section className="hero-section">
          <div className="hero-content">
            <form className="search-box-wrapper" onSubmit={handleSearch}>
              <Sparkles className="ai-icon" size={24} />
              <input 
                type="text" 
                className="search-input"
                placeholder="Örn: FPS düşürmeden grafikleri çok daha gerçekçi yapan modlar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="search-btn">
                Akıllı Ara
              </button>
            </form>
            
            <div className="search-suggestions">
              <span className="suggestion-pill" onClick={() => handleSuggestionClick('RPG Savaş Yenilikleri')}>
                RPG Savaş Yenilikleri
              </span>
              <span className="suggestion-pill" onClick={() => handleSuggestionClick('Sistemi Yormayan Grafikler')}>
                Sistemi Yormayan Grafikler
              </span>
              <span className="suggestion-pill" onClick={() => handleSuggestionClick('Gerçekçi Hava Durumu')}>
                Gerçekçi Hava Durumu
              </span>
            </div>
          </div>
        </section>
      )}

      <section className="recommendations-section" style={{ paddingTop: (isTopMods || isFavorites) ? '4rem' : '2rem' }}>
        <div className="section-header">
          <h2>{pageInfo.icon}{pageInfo.title}</h2>
          <p>{pageInfo.subtitle}</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#8b5cf6' }}>
            <Sparkles size={40} className="ai-icon" />
            <p style={{ marginTop: '1rem' }}>Yapay zeka modları analiz ediyor...</p>
          </div>
        ) : mods.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            <p>Burada henüz bir şey yok.</p>
          </div>
        ) : (
          <div className="mod-grid">
            {mods.map((mod) => {
              const isFav = favorites.some(f => f.mod_id === mod.mod_id);
              return (
                <div key={mod.mod_id} className="mod-card">
                  <div className="mod-card-image-wrapper">
                    <img src={mod.picture_url || `https://via.placeholder.com/400x200/1e293b/a78bfa?text=${mod.name.replace(/ /g, '+')}`} alt={mod.name} className="mod-card-image" />
                    <div className="mod-card-image-overlay"></div>
                    
                    <button 
                      className="mod-fav-btn" 
                      onClick={() => toggleFavorite(mod)}
                      style={isFav ? { color: '#ef4444', background: 'rgba(0,0,0,0.7)' } : {}}
                    >
                      <Heart size={18} fill={isFav ? '#ef4444' : 'none'} />
                    </button>
                    
                    <div className="ai-match-badge">
                      %89 AI Eşleşmesi
                    </div>
                  </div>

                  <div className="mod-card-content">
                    <h3 className="mod-card-title" title={mod.name}>{mod.name}</h3>
                    <p className="mod-card-description">{mod.summary || 'Açıklama bulunmuyor.'}</p>
                    <div className="mod-card-footer" style={{ marginTop: 'auto', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                      <a 
                        href={`https://www.nexusmods.com/${mod.domain_name || 'skyrimspecialedition'}/mods/${mod.mod_id}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mod-card-link-btn"
                      >
                        Nexus'ta Gör
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default Home;
