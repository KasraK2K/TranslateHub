const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

function toTitleCase(value) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getLocaleDisplayName(code) {
  const normalized = String(code || '').trim();
  if (!normalized) return 'Unknown';

  try {
    if (normalized.includes('-')) {
      const [language, ...rest] = normalized.split('-');
      const regionOrScript = rest.join('-');
      const languageName = new Intl.DisplayNames(['en'], { type: 'language' }).of(language.toLowerCase());
      const regionName = regionOrScript
        ? new Intl.DisplayNames(['en'], { type: regionOrScript.length === 4 ? 'script' : 'region' }).of(
            regionOrScript.length === 4 ? regionOrScript : regionOrScript.toUpperCase()
          )
        : '';

      if (languageName && regionName) {
        return `${languageName} (${regionName})`;
      }
    }

    const languageName = new Intl.DisplayNames(['en'], { type: 'language' }).of(normalized.toLowerCase());
    if (languageName) return languageName;
  } catch (error) {
    // Fall through to string formatting.
  }

  return toTitleCase(normalized);
}

function normalizeLocales(locales, sourceLocale) {
  const normalizedSource = String(sourceLocale || 'en').trim() || 'en';
  const uniqueLocales = new Map();

  for (const locale of Array.isArray(locales) ? locales : []) {
    const code = String(typeof locale === 'string' ? locale : locale && locale.code || '').trim();
    if (!code) continue;

    const providedName = typeof locale === 'string' ? '' : String(locale.name || '').trim();
    uniqueLocales.set(code, {
      code,
      name: providedName || getLocaleDisplayName(code)
    });
  }

  if (!uniqueLocales.has(normalizedSource)) {
    uniqueLocales.set(normalizedSource, {
      code: normalizedSource,
      name: getLocaleDisplayName(normalizedSource)
    });
  }

  return Array.from(uniqueLocales.values());
}

const localeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  }
}, { _id: false });

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
    type: [localeSchema],
    default: []
  }
}, {
  timestamps: true
});

// Auto-generate slug from name before validation
projectSchema.pre('validate', function (next) {
  this.sourceLocale = String(this.sourceLocale || 'en').trim() || 'en';
  this.locales = normalizeLocales(this.locales, this.sourceLocale);

  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

// Helper: get array of locale codes
projectSchema.methods.getLocaleCodes = function () {
  return this.locales.map(l => l.code);
};

// Helper: get locale name by code
projectSchema.methods.getLocaleName = function (code) {
  const locale = this.locales.find(l => l.code === code);
  return locale ? locale.name : code;
};

// Virtual: get translation progress
projectSchema.methods.getStats = async function () {
  const TranslationKey = mongoose.model('TranslationKey');
  const totalKeys = await TranslationKey.countDocuments({ projectId: this._id });

  const stats = {};
  for (const locale of this.locales) {
    const translatedCount = await TranslationKey.countDocuments({
      projectId: this._id,
      [`translations.${locale.code}`]: { $exists: true, $ne: '' }
    });
    stats[locale.code] = {
      name: locale.name,
      translated: translatedCount,
      total: totalKeys,
      percentage: totalKeys > 0 ? Math.round((translatedCount / totalKeys) * 100) : 0
    };
  }
  return stats;
};

module.exports = mongoose.model('Project', projectSchema);
