const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');
const Mod = require('./models/Mod');
const User = require('./models/User');
const crawlMods = require('./crawler');
require('dotenv').config();

// Gerekli JWT ve Şifreleme Modülleri
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'nexmod_super_gizli_anahtar_123';

// Token Doğrulama Middleware'i
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"
    if (!token) return res.status(401).json({ error: 'Yetkisiz erişim.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Geçersiz veya süresi dolmuş token.' });
        req.user = user;
        next();
    });
};

// Gemini AI Yapılandırması (Eğer anahtar varsa hazır beklesin)
let genAI, model;
if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
}

// Temel Türkçe - İngilizce Mod Terimleri Sözlüğü (AI çalışmasa bile temel arama desteği için)
const TURKISH_TO_ENGLISH_MAP = {
    "kadın": "female woman girl lady character",
    "erkek": "male man boy character",
    "kılıç": "sword weapon blade",
    "zırh": "armor set plate",
    "ev": "house home player base",
    "grafik": "graphics enhancement visual textures overhaul",
    "gökyüzü": "skybox weather clouds atmosphere",
    "büyü": "magic spells sorcery",
    "canavar": "monster creature enemy",
    "silah": "weapon gun sword firearm",
    "vücut": "body replacer skin textures",
    "yüz": "face preset beauty skin",
    "saç": "hair hairstyle",
    "çıplak": "nude body naked replacer skin adult",
    "nü": "nude body naked adult"
};

async function translateQueryWithAI(userQuery) {
    const lowQuery = userQuery.toLowerCase().trim();
    
    // 1. Önce sözlükte var mı bak (Hızlı ve Kesin Sonuç)
    if (TURKISH_TO_ENGLISH_MAP[lowQuery]) {
        console.log(`📚 Sözlükten Bulundu: ${lowQuery} -> ${TURKISH_TO_ENGLISH_MAP[lowQuery]}`);
        return {
            detectedIntent: lowQuery.charAt(0).toUpperCase() + lowQuery.slice(1) + " Modları",
            englishKeywords: TURKISH_TO_ENGLISH_MAP[lowQuery],
            detectedGame: "all",
            sortBy: "default",
            aiResponse: `Arama teriminizi sözlükten hızlıca eşleştirdim: "${TURKISH_TO_ENGLISH_MAP[lowQuery]}". Sizin için en uygun modları listeliyorum!`
        };
    }

    // 2. Sözlükte yoksa Gemini AI'yı dene
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") {
        console.warn("⚠️ GEMINI_API_KEY eksik. AI çevirisi yapılamıyor. Lütfen .env dosyasını kontrol edin.");
        return {
            detectedIntent: "Standart Arama",
            englishKeywords: userQuery,
            detectedGame: "all",
            sortBy: "default",
            aiResponse: "Yapay zeka modülü şu anda çevrimdışı. Standart anahtar kelime araması yapılıyor."
        };
    }

    try {
        const prompt = `Sen NexMod sitesinin son derece zeki, konseptleri ve kullanıcı isteklerini anlayan yapay zeka arama asistanısın. 
        Kullanıcı Türkçe veya karışık bir dilde oyun modu arıyor veya oynamak istediği atmosferi/oynanış şeklini anlatıyor.
        
        Görevin:
        1. Kullanıcının tüm cümlesini, amacını ve istediği modu kullanma hissini derinlemesine anla (Semantik Konsept Genişletme).
        2. Sadece düz kelimeleri çevirme. Örneğin kullanıcı "gotik ve karanlık atmosfer" istiyorsa, bu etkiyi yaratacak gerçek mod konseptlerini (örn: sis, kasvetli hava durumu modları, zindan aydınlatmaları, koyu zırhlar) düşün. Bu konseptlerin NexusMods veritabanında en çok eşleşeceği İngilizce karşılıklarını (örn: 'somber bleak weather volumetric fog dark dungeons gothic grim') çıkartıp "englishKeywords" alanına ekle.
        3. Kullanıcının aradığı oyun türünü veya oyun adını tespit et ("detectedGame" alanına 'skyrimspecialedition', 'fallout4', 'falloutnewvegas', 'oblivion', 'stardewvalley', 'cyberpunk2077', 'baldursgate3' değerlerinden birini veya algılamadıysan 'all' değerini koy).
        4. Kullanıcının sıralama tercihini tespit et: "en popüler", "en çok indirilen" diyorsa "downloads"; "en yeni", "son çıkan" diyorsa "newest"; aksi halde "default" değerini "sortBy" alanına koy.
        5. Kullanıcıya yönelik, aramayı nasıl yorumladığını ve neden bu modları seçtiğini açıklayan çok samimi, sıcak ve profesyonel Türkçe bir yapay zeka asistan mesajı yaz ("aiResponse" alanı).
        
        Çıktıyı kesinlikle şu JSON formatında vermelisin:
        {
          "detectedIntent": "Kullanıcının amacının kısa Türkçe özeti (örn: Karanlık Gotik Atmosfer)",
          "englishKeywords": "İlişkili tüm İngilizce mod terimleri ve konseptleri (boşluklarla ayrılmış)",
          "detectedGame": "skyrimspecialedition | fallout4 | falloutnewvegas | oblivion | stardewvalley | cyberpunk2077 | baldursgate3 | all",
          "sortBy": "downloads | newest | default",
          "aiResponse": "Kullanıcıya samimi ve açıklayıcı Türkçe yapay zeka mesajı"
        }

        Kullanıcı Sorgusu: "${userQuery}"`;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        });
        
        const response = await result.response;
        let rawText = response.text().trim();
        
        // Markdown kod bloklarını temizle
        if (rawText.startsWith("```")) {
            rawText = rawText.replace(/^```[a-zA-Z]*/, "");
            rawText = rawText.replace(/```$/, "");
        }
        rawText = rawText.trim();
        
        const parsed = JSON.parse(rawText);
        return {
            detectedIntent: parsed.detectedIntent || "Özel Arama",
            englishKeywords: parsed.englishKeywords || userQuery,
            detectedGame: parsed.detectedGame || "all",
            sortBy: parsed.sortBy || "default",
            aiResponse: parsed.aiResponse || "Aramanız için en uygun konsept modları listelendi."
        };
    } catch (error) {
        console.error("AI Çeviri Hatası:", error);
        return {
            detectedIntent: "Standart Arama (Hata Sonrası)",
            englishKeywords: userQuery,
            detectedGame: "all",
            sortBy: "default",
            aiResponse: "Arama sırasında yapay zeka servisinde bir sorun oluştu, ancak standart kelime eşleştirme ile sonuçlar getiriliyor."
        };
    }
}

