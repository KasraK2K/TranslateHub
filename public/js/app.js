const API = '/api';
const Helpers = window.TranslateHubHelpers;
const Router = window.TranslateHubRouter;
const UI = window.TranslateHubUI;

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
    document.getElementById('modalContent').innerHTML = html;
    document.getElementById('modalOverlay').classList.add('active');
  },

  closeModal(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('modalOverlay').classList.remove('active');
  },

  // ==================== Auth ====================
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
    this.isCommandBarOpen = true;
    const overlay = document.getElementById('commandOverlay');
    if (!overlay) return;
    overlay.classList.add('active');
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
  },

  getCommandItems() {
    const items = [
      { label: 'Go to Projects', hint: 'View all projects', icon: 'fa-folder', action: "app.navigate('projects')" },
      { label: 'Go to Documentation', hint: 'Open docs and API reference', icon: 'fa-book', action: "app.navigate('docs')" },
      { label: 'Create Project', hint: 'Open the new project modal', icon: 'fa-plus', action: 'app.showCreateProjectModal()' }
    ];

    if (this.user && this.user.role === 'super_admin') {
      items.splice(1, 0, { label: 'Go to Admins', hint: 'Manage dashboard access', icon: 'fa-users', action: "app.navigate('admins')" });
    }

    if (this.currentProject) {
      items.push(
        { label: 'Project Settings', hint: this.currentProject.name, icon: 'fa-gear', action: 'app.showProjectSettingsModal()' },
        { label: 'Show API Key', hint: this.currentProject.name, icon: 'fa-key', action: 'app.showApiKeyModal()' }
      );
    }

    this.projects.forEach((project) => {
      items.push({
        label: project.name,
        hint: `${project.isLocked ? 'Locked' : 'Unlocked'} project`,
        icon: project.isLocked ? 'fa-lock' : 'fa-language',
        action: `app.showProject('${project._id}')`
      });
    });

    return items;
  },

  renderCommandResults(query) {
    const container = document.getElementById('commandResults');
    if (!container) return;

    const normalizedQuery = String(query || '').trim().toLowerCase();
    const items = this.getCommandItems().filter((item) => {
      if (!normalizedQuery) return true;
      return `${item.label} ${item.hint}`.toLowerCase().includes(normalizedQuery);
    });

    container.innerHTML = items.length
      ? items.map((item) => `
          <button class="command-item" type="button" onclick="${item.action}; app.closeCommandBar();">
            <span class="command-item-icon"><i class="fa-solid ${item.icon}"></i></span>
            <span class="command-item-copy">
              <strong>${this.esc(item.label)}</strong>
              <small>${this.esc(item.hint)}</small>
            </span>
          </button>
        `).join('')
      : '<div class="command-empty"><i class="fa-solid fa-compass"></i><strong>No matches</strong><span>Try a project name, page, or action.</span></div>';
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
    if (!container) return;

    const activeTheme = this.themes.find((theme) => theme.id === this.currentTheme) || this.themes[0];
    const lightThemes = this.themes.filter((theme) => theme.mode !== 'dark');
    const darkThemes = this.themes.filter((theme) => theme.mode === 'dark');

    container.innerHTML = `
      <div class="theme-studio ${this.isThemeMenuOpen ? 'open' : ''}" onclick="event.stopPropagation()">
        <button class="theme-studio-trigger" type="button" onclick="app.toggleThemeMenu(event)">
          <span class="theme-studio-badge theme-swatch ${this.esc(activeTheme.id)}"><i class="fa-solid ${activeTheme.icon}"></i></span>
          <span class="theme-studio-copy">
            <span class="theme-studio-label">Theme</span>
            <strong>${this.esc(activeTheme.label)}</strong>
          </span>
          <span class="theme-studio-meta ${this.esc(activeTheme.mode)}">
            ${activeTheme.mode === 'dark' ? 'Dark' : 'Light'}
          </span>
          <span class="theme-studio-caret">
            <i class="fa-solid fa-chevron-down theme-studio-trigger-icon"></i>
          </span>
        </button>
        <div class="theme-studio-panel">
          <div class="theme-studio-head">
            <div>
              <strong>Choose a visual mood</strong>
              <span>${this.themes.length} themes available</span>
            </div>
          </div>
          <div class="theme-group">
            <div class="theme-group-label">Light Themes</div>
            <div class="theme-grid">
              ${lightThemes.map((theme) => this.renderThemeCard(theme)).join('')}
            </div>
          </div>
          <div class="theme-group">
            <div class="theme-group-label">Dark Themes</div>
            <div class="theme-grid">
              ${darkThemes.map((theme) => this.renderThemeCard(theme)).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  renderThemeCard(theme) {
    return `
      <button
        class="theme-card ${theme.id === this.currentTheme ? 'active' : ''}"
        onclick="app.setTheme('${theme.id}')"
        title="${theme.label} theme"
        type="button"
      >
        <span class="theme-card-top">
          <span class="theme-swatch ${this.esc(theme.id)}"><i class="fa-solid ${theme.icon}"></i></span>
          <span class="theme-card-name">${this.esc(theme.label)}</span>
        </span>
        <span class="theme-card-tone">${this.esc(theme.tone)}</span>
      </button>
    `;
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
      if (status.needsSetup) {
        this.renderSetupPage();
      } else {
        this.renderLoginPage();
      }
    } catch (e) {
      this.renderLoginPage();
    }
  },

  renderLoginPage() {
    document.getElementById('authScreen').innerHTML = `
      <div class="auth-wrapper">
        <div class="auth-card">
          <div class="auth-logo">
            <div class="icon"><img src="/logo/logo.png" alt="TranslateHub" class="brand-logo brand-logo-auth"></div>
            <p>Sign in to manage your translations</p>
          </div>
          <div class="auth-error" id="authError"></div>
          <div class="form-group">
            <label>Username</label>
            <input type="text" id="loginUsername" placeholder="Enter your username" autofocus
              onkeydown="if(event.key==='Enter')app.doLogin()">
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" id="loginPassword" placeholder="Enter your password"
              onkeydown="if(event.key==='Enter')app.doLogin()">
          </div>
          <button class="btn-auth" onclick="app.doLogin()"><i class="fa-solid fa-right-to-bracket"></i> Sign In</button>
        </div>
      </div>
    `;
  },

  renderSetupPage() {
    document.getElementById('authScreen').innerHTML = `
      <div class="auth-wrapper">
        <div class="auth-card">
          <div class="auth-logo">
            <div class="icon"><img src="/logo/logo.png" alt="TranslateHub" class="brand-logo brand-logo-auth"></div>
            <p>Create your super admin account to get started</p>
          </div>
          <div class="auth-error" id="authError"></div>
          <div class="form-group">
            <label>Display Name</label>
            <input type="text" id="setupDisplayName" placeholder="Your name" autofocus>
          </div>
          <div class="form-group">
            <label>Username</label>
            <input type="text" id="setupUsername" placeholder="Choose a username">
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" id="setupPassword" placeholder="Choose a password (min 6 chars)"
              onkeydown="if(event.key==='Enter')app.doSetup()">
          </div>
          <button class="btn-auth" onclick="app.doSetup()"><i class="fa-solid fa-user-shield"></i> Create Super Admin</button>
        </div>
      </div>
    `;
  },

  async doLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errEl = document.getElementById('authError');

    const validationError = Helpers.validateRequired([
      { value: username, message: 'Please enter username and password' },
      { value: password, message: 'Please enter username and password' }
    ]);

    if (validationError) {
      errEl.textContent = validationError;
      errEl.classList.add('visible');
      return;
    }

    try {
      errEl.classList.remove('visible');
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
      errEl.textContent = error.message;
      errEl.classList.add('visible');
    }
  },

  async doSetup() {
    const displayName = document.getElementById('setupDisplayName').value.trim();
    const username = document.getElementById('setupUsername').value.trim();
    const password = document.getElementById('setupPassword').value;
    const errEl = document.getElementById('authError');

    const requiredError = Helpers.validateRequired([
      { value: username, message: 'Username and password are required' },
      { value: password, message: 'Username and password are required' }
    ]);

    if (requiredError) {
      errEl.textContent = requiredError;
      errEl.classList.add('visible');
      return;
    }

    const passwordError = Helpers.validateMinLength(password, 6, 'Password must be at least 6 characters');
    if (passwordError) {
      errEl.textContent = passwordError;
      errEl.classList.add('visible');
      return;
    }

    try {
      errEl.classList.remove('visible');
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
      errEl.textContent = error.message;
      errEl.classList.add('visible');
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
    const isSuperAdmin = this.user.role === 'super_admin';
    const filteredProjects = this.projects.filter((project) =>
      project.name.toLowerCase().includes(this.sidebarProjectFilter.toLowerCase())
    );
    const projectItems = filteredProjects.map((project) => `
      <button class="sidebar-item ${this.currentProjectId === project._id ? 'active' : ''}" type="button" onclick="app.showProject('${project._id}')">
        <i class="fa-solid ${project.isLocked ? 'fa-lock' : 'fa-language'} icon"></i> ${this.esc(project.name)}
      </button>
    `).join('');

    document.getElementById('sidebar').innerHTML = `
      <div class="sidebar-section">
        <div class="sidebar-section-label">Menu</div>
        <button class="sidebar-item ${this.currentPage === 'projects' && !this.currentProjectId ? 'active' : ''}" type="button" onclick="app.navigate('projects')">
          <i class="fa-solid fa-folder icon"></i> Projects
        </button>
        ${isSuperAdmin ? `
        <button class="sidebar-item ${this.currentPage === 'admins' ? 'active' : ''}" type="button" onclick="app.navigate('admins')">
          <i class="fa-solid fa-users icon"></i> Admins
        </button>
        ` : ''}
        <button class="sidebar-item ${this.currentPage === 'docs' ? 'active' : ''}" type="button" onclick="app.navigate('docs')">
          <i class="fa-solid fa-book icon"></i> Documentation
        </button>
      </div>
      <div class="sidebar-section">
        <div class="sidebar-section-head">
          <div class="sidebar-section-label">Your Projects</div>
          <span class="sidebar-count">${this.projects.length}</span>
        </div>
        <div class="sidebar-project-search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" placeholder="Filter projects" value="${this.esc(this.sidebarProjectFilter)}" oninput="app.filterSidebarProjects(this.value)">
        </div>
        ${projectItems || '<div class="sidebar-empty">No matching projects</div>'}
      </div>
    `;
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
    this.render(this.renderProjectsList());
  },

  renderProjectsList() {
    if (this.projects.length === 0) {
      return `${UI.renderPageHero({
        eyebrow: 'Workspace',
        title: 'Projects',
        description: 'Create and manage localized apps from one place.',
        actions: '<button class="btn btn-primary" onclick="app.showCreateProjectModal()"><i class="fa-solid fa-plus"></i> New Project</button>'
      })}
      <div class="card">${UI.renderErrorState({
        title: 'No projects yet',
        message: 'Create your first translation project to get started.',
        action: '<button class="btn btn-primary" onclick="app.showCreateProjectModal()"><i class="fa-solid fa-plus"></i> New Project</button>'
      })}</div>`;
    }

    const cards = this.projects.map(p => {
      const locales = this.getProjectLocales(p);
      const translated = p.stats ? Object.values(p.stats).reduce((sum, item) => sum + (item.translated || 0), 0) : 0;
      const total = p.stats ? Object.values(p.stats).reduce((sum, item) => sum + (item.total || 0), 0) : 0;
      const completion = total ? Math.round((translated / total) * 100) : 0;
      return `
        <div class="project-card" onclick="app.showProject('${p._id}')">
        <button class="project-card" type="button" onclick="app.showProject('${p._id}')">
          <div class="project-card-topline">
            <span class="project-status ${p.isLocked ? 'locked' : 'unlocked'}"><i class="fa-solid ${p.isLocked ? 'fa-lock' : 'fa-lock-open'}"></i> ${p.isLocked ? 'Locked' : 'Live'}</span>
            <span class="project-score">${completion}% ready</span>
          </div>
          <h3>${this.esc(p.name)}</h3>
          <div class="project-desc">${this.esc(p.description || 'No description')}</div>
          <div class="project-meta">
            <span><i class="fa-solid fa-language"></i> Source: <strong>${p.sourceLocale}</strong></span>
            <span><i class="fa-solid fa-earth-americas"></i> ${locales.length} locale${locales.length !== 1 ? 's' : ''}</span>
            <span><i class="fa-solid fa-file-lines"></i> ${(p.stats && Object.values(p.stats)[0] && Object.values(p.stats)[0].total) || 0} keys</span>
          </div>
          <div class="project-card-progress">
            <div class="project-card-progress-bar"><span style="width:${completion}%"></span></div>
          </div>
          <div class="locale-tags">
            ${locales.map((locale) => `<span class="locale-tag">${this.esc(locale.code)} - ${this.esc(locale.name)}</span>`).join('')}
          </div>
        </button>
      `;
    }).join('');

    return `
      ${UI.renderPageHero({
        eyebrow: 'Workspace',
        title: 'Projects',
        description: 'Jump back into any app, keep locale work organized, and ship copy changes faster.',
        actions: '<button class="btn btn-primary" onclick="app.showCreateProjectModal()"><i class="fa-solid fa-plus"></i> New Project</button>'
      })}
      <div class="project-grid wide-grid">${cards}</div>
    `;
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
    this.render(this.renderProjectDetail());
  },

  renderProjectDetail() {
    const p = this.currentProject;
    const stats = p.stats || {};
    const locales = this.getProjectLocales(p);
    const locked = !!p.isLocked;
    const lockButton = locked
      ? '<button class="btn btn-sm" onclick="app.showProjectPasswordModal(\'unlock\')"><i class="fa-solid fa-lock-open"></i> Unlock</button>'
      : '<button class="btn btn-sm" onclick="app.showProjectPasswordModal(\'lock\')"><i class="fa-solid fa-lock"></i> Lock</button>';
    const lockNotice = locked
      ? '<div class="project-lock-banner"><i class="fa-solid fa-lock"></i><div><strong>Project locked</strong><p>Unlock it with the project password before editing keys or deleting the project.</p></div></div>'
      : '<div class="project-lock-banner unlocked"><i class="fa-solid fa-lock-open"></i><div><strong>Project unlocked</strong><p>Keys can be edited now, but deleting the project still requires the project password.</p></div></div>';

    const statsHtml = Object.entries(stats).map(([code, s]) => `
      <div class="stat-card">
        <div class="stat-ring" style="--ring:${s.percentage}%">
          <span>${s.percentage}%</span>
        </div>
        <div class="stat-locale">${this.esc(s.name || code)} ${code === p.sourceLocale ? '(source)' : ''}</div>
        <div class="stat-count">${s.translated}/${s.total} (${s.percentage}%)</div>
        <div class="progress-bar">
          <div class="progress-fill ${s.percentage === 100 ? 'complete' : ''}" style="width:${s.percentage}%"></div>
        </div>
      </div>
    `).join('');

    const totalKeys = Object.values(stats)[0] ? Object.values(stats)[0].total : 0;
    const activeLocaleStats = stats[this.currentLocale] || { percentage: 0, translated: 0, total: 0 };

    const localeOptions = locales.map((locale) =>
      `<option value="${this.esc(locale.code)}" ${locale.code === this.currentLocale ? 'selected' : ''}>${this.esc(locale.name)} (${this.esc(locale.code)})${locale.code === p.sourceLocale ? ' - source' : ''}</option>`
    ).join('');

    const rows = this.keys.map(k => this.renderKeyRow(k)).join('');
    const curLocaleName = this.getLocaleName(this.currentLocale);

    return `
      <div class="breadcrumb">
        <button type="button" class="breadcrumb-link" onclick="app.navigate('projects')">Projects</button>
        <span>/</span>
        <span>${this.esc(p.name)}</span>
      </div>

      <div class="project-shell">
        <div class="project-shell-head">
          <div>
            <div class="project-shell-kicker">Translation workspace</div>
            <h1 class="project-shell-title">${this.esc(p.name)}</h1>
            <p class="project-shell-desc">${this.esc(p.description || 'A central place to manage source copy, translations, and release readiness.')}</p>
          </div>
          <div class="project-shell-actions">
            <div class="project-pill-grid">
              <div class="project-pill"><i class="fa-solid fa-earth-americas"></i><span>${locales.length} locales</span></div>
              <div class="project-pill"><i class="fa-solid fa-file-lines"></i><span>${totalKeys} keys</span></div>
              <div class="project-pill"><i class="fa-solid fa-chart-line"></i><span>${activeLocaleStats.percentage}% in ${this.esc(curLocaleName)}</span></div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${lockButton}
          <button class="btn btn-sm" onclick="app.showApiKeyModal()"><i class="fa-solid fa-key"></i> API Key</button>
          <button class="btn btn-sm" onclick="app.showProjectSettingsModal()"><i class="fa-solid fa-gear"></i> Settings</button>
          <button class="btn btn-sm btn-danger" onclick="app.confirmDeleteProject()" ${locked ? 'disabled' : ''}><i class="fa-solid fa-trash"></i> Delete</button>
            </div>
          </div>
        </div>
      </div>

      ${lockNotice}

      <div class="card" style="margin-bottom:20px">
        <div class="card-header"><h2><i class="fa-solid fa-chart-bar"></i> Translation Progress</h2></div>
        <div class="card-body">
          <div class="stats-grid">${statsHtml || '<p style="color:var(--gray-500)">Add some translation keys to see progress.</p>'}</div>
        </div>
      </div>

      <div class="card">
        <div class="translation-toolbar">
          <input type="text" class="search-input" placeholder="Search keys..." oninput="app.filterKeys(this.value)">
          <div class="select-wrap locale-selector-wrap">
            <select class="locale-selector" onchange="app.changeLocale(this.value)">${localeOptions}</select>
            <i class="fa-solid fa-chevron-down select-icon"></i>
          </div>
          <button class="btn btn-primary btn-sm" onclick="app.showAddKeyModal()" ${locked ? 'disabled' : ''}><i class="fa-solid fa-plus"></i> Add Key</button>
          <button class="btn btn-sm" onclick="app.showBulkAddModal()" ${locked ? 'disabled' : ''}><i class="fa-solid fa-file-import"></i> Bulk Import</button>
        </div>
        <div id="keysTableContainer">
          ${this.keys.length === 0
            ? '<div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-file-lines"></i></div><h3>No translation keys</h3><p>Add keys to start translating your app.</p></div>'
            : `<table class="translation-table">
                <thead><tr>
                  <th style="width:30%">Key</th>
                  <th>Source (${this.getLocaleName(p.sourceLocale)})</th>
                  <th>Translation (${this.esc(curLocaleName)})</th>
                  <th style="width:60px"></th>
                </tr></thead>
                <tbody id="keysBody">${rows}</tbody>
              </table>`}
        </div>
      </div>
    `;
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
    this.render(this.renderProjectDetail());
  },

  filterKeys(search) {
    const rows = document.querySelectorAll('#keysBody tr');
    const q = search.toLowerCase();
    rows.forEach(row => {
      row.style.display = row.dataset.key.toLowerCase().includes(q) ? '' : 'none';
    });
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
    this.render(this.renderAdminsPage());
  },

  renderAdminsPage() {
    const rows = this.admins.map(a => `
      <tr>
        <td><strong>${this.esc(a.displayName || a.username)}</strong></td>
        <td><code style="font-size:13px">${this.esc(a.username)}</code></td>
        <td><span class="role-badge ${a.role}">${a.role === 'super_admin' ? 'Super Admin' : 'Admin'}</span></td>
        <td><span class="status-badge ${a.active ? 'active' : 'inactive'}">${a.active ? 'Active' : 'Inactive'}</span></td>
        <td style="text-align:right">
          <button class="btn btn-sm" onclick="app.showEditAdminModal('${a._id}')"><i class="fa-solid fa-pen"></i> Edit</button>
          ${a._id !== this.user._id ? `<button class="btn btn-sm btn-danger" onclick="app.confirmDeleteAdmin('${a._id}', '${this.esc(a.username)}')"><i class="fa-solid fa-trash"></i> Delete</button>` : ''}
        </td>
      </tr>
    `).join('');

    return `
      ${UI.renderPageHero({
        eyebrow: 'Access Control',
        title: 'Admin Users',
        description: 'Manage who can access the dashboard and what level of control they have.',
        actions: '<button class="btn btn-primary" onclick="app.showCreateAdminModal()"><i class="fa-solid fa-user-plus"></i> New Admin</button>'
      })}
      <div class="card">
        <table class="admin-table">
          <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
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
    this.render(`
      ${UI.renderPageHero({
        eyebrow: 'Reference',
        title: 'Documentation',
        description: 'Everything you need to configure, use, and integrate TranslateHub.'
      })}
      <div class="docs-content docs-wide">
        <h1><i class="fa-solid fa-book"></i> TranslateHub Documentation</h1>
        <p>TranslateHub is a translation management platform that lets you manage your application's translations externally. Your client apps fetch translations at runtime via a REST API, so you never need to redeploy to update text.</p>

        <h2>Getting Started</h2>

        <h3>1. Create a Project</h3>
        <p>Go to the <strong>Projects</strong> page and click <strong>"+ New Project"</strong>. Fill in:</p>
        <ul>
          <li><strong>Project Name</strong> &ndash; A human-readable name for your app or service</li>
          <li><strong>Source Locale</strong> &ndash; The primary language with a code and name (e.g. code: <code>en-US</code>, name: <code>United States</code>)</li>
          <li><strong>Target Locales</strong> &ndash; Each language gets a code + name (e.g. code: <code>fa</code>, name: <code>Persian</code>)</li>
        </ul>
        <p>Locale codes can use any format you prefer: <code>en</code>, <code>en-US</code>, <code>en-UK</code>, <code>fr</code>, <code>fa</code>, etc. Each project gets its own <strong>API Key</strong> for client app integration.</p>

        <h3>2. Add Translation Keys</h3>
        <p>Translation keys are identifiers your app uses to reference specific text. We recommend <strong>dot notation</strong> for organization:</p>
        <pre><code>common.welcome       = "Welcome to our app!"
nav.home             = "Home"
nav.settings         = "Settings"
auth.login.title     = "Sign In"
auth.login.email     = "Email Address"
errors.notFound      = "Page not found"</code></pre>
        <p>You can add keys one at a time via <strong>"+ Add Key"</strong>, or import many at once with <strong>"Bulk Import"</strong> by pasting a JSON object:</p>
        <pre><code>{
  "common.welcome": "Welcome to our app!",
  "nav.home": "Home",
  "nav.settings": "Settings"
}</code></pre>

        <h3>3. Translate</h3>
        <p>On the project detail page, use the <strong>locale selector</strong> dropdown to switch between languages. Click into any translation cell to type the translated text. Changes save automatically when you leave the field.</p>
        <p>The <strong>Translation Progress</strong> section shows completion percentage for each locale.</p>

        <h2>Integrating with Your Application</h2>

        <h3>Getting Your API Key</h3>
        <p>Open your project, click <strong>"API Key"</strong>, and copy the key. It looks like: <code>th_a1b2c3d4e5...</code></p>

        <div class="docs-callout info">
          <strong>Important:</strong> The API key identifies your project. Keep it in environment variables, not in source code.
        </div>

        <h3>REST API Endpoints</h3>
        <p>All public endpoints require the <code>X-API-Key</code> header.</p>

        <h3>Fetch translations for a single locale</h3>
        <pre><code>GET /api/v1/translations/:localeCode

// Example: fetch French translations
GET /api/v1/translations/fr
Headers: { "X-API-Key": "th_your_key_here" }

// Response
{
  "locale": "fr",
  "localeName": "French",
  "projectId": "...",
  "translations": {
    "common.welcome": "Bienvenue dans notre application !",
    "nav.home": "Accueil"
  }
}</code></pre>
        <p>If a key is not translated in the requested locale, the source locale value is returned as fallback.</p>

        <h3>Fetch all translations (all locales)</h3>
        <pre><code>GET /api/v1/translations

// Response
{
  "projectId": "...",
  "locales": [
    { "code": "en-US", "name": "United States" },
    { "code": "fr", "name": "French" }
  ],
  "sourceLocale": "en-US",
  "translations": {
    "en-US": { "common.welcome": "Welcome!", ... },
    "fr": { "common.welcome": "Bienvenue !", ... }
  }
}</code></pre>

        <h3>Get available locales</h3>
        <pre><code>GET /api/v1/locales

// Response
{
  "sourceLocale": "en-US",
  "locales": [
    { "code": "en-US", "name": "United States" },
    { "code": "fr", "name": "French" },
    { "code": "fa", "name": "Persian" }
  ]
}</code></pre>

        <h2>Integration Examples</h2>

        <h3>JavaScript / React</h3>
        <pre><code>// i18n.js - Simple translation loader
const API_URL = 'https://your-server.com/api/v1';
const API_KEY = process.env.TRANSLATE_HUB_KEY;

let translations = {};

export async function loadTranslations(locale = 'en') {
  const res = await fetch(\`\${API_URL}/translations/\${locale}\`, {
    headers: { 'X-API-Key': API_KEY }
  });
  const data = await res.json();
  translations = data.translations;
}

export function t(key, fallback = key) {
  return translations[key] || fallback;
}

// Usage:
// await loadTranslations('fr');
// t('common.welcome') => "Bienvenue !"</code></pre>

        <h3>Node.js / Express</h3>
        <pre><code>const axios = require('axios');

const cache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getTranslations(locale) {
  const now = Date.now();
  if (cache[locale] && now - cache[locale].time < CACHE_TTL) {
    return cache[locale].data;
  }

  const res = await axios.get(
    \`http://localhost:3000/api/v1/translations/\${locale}\`,
    { headers: { 'X-API-Key': process.env.TRANSLATE_HUB_KEY } }
  );

  cache[locale] = { data: res.data.translations, time: now };
  return res.data.translations;
}

// Express middleware
module.exports = async (req, res, next) => {
  const locale = req.query.lang || 'en';
  req.t = await getTranslations(locale);
  next();
};</code></pre>

        <h3>Python / Flask</h3>
        <pre><code>import requests
from functools import lru_cache

API_URL = "http://localhost:3000/api/v1"
API_KEY = "th_your_key_here"

@lru_cache(maxsize=32)
def get_translations(locale="en"):
    res = requests.get(
        f"{API_URL}/translations/{locale}",
        headers={"X-API-Key": API_KEY}
    )
    return res.json()["translations"]

def t(key, locale="en"):
    return get_translations(locale).get(key, key)</code></pre>

        <h2>Admin Management</h2>
        <p>Super admins can manage other admin users from the <strong>Admins</strong> page in the sidebar.</p>
        <ul>
          <li><strong>Super Admin</strong> &ndash; Full access: manage projects, translations, and other admins</li>
          <li><strong>Admin</strong> &ndash; Can manage projects and translations, but cannot manage other users</li>
        </ul>
        <p>Admins can be deactivated (instead of deleted) to temporarily revoke access without losing their account.</p>

        <h2>Locale Codes</h2>
        <p>TranslateHub supports any locale code format you prefer. Common conventions:</p>
        <ul>
          <li><code>en</code>, <code>fr</code>, <code>de</code> &ndash; Simple ISO 639-1 language codes</li>
          <li><code>en-US</code>, <code>en-UK</code>, <code>pt-BR</code> &ndash; Language + region (IETF BCP 47)</li>
          <li><code>fa</code>, <code>ar</code>, <code>zh-Hans</code> &ndash; Right-to-left and script variants</li>
        </ul>
        <p>Each locale also has a <strong>display name</strong> (e.g. "United States", "Persian") that appears in the dashboard for easy identification.</p>

        <h2>Best Practices</h2>
        <ul>
          <li><strong>Use dot notation</strong> for keys (e.g. <code>auth.login.title</code>) to keep translations organized</li>
          <li><strong>Add descriptions</strong> to keys to give translators context about where the text appears</li>
          <li><strong>Cache translations</strong> on the client side and refresh periodically (the API sets a 5-minute cache header)</li>
          <li><strong>Use fallback logic</strong> &ndash; if a translation is missing, fall back to the source locale</li>
          <li><strong>Keep API keys secret</strong> &ndash; store them in environment variables</li>
          <li><strong>Regenerate API keys</strong> if they are ever exposed publicly</li>
        </ul>

        <h2>API Reference Summary</h2>
        <div class="card" style="margin-top:12px">
          <table class="admin-table">
            <thead><tr><th>Method</th><th>Endpoint</th><th>Auth</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>GET</code></td><td><code>/api/v1/translations/:locale</code></td><td>API Key</td><td>Get translations for one locale</td></tr>
              <tr><td><code>GET</code></td><td><code>/api/v1/translations</code></td><td>API Key</td><td>Get all translations for all locales</td></tr>
              <tr><td><code>GET</code></td><td><code>/api/v1/locales</code></td><td>API Key</td><td>Get available locales with names</td></tr>
              <tr><td><code>GET</code></td><td><code>/api/auth/status</code></td><td>None</td><td>Check if setup is needed</td></tr>
              <tr><td><code>POST</code></td><td><code>/api/auth/setup</code></td><td>None</td><td>Create initial super admin</td></tr>
              <tr><td><code>POST</code></td><td><code>/api/auth/login</code></td><td>None</td><td>Login and get JWT token</td></tr>
              <tr><td><code>GET</code></td><td><code>/api/projects</code></td><td>JWT</td><td>List all projects</td></tr>
              <tr><td><code>POST</code></td><td><code>/api/projects</code></td><td>JWT</td><td>Create a new project</td></tr>
              <tr><td><code>GET</code></td><td><code>/api/projects/:id</code></td><td>JWT</td><td>Get project details + stats</td></tr>
              <tr><td><code>PUT</code></td><td><code>/api/projects/:id</code></td><td>JWT</td><td>Update a project</td></tr>
              <tr><td><code>DELETE</code></td><td><code>/api/projects/:id</code></td><td>JWT</td><td>Delete project and all keys</td></tr>
              <tr><td><code>GET</code></td><td><code>/api/projects/:id/keys</code></td><td>JWT</td><td>List translation keys</td></tr>
              <tr><td><code>POST</code></td><td><code>/api/projects/:id/keys</code></td><td>JWT</td><td>Add a translation key</td></tr>
              <tr><td><code>POST</code></td><td><code>/api/projects/:id/keys/bulk</code></td><td>JWT</td><td>Bulk import keys</td></tr>
              <tr><td><code>PATCH</code></td><td><code>/api/projects/:id/keys/:keyId/translate</code></td><td>JWT</td><td>Update single translation</td></tr>
              <tr><td><code>DELETE</code></td><td><code>/api/projects/:id/keys/:keyId</code></td><td>JWT</td><td>Delete a translation key</td></tr>
              <tr><td><code>GET</code></td><td><code>/api/admins</code></td><td>JWT (Super)</td><td>List all admins</td></tr>
              <tr><td><code>POST</code></td><td><code>/api/admins</code></td><td>JWT (Super)</td><td>Create a new admin</td></tr>
              <tr><td><code>PUT</code></td><td><code>/api/admins/:id</code></td><td>JWT (Super)</td><td>Update an admin</td></tr>
              <tr><td><code>DELETE</code></td><td><code>/api/admins/:id</code></td><td>JWT (Super)</td><td>Delete an admin</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `);
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

document.addEventListener('DOMContentLoaded', () => app.init());
