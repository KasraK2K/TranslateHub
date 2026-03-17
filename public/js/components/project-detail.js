import { h, render } from '/vendor/preact/dist/preact.module.js';
import { useMemo, useState } from '/vendor/preact/hooks/dist/hooks.module.js';
import htm from '/vendor/htm/dist/htm.module.js';

const html = htm.bind(h);

function getTranslation(translations, locale) {
  if (!translations) return '';
  if (translations instanceof Map) return translations.get(locale) || '';
  return translations[locale] || '';
}

function StatsCard({ code, stat, isSource }) {
  return html`
    <div class="stat-card">
      <div class="stat-ring" style=${`--ring:${stat.percentage}%`}>
        <span>${stat.percentage}%</span>
      </div>
      <div class="stat-locale">${stat.name || code} ${isSource ? '(source)' : ''}</div>
      <div class="stat-count">${stat.translated}/${stat.total} (${stat.percentage}%)</div>
      <div class="progress-bar">
        <div class=${`progress-fill ${stat.percentage === 100 ? 'complete' : ''}`} style=${`width:${stat.percentage}%`}></div>
      </div>
    </div>
  `;
}

function KeyRow({ item, project, currentLocale, locked }) {
  const sourceValue = getTranslation(item.translations, project.sourceLocale);
  const translatedValue = getTranslation(item.translations, currentLocale);

  return html`
    <tr>
      <td>
        <div class="key-cell">${item.key}</div>
        ${item.description ? html`<div class="key-desc">${item.description}</div>` : ''}
      </td>
      <td>
        <input
          key=${`${item._id}-${project.sourceLocale}-${sourceValue}`}
          class=${`translation-input ${!sourceValue ? 'empty' : ''}`}
          defaultValue=${sourceValue}
          readOnly=${locked}
          placeholder="Source text..."
          onChange=${(event) => window.app.saveTranslation(item._id, project.sourceLocale, event.currentTarget.value, event.currentTarget)}
        />
      </td>
      <td>
        ${currentLocale !== project.sourceLocale
          ? html`
              <input
                key=${`${item._id}-${currentLocale}-${translatedValue}`}
                class=${`translation-input ${!translatedValue ? 'empty' : ''}`}
                defaultValue=${translatedValue}
                readOnly=${locked}
                placeholder="Enter translation..."
                onChange=${(event) => window.app.saveTranslation(item._id, currentLocale, event.currentTarget.value, event.currentTarget)}
              />
            `
          : html`<span style="color:var(--gray-400);font-size:13px">Same as source</span>`}
      </td>
      <td class="actions-cell">
        <button class="btn-icon" type="button" title="Delete key" disabled=${locked} onClick=${() => window.app.confirmDeleteKey(item._id, item.key)}><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `;
}

