(function (root) {
  const Helpers = root.TranslateHubHelpers;
  const Config = root.TranslateHubConfig;

  root.TranslateHubAuthActions = {
    setAuthError(message) {
      const errorEl = document.getElementById('authError');
      if (!errorEl) return;
      errorEl.textContent = message || '';
      errorEl.classList.toggle('visible', !!message);
    },

    setAuth(token, user) {
      this.token = token;
      this.user = user;
      this.syncStore();
      localStorage.setItem('th_token', token);
      localStorage.setItem('th_user', JSON.stringify(user));
    },

    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem('th_token');
      localStorage.removeItem('th_user');
      this.currentProject = null;
      this.syncStore();
      this.showAuthScreen();
    },

    async showAuthScreen() {
      document.getElementById('dashboard').style.display = 'none';
      document.getElementById('authScreen').style.display = 'block';

      try {
        const status = await fetch(Config.API_PATHS.authStatus).then((r) => r.json());
        document.getElementById('authScreen').innerHTML = '';
        root.TranslateHubPreact.renderAuthScreen(document.getElementById('authScreen'), {
          needsSetup: !!status.needsSetup,
          errorMessage: ''
        });
      } catch (e) {
        document.getElementById('authScreen').innerHTML = '';
        root.TranslateHubPreact.renderAuthScreen(document.getElementById('authScreen'), {
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
        const data = await fetch(Config.API_PATHS.authLogin, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        }).then(async (r) => {
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
        const data = await fetch(Config.API_PATHS.authSetup, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, displayName })
        }).then(async (r) => {
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
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
