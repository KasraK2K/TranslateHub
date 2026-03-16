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

const parsedProjectRoute = Router.parseHash('#/projects/abc123?locale=fr-FR');
assert.deepStrictEqual(parsedProjectRoute, {
  page: 'project',
  projectId: 'abc123',
  locale: 'fr-FR'
});

assert.strictEqual(
  Router.buildHash({ page: 'project', projectId: 'abc123', locale: 'fr-FR' }),
  '#/projects/abc123?locale=fr-FR'
);

assert.strictEqual(Router.buildHash({ page: 'docs' }), '#/docs');

console.log('frontend-modules.test.js passed');
