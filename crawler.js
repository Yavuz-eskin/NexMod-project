require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.NEXUS_API_KEY;

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
    if (!API_KEY) {
        console.error("HATA: .env dosyasında NEXUS_API_KEY bulunamadı!");
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
    
    // Tüm verileri JSON dosyası olarak proje dizinine (Veri Tabanına) kaydet
    const dbPath = path.join(__dirname, 'mods_db.json');
    fs.writeFileSync(dbPath, JSON.stringify(allMods, null, 2));
    console.log('--------------------------------------------------');
    console.log(`✅ İşlem Tamamlandı! Toplam ${allMods.length} benzersiz mod 'mods_db.json' veri tabanına kaydedildi.`);
    console.log('Artık sunucunuz bu kendi veri tabanı üzerinden anında arama yapabilecek!');
}

crawlMods();