function ProjectDetail({ project, keys, currentLocale }) {
  const [search, setSearch] = useState('');
  const stats = project.stats || {};
  const locales = window.app.getProjectLocales(project);
  const locked = !!project.isLocked;
  const curLocaleName = window.app.getLocaleName(currentLocale, project);
  const totalKeys = Object.values(stats)[0] ? Object.values(stats)[0].total : 0;
  const activeLocaleStats = stats[currentLocale] || { percentage: 0 };
  const filteredKeys = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return keys;
    return keys.filter((item) => item.key.toLowerCase().includes(q));
  }, [keys, search]);

  return html`
    <div class="breadcrumb">
      <button type="button" class="breadcrumb-link" onClick=${() => window.app.navigate('projects')}>Projects</button>
      <span>/</span>
      <span>${project.name}</span>
    </div>

    <div class="project-shell">
      <div class="project-shell-head">
        <div>
          <div class="project-shell-kicker">Translation workspace</div>
          <h1 class="project-shell-title">${project.name}</h1>
          <p class="project-shell-desc">${project.description || 'A central place to manage source copy, translations, and release readiness.'}</p>
        </div>
        <div class="project-shell-actions">
          <div class="project-pill-grid">
            <div class="project-pill"><i class="fa-solid fa-earth-americas"></i><span>${locales.length} locales</span></div>
            <div class="project-pill"><i class="fa-solid fa-file-lines"></i><span>${totalKeys} keys</span></div>
            <div class="project-pill"><i class="fa-solid fa-chart-line"></i><span>${activeLocaleStats.percentage}% in ${curLocaleName}</span></div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-sm" type="button" onClick=${() => window.app.showProjectPasswordModal(locked ? 'unlock' : 'lock')}><i class=${`fa-solid ${locked ? 'fa-lock-open' : 'fa-lock'}`}></i> ${locked ? 'Unlock' : 'Lock'}</button>
            <button class="btn btn-sm" type="button" onClick=${() => window.app.showApiKeyModal()}><i class="fa-solid fa-key"></i> API Key</button>
            <button class="btn btn-sm" type="button" onClick=${() => window.app.showProjectSettingsModal()}><i class="fa-solid fa-gear"></i> Settings</button>
            <button class="btn btn-sm btn-danger" type="button" disabled=${locked} onClick=${() => window.app.confirmDeleteProject()}><i class="fa-solid fa-trash"></i> Delete</button>
          </div>
        </div>
      </div>
    </div>

    <div class=${`project-lock-banner ${locked ? '' : 'unlocked'}`}>
      <i class=${`fa-solid ${locked ? 'fa-lock' : 'fa-lock-open'}`}></i>
      <div>
        <strong>${locked ? 'Project locked' : 'Project unlocked'}</strong>
        <p>${locked ? 'Unlock it with the project password before editing keys or deleting the project.' : 'Keys can be edited now, but deleting the project still requires the project password.'}</p>
      </div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <div class="card-header"><h2><i class="fa-solid fa-chart-bar"></i> Translation Progress</h2></div>
      <div class="card-body">
        <div class="stats-grid">
          ${Object.keys(stats).length
            ? Object.entries(stats).map(([code, stat]) => html`<${StatsCard} key=${code} code=${code} stat=${stat} isSource=${code === project.sourceLocale} />`)
            : html`<p style="color:var(--gray-500)">Add some translation keys to see progress.</p>`}
        </div>
      </div>
    </div>

    <div class="card">
      <div class="translation-toolbar">
        <input class="search-input" type="text" placeholder="Search keys..." value=${search} onInput=${(event) => setSearch(event.currentTarget.value)} />
        <div class="select-wrap locale-selector-wrap">
          <select class="locale-selector" value=${currentLocale} onChange=${(event) => window.app.changeLocale(event.currentTarget.value)}>
            ${locales.map((locale) => html`<option value=${locale.code}>${locale.name} (${locale.code})${locale.code === project.sourceLocale ? ' - source' : ''}</option>`)}
          </select>
          <i class="fa-solid fa-chevron-down select-icon"></i>
        </div>
        <button class="btn btn-primary btn-sm" type="button" disabled=${locked} onClick=${() => window.app.showAddKeyModal()}><i class="fa-solid fa-plus"></i> Add Key</button>
        <button class="btn btn-sm" type="button" disabled=${locked} onClick=${() => window.app.showBulkAddModal()}><i class="fa-solid fa-file-import"></i> Bulk Import</button>
      </div>
      <div id="keysTableContainer">
        ${filteredKeys.length === 0
          ? html`<div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-file-lines"></i></div><h3>No translation keys</h3><p>Add keys to start translating your app.</p></div>`
          : html`
              <table class="translation-table">
                <thead>
                  <tr>
                    <th style="width:30%">Key</th>
                    <th>Source (${window.app.getLocaleName(project.sourceLocale, project)})</th>
                    <th>Translation (${curLocaleName})</th>
                    <th style="width:60px"></th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredKeys.map((item) => html`<${KeyRow} key=${item._id} item=${item} project=${project} currentLocale=${currentLocale} locked=${locked} />`)}
                </tbody>
              </table>
            `}
      </div>
    </div>
  `;
}

export function renderProjectDetail(container, props) {
  render(html`<${ProjectDetail} ...${props} />`, container);
}
