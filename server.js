const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');
const Mod = require('./models/Mod');
const crawlMods = require('./crawler');
require('dotenv').config();

// Gerekli JWT ve Şifreleme Modülleri
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'nexmod_super_gizli_anahtar_123';

// Gemini AI Yapılandırması (Eğer anahtar varsa hazır beklesin)
let genAI, model;
if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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
        return TURKISH_TO_ENGLISH_MAP[lowQuery];
    }

    // 2. Sözlükte yoksa Gemini AI'yı dene
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") {
        console.warn("⚠️ GEMINI_API_KEY eksik. AI çevirisi yapılamıyor. Lütfen .env dosyasını kontrol edin.");
        return userQuery;
    }

    try {
        const prompt = `Sen NexMod sitesinin zeki arama asistanısın. Kullanıcı Türkçe veya karışık bir dilde oyun modu arıyor. 
        Görevin: Kullanıcının ne aramak istediğini anla ve bunu NexusMods veritabanında en iyi sonucu verecek profesyonel İngilizce mod terimlerine çevir.
        Geniş kapsamlı düşün; mesela "kadın" aranıyorsa "female, woman, beauty, character" gibi ilgili terimleri de ekle.
        Sadece İngilizce karşılıklarını (virgülle ayırarak veya boşlukla) döndür, açıklama yapma.
        
        Kullanıcı Sorgusu: "${userQuery}"`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");
    } catch (error) {
        console.error("AI Çeviri Hatası:", error);
        return userQuery;
    }
}

// Front-end (HTML/JS) dosyamızın bu Node.js sunucusuna istek atabilmesi için CORS aktif edilir
app.use(cors());
// Gelen JSON verilerini okuyabilmek için
app.use(express.json());

// Ön yüz dosyalarını (HTML, CSS, JS vb.) sunucudan servis et (Cloud dağıtımı için gerekli)
app.use(express.static(__dirname));

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
                await crawlMods();
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
        let lowerQuery = query.toLowerCase();
        let aiEnhancedQuery = lowerQuery;

        // EĞER sorgu Türkçe karakterler içeriyorsa veya kullanıcı "ne istediğini" anlatıyorsa AI devreye girsin
        if (lowerQuery.length >= 2) {
            console.log(`🤖 AI Sorgu Analizi Başlıyor: "${lowerQuery}"`);
            aiEnhancedQuery = await translateQueryWithAI(lowerQuery);
            console.log(`✅ AI Sonucu: "${aiEnhancedQuery}"`);
        }
        
        // Eğer aranan kelime 2 karakterden uzun veya eşitse filtrelemeyi yap
        if (aiEnhancedQuery.length >= 2) {
            // Hem orijinal sorguyu hem AI çevirisini kullanarak daha geniş bir havuzda ara
            filterCondition.$text = { $search: `${lowerQuery} ${aiEnhancedQuery}` };
        }
        
        // MongoDB'den filtreye uyan modları çekiyoruz (performans için sadece ilk 1000'i)
        // Text search score (relevance) ekliyoruz ve buna göre sıralıyoruz
        let filteredMods = await Mod.find(
            filterCondition,
            { score: { $meta: "textScore" } }
        ).sort({ score: { $meta: "textScore" } }).limit(1000).lean();

        // Sonuçları her seferinde aralarında hafif karıştırarak listele (Eğer arama puanları çok yakınsa çeşitlilik sağlar)
        // filteredMods = filteredMods.sort(() => Math.random() - 0.5);

        res.json({ 
            mods: filteredMods, 
            aiQuery: aiEnhancedQuery // İstemciye neyi aradığımızı da söyleyelim
        });

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
const User = require('./models/User');

// Kayıt Ol Endpointi
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password || username.length < 3 || password.length < 5) {
            return res.status(400).json({ error: 'Kullanıcı adı en az 3, şifre en az 5 karakter olmalıdır.' });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Bu kullanıcı adı zaten alınmış.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword, favorites: [] });
        await newUser.save();

        const token = jwt.sign({ id: newUser._id, username: newUser.username }, JWT_SECRET, { expiresIn: '30d' });
        res.status(201).json({ token, username: newUser.username, favorites: newUser.favorites, avatarSeed: newUser.avatarSeed });
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

        const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ token, username: user.username, favorites: user.favorites, avatarSeed: user.avatarSeed || "" });
    } catch (err) {
        res.status(500).json({ error: 'Giriş yapılırken sunucu hatası.' });
    }
});

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

app.listen(PORT, () => {
    console.log(`NexMod Arka Plan (Node.js) Sunucusu Çalışıyor! (Port: ${PORT})`);
    console.log(`Frontend'ten istek atmak için: http://localhost:${PORT}/api/search?q=arananKelime`);
});
