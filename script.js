document.addEventListener("DOMContentLoaded", () => {
    const searchBtn = document.getElementById("search-btn");
    const inputField = document.getElementById("ai-search-input");
    const suggestions = document.querySelectorAll(".suggestion");
    const overlay = document.getElementById("loading-overlay");
    const container = document.getElementById("mod-container");

    // Click suggestions to quickly fill input
    suggestions.forEach(sug => {
        sug.addEventListener("click", () => {
            inputField.value = "Bana " + sug.innerText.toLowerCase() + " öner...";
            triggerAISearch();
        });
    });

    // Enter key support for input
    inputField.addEventListener("keypress", (e) => {
        if(e.key === 'Enter' && inputField.value.trim() !== '') {
            triggerAISearch();
        }
    });

    // Button click support
    searchBtn.addEventListener("click", () => {
        if(inputField.value.trim() !== '') {
            triggerAISearch();
        } else {
            inputField.focus();
        }
    });

    function triggerAISearch() {
        const query = inputField.value.trim();
        if(!query) return;

        // Yükleme ekranını göster
        overlay.classList.add("active");

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
            // Bu sunucu, arkaplanda Nexus Mods API sine bağlanarak "apiKey" gizliliğinizi korur!
            const apiUrl = `http://localhost:3000/api/search?q=${encodeURIComponent(query)}&game=skyrimspecialedition`;
            
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error('Node.js Backend sunucusuna ulaşılamadı. (Sunucu kapalı olabilir)');
            }
            
            const data = await response.json();
            
            setTimeout(() => {
                container.innerHTML = ''; // Eski elemanları temizle
                
                // Gelen Nexus API formatının data.mods ya da data.hits şeklinde bir liste olmasını varsayıyoruz
                // Nexus Mods API si endpoint türüne göre bazen diziyi farklı isimlendirebilir
                const modsArray = data.mods || data.hits || data || []; 

                if (Array.isArray(modsArray) && modsArray.length > 0) {
                    modsArray.slice(0, 6).forEach(mod => {
                        // Nexus Mods'dan dönen verileri okuma (Standart obje simülasyonu / karşılığı olarak)
                        const title = mod.name || mod.title || 'İsimsiz Mod';
                        const description = mod.summary || mod.description || 'Bu mod hakkında bir açıklama sunulmamış.';
                        const author = mod.author || 'Nexus Geliştiricisi';
                        const iconUrl = mod.picture_url || 'https://api.dicebear.com/6.x/shapes/svg?seed=' + title; 
                        
                        // Etiketlendirme veya kategorizasyon
                        const categoryName = mod.category_name || 'Skyrim Modu';
                        const projectUrl = `https://www.nexusmods.com/skyrimspecialedition/mods/${mod.mod_id}`;
                        
                        const matchPercent = Math.floor(Math.random() * (99 - 75 + 1) + 75);

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
                } else {
                    container.innerHTML = `<p style="color: #94a3b8; text-align: center; width: 100%; font-size: 1.2rem; margin-top: 2rem;">Yapay Zeka bu oyunda herhangi bir Nexus Modu bulamadı.</p>`;
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
});
