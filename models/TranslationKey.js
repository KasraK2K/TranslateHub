const mongoose = require('mongoose');

const translationKeySchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  key: {
    type: String,
    required: [true, 'Translation key is required'],
    trim: true,
    maxlength: 255
  },
  description: {
    type: String,
    default: '',
    maxlength: 500
  },
  // Map of locale -> translated string, e.g. { "en": "Hello", "fr": "Bonjour" }
  translations: {
    type: Map,
    of: String,
    default: new Map()
  }
}, {
  timestamps: true
});

// Compound unique index: one key per project
translationKeySchema.index({ projectId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('TranslationKey', translationKeySchema);
