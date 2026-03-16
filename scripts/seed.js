/**
 * Seed script - creates a demo project with sample translations.
 * Run: node scripts/seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Project = require('../models/Project');
const TranslationKey = require('../models/TranslationKey');

const DEMO_PROJECT = {
  name: 'Demo App',
  description: 'A sample project to demonstrate TranslateHub',
  sourceLocale: 'en',
  locales: ['en', 'fr', 'es', 'de']
};

const DEMO_KEYS = [
  {
    key: 'common.welcome',
    description: 'Main welcome message on homepage',
    translations: {
      en: 'Welcome to our app!',
      fr: 'Bienvenue dans notre application !',
      es: 'Bienvenido a nuestra aplicación!',
      de: 'Willkommen in unserer App!'
    }
  },
  {
    key: 'common.logout',
    description: 'Logout button text',
    translations: {
      en: 'Log Out',
      fr: 'Déconnexion',
      es: 'Cerrar sesión',
      de: 'Abmelden'
    }
  },
  {
    key: 'nav.home',
    description: 'Navigation home link',
    translations: {
      en: 'Home',
      fr: 'Accueil',
      es: 'Inicio',
      de: 'Startseite'
    }
  },
  {
    key: 'nav.settings',
    description: 'Navigation settings link',
    translations: {
      en: 'Settings',
      fr: 'Paramètres',
      es: 'Configuración',
      de: 'Einstellungen'
    }
  },
  {
    key: 'auth.login.title',
    description: 'Login page heading',
    translations: {
      en: 'Sign In',
      fr: 'Se connecter',
      es: 'Iniciar sesión',
      de: 'Anmelden'
    }
  },
  {
    key: 'auth.login.email',
    description: 'Email input label',
    translations: {
      en: 'Email Address',
      fr: 'Adresse e-mail',
      es: 'Correo electrónico'
      // de intentionally missing to show untranslated state
    }
  },
  {
    key: 'auth.login.password',
    description: 'Password input label',
    translations: {
      en: 'Password',
      fr: 'Mot de passe'
      // es and de intentionally missing
    }
  },
  {
    key: 'errors.notFound',
    description: '404 page message',
    translations: {
      en: 'Page not found',
      fr: 'Page non trouvée',
      es: 'Página no encontrada',
      de: 'Seite nicht gefunden'
    }
  },
  {
    key: 'errors.generic',
    description: 'Generic error message',
    translations: {
      en: 'Something went wrong. Please try again.',
      fr: 'Une erreur est survenue. Veuillez réessayer.'
    }
  },
  {
    key: 'profile.title',
    description: 'Profile page heading',
    translations: {
      en: 'My Profile'
    }
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/translate-hub');
    console.log('Connected to MongoDB');

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
    console.log(`\nPublic API: curl -H "X-API-Key: ${project.apiKey}" http://localhost:3000/api/v1/translations/en`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
