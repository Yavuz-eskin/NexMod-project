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
    const mainLogoLink = document.getElementById("main-logo-link");

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

    // Full Page Account Elementleri
    const accountPage = document.getElementById("account-settings-page");
    const heroSection = document.querySelector(".hero");
    const recommendationsSection = document.querySelector(".recommendations");
    const accountTabs = document.querySelectorAll(".account-sidebar div");
    const tabPanes = document.querySelectorAll(".tab-pane");

    const editUsername = document.getElementById("edit-username");
    const editAvatarSeed = document.getElementById("edit-avatar-seed");
    const editAvatarPreview = document.getElementById("edit-avatar-preview");
    const randomAvatarBtn = document.getElementById("random-avatar-btn");
    const saveProfileBtn = document.getElementById("save-profile-btn");
    const accountStatusMsg = document.getElementById("account-status-msg");

    const fullChangePasswordForm = document.getElementById("full-change-password-form");
    const fullSavePrefsBtn = document.getElementById("full-save-prefs-btn");
    const fullDeleteAccountBtn = document.getElementById("full-delete-account-btn");

    // Custom Logout Modal Elementleri
    const confirmModal = document.getElementById("confirm-modal");
    const confirmLogoutBtn = document.getElementById("confirm-logout-btn");
    const cancelLogoutBtn = document.getElementById("cancel-logout-btn");
    const toastContainer = document.getElementById("toast-container");

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

    // Port/Proxy Yardımcısı: Frontend farklı portta veya file:// protocolündeyse 3000'e zorla
    const getApiBase = () => {
        if (window.location.protocol === 'file:' || (window.location.port && window.location.port !== '3000')) {
            return "http://localhost:3000";
        }
        return "";
    };
    const apiBase = getApiBase();

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
            const res = await fetch(`${apiBase}/api/games`);
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
                const seed = currentUser.avatarSeed || currentUser.username;
                const avatarUrl = `https://api.dicebear.com/6.x/avataaars/svg?seed=${seed}`;
                userImg.src = avatarUrl;
                if(sidebarUserImg) sidebarUserImg.src = avatarUrl;
                if(sidebarUserName) sidebarUserName.innerText = currentUser.username;
                if(editAvatarPreview) editAvatarPreview.src = avatarUrl;
                if(editAvatarSeed) editAvatarSeed.value = currentUser.avatarSeed || "";
                if(editUsername) editUsername.value = currentUser.username;
                
                // Tercihleri yükle
                if(currentUser.preferences) {
                    const langSelect = document.getElementById("full-pref-lang");
                    if(langSelect) langSelect.value = currentUser.preferences.language || "tr";
                    
                    const darkModeToggle = document.querySelector(".toggle-switch");
                    if(darkModeToggle) {
                        if(currentUser.preferences.darkMode === false) darkModeToggle.classList.remove("active");
                        else darkModeToggle.classList.add("active");
                    }
                }
            }
        } else if (userNameDisplay) {
            userNameDisplay.innerText = "Giriş Yap";
            userNameDisplay.style.display = "block";
        }
    }

    // Tab geçiş mantığı
    accountTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const targetTab = tab.dataset.tab;
            
            // Sidebar active class
            accountTabs.forEach(t => t.classList.remove("active-tab"));
            tab.classList.add("active-tab");

            // Content active class
            tabPanes.forEach(pane => {
                pane.classList.remove("active");
                if (pane.id === `tab-${targetTab}`) {
                    pane.classList.add("active");
                }
            });
            if(accountStatusMsg) accountStatusMsg.style.display = "none";
        });
    });

    // Avatar Seed Değişimi (Preview)
    if (editAvatarSeed) {
        editAvatarSeed.addEventListener("input", (e) => {
            const seed = e.target.value || "Felix";
            if(editAvatarPreview) editAvatarPreview.src = `https://api.dicebear.com/6.x/avataaars/svg?seed=${seed}`;
        });
    }

    if (randomAvatarBtn) {
        randomAvatarBtn.addEventListener("click", () => {
            const randomSeed = Math.random().toString(36).substring(7);
            if(editAvatarSeed) {
                editAvatarSeed.value = randomSeed;
                editAvatarSeed.dispatchEvent(new Event('input'));
            }
        });
    }

    function showAccountMsg(msg, status = "success") {
        if(!accountStatusMsg) return;
        accountStatusMsg.innerText = msg;
        accountStatusMsg.style.color = status === "success" ? "#10b981" : "#ef4444";
        accountStatusMsg.style.display = "block";
    }

    // Profil Kaydetme (Username & Avatar)
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener("click", async () => {
            const newUsername = editUsername.value.trim();
            const avatarSeed = editAvatarSeed.value.trim();

            if (newUsername.length < 3) {
                showAccountMsg("Kullanıcı adı en az 3 karakter olmalıdır.", "error");
                return;
            }

            try {
                const res = await fetch(`${apiBase}/api/user/update-profile`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentUser.token}`
                    },
                    body: JSON.stringify({ newUsername, avatarSeed })
                });

                const data = await res.json();
                if (res.ok) {
                    currentUser.username = data.username;
                    currentUser.token = data.token;
                    currentUser.avatarSeed = data.avatarSeed;
                    localStorage.setItem('nexmod_user', JSON.stringify(currentUser));
                    updateUserUI();
                    showAccountMsg("Profil başarıyla güncellendi!");
                } else {
                    showAccountMsg(data.error || "Giriş yapılamadı.", "error");
                }
            } catch (err) { console.error(err); }
        });
    }

    // Şifre Değiştirme (Full Page)
    if (fullChangePasswordForm) {
        fullChangePasswordForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const currentPassword = document.getElementById("full-current-password").value;
            const newPassword = document.getElementById("full-new-password").value;
            const newPasswordConfirm = document.getElementById("full-new-password-confirm").value;

            if (newPassword !== newPasswordConfirm) {
                showAccountMsg("Yeni şifreler birbiriyle uyuşmuyor!", "error");
                return;
            }

            if (newPassword.length < 6) {
                showAccountMsg("Yeni şifre en az 6 karakter olmalıdır.", "error");
                return;
            }

            try {
                const res = await fetch(`${apiBase}/api/user/change-password`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentUser.token}`
                    },
                    body: JSON.stringify({ currentPassword, newPassword })
                });
                const data = await res.json();
                if (res.ok) {
                    showAccountMsg("Şifreniz güncellendi!");
                    fullChangePasswordForm.reset();
                } else {
                    showAccountMsg(data.error || "Hata", "error");
                }
            } catch (err) { console.error(err); }
        });
    }

    // Karanlık Mod Toggle Tıklama
    const darkModeToggle = document.querySelector(".toggle-switch");
    if (darkModeToggle) {
        darkModeToggle.addEventListener("click", () => {
            darkModeToggle.classList.toggle("active");
        });
    }
    
    // Tercihler (Full Page)
    if (fullSavePrefsBtn) {
        fullSavePrefsBtn.addEventListener("click", async () => {
            const language = document.getElementById("full-pref-lang").value;
            const isDarkMode = darkModeToggle && darkModeToggle.classList.contains("active");
            
            try {
                const res = await fetch(`${apiBase}/api/user/preferences`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentUser.token}`
                    },
                    body: JSON.stringify({ preferences: { language, darkMode: isDarkMode } })
                });
                if (res.ok) {
                    const data = await res.json();
                    currentUser.preferences = data.preferences;
                    localStorage.setItem('nexmod_user', JSON.stringify(currentUser));
                    showAccountMsg("Tercihler kaydedildi!");
                }
            } catch (err) { console.error(err); }
        });
    }

    // Hesap Silme (Full Page)
    if (fullDeleteAccountBtn) {
        fullDeleteAccountBtn.addEventListener("click", async () => {
            // Hesap silme ciddi bir işlem olduğu için burada şimdilik alert yerine bir "silme onayı" state'i kuracağız
            if (fullDeleteAccountBtn.innerText !== "KESİN OLARAK SİL?") {
                fullDeleteAccountBtn.innerText = "KESİN OLARAK SİL?";
                fullDeleteAccountBtn.style.background = "#ef4444";
                fullDeleteAccountBtn.style.color = "white";
                setTimeout(() => {
                    if(fullDeleteAccountBtn) {
                        fullDeleteAccountBtn.innerText = "Hesabımı Kalıcı Olarak Sil";
                        fullDeleteAccountBtn.style.background = "rgba(239, 68, 68, 0.1)";
                        fullDeleteAccountBtn.style.color = "#ef4444";
                    }
                }, 3000);
                return;
            }

            try {
                const res = await fetch(`${apiBase}/api/user/delete-account`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${currentUser.token}` }
                });
                if (res.ok) {
                    showToast("Hesabınız silindi. Sizi özleyeceğiz.", "error");
                    logout();
                }
            } catch (err) { console.error(err); }
        });
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
        // Eski modalı değil, yeni full-page section'ı gösteriyoruz
        hideAllMainSections();
        if(accountPage) accountPage.style.display = "block";
        
        // İlgili taba tıkla
        const targetTab = section === 'account' ? 'profile' : 'prefs';
        const tabEl = document.querySelector(`.account-sidebar div[data-tab="${targetTab}"]`);
        if(tabEl) tabEl.click();
    }

    function hideAllMainSections() {
        if(heroSection) heroSection.style.display = "none";
        if(recommendationsSection) recommendationsSection.style.display = "none";
        if(accountPage) accountPage.style.display = "none";
        
        // Navlardaki active classları temizle
        if(navDiscover) navDiscover.classList.remove("active");
        if(navTop) navTop.classList.remove("active");
        if(navFavorites) navFavorites.classList.remove("active");
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            if(confirmModal) confirmModal.style.display = "flex";
        });
    }

    if (confirmLogoutBtn) {
        confirmLogoutBtn.addEventListener("click", () => {
            if(confirmModal) confirmModal.style.display = "none";
            closeSidebar();
            logout();
            showToast("Oturum kapatıldı.");
        });
    }

    if (cancelLogoutBtn) {
        cancelLogoutBtn.addEventListener("click", () => {
            if(confirmModal) confirmModal.style.display = "none";
        });
    }

    if (confirmModal) {
        confirmModal.addEventListener("click", (e) => {
            if(e.target === confirmModal) confirmModal.style.display = "none";
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
            authTitle.innerText = isRegisterMode ? "Hesap Oluştur" : "Hoş Geldiniz";
            authSubmitBtn.innerText = isRegisterMode ? "Kayıt Ol" : "Giriş Yap";
            authToggleText.innerText = isRegisterMode ? "Zaten bir hesabınız var mı? " : "Henüz bir hesabınız yok mu? ";
            authToggleLink.innerText = isRegisterMode ? "Giriş Yapın" : "Hemen Kaydolun";
            
            const confirmInput = document.getElementById("auth-password-confirm");
            if(confirmInput) {
                confirmInput.style.display = isRegisterMode ? "block" : "none";
                confirmInput.required = isRegisterMode;
            }
            if(authErrorMsg) authErrorMsg.style.display = "none";
        });
    }

    if (authForm) {
        authForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const username = document.getElementById("auth-username").value;
            const password = document.getElementById("auth-password").value;
            const passwordConfirm = document.getElementById("auth-password-confirm").value;

            if (isRegisterMode && password !== passwordConfirm) {
                if(authErrorMsg) {
                    authErrorMsg.innerText = "Şifreler uyuşmuyor!";
                    authErrorMsg.style.display = "block";
                }
                return;
            }
            
            const endpoint = isRegisterMode ? '/api/auth/register' : '/api/auth/login';
            
            try {
                const res = await fetch(`${apiBase}${endpoint}`, {
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
                    showToast(isRegisterMode ? "Hesabınız başarıyla oluşturuldu!" : `${data.username} olarak giriş yapıldı.`, "success");
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
        if(accountPage) accountPage.style.display = "none";
        navDiscover.click(); // Keşfet'e dön
    }

    // Toast Mesaj Kutusu
    function showToast(msg, type = "success") {
        if(!toastContainer) return;
        const toast = document.createElement("div");
        toast.style.cssText = `
            background: rgba(20, 23, 38, 0.9);
            border: 1px solid ${type === "success" ? "#10b981" : "#ef4444"};
            padding: 1rem 1.5rem;
            color: white;
            border-radius: 12px;
            backdrop-filter: blur(10px);
            animation: slideUp 0.3s ease;
            display: flex;
            align-items: center;
            gap: 1rem;
            box-shadow: 0 10px 20px rgba(0,0,0,0.3);
        `;
        const icon = type === "success" ? "checkmark-circle" : "alert-circle";
        toast.innerHTML = `<ion-icon name="${icon}" style="color: ${type === "success" ? "#10b981" : "#ef4444"}; font-size: 1.5rem;"></ion-icon> <span>${msg}</span>`;
        
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            toast.style.transition = '0.5s ease';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

    // -- Menü Yönlendirmeleri (Logo / Keşfet / Çok Sevilenler) --
    if (mainLogoLink) {
        mainLogoLink.addEventListener("click", (e) => {
            e.preventDefault();
            if(navDiscover) navDiscover.click();
        });
    }

    if (navTop) {
        navTop.addEventListener("click", (e) => {
            e.preventDefault();
            hideAllMainSections();
            if(recommendationsSection) recommendationsSection.style.display = "block";
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
            hideAllMainSections();
            if(heroSection) heroSection.style.display = "block";
            if(recommendationsSection) recommendationsSection.style.display = "block";
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

            hideAllMainSections();
            if(recommendationsSection) recommendationsSection.style.display = "block";
            navFavorites.classList.add("active");
            
            const sectionHeaderH2 = document.querySelector(".section-header h2");
            const sectionHeaderP = document.querySelector(".section-header p");
            if(sectionHeaderH2) sectionHeaderH2.innerHTML = '<ion-icon name="heart" style="color: #ef4444;"></ion-icon> Benim Kaydettiğim Modlar';
            if(sectionHeaderP) sectionHeaderP.innerHTML = 'Beğendiğin ve kalbine dokunan tüm modlar burada güvenle saklanıyor.';
            if(inputField) inputField.value = '';
            
            // Sunucudan favorileri en güncel haliyle çek
            try {
                const res = await fetch(`${apiBase}/api/user/favorites`, {
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
                const res = await fetch(`${apiBase}/api/user/favorites`, {
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

        // Gerçek API'ye istek at
        searchNexusMods(query);
    }

    async function searchNexusMods(query) {
        container.style.transition = '0.5s ease';
        container.style.opacity = '0';
        container.style.transform = 'translateY(20px)';
        
        try {
            currentGameDomain = gameSelectValue ? gameSelectValue.value : "all";
            
            const apiUrl = `${apiBase}/api/search?q=${encodeURIComponent(query)}&game=${currentGameDomain}`;
            console.log("🌐 İstek Atılıyor:", apiUrl);
            
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Sunucu Hatası (${response.status}): ${errorData.error || errorData.message || 'Bilinmeyen bir hata oluştu.'}`);
            }
            
            const data = await response.json();
            container.innerHTML = ''; 
            
            const modsArray = data.mods || []; 
            const activeQuery = (window.lastActiveQuery || "").toLowerCase();
            const aiQuery = (data.aiQuery || "").toLowerCase();

            modsArray.forEach(mod => {
                const title = (mod.name || mod.title || '').toLowerCase();
                const description = (mod.summary || mod.description || '').toLowerCase();
                let matchPercent = 0;

                if (mod.score) {
                    matchPercent = 75 + Math.min(Math.floor(mod.score * 4.5), 24);
                } else {
                    if (activeQuery && (title.includes(activeQuery) || description.includes(activeQuery))) {
                        matchPercent = 90 + (mod.mod_id % 9);
                    } else if (aiQuery && (title.includes(aiQuery) || description.includes(aiQuery))) {
                        matchPercent = 85 + (mod.mod_id % 10);
                    } else {
                        matchPercent = 70 + (mod.mod_id % 20);
                    }
                }
                mod.matchPercent = matchPercent;
            });

            modsArray.sort((a, b) => b.matchPercent - a.matchPercent);
            currentModsData = modsArray;
            currentModIndex = 0;

            if (Array.isArray(modsArray) && modsArray.length > 0) {
                renderMoreMods();
            } else {
                container.innerHTML = `<p style="color: #94a3b8; text-align: center; width: 100%; font-size: 1.2rem; margin-top: 2rem;">Yapay Zeka bu oyunda herhangi bir Nexus Modu bulamadı.</p>`;
                if(loadMoreBtn) loadMoreBtn.style.display = "none";
            }
            
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';
            
            const sectionHeaderH2 = document.querySelector(".section-header h2");
            const sectionHeaderP = document.querySelector(".section-header p");
            sectionHeaderH2.innerHTML = `<ion-icon name="sparkles-outline" style="color: #7c3aed;"></ion-icon> Yapay Zeka Arama Sonuçları`;
            
            let descriptionHTML = `Veritabanımızda 1000 mod taranarak en iyi sonuçlar listelendi.`;
            if (data.aiQuery) {
                descriptionHTML = `<ion-icon name="language-outline"></ion-icon> Yapay Zeka şunu aradı: <strong style="color: #7c3aed;">"${data.aiQuery}"</strong>`;
            }
            sectionHeaderP.innerHTML = descriptionHTML;
            
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
                                          Node.js sunucusunu terminalden (<code>node server.js</code>) başlattığınıza emin olun. <br/><br/>
                                          <strong>Hata detayı:</strong> ${error.message}
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
            const apiUrl = `${apiBase}/api/top-mods?game=${currentGameDomain}`;
            
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
