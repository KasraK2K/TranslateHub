(function (root, factory) {
  const api = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  root.TranslateHubRouter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function parseHash(hash) {
    const cleaned = String(hash || '').replace(/^#\/?/, '');
    if (!cleaned) return { page: 'projects' };

    const parts = cleaned.split('?');
    const path = parts[0];
    const query = new URLSearchParams(parts[1] || '');
    const segments = path.split('/').filter(Boolean);

    if (segments[0] === 'projects' && segments[1] && segments[2] === 'pages' && segments[3]) {
      return {
        page: 'project',
        projectId: decodeURIComponent(segments[1]),
        pageId: decodeURIComponent(segments[3]),
        locale: query.get('locale') || null
      };
    }

    if (segments[0] === 'projects' && segments[1]) {
      return {
        page: 'project',
        projectId: decodeURIComponent(segments[1]),
        pageId: null,
        locale: query.get('locale') || null
      };
    }

    if (segments[0] === 'admins') return { page: 'admins' };
    if (segments[0] === 'docs') return { page: 'docs' };
    return { page: 'projects' };
  }

  function buildHash(route) {
    if (!route || route.page === 'projects') return '#/projects';
    if (route.page === 'admins') return '#/admins';
    if (route.page === 'docs') return '#/docs';

    if (route.page === 'project' && route.projectId) {
      const query = new URLSearchParams();
      if (route.locale) query.set('locale', route.locale);
      const suffix = query.toString() ? `?${query.toString()}` : '';
      const pageSegment = route.pageId ? `/pages/${encodeURIComponent(route.pageId)}` : '';
      return `#/projects/${encodeURIComponent(route.projectId)}${pageSegment}${suffix}`;
    }

    return '#/projects';
  }

  return {
    parseHash,
    buildHash
  };
});
