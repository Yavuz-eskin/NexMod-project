require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const Mod = require('./models/Mod');

const API_KEY = process.env.NEXUS_API_KEY;
const MONGO_URI = process.env.MONGO_URI;

// Hedef Oyun ve Taranacak Mod Aralığı (ID 1 den başlayarak 300'e kadar)
const TARGET_GAME = 'skyrimspecialedition';
const START_ID = 1;
const END_ID = 200; // API kotasını anlık tüketmemek için ilk etapta 200 mod seçiyoruz
const DELAY_MS = 1000; // Saniyede 1 istek (1000ms). Nexus Mods limitlerine takılmamak/ban yememek için bekleme süresi

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function deepCrawl() {
    if (!API_KEY || !MONGO_URI) {
        console.error("HATA: .env dosyasında API_KEY veya MONGO_URI bulunamadı!");
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

    console.log(`[Deep Crawler] Başlatıldı. Hedef Oyun: ${TARGET_GAME}, ID Aralığı: ${START_ID} - ${END_ID}`);
    let insertedCount = 0;
    let failedCount = 0;

    for (let currentId = START_ID; currentId <= END_ID; currentId++) {
        const url = `https://api.nexusmods.com/v1/games/${TARGET_GAME}/mods/${currentId}.json`;
        
        try {
            console.log(`[ID: ${currentId}] modu çekiliyor...`);
            const res = await axios.get(url, {
                headers: { 'accept': 'application/json', 'apikey': API_KEY }
            });

            const mod = res.data;

            // Gizlenmiş, silinmiş veya ismi olmayan modları atlıyoruz.
            if (!mod.name || mod.name.trim() === '' || mod.status === 'hidden' || mod.status === 'not_published') {
                console.log(`[ID: ${currentId}] Atlandı (İsimsiz veya Gizli Mod).`);
                continue;
            }

            // Gelen datada domain_name var mı kontrol et, yoksa biz ekleyelim
            mod.domain_name = mod.domain_name || TARGET_GAME;

            // Veritabanına kaydet
            await Mod.updateOne(
                { domain_name: mod.domain_name, mod_id: mod.mod_id },
                { $set: mod },
                { upsert: true }
            );

            console.log(`✅ [ID: ${currentId}] Başarıyla veritabanına eklendi/güncellendi: ${mod.name.substring(0, 30)}`);
            insertedCount++;

        } catch (error) {
            // Eğer mod silinmişse 404, premium ise 403 vb. hatalar verebilir.
            if (error.response && error.response.status === 404) {
                console.log(`❌ [ID: ${currentId}] Bulunamadı (Silinmiş olabilir).`);
            } else if (error.response && error.response.status === 403) {
                 console.log(`🔒 [ID: ${currentId}] Erişim izni yok (Yetişkin içerik veya Premium olabilir).`);
            } else {
                console.error(`⚠️ [ID: ${currentId}] Hata:`, error.message);
            }
            failedCount++;
        }

        // Nexus sunucusunu rahatsız etmemek ve bağlantının kopmaması için bekle !
        await sleep(DELAY_MS);
    }

    console.log('--------------------------------------------------');
    console.log(`🚀 [Deep Crawler] İşlem Tamamlandı!`);
    console.log(`Veritabanına İşlenen Başarılı Mod Sayısı: ${insertedCount}`);
    console.log(`Bulunamayan / Atlanan / Hatalı Mod Sayısı: ${failedCount}`);
    console.log('Sunucu bağlantısı kapatılıyor...');
    
    await mongoose.disconnect();
    process.exit(0);
}

deepCrawl();
