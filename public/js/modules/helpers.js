(function (root, factory) {
  const api = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  root.TranslateHubHelpers = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function defaultLocaleName(code) {
    const normalized = String(code || '').trim();
    if (!normalized) return 'Unknown';

    try {
      if (normalized.includes('-')) {
        const parts = normalized.split('-');
        const language = parts.shift();
        const suffix = parts.join('-');
        const languageName = new Intl.DisplayNames(['en'], { type: 'language' }).of(language.toLowerCase());
        const suffixName = suffix
          ? new Intl.DisplayNames(['en'], { type: suffix.length === 4 ? 'script' : 'region' }).of(
              suffix.length === 4 ? suffix : suffix.toUpperCase()
            )
          : '';

        if (languageName && suffixName) {
          return `${languageName} (${suffixName})`;
        }
      }

      const languageName = new Intl.DisplayNames(['en'], { type: 'language' }).of(normalized.toLowerCase());
      if (languageName) return languageName;
    } catch (error) {
      // Fall back to a readable string.
    }

    return normalized
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function normalizeLocale(locale) {
    if (typeof locale === 'string') {
      const code = locale.trim();
      return { code, name: defaultLocaleName(code) };
    }

    const code = String(locale && locale.code || '').trim();
    return {
      code,
      name: String(locale && locale.name || '').trim() || defaultLocaleName(code)
    };
  }

  function getProjectLocales(project) {
    return ((project || {}).locales || [])
      .map(normalizeLocale)
      .filter((locale) => locale.code);
  }

  function getLocaleName(code, project) {
    const locale = getProjectLocales(project).find((entry) => entry.code === code);
    return locale ? locale.name : defaultLocaleName(code);
  }

  function collectLocaleEntries(entries, options) {
    const sourceCode = String(options && options.sourceCode || 'en').trim() || 'en';
    const sourceName = String(options && options.sourceName || '').trim() || defaultLocaleName(sourceCode);
    const uniqueLocales = new Map([[sourceCode, { code: sourceCode, name: sourceName }]]);

    for (const entry of Array.isArray(entries) ? entries : []) {
      const code = String(entry && entry.code || '').trim();
      const name = String(entry && entry.name || '').trim();

      if (!code && !name) continue;
      if (!code || !name) {
        return { error: 'Each locale needs both a code and a display name', locales: null };
      }

      if (uniqueLocales.has(code) && code !== sourceCode) {
        return { error: `Locale code "${code}" is duplicated`, locales: null };
      }

      uniqueLocales.set(code, { code, name });
    }

    return { locales: Array.from(uniqueLocales.values()), error: null };
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function validateRequired(values) {
    for (const item of values || []) {
      if (!String(item && item.value || '').trim()) {
        return item.message;
      }
    }

    return null;
  }

  function validateMinLength(value, min, message) {
    if (String(value || '').length < min) {
      return message;
    }

    return null;
  }

  return {
    defaultLocaleName,
    normalizeLocale,
    getProjectLocales,
    getLocaleName,
    collectLocaleEntries,
    escapeHtml,
    validateRequired,
    validateMinLength
  };
});
