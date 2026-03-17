const express = require('express');
const router = express.Router();
const Project = require('../../models/Project');
const TranslationKey = require('../../models/TranslationKey');
const { requireAuth } = require('../../middleware/auth');

function normalizePageKey(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidPageKey(value) {
  return /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(value);
}

async function getProjectWithPassword(projectId) {
  return Project.findById(projectId).select('+projectPassword');
}

function getPageSummary(page) {
  return {
    _id: page._id,
    name: page.name,
    pageKey: page.pageKey,
    description: page.description || ''
  };
}

async function getPageKeyCount(projectId, pageId) {
  return TranslationKey.countDocuments({ projectId, pageId });
}

// All dashboard project routes require authentication
router.use(requireAuth);

// GET /api/projects - List all projects
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    const payload = await Promise.all(projects.map(async (project) => ({
      ...project.toObject(),
      stats: await project.getStats()
    })));
    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects - Create a new project
router.post('/', async (req, res) => {
  try {
    const { name, description, sourceLocale, locales, projectPassword } = req.body;

    if (!projectPassword || projectPassword.length < 6) {
      return res.status(400).json({ error: 'Project password must be at least 6 characters' });
    }

    const project = new Project({
      name,
      description,
      sourceLocale: sourceLocale || 'en',
      locales: locales || [{ code: sourceLocale || 'en', name: 'English' }],
      pages: [],
      projectPassword
    });

    await project.save();
    res.status(201).json(project);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'A project with this name already exists' });
    }
    res.status(400).json({ error: error.message });
  }
});

