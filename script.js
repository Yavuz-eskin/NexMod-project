document.addEventListener("DOMContentLoaded", () => {
    const searchBtn = document.getElementById("search-btn");
    const inputField = document.getElementById("ai-search-input");
    const suggestions = document.querySelectorAll(".suggestion");
    const overlay = document.getElementById("loading-overlay");
    const container = document.getElementById("mod-container");
    const loadMoreBtn = document.getElementById("load-more-btn");
    const gameSearchInput = document.getElementById("game-search-input");
    const gameSelectValue = document.getElementById("game-select-value");
    const gameListDropdown = document.getElementById("game-list-dropdown");
    const navDiscover = document.getElementById("nav-discover");
    const navTop = document.getElementById("nav-top");

    let allGamesList = [];
    let currentModsData = [];
    let currentModIndex = 0;
    let currentGameDomain = "all";

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener("click", () => {
            renderMoreMods();
        });
    }

    // Oyunları dinamik yükle ve ardından API'den ilk tavsiyeleri çek
    async function loadInitialData() {
        if (!gameSearchInput) return;
        
        try {
            // Sunucu nerede çalışıyorsa (Localhost veya Render), relatif path sayesinde oraya istek atar
            const res = await fetch('/api/games');
            if (res.ok) {
                const games = await res.json();
                
                // Oyunları popülerliğe (indirme sayısına) göre sıralayalım
                if (Array.isArray(games)) {
                    games.sort((a,b) => (b.downloads || 0) - (a.downloads || 0));
                    
                    // "Hiçbiri" (Tüm oyunlar karışık) seçeneğini ekle
                    const allOpt = { domain_name: 'all', name: 'Hiçbiri (Karışık)', downloads: null };
                    allGamesList = [allOpt, ...games];
                    
                    gameSearchInput.value = "Hiçbiri (Karışık)"; // Default
                    gameSearchInput.placeholder = "Oyun adı yazın...";
                    if(gameSelectValue) gameSelectValue.value = "all";
                    
                    renderGameOptions(allGamesList);
                }
            }
        } catch(e) {
            console.error("Oyunlar yüklenirken bir hata oluştu:", e);
            gameSearchInput.placeholder = "Oyunlar yüklenemedi";
            gameSearchInput.value = "Hiçbiri (Karışık)";
        }

        // Açılışta 12 tane yapay zekanın "rastgele seçtiği/önerdiği" güncel ve popüler modları sayfaya getir
        triggerAISearch(true);
    }

    function renderGameOptions(gamesToRender) {
        if(!gameListDropdown) return;
        gameListDropdown.innerHTML = '';
        
        if (gamesToRender.length === 0) {
            const li = document.createElement("li");
            li.textContent = "Oyun bulunamadı...";
            li.style.pointerEvents = "none";
            gameListDropdown.appendChild(li);
            return;
        }

        gamesToRender.forEach(g => {
            const li = document.createElement("li");
            const dlText = g.downloads !== null ? ` (${(g.downloads/1000000).toFixed(1)}M)` : "";
            li.textContent = `${g.name}${dlText}`;
            li.dataset.domain = g.domain_name;
            
            li.addEventListener("click", () => {
                if(gameSelectValue) gameSelectValue.value = g.domain_name;
                gameSearchInput.value = g.name;
                gameListDropdown.classList.remove("show");
                
                // Oyunu değiştirince otomatik olarak modlarını çek
                triggerAISearch(true);
            });
            
            gameListDropdown.appendChild(li);
        });
    }

    // Searchable Dropdown Event Listeners
    if (gameSearchInput) {
        let originalValue = "";

        gameSearchInput.addEventListener("focus", () => {
            originalValue = gameSearchInput.value;
            gameSearchInput.value = "";
            renderGameOptions(allGamesList);
            gameListDropdown.classList.add("show");
        });

        document.addEventListener("click", (e) => {
            if (!e.target.closest(".game-selector-wrapper")) {
                if(gameListDropdown) gameListDropdown.classList.remove("show");
                
                if(gameSearchInput.value.trim() === "" && allGamesList.length > 0) {
                    gameSearchInput.value = originalValue || "Hiçbiri (Karışık)";
                }
            }
        });

        gameSearchInput.addEventListener("input", (e) => {
            const val = e.target.value.toLowerCase();
            const filtered = allGamesList.filter(g => g.name.toLowerCase().includes(val));
            renderGameOptions(filtered);
            gameListDropdown.classList.add("show");
        });
    }
    
    // Uygulama yüklendiğinde ilk verileri çek
    loadInitialData();

    // -- Menü Yönlendirmeleri (Keşfet / Çok Sevilenler) --
    if (navTop) {
        navTop.addEventListener("click", (e) => {
            e.preventDefault();
            if(navDiscover) navDiscover.classList.remove("active");
            navTop.classList.add("active");
            
            const sectionHeaderH2 = document.querySelector(".section-header h2");
            const sectionHeaderP = document.querySelector(".section-header p");
            if(sectionHeaderH2) sectionHeaderH2.innerHTML = '<ion-icon name="heart"></ion-icon> Topluluğun Çok Sevdiği Modlar';
            if(sectionHeaderP) sectionHeaderP.innerHTML = 'Veritabanımızdaki milyonlarca kere indirilmiş, oyuncuların favorisi olan en popüler modlar!';
            if(inputField) inputField.value = '';
            
            fetchTopMods();
        });
    }

    if (navDiscover) {
        navDiscover.addEventListener("click", (e) => {
            e.preventDefault();
            if(navTop) navTop.classList.remove("active");
            navDiscover.classList.add("active");
            
            const sectionHeaderH2 = document.querySelector(".section-header h2");
            const sectionHeaderP = document.querySelector(".section-header p");
            if(sectionHeaderH2) sectionHeaderH2.innerHTML = '<ion-icon name="planet-outline"></ion-icon> Sana Özel Kişiselleştirilmiş Öneriler';
            if(sectionHeaderP) sectionHeaderP.innerHTML = 'Oynadığın oyunlar ve beğendiğin mod geçmişine göre yapay zeka tarafından sadece senin için seçildi.';
            
            triggerAISearch(true);
        });
    }

    function renderMoreMods() {
        if (!currentModsData || currentModsData.length === 0) return;
        
        const nextBatch = currentModsData.slice(currentModIndex, currentModIndex + 12);
        
        nextBatch.forEach(mod => {
            const title = mod.name || mod.title || 'İsimsiz Mod';
            const description = mod.summary || mod.description || 'Bu mod hakkında bir açıklama sunulmamış.';
            const author = mod.author || 'Nexus Geliştiricisi';
            const iconUrl = mod.picture_url || 'https://api.dicebear.com/6.x/shapes/svg?seed=' + title; 
            
            // Eğer sunucudan modun hangi oyuna ait olduğu geldiyse onu göster
            let displayDomain = mod.domain_name || mod.category_name || currentGameDomain;
            let displayGameName = "Karışık";

            if (displayDomain !== "all") {
                // allGamesList içinde bu oyunun düzgün insan okuyabilir adını bulmaya çalış
                const foundGame = allGamesList.find(g => g.domain_name === displayDomain);
                if (foundGame) {
                    displayGameName = foundGame.name;
                } else {
                    displayGameName = displayDomain.charAt(0).toUpperCase() + displayDomain.slice(1);
                }
            }
            
            const categoryName = displayGameName + ' Modu';
            
            // Mod id'sine göre indirme linkini ayarla
            const resolvedDomain = mod.domain_name || mod.category_name || (currentGameDomain !== 'all' ? currentGameDomain : 'skyrimspecialedition');
            const projectUrl = `https://www.nexusmods.com/${resolvedDomain}/mods/${mod.mod_id}`;
            
            // AI Eşleşmesini oyunun mod ID'sine göre matematiksel ve sabit (gerçekçi) bir değere bağlayalım.
            // Böylece aynı karta her bakıldığında aynı AI tahmini (%80-%99 arası) gözükecek.
            const generateConsistentMatch = (id) => (id % 20) + 80; // 80 ile 99 arasında bir rakam çıkartır
            const matchPercent = generateConsistentMatch(mod.mod_id || Math.floor(Math.random() * 100));

            // İndirme sayısını şık bir M (Milyon) veya K (Bin) formatına çevir
            let downloadBadge = "";
            if (mod.mod_downloads) {
                let dlCount = mod.mod_downloads;
                let dlFormatted = dlCount;
                if(dlCount > 1000000) dlFormatted = (dlCount / 1000000).toFixed(1) + "M";
                else if(dlCount > 1000) dlFormatted = (dlCount / 1000).toFixed(1) + "K";
                
                downloadBadge = `<span class="tag" style="background: rgba(239, 68, 68, 0.2); color: #fca5a5;"><ion-icon name="download-outline"></ion-icon> ${dlFormatted}</span>`;
            }

            const cardHtml = `
                <div class="mod-card">
                    <div class="mod-image" style="background-color: #1a1c29;">
                        <img src="${iconUrl}" alt="${title}" style="object-fit: cover; ">
                        <div class="ai-match-badge">%${matchPercent} AI Eşleşmesi</div>
                    </div>
                    <div class="mod-info">
                        <h3>${title}</h3>
                        <p>${description.slice(0, 100)}...</p>
                        
                        <div class="auto-tags">
                            <span class="tag ai-tag" title="Nexus Mods Node.js Backend API verisi">
                                <ion-icon name="flash-outline"></ion-icon> Nexus API
                            </span>
                            <span class="tag">${categoryName}</span>
                            ${downloadBadge}
                        </div>
                        
                        <div class="mod-footer">
                            <span class="author">by ${author}</span>
                            <a href="${projectUrl}" target="_blank" class="download-btn" style="text-decoration: none;" title="NexusMods'da Aç">
                                <ion-icon name="open-outline"></ion-icon>
                            </a>
                        </div>
                    </div>
                </div>
            `;
            container.innerHTML += cardHtml;
        });

        currentModIndex += 12;

        if (loadMoreBtn) {
            if (currentModIndex >= currentModsData.length) {
                loadMoreBtn.style.display = "none";
            } else {
                loadMoreBtn.style.display = "inline-flex";
            }
        }
    }

    // Click suggestions to quickly fill input
    suggestions.forEach(sug => {
        sug.addEventListener("click", () => {
            inputField.value = "Bana " + sug.innerText.toLowerCase() + " öner...";
            triggerAISearch();
        });
    });

    // Enter key support for input
    inputField.addEventListener("keypress", (e) => {
        if(e.key === 'Enter') {
            triggerAISearch();
        }
    });

    // Button click support
    searchBtn.addEventListener("click", () => {
        triggerAISearch();
    });

    function triggerAISearch(isInitial = false) {
        let query = "";
        if (inputField) query = inputField.value.trim();
        
        if(!query && !isInitial) {
            if (inputField) inputField.focus();
            return;
        }

        // Yükleme ekranını göster
        if (overlay) overlay.classList.add("active");

        // Gerçek API'ye istek atmadan önce biraz AI "düşünme" efekti verelim
        setTimeout(() => {
            searchNexusMods(query);
        }, 1200); 
    }

    async function searchNexusMods(query) {
        // Eski içeriği yavaşça gizle
        container.style.transition = '0.5s ease';
        container.style.opacity = '0';
        container.style.transform = 'translateY(20px)';
        
        try {
            // Kendi yazdığımız Node.js arka plan (Backend) sunucumuza özel proxy isteği.
            currentGameDomain = gameSelectValue ? gameSelectValue.value : "all";
            const apiUrl = `/api/search?q=${encodeURIComponent(query)}&game=${currentGameDomain}`;
            
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error('Node.js Backend sunucusuna ulaşılamadı. (Sunucu kapalı olabilir)');
            }
            
            const data = await response.json();
            
            setTimeout(() => {
                container.innerHTML = ''; // Eski elemanları temizle
                
                const modsArray = data.mods || data.hits || data || []; 
                currentModsData = modsArray;
                currentModIndex = 0;

                if (Array.isArray(modsArray) && modsArray.length > 0) {
                    renderMoreMods();
                } else {
                    container.innerHTML = `<p style="color: #94a3b8; text-align: center; width: 100%; font-size: 1.2rem; margin-top: 2rem;">Yapay Zeka bu oyunda herhangi bir Nexus Modu bulamadı.</p>`;
                    if(loadMoreBtn) loadMoreBtn.style.display = "none";
                }
                
                // Yeni içeriği göster
                container.style.opacity = '1';
                container.style.transform = 'translateY(0)';
                
                // Başlıkları güncelle
                const sectionHeaderH2 = document.querySelector(".section-header h2");
                const sectionHeaderP = document.querySelector(".section-header p");
                sectionHeaderH2.innerHTML = '<ion-icon name="logo-nodejs"></ion-icon> Nexus Mods Sunucusundan Bağlanıldı';
                sectionHeaderP.innerHTML = 'Kendi Node.js sunucunuz kullanılarak <b>Nexus API</b> üzerinden güvenli şekilde gerçek modlar listelendi!';
                
                // Arama kutusunu boşalt ve AI yükleme perdesini kaldır
                inputField.value = '';
                overlay.classList.remove("active");
                
            }, 500);
            
        } catch (error) {
            console.error("Node.js Proxy Bağlantı Hatası:", error);
            overlay.classList.remove("active");
            container.innerHTML = `<div style="text-align: center; width: 100%; padding: 2rem;">
                                      <p style="color: #ef4444; font-size: 1.2rem; font-weight: 500;">
                                          <ion-icon name="warning-outline" style="font-size: 2rem;"></ion-icon><br/>
                                          Arka Plan (Node.js) Sunucusuna ulaşılamadı.
                                      </p>
                                      <p style="color: #94a3b8; margin-top: 1rem;">
                                          Node.js sunucusunu terminalden (<code>node server.js</code>) başlattığınıza emin olun. <br/>
                                          (Hata detayı: ${error.message})
                                      </p>
                                   </div>`;
            container.style.opacity = '1';
        }
    }

    async function fetchTopMods() {
        if (overlay) overlay.classList.add("active");
        
        container.style.transition = '0.5s ease';
        container.style.opacity = '0';
        container.style.transform = 'translateY(20px)';
        
        try {
            currentGameDomain = gameSelectValue ? gameSelectValue.value : "all";
            const apiUrl = `/api/top-mods?game=${currentGameDomain}`;
            
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error('Sunucu hatası. Popüler modlar getirilemedi.');
            }
            
            const data = await response.json();
            
            setTimeout(() => {
                container.innerHTML = ''; 
                
                const modsArray = data.mods || []; 
                currentModsData = modsArray;
                currentModIndex = 0;

                if (Array.isArray(modsArray) && modsArray.length > 0) {
                    renderMoreMods();
                } else {
                    container.innerHTML = `<p style="color: #94a3b8; text-align: center; width: 100%; font-size: 1.2rem; margin-top: 2rem;">Veritabanında bu oyun için kayıtlı "Sevilen Mod" bulunamadı.</p>`;
                    if(loadMoreBtn) loadMoreBtn.style.display = "none";
                }
                
                container.style.opacity = '1';
                container.style.transform = 'translateY(0)';
                overlay.classList.remove("active");
                
            }, 500);
            
        } catch (error) {
            console.error("Top Mods Bağlantı Hatası:", error);
            overlay.classList.remove("active");
            container.innerHTML = `<div style="text-align: center; width: 100%; padding: 2rem;">
                                      <p style="color: #ef4444; font-size: 1.2rem; font-weight: 500;">
                                          Modlar çekilirken arka plan sunucusunda hata oluştu (Proxy Error).
                                      </p>
                                   </div>`;
            container.style.opacity = '1';
        }
    }
});
