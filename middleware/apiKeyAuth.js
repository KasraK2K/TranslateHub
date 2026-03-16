const Project = require('../models/Project');

/**
 * Middleware to authenticate client apps using API key.
 * Expects header: X-API-Key: th_xxxx
 * Attaches project to req.project on success.
 */
const apiKeyAuth = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'Missing X-API-Key header' });
  }

  try {
    const project = await Project.findOne({ apiKey });
    if (!project) {
      return res.status(403).json({ error: 'Invalid API key' });
    }
    req.project = project;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authentication error' });
  }
};

module.exports = apiKeyAuth;
