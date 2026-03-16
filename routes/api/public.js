const express = require('express');
const router = express.Router();
const apiKeyAuth = require('../../middleware/apiKeyAuth');
const TranslationKey = require('../../models/TranslationKey');

/**
 * PUBLIC API - These endpoints are used by client applications
 * to fetch translations at runtime. All require X-API-Key header.
 */

// GET /api/v1/translations/:locale - Get all translations for a locale
router.get('/translations/:locale', apiKeyAuth, async (req, res) => {
  try {
    const { locale } = req.params;
    const project = req.project;
    const localeCodes = project.getLocaleCodes();

    if (!localeCodes.includes(locale)) {
      return res.status(404).json({ error: `Locale '${locale}' not found in project` });
    }

    const keys = await TranslationKey.find({ projectId: project._id });

    const translations = {};
    for (const key of keys) {
      const value = key.translations.get(locale);
      if (value) {
        translations[key.key] = value;
      } else {
        // Fallback to source locale
        const fallback = key.translations.get(project.sourceLocale);
        if (fallback) {
          translations[key.key] = fallback;
        }
      }
    }

    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      locale,
      localeName: project.getLocaleName(locale),
      projectId: project._id,
      translations
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/translations - Get all translations for all locales
router.get('/translations', apiKeyAuth, async (req, res) => {
  try {
    const project = req.project;
    const keys = await TranslationKey.find({ projectId: project._id });

    const result = {};
    for (const locale of project.locales) {
      result[locale.code] = {};
      for (const key of keys) {
        const value = key.translations.get(locale.code);
        if (value) {
          result[locale.code][key.key] = value;
        }
      }
    }

    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      projectId: project._id,
      locales: project.locales,
      sourceLocale: project.sourceLocale,
      translations: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/locales - Get available locales for the project
router.get('/locales', apiKeyAuth, async (req, res) => {
  try {
    res.json({
      sourceLocale: req.project.sourceLocale,
      locales: req.project.locales
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
