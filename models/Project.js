const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: 100
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    maxlength: 500
  },
  apiKey: {
    type: String,
    unique: true,
    default: () => `th_${uuidv4().replace(/-/g, '')}`
  },
  sourceLocale: {
    type: String,
    required: true,
    default: 'en',
    trim: true
  },
  locales: {
    type: [String],
    default: ['en']
  }
}, {
  timestamps: true
});

// Auto-generate slug from name before validation
projectSchema.pre('validate', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

// Virtual: get translation progress (populated externally)
projectSchema.methods.getStats = async function () {
  const TranslationKey = mongoose.model('TranslationKey');
  const totalKeys = await TranslationKey.countDocuments({ projectId: this._id });

  const stats = {};
  for (const locale of this.locales) {
    const translatedCount = await TranslationKey.countDocuments({
      projectId: this._id,
      [`translations.${locale}`]: { $exists: true, $ne: '' }
    });
    stats[locale] = {
      translated: translatedCount,
      total: totalKeys,
      percentage: totalKeys > 0 ? Math.round((translatedCount / totalKeys) * 100) : 0
    };
  }
  return stats;
};

module.exports = mongoose.model('Project', projectSchema);
