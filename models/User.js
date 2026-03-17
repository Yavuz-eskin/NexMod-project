const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: [3, 'Kullanıcı adı en az 3 karakter olmalıdır']
    },
    password: {
        type: String,
        required: true,
        minlength: [6, 'Şifre en az 6 karakter olmalıdır']
    },
    favorites: {
        type: [mongoose.Schema.Types.Mixed], // Mod objelerini direkt dizide tutacağız (NoSQL denormalization)
        default: []
    },
    preferences: {
        type: mongoose.Schema.Types.Mixed,
        default: { darkMode: true, language: 'tr' }
    },
    avatarSeed: {
        type: String,
        default: ""
    }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