// Front-end (HTML/JS) dosyamızın bu Node.js sunucusuna istek atabilmesi için CORS aktif edilir
app.use(cors());
// Gelen JSON verilerini okuyabilmek için
app.use(express.json());

// Ön yüz dosyalarını (React derlenmiş dosyaları) sunucudan servis et
const path = require('path');
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Robot / Crawler Durum Takibi ve Güvenli Çalıştırıcısı
let isCrawlerRunning = false;

async function runCrawlerSafe() {
    if (isCrawlerRunning) return;
    isCrawlerRunning = true;
    try {
        console.log("🤖 Arka planda Robot/Crawler başlatılıyor...");
        await crawlMods();
        console.log("✅ Arka planda Robot/Crawler başarıyla tamamlandı.");
    } catch (err) {
        console.error("❌ Robot çalışırken beklenmedik hata oluştu:", err);
    } finally {
        isCrawlerRunning = false;
    }
}

// MongoDB Database Bağlantısı
const MONGO_URI = process.env.MONGO_URI;
if (MONGO_URI) {
    mongoose.connect(MONGO_URI)
        .then(() => {
            console.log('MongoDB Atlas bağlantısı başarıyla kuruldu!');
            
            // Ücretsiz barındırma ve UptimeRobot uyumluluğu için kendi İç-Saatimizi (Internal Cron) kullanıyoruz
            cron.schedule('0 3 * * *', async () => {
                console.log("⏰ Saat 03:00 Zamanlanmış Görev (Cron Job) Başlıyor...");
                console.log("-> Otomatik NexusMods Crawler/Robot devreye girdi!");
                await runCrawlerSafe();
                console.log("✅ Gece 03:00 senkronizasyonu tamamlandı.");
            });
            console.log('Zamanlanmış Robot Aktif: Her gece 03:00\'te yeni modlar veritabanına ucretsiz sekilde eklenecek!');
        })
        .catch(err => console.error('MongoDB Atlas yapılandırma veya bağlanma hatası:', err));
} else {
    console.error('MONGO_URI .env dosyasında bulunamadı!');
}

