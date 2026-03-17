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
    
    // ----- BÖLÜM 2: DERİN TARAMA (Her Oyun İçin İlk 250 Modu Garantile) -----
    // Kotayı korumak için, veritabanında ZATEN KAYITLI modları es geçer!
    console.log(`\n>>> Derin Tarama (Deep Crawl) Başlıyor: 30 Oyun x 250 Mod Hedefi (Kota Korumalı)`);
    let deepInsertedCount = 0;
    
    for (const game of TOP_GAMES) {
        console.log(`[${game}] için ilk 250 mod garantisi kontrol ediliyor...`);
        let gameDeepAddedCount = 0;

        let validModsCount = 0; // Bu sayaç 250 olana kadar devam edecek
        let modId = 1;

        // Tam olarak 250 adet geçerli mod bulana kadar (veya sonsuz döngüyü önlemek için 1500 id denemesi bitene kadar)
        while (validModsCount < 250 && modId <= 1500) {
            // VERİTABANI: Bu ID veritabanımızda zaten var mı? Varsa API'ye hiç gidip kota harcama!
            const exists = await Mod.exists({ domain_name: game, mod_id: modId });
            if (exists) {
                validModsCount++; // Veritabanında zaten geçerli olarak kayıtlı
                modId++;
                continue; // Atla ve sonrakine geç
            }

            // Veritabanında yoksa, mecbur Nexus'un kapısını çalacağız
            const url = `https://api.nexusmods.com/v1/games/${game}/mods/${modId}.json`;
            try {
                const res = await axios.get(url, {
                    headers: { 'accept': 'application/json', 'apikey': API_KEY }
                });
                const mod = res.data;

                if (!mod.name || mod.name.trim() === '' || mod.status === 'hidden' || mod.status === 'not_published') {
                    await sleep(300);
                    modId++;
                    continue; // Bu Gizli/Bozuk bir mod, sayaç ASLA artmaz!
                }

                mod.domain_name = game;

                await Mod.updateOne(
                    { domain_name: mod.domain_name, mod_id: mod.mod_id },
                    { $set: mod },
                    { upsert: true }
                );

                validModsCount++; // Gerçekten başarılı bir mod çektik!
                gameDeepAddedCount++;
                deepInsertedCount++;

            } catch (error) {
                // Silinmiş/Premium veya 404 modları vb. dert etmeden atla
            }

            modId++;
            await sleep(500); // Saniyede 2 istek ile ban yemekten kurtuluruz
        }
        
        if(gameDeepAddedCount > 0) {
            console.log(`[${game}] oyununa ${gameDeepAddedCount} TANE YENİ (eksik) mod çekildi.`);
        }
    }
    
    console.log('--------------------------------------------------');
    console.log(`✅ İşlem Tamamlandı! Toplam İşlenen Yeni Modlar: ${insertedTrendCount + deepInsertedCount}`);
    console.log('Zamanlanmış Gece Botu Uyku Moduna Geçiyor...');
    
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
