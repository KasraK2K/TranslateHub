(function (root) {
  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  root.TranslateHubUI = {
    renderLoadingState(message) {
      return `
        <div class="status-panel">
          <div class="status-spinner"></div>
          <h3>${escapeHtml(message || 'Loading...')}</h3>
          <p>Please wait a moment.</p>
        </div>
      `;
    },

    renderErrorState(options) {
      const title = escapeHtml(options && options.title || 'Something went wrong');
      const message = escapeHtml(options && options.message || 'Please try again.');
      const action = options && options.action || '';

      return `
        <div class="status-panel error">
          <div class="status-icon"><i class="fa-solid fa-circle-exclamation"></i></div>
          <h3>${title}</h3>
          <p>${message}</p>
          ${action}
        </div>
      `;
    },

    renderPageHero(options) {
      const title = escapeHtml(options && options.title || '');
      const description = escapeHtml(options && options.description || '');
      const actions = options && options.actions || '';
      const eyebrow = escapeHtml(options && options.eyebrow || '');

      return `
        <div class="page-hero">
          <div>
            ${eyebrow ? `<div class="page-eyebrow">${eyebrow}</div>` : ''}
            <h1>${title}</h1>
            ${description ? `<p>${description}</p>` : ''}
          </div>
          ${actions ? `<div class="page-actions">${actions}</div>` : ''}
        </div>
      `;
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
