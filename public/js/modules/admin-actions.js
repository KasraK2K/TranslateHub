(function (root) {
  const UI = root.TranslateHubUI;
  const Helpers = root.TranslateHubHelpers;
  const Config = root.TranslateHubConfig;

  root.TranslateHubAdminActions = {
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
        this.admins = await this.fetch(Config.API_PATHS.admins);
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
      this.renderIntoApp(root.TranslateHubPreact.renderAdminsPage, {
        admins: this.admins,
        currentUserId: this.user._id
      });
    },

    showCreateAdminModal() {
      this.openModal({ type: 'create-admin' });
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
        await this.fetch(Config.API_PATHS.admins, {
          method: 'POST',
          body: JSON.stringify({ username, password, displayName, role })
        });
        this.closeModal();
        this.toast('Admin created!', 'success');
        this.showAdmins();
      } catch (e) {}
    },

    showEditAdminModal(adminId) {
      const admin = this.admins.find((item) => item._id === adminId);
      if (!admin) return;
      this.openModal({ type: 'edit-admin', adminId });
    },

    async updateAdmin(adminId) {
      const displayName = document.getElementById('editAdminDisplayName').value.trim();
      const role = document.getElementById('editAdminRole').value;
      const active = document.getElementById('editAdminActive').value === 'true';
      const password = document.getElementById('editAdminPassword').value;

      const body = { displayName, role, active };
      if (password) body.password = password;

      try {
        await this.fetch(`/api/admins/${adminId}`, { method: 'PUT', body: JSON.stringify(body) });
        this.closeModal();
        this.toast('Admin updated!', 'success');
        this.showAdmins();
      } catch (e) {}
    },

    async confirmDeleteAdmin(adminId, username) {
      if (!confirm(`Delete admin "${username}"? This cannot be undone.`)) return;
      try {
        await this.fetch(`/api/admins/${adminId}`, { method: 'DELETE' });
        this.toast('Admin deleted', 'success');
        this.showAdmins();
      } catch (e) {}
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
