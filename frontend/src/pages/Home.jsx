import React, { useState, useEffect, useContext } from 'react';
import { Sparkles, Heart, ChevronDown } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import './Home.css';

function Home({ isTopMods = false, isFavorites = false }) {
  const { favorites, toggleFavorite, selectedGame, gamesList } = useContext(AppContext);

  const getGameName = (domainName) => {
    const found = gamesList?.find(g => g.id === domainName);
    if (found) return found.name;
    if (!domainName) return 'Karışık';
    const cleanMap = {
      skyrimspecialedition: 'Skyrim Special Edition',
      fallout4: 'Fallout 4',
      falloutnewvegas: 'Fallout New Vegas',
      stardewvalley: 'Stardew Valley',
      cyberpunk2077: 'Cyberpunk 2077',
      baldursgate3: "Baldur's Gate 3",
      oblivion: 'Oblivion'
    };
    return cleanMap[domainName] || domainName.charAt(0).toUpperCase() + domainName.slice(1);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [mods, setMods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(12);
  const [aiMetadata, setAiMetadata] = useState(null);
  const [aiQuery, setAiQuery] = useState('');

  useEffect(() => {
    const fetchInitialMods = async () => {
      try {
        setLoading(true);
        setAiMetadata(null);
        setAiQuery('');
        if (isFavorites) {
          setMods(favorites);
          setLoading(false);
          return;
        }

        const gameParam = selectedGame === 'all' ? '' : selectedGame;
        const endpoint = isTopMods 
          ? `/api/top-mods?game=${gameParam}` 
          : `/api/search?q=&game=${gameParam}`;
          
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
    // Sayfa veya oyun değiştiğinde gösterilecek mod sayısını sıfırla
    setVisibleCount(12);
  }, [isTopMods, isFavorites, selectedGame, favorites.length]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || isFavorites) return;

    setLoading(true);
    try {
      const gameParam = selectedGame === 'all' ? '' : selectedGame;
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&game=${gameParam}`);
      if (response.ok) {
        const data = await response.json();
        setMods(data.mods || []);
        setAiMetadata(data.aiMetadata || null);
        setAiQuery(data.aiQuery || '');
        setVisibleCount(12); // Aramadan sonra da gösterim sayısını sıfırla
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

  const loadMore = () => {
    setVisibleCount(prev => prev + 12);
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
    return { icon: <Sparkles className="icon" size={28} />, title: ' Yapay Zeka Arama Sonuçları', subtitle: 'Veritabanımızda taranan binlerce mod arasından en iyi sonuçlar listelendi.' };
  };

  const calculateMatchPercentage = (mod, queryText, aiKeywords) => {
    const combinedText = `${mod.name} ${mod.summary || ''} ${mod.description || ''}`.toLowerCase();
    const searchTerms = `${queryText} ${aiKeywords || ''}`.toLowerCase().split(/[\s,]+/).filter(t => t.length > 2);
    if (searchTerms.length === 0) return 85;
    let matchedCount = 0;
    searchTerms.forEach(term => {
      if (combinedText.includes(term)) {
        matchedCount++;
      }
    });
    if (matchedCount === 0) return 74;
    const ratio = matchedCount / searchTerms.length;
    const percentage = Math.round(75 + (ratio * 23));
    return Math.min(percentage, 99);
  };

  const pageInfo = getPageTitle();

  // Modları yapay zeka eşleşme yüzdesine göre sırala (Büyükten küçüğe)
  const sortedMods = React.useMemo(() => {
    if (!searchQuery.trim()) return mods;
    return [...mods].sort((a, b) => {
      const scoreA = calculateMatchPercentage(a, searchQuery, aiQuery);
      const scoreB = calculateMatchPercentage(b, searchQuery, aiQuery);
      return scoreB - scoreA;
    });
  }, [mods, searchQuery, aiQuery]);

  const visibleMods = sortedMods.slice(0, visibleCount);
  const hasMore = visibleCount < mods.length;

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
          <p>{pageInfo.subtitle} {mods.length > 0 && <span style={{color: '#8b5cf6', fontSize: '0.9rem', marginLeft: '10px'}}>(Toplam {mods.length} mod)</span>}</p>
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
          <>
            {aiMetadata && (
              <div className="ai-analiz-box" style={{
                background: 'rgba(139, 92, 246, 0.03)',
                border: '1px solid rgba(139, 92, 246, 0.15)',
                borderRadius: '16px',
                padding: '1.5rem',
                marginBottom: '2rem',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-50px',
                  right: '-50px',
                  width: '150px',
                  height: '150px',
                  background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
                  filter: 'blur(20px)',
                  pointerEvents: 'none'
                }}></div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: '0 0 15px rgba(139, 92, 246, 0.3)'
                  }}>
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#c4b5fd', fontWeight: 600, display: 'block' }}>Yapay Zeka Analiz Yorumu</span>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f8fafc', fontWeight: 700 }}>{aiMetadata.detectedIntent || 'Akıllı Arama'}</h3>
                  </div>
                </div>

                <p style={{ margin: 0, color: '#cbd5e1', lineHeight: 1.6, fontSize: '0.95rem' }}>
                  {aiMetadata.aiResponse}
                </p>

                <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', marginRight: '4px' }}>Konsept Odakları:</span>
                  {aiMetadata.detectedGame && aiMetadata.detectedGame !== 'all' && (
                    <span style={{ fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.15)', padding: '0.2rem 0.6rem', borderRadius: '99px', fontWeight: 500 }}>
                      🎮 {aiMetadata.detectedGame === 'skyrimspecialedition' ? 'Skyrim SE' : aiMetadata.detectedGame === 'fallout4' ? 'Fallout 4' : aiMetadata.detectedGame}
                    </span>
                  )}
                  {aiMetadata.sortBy !== 'default' && (
                    <span style={{ fontSize: '0.75rem', background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.15)', padding: '0.2rem 0.6rem', borderRadius: '99px', fontWeight: 500 }}>
                      ⚡ {aiMetadata.sortBy === 'downloads' ? 'En Popülerler' : 'En Yeniler'}
                    </span>
                  )}
                  {aiQuery && aiQuery.split(' ').slice(0, 8).map((kw, i) => (
                    <span key={i} style={{ fontSize: '0.72rem', background: 'rgba(167, 139, 250, 0.08)', color: '#c4b5fd', border: '1px solid rgba(167, 139, 250, 0.12)', padding: '0.2rem 0.6rem', borderRadius: '99px' }}>
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mod-grid">
              {visibleMods.map((mod) => {
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
                      
                      <div className="ai-match-badge game-badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#c4b5fd', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
                        🎮 {getGameName(mod.domain_name)}
                      </div>
                    </div>

                    <div className="mod-card-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <h3 className="mod-card-title" title={mod.name}>{mod.name}</h3>
                      <p className="mod-card-description">{mod.summary || 'Açıklama bulunmuyor.'}</p>
                      
                      {mod.fixMods && mod.fixMods.length > 0 && (
                        <div className="mod-fix-list" style={{
                          marginTop: '0.75rem',
                          padding: '0.6rem 0.8rem',
                          background: 'rgba(239, 68, 68, 0.04)',
                          border: '1px solid rgba(239, 68, 68, 0.15)',
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem'
                        }}>
                          <span style={{ fontSize: '0.72rem', color: '#fca5a5', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            🔧 Uyumlu Yama & Fix Modları:
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {mod.fixMods.map(fix => (
                              <a 
                                key={fix.mod_id}
                                href={`https://www.nexusmods.com/${fix.domain_name}/mods/${fix.mod_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: '0.76rem', color: '#f87171', textDecoration: 'none', transition: 'color 0.2s', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                onMouseOver={(e) => e.target.style.color = '#ef4444'}
                                onMouseOut={(e) => e.target.style.color = '#f87171'}
                              >
                                • {fix.name}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

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
            
            {hasMore && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
                <button 
                  onClick={loadMore}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'transparent',
                    border: '1px solid rgba(139, 92, 246, 0.5)',
                    color: '#c4b5fd',
                    padding: '0.75rem 2rem',
                    borderRadius: '99px',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = 'rgba(139, 92, 246, 0.1)';
                    e.target.style.borderColor = '#8b5cf6';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = 'transparent';
                    e.target.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                  }}
                >
                  <ChevronDown size={20} />
                  Daha Fazla Mod Göster
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default Home;
