(function (root, factory) {
  const api = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  root.TranslateHubAccessibility = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getFocusable(container) {
    if (!container) return [];
    return Array.from(container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'));
  }

  function focusFirst(container) {
    const focusable = getFocusable(container)[0];
    if (focusable) focusable.focus();
  }

  function trapFocus(container, event) {
    if (!container || event.key !== 'Tab') return;

    const focusables = getFocusable(container);
    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return {
    focusFirst,
    trapFocus
  };
});
