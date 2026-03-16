const express = require('express');
const router = express.Router();
const TranslationKey = require('../../models/TranslationKey');
const Project = require('../../models/Project');
const { requireAuth } = require('../../middleware/auth');

// All translation management routes require authentication
router.use(requireAuth);

// GET /api/projects/:projectId/keys - List all translation keys for a project
router.get('/:projectId/keys', async (req, res) => {
  try {
    const { locale, search } = req.query;
    const filter = { projectId: req.params.projectId };

    if (search) {
      filter.$or = [
        { key: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    let keys = await TranslationKey.find(filter).sort({ key: 1 });

    // If filtering by locale, only include untranslated keys
    if (locale === 'untranslated') {
      const project = await Project.findById(req.params.projectId);
      // This would need a target locale parameter too, keeping simple for now
    }

    res.json(keys);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects/:projectId/keys - Create a new translation key
router.post('/:projectId/keys', async (req, res) => {
  try {
    const { key, description, translations } = req.body;

    const translationKey = new TranslationKey({
      projectId: req.params.projectId,
      key,
      description,
      translations: translations || {}
    });

    await translationKey.save();
    res.status(201).json(translationKey);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'This key already exists in the project' });
    }
    res.status(400).json({ error: error.message });
  }
});

// POST /api/projects/:projectId/keys/bulk - Bulk create/update keys
router.post('/:projectId/keys/bulk', async (req, res) => {
  try {
    const { keys } = req.body; // Array of { key, description?, translations? }

    if (!Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ error: 'keys must be a non-empty array' });
    }

    const results = { created: 0, updated: 0, errors: [] };

    for (const item of keys) {
      try {
        const existing = await TranslationKey.findOne({
          projectId: req.params.projectId,
          key: item.key
        });

        if (existing) {
          // Merge translations
          if (item.translations) {
            for (const [locale, value] of Object.entries(item.translations)) {
              existing.translations.set(locale, value);
            }
          }
          if (item.description) existing.description = item.description;
          await existing.save();
          results.updated++;
        } else {
          await TranslationKey.create({
            projectId: req.params.projectId,
            key: item.key,
            description: item.description || '',
            translations: item.translations || {}
          });
          results.created++;
        }
      } catch (err) {
        results.errors.push({ key: item.key, error: err.message });
      }
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/projects/:projectId/keys/:keyId - Update a translation key
router.put('/:projectId/keys/:keyId', async (req, res) => {
  try {
    const translationKey = await TranslationKey.findOne({
      _id: req.params.keyId,
      projectId: req.params.projectId
    });

    if (!translationKey) {
      return res.status(404).json({ error: 'Translation key not found' });
    }

    const { key, description, translations } = req.body;

    if (key) translationKey.key = key;
    if (description !== undefined) translationKey.description = description;
    if (translations) {
      for (const [locale, value] of Object.entries(translations)) {
        if (value === null || value === '') {
          translationKey.translations.delete(locale);
        } else {
          translationKey.translations.set(locale, value);
        }
      }
    }

    await translationKey.save();
    res.json(translationKey);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PATCH /api/projects/:projectId/keys/:keyId/translate - Update single locale translation
router.patch('/:projectId/keys/:keyId/translate', async (req, res) => {
  try {
    const { locale, value } = req.body;

    if (!locale) {
      return res.status(400).json({ error: 'locale is required' });
    }

    const translationKey = await TranslationKey.findOne({
      _id: req.params.keyId,
      projectId: req.params.projectId
    });

    if (!translationKey) {
      return res.status(404).json({ error: 'Translation key not found' });
    }

    if (value === null || value === '') {
      translationKey.translations.delete(locale);
    } else {
      translationKey.translations.set(locale, value);
    }

    await translationKey.save();
    res.json(translationKey);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/projects/:projectId/keys/:keyId - Delete a translation key
router.delete('/:projectId/keys/:keyId', async (req, res) => {
  try {
    const result = await TranslationKey.findOneAndDelete({
      _id: req.params.keyId,
      projectId: req.params.projectId
    });

    if (!result) {
      return res.status(404).json({ error: 'Translation key not found' });
    }

    res.json({ message: 'Translation key deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
