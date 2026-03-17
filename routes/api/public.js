const express = require('express');
const router = express.Router();
const apiKeyAuth = require('../../middleware/apiKeyAuth');
const TranslationKey = require('../../models/TranslationKey');

function buildTranslationPayload(keys, locale, sourceLocale, format) {
  const translations = {};

  for (const key of keys) {
    const translationValue = key.translations.get(locale);
    const fallbackValue = key.translations.get(sourceLocale);
    const outputKey = format === 'full' ? key.fullKey : key.key;
    const value = translationValue || fallbackValue;
    if (value) translations[outputKey] = value;
  }

  return translations;
}

function getPage(project, pageKey) {
  return project.getPageByKey(pageKey);
}

router.get('/pages', apiKeyAuth, async (req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      projectId: req.project._id,
      pages: req.project.pages.map((page) => ({
        _id: page._id,
        name: page.name,
        pageKey: page.pageKey,
        description: page.description || ''
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/pages/:pageKey/translations/:locale - Get page translations for a locale
router.get('/pages/:pageKey/translations/:locale', apiKeyAuth, async (req, res) => {
  try {
    const { locale, pageKey } = req.params;
    const format = req.query.format === 'full' ? 'full' : 'local';
    const project = req.project;
    const page = getPage(project, pageKey);
    const localeCodes = project.getLocaleCodes();

    if (!page) {
      return res.status(404).json({ error: `Page '${pageKey}' not found in project` });
    }

    if (!localeCodes.includes(locale)) {
      return res.status(404).json({ error: `Locale '${locale}' not found in project` });
    }

    const keys = await TranslationKey.find({ projectId: project._id, pageId: page._id }).sort({ key: 1 });

    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      locale,
      localeName: project.getLocaleName(locale),
      projectId: project._id,
      pageId: page._id,
      pageKey: page.pageKey,
      pageName: page.name,
      translations: buildTranslationPayload(keys, locale, project.sourceLocale, format)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/v1/pages/:pageKey/translations - Get page translations for all locales
router.get('/pages/:pageKey/translations', apiKeyAuth, async (req, res) => {
  try {
    const format = req.query.format === 'full' ? 'full' : 'local';
    const project = req.project;
    const page = getPage(project, req.params.pageKey);

    if (!page) {
      return res.status(404).json({ error: `Page '${req.params.pageKey}' not found in project` });
    }

    const keys = await TranslationKey.find({ projectId: project._id, pageId: page._id }).sort({ key: 1 });
    const result = {};

    for (const locale of project.locales) {
      result[locale.code] = buildTranslationPayload(keys, locale.code, project.sourceLocale, format);
    }

    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      projectId: project._id,
      pageId: page._id,
      pageKey: page.pageKey,
      pageName: page.name,
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
