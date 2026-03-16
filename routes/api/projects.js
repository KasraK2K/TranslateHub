const express = require('express');
const router = express.Router();
const Project = require('../../models/Project');
const TranslationKey = require('../../models/TranslationKey');
const { requireAuth } = require('../../middleware/auth');

async function getProjectWithPassword(projectId) {
  return Project.findById(projectId).select('+projectPassword');
}

// All dashboard project routes require authentication
router.use(requireAuth);

// GET /api/projects - List all projects
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
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

    // locales is now an array of { code, name }
    const project = new Project({
      name,
      description,
      sourceLocale: sourceLocale || 'en',
      locales: locales || [{ code: sourceLocale || 'en', name: 'English' }],
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
          return res.status(401).json({ error: 'Current project password is incorrect' });
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
      return res.status(401).json({ error: 'Incorrect project password' });
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
      return res.status(401).json({ error: 'Incorrect project password' });
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
      return res.status(401).json({ error: 'Incorrect project password' });
    }

    project.isLocked = false;
    await project.save();
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
