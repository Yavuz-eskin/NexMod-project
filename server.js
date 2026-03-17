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

    if (!query) {
        return res.status(400).json({ error: 'Lütfen aranacak bir kelime girin (query gerekli)' });
    }

    // NexusMods apiKey .env dosyasında bulunur
    const apiKey = process.env.NEXUS_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'NexusMods API anahtarı .env dosyasında bulunamadı.' });
    }

    try {
        /*
          NOT: Nexus Mods V1 API'sinde doğrudan kelime ile arama (string search) endpoint'i her zaman tam açık değildir.
          Burada bir "proxy" örneği olarak, eğer böyle bir arama yapıldığını varsayarsak veya yapıyı nasıl kurduğunu göstermek için yazılmıştır.
          Eğer API v1 'search' parametresini destekliyorsa (veya GraphQL v2 altyapısını kullanırsan) burayı güvende çalıştırabilirsin.
        */
        const response = await axios.get(`https://api.nexusmods.com/v1/games/${gameDomain}/mods`, {
            params: {
                search: query // Kelime arama
            },
            headers: {
                'accept': 'application/json',
                'apikey': apiKey // Sizin özel API anahtarınız sunucu tarafında koruma altında!
            }
        });

        // NexusMods'dan gelen cevabı tekrar kendi sitemize (frontend) döndürürüz
        res.json(response.data);

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

app.listen(PORT, () => {
    console.log(`NexMod Arka Plan (Node.js) Sunucusu Çalışıyor! (Port: ${PORT})`);
    console.log(`Frontend'ten istek atmak için: http://localhost:${PORT}/api/search?q=arananKelime`);
});
