import { h, render } from '/vendor/preact/dist/preact.module.js';
import { useMemo, useState } from '/vendor/preact/hooks/dist/hooks.module.js';
import htm from '/vendor/htm/dist/htm.module.js';

const html = htm.bind(h);

function buildProgressStats(project, keys) {
  const locales = window.app.getProjectLocales(project);
  const items = Array.isArray(keys) ? keys : [];
  const total = items.length;

  return locales.reduce((acc, locale) => {
    const translated = items.reduce((count, item) => count + (getTranslation(item.translations, locale.code) ? 1 : 0), 0);
    acc[locale.code] = {
      name: locale.name,
      translated,
      total,
      percentage: total ? Math.round((translated / total) * 100) : 0
    };
    return acc;
  }, {});
}

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
        <div class="key-desc"><code>${item.fullKey}</code></div>
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

function PageListRow({ page, active }) {
  return html`
    <button class=${`page-list-row ${active ? 'active' : ''}`} type="button" onClick=${() => window.app.selectProjectPage(String(page._id || ''))}>
      <span class="page-list-name"><i class="fa-solid fa-file-lines"></i> ${page.name}</span>
      <span class="page-list-key"><code>${page.pageKey}</code></span>
      <span class="page-list-count">${page.keyCount || 0} keys</span>
      <span class="page-list-desc">${page.description || '-'}</span>
      <span class="page-list-open"><i class="fa-solid fa-arrow-right"></i></span>
    </button>
  `;
}

