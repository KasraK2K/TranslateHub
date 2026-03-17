import { renderThemeStudio } from './components/theme-studio.js';
import { renderCommandBar } from './components/command-bar.js';
import { renderAuthScreen } from './components/auth-screen.js';
import { renderProjectsPage } from './components/projects-page.js';
import { renderAdminsPage } from './components/admins-page.js';
import { renderProjectDetail } from './components/project-detail.js';

window.TranslateHubPreact = {
  renderAuthScreen,
  renderProjectsPage,
  renderAdminsPage,
  renderProjectDetail,
  renderThemeStudio,
  renderCommandBar
};

window.dispatchEvent(new Event('translatehub:preact-ready'));
