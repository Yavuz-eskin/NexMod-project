const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Front-end (HTML/JS) dosyamızın bu Node.js sunucusuna istek atabilmesi için CORS aktif edilir
app.use(cors());

// /api/search adresine gelen istekleri Nexus API'sine yönlendir
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    const gameDomain = req.query.game || 'skyrimspecialedition'; // Varsayılan oyun: Skyrim SE

    if (query !== '' && query.length < 2) {
        // En azından 2 karakter olabilir ya da boş olabilir
    }

    // NexusMods apiKey .env dosyasında bulunur
    const apiKey = process.env.NEXUS_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'NexusMods API anahtarı .env dosyasında bulunamadı.' });
    }

    try {
        /*
          NOT: Nexus Mods V1 REST API'sinde doğrudan kelime ile mod arama yeteneği (search keyword) bulunmuyor.
          Bu nedenle "Trending" (Popüler) ve "Latest" (En Yeni) modları çekip Node.js tarafında kendimiz filtreliyoruz
          (Yapay Zeka arama deneyimi sunabilmek için).
        */
        
        let allMods = [];

        if (gameDomain === 'all') {
            // "Hiçbiri" seçildiyse popüler birkaç oyundan karışık trend modları çekelim
            const topGames = ['skyrimspecialedition', 'fallout4', 'cyberpunk2077', 'stardewvalley'];
            
            const requests = topGames.map(game => 
                axios.get(`https://api.nexusmods.com/v1/games/${game}/mods/trending.json`, {
                    headers: { 'accept': 'application/json', 'apikey': apiKey }
                }).catch(e => ({ data: [] }))
            );
            
            const results = await Promise.all(requests);
            
            results.forEach((res, index) => {
                if(res.data && Array.isArray(res.data)) {
                    res.data.forEach(mod => {
                        mod.category_name = topGames[index]; // Hangi oyundan geldiğini bildirmek için
                        allMods.push(mod);
                    });
                }
            });
            
            // Sadece trendleri karıştırarak (shuffle) gösterelim
            allMods.sort(() => Math.random() - 0.5);
        } else {
            const trendingRes = await axios.get(`https://api.nexusmods.com/v1/games/${gameDomain}/mods/trending.json`, {
                headers: { 'accept': 'application/json', 'apikey': apiKey }
            });
            
            const latestRes = await axios.get(`https://api.nexusmods.com/v1/games/${gameDomain}/mods/latest_added.json`, {
                headers: { 'accept': 'application/json', 'apikey': apiKey }
            });
            
            const updatedRes = await axios.get(`https://api.nexusmods.com/v1/games/${gameDomain}/mods/latest_updated.json`, {
                headers: { 'accept': 'application/json', 'apikey': apiKey }
            });

            // Üç listeyi birleştir
            allMods = [...trendingRes.data, ...latestRes.data, ...updatedRes.data];
        }
        
        // Tekrarlanan modları filtrele (aynı mod hem yeni, güncellenmiş hem trend olabilir)
        const uniqueMods = [];
        const seenIds = new Set();
        for (const mod of allMods) {
            if(!seenIds.has(mod.mod_id)) {
                seenIds.add(mod.mod_id);
                uniqueMods.push(mod);
            }
        }

        // Kullanıcının aramasına (query) göre arkaplanda küçük bir yapay zeka/filtre simülasyonu:
        const lowerQuery = query.toLowerCase();
        let filteredMods = uniqueMods.filter(mod => 
            (mod.name && mod.name.toLowerCase().includes(lowerQuery)) || 
            (mod.summary && mod.summary.toLowerCase().includes(lowerQuery)) ||
            (mod.description && mod.description.toLowerCase().includes(lowerQuery))
        );
        
        // Eğer aranan kelime hiç veriyle eşleşmediyse, boş dönmesin diye en azından 10-12 popüler mod önerelim
        // (Sonuçta yapay zekamız 'benzer' şeyler de önermeli!)
        if (filteredMods.length === 0) {
            filteredMods = uniqueMods; 
        }

        res.json({ mods: filteredMods });

    } catch (error) {
        console.error("Nexus API'den veri çekerken hata oluştu:");
        console.error(error.message);
        
        // Eğer 401 hatası aldıysa API Key yanlıştır.
        if(error.response && error.response.status === 401) {
            res.status(401).json({ error: "API Anahtarı Geçersiz veya Yetkisiz!" });
        } else {
             res.status(500).json({ error: 'Sunucu tarafında modlar çekilirken bir hata oluştu.' });
        }
    }
});

// Tüm oyunları çekmek için yeni endpoint
app.get('/api/games', async (req, res) => {
    const apiKey = process.env.NEXUS_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'NexusMods API anahtarı .env dosyasında bulunamadı.' });
    }

    try {
        const response = await axios.get('https://api.nexusmods.com/v1/games.json', {
            headers: { 'accept': 'application/json', 'apikey': apiKey }
        });

        // İstersek tüm listeyi (binlerce oyun olabilir), ya da çok oynanan oyunları yollayabiliriz.
        // Hepsini frontend'e yollayalım, frontend alfabetik sıralayabilir
        res.json(response.data);

    } catch (error) {
        console.error("Nexus API'den oyunları çekerken hata oluştu:", error.message);
        res.status(500).json({ error: 'Sunucu tarafında oyunlar çekilirken bir hata oluştu.' });
    }
});

app.listen(PORT, () => {
    console.log(`NexMod Arka Plan (Node.js) Sunucusu Çalışıyor! (Port: ${PORT})`);
    console.log(`Frontend'ten istek atmak için: http://localhost:${PORT}/api/search?q=arananKelime`);
});