// /api/search adresine gelen istekleri Nexus API'sine yönlendir
app.get('/api/search', async (req, res) => {
    trackSearch(); // Günlük arama sayacını artır
    const query = req.query.q;
    const gameDomain = req.query.game || 'all'; // Varsayılan oyun: hepsi

    // NexusMods apiKey .env dosyasında bulunur
    const apiKey = process.env.NEXUS_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'NexusMods API anahtarı .env dosyasında bulunamadı.' });
    }

    try {
        let filterCondition = {};
        let aiResult = null;

        // 1. Kullanıcının aradığı kelimeyi (query) bulutta arıyoruz (NLP/Metin Eşleştirme)
        let lowerQuery = query ? query.toLowerCase().trim() : "";

        console.log(`🔍 Arama İsteği: q="${query}", game="${gameDomain}"`);

        // EĞER sorgu girildiyse AI devreye girsin
        if (lowerQuery.length >= 2) {
            console.log(`🤖 AI Sorgu Analizi Başlıyor: "${lowerQuery}"`);
            aiResult = await translateQueryWithAI(lowerQuery);
            console.log(`✅ AI Sonucu:`, aiResult);
        }

        // 2. Oyun Filtresini belirle
        let targetGame = gameDomain;
        // Eğer kullanıcı genel arama (all) seçtiyse ama AI belirli bir oyunu algıladıysa, otomatik oraya daralt
        if (targetGame === 'all' && aiResult && aiResult.detectedGame && aiResult.detectedGame !== 'all') {
            targetGame = aiResult.detectedGame;
            console.log(`🎯 AI Oyunu Otomatik Algıladı: ${targetGame}`);
        }

        if (targetGame !== 'all') {
            filterCondition = {
                $or: [
                    { domain_name: targetGame },
                    { category_name: targetGame }
                ]
            };
        }

        // 3. Anahtar kelimeleri MongoDB arama filtresine ekle
        let searchKeywords = lowerQuery;
        if (aiResult && aiResult.englishKeywords) {
            // Orijinal sorgu ile genişletilmiş İngilizce anahtar kelimeleri birleştir
            searchKeywords = `${lowerQuery} ${aiResult.englishKeywords}`;
        }

        if (searchKeywords && searchKeywords.length >= 2) {
            filterCondition.$text = { $search: searchKeywords };
        }
        
        console.log("🛠️ MongoDB Filtresi:", JSON.stringify(filterCondition));

        // 4. Sıralama Koşulunu belirle
        let sortCondition = {};
        if (aiResult && aiResult.sortBy === 'downloads') {
            sortCondition = { mod_downloads: -1 };
        } else if (aiResult && aiResult.sortBy === 'newest') {
            sortCondition = { created_timestamp: -1 };
        } else if (filterCondition.$text) {
            // Varsayılan olarak text search score ile sırala
            sortCondition = { score: { $meta: "textScore" } };
        } else {
            sortCondition = { mod_downloads: -1 };
        }

        // MongoDB'den filtreye uyan modları çekiyoruz (performans için sadece ilk 1000'i)
        let filteredMods;
        if (filterCondition.$text) {
            filteredMods = await Mod.find(
                filterCondition,
                { score: { $meta: "textScore" } }
            ).sort(sortCondition).limit(1000).lean();
        } else {
            filteredMods = await Mod.find(filterCondition).sort(sortCondition).limit(1000).lean();
        }

        console.log(`📊 Bulunan Mod Sayısı: ${filteredMods.length}`);

        // 5. Her mod için yama ve hata düzeltme modlarını (fixMods) veritabanında paralel olarak bul (İlk 50 mod için)
        const modsWithFixes = await Promise.all(
            filteredMods.slice(0, 50).map(async (mod) => {
                const baseName = mod.name.split(' ').slice(0, 3).join(' ').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                if (baseName.length > 4) {
                    const fixMods = await Mod.find({
                        domain_name: mod.domain_name,
                        mod_id: { $ne: mod.mod_id },
                        name: { $regex: new RegExp(`^${baseName}.*(fix|patch|bugfix|update|compatibility|uyum|yama)`, "i") }
                    }).limit(3).select('mod_id name domain_name').lean();
                    mod.fixMods = fixMods;
                } else {
                    mod.fixMods = [];
                }
                return mod;
            })
        );

        const finalMods = [
            ...modsWithFixes,
            ...filteredMods.slice(50).map(m => {
                m.fixMods = [];
                return m;
            })
        ];

        res.json({ 
            mods: finalMods, 
            aiQuery: aiResult ? aiResult.englishKeywords : lowerQuery,
            aiMetadata: aiResult ? {
                detectedIntent: aiResult.detectedIntent,
                sortBy: aiResult.sortBy,
                detectedGame: aiResult.detectedGame,
                aiResponse: aiResult.aiResponse
            } : null
        });

    } catch (error) {
        console.error("❌ Arama Hatası Detayı:");
        console.error(error);
        res.status(500).json({ error: 'Veritabanı araması sırasında sunucu hatası oluştu.', message: error.message });
    }
});

