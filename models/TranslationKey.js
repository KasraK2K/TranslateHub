const mongoose = require('mongoose');

function isValidLocalKey(value) {
  return /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(String(value || '').trim().toLowerCase());
}

const translationKeySchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  pageId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  key: {
    type: String,
    required: [true, 'Translation key is required'],
    trim: true,
    maxlength: 255,
    lowercase: true,
    validate: {
      validator: isValidLocalKey,
      message: 'Key may contain only lowercase letters, numbers, hyphens, and underscores'
    }
  },
  fullKey: {
    type: String,
    required: true,
    trim: true,
    maxlength: 356
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

translationKeySchema.pre('validate', function (next) {
  this.key = String(this.key || '').trim().toLowerCase();
  this.fullKey = String(this.fullKey || '').trim().toLowerCase();
  next();
});

translationKeySchema.index({ projectId: 1, pageId: 1, key: 1 }, { unique: true });
translationKeySchema.index({ projectId: 1, fullKey: 1 }, { unique: true });
translationKeySchema.index({ projectId: 1, pageId: 1, fullKey: 1 });

module.exports = mongoose.model('TranslationKey', translationKeySchema);
