(function (root) {
  const UI = root.TranslateHubUI;
  const Helpers = root.TranslateHubHelpers;
  const Config = root.TranslateHubConfig;

  function getFirstProjectPage(project) {
    return ((project && project.pages) || [])[0] || null;
  }

  function getActiveProjectPage(app, project, preferredPageId) {
    const pages = (project && project.pages) || [];
    if (!pages.length || !preferredPageId) return null;
    return pages.find((page) => String(page._id) === String(preferredPageId || ''))
      || pages.find((page) => String(page._id) === String(app.currentProjectPageId || ''))
      || null;
  }

  root.TranslateHubProjectActions = {
    async loadProjectPageKeys(projectId, pageId) {
      if (!pageId) {
        this.keys = [];
        return [];
      }

      try {
        this.keys = await this.fetch(`/api/projects/${projectId}/pages/${pageId}/keys`);
      } catch (e) {
        this.keys = [];
      }

      return this.keys;
    },

    async showProjects() {
      this.currentPage = 'projects';
      this.currentProject = null;
      this.currentProjectId = null;
      this.currentProjectPageId = null;
      this.currentProjectPage = null;
      this.saveViewState();
      this.render(UI.renderLoadingState('Loading projects'));
      try {
        this.projects = await this.fetch(Config.API_PATHS.projects);
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
      this.renderIntoApp(root.TranslateHubPreact.renderProjectsPage, { projects: this.projects });
    },

    showCreateProjectModal() {
      this.openModal({
        type: 'create-project',
        name: '',
        description: '',
        sourceCode: 'en',
        sourceName: 'English',
        projectPassword: '',
        targetLocales: [{ code: '', name: '' }]
      });
    },

    async createProject() {
      const name = String(this.modalState && this.modalState.name || '').trim();
      const description = String(this.modalState && this.modalState.description || '').trim();
      const sourceCode = String(this.modalState && this.modalState.sourceCode || 'en').trim() || 'en';
      const sourceName = String(this.modalState && this.modalState.sourceName || 'English').trim() || 'English';
      const projectPassword = String(this.modalState && this.modalState.projectPassword || '');

      const nameError = Helpers.validateRequired([{ value: name, message: 'Project name is required' }]);
      if (nameError) return this.toast(nameError, 'error');

      const passwordError = Helpers.validateMinLength(projectPassword, 6, 'Project password must be at least 6 characters');
      if (passwordError) return this.toast(passwordError, 'error');

      const locales = this.collectLocaleEntries((this.modalState && this.modalState.targetLocales) || [], { sourceCode, sourceName });
      if (!locales) return;

      try {
        const project = await this.fetch(Config.API_PATHS.projects, {
          method: 'POST',
          body: JSON.stringify({ name, description, sourceLocale: sourceCode, locales, projectPassword })
        });
        await this.refreshProjectsCache();
        this.closeModal();
        this.toast('Project created!', 'success');
        this.showProject(project._id);
      } catch (e) {}
    },

    async showProject(projectId, options = {}) {
      const requestedPageId = Object.prototype.hasOwnProperty.call(options, 'pageId') ? options.pageId : this.currentProjectPageId;
      if (!options.skipRoute && this.updateRoute({ page: 'project', projectId, pageId: requestedPageId, locale: this.currentLocale })) return;
      this.render(UI.renderLoadingState('Loading project details'));

      try {
        this.currentProject = await this.fetch(`/api/projects/${projectId}`);
      } catch (e) {
        this.currentProject = null;
        this.currentProjectId = null;
        this.currentProjectPageId = null;
        this.currentProjectPage = null;
        this.currentLocale = null;
        this.saveViewState();
        this.showProjects();
        return;
      }

      this.currentPage = 'projects';
      this.currentProjectId = projectId;
      this.currentProjectPage = getActiveProjectPage(this, this.currentProject, requestedPageId);
      this.currentProjectPageId = this.currentProjectPage ? this.currentProjectPage._id : null;

      const codes = this.getLocaleCodes();
      if (!this.currentLocale || !codes.includes(this.currentLocale)) {
        this.currentLocale = codes.find((c) => c !== this.currentProject.sourceLocale) || this.currentProject.sourceLocale;
      }

      await this.loadProjectPageKeys(projectId, this.currentProjectPageId);

      this.saveViewState();
      await this.refreshProjectsCache();
      this.updateRoute({ page: 'project', projectId, pageId: this.currentProjectPageId, locale: this.currentLocale }, true);
      this.renderSidebar();
      this.closeSidebar();
      this.renderProjectDetail();
    },

    renderProjectDetail() {
      this.renderIntoApp(root.TranslateHubPreact.renderProjectDetail, {
        project: this.currentProject,
        keys: this.keys,
        currentLocale: this.currentLocale,
        currentProjectPage: this.currentProjectPage
      });
    },

    async selectProjectPage(pageId) {
      if (!this.currentProject || pageId === this.currentProjectPageId) return;
      this.showProject(this.currentProject._id, { pageId });
    },

    async saveTranslation(keyId, locale, value, inputEl) {
      if (this.currentProject.isLocked) {
        this.toast('Unlock this project before editing translations', 'error');
        if (inputEl) inputEl.blur();
        return;
      }

      if (!this.currentProjectPageId) {
        this.toast('Create a page before editing translations', 'error');
        return;
      }

      try {
        await this.fetch(`/api/projects/${this.currentProject._id}/pages/${this.currentProjectPageId}/keys/${keyId}/translate`, {
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
      this.updateRoute({ page: 'project', projectId: this.currentProject._id, pageId: this.currentProjectPageId, locale }, true);
      this.renderProjectDetail();
    },

    showCreatePageModal() {
      if (this.currentProject && this.currentProject.isLocked) return this.toast('Unlock this project before adding pages', 'error');
      this.openModal({ type: 'create-page', name: '', pageKey: '', description: '' });
    },

    async createPage() {
      if (!this.currentProject) return;
      const name = String(this.modalState && this.modalState.name || '').trim();
      const pageKey = Helpers.normalizePageKey(this.modalState && this.modalState.pageKey || '');
      const description = String(this.modalState && this.modalState.description || '').trim();

      if (!name) return this.toast('Page name is required', 'error');
      if (!pageKey) return this.toast('Page key is required', 'error');
      if (!Helpers.isValidPageKey(pageKey)) return this.toast('Page key may contain only lowercase letters, numbers, hyphens, and underscores', 'error');

      try {
        const page = await this.fetch(`/api/projects/${this.currentProject._id}/pages`, {
          method: 'POST',
          body: JSON.stringify({ name, pageKey, description })
        });
        this.closeModal();
        this.toast('Page created!', 'success');
        await this.refreshProjectsCache();
        this.showProject(this.currentProject._id, { pageId: page._id });
      } catch (e) {}
    },

    showEditPageModal(pageId) {
      const page = this.getProjectPages(this.currentProject).find((item) => String(item._id) === String(pageId));
      if (!page) return;
      this.openModal({ type: 'edit-page', pageId, name: page.name, pageKey: page.pageKey, description: page.description || '' });
    },

    async updatePage() {
      if (!this.currentProject) return;
      const pageId = this.modalState && this.modalState.pageId;
      const name = String(this.modalState && this.modalState.name || '').trim();
      const pageKey = Helpers.normalizePageKey(this.modalState && this.modalState.pageKey || '');
      const description = String(this.modalState && this.modalState.description || '').trim();

      if (!pageId) return;
      if (!name) return this.toast('Page name is required', 'error');
      if (!pageKey) return this.toast('Page key is required', 'error');
      if (!Helpers.isValidPageKey(pageKey)) return this.toast('Page key may contain only lowercase letters, numbers, hyphens, and underscores', 'error');

      try {
        const page = await this.fetch(`/api/projects/${this.currentProject._id}/pages/${pageId}`, {
          method: 'PUT',
          body: JSON.stringify({ name, pageKey, description })
        });
        const latestProject = await this.fetch(`/api/projects/${this.currentProject._id}`);
        this.currentProject = latestProject;
        this.currentProjectPage = getActiveProjectPage(this, latestProject, page._id);
        this.currentProjectPageId = this.currentProjectPage ? this.currentProjectPage._id : null;
        await this.loadProjectPageKeys(this.currentProject._id, this.currentProjectPageId);
        this.closeModal();
        this.toast('Page updated!', 'success');
        await this.refreshProjectsCache();
        this.saveViewState();
        this.updateRoute({ page: 'project', projectId: this.currentProject._id, pageId: this.currentProjectPageId, locale: this.currentLocale }, true);
        this.renderProjectDetail();
      } catch (e) {}
    },

    confirmDeletePage(pageId) {
      const page = this.getProjectPages(this.currentProject).find((item) => item._id === pageId);
      if (!page) return;
      if (this.currentProject.isLocked) return this.toast('Unlock this project before deleting pages', 'error');
      this.openModal({ type: 'delete-page', pageId, pageName: page.name, force: false });
    },

    async submitDeletePage(force) {
      if (!this.currentProject || !this.modalState || !this.modalState.pageId) return;
      try {
        const deletedPageId = this.modalState.pageId;
        await this.fetch(`/api/projects/${this.currentProject._id}/pages/${this.modalState.pageId}`, {
          method: 'DELETE',
          body: JSON.stringify({ force: force === true })
        });
        const remainingPages = this.getProjectPages(this.currentProject).filter((page) => String(page._id) !== String(deletedPageId));
        const nextPage = remainingPages[0] || null;
        this.closeModal();
        this.toast('Page deleted', 'success');
        await this.refreshProjectsCache();
        this.showProject(this.currentProject._id, { pageId: nextPage ? nextPage._id : null });
      } catch (e) {}
    },

    showAddKeyModal() {
      if (this.currentProject.isLocked) return this.toast('Unlock this project before adding keys', 'error');
      if (!this.currentProjectPage) return this.toast('Create a page before adding keys', 'error');
      this.openModal({
        type: 'add-key',
        sourceName: this.getLocaleName(this.currentProject.sourceLocale),
        pageKey: this.currentProjectPage.pageKey,
        key: '',
        description: '',
        sourceValue: ''
      });
    },

    async addKey() {
      if (this.currentProject.isLocked) return this.toast('Unlock this project before adding keys', 'error');
      if (!this.currentProjectPageId) return this.toast('Create a page before adding keys', 'error');
      const key = Helpers.normalizeLocalKey(this.modalState && this.modalState.key || '');
      const description = String(this.modalState && this.modalState.description || '').trim();
      const value = String(this.modalState && this.modalState.sourceValue || '').trim();
      if (!key) return this.toast('Key is required', 'error');
      if (!Helpers.isValidLocalKey(key)) return this.toast('Key may contain only lowercase letters, numbers, hyphens, and underscores', 'error');
      if (!value) return this.toast('Source text is required', 'error');

      const translations = {};
      translations[this.currentProject.sourceLocale] = value;

      try {
        await this.fetch(`/api/projects/${this.currentProject._id}/pages/${this.currentProjectPageId}/keys`, {
          method: 'POST',
          body: JSON.stringify({ key, description, translations })
        });
        this.closeModal();
        this.toast('Key added!', 'success');
        this.showProject(this.currentProject._id, { skipRoute: true, pageId: this.currentProjectPageId });
      } catch (e) {}
    },

    showBulkAddModal() {
      if (this.currentProject.isLocked) return this.toast('Unlock this project before importing keys', 'error');
      if (!this.currentProjectPage) return this.toast('Create a page before importing keys', 'error');
      this.openModal({ type: 'bulk-add', sourceName: this.getLocaleName(this.currentProject.sourceLocale), pageKey: this.currentProjectPage.pageKey });
    },

    async bulkImport() {
      if (this.currentProject.isLocked) return this.toast('Unlock this project before importing keys', 'error');
      if (!this.currentProjectPageId) return this.toast('Create a page before importing keys', 'error');
      const raw = document.getElementById('bulkJson').value.trim();
      if (!raw) return this.toast('Paste JSON first', 'error');
      let data;
      try { data = JSON.parse(raw); } catch (e) { return this.toast('Invalid JSON', 'error'); }
      const keys = Object.entries(data).map(([key, value]) => ({ key: Helpers.normalizeLocalKey(key), translations: { [this.currentProject.sourceLocale]: String(value) } }));
      try {
        const result = await this.fetch(`/api/projects/${this.currentProject._id}/pages/${this.currentProjectPageId}/keys/bulk`, {
          method: 'POST',
          body: JSON.stringify({ keys })
        });
        this.closeModal();
        this.toast(`Imported: ${result.created} created, ${result.updated} updated`, 'success');
        this.showProject(this.currentProject._id, { skipRoute: true, pageId: this.currentProjectPageId });
      } catch (e) {}
    },

    showApiKeyModal() {
      this.openModal({ type: 'api-key' });
    },

    copyApiKey() {
      navigator.clipboard.writeText(this.currentProject.apiKey);
      this.toast('API key copied!', 'success');
    },

    async regenerateApiKey() {
      if (!confirm('Regenerate API key? Existing integrations will stop working.')) return;
      try {
        const result = await this.fetch(`/api/projects/${this.currentProject._id}/regenerate-key`, { method: 'POST' });
        this.currentProject.apiKey = result.apiKey;
        const display = document.getElementById('apiKeyDisplay');
        if (display) display.textContent = result.apiKey;
        this.toast('API key regenerated', 'success');
      } catch (e) {}
    },

    showProjectPasswordModal(action) {
      this.openModal({ type: 'project-password-action', action });
    },

    async submitProjectLockAction(action) {
      const password = document.getElementById('projectActionPassword').value;
      if (!password) return this.toast('Project password is required', 'error');

      try {
        await this.fetch(`/api/projects/${this.currentProject._id}/${action}`, {
          method: 'POST',
          body: JSON.stringify({ password })
        });
        this.closeModal();
        this.toast(action === 'lock' ? 'Project locked' : 'Project unlocked', 'success');
        this.showProject(this.currentProject._id, { skipRoute: true, pageId: this.currentProjectPageId });
      } catch (e) {}
    },

    showProjectSettingsModal() {
      const p = this.currentProject;
      this.openModal({
        type: 'project-settings',
        name: p.name,
        description: p.description || '',
        currentProjectPassword: '',
        projectPassword: '',
        confirmProjectPassword: '',
        settingsLocales: this.getProjectLocales(p)
      });
    },

    async updateProject() {
      const name = String(this.modalState && this.modalState.name || '').trim();
      const description = String(this.modalState && this.modalState.description || '').trim();
      const projectPassword = String(this.modalState && this.modalState.projectPassword || '');
      const confirmProjectPassword = String(this.modalState && this.modalState.confirmProjectPassword || '');
      const currentProjectPassword = String(this.modalState && this.modalState.currentProjectPassword || '');
      const nameError = Helpers.validateRequired([{ value: name, message: 'Name is required' }]);
      if (nameError) return this.toast(nameError, 'error');

      if (projectPassword || confirmProjectPassword || currentProjectPassword) {
        if (!projectPassword) return this.toast('New project password is required', 'error');
        const passwordError = Helpers.validateMinLength(projectPassword, 6, 'Project password must be at least 6 characters');
        if (passwordError) return this.toast(passwordError, 'error');
        if (projectPassword !== confirmProjectPassword) return this.toast('New password and confirm password must match', 'error');
        if (this.currentProject.hasProjectPassword && !currentProjectPassword) return this.toast('Current project password is required', 'error');
      }

      const locales = this.collectLocaleEntries((this.modalState && this.modalState.settingsLocales) || [], {
        sourceCode: this.currentProject.sourceLocale,
        sourceName: this.getLocaleName(this.currentProject.sourceLocale)
      });
      if (!locales) return;

      try {
        await this.fetch(`/api/projects/${this.currentProject._id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name,
            description,
            locales,
            projectPassword: projectPassword || undefined,
            currentProjectPassword: currentProjectPassword || undefined
          })
        });
        this.closeModal();
        this.toast('Project updated!', 'success');
        this.showProject(this.currentProject._id, { skipRoute: true, pageId: this.currentProjectPageId });
      } catch (e) {}
    },

    async confirmDeleteProject() {
      if (this.currentProject.isLocked) {
        this.toast('Unlock this project before deleting it', 'error');
        return;
      }
      this.openModal({ type: 'delete-project' });
    },

    async submitDeleteProjectPassword() {
      const password = document.getElementById('deleteProjectPassword').value;
      if (!password) return this.toast('Project password is required', 'error');
      if (!confirm(`Are you sure you want to permanently delete "${this.currentProject.name}"?`)) return;

      try {
        await this.fetch(`/api/projects/${this.currentProject._id}`, {
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
        await this.fetch(`/api/projects/${this.currentProject._id}/pages/${this.currentProjectPageId}/keys/${keyId}`, { method: 'DELETE' });
        this.toast('Key deleted', 'success');
        this.showProject(this.currentProject._id, { skipRoute: true, pageId: this.currentProjectPageId });
      } catch (e) {}
    },

    showDocs() {
      this.currentPage = 'docs';
      this.renderIntoApp(root.TranslateHubPreact.renderDocsPage);
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