// Bugün yapılan arama sayısını hafızada tut (sunucu yeniden başlayana kadar)
let dailySearchCount = 0;
let lastResetDate = new Date().toDateString();

function trackSearch() {
    const today = new Date().toDateString();
    if (today !== lastResetDate) {
        dailySearchCount = 0;
        lastResetDate = today;
    }
    dailySearchCount++;
}

// İstatistikler Endpointi - Gerçek zamanlı MongoDB verileri
app.get('/api/stats', async (req, res) => {
    try {
        const [totalUsers, totalMods, recentMods, gameStats] = await Promise.all([
            User.countDocuments(),
            Mod.countDocuments(),
            Mod.find().sort({ _id: -1 }).limit(10).lean(),
            Mod.aggregate([
                { $group: { _id: "$domain_name", count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ])
        ]);
        res.json({
            totalUsers,
            totalMods,
            dailySearches: dailySearchCount,
            recentMods,
            gameStats,
            isCrawlerRunning,
            geminiStatus: !!process.env.GEMINI_API_KEY
        });
    } catch (error) {
        console.error('İstatistik hatası:', error.message);
        res.status(500).json({ error: 'İstatistikler alınamadı.' });
    }
});

// Robotu Manuel Tetikleme Endpointi (POST) - Sadece Admin Yetkisine Sahip Kullanıcılar
app.post('/api/admin/run-crawler', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Yetkisiz Erişim! Bu işlem için yönetici yetkilerine sahip olmalısınız.' });
    }

    if (isCrawlerRunning) {
        return res.status(400).json({ error: 'Robot zaten şu anda arka planda çalışıyor.' });
    }
    
    // Arka planda asenkron olarak başlat (HTTP isteğini bloke etmemek için await kullanmıyoruz!)
    runCrawlerSafe();
    
    res.json({ message: 'Robot başarıyla arka planda başlatıldı! Sistem İstatistiklerinden veya Ayarlar sekmesinden takip edebilirsiniz.' });
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

        // İndirme sayısına göre tersten (En yüksekten en düşüğe) sıralayıp ilk 1000'i alır
        let topMods = await Mod.find(filterCondition).sort({ mod_downloads: -1 }).limit(1000).lean();

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

        // 0.5 Milyon (500,000)'dan az indirmesi olan oyunları sistemden komple siliyoruz.
        const popularGamesOnly = response.data.filter(game => game.downloads && game.downloads >= 500000);
        
        // Hepsini frontend'e yollayalım (Frontend alfabetik veya indirme sayısına göre sıralıyor)
        res.json(popularGamesOnly);

    } catch (error) {
        console.error("Nexus API'den oyunları çekerken hata oluştu:", error.message);
        res.status(500).json({ error: 'Sunucu tarafında oyunlar çekilirken bir hata oluştu.' });
    }
});

// --- KULLANICI GİRİŞ / KAYIT SİSTEMİ EKLENTİSİ ---

// Kayıt Ol Endpointi
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password || username.length < 3 || password.length < 6) {
            return res.status(400).json({ error: 'Kullanıcı adı en az 3, şifre en az 6 karakter olmalıdır.' });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Bu kullanıcı adı zaten alınmış.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword, favorites: [] });
        await newUser.save();

        const token = jwt.sign({ id: newUser._id, username: newUser.username, role: newUser.role }, JWT_SECRET, { expiresIn: '30d' });
        res.status(201).json({ 
            token, 
            username: newUser.username, 
            favorites: newUser.favorites, 
            avatarSeed: newUser.avatarSeed,
            preferences: newUser.preferences,
            role: newUser.role
        });
    } catch (err) {
        res.status(500).json({ error: 'Kayıt olurken bir hata oluştu.' });
    }
});

