const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');
const Mod = require('./models/Mod');
const crawlMods = require('./crawler');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Front-end (HTML/JS) dosyamızın bu Node.js sunucusuna istek atabilmesi için CORS aktif edilir
app.use(cors());

// Ön yüz dosyalarını (HTML, CSS, JS vb.) sunucudan servis et (Cloud dağıtımı için gerekli)
app.use(express.static(__dirname));

// MongoDB Database Bağlantısı
const MONGO_URI = process.env.MONGO_URI;
if (MONGO_URI) {
    mongoose.connect(MONGO_URI)
        .then(() => {
            console.log('MongoDB Atlas bağlantısı başarıyla kuruldu!');
            
            // Veritabanı bağlantısı başarılıysa ve cron ile zamanlanmış görev varsa
            // Her gece saat 03:00'te Nexus Mods veritabanından en güncel modları çekip kaydetmesi için programlanmış görev
            cron.schedule('0 3 * * *', async () => {
                console.log("⏰ Saat 03:00 Zamanlanmış Görev (Cron Job) Başlıyor...");
                console.log("-> Otomatik NexusMods Crawler/Robot devreye girdi!");
                await crawlMods();
                console.log("✅ Gece 03:00 senkronizasyonu tamamlandı.");
            });
            console.log('Zamanlanmış Robot Aktif: Her gece 03:00\'te yeni modlar veritabanına eklenecek.');
        })
        .catch(err => console.error('MongoDB Atlas yapılandırma veya bağlanma hatası:', err));
} else {
    console.error('MONGO_URI .env dosyasında bulunamadı!');
}

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
        let filterCondition = {};

        // 1. Önce "Karışık (all)" değilse ve spesifik bir Oyun seçilmişse sadece o oyunun modlarını süz
        if (gameDomain !== 'all') {
            filterCondition = {
                $or: [
                    { domain_name: gameDomain },
                    { category_name: gameDomain }
                ]
            };
        }

        // 2. Kullanıcının aradığı kelimeyi (query) bulutta arıyoruz (NLP/Metin Eşleştirme)
        const lowerQuery = query.toLowerCase();
        
        // Eğer aranan kelime 2 karakterden uzun veya eşitse filtrelemeyi yap
        if (lowerQuery.length >= 2) {
            // MongoDB'nin döküman tabanlı gelişmiş metin aramasını Regex ile simüle ediyoruz
            filterCondition.$or = filterCondition.$or || [];
            if(filterCondition.$or.length > 0){
                 filterCondition.$and = [
                     { $or: filterCondition.$or },
                     { $or: [
                        { name: { $regex: lowerQuery, $options: 'i' } },
                        { summary: { $regex: lowerQuery, $options: 'i' } },
                        { description: { $regex: lowerQuery, $options: 'i' } }
                     ]}
                 ];
                 delete filterCondition.$or;
            } else {
                 filterCondition.$or = [
                        { name: { $regex: lowerQuery, $options: 'i' } },
                        { summary: { $regex: lowerQuery, $options: 'i' } },
                        { description: { $regex: lowerQuery, $options: 'i' } }
                 ];
            }
        }
        
        // MongoDB'den filtreye uyan modları çekiyoruz (performans için sadece ilk 60'ı)
        let filteredMods = await Mod.find(filterCondition).limit(60).lean();

        // Eğer hiçbir kelimeyle eşleşmediyse veya arama çok kısaysa,
        // rastgele öne çıkan (en çok indirilen) vitrin modları gösterelim
        if (filteredMods.length === 0 || lowerQuery.length < 2) {
            // Eğer herhangi bir query yoksa en popüler 60 gönder
            let fallbackFilter = gameDomain !== 'all' ? { $or: [{ domain_name: gameDomain }, { category_name: gameDomain }] } : {};
            filteredMods = await Mod.find(fallbackFilter).limit(60).lean();
        }

        // Sonuçları her seferinde aralarında hafif karıştırarak listele
        filteredMods.sort(() => Math.random() - 0.5);

        res.json({ mods: filteredMods });

    } catch (error) {
        console.error("Bulut (MongoDB Atlas) Veritabanı Arama Hatası:");
        console.error(error.message);
        res.status(500).json({ error: 'Sunucu tarafında yerel veritabanı aranırken bir hata oluştu.' });
    }
});

// Yeni Eklenen "Çok Sevilenler" Menüsü için Endpoint (En Çok İndirilenleri Getirir)
app.get('/api/top-mods', async (req, res) => {
    const gameDomain = req.query.game || 'all';

    try {
        let filterCondition = {};

        if (gameDomain !== 'all') {
            filterCondition = {
                $or: [
                    { domain_name: gameDomain },
                    { category_name: gameDomain }
                ]
            };
        }

        // İndirme sayısına göre tersten (En yüksekten en düşüğe) sıralayıp ilk 60'ı alır
        let topMods = await Mod.find(filterCondition).sort({ mod_downloads: -1 }).limit(60).lean();

        res.json({ mods: topMods });

    } catch (error) {
        console.error("En Çok Sevilenler API Hatası:");
        console.error(error.message);
        res.status(500).json({ error: 'Popüler modlar çekilirken bir hata oluştu.' });
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
