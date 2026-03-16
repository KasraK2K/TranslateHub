/**
 * Seed script - creates a demo project with sample translations.
 * Run: node scripts/seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Project = require('../models/Project');
const TranslationKey = require('../models/TranslationKey');
const User = require('../models/User');

const DEMO_PROJECT = {
  name: 'Demo App',
  description: 'A sample project to demonstrate TranslateHub',
  sourceLocale: 'en-US',
  projectPassword: 'demo1234',
  locales: [
    { code: 'en-US', name: 'English (United States)' },
    { code: 'fr-FR', name: 'French (France)' },
    { code: 'es-ES', name: 'Spanish (Spain)' },
    { code: 'de-DE', name: 'German (Germany)' }
  ]
};

const DEMO_KEYS = [
  {
    key: 'common.welcome',
    description: 'Main welcome message on homepage',
      translations: {
        'en-US': 'Welcome to our app!',
        'fr-FR': 'Bienvenue dans notre application !',
        'es-ES': 'Bienvenido a nuestra aplicación!',
        'de-DE': 'Willkommen in unserer App!'
      }
  },
  {
    key: 'common.logout',
    description: 'Logout button text',
      translations: {
        'en-US': 'Log Out',
        'fr-FR': 'Déconnexion',
        'es-ES': 'Cerrar sesión',
        'de-DE': 'Abmelden'
      }
  },
  {
    key: 'nav.home',
    description: 'Navigation home link',
      translations: {
        'en-US': 'Home',
        'fr-FR': 'Accueil',
        'es-ES': 'Inicio',
        'de-DE': 'Startseite'
      }
  },
  {
    key: 'nav.settings',
    description: 'Navigation settings link',
      translations: {
        'en-US': 'Settings',
        'fr-FR': 'Paramètres',
        'es-ES': 'Configuración',
        'de-DE': 'Einstellungen'
      }
  },
  {
    key: 'auth.login.title',
    description: 'Login page heading',
      translations: {
        'en-US': 'Sign In',
        'fr-FR': 'Se connecter',
        'es-ES': 'Iniciar sesión',
        'de-DE': 'Anmelden'
      }
  },
  {
    key: 'auth.login.email',
    description: 'Email input label',
      translations: {
        'en-US': 'Email Address',
        'fr-FR': 'Adresse e-mail',
        'es-ES': 'Correo electrónico'
        // de-DE intentionally missing to show untranslated state
      }
  },
  {
    key: 'auth.login.password',
    description: 'Password input label',
      translations: {
        'en-US': 'Password',
        'fr-FR': 'Mot de passe'
        // es-ES and de-DE intentionally missing
      }
  },
  {
    key: 'errors.notFound',
    description: '404 page message',
      translations: {
        'en-US': 'Page not found',
        'fr-FR': 'Page non trouvée',
        'es-ES': 'Página no encontrada',
        'de-DE': 'Seite nicht gefunden'
      }
  },
  {
    key: 'errors.generic',
    description: 'Generic error message',
      translations: {
        'en-US': 'Something went wrong. Please try again.',
        'fr-FR': 'Une erreur est survenue. Veuillez réessayer.'
      }
  },
  {
    key: 'profile.title',
    description: 'Profile page heading',
      translations: {
        'en-US': 'My Profile'
      }
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/translate-hub');
    console.log('Connected to MongoDB');

    // Create default super admin if none exists
    const adminCount = await User.countDocuments({ role: 'super_admin' });
    if (adminCount === 0) {
      const admin = await User.create({
        username: 'admin',
        password: 'admin123',
        displayName: 'Super Admin',
        role: 'super_admin'
      });
      console.log(`Created super admin: username=admin, password=admin123`);
    } else {
      console.log('Super admin already exists, skipping...');
    }

    // Clean existing demo data
    const existing = await Project.findOne({ slug: 'demo-app' });
    if (existing) {
      await TranslationKey.deleteMany({ projectId: existing._id });
      await existing.deleteOne();
      console.log('Cleaned existing demo data');
    }

    // Create project
    const project = await Project.create(DEMO_PROJECT);
    console.log(`Created project: ${project.name} (API Key: ${project.apiKey})`);
    console.log('Demo project password: demo1234');

    // Create translation keys
    for (const keyData of DEMO_KEYS) {
      await TranslationKey.create({
        projectId: project._id,
        key: keyData.key,
        description: keyData.description,
        translations: keyData.translations
      });
    }

    console.log(`Created ${DEMO_KEYS.length} translation keys`);
    console.log('\nDone! Start the server with: npm start');
    console.log(`Then visit: http://localhost:3000`);
    console.log(`\nPublic API: curl -H "X-API-Key: ${project.apiKey}" http://localhost:3000/api/v1/translations/en-US`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
