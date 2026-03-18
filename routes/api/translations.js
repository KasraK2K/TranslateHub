const express = require('express');
const router = express.Router();
const TranslationKey = require('../../models/TranslationKey');
const Project = require('../../models/Project');
const { requireAuth } = require('../../middleware/auth');

function normalizeLocalKey(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidLocalKey(value) {
  return /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(value);
}

function buildFullKey(pageKey, key) {
  return `${pageKey}.${key}`;
}

function getPageSummary(page) {
  return {
    _id: page._id,
    name: page.name,
    pageKey: page.pageKey,
    description: page.description || ''
  };
}

// All translation management routes require authentication
router.use(requireAuth);

async function loadProjectAndPage(req, res, next) {
  try {
    const project = await Project.findById(req.params.projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const page = project.getPageById(req.params.pageId);
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    req.project = project;
    req.page = page;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function ensureProjectUnlocked(req, res, next) {
  try {
    const project = await Project.findById(req.params.projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.isLocked) {
      return res.status(423).json({ error: 'Unlock this project before changing translation keys' });
    }

    const page = project.getPageById(req.params.pageId);
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    req.project = project;
    req.page = page;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

function formatKeyDocument(doc, page) {
  const obj = doc.toObject();
  // Mongoose Map fields remain as Map objects after toObject(), which JSON.stringify
  // serializes as {} (empty), silently dropping all translation values. Convert explicitly.
  if (obj.translations instanceof Map) {
    obj.translations = Object.fromEntries(obj.translations);
  }
  return {
    ...obj,
    page: getPageSummary(page)
  };
}

function validateLocalKeyInput(key) {
  if (!key) return 'Key is required';
  if (key.includes('.')) return 'Use the page-local key only. Do not include the page prefix in the key.';
  if (!isValidLocalKey(key)) return 'Key may contain only lowercase letters, numbers, hyphens, and underscores';
  return null;
}

// GET /api/projects/:projectId/pages/:pageId/keys - List all translation keys for a page
router.get('/:projectId/pages/:pageId/keys', loadProjectAndPage, async (req, res) => {
  try {
    const { search } = req.query;
    const filter = { projectId: req.params.projectId, pageId: req.params.pageId };

    if (search) {
      filter.$or = [
        { key: { $regex: search, $options: 'i' } },
        { fullKey: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const keys = await TranslationKey.find(filter).sort({ key: 1 });
    res.json(keys.map((key) => formatKeyDocument(key, req.page)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects/:projectId/pages/:pageId/keys - Create a new translation key
router.post('/:projectId/pages/:pageId/keys', ensureProjectUnlocked, async (req, res) => {
  try {
    const key = normalizeLocalKey(req.body.key);
    const validationError = validateLocalKeyInput(key);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const translationKey = new TranslationKey({
      projectId: req.params.projectId,
      pageId: req.params.pageId,
      key,
      fullKey: buildFullKey(req.page.pageKey, key),
      description: String(req.body.description || '').trim(),
      translations: req.body.translations || {}
    });

    await translationKey.save();
    res.status(201).json(formatKeyDocument(translationKey, req.page));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: `Key '${req.body.key}' already exists in page '${req.page.name}'` });
    }
    res.status(400).json({ error: error.message });
  }
});

// POST /api/projects/:projectId/pages/:pageId/keys/bulk - Bulk create/update keys
router.post('/:projectId/pages/:pageId/keys/bulk', ensureProjectUnlocked, async (req, res) => {
  try {
    const { keys } = req.body;

    if (!Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ error: 'keys must be a non-empty array' });
    }

    const results = { created: 0, updated: 0, errors: [] };

    for (const item of keys) {
      const key = normalizeLocalKey(item && item.key);
      const validationError = validateLocalKeyInput(key);

      if (validationError) {
        results.errors.push({ key: item && item.key, error: validationError });
        continue;
      }

      try {
        const existing = await TranslationKey.findOne({
          projectId: req.params.projectId,
          pageId: req.params.pageId,
          key
        });

        if (existing) {
          if (item.translations) {
            for (const [locale, value] of Object.entries(item.translations)) {
              if (value === null || value === '') existing.translations.delete(locale);
              else existing.translations.set(locale, value);
            }
          }
          if (item.description !== undefined) existing.description = String(item.description || '').trim();
          existing.fullKey = buildFullKey(req.page.pageKey, key);
          await existing.save();
          results.updated++;
        } else {
          await TranslationKey.create({
            projectId: req.params.projectId,
            pageId: req.params.pageId,
            key,
            fullKey: buildFullKey(req.page.pageKey, key),
            description: String(item.description || '').trim(),
            translations: item.translations || {}
          });
          results.created++;
        }
      } catch (err) {
        results.errors.push({ key: item && item.key, error: err.message });
      }
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/projects/:projectId/pages/:pageId/keys/:keyId - Update a translation key
router.put('/:projectId/pages/:pageId/keys/:keyId', ensureProjectUnlocked, async (req, res) => {
  try {
    const translationKey = await TranslationKey.findOne({
      _id: req.params.keyId,
      projectId: req.params.projectId,
      pageId: req.params.pageId
    });

    if (!translationKey) {
      return res.status(404).json({ error: 'Translation key not found' });
    }

    if (req.body.key !== undefined) {
      const key = normalizeLocalKey(req.body.key);
      const validationError = validateLocalKeyInput(key);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }
      translationKey.key = key;
      translationKey.fullKey = buildFullKey(req.page.pageKey, key);
    }

    if (req.body.description !== undefined) translationKey.description = String(req.body.description || '').trim();
    if (req.body.translations) {
      for (const [locale, value] of Object.entries(req.body.translations)) {
        if (value === null || value === '') {
          translationKey.translations.delete(locale);
        } else {
          translationKey.translations.set(locale, value);
        }
      }
    }

    await translationKey.save();
    res.json(formatKeyDocument(translationKey, req.page));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: `Key '${req.body.key}' already exists in page '${req.page.name}'` });
    }
    res.status(400).json({ error: error.message });
  }
});

// PATCH /api/projects/:projectId/pages/:pageId/keys/:keyId/translate - Update single locale translation
router.patch('/:projectId/pages/:pageId/keys/:keyId/translate', ensureProjectUnlocked, async (req, res) => {
  try {
    const { locale, value } = req.body;

    if (!locale) {
      return res.status(400).json({ error: 'locale is required' });
    }

    const translationKey = await TranslationKey.findOne({
      _id: req.params.keyId,
      projectId: req.params.projectId,
      pageId: req.params.pageId
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
    res.json(formatKeyDocument(translationKey, req.page));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/projects/:projectId/pages/:pageId/keys/:keyId - Delete a translation key
router.delete('/:projectId/pages/:pageId/keys/:keyId', ensureProjectUnlocked, async (req, res) => {
  try {
    const result = await TranslationKey.findOneAndDelete({
      _id: req.params.keyId,
      projectId: req.params.projectId,
      pageId: req.params.pageId
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
