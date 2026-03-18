require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const Mod = require('./models/Mod');

const API_KEY = process.env.NEXUS_API_KEY;
const MONGO_URI = process.env.MONGO_URI;

// Hedef Oyunlar ve Taranacak Mod Aralığı (Her oyun için ayrı ayrı)
const TOP_GAMES = [
    'skyrimspecialedition',
    'fallout4',
    'cyberpunk2077',
    'stardewvalley',
    'witcher3',
    'baldursgate3' // isteğe göre eklenebilir
];
const START_ID = 1;
const END_ID = 150; // API kotasını anlık tüketmemek için ilk etapta her oyun için 150 mod seçiyoruz (150 * 6 = 900 istek yapar)
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

    console.log(`[Deep Crawler] Başlatıldı. Toplam ${TOP_GAMES.length} oyun taranacak.`);
    console.log(`Her oyun için ID Aralığı: ${START_ID} - ${END_ID}\n`);

    let totalInserted = 0;
    let totalFailed = 0;

    for (const game of TOP_GAMES) {
        console.log(`\n=============================================================`);
        console.log(`>>> SIRADAKİ OYUN: ${game.toUpperCase()}`);
        console.log(`=============================================================\n`);
        
        let gameInserted = 0;
        let gameFailed = 0;

        for (let currentId = START_ID; currentId <= END_ID; currentId++) {
            const url = `https://api.nexusmods.com/v1/games/${game}/mods/${currentId}.json`;
            
            try {
                // Sadece yüzde cinsinden bir bilgi verelim ki ekran çok karışmasın (isteğe bağlı)
                const res = await axios.get(url, {
                    headers: { 'accept': 'application/json', 'apikey': API_KEY }
                });

                const mod = res.data;

                // Gizlenmiş, silinmiş veya ismi olmayan modları atlıyoruz.
                if (!mod.name || mod.name.trim() === '' || mod.status === 'hidden' || mod.status === 'not_published') {
                    console.log(`[${game} - ID: ${currentId}] ✨ Atlandı (İsimsiz veya Gizli Mod).`);
                    continue;
                }

                // Gelen datada domain_name var mı kontrol et, yoksa biz ekleyelim
                mod.domain_name = mod.domain_name || game;

                // Truncate description to 500 characters for storage optimization
                if (mod.description && mod.description.length > 500) {
                    mod.description = mod.description.substring(0, 500);
                }

                // Veritabanına kaydet
                await Mod.updateOne(
                    { domain_name: mod.domain_name, mod_id: mod.mod_id },
                    { $set: mod },
                    { upsert: true }
                );

                console.log(`✅ [${game} - ID: ${currentId}] Kaydedildi: ${mod.name.substring(0, 30)}`);
                gameInserted++;
                totalInserted++;

            } catch (error) {
                // Eğer mod silinmişse 404, premium ise 403 vb. hatalar verebilir.
                if (error.response && error.response.status === 404) {
                    console.log(`❌ [${game} - ID: ${currentId}] Bulunamadı (Silinmiş olabilir).`);
                } else if (error.response && error.response.status === 403) {
                     console.log(`🔒 [${game} - ID: ${currentId}] Erişim izni yok (Premium).`);
                } else {
                    console.error(`⚠️ [${game} - ID: ${currentId}] Hata:`, error.message);
                }
                gameFailed++;
                totalFailed++;
            }

            // Nexus sunucusunu rahatsız etmemek ve bağlantının kopmaması için bekle !
            await sleep(DELAY_MS);
        }
        
        console.log(`\n🎉 [${game.toUpperCase()}] Bitti! Eklenen: ${gameInserted}, Atlanan/Hatalı: ${gameFailed}\n`);
    }

    console.log('--------------------------------------------------');
    console.log(`🚀 [Deep Crawler] İşlem Tamamlandı!`);
    console.log(`Veritabanına İşlenen TOPLAM Başarılı Mod Sayısı: ${totalInserted}`);
    console.log(`TOPLAM Bulunamayan / Atlanan / Hatalı Mod Sayısı: ${totalFailed}`);
    console.log('Sunucu bağlantısı kapatılıyor...');
    
    await mongoose.disconnect();
    process.exit(0);
}

deepCrawl();
