const Helpers = window.TranslateHubHelpers;
const Config = window.TranslateHubConfig;
const Store = window.TranslateHubStore;
const ModalActions = window.TranslateHubModalActions;
const AuthActions = window.TranslateHubAuthActions;
const ProjectActions = window.TranslateHubProjectActions;
const AdminActions = window.TranslateHubAdminActions;
const ShellActions = window.TranslateHubShellActions;

const app = {
  token: localStorage.getItem('th_token'),
  user: JSON.parse(localStorage.getItem('th_user') || 'null'),
  currentPage: localStorage.getItem('th_current_page') || 'projects',
  currentProject: null,
  currentProjectId: localStorage.getItem('th_current_project_id') || null,
  currentLocale: localStorage.getItem('th_current_locale') || null,
  currentTheme: localStorage.getItem('th_theme') || 'aurora',
  isThemeMenuOpen: false,
  isCommandBarOpen: false,
  sidebarProjectFilter: '',
  commandItems: [],
  activeCommandIndex: 0,
  lastFocusedElement: null,
  modalState: null,
  isModalOpen: false,
  projects: [],
  keys: [],
  admins: [],
  themes: Config.THEMES,
  store: Store.createStore({
    token: localStorage.getItem('th_token'),
    user: JSON.parse(localStorage.getItem('th_user') || 'null'),
    currentPage: localStorage.getItem('th_current_page') || 'projects',
    currentProjectId: localStorage.getItem('th_current_project_id') || null,
    currentLocale: localStorage.getItem('th_current_locale') || null,
    currentTheme: localStorage.getItem('th_theme') || 'aurora'
  }),

  defaultLocaleName(code) {
    return Helpers.defaultLocaleName(code);
  },

  normalizeLocale(locale) {
    return Helpers.normalizeLocale(locale);
  },

  getProjectLocales(project) {
    return Helpers.getProjectLocales(project || this.currentProject || {});
  },

  async fetch(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    try {
      const res = await fetch(url, { headers, ...options });
      if (res.status === 401) {
        this.logout();
        throw new Error('Session expired. Please log in again.');
      }
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      return res.json();
    } catch (error) {
      this.toast(error.message, 'error');
      throw error;
    }
  },

  getLocaleCodes(project) {
    return this.getProjectLocales(project).map((locale) => locale.code);
  },

  getLocaleName(code, project) {
    return Helpers.getLocaleName(code, project || this.currentProject || {});
  },

  toast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  },

  collectLocaleEntries(entries, { sourceCode, sourceName }) {
    const result = Helpers.collectLocaleEntries(entries, { sourceCode, sourceName });
    if (result.error) {
      this.toast(result.error, 'error');
      return null;
    }
    return result.locales;
  },

  esc(str) {
    return Helpers.escapeHtml(str);
  },

  syncStore() {
    this.store.assign({
      token: this.token,
      user: this.user,
      currentPage: this.currentPage,
      currentProjectId: this.currentProjectId,
      currentLocale: this.currentLocale,
      currentTheme: this.currentTheme
    });
  },

  ...ModalActions,
  ...AuthActions,
  ...ProjectActions,
  ...AdminActions,
  ...ShellActions
};

window.app = app;
document.addEventListener('DOMContentLoaded', () => {
  if (window.TranslateHubPreact) {
    app.init();
    return;
  }

  window.addEventListener('translatehub:preact-ready', () => app.init(), { once: true });
});