function ProjectHeader({ project, locales, stats, currentProjectPage }) {
  const totalKeys = Object.values(stats)[0] ? Object.values(stats)[0].total : 0;
  const currentLocale = window.app.currentLocale;
  const curLocaleName = window.app.getLocaleName(currentLocale, project);
  const activeLocaleStats = stats[currentLocale] || { percentage: 0 };
  const locked = !!project.isLocked;
  const pages = window.app.getProjectPages(project);

  return html`
    <div class="project-shell">
      <div class="project-shell-head">
        <div>
          <div class="project-shell-kicker">Translation workspace</div>
          <h1 class="project-shell-title">${project.name}</h1>
          <p class="project-shell-desc">${project.description || 'A central place to manage source copy, translations, and release readiness.'}</p>
          ${currentProjectPage
            ? html`<p class="project-shell-desc" style="margin-top:10px"><strong>${currentProjectPage.name}</strong> page using prefix <code>${currentProjectPage.pageKey}</code></p>`
            : html`<p class="project-shell-desc" style="margin-top:10px">Choose a page below to start editing that page's translation keys.</p>`}
        </div>
        <div class="project-shell-actions">
          <div class="project-pill-grid">
            <div class="project-pill"><i class="fa-solid fa-earth-americas"></i><span>${locales.length} locales</span></div>
            <div class="project-pill"><i class="fa-solid fa-window-maximize"></i><span>${pages.length} pages</span></div>
            <div class="project-pill"><i class="fa-solid fa-file-lines"></i><span>${totalKeys} keys</span></div>
            <div class="project-pill"><i class="fa-solid fa-chart-line"></i><span>${activeLocaleStats.percentage}% in ${curLocaleName}</span></div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-sm" type="button" disabled=${locked} onClick=${() => window.app.showCreatePageModal()}><i class="fa-solid fa-plus"></i> Add Page</button>
            ${currentProjectPage ? html`<button class="btn btn-sm" type="button" disabled=${locked} onClick=${() => window.app.showEditPageModal(currentProjectPage._id)}><i class="fa-solid fa-pen"></i> Edit Page</button>` : ''}
            ${currentProjectPage ? html`<button class="btn btn-sm btn-danger" type="button" disabled=${locked} onClick=${() => window.app.confirmDeletePage(currentProjectPage._id)}><i class="fa-solid fa-trash"></i> Delete Page</button>` : ''}
            <button class="btn btn-sm" type="button" onClick=${() => window.app.showProjectPasswordModal(locked ? 'unlock' : 'lock')}><i class=${`fa-solid ${locked ? 'fa-lock-open' : 'fa-lock'}`}></i> ${locked ? 'Unlock' : 'Lock'}</button>
            <button class="btn btn-sm" type="button" onClick=${() => window.app.showApiKeyModal()}><i class="fa-solid fa-key"></i> API Key</button>
            <button class="btn btn-sm" type="button" onClick=${() => window.app.showProjectSettingsModal()}><i class="fa-solid fa-gear"></i> Settings</button>
            <button class="btn btn-sm btn-danger" type="button" disabled=${locked} onClick=${() => window.app.confirmDeleteProject()}><i class="fa-solid fa-trash"></i> Delete</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function ProjectOverview({ project, stats }) {
  const locales = window.app.getProjectLocales(project);
  const pages = window.app.getProjectPages(project);
  const locked = !!project.isLocked;

  return html`
    <div class="breadcrumb">
      <button type="button" class="breadcrumb-link" onClick=${() => window.app.navigate('projects')}>Projects</button>
      <span>/</span>
      <span>${project.name}</span>
    </div>

    <${ProjectHeader} project=${project} locales=${locales} stats=${stats} currentProjectPage=${null} />

    <div class=${`project-lock-banner ${locked ? '' : 'unlocked'}`}>
      <i class=${`fa-solid ${locked ? 'fa-lock' : 'fa-lock-open'}`}></i>
      <div>
        <strong>${locked ? 'Project locked' : 'Project unlocked'}</strong>
        <p>${locked ? 'Unlock it with the project password before editing pages or translation keys.' : 'Pages and keys can be edited now, but deleting the project still requires the project password.'}</p>
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
      <div class="card-header"><h2><i class="fa-solid fa-window-maximize"></i> Pages</h2></div>
      <div class="card-body">
        ${pages.length
          ? html`
              <div class="page-list-head">
                <span>Name</span>
                <span>Prefix</span>
                <span>Keys</span>
                <span>Description</span>
                <span></span>
              </div>
              <div class="page-list-stack">
                ${pages.map((page) => html`<${PageListRow} key=${String(page._id || '')} page=${page} active=${false} />`)}
              </div>
            `
          : html`<div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-window-maximize"></i></div><h3>No pages yet</h3><p>Create a page like <code>dashboard</code> or <code>settings</code> to organize translations.</p><button class="btn btn-primary" type="button" disabled=${locked} onClick=${() => window.app.showCreatePageModal()}><i class="fa-solid fa-plus"></i> Add Page</button></div>`}
      </div>
    </div>
  `;
}

function PageWorkspace({ project, keys, currentLocale, currentProjectPage }) {
  const [search, setSearch] = useState('');
  const locales = window.app.getProjectLocales(project);
  const locked = !!project.isLocked;
  const curLocaleName = window.app.getLocaleName(currentLocale, project);
  const safeKeys = Array.isArray(keys) ? keys.filter(Boolean) : [];
  const pageStats = buildProgressStats(project, safeKeys);
  const filteredKeys = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return safeKeys;
    return safeKeys.filter((item) => String(item.key || '').toLowerCase().includes(q) || String(item.fullKey || '').toLowerCase().includes(q));
  }, [safeKeys, search]);

  return html`
    <div class="breadcrumb">
      <button type="button" class="breadcrumb-link" onClick=${() => window.app.navigate('projects')}>Projects</button>
      <span>/</span>
      <button type="button" class="breadcrumb-link" onClick=${() => window.app.showProject(project._id, { pageId: null })}>${project.name}</button>
      <span>/</span>
      <span>${currentProjectPage.name}</span>
    </div>

    <div class="card" style="margin-bottom:20px">
      <div class="card-header">
        <h2><i class="fa-solid fa-file-lines"></i> ${currentProjectPage.name}</h2>
      </div>
      <div class="card-body" style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:flex-start">
        <div>
          <div class="project-shell-kicker">Page translations</div>
          <p class="project-shell-desc" style="margin-top:6px">Prefix <code>${currentProjectPage.pageKey}</code>${currentProjectPage.description ? ` - ${currentProjectPage.description}` : ''}</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-sm" type="button" disabled=${locked} onClick=${() => window.app.showEditPageModal(currentProjectPage._id)}><i class="fa-solid fa-pen"></i> Edit Page</button>
          <button class="btn btn-sm btn-danger" type="button" disabled=${locked} onClick=${() => window.app.confirmDeletePage(currentProjectPage._id)}><i class="fa-solid fa-trash"></i> Delete Page</button>
        </div>
      </div>
    </div>

    <div class=${`project-lock-banner ${locked ? '' : 'unlocked'}`}>
      <i class=${`fa-solid ${locked ? 'fa-lock' : 'fa-lock-open'}`}></i>
      <div>
        <strong>${locked ? 'Project locked' : 'Project unlocked'}</strong>
        <p>${locked ? 'Unlock it with the project password before editing keys or deleting this page.' : 'Keys can be edited now, but page and project deletion still require confirmation.'}</p>
      </div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <div class="card-header"><h2><i class="fa-solid fa-chart-bar"></i> Translation Progress</h2></div>
      <div class="card-body">
        <div class="stats-grid">
          ${Object.keys(pageStats).length
            ? Object.entries(pageStats).map(([code, stat]) => html`<${StatsCard} key=${code} code=${code} stat=${stat} isSource=${code === project.sourceLocale} />`)
            : html`<p style="color:var(--gray-500)">Add some translation keys to see progress for this page.</p>`}
        </div>
      </div>
    </div>

    <div class="card">
      <div class="translation-toolbar">
        <div class="project-pill"><i class="fa-solid fa-hashtag"></i><span>Prefix: <strong>${currentProjectPage.pageKey}</strong></span></div>
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
          ? html`<div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-file-lines"></i></div><h3>No translation keys</h3><p>Add keys to ${currentProjectPage.pageKey} to start translating this page.</p></div>`
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
                  ${filteredKeys.map((item) => html`<${KeyRow} key=${String(item._id || item.key || '')} item=${item} project=${project} currentLocale=${currentLocale} locked=${locked} />`)}
                </tbody>
              </table>
            `}
      </div>
    </div>
  `;
}

function ProjectDetail(props) {
  const project = props.project || {};
  const currentProjectPage = props.currentProjectPage || null;

  if (currentProjectPage) {
    return html`<${PageWorkspace} ...${props} project=${project} currentProjectPage=${currentProjectPage} />`;
  }

  return html`<${ProjectOverview} project=${project} stats=${project.stats || {}} />`;
}

export function renderProjectDetail(container, props) {
  try {
    render(html`<${ProjectDetail} ...${props} />`, container);
  } catch (error) {
    console.error('TranslateHub project detail render failed:', error, props);
    container.innerHTML = `
      <div class="status-panel error">
        <div class="status-icon"><i class="fa-solid fa-circle-exclamation"></i></div>
        <h3>Could not render project page</h3>
        <p>${String(error && error.message || 'Unknown render error')}</p>
      </div>
    `;
  }
}
