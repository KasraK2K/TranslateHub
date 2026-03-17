(function (root) {
  const Router = root.TranslateHubRouter;
  const CommandBar = root.TranslateHubCommandBar;

  root.TranslateHubShellActions = {
    saveViewState() {
      localStorage.setItem('th_current_page', this.currentPage || 'projects');

      if (this.currentProjectId) localStorage.setItem('th_current_project_id', this.currentProjectId);
      else localStorage.removeItem('th_current_project_id');

      if (this.currentLocale) localStorage.setItem('th_current_locale', this.currentLocale);
      else localStorage.removeItem('th_current_locale');
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
      if (!container || !root.TranslateHubPreact) return;

      const items = CommandBar.filterItems(this.getCommandItems(), query);
      this.commandItems = items;
      if (this.activeCommandIndex >= items.length) this.activeCommandIndex = 0;

      root.TranslateHubPreact.renderCommandBar(container, {
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

      if (replace) history.replaceState(null, '', nextHash);
      else window.location.hash = nextHash;
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
      }
    },

    renderThemeSwitcher() {
      const container = document.getElementById('themeSwitcher');
      if (!container || !root.TranslateHubPreact) return;

      root.TranslateHubPreact.renderThemeStudio(container, {
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
        this.projects = await this.fetch('/api/projects');
        this.renderSidebar();
      } catch (e) {}
    },

    renderSidebar() {
      if (!root.TranslateHubPreact || !this.user) return;
      root.TranslateHubPreact.renderSidebar(document.getElementById('sidebar'), {
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
        case 'projects':
          this.showProjects();
          break;
        case 'admins':
          this.showAdmins();
          break;
        case 'docs':
          this.showDocs();
          break;
        default:
          this.showProjects();
      }
    },

    render(html) {
      document.getElementById('app').innerHTML = html;
    },

    renderIntoApp(renderer, props) {
      if (!root.TranslateHubPreact || !renderer) return;
      const container = document.getElementById('app');
      container.innerHTML = '';
      renderer(container, props);
    },

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

        const modalOverlay = document.getElementById('modalOverlay');
        const commandOverlay = document.getElementById('commandOverlay');
        if (modalOverlay && modalOverlay.classList.contains('active')) {
          root.TranslateHubAccessibility.trapFocus(document.getElementById('modalContent'), event);
        }
        if (commandOverlay && commandOverlay.classList.contains('active')) {
          root.TranslateHubAccessibility.trapFocus(document.getElementById('commandBar') || document.querySelector('.command-bar'), event);
        }
      });

      if (this.token) {
        try {
          const data = await this.fetch('/api/auth/me');
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
})(typeof globalThis !== 'undefined' ? globalThis : this);
