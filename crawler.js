require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const Mod = require('./models/Mod');

const API_KEY = process.env.NEXUS_API_KEY;
const MONGO_URI = process.env.MONGO_URI;

// Projemizin yerel veri tabanını oluşturacağımız popüler oyunlar havuzu dinamik olarak yüklenecektir.

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
    
    let TOP_GAMES = [];
    try {
        console.log("Nexus API'den oyunların listesi çekiliyor...");
        const gamesRes = await axios.get('https://api.nexusmods.com/v1/games.json', {
            headers: { 'accept': 'application/json', 'apikey': API_KEY }
        });
        
        // Sadece 500.000 (Yarım Milyon) ve üstü indirmesi olan Popüler Oyunları Filtreliyoruz!
        // Toplam dev oyunlar arasından EN popüler ilk 30 tanesini alıyoruz
        const popularGames = gamesRes.data
            .filter(g => g.downloads && g.downloads >= 500000)
            .sort((a, b) => b.downloads - a.downloads) // En çok indirilenden en aza sıralar
            .slice(0, 30); // Sadece En tepe 30 oyunu alır
            
        TOP_GAMES = popularGames.map(g => g.domain_name);
        console.log(`Filtreleme & Sıralama Tamamlandı: En popüler ${TOP_GAMES.length} oyun taranacak.`);
    } catch (err) {
        console.error("Oyun listesi çekilemedi, bot durduruluyor:", err.message);
        return;
    }

    // Bekleme fonskiyonumuz
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    let allMods = [];
    let seenIds = new Set();
    
    // ----- BÖLÜM 1: GÜNLÜK TREND MODLAR ve YENİLER (Oyun basina ~30-40 adet) -----
    for (const game of TOP_GAMES) {
        try {
            console.log(`\n[${game}] Trend Modları Çekiliyor...`);
            const endpoints = [
                `https://api.nexusmods.com/v1/games/${game}/mods/trending.json`,
                `https://api.nexusmods.com/v1/games/${game}/mods/latest_added.json`,
                `https://api.nexusmods.com/v1/games/${game}/mods/latest_updated.json`
            ];
            
            for (const endpoint of endpoints) {
                const res = await axios.get(endpoint, {
                    headers: { 'accept': 'application/json', 'apikey': API_KEY }
                }).catch(e => { return {data: []}; }); 
                
                await sleep(300);

                if (res.data && Array.isArray(res.data)) {
                    res.data.forEach(mod => {
                        if (!mod.name || mod.name.trim() === '') return;
                        
                        const uniqueIdentifier = `${game}_${mod.mod_id}`;
                        if (!seenIds.has(uniqueIdentifier)) {
                            seenIds.add(uniqueIdentifier);
                            mod.domain_name = game;
                            // Truncate description to 500 characters for storage optimization
                            if (mod.description && mod.description.length > 500) {
                                mod.description = mod.description.substring(0, 500);
                            }
                            allMods.push(mod);
                        }
                    });
                }
            }
        } catch(error) {
            console.error(`[${game}] Trendler çekilirken hata oluştu:`, error.message);
        }
    }

    // Trendleri MongoDB'ye Upsert edelim
    console.log(`\nSunucuda toplanan ${allMods.length} trend mod veritabanına işleniyor...`);
    let insertedTrendCount = 0;
    for (const dataItem of allMods) {
        try {
            await Mod.updateOne(
                { domain_name: dataItem.domain_name, mod_id: dataItem.mod_id },
                { $set: dataItem },
                { upsert: true }
            );
            insertedTrendCount++;
        } catch(e) {}
    }
    
    // ----- BÖLÜM 2: SÜREKLİ BÜYÜYEN DERİN TARAMA (Her Gece Her Oyun İçin +250 Yeni Mod) -----
    // Bu bölüm her oyunun veritabanındaki son kaldığı ID'yi bulur ve üzerine 250 yeni mod ekler.
    console.log(`\n>>> Derin Tarama Başlıyor: Her oyun için +250 yeni mod hedefleniyor...`);
    let deepInsertedCount = 0;
    
    for (const game of TOP_GAMES) {
        // 1. Bu oyun için veritabanındaki en yüksek (en son) mod_id'yi buluyoruz
        const lastMod = await Mod.findOne({ domain_name: game }).sort({ mod_id: -1 });
        let startId = lastMod ? lastMod.mod_id + 1 : 1;
        
        console.log(`[${game}] için tarama ID ${startId} noktasından başlıyor...`);
        let gameDeepAddedCount = 0;
        let currentId = startId;
        let attemptCount = 0; // Çok fazla boş ID varsa sonsuz döngü koruması (Max 2000 deneme)

        // Tam 250 tane başarılı yeni kayıt yapana kadar devam et
        while (gameDeepAddedCount < 250 && attemptCount < 2000) {
            attemptCount++;
            
            const url = `https://api.nexusmods.com/v1/games/${game}/mods/${currentId}.json`;
            try {
                const res = await axios.get(url, {
                    headers: { 'accept': 'application/json', 'apikey': API_KEY }
                });
                const mod = res.data;

                // Geçerli, yayında olan ve gizlenmemiş bir mod mu?
                if (mod.name && mod.name.trim() !== '' && mod.status !== 'hidden' && mod.status !== 'not_published') {
                    mod.domain_name = game;
                    
                    // Açıklama Metni Kısaltma (Storage Tasarrufu için Model'de de var ama burada da yapıyoruz)
                    if (mod.description && mod.description.length > 500) {
                        mod.description = mod.description.substring(0, 500);
                    }

                    await Mod.updateOne(
                        { domain_name: mod.domain_name, mod_id: mod.mod_id },
                        { $set: mod },
                        { upsert: true }
                    );

                    gameDeepAddedCount++;
                    deepInsertedCount++;
                }
            } catch (error) {
                // Eğer günlük 10.000 istek sınırı (429) dolduysa tüm robotu durdur!
                if (error.response && error.response.status === 429) {
                    console.error("⛔ KRİTİK UYARI: NexusMods Günlük (10.000) İstek Limiti Doldu! Tarama durduruluyor.");
                    return (insertedTrendCount + deepInsertedCount);
                }
                
                // 404 (Mod silinmiş) veya diğer hatalarda bir sonraki ID'ye geç
                if (error.response && (error.response.status === 404 || error.response.status === 403)) {
                     // Bunlar normal durumlar (silinmiş veya premium modlar)
                } else {
                    console.warn(`[${game} - ID: ${currentId}] Beklenmeyen hata:`, error.message);
                }
            }

            currentId++;
            await sleep(400); // API ban koruması (Nexus saniyede 5 istekten fazlasına kızabilir)
        }
        
        console.log(`[${game}] oyununa ${gameDeepAddedCount} TANE YENİ mod çekildi. (Son taranan ID: ${currentId-1})`);
    }
    
    console.log('--------------------------------------------------');
    console.log(`✅ Gece Senkronizasyonu Tamamlandı! Toplam İşlenen Yeni Mod: ${insertedTrendCount + deepInsertedCount}`);
    console.log('Zamanlanmış Robot Uyku Moduna Geçiyor...');
    
    return (insertedTrendCount + deepInsertedCount);

}

// Eğer bu dosya terminalden tek başına "node crawler.js" olarak çalıştırıldıysa process.exit çağır
if (require.main === module) {
    crawlMods().then(() => {
        process.exit(0);
    }).catch(err => {
        console.error(err);
        process.exit(1);
    });
}

// Eğer server.js gibi başka bir koddan çağrılırsa diye export et
module.exports = crawlMods;
