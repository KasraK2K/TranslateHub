const express = require('express');
const router = express.Router();
const Project = require('../../models/Project');
const TranslationKey = require('../../models/TranslationKey');
const { requireAuth } = require('../../middleware/auth');

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
    const { name, description, sourceLocale, locales } = req.body;

    // locales is now an array of { code, name }
    const project = new Project({
      name,
      description,
      sourceLocale: sourceLocale || 'en',
      locales: locales || [{ code: sourceLocale || 'en', name: 'English' }]
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
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const stats = await project.getStats();
    res.json({ ...project.toObject(), stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/projects/:id - Update project
router.put('/:id', async (req, res) => {
  try {
    const { name, description, sourceLocale, locales } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (sourceLocale) project.sourceLocale = sourceLocale;
    if (locales) project.locales = locales;

    await project.save();
    res.json(project);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/projects/:id - Delete project and all its keys
router.delete('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
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

module.exports = router;
