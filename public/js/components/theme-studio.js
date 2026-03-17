import { h, render } from '/vendor/preact/preact.module.js';
import htm from '/vendor/htm/htm.module.js';

const html = htm.bind(h);

function ThemeCard({ theme, activeTheme, onSelect }) {
  return html`
    <button
      class=${`theme-card ${theme.id === activeTheme ? 'active' : ''}`}
      type="button"
      title=${`${theme.label} theme`}
      onClick=${() => onSelect(theme.id)}
    >
      <span class="theme-card-top">
        <span class=${`theme-swatch ${theme.id}`}><i class=${`fa-solid ${theme.icon}`}></i></span>
        <span class="theme-card-name">${theme.label}</span>
      </span>
      <span class="theme-card-tone">${theme.tone}</span>
    </button>
  `;
}

function ThemeStudio({ themes, currentTheme, isOpen, onToggle, onSelect }) {
  const activeTheme = themes.find((theme) => theme.id === currentTheme) || themes[0];
  const lightThemes = themes.filter((theme) => theme.mode !== 'dark');
  const darkThemes = themes.filter((theme) => theme.mode === 'dark');

  return html`
    <div class=${`theme-studio ${isOpen ? 'open' : ''}` } onClick=${(event) => event.stopPropagation()}>
      <button class="theme-studio-trigger" type="button" onClick=${onToggle}>
        <span class=${`theme-studio-badge theme-swatch ${activeTheme.id}`}><i class=${`fa-solid ${activeTheme.icon}`}></i></span>
        <span class="theme-studio-copy">
          <span class="theme-studio-label">Theme</span>
          <strong>${activeTheme.label}</strong>
        </span>
        <span class=${`theme-studio-meta ${activeTheme.mode}`}>${activeTheme.mode === 'dark' ? 'Dark' : 'Light'}</span>
        <span class="theme-studio-caret">
          <i class="fa-solid fa-chevron-down theme-studio-trigger-icon"></i>
        </span>
      </button>
      <div class="theme-studio-panel">
        <div class="theme-studio-head">
          <div>
            <strong>Choose a visual mood</strong>
            <span>${themes.length} themes available</span>
          </div>
        </div>
        <div class="theme-group">
          <div class="theme-group-label">Light Themes</div>
          <div class="theme-grid">
            ${lightThemes.map((theme) => html`<${ThemeCard} theme=${theme} activeTheme=${currentTheme} onSelect=${onSelect} />`)}
          </div>
        </div>
        <div class="theme-group">
          <div class="theme-group-label">Dark Themes</div>
          <div class="theme-grid">
            ${darkThemes.map((theme) => html`<${ThemeCard} theme=${theme} activeTheme=${currentTheme} onSelect=${onSelect} />`)}
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderThemeStudio(container, props) {
  render(html`<${ThemeStudio} ...${props} />`, container);
}
