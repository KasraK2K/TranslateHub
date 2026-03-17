require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/vendor/preact', express.static(path.join(__dirname, 'node_modules', 'preact')));
app.use('/vendor/htm', express.static(path.join(__dirname, 'node_modules', 'htm')));

// API Routes
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api/admins', require('./routes/api/admins'));
app.use('/api/projects', require('./routes/api/projects'));
app.use('/api/projects', require('./routes/api/translations'));
app.use('/api/v1', require('./routes/api/public'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve dashboard for all non-API routes (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`TranslateHub running on http://localhost:${PORT}`);
});
