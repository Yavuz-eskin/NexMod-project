require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const Mod = require('./models/Mod');

const API_KEY = process.env.NEXUS_API_KEY;
const MONGO_URI = process.env.MONGO_URI;

// Projemizin yerel veri tabanını oluşturacağımız popüler oyunlar havuzu
const TOP_GAMES = [
    'skyrimspecialedition',
    'fallout4',
    'cyberpunk2077',
    'stardewvalley',
    'witcher3',
    'baldursgate3',
    'starcitizen',
    'palworld',
    'eldenring',
    'hogwartslegacy'
];

async function crawlMods() {
    if (!API_KEY || !MONGO_URI) {
        console.error("HATA: .env dosyasında NEXUS_API_KEY veya MONGO_URI bulunamadı!");
        return;
    }

    try {
        console.log("MongoDB Atlas'a bağlanılıyor...");
        await mongoose.connect(MONGO_URI);
        console.log("MongoDB bağlantısı başarılı!");
    } catch(err) {
        console.error("MongoDB bağlantı hatası:", err);
        return;
    }

    console.log("Nexus Crawler (Bot) başlatılıyor... Veritabanı toplanıyor, lütfen bekleyin.");
    
    let allMods = [];
    let seenIds = new Set();
    
    // Her bir oyun için Nexus API'sine bağlanıp verileri çekiyoruz
    for (const game of TOP_GAMES) {
        try {
            console.log(`[${game}] modları çekiliyor...`);
            // Her oyun için ayrı ayrı en yeni, güncellenen ve trend olan paketleri al
            const endpoints = [
                `https://api.nexusmods.com/v1/games/${game}/mods/trending.json`,
                `https://api.nexusmods.com/v1/games/${game}/mods/latest_added.json`,
                `https://api.nexusmods.com/v1/games/${game}/mods/latest_updated.json`
            ];
            
            for (const endpoint of endpoints) {
                // Hatalı istekleri göz ardı edip diğerlerine devam etmesini sağla
                const res = await axios.get(endpoint, {
                    headers: { 'accept': 'application/json', 'apikey': API_KEY }
                }).catch(e => { return {data: []}; }); 
                
                if (res.data && Array.isArray(res.data)) {
                    res.data.forEach(mod => {
                        // Aynı id'ye sahip olanları (Örn: Hem yeni hem trend olabilir) bir kere kaydet
                        const uniqueIdentifier = `${game}_${mod.mod_id}`;
                        if (!seenIds.has(uniqueIdentifier)) {
                            seenIds.add(uniqueIdentifier);
                            mod.domain_name = game; // Hangi oyunun verisi olduğunu damgala
                            allMods.push(mod);
                        }
                    });
                }
            }
        } catch(error) {
            console.error(`[${game}] çekilirken hata oluştu:`, error.message);
        }
    }
    
    // Mongoose kullanarak tüm modları MongoDB'ye sokuşturuyoruz
    // updateOne metodu ile duplicate ID hatalarını ignore edeceğiz (upsert)
    console.log(`Sunucuda toplanan ${allMods.length} eşsiz mod MongoDB Atlas veri tabanına işleniyor...`);
    let insertedCount = 0;
    
    for (const dataItem of allMods) {
        try {
            await Mod.updateOne(
                { domain_name: dataItem.domain_name, mod_id: dataItem.mod_id },
                { $set: dataItem },
                { upsert: true }
            );
            insertedCount++;
        } catch(e) {
            console.error(`Mod işlenirken hata (ID: ${dataItem.mod_id}):`, e.message);
        }
    }
    
    console.log('--------------------------------------------------');
    console.log(`✅ İşlem Tamamlandı! Toplam ${insertedCount} benzersiz mod MongoDB Atlas'a başarıyla kaydedildi.`);
    console.log('Artık sunucunuz bu kendi Bulut (Cloud) veri tabanı üzerinden ışık hızında arama yapabilecek!');
    
    process.exit(0);
}

crawlMods();
