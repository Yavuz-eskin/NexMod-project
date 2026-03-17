const mongoose = require('mongoose');

const ModSchema = new mongoose.Schema({
    mod_id: { type: Number, required: true },
    domain_name: { type: String, required: true }, // e.g. 'skyrimspecialedition'
    category_name: { type: String }, // same as domain_name or sub-category
    name: { type: String, required: true },
    title: { type: String },
    summary: { type: String },
    description: { type: String },
    author: { type: String },
    picture_url: { type: String },
    mod_downloads: { type: Number, default: 0 },
    mod_unique_downloads: { type: Number, default: 0 },
    created_timestamp: { type: Number },
    updated_timestamp: { type: Number }
});

// A compound index to ensure uniqueness across different games
ModSchema.index({ domain_name: 1, mod_id: 1 }, { unique: true });

// Text indices for robust search functionality
ModSchema.index({ name: 'text', summary: 'text', description: 'text' });

module.exports = mongoose.model('Mod', ModSchema);
