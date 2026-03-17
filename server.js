const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
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
        // Önceden "crawler.js" ile çekip kaydettiğimiz kendi veri tabanımızı (mods_db.json) kullanıyoruz!
        const dbPath = path.join(__dirname, 'mods_db.json');
        
        let allMods = [];

        if (fs.existsSync(dbPath)) {
            const dbContent = fs.readFileSync(dbPath, 'utf8');
            allMods = JSON.parse(dbContent);
        } else {
            return res.status(500).json({ error: 'Yerel veritabanı (mods_db.json) bulunamadı. Lütfen önce crawler.js dosyasını çalıştırın.' });
        }

        // 1. Önce "Karışık (all)" değilse ve spesifik bir Oyun seçilmişse sadece o oyunun modlarını süz
        if (gameDomain !== 'all') {
            allMods = allMods.filter(mod => mod.domain_name === gameDomain || mod.category_name === gameDomain);
        }

        // 2. Kullanıcının aradığı kelimeyi (query) sitemizin yerel veritabanında arıyoruz (NLP/Metin Eşleştirme)
        const lowerQuery = query.toLowerCase();
        let filteredMods = allMods;
        
        // Eğer aranan kelime 2 karakterden uzun veya eşitse filtrelemeyi yap
        if (lowerQuery.length >= 2) {
            filteredMods = allMods.filter(mod => 
                (mod.name && mod.name.toLowerCase().includes(lowerQuery)) || 
                (mod.summary && mod.summary.toLowerCase().includes(lowerQuery)) ||
                (mod.description && mod.description.toLowerCase().includes(lowerQuery))
            );
        }
        
        // Eğer hiçbir kelimeyle eşleşmediyse veya sistem yeni açıldıysa, 
        // veri tabanındaki modlardan bir karmaşık liste yapıp vitrin gibi dökelim
        if (filteredMods.length === 0 || lowerQuery.length < 2) {
            filteredMods = allMods; 
        }

        // Sonuçları her seferinde aralarında hafif karıştırarak listele
        filteredMods.sort(() => Math.random() - 0.5);

        // Sistemin çok kasmasını engellemek için eğer geri dönen 300 sonuç falan varsa sadece ilk 60'ını (sayfalama ile) göster
        res.json({ mods: filteredMods.slice(0, 60) });

    } catch (error) {
        console.error("Yerel Veritabanı Arama Hatası:");
        console.error(error.message);
        res.status(500).json({ error: 'Sunucu tarafında yerel veritabanı aranırken bir hata oluştu.' });
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
