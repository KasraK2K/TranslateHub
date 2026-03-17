const assert = require('assert');
const Helpers = require('../public/js/modules/helpers');
const Router = require('../public/js/modules/router');

const localeName = Helpers.defaultLocaleName('en-US');
assert.ok(localeName.includes('English'), 'defaultLocaleName should resolve readable locale names');

const normalizedLocale = Helpers.normalizeLocale({ code: 'fr-FR', name: '' });
assert.strictEqual(normalizedLocale.code, 'fr-FR');
assert.ok(normalizedLocale.name.length > 0, 'normalizeLocale should fill missing names');

const localeCollection = Helpers.collectLocaleEntries([
  { code: 'fr-FR', name: 'French (France)' },
  { code: 'es-ES', name: 'Spanish (Spain)' }
], { sourceCode: 'en-US', sourceName: 'English (United States)' });
assert.strictEqual(localeCollection.error, null);
assert.strictEqual(localeCollection.locales.length, 3);

const duplicateLocaleCollection = Helpers.collectLocaleEntries([
  { code: 'fr-FR', name: 'French (France)' },
  { code: 'fr-FR', name: 'French Duplicate' }
], { sourceCode: 'en-US', sourceName: 'English (United States)' });
assert.ok(duplicateLocaleCollection.error, 'duplicate locale codes should return an error');

assert.strictEqual(Helpers.normalizePageKey(' Dashboard '), 'dashboard');
assert.strictEqual(Helpers.isValidPageKey('dashboard_home'), true);
assert.strictEqual(Helpers.isValidPageKey('Dashboard.Home'), false);

assert.strictEqual(Helpers.normalizeLocalKey(' Greet '), 'greet');
assert.strictEqual(Helpers.isValidLocalKey('greet_user'), true);
assert.strictEqual(Helpers.isValidLocalKey('dashboard.greet'), false);
assert.strictEqual(Helpers.buildFullKey('dashboard', 'greet'), 'dashboard.greet');

const parsedProjectRoute = Router.parseHash('#/projects/abc123/pages/page456?locale=fr-FR');
assert.deepStrictEqual(parsedProjectRoute, {
  page: 'project',
  projectId: 'abc123',
  pageId: 'page456',
  locale: 'fr-FR'
});

assert.strictEqual(
  Router.buildHash({ page: 'project', projectId: 'abc123', pageId: 'page456', locale: 'fr-FR' }),
  '#/projects/abc123/pages/page456?locale=fr-FR'
);

assert.deepStrictEqual(Router.parseHash('#/projects/abc123'), {
  page: 'project',
  projectId: 'abc123',
  pageId: null,
  locale: null
});

assert.strictEqual(Router.buildHash({ page: 'docs' }), '#/docs');

console.log('frontend-modules.test.js passed');
