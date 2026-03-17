(function (root) {
  root.TranslateHubConfig = {
    API_BASE: '/api',
    API_PATHS: {
      authStatus: '/api/auth/status',
      authLogin: '/api/auth/login',
      authSetup: '/api/auth/setup',
      authMe: '/api/auth/me',
      projects: '/api/projects',
      admins: '/api/admins'
    },
    THEMES: [
      { id: 'aurora', label: 'Aurora', icon: 'fa-sun', tone: 'Bright glass', mode: 'light' },
      { id: 'ember', label: 'Ember', icon: 'fa-fire', tone: 'Warm editorial', mode: 'light' },
      { id: 'ocean', label: 'Ocean', icon: 'fa-water', tone: 'Cool clarity', mode: 'light' },
      { id: 'paper', label: 'Paper', icon: 'fa-feather-pointed', tone: 'Soft neutral', mode: 'light' },
      { id: 'sunset', label: 'Sunset', icon: 'fa-mountain-sun', tone: 'Golden bloom', mode: 'light' },
      { id: 'dusk', label: 'Dusk', icon: 'fa-cloud-moon', tone: 'Soft dark', mode: 'dark' },
      { id: 'graphite', label: 'Graphite', icon: 'fa-meteor', tone: 'Industrial dark', mode: 'dark' },
      { id: 'forest-night', label: 'Forest Night', icon: 'fa-leaf', tone: 'Deep green dark', mode: 'dark' },
      { id: 'midnight-neon', label: 'Midnight Neon', icon: 'fa-bolt', tone: 'Electric dark', mode: 'dark' }
    ]
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
