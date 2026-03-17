const API = '/api';
const Helpers = window.TranslateHubHelpers;
const Router = window.TranslateHubRouter;
const UI = window.TranslateHubUI;
const CommandBar = window.TranslateHubCommandBar;
const A11y = window.TranslateHubAccessibility;

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
  modalContent: '',
  isModalOpen: false,
  projects: [],
  keys: [],
  admins: [],
  themes: [
    { id: 'aurora', label: 'Aurora', icon: 'fa-sun', tone: 'Bright glass', mode: 'light' },
    { id: 'ember', label: 'Ember', icon: 'fa-fire', tone: 'Warm editorial', mode: 'light' },
    { id: 'ocean', label: 'Ocean', icon: 'fa-water', tone: 'Cool clarity', mode: 'light' },
    { id: 'paper', label: 'Paper', icon: 'fa-feather-pointed', tone: 'Soft neutral', mode: 'light' },
    { id: 'sunset', label: 'Sunset', icon: 'fa-mountain-sun', tone: 'Golden bloom', mode: 'light' },
    { id: 'dusk', label: 'Dusk', icon: 'fa-cloud-moon', tone: 'Soft dark', mode: 'dark' },
    { id: 'graphite', label: 'Graphite', icon: 'fa-meteor', tone: 'Industrial dark', mode: 'dark' },
    { id: 'forest-night', label: 'Forest Night', icon: 'fa-leaf', tone: 'Deep green dark', mode: 'dark' },
    { id: 'midnight-neon', label: 'Midnight Neon', icon: 'fa-bolt', tone: 'Electric dark', mode: 'dark' }
  ],

  defaultLocaleName(code) {
    return Helpers.defaultLocaleName(code);
  },

  normalizeLocale(locale) {
    return Helpers.normalizeLocale(locale);
  },

  getProjectLocales(project) {
    return Helpers.getProjectLocales(project || this.currentProject || {});
  },

  // ==================== API Helpers ====================
  async fetch(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
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

  // ==================== Locale Helpers ====================
  // Get array of locale codes from project
  getLocaleCodes(project) {
    return this.getProjectLocales(project).map((locale) => locale.code);
  },

  // Get locale name by code
  getLocaleName(code, project) {
    return Helpers.getLocaleName(code, project || this.currentProject || {});
  },

  // ==================== Toast ====================
  toast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = message;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  },

  // ==================== Modal ====================
  openModal(html) {
    this.lastFocusedElement = document.activeElement;
    this.modalContent = html;
    this.isModalOpen = true;
    this.renderModalHost();
    setTimeout(() => A11y.focusFirst(document.getElementById('modalContent')), 0);
  },

  closeModal(e) {
    if (e && e.target !== e.currentTarget) return;
    this.isModalOpen = false;
    this.modalContent = '';
    this.renderModalHost();
    if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
      this.lastFocusedElement.focus();
      this.lastFocusedElement = null;
    }
  },

  renderModalHost() {
    if (!window.TranslateHubPreact) return;
    window.TranslateHubPreact.renderModalHost(document.getElementById('modalRoot'), {
      isOpen: this.isModalOpen,
      content: this.modalContent
    });
  },

  // ==================== Auth ====================
  setAuthError(message) {
    const errorEl = document.getElementById('authError');
    if (!errorEl) return;
    errorEl.textContent = message || '';
    errorEl.classList.toggle('visible', !!message);
  },

  setAuth(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem('th_token', token);
    localStorage.setItem('th_user', JSON.stringify(user));
  },

  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('th_token');
    localStorage.removeItem('th_user');
    this.currentProject = null;
    this.showAuthScreen();
  },

  // ==================== App State ====================
  saveViewState() {
    localStorage.setItem('th_current_page', this.currentPage || 'projects');

    if (this.currentProjectId) {
      localStorage.setItem('th_current_project_id', this.currentProjectId);
    } else {
      localStorage.removeItem('th_current_project_id');
    }

    if (this.currentLocale) {
      localStorage.setItem('th_current_locale', this.currentLocale);
    } else {
      localStorage.removeItem('th_current_locale');
    }
  },

  setTheme(themeId) {
    const fallbackTheme = this.themes[0].id;
    const selectedTheme = this.themes.find((theme) => theme.id === themeId) ? themeId : fallbackTheme;
    this.currentTheme = selectedTheme;
    localStorage.setItem('th_theme', selectedTheme);
    document.documentElement.setAttribute('data-theme', selectedTheme);
    document.body.setAttribute('data-theme', selectedTheme);
    this.isThemeMenuOpen = false;
    this.renderThemeSwitcher();
  },

  toggleThemeMenu(event) {
    if (event) event.stopPropagation();
    this.isThemeMenuOpen = !this.isThemeMenuOpen;
    this.renderThemeSwitcher();
  },

  closeThemeMenu() {
    if (!this.isThemeMenuOpen) return;
    this.isThemeMenuOpen = false;
    this.renderThemeSwitcher();
  },

  openCommandBar() {
    this.lastFocusedElement = document.activeElement;
    this.isCommandBarOpen = true;
    const overlay = document.getElementById('commandOverlay');
    if (!overlay) return;
    overlay.classList.add('active');
    this.activeCommandIndex = 0;
    this.renderCommandResults('');
    const input = document.getElementById('commandInput');
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 0);
    }
  },

  closeCommandBar(event) {
    if (event && event.target !== event.currentTarget) return;
    this.isCommandBarOpen = false;
    const overlay = document.getElementById('commandOverlay');
    if (overlay) overlay.classList.remove('active');
    if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
      this.lastFocusedElement.focus();
      this.lastFocusedElement = null;
    }
  },

  getCommandItems() {
    return CommandBar.getItems(this);
  },

  renderCommandResults(query) {
    const container = document.getElementById('commandResults');
    if (!container || !window.TranslateHubPreact) return;

    const items = CommandBar.filterItems(this.getCommandItems(), query);
    this.commandItems = items;
    if (this.activeCommandIndex >= items.length) this.activeCommandIndex = 0;

    window.TranslateHubPreact.renderCommandBar(container, {
      items,
      activeIndex: this.activeCommandIndex,
      onSelect: (index) => this.executeCommandItem(index)
    });
  },

  executeCommandItem(index) {
    const item = this.commandItems[index];
    if (!item) return;
    item.run();
    this.closeCommandBar();
  },

  moveCommandSelection(direction) {
    if (!this.commandItems.length) return;
    this.activeCommandIndex = (this.activeCommandIndex + direction + this.commandItems.length) % this.commandItems.length;
    this.renderCommandResults(document.getElementById('commandInput').value);
    const activeButton = document.querySelector('.command-item.active');
    if (activeButton) activeButton.scrollIntoView({ block: 'nearest' });
  },

  handleCommandInputKeydown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.moveCommandSelection(1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.moveCommandSelection(-1);
      return;
    }

    if (event.key === 'Enter' && this.commandItems.length) {
      event.preventDefault();
      this.executeCommandItem(this.activeCommandIndex);
    }
  },

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('mobileSidebarBackdrop');
    if (!sidebar || !backdrop) return;
    sidebar.classList.toggle('mobile-open');
    backdrop.classList.toggle('active');
  },

  closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('mobileSidebarBackdrop');
    if (!sidebar || !backdrop) return;
    sidebar.classList.remove('mobile-open');
    backdrop.classList.remove('active');
  },

  updateRoute(route, replace) {
    const nextHash = Router.buildHash(route);
    if (window.location.hash === nextHash) return false;

    if (replace) {
      history.replaceState(null, '', nextHash);
    } else {
      window.location.hash = nextHash;
    }

    return true;
  },

  handleRouteChange() {
    if (!this.token) return;

    const route = Router.parseHash(window.location.hash);
    switch (route.page) {
      case 'admins':
        this.navigate('admins', { skipRoute: true });
        break;
      case 'docs':
        this.navigate('docs', { skipRoute: true });
        break;
      case 'project':
        if (route.locale) this.currentLocale = route.locale;
        this.showProject(route.projectId, { skipRoute: true });
        break;
      default:
        this.navigate('projects', { skipRoute: true });
        break;
    }
  },

  renderThemeSwitcher() {
    const container = document.getElementById('themeSwitcher');
    if (!container || !window.TranslateHubPreact) return;

    window.TranslateHubPreact.renderThemeStudio(container, {
      themes: this.themes,
      currentTheme: this.currentTheme,
      isOpen: this.isThemeMenuOpen,
      onToggle: (event) => this.toggleThemeMenu(event),
      onSelect: (themeId) => this.setTheme(themeId)
    });
  },

  restoreLastView() {
    if (window.location.hash) {
      this.handleRouteChange();
      return;
    }

    if (this.currentProjectId && this.currentPage === 'projects') {
      this.updateRoute({ page: 'project', projectId: this.currentProjectId, locale: this.currentLocale }, true);
    } else {
      this.updateRoute({ page: this.currentPage || 'projects' }, true);
    }

    this.handleRouteChange();
  },

  async showAuthScreen() {
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('authScreen').style.display = 'block';

    try {
      const status = await fetch(`${API}/auth/status`).then(r => r.json());
      document.getElementById('authScreen').innerHTML = '';
      window.TranslateHubPreact.renderAuthScreen(document.getElementById('authScreen'), {
        needsSetup: !!status.needsSetup,
        errorMessage: ''
      });
    } catch (e) {
      document.getElementById('authScreen').innerHTML = '';
      window.TranslateHubPreact.renderAuthScreen(document.getElementById('authScreen'), {
        needsSetup: false,
        errorMessage: ''
      });
    }
  },

  async doLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const validationError = Helpers.validateRequired([
      { value: username, message: 'Please enter username and password' },
      { value: password, message: 'Please enter username and password' }
    ]);

    if (validationError) {
      this.setAuthError(validationError);
      return;
    }

    try {
      this.setAuthError('');
      const data = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      }).then(async r => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error);
        return json;
      });

      this.setAuth(data.token, data.user);
      this.showDashboard();
    } catch (error) {
      this.setAuthError(error.message);
    }
  },

  async doSetup() {
    const displayName = document.getElementById('setupDisplayName').value.trim();
    const username = document.getElementById('setupUsername').value.trim();
    const password = document.getElementById('setupPassword').value;
    const requiredError = Helpers.validateRequired([
      { value: username, message: 'Username and password are required' },
      { value: password, message: 'Username and password are required' }
    ]);

    if (requiredError) {
      this.setAuthError(requiredError);
      return;
    }

    const passwordError = Helpers.validateMinLength(password, 6, 'Password must be at least 6 characters');
    if (passwordError) {
      this.setAuthError(passwordError);
      return;
    }

    try {
      this.setAuthError('');
      const data = await fetch(`${API}/auth/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, displayName })
      }).then(async r => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error);
        return json;
      });

      this.setAuth(data.token, data.user);
      this.toast('Super admin created! Welcome to TranslateHub.', 'success');
      this.showDashboard();
    } catch (error) {
      this.setAuthError(error.message);
    }
  },

  // ==================== Dashboard ====================
  showDashboard() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('headerUser').textContent = this.user.displayName || this.user.username;
    this.renderThemeSwitcher();
    this.renderSidebar();
    this.refreshProjectsCache();
    this.restoreLastView();
  },

  async refreshProjectsCache() {
    try {
      this.projects = await this.fetch(`${API}/projects`);
      this.renderSidebar();
    } catch (e) {}
  },

  renderSidebar() {
    if (!window.TranslateHubPreact || !this.user) return;
    window.TranslateHubPreact.renderSidebar(document.getElementById('sidebar'), {
      projects: this.projects,
      currentPage: this.currentPage,
      currentProjectId: this.currentProjectId,
      filter: this.sidebarProjectFilter,
      isSuperAdmin: this.user.role === 'super_admin',
      onFilter: (value) => this.filterSidebarProjects(value)
    });
  },

  filterSidebarProjects(value) {
    this.sidebarProjectFilter = value;
    this.renderSidebar();
  },

  navigate(page, options = {}) {
    if (!options.skipRoute && this.updateRoute({ page })) return;

    this.currentPage = page;
    this.currentProject = null;
    this.currentProjectId = null;
    if (page !== 'projects') this.currentLocale = null;
    this.saveViewState();
    this.renderSidebar();
    this.closeSidebar();

    switch (page) {
      case 'projects': this.showProjects(); break;
      case 'admins': this.showAdmins(); break;
      case 'docs': this.showDocs(); break;
      default: this.showProjects();
    }
  },

  render(html) {
    document.getElementById('app').innerHTML = html;
  },

  renderIntoApp(renderer, props) {
    if (!window.TranslateHubPreact || !renderer) return;
    const container = document.getElementById('app');
    container.innerHTML = '';
    renderer(container, props);
  },

  // ==================== Projects ====================
  async showProjects() {
    this.currentPage = 'projects';
    this.currentProject = null;
    this.currentProjectId = null;
    this.saveViewState();
    this.render(UI.renderLoadingState('Loading projects'));
    try {
      this.projects = await this.fetch(`${API}/projects`);
    } catch (e) {
      this.render(UI.renderErrorState({
        title: 'Could not load projects',
        message: e.message,
        action: '<button class="btn btn-primary" onclick="app.showProjects()">Try Again</button>'
      }));
      return;
    }
    this.renderSidebar();
    this.renderProjectsList();
  },

  renderProjectsList() {
    this.renderIntoApp(window.TranslateHubPreact.renderProjectsPage, { projects: this.projects });
  },

  showCreateProjectModal() {
    this.openModal(`
      <div class="modal-header">
        <h3>New Project</h3>
        <button class="btn-icon" onclick="app.closeModal()"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Project Name</label>
          <input type="text" id="projectName" placeholder="My App" autofocus>
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="projectDesc" placeholder="Brief description of this project" rows="2"></textarea>
        </div>
        <div class="form-group">
          <label>Source Locale</label>
          <div class="form-row">
            <div>
              <input type="text" id="projectSourceCode" value="en" placeholder="Code (e.g. en-US)">
            </div>
            <div>
              <input type="text" id="projectSourceName" value="English" placeholder="Name (e.g. English)">
            </div>
          </div>
        </div>
        <div class="form-group">
          <label>Target Locales</label>
          <div id="targetLocaleRows"></div>
          <button class="btn btn-sm" style="margin-top:8px" onclick="app.addLocaleRow()">
            <i class="fa-solid fa-plus"></i> Add Locale
          </button>
          <div class="form-hint">Add each target language with a code and display name.</div>
        </div>
        <div class="form-group">
          <label>Project Password</label>
          <input type="password" id="projectPassword" placeholder="Required for lock, unlock, and delete" autocomplete="new-password">
          <div class="form-hint">Use at least 6 characters. You will need this password for lock, unlock, and delete actions.</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="app.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="app.createProject()">Create Project</button>
      </div>
    `);
    this.addLocaleRow();
  },

  addLocaleRow() {
    const container = document.getElementById('targetLocaleRows');
    const row = document.createElement('div');
    row.className = 'form-row locale-entry-row';
    row.style.marginBottom = '8px';
    row.innerHTML = `
      <div><input type="text" class="locale-code-input" placeholder="Code (e.g. fr, de, fa)"></div>
      <div style="display:flex;gap:8px">
        <input type="text" class="locale-name-input" placeholder="Name (e.g. French)" style="flex:1">
        <button class="btn-icon" onclick="this.closest('.locale-entry-row').remove()" title="Remove">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
    container.appendChild(row);
  },

  async createProject() {
    const name = document.getElementById('projectName').value.trim();
    const description = document.getElementById('projectDesc').value.trim();
    const sourceCode = document.getElementById('projectSourceCode').value.trim() || 'en';
    const sourceName = document.getElementById('projectSourceName').value.trim() || 'English';
    const projectPassword = document.getElementById('projectPassword').value;

    const nameError = Helpers.validateRequired([
      { value: name, message: 'Project name is required' }
    ]);
    if (nameError) return this.toast(nameError, 'error');

    const passwordError = Helpers.validateMinLength(projectPassword, 6, 'Project password must be at least 6 characters');
    if (passwordError) return this.toast(passwordError, 'error');

    const locales = this.collectLocales('.locale-entry-row', '.locale-code-input', '.locale-name-input', {
      sourceCode,
      sourceName
    });

    if (!locales) return;

    try {
      const project = await this.fetch(`${API}/projects`, {
        method: 'POST',
        body: JSON.stringify({ name, description, sourceLocale: sourceCode, locales, projectPassword })
      });
      await this.refreshProjectsCache();
      this.closeModal();
      this.toast('Project created!', 'success');
      this.showProject(project._id);
    } catch (e) {}
  },

  // ==================== Project Detail ====================
  async showProject(projectId, options = {}) {
    if (!options.skipRoute && this.updateRoute({ page: 'project', projectId, locale: this.currentLocale })) return;

    this.render(UI.renderLoadingState('Loading project details'));

    try {
      this.currentProject = await this.fetch(`${API}/projects/${projectId}`);
      this.keys = await this.fetch(`${API}/projects/${projectId}/keys`);
    } catch (e) {
      this.currentProject = null;
      this.currentProjectId = null;
      this.currentLocale = null;
      this.saveViewState();
      this.showProjects();
      return;
    }

    this.currentPage = 'projects';
    this.currentProjectId = projectId;
    const codes = this.getLocaleCodes();
    // Only reset currentLocale if not set or not valid for this project
    if (!this.currentLocale || !codes.includes(this.currentLocale)) {
      this.currentLocale = codes.find(c => c !== this.currentProject.sourceLocale) || this.currentProject.sourceLocale;
    }
    this.saveViewState();
    await this.refreshProjectsCache();
    this.updateRoute({ page: 'project', projectId, locale: this.currentLocale }, true);
    this.renderSidebar();
    this.closeSidebar();
    this.renderProjectDetail();
  },

  renderProjectDetail() {
    this.renderIntoApp(window.TranslateHubPreact.renderProjectDetail, {
      project: this.currentProject,
      keys: this.keys,
      currentLocale: this.currentLocale
    });
  },

  renderKeyRow(k) {
    const p = this.currentProject;
    const locked = !!p.isLocked;
    const getT = (translations, locale) => {
      if (!translations) return '';
      if (translations instanceof Map) return translations.get(locale) || '';
      return translations[locale] || '';
    };

    const src = getT(k.translations, p.sourceLocale);
    const trans = getT(k.translations, this.currentLocale);

    return `
      <tr data-key-id="${k._id}" data-key="${this.esc(k.key)}">
        <td>
          <div class="key-cell">${this.esc(k.key)}</div>
          ${k.description ? `<div class="key-desc">${this.esc(k.description)}</div>` : ''}
        </td>
        <td>
          <input class="translation-input ${!src ? 'empty' : ''}" value="${this.esc(src)}" ${locked ? 'readonly' : ''}
            placeholder="Source text..." data-locale="${p.sourceLocale}" data-key-id="${k._id}"
            onchange="app.saveTranslation('${k._id}', '${p.sourceLocale}', this.value, this)">
        </td>
        <td>
          ${this.currentLocale !== p.sourceLocale ? `
            <input class="translation-input ${!trans ? 'empty' : ''}" value="${this.esc(trans)}" ${locked ? 'readonly' : ''}
              placeholder="Enter translation..." data-locale="${this.currentLocale}" data-key-id="${k._id}"
              onchange="app.saveTranslation('${k._id}', '${this.currentLocale}', this.value, this)">
          ` : '<span style="color:var(--gray-400);font-size:13px">Same as source</span>'}
        </td>
        <td class="actions-cell">
          <button class="btn-icon" onclick="app.confirmDeleteKey('${k._id}', '${this.esc(k.key)}')" title="Delete key" ${locked ? 'disabled' : ''}><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `;
  },

  async saveTranslation(keyId, locale, value, inputEl) {
    if (this.currentProject.isLocked) {
      this.toast('Unlock this project before editing translations', 'error');
      if (inputEl) inputEl.blur();
      return;
    }

    try {
      await this.fetch(`${API}/projects/${this.currentProject._id}/keys/${keyId}/translate`, {
        method: 'PATCH',
        body: JSON.stringify({ locale, value })
      });
      if (inputEl) {
        inputEl.classList.remove('empty');
        inputEl.classList.add('saved');
        setTimeout(() => inputEl.classList.remove('saved'), 1500);
      }
    } catch (e) {}
  },

  changeLocale(locale) {
    this.currentLocale = locale;
    this.saveViewState();
    this.updateRoute({ page: 'project', projectId: this.currentProject._id, locale }, true);
    this.renderProjectDetail();
  },

  showAddKeyModal() {
    if (this.currentProject.isLocked) return this.toast('Unlock this project before adding keys', 'error');
    const srcName = this.getLocaleName(this.currentProject.sourceLocale);
    this.openModal(`
      <div class="modal-header">
        <h3>Add Translation Key</h3>
        <button class="btn-icon" onclick="app.closeModal()"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Key</label>
          <input type="text" id="newKey" placeholder="e.g. welcome.title" autofocus>
          <div class="form-hint">Use dot notation (e.g. nav.home, auth.login)</div>
        </div>
        <div class="form-group">
          <label>Description (optional)</label>
          <input type="text" id="newKeyDesc" placeholder="Context for translators">
        </div>
        <div class="form-group">
          <label>Source text (${this.esc(srcName)})</label>
          <textarea id="newKeyValue" placeholder="Enter the source text" rows="2"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="app.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="app.addKey()">Add Key</button>
      </div>
    `);
  },

  async addKey() {
    if (this.currentProject.isLocked) return this.toast('Unlock this project before adding keys', 'error');
    const key = document.getElementById('newKey').value.trim();
    const description = document.getElementById('newKeyDesc').value.trim();
    const value = document.getElementById('newKeyValue').value.trim();
    if (!key) return this.toast('Key is required', 'error');

    const translations = {};
    if (value) translations[this.currentProject.sourceLocale] = value;

    try {
      await this.fetch(`${API}/projects/${this.currentProject._id}/keys`, {
        method: 'POST',
        body: JSON.stringify({ key, description, translations })
      });
      this.closeModal();
      this.toast('Key added!', 'success');
      this.showProject(this.currentProject._id);
    } catch (e) {}
  },

  showBulkAddModal() {
    if (this.currentProject.isLocked) return this.toast('Unlock this project before importing keys', 'error');
    const srcName = this.getLocaleName(this.currentProject.sourceLocale);
    this.openModal(`
      <div class="modal-header">
        <h3>Bulk Import Keys</h3>
        <button class="btn-icon" onclick="app.closeModal()"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Paste JSON (${this.esc(srcName)})</label>
          <textarea id="bulkJson" rows="10" placeholder='{\n  "welcome.title": "Welcome",\n  "nav.home": "Home"\n}'></textarea>
          <div class="form-hint">Flat key-value JSON object.</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="app.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="app.bulkImport()">Import</button>
      </div>
    `);
  },

  async bulkImport() {
    if (this.currentProject.isLocked) return this.toast('Unlock this project before importing keys', 'error');
    const raw = document.getElementById('bulkJson').value.trim();
    if (!raw) return this.toast('Paste JSON first', 'error');
    let data;
    try { data = JSON.parse(raw); } catch (e) { return this.toast('Invalid JSON', 'error'); }
    const keys = Object.entries(data).map(([key, value]) => ({
      key, translations: { [this.currentProject.sourceLocale]: String(value) }
    }));
    try {
      const result = await this.fetch(`${API}/projects/${this.currentProject._id}/keys/bulk`, {
        method: 'POST', body: JSON.stringify({ keys })
      });
      this.closeModal();
      this.toast(`Imported: ${result.created} created, ${result.updated} updated`, 'success');
      this.showProject(this.currentProject._id);
    } catch (e) {}
  },

  showApiKeyModal() {
    const p = this.currentProject;
    this.openModal(`
      <div class="modal-header">
        <h3><i class="fa-solid fa-key"></i> API Key</h3>
        <button class="btn-icon" onclick="app.closeModal()"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body">
        <p style="font-size:14px;color:var(--gray-600);margin-bottom:12px">
          Use this API key in your client app to fetch translations at runtime.
        </p>
        <div class="api-key-box">
          <code id="apiKeyDisplay">${p.apiKey}</code>
          <button class="btn btn-sm" onclick="app.copyApiKey()"><i class="fa-solid fa-copy"></i> Copy</button>
        </div>
        <div style="margin-top:20px;padding:16px;background:var(--gray-50);border-radius:6px;font-size:13px">
          <strong>Usage Example:</strong>
          <pre style="margin-top:8px;overflow-x:auto;white-space:pre-wrap;word-break:break-all"><code>fetch('${window.location.origin}/api/v1/translations/${p.sourceLocale}', {
  headers: { 'X-API-Key': '${p.apiKey}' }
})
.then(res => res.json())
.then(data => console.log(data.translations));</code></pre>
        </div>
        <div style="margin-top:12px">
          <button class="btn btn-sm btn-danger" onclick="app.regenerateApiKey()"><i class="fa-solid fa-rotate"></i> Regenerate Key</button>
        </div>
      </div>
    `);
  },

  copyApiKey() {
    navigator.clipboard.writeText(this.currentProject.apiKey);
    this.toast('API key copied!', 'success');
  },

  async regenerateApiKey() {
    if (!confirm('Regenerate API key? Existing integrations will stop working.')) return;
    try {
      const result = await this.fetch(`${API}/projects/${this.currentProject._id}/regenerate-key`, { method: 'POST' });
      this.currentProject.apiKey = result.apiKey;
      document.getElementById('apiKeyDisplay').textContent = result.apiKey;
      this.toast('API key regenerated', 'success');
    } catch (e) {}
  },

  showProjectPasswordModal(action) {
    const locked = action === 'lock';
    this.openModal(`
      <div class="modal-header">
        <h3><i class="fa-solid ${locked ? 'fa-lock' : 'fa-lock-open'}"></i> ${locked ? 'Lock Project' : 'Unlock Project'}</h3>
        <button class="btn-icon" onclick="app.closeModal()"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body">
        <p style="font-size:14px;color:var(--gray-600);margin-bottom:12px">
          Enter the project password to ${locked ? 'lock' : 'unlock'} <strong>${this.esc(this.currentProject.name)}</strong>.
        </p>
        <div class="form-group">
          <label>Project Password</label>
          <input type="password" id="projectActionPassword" placeholder="Enter project password" autofocus>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="app.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="app.submitProjectLockAction('${action}')">${locked ? 'Lock Project' : 'Unlock Project'}</button>
      </div>
    `);
  },

  async submitProjectLockAction(action) {
    const password = document.getElementById('projectActionPassword').value;
    if (!password) return this.toast('Project password is required', 'error');

    try {
      await this.fetch(`${API}/projects/${this.currentProject._id}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ password })
      });
      this.closeModal();
      this.toast(action === 'lock' ? 'Project locked' : 'Project unlocked', 'success');
      this.showProject(this.currentProject._id, { skipRoute: true });
    } catch (e) {}
  },

  showProjectSettingsModal() {
    const p = this.currentProject;
    const hasPassword = !!p.hasProjectPassword;
    const localeRows = this.getProjectLocales(p).map((locale) => `
      <div class="form-row locale-setting-row" style="margin-bottom:8px" data-is-source="${locale.code === p.sourceLocale}">
        <div><input type="text" class="setting-locale-code" value="${this.esc(locale.code)}" placeholder="Code" ${locale.code === p.sourceLocale ? 'readonly style="background:var(--gray-100)"' : ''}></div>
        <div style="display:flex;gap:8px">
          <input type="text" class="setting-locale-name" value="${this.esc(locale.name)}" placeholder="Name" style="flex:1">
          ${locale.code !== p.sourceLocale ? `<button class="btn-icon" onclick="this.closest('.locale-setting-row').remove()" title="Remove"><i class="fa-solid fa-trash"></i></button>` : '<div style="width:30px"></div>'}
        </div>
      </div>
    `).join('');

    this.openModal(`
      <div class="modal-header">
        <h3><i class="fa-solid fa-gear"></i> Project Settings</h3>
        <button class="btn-icon" onclick="app.closeModal()"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Project Name</label>
          <input type="text" id="editName" value="${this.esc(p.name)}">
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="editDesc" rows="2">${this.esc(p.description || '')}</textarea>
        </div>
        <div class="form-group">
          <label>Locales</label>
          <div class="form-hint" style="margin-bottom:8px">Source locale (${p.sourceLocale}) code cannot be changed.</div>
          <div id="settingsLocaleRows">${localeRows}</div>
          <button class="btn btn-sm" style="margin-top:8px" onclick="app.addSettingsLocaleRow()">
            <i class="fa-solid fa-plus"></i> Add Locale
          </button>
        </div>
        <div class="form-group">
          <label>${hasPassword ? 'Change Project Password' : 'Add Project Password'}</label>
          ${hasPassword ? `
            <input type="password" id="editCurrentProjectPassword" placeholder="Current project password" autocomplete="current-password" style="margin-bottom:8px">
          ` : ''}
          <input type="password" id="editProjectPassword" placeholder="${hasPassword ? 'New project password' : 'Set a project password'}" autocomplete="new-password" style="margin-bottom:8px">
          <input type="password" id="editProjectPasswordConfirm" placeholder="Confirm new password" autocomplete="new-password">
          <div class="form-hint">${hasPassword ? 'To change the password, enter the current password, a new password, and confirm it.' : 'This project has no password yet. Add one to enable lock, unlock, and delete protection.'}</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="app.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="app.updateProject()">Save</button>
      </div>
    `);
  },

  addSettingsLocaleRow() {
    const container = document.getElementById('settingsLocaleRows');
    const row = document.createElement('div');
    row.className = 'form-row locale-setting-row';
    row.style.marginBottom = '8px';
    row.innerHTML = `
      <div><input type="text" class="setting-locale-code" placeholder="Code (e.g. ja)"></div>
      <div style="display:flex;gap:8px">
        <input type="text" class="setting-locale-name" placeholder="Name (e.g. Japanese)" style="flex:1">
        <button class="btn-icon" onclick="this.closest('.locale-setting-row').remove()" title="Remove"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;
    container.appendChild(row);
  },

  async updateProject() {
    const name = document.getElementById('editName').value.trim();
    const description = document.getElementById('editDesc').value.trim();
    const currentProjectPasswordEl = document.getElementById('editCurrentProjectPassword');
    const projectPassword = document.getElementById('editProjectPassword').value;
    const confirmProjectPassword = document.getElementById('editProjectPasswordConfirm').value;
    const currentProjectPassword = currentProjectPasswordEl ? currentProjectPasswordEl.value : '';
    const nameError = Helpers.validateRequired([
      { value: name, message: 'Name is required' }
    ]);
    if (nameError) return this.toast(nameError, 'error');

    if (projectPassword || confirmProjectPassword || currentProjectPassword) {
      if (!projectPassword) {
        return this.toast('New project password is required', 'error');
      }

      const passwordError = Helpers.validateMinLength(projectPassword, 6, 'Project password must be at least 6 characters');
      if (passwordError) return this.toast(passwordError, 'error');

      if (projectPassword !== confirmProjectPassword) {
        return this.toast('New password and confirm password must match', 'error');
      }

      if (this.currentProject.hasProjectPassword && !currentProjectPassword) {
        return this.toast('Current project password is required', 'error');
      }
    }

    const locales = this.collectLocales('.locale-setting-row', '.setting-locale-code', '.setting-locale-name', {
      sourceCode: this.currentProject.sourceLocale,
      sourceName: this.getLocaleName(this.currentProject.sourceLocale)
    });

    if (!locales) return;

    try {
      await this.fetch(`${API}/projects/${this.currentProject._id}`, {
        method: 'PUT', body: JSON.stringify({
          name,
          description,
          locales,
          projectPassword: projectPassword || undefined,
          currentProjectPassword: currentProjectPassword || undefined
        })
      });
      this.closeModal();
      this.toast('Project updated!', 'success');
      this.showProject(this.currentProject._id);
    } catch (e) {}
  },

  async confirmDeleteProject() {
    if (this.currentProject.isLocked) {
      this.toast('Unlock this project before deleting it', 'error');
      return;
    }

    this.openModal(`
      <div class="modal-header">
        <h3><i class="fa-solid fa-triangle-exclamation"></i> Delete Project</h3>
        <button class="btn-icon" onclick="app.closeModal()"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body">
        <p style="font-size:14px;color:var(--gray-600);margin-bottom:12px">
          Enter the project password to continue deleting <strong>${this.esc(this.currentProject.name)}</strong>.
        </p>
        <div class="form-group">
          <label>Project Password</label>
          <input type="password" id="deleteProjectPassword" placeholder="Enter project password" autofocus>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="app.closeModal()">Cancel</button>
        <button class="btn btn-danger" onclick="app.submitDeleteProjectPassword()"><i class="fa-solid fa-trash"></i> Continue</button>
      </div>
    `);
  },

  async submitDeleteProjectPassword() {
    const password = document.getElementById('deleteProjectPassword').value;
    if (!password) return this.toast('Project password is required', 'error');
    if (!confirm(`Are you sure you want to permanently delete "${this.currentProject.name}"?`)) return;

    try {
      await this.fetch(`${API}/projects/${this.currentProject._id}`, {
        method: 'DELETE',
        body: JSON.stringify({ password, confirm: true })
      });
      this.closeModal();
      this.toast('Project deleted', 'success');
      this.navigate('projects', { skipRoute: true });
      this.updateRoute({ page: 'projects' }, true);
      this.showProjects();
    } catch (e) {}
  },

  async confirmDeleteKey(keyId, keyName) {
    if (this.currentProject.isLocked) {
      this.toast('Unlock this project before deleting keys', 'error');
      return;
    }
    if (!confirm(`Delete key "${keyName}"?`)) return;
    try {
      await this.fetch(`${API}/projects/${this.currentProject._id}/keys/${keyId}`, { method: 'DELETE' });
      this.toast('Key deleted', 'success');
      this.showProject(this.currentProject._id);
    } catch (e) {}
  },

  // ==================== Admins ====================
  async showAdmins() {
    this.currentPage = 'admins';
    if (this.user.role !== 'super_admin') {
      return this.render(UI.renderErrorState({
        title: 'Access denied',
        message: 'Only super admins can manage users.'
      }));
    }
    this.render(UI.renderLoadingState('Loading admin users'));
    try {
      this.admins = await this.fetch(`${API}/admins`);
    } catch (e) {
      this.render(UI.renderErrorState({
        title: 'Could not load admins',
        message: e.message,
        action: '<button class="btn btn-primary" onclick="app.showAdmins()">Try Again</button>'
      }));
      return;
    }
    this.renderAdminsPage();
  },

  renderAdminsPage() {
    this.renderIntoApp(window.TranslateHubPreact.renderAdminsPage, {
      admins: this.admins,
      currentUserId: this.user._id
    });
  },

  showCreateAdminModal() {
    this.openModal(`
      <div class="modal-header">
        <h3>New Admin</h3>
        <button class="btn-icon" onclick="app.closeModal()"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Display Name</label>
          <input type="text" id="adminDisplayName" placeholder="John Doe" autofocus>
        </div>
        <div class="form-group">
          <label>Username</label>
          <input type="text" id="adminUsername" placeholder="johndoe">
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="adminPassword" placeholder="Min 6 characters">
        </div>
        <div class="form-group">
          <label>Role</label>
          <select id="adminRole">
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="app.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="app.createAdmin()">Create Admin</button>
      </div>
    `);
  },

  async createAdmin() {
    const displayName = document.getElementById('adminDisplayName').value.trim();
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value;
    const role = document.getElementById('adminRole').value;

    const requiredError = Helpers.validateRequired([
      { value: username, message: 'Username and password required' },
      { value: password, message: 'Username and password required' }
    ]);
    if (requiredError) return this.toast(requiredError, 'error');

    const passwordError = Helpers.validateMinLength(password, 6, 'Password must be at least 6 characters');
    if (passwordError) return this.toast(passwordError, 'error');

    try {
      await this.fetch(`${API}/admins`, {
        method: 'POST',
        body: JSON.stringify({ username, password, displayName, role })
      });
      this.closeModal();
      this.toast('Admin created!', 'success');
      this.showAdmins();
    } catch (e) {}
  },

  showEditAdminModal(adminId) {
    const a = this.admins.find(x => x._id === adminId);
    if (!a) return;

    this.openModal(`
      <div class="modal-header">
        <h3>Edit Admin</h3>
        <button class="btn-icon" onclick="app.closeModal()"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Display Name</label>
          <input type="text" id="editAdminDisplayName" value="${this.esc(a.displayName || '')}">
        </div>
        <div class="form-group">
          <label>Role</label>
          <select id="editAdminRole">
            <option value="admin" ${a.role === 'admin' ? 'selected' : ''}>Admin</option>
            <option value="super_admin" ${a.role === 'super_admin' ? 'selected' : ''}>Super Admin</option>
          </select>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select id="editAdminActive">
            <option value="true" ${a.active ? 'selected' : ''}>Active</option>
            <option value="false" ${!a.active ? 'selected' : ''}>Inactive</option>
          </select>
        </div>
        <div class="form-group">
          <label>New Password (leave blank to keep current)</label>
          <input type="password" id="editAdminPassword" placeholder="Leave blank to keep unchanged">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="app.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="app.updateAdmin('${a._id}')">Save</button>
      </div>
    `);
  },

  async updateAdmin(adminId) {
    const displayName = document.getElementById('editAdminDisplayName').value.trim();
    const role = document.getElementById('editAdminRole').value;
    const active = document.getElementById('editAdminActive').value === 'true';
    const password = document.getElementById('editAdminPassword').value;

    const body = { displayName, role, active };
    if (password) body.password = password;

    try {
      await this.fetch(`${API}/admins/${adminId}`, { method: 'PUT', body: JSON.stringify(body) });
      this.closeModal();
      this.toast('Admin updated!', 'success');
      this.showAdmins();
    } catch (e) {}
  },

  async confirmDeleteAdmin(adminId, username) {
    if (!confirm(`Delete admin "${username}"? This cannot be undone.`)) return;
    try {
      await this.fetch(`${API}/admins/${adminId}`, { method: 'DELETE' });
      this.toast('Admin deleted', 'success');
      this.showAdmins();
    } catch (e) {}
  },

  // ==================== Documentation ====================
  showDocs() {
    this.currentPage = 'docs';
    this.renderIntoApp(window.TranslateHubPreact.renderDocsPage);
  },

  // ==================== Helpers ====================
  collectLocales(rowSelector, codeSelector, nameSelector, { sourceCode, sourceName }) {
    const entries = Array.from(document.querySelectorAll(rowSelector)).map((row) => ({
      code: row.querySelector(codeSelector).value.trim(),
      name: row.querySelector(nameSelector).value.trim()
    }));
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

  // ==================== Init ====================
  async init() {
    this.setTheme(this.currentTheme);
    this.renderModalHost();
    document.addEventListener('click', () => this.closeThemeMenu());
    window.addEventListener('hashchange', () => this.handleRouteChange());
    document.addEventListener('keydown', (event) => {
      const isQuickAction = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (isQuickAction) {
        event.preventDefault();
        this.openCommandBar();
      }

      if (event.key === 'Escape') {
        this.closeCommandBar();
        this.closeModal();
      }

      if (document.getElementById('modalOverlay').classList.contains('active')) {
        A11y.trapFocus(document.getElementById('modalContent'), event);
      }

      if (document.getElementById('commandOverlay').classList.contains('active')) {
        A11y.trapFocus(document.getElementById('commandBar') || document.querySelector('.command-bar'), event);
      }
    });

    if (this.token) {
      try {
        const data = await this.fetch(`${API}/auth/me`);
        this.user = data.user;
        localStorage.setItem('th_user', JSON.stringify(data.user));
        this.showDashboard();
      } catch (e) {
        this.logout();
      }
    } else {
      this.showAuthScreen();
    }
  }
};

window.app = app;
document.addEventListener('DOMContentLoaded', () => {
  if (window.TranslateHubPreact) {
    app.init();
    return;
  }

  window.addEventListener('translatehub:preact-ready', () => app.init(), { once: true });
});