// GET /api/projects/:projectId/pages - List pages in a project
router.get('/:projectId/pages', async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const pages = await Promise.all(project.pages.map(async (page) => ({
      ...getPageSummary(page),
      keyCount: await getPageKeyCount(project._id, page._id)
    })));

    res.json(pages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects/:projectId/pages - Create a page
router.post('/:projectId/pages', async (req, res) => {
  try {
    const project = await getProjectWithPassword(req.params.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.isLocked) {
      return res.status(423).json({ error: 'Unlock this project before changing pages' });
    }

    const name = String(req.body.name || '').trim();
    const pageKey = normalizePageKey(req.body.pageKey);
    const description = String(req.body.description || '').trim();

    if (!name) {
      return res.status(400).json({ error: 'Page name is required' });
    }

    if (!pageKey) {
      return res.status(400).json({ error: 'Page key is required' });
    }

    if (!isValidPageKey(pageKey)) {
      return res.status(400).json({ error: 'Page key may contain only lowercase letters, numbers, hyphens, and underscores' });
    }

    if (project.hasPageKey(pageKey)) {
      return res.status(409).json({ error: `Page key '${pageKey}' already exists in this project` });
    }

    project.pages.push({ name, pageKey, description });
    await project.save();

    const createdPage = project.pages[project.pages.length - 1];
    res.status(201).json({ ...getPageSummary(createdPage), keyCount: 0 });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/projects/:projectId/pages/:pageId - Update a page
router.put('/:projectId/pages/:pageId', async (req, res) => {
  try {
    const project = await getProjectWithPassword(req.params.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.isLocked) {
      return res.status(423).json({ error: 'Unlock this project before changing pages' });
    }

    const page = project.getPageById(req.params.pageId);
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const name = req.body.name === undefined ? page.name : String(req.body.name || '').trim();
    const description = req.body.description === undefined ? page.description || '' : String(req.body.description || '').trim();
    const nextPageKey = req.body.pageKey === undefined ? page.pageKey : normalizePageKey(req.body.pageKey);

    if (!name) {
      return res.status(400).json({ error: 'Page name is required' });
    }

    if (!nextPageKey) {
      return res.status(400).json({ error: 'Page key is required' });
    }

    if (!isValidPageKey(nextPageKey)) {
      return res.status(400).json({ error: 'Page key may contain only lowercase letters, numbers, hyphens, and underscores' });
    }

    if (project.hasPageKey(nextPageKey, page._id)) {
      return res.status(409).json({ error: `Page key '${nextPageKey}' already exists in this project` });
    }

    if (nextPageKey !== page.pageKey) {
      const keyCount = await getPageKeyCount(project._id, page._id);
      if (keyCount > 0) {
        return res.status(409).json({ error: 'Page key cannot be changed after translation keys exist for this page' });
      }
    }

    page.name = name;
    page.description = description;
    page.pageKey = nextPageKey;

    await project.save();

    res.json({
      ...getPageSummary(page),
      keyCount: await getPageKeyCount(project._id, page._id)
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/projects/:projectId/pages/:pageId - Delete a page
router.delete('/:projectId/pages/:pageId', async (req, res) => {
  try {
    const project = await getProjectWithPassword(req.params.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.isLocked) {
      return res.status(423).json({ error: 'Unlock this project before changing pages' });
    }

    const page = project.getPageById(req.params.pageId);
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const force = req.body && req.body.force === true;
    const keyCount = await getPageKeyCount(project._id, page._id);

    if (keyCount > 0 && !force) {
      return res.status(409).json({ error: 'Page cannot be deleted because it still contains translation keys' });
    }

    if (force) {
      await TranslationKey.deleteMany({ projectId: project._id, pageId: page._id });
    }

    project.pages.pull(page._id);
    await project.save();

    res.json({ message: 'Page deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/projects/:id - Get project details with stats
router.get('/:id', async (req, res) => {
  try {
    const project = await getProjectWithPassword(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const stats = await project.getStats();
    const payload = project.toObject();
    payload.hasProjectPassword = Boolean(project.projectPassword);
    payload.pages = await Promise.all(project.pages.map(async (page) => ({
      ...getPageSummary(page),
      keyCount: await getPageKeyCount(project._id, page._id)
    })));
    delete payload.projectPassword;
    res.json({ ...payload, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/projects/:id - Update project
router.put('/:id', async (req, res) => {
  try {
    const { name, description, sourceLocale, locales, projectPassword, currentProjectPassword } = req.body;
    const project = await getProjectWithPassword(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (sourceLocale) project.sourceLocale = sourceLocale;
    if (locales) project.locales = locales;
    if (projectPassword) {
      if (projectPassword.length < 6) {
        return res.status(400).json({ error: 'Project password must be at least 6 characters' });
      }

      if (project.projectPassword) {
        if (!currentProjectPassword) {
          return res.status(400).json({ error: 'Current project password is required' });
        }

        const matches = await project.compareProjectPassword(currentProjectPassword);
        if (!matches) {
          return res.status(403).json({ error: 'Current project password is incorrect' });
        }
      }

      project.projectPassword = projectPassword;
    }

    await project.save();
    res.json(project);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/projects/:id - Delete project and all its keys
router.delete('/:id', async (req, res) => {
  try {
    const { password, confirm } = req.body;
    const project = await getProjectWithPassword(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.isLocked) {
      return res.status(423).json({ error: 'Unlock this project before deleting it' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Project password is required' });
    }

    if (confirm !== true) {
      return res.status(400).json({ error: 'Delete confirmation is required' });
    }

    const matches = await project.compareProjectPassword(password);
    if (!matches) {
      return res.status(403).json({ error: 'Incorrect project password' });
    }

    await TranslationKey.deleteMany({ projectId: project._id });
    await project.deleteOne();

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/projects/:id/regenerate-key - Regenerate API key
router.post('/:id/regenerate-key', async (req, res) => {
  try {
    const { v4: uuidv4 } = require('uuid');
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    project.apiKey = `th_${uuidv4().replace(/-/g, '')}`;
    await project.save();

    res.json({ apiKey: project.apiKey });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/lock', async (req, res) => {
  try {
    const { password } = req.body;
    const project = await getProjectWithPassword(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Project password is required' });
    }

    const matches = await project.compareProjectPassword(password);
    if (!matches) {
      return res.status(403).json({ error: 'Incorrect project password' });
    }

    project.isLocked = true;
    await project.save();
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/unlock', async (req, res) => {
  try {
    const { password } = req.body;
    const project = await getProjectWithPassword(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Project password is required' });
    }

    const matches = await project.compareProjectPassword(password);
    if (!matches) {
      return res.status(403).json({ error: 'Incorrect project password' });
    }

    project.isLocked = false;
    await project.save();
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
