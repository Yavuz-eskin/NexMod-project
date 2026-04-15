require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const Mod = require('./models/Mod');

const API_KEY = process.env.NEXUS_API_KEY;
const MONGO_URI = process.env.MONGO_URI;

/**
 * Optimizasyonlu NexusMods Crawler (Bot)
 * 1. Geleceğe (henüz olmayan ID'lere) istek atıp kotayı harcamaz (Tavan ID kontrolü).
 * 2. Eğer o gün yeni mod yoksa, veritabanındaki boşlukları (eski modları) doldurur (Gap Filler).
 * 3. 10.000 API kotalı bir günde maksimum veriyi (7000+) çekebilmeyi hedefler.
 */
async function crawlMods() {
    if (!API_KEY || !MONGO_URI) {
        console.error("HATA: .env dosyasında NEXUS_API_KEY veya MONGO_URI bulunamadı!");
        return;
    }

    try {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(MONGO_URI);
            console.log("MongoDB bağlantısı başarılı!");
        }
    } catch (err) {
        console.error("MongoDB bağlantı hatası:", err);
        return;
    }

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const HEADERS = { 'accept': 'application/json', 'apikey': API_KEY };

    // 1. Oyun Havuzu: Manuel Belirlenen Oyunlar
    const GAME_LIMITS = {
        'skyrimspecialedition': 7000,
        'fallout4': 500,
        'falloutnewvegas': 500,
        'oblivion': 500,
        'stardewvalley': 500,
        'cyberpunk2077': 500,
        'baldursgate3': 500
    };
    const TOP_GAMES = Object.keys(GAME_LIMITS);
    console.log(`Hedeflenen ${TOP_GAMES.length} oyun taranacak.`);

    let globalRequests = 0;
    const MAX_DAILY_REQUESTS = 10000; // Limit 10,000 yapıldı
    let totalInserted = 0;

    for (const game of TOP_GAMES) {
        if (globalRequests >= MAX_DAILY_REQUESTS) {
            console.log("⚠️ Günlük toplam limitine (10,000) ulaşıldı. Tarama kesiliyor.");
            break;
        }

        console.log(`\n>>> [${game.toUpperCase()}] Taraması Başlıyor...`);

        try {
            // A. Nexus'taki en son modun ID'sini bul (Ceiling/Tavan ID)
            const latestAddedRes = await axios.get(`https://api.nexusmods.com/v1/games/${game}/mods/latest_added.json`, { headers: HEADERS });
            globalRequests++;
            const nexusMaxId = (latestAddedRes.data && latestAddedRes.data.length > 0) ? latestAddedRes.data[0].mod_id : 1000000;

            // B. Veritabanımızdaki bu oyun için en yüksek ID'yi bul (Forward Scan başlangıcı)
            const dbLastMod = await Mod.findOne({ domain_name: game }).sort({ mod_id: -1 });
            let dbMaxId = dbLastMod ? dbLastMod.mod_id : 0;

            console.log(` - Nexus Tavan: ${nexusMaxId}, Bizim Max: ${dbMaxId}`);

            // C. Tarama Limitleri
            let currentId;
            let requestsPerGameLimit = GAME_LIMITS[game] || 500;
            let requestsForThisGame = 0;
            let addedForGame = 0;
            let failureStreak = 0;

            let scanDirection = 1;

            if (dbMaxId >= nexusMaxId) {
                console.log(` ! Oyun zaten en güncel ID'ye ulaşmış. Geriye dönük tarama (Backward Scan) aktif.`);
                currentId = Math.floor(Math.random() * nexusMaxId);
                scanDirection = -1;
            } else {
                currentId = dbMaxId + 1;
                scanDirection = 1;
            }

            // Her oyun için ayrılan request limitini (tarama sayısını) kontrol ediyoruz
            while (requestsForThisGame < requestsPerGameLimit && failureStreak < 200 && globalRequests < MAX_DAILY_REQUESTS) {
                if (currentId > nexusMaxId) {
                    currentId = Math.floor(Math.random() * (nexusMaxId * 0.5));
                }
                if (currentId <= 0) {
                    currentId = Math.floor(Math.random() * nexusMaxId);
                }

                // Daha önce eklenmiş mi kontrolü
                const alreadyHave = await Mod.exists({ domain_name: game, mod_id: currentId });
                if (alreadyHave) {
                    currentId += scanDirection;
                    failureStreak = 0; // Veritabanında mod bulunduğunda streak'i sıfırla ki boşuna durmasın
                    continue;
                }

                try {
                    const modUrl = `https://api.nexusmods.com/v1/games/${game}/mods/${currentId}.json`;
                    const res = await axios.get(modUrl, { headers: HEADERS });
                    globalRequests++;
                    requestsForThisGame++;
                    
                    const modData = res.data;
                    if (modData.name && modData.status !== 'hidden' && modData.status !== 'not_published') {
                        modData.domain_name = game;
                        if (modData.description && modData.description.length > 500) {
                            modData.description = modData.description.substring(0, 500);
                        }

                        await Mod.updateOne(
                            { domain_name: game, mod_id: modData.mod_id },
                            { $set: modData },
                            { upsert: true }
                        );
                        addedForGame++;
                        totalInserted++;
                        failureStreak = 0;
                    }
                } catch (err) {
                    globalRequests++;
                    requestsForThisGame++;
                    if (err.response && err.response.status === 429) {
                        console.error("⛔ [KRİTİK] 429 Limit Hatası! Robot duruyor.");
                        return totalInserted;
                    }
                    if (err.response && (err.response.status === 404 || err.response.status === 403)) {
                        failureStreak++;
                    }
                }

                currentId += scanDirection;
                await sleep(350); 
            }
            console.log(` ✅ [${game}] bitti. Tarama: ${requestsForThisGame}, Eklenen: ${addedForGame}, Toplam global: ${globalRequests}`);

        } catch (gameErr) {
            console.warn(` [${game}] işlenirken hata oluştu:`, gameErr.message);
        }
    }

    console.log('--------------------------------------------------');
    console.log(`✅ Senkronizasyon Bitti! Yeni Eklenen Toplam Mod: ${totalInserted}`);
    console.log(`Harcanan Toplam Kota: ${globalRequests} / 10,000`);

    return totalInserted;
}

// Direk çalıştırma desteği (Cron veya Terminal)
if (require.main === module) {
    crawlMods().then((count) => {
        console.log(`🤖 Robot işini bitirdi. (${count} mod)`);
        process.exit(0);
    }).catch(err => {
        console.error("Robot beklenmedik bir şekilde durdu:", err);
        process.exit(1);
    });
}

module.exports = crawlMods;