// Giriş Yap Endpointi
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ error: 'Kullanıcı bulunamadı.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Hatalı şifre.' });
        }

        const token = jwt.sign({ id: user._id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ 
            token, 
            username: user.username, 
            favorites: user.favorites, 
            avatarSeed: user.avatarSeed || "",
            preferences: user.preferences,
            role: user.role
        });
    } catch (err) {
        res.status(500).json({ error: 'Giriş yapılırken sunucu hatası.' });
    }
});
// Favorileri Çekme
app.get('/api/user/favorites', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
        res.json({ favorites: user.favorites });
    } catch (error) {
        res.status(500).json({ error: 'Favoriler alınamadı.' });
    }
});

// Favoriye Ekle / Çıkar
app.post('/api/user/favorites', authenticateToken, async (req, res) => {
    try {
        const { modData } = req.body;
        if (!modData || !modData.mod_id) return res.status(400).json({ error: 'Geçersiz mod verisi.' });

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

        // Önce favorilerde var mı kontrol et
        const existingIndex = user.favorites.findIndex(f => f.mod_id === modData.mod_id);
        
        if (existingIndex >= 0) {
            // Varsa Çıkart
            user.favorites.splice(existingIndex, 1);
        } else {
            // Yoksa Ekle
            user.favorites.push(modData);
        }
        
        // MongoDB'ye kaydet 
        // (Şema Mixed türü güncellemeleri algılamakta zorlanabilir, markModified diyelim)
        user.markModified('favorites');
        await user.save();

        res.json({ message: 'Favoriler güncellendi', favorites: user.favorites });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Favori kaydetme hatası.' });
    }
});

// Şifre Değiştirme
app.post('/api/user/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id);
        
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Mevcut şifre hatalı.' });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        res.json({ message: 'Şifre başarıyla güncellendi.' });
    } catch (err) {
        res.status(500).json({ error: 'Şifre güncellenirken bir hata oluştu.' });
    }
});

// Tercihleri Güncelleme
app.post('/api/user/preferences', authenticateToken, async (req, res) => {
    try {
        const { preferences } = req.body;
        const user = await User.findById(req.user.id);
        user.preferences = { ...user.preferences, ...preferences };
        user.markModified('preferences');
        await user.save();
        res.json({ message: 'Tercihler güncellendi.', preferences: user.preferences });
    } catch (err) {
        res.status(500).json({ error: 'Tercihler kaydedilemedi.' });
    }
});

// Hesabı Silme
app.post('/api/user/delete-account', authenticateToken, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.user.id);
        res.json({ message: 'Hesap başarıyla silindi.' });
    } catch (err) {
        res.status(500).json({ error: 'Hesap silinirken hata oluştu.' });
    }
});

// Profil Bilgilerini Güncelleme (İsim ve Avatar)
app.post('/api/user/update-profile', authenticateToken, async (req, res) => {
    try {
        const { newUsername, avatarSeed } = req.body;
        const user = await User.findById(req.user.id);

        if (newUsername && newUsername !== user.username) {
            // İsim değişecekse başkası almış mı kontrol et
            const existing = await User.findOne({ username: newUsername });
            if (existing) return res.status(400).json({ error: 'Bu kullanıcı adı zaten alınmış.' });
            user.username = newUsername;
        }

        if (avatarSeed !== undefined) {
            user.avatarSeed = avatarSeed;
        }

        await user.save();
        
        // Yeni token üret çünkü username değişmiş olabilir (JWT payload'da username var)
        const newToken = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
        
        res.json({ 
            message: 'Profil güncellendi.', 
            token: newToken, 
            username: user.username, 
            avatarSeed: user.avatarSeed 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Profil güncellenemedi.' });
    }
});

// React Router için tüm bilinmeyen yolları index.html'e yönlendir (Catch-all)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`NexMod Arka Plan (Node.js) Sunucusu Çalışıyor! (Port: ${PORT})`);
    console.log(`Frontend'ten istek atmak için: http://localhost:${PORT}/api/search?q=arananKelime`);
});
