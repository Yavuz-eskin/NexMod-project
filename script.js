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
    const navFavorites = document.getElementById("nav-favorites");

    // Auth Elementleri
    const userProfileBtn = document.getElementById("user-profile-btn");
    const userNameDisplay = document.getElementById("user-name-display");
    const authModal = document.getElementById("auth-modal");
    const closeAuthBtn = document.getElementById("close-auth-btn");
    const authForm = document.getElementById("auth-form");
    const authTitle = document.getElementById("auth-title");
    const authSubmitBtn = document.getElementById("auth-submit-btn");
    const authToggleLink = document.getElementById("auth-toggle-link");
    const authToggleText = document.getElementById("auth-toggle-text");
    const authErrorMsg = document.getElementById("auth-error-msg");

    // Sidebar Elementleri
    const userSidebar = document.getElementById("user-sidebar");
    const sidebarOverlay = document.getElementById("sidebar-overlay");
    const closeSidebarBtn = document.getElementById("close-sidebar-btn");
    const sidebarUserName = document.getElementById("sidebar-user-name");
    const sidebarUserImg = document.getElementById("sidebar-user-img");
    const sidebarFavLink = document.getElementById("sidebar-fav-link");
    const sidebarAccountBtn = document.getElementById("sidebar-account-btn");
    const sidebarPrefsBtn = document.getElementById("sidebar-prefs-btn");
    const logoutBtn = document.getElementById("logout-btn");

    // Settings Modal Elementleri
    const settingsModal = document.getElementById("settings-modal");
    const closeSettingsBtn = document.getElementById("close-settings-btn");
    const accountSection = document.getElementById("account-section");
    const prefsSection = document.getElementById("prefs-section");
    const settingsMsg = document.getElementById("settings-msg");
    const changePasswordForm = document.getElementById("change-password-form");
    const savePrefsBtn = document.getElementById("save-prefs-btn");
    const deleteAccountBtn = document.getElementById("delete-account-btn");

    let allGamesList = [];
    let currentModsData = [];
    let currentModIndex = 0;
    let currentGameDomain = "all";
    
    // Auth State
    let currentUser = JSON.parse(localStorage.getItem('nexmod_user')) || null;
    let favoritesArray = currentUser ? currentUser.favorites : [];
    let isRegisterMode = false;

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
    
    // Uygulama yüklendiğinde ilk verileri çek ve kullanıcıyı kontrol et
    updateUserUI();
    loadInitialData();

    // --- KULLANICI / AUTH MANTIĞI ---

    function updateUserUI() {
        if (currentUser && userNameDisplay) {
            userNameDisplay.innerText = currentUser.username;
            userNameDisplay.style.display = "block";
            const userImg = document.querySelector("#user-profile-btn img");
            if(userImg) {
                const avatarUrl = `https://api.dicebear.com/6.x/avataaars/svg?seed=${currentUser.username}`;
                userImg.src = avatarUrl;
                if(sidebarUserImg) sidebarUserImg.src = avatarUrl;
            }
            if(sidebarUserName) sidebarUserName.innerText = currentUser.username;
        } else if (userNameDisplay) {
            userNameDisplay.innerText = "Giriş Yap";
            userNameDisplay.style.display = "block";
        }
    }

    if (userProfileBtn) {
        userProfileBtn.addEventListener("click", () => {
            if (!currentUser) {
                openAuthModal();
            } else {
                toggleSidebar();
            }
        });
    }

    function toggleSidebar() {
        if (!userSidebar) return;
        userSidebar.classList.toggle("active");
        if(sidebarOverlay) sidebarOverlay.classList.toggle("active");
    }

    function closeSidebar() {
        if(userSidebar) userSidebar.classList.remove("active");
        if(sidebarOverlay) sidebarOverlay.classList.remove("active");
    }

    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener("click", closeSidebar);
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener("click", closeSidebar);
    }

    if (sidebarFavLink) {
        sidebarFavLink.addEventListener("click", (e) => {
            e.preventDefault();
            closeSidebar();
            if(navFavorites) navFavorites.click();
        });
    }

    if (sidebarAccountBtn) {
        sidebarAccountBtn.addEventListener("click", (e) => {
            e.preventDefault();
            closeSidebar();
            openSettingsModal('account');
        });
    }

    if (sidebarPrefsBtn) {
        sidebarPrefsBtn.addEventListener("click", (e) => {
            e.preventDefault();
            closeSidebar();
            openSettingsModal('prefs');
        });
    }

    function openSettingsModal(section) {
        if (!settingsModal) return;
        settingsModal.style.display = "flex";
        if(settingsMsg) settingsMsg.style.display = "none";
        
        if (section === 'account') {
            accountSection.style.display = "block";
            prefsSection.style.display = "none";
        } else {
            accountSection.style.display = "none";
            prefsSection.style.display = "block";
        }
    }

    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener("click", () => {
            if(settingsModal) settingsModal.style.display = "none";
        });
    }

    // Şifre Değiştirme Formu
    if (changePasswordForm) {
        changePasswordForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const currentPassword = document.getElementById("current-password").value;
            const newPassword = document.getElementById("new-password").value;

            if (newPassword.length < 5) {
                showSettingsMsg("Yeni şifre en az 5 karakter olmalıdır.", "error");
                return;
            }

            try {
                const res = await fetch('/api/user/change-password', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentUser.token}`
                    },
                    body: JSON.stringify({ currentPassword, newPassword })
                });
                const data = await res.json();
                if (res.ok) {
                    showSettingsMsg("Şifreniz başarıyla güncellendi!", "success");
                    changePasswordForm.reset();
                } else {
                    showSettingsMsg(data.error || "Şifre güncellenemedi.", "error");
                }
            } catch (err) { console.error(err); }
        });
    }

    // Tercihleri Kaydetme
    if (savePrefsBtn) {
        savePrefsBtn.addEventListener("click", async () => {
            const language = document.getElementById("pref-lang").value;
            const preferences = { language };

            try {
                const res = await fetch('/api/user/preferences', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentUser.token}`
                    },
                    body: JSON.stringify({ preferences })
                });
                const data = await res.json();
                if (res.ok) {
                    showSettingsMsg("Tercihler kaydedildi. (Sayfa yenilendiğinde aktif olur)", "success");
                }
            } catch (err) { console.error(err); }
        });
    }

    // Hesap Silme
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener("click", async () => {
            if (confirm("HESABINIZI KALICI OLARAK SİLMEK İSTEDİĞİNİZE EMİN MİSİNİZ? Bu işlem geri alınamaz ve tüm favorileriniz silinir.")) {
                try {
                    const res = await fetch('/api/user/delete-account', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${currentUser.token}` }
                    });
                    if (res.ok) {
                        alert("Hesabınız silindi. Güle güle!");
                        logout();
                        if(settingsModal) settingsModal.style.display = "none";
                    }
                } catch (err) { console.error(err); }
            }
        });
    }

    function showSettingsMsg(msg, type) {
        if (!settingsMsg) return;
        settingsMsg.innerText = msg;
        settingsMsg.style.color = type === "success" ? "#10b981" : "#ef4444";
        settingsMsg.style.display = "block";
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            if (confirm("Çıkış yapmak istediğinize emin misiniz?")) {
                closeSidebar();
                logout();
            }
        });
    }

    function openAuthModal() {
        if(authModal) authModal.style.display = "flex";
        if(authErrorMsg) authErrorMsg.style.display = "none";
    }

    if (closeAuthBtn) {
        closeAuthBtn.addEventListener("click", () => {
            if(authModal) authModal.style.display = "none";
        });
    }

    if (authToggleLink) {
        authToggleLink.addEventListener("click", (e) => {
            e.preventDefault();
            isRegisterMode = !isRegisterMode;
            authTitle.innerText = isRegisterMode ? "Kayıt Ol" : "Giriş Yap";
            authSubmitBtn.innerText = isRegisterMode ? "Kayıt Ol" : "Giriş Yap";
            authToggleText.innerText = isRegisterMode ? "Zaten hesabın var mı? " : "Hesabın yok mu? ";
            authToggleLink.innerText = isRegisterMode ? "Giriş Yap" : "Kayıt Ol";
            if(authErrorMsg) authErrorMsg.style.display = "none";
        });
    }

    if (authForm) {
        authForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const username = document.getElementById("auth-username").value;
            const password = document.getElementById("auth-password").value;
            
            const endpoint = isRegisterMode ? '/api/auth/register' : '/api/auth/login';
            
            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await res.json();
                
                if (res.ok) {
                    currentUser = data;
                    favoritesArray = data.favorites || [];
                    localStorage.setItem('nexmod_user', JSON.stringify(data));
                    updateUserUI();
                    if(authModal) authModal.style.display = "none";
                    alert(isRegisterMode ? "Başarıyla kayıt olundu!" : "Giriş başarılı!");
                    // Sayfayı yenilemeye gerek yok, state güncel
                } else {
                    if(authErrorMsg) {
                        authErrorMsg.innerText = data.error || "Bir hata oluştu.";
                        authErrorMsg.style.display = "block";
                    }
                }
            } catch (err) {
                console.error("Auth hatası:", err);
            }
        });
    }

    function logout() {
        currentUser = null;
        favoritesArray = [];
        localStorage.removeItem('nexmod_user');
        updateUserUI();
        navDiscover.click(); // Keşfet'e dön
    }

    // -- Menü Yönlendirmeleri (Keşfet / Çok Sevilenler) --
    if (navTop) {
        navTop.addEventListener("click", (e) => {
            e.preventDefault();
            if(navDiscover) navDiscover.classList.remove("active");
            if(navFavorites) navFavorites.classList.remove("active");
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
            if(navFavorites) navFavorites.classList.remove("active");
            navDiscover.classList.add("active");
            
            const sectionHeaderH2 = document.querySelector(".section-header h2");
            const sectionHeaderP = document.querySelector(".section-header p");
            if(sectionHeaderH2) sectionHeaderH2.innerHTML = '<ion-icon name="planet-outline"></ion-icon> Sana Özel Kişiselleştirilmiş Öneriler';
            if(sectionHeaderP) sectionHeaderP.innerHTML = 'Oynadığın oyunlar ve beğendiğin mod geçmişine göre yapay zeka tarafından sadece senin için seçildi.';
            
            triggerAISearch(true);
        });
    }

    if (navFavorites) {
        navFavorites.addEventListener("click", async (e) => {
            e.preventDefault();
            
            if (!currentUser) {
                alert("Favorilerinizi görmek için lütfen giriş yapın.");
                openAuthModal();
                return;
            }

            if(navDiscover) navDiscover.classList.remove("active");
            if(navTop) navTop.classList.remove("active");
            navFavorites.classList.add("active");
            
            const sectionHeaderH2 = document.querySelector(".section-header h2");
            const sectionHeaderP = document.querySelector(".section-header p");
            if(sectionHeaderH2) sectionHeaderH2.innerHTML = '<ion-icon name="heart" style="color: #ef4444;"></ion-icon> Benim Kaydettiğim Modlar';
            if(sectionHeaderP) sectionHeaderP.innerHTML = 'Beğendiğin ve kalbine dokunan tüm modlar burada güvenle saklanıyor.';
            if(inputField) inputField.value = '';
            
            // Sunucudan favorileri en güncel haliyle çek
            try {
                const res = await fetch('/api/user/favorites', {
                    headers: { 'Authorization': `Bearer ${currentUser.token}` }
                });
                const data = await res.json();
                if (res.ok) {
                    favoritesArray = data.favorites;
                    // Hafızadaki kullanıcıyı da güncelle
                    currentUser.favorites = favoritesArray;
                    localStorage.setItem('nexmod_user', JSON.stringify(currentUser));
                }
            } catch (err) { console.error("Favori senkronizasyon hatası:", err); }

            container.innerHTML = ''; 
            currentModsData = favoritesArray;
            currentModIndex = 0;
            
            if (favoritesArray.length === 0) {
                container.innerHTML = `<p style="color: #94a3b8; text-align: center; width: 100%; font-size: 1.2rem; margin-top: 2rem;">Henüz hiç favori modun yok. Sağ üstteki kalp butonlarına tıklayarak mod kaydetmeye başla!</p>`;
                if(loadMoreBtn) loadMoreBtn.style.display = "none";
            } else {
                renderMoreMods();
            }
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
            
            // AI Eşleşmesini önceden hesapladık, direkt objeden çekelim veya yedek matematik kullanalım
            const matchPercent = mod.matchPercent || 99;

            // İndirme sayısını şık bir M (Milyon) veya K (Bin) formatına çevir
            let downloadBadge = "";
            if (mod.mod_downloads) {
                let dlCount = mod.mod_downloads;
                let dlFormatted = dlCount;
                if(dlCount > 1000000) dlFormatted = (dlCount / 1000000).toFixed(1) + "M";
                else if(dlCount > 1000) dlFormatted = (dlCount / 1000).toFixed(1) + "K";
                
                downloadBadge = `<span class="tag" style="background: rgba(239, 68, 68, 0.2); color: #fca5a5;"><ion-icon name="download-outline"></ion-icon> ${dlFormatted}</span>`;
            }
            // Local Storage'da bu mod kayıtlı mı kontrolü (Kalp ikonunu aktif etmek için)
            const isFav = favoritesArray.some(f => f.mod_id === mod.mod_id);
            const favClass = isFav ? "active" : "";
            
            // Tıklayınca Favoriye ekleyebilmek için modun json halini base64 veya uri formatında butona gömelim
            const modEncoded = encodeURIComponent(JSON.stringify(mod));

            const cardHtml = `
                <div class="mod-card">
                    <div class="mod-image" style="background-color: #1a1c29;">
                        <img src="${iconUrl}" alt="${title}" style="object-fit: cover; ">
                        
                        <div class="favorite-btn ${favClass}" data-mod="${modEncoded}" title="Favorilere Ekle/Çıkar">
                            <ion-icon name="heart-outline"></ion-icon>
                            <ion-icon name="heart" class="hidden-icon"></ion-icon>
                        </div>

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

    // Favori - Kalp butonlarına Tıklama Mantığı (Event Delegation - Live Dom Manipulation)
    if (container) {
        container.addEventListener("click", async (e) => {
            const btn = e.target.closest(".favorite-btn");
            if (!btn) return; // Kalbe tıklanmadıysa çık
            
            e.preventDefault();
            e.stopPropagation();

            if (!currentUser) {
                alert("Modları favoriye eklemek için lütfen giriş yapın.");
                openAuthModal();
                return;
            }

            const modData = JSON.parse(decodeURIComponent(btn.getAttribute("data-mod")));
            
            // UI'ı anında güncelle (Optimistic UI)
            const existingIndex = favoritesArray.findIndex(f => f.mod_id === modData.mod_id);
            if (existingIndex >= 0) {
                favoritesArray.splice(existingIndex, 1);
                btn.classList.remove("active");
                if (navFavorites && navFavorites.classList.contains("active")) {
                    const card = btn.closest(".mod-card");
                    if (card) card.style.display = "none";
                }
            } else {
                favoritesArray.push(modData);
                btn.classList.add("active");
            }

            // SUNUCUYA KAYDET (Account Sync)
            try {
                const res = await fetch('/api/user/favorites', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentUser.token}`
                    },
                    body: JSON.stringify({ modData })
                });
                
                const data = await res.json();
                if (res.ok) {
                    // Sunucudan gelen kesinleşmiş listeyi alalım
                    favoritesArray = data.favorites;
                    currentUser.favorites = favoritesArray;
                    localStorage.setItem('nexmod_user', JSON.stringify(currentUser));
                }
            } catch (err) {
                console.error("Favori sync hatası:", err);
            }

            if (navFavorites && navFavorites.classList.contains("active") && favoritesArray.length === 0) {
                container.innerHTML = `<p style="color: #94a3b8; text-align: center; width: 100%; font-size: 1.2rem; margin-top: 2rem;">Henüz hiç favori modun yok. Sağ üstteki kalp butonlarına tıklayarak mod kaydetmeye başla!</p>`;
                if(loadMoreBtn) loadMoreBtn.style.display = "none";
            }
        });
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
        
        // Arama yapıldığında, daha sonra AI %'sini hesaplamak için kelimeyi hafızaya al
        window.lastActiveQuery = query;
        
        if(!query && !isInitial) {
            if (inputField) inputField.focus();
            return;
        }

        // Yükleme ekranını göster
        if (overlay) overlay.classList.add("active");

        // Gerçek API'ye istek atmadan önce kısa bir UI efekti
        setTimeout(() => {
            searchNexusMods(query);
        }, 100); 
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
            
            // Veriyi anında ekrana bas (eski yapay bekletme kaldırıldı)
            container.innerHTML = ''; // Eski elemanları temizle
            
            const modsArray = data.mods || data.hits || data || []; 
            const activeQuery = (window.lastActiveQuery || "").toLowerCase();

            // Tüm dizinin AI eşleşme oranını önceden hesapla ve modlara göm
            modsArray.forEach(mod => {
                const title = (mod.name || mod.title || '').toLowerCase();
                const description = (mod.summary || mod.description || '').toLowerCase();
                
                let matchPercent = 99;
                if (activeQuery.length > 1) {
                    if (title === activeQuery) matchPercent = 99;
                    else if (title.includes(activeQuery)) matchPercent = 90 + (mod.mod_id % 9);
                    else if (description.includes(activeQuery)) matchPercent = 80 + (mod.mod_id % 10);
                    else matchPercent = 70 + (mod.mod_id % 10);
                } else {
                    matchPercent = 85 + (mod.mod_id % 15); 
                }
                mod.matchPercent = matchPercent;
            });

            // Hesaplanan bu AI Oranına göre diziyi EN BÜYÜKTEN EN KÜÇÜĞE % olarak sırala!
            modsArray.sort((a, b) => b.matchPercent - a.matchPercent);

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
            sectionHeaderH2.innerHTML = '<ion-icon name="logo-nodejs"></ion-icon> Nexus Mods Sunucusundan Arama Sonucu';
            sectionHeaderP.innerHTML = 'Kendi veritabanınızdan filtreler kullanılarak listelendi!';
            
            // Arama kutusunu boşalt ve AI yükleme perdesini kaldır
            if (inputField) inputField.value = '';
            if (overlay) overlay.classList.remove("active");
            
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
        window.lastActiveQuery = ""; // Çok Sevilenler'de arama parametresi bulunmuyor
        
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
            
            // Eski yapay bekletme kaldırıldı, direkt renderlanıyor
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
