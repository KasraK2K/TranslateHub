const API = '/api';

const app = {
  currentProject: null,
  currentLocale: null,
  projects: [],
  keys: [],
  saveTimers: {},

  // ==================== API Helpers ====================
  async fetch(url, options = {}) {
    try {
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
      });
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

  // ==================== Toast Notifications ====================
  toast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
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

  // ==================== Projects List ====================
  async showProjects() {
    this.currentProject = null;
    this.projects = await this.fetch(`${API}/projects`);
    this.render(this.renderProjectsList());
  },

  renderProjectsList() {
    if (this.projects.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">&#127760;</div>
          <h3>No projects yet</h3>
          <p>Create your first translation project to get started.</p>
          <button class="btn btn-primary" onclick="app.showCreateProjectModal()">+ New Project</button>
        </div>
      `;
    }

    const cards = this.projects.map(p => `
      <div class="project-card" onclick="app.showProject('${p._id}')">
        <h3>${this.esc(p.name)}</h3>
        <div class="project-desc">${this.esc(p.description || 'No description')}</div>
        <div class="project-meta">
          <span>Source: <strong>${p.sourceLocale}</strong></span>
          <span>${p.locales.length} locale${p.locales.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="locale-tags">
          ${p.locales.map(l => `<span class="locale-tag">${l}</span>`).join('')}
        </div>
      </div>
    `).join('');

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h1 style="font-size:24px;font-weight:700">Projects</h1>
        <button class="btn btn-primary" onclick="app.showCreateProjectModal()">+ New Project</button>
      </div>
      <div class="project-grid">${cards}</div>
    `;
  },

  // ==================== Create Project ====================
  showCreateProjectModal() {
    this.openModal(`
      <div class="modal-header">
        <h3>New Project</h3>
        <button class="btn-icon" onclick="app.closeModal()">&times;</button>
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
        <div class="form-row">
          <div class="form-group">
            <label>Source Locale</label>
            <input type="text" id="projectSourceLocale" value="en" placeholder="en">
          </div>
          <div class="form-group">
            <label>Target Locales</label>
            <input type="text" id="projectLocales" placeholder="fr, de, es, ja">
            <div class="form-hint">Comma-separated locale codes</div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="app.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="app.createProject()">Create Project</button>
      </div>
    `);
  },

  async createProject() {
    const name = document.getElementById('projectName').value.trim();
    const description = document.getElementById('projectDesc').value.trim();
    const sourceLocale = document.getElementById('projectSourceLocale').value.trim() || 'en';
    const localesRaw = document.getElementById('projectLocales').value.trim();

    if (!name) return this.toast('Project name is required', 'error');

    const locales = [sourceLocale, ...localesRaw.split(',').map(l => l.trim()).filter(l => l && l !== sourceLocale)];

    try {
      const project = await this.fetch(`${API}/projects`, {
        method: 'POST',
        body: JSON.stringify({ name, description, sourceLocale, locales })
      });
      this.closeModal();
      this.toast('Project created!', 'success');
      this.showProject(project._id);
    } catch (e) { /* already toasted */ }
  },

  // ==================== Project Detail ====================
  async showProject(projectId) {
    this.currentProject = await this.fetch(`${API}/projects/${projectId}`);
    this.keys = await this.fetch(`${API}/projects/${projectId}/keys`);
    this.currentLocale = this.currentProject.locales.find(l => l !== this.currentProject.sourceLocale) || this.currentProject.sourceLocale;
    this.render(this.renderProjectDetail());
  },

  renderProjectDetail() {
    const p = this.currentProject;
    const stats = p.stats || {};

    const statsHtml = Object.entries(stats).map(([locale, s]) => `
      <div class="stat-card">
        <div class="stat-locale">${locale} ${locale === p.sourceLocale ? '(source)' : ''}</div>
        <div class="stat-count">${s.translated}/${s.total} (${s.percentage}%)</div>
        <div class="progress-bar">
          <div class="progress-fill ${s.percentage === 100 ? 'complete' : ''}" style="width:${s.percentage}%"></div>
        </div>
      </div>
    `).join('');

    const localeOptions = p.locales.map(l =>
      `<option value="${l}" ${l === this.currentLocale ? 'selected' : ''}>${l}${l === p.sourceLocale ? ' (source)' : ''}</option>`
    ).join('');

    const rows = this.keys.map(k => this.renderKeyRow(k)).join('');

    return `
      <div class="breadcrumb">
        <a onclick="app.showProjects()">Projects</a>
        <span>/</span>
        <span>${this.esc(p.name)}</span>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;flex-wrap:wrap;gap:12px">
        <div>
          <h1 style="font-size:24px;font-weight:700">${this.esc(p.name)}</h1>
          <p style="color:var(--gray-500);font-size:14px;margin-top:4px">${this.esc(p.description || '')}</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-sm" onclick="app.showApiKeyModal()">API Key</button>
          <button class="btn btn-sm" onclick="app.showProjectSettingsModal()">Settings</button>
          <button class="btn btn-sm btn-danger" onclick="app.confirmDeleteProject()">Delete</button>
        </div>
      </div>

      <!-- Stats -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-header"><h2>Translation Progress</h2></div>
        <div class="card-body">
          <div class="stats-grid">${statsHtml || '<p style="color:var(--gray-500)">Add some translation keys to see progress.</p>'}</div>
        </div>
      </div>

      <!-- Translations -->
      <div class="card">
        <div class="translation-toolbar">
          <input type="text" class="search-input" placeholder="Search keys..." oninput="app.filterKeys(this.value)" id="searchInput">
          <select class="locale-selector" onchange="app.changeLocale(this.value)">
            ${localeOptions}
          </select>
          <button class="btn btn-primary btn-sm" onclick="app.showAddKeyModal()">+ Add Key</button>
          <button class="btn btn-sm" onclick="app.showBulkAddModal()">Bulk Import</button>
        </div>
        <div id="keysTableContainer">
          ${this.keys.length === 0
            ? '<div class="empty-state"><div class="empty-icon">&#128221;</div><h3>No translation keys</h3><p>Add keys to start translating your app.</p></div>'
            : `<table class="translation-table">
                <thead><tr><th style="width:30%">Key</th><th>Source (${p.sourceLocale})</th><th>Translation (${this.currentLocale})</th><th style="width:60px"></th></tr></thead>
                <tbody id="keysBody">${rows}</tbody>
              </table>`
          }
        </div>
      </div>
    `;
  },

  renderKeyRow(k) {
    const p = this.currentProject;
    const sourceVal = k.translations?.[p.sourceLocale] || (k.translations instanceof Map ? '' : (k.translations?.get?.(p.sourceLocale) || ''));
    const transVal = k.translations?.[this.currentLocale] || '';

    // Handle both plain object and Map serialization from MongoDB
    const getTranslation = (translations, locale) => {
      if (!translations) return '';
      if (translations instanceof Map) return translations.get(locale) || '';
      return translations[locale] || '';
    };

    const src = getTranslation(k.translations, p.sourceLocale);
    const trans = getTranslation(k.translations, this.currentLocale);

    return `
      <tr data-key-id="${k._id}" data-key="${this.esc(k.key)}">
        <td>
          <div class="key-cell">${this.esc(k.key)}</div>
          ${k.description ? `<div class="key-desc">${this.esc(k.description)}</div>` : ''}
        </td>
        <td>
          <input class="translation-input ${!src ? 'empty' : ''}"
            value="${this.esc(src)}"
            placeholder="Source text..."
            data-locale="${p.sourceLocale}"
            data-key-id="${k._id}"
            onchange="app.saveTranslation('${k._id}', '${p.sourceLocale}', this.value, this)">
        </td>
        <td>
          ${this.currentLocale !== p.sourceLocale ? `
            <input class="translation-input ${!trans ? 'empty' : ''}"
              value="${this.esc(trans)}"
              placeholder="Enter translation..."
              data-locale="${this.currentLocale}"
              data-key-id="${k._id}"
              onchange="app.saveTranslation('${k._id}', '${this.currentLocale}', this.value, this)">
          ` : '<span style="color:var(--gray-400);font-size:13px">Same as source</span>'}
        </td>
        <td class="actions-cell">
          <button class="btn-icon" onclick="app.confirmDeleteKey('${k._id}', '${this.esc(k.key)}')" title="Delete key">&#128465;</button>
        </td>
      </tr>
    `;
  },

  async saveTranslation(keyId, locale, value, inputEl) {
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
    } catch (e) { /* already toasted */ }
  },

  changeLocale(locale) {
    this.currentLocale = locale;
    this.showProject(this.currentProject._id);
  },

  filterKeys(search) {
    const rows = document.querySelectorAll('#keysBody tr');
    const q = search.toLowerCase();
    rows.forEach(row => {
      const key = row.dataset.key.toLowerCase();
      row.style.display = key.includes(q) ? '' : 'none';
    });
  },

  // ==================== Add Key ====================
  showAddKeyModal() {
    this.openModal(`
      <div class="modal-header">
        <h3>Add Translation Key</h3>
        <button class="btn-icon" onclick="app.closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Key</label>
          <input type="text" id="newKey" placeholder="e.g. welcome.title" autofocus>
          <div class="form-hint">Use dot notation for organization (e.g. nav.home, auth.login)</div>
        </div>
        <div class="form-group">
          <label>Description (optional)</label>
          <input type="text" id="newKeyDesc" placeholder="Context for translators">
        </div>
        <div class="form-group">
          <label>Source text (${this.currentProject.sourceLocale})</label>
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
    } catch (e) { /* already toasted */ }
  },

  // ==================== Bulk Import ====================
  showBulkAddModal() {
    this.openModal(`
      <div class="modal-header">
        <h3>Bulk Import Keys</h3>
        <button class="btn-icon" onclick="app.closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Paste JSON (${this.currentProject.sourceLocale})</label>
          <textarea id="bulkJson" rows="10" placeholder='{\n  "welcome.title": "Welcome",\n  "welcome.subtitle": "Get started",\n  "nav.home": "Home"\n}'></textarea>
          <div class="form-hint">Flat key-value JSON object. Keys will be created and source text set.</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="app.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="app.bulkImport()">Import</button>
      </div>
    `);
  },

  async bulkImport() {
    const raw = document.getElementById('bulkJson').value.trim();
    if (!raw) return this.toast('Paste JSON first', 'error');

    let data;
    try { data = JSON.parse(raw); } catch (e) {
      return this.toast('Invalid JSON', 'error');
    }

    const keys = Object.entries(data).map(([key, value]) => ({
      key,
      translations: { [this.currentProject.sourceLocale]: String(value) }
    }));

    try {
      const result = await this.fetch(`${API}/projects/${this.currentProject._id}/keys/bulk`, {
        method: 'POST',
        body: JSON.stringify({ keys })
      });
      this.closeModal();
      this.toast(`Imported: ${result.created} created, ${result.updated} updated`, 'success');
      this.showProject(this.currentProject._id);
    } catch (e) { /* already toasted */ }
  },

  // ==================== API Key Modal ====================
  showApiKeyModal() {
    const p = this.currentProject;
    this.openModal(`
      <div class="modal-header">
        <h3>API Key</h3>
        <button class="btn-icon" onclick="app.closeModal()">&times;</button>
      </div>
      <div class="modal-body">
        <p style="font-size:14px;color:var(--gray-600);margin-bottom:12px">
          Use this API key in your client app to fetch translations at runtime.
        </p>
        <div class="api-key-box">
          <code id="apiKeyDisplay">${p.apiKey}</code>
          <button class="btn btn-sm" onclick="app.copyApiKey()">Copy</button>
        </div>
        <div style="margin-top:20px;padding:16px;background:var(--gray-50);border-radius:6px;font-size:13px">
          <strong>Usage Example:</strong>
          <pre style="margin-top:8px;overflow-x:auto;white-space:pre-wrap;word-break:break-all"><code>fetch('${window.location.origin}/api/v1/translations/en', {
  headers: { 'X-API-Key': '${p.apiKey}' }
})
.then(res => res.json())
.then(data => console.log(data.translations));</code></pre>
        </div>
        <div style="margin-top:12px">
          <button class="btn btn-sm btn-danger" onclick="app.regenerateApiKey()">Regenerate Key</button>
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
    } catch (e) { /* already toasted */ }
  },

  // ==================== Project Settings ====================
  showProjectSettingsModal() {
    const p = this.currentProject;
    this.openModal(`
      <div class="modal-header">
        <h3>Project Settings</h3>
        <button class="btn-icon" onclick="app.closeModal()">&times;</button>
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
          <input type="text" id="editLocales" value="${p.locales.join(', ')}">
          <div class="form-hint">Comma-separated. Source locale (${p.sourceLocale}) will always be included.</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="app.closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="app.updateProject()">Save</button>
      </div>
    `);
  },

  async updateProject() {
    const name = document.getElementById('editName').value.trim();
    const description = document.getElementById('editDesc').value.trim();
    const localesRaw = document.getElementById('editLocales').value.trim();
    const p = this.currentProject;

    if (!name) return this.toast('Name is required', 'error');

    const locales = [...new Set([
      p.sourceLocale,
      ...localesRaw.split(',').map(l => l.trim()).filter(Boolean)
    ])];

    try {
      await this.fetch(`${API}/projects/${p._id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, description, locales })
      });
      this.closeModal();
      this.toast('Project updated!', 'success');
      this.showProject(p._id);
    } catch (e) { /* already toasted */ }
  },

  // ==================== Delete ====================
  async confirmDeleteProject() {
    if (!confirm(`Delete project "${this.currentProject.name}" and all its translations? This cannot be undone.`)) return;
    try {
      await this.fetch(`${API}/projects/${this.currentProject._id}`, { method: 'DELETE' });
      this.toast('Project deleted', 'success');
      this.showProjects();
    } catch (e) { /* already toasted */ }
  },

  async confirmDeleteKey(keyId, keyName) {
    if (!confirm(`Delete key "${keyName}"?`)) return;
    try {
      await this.fetch(`${API}/projects/${this.currentProject._id}/keys/${keyId}`, { method: 'DELETE' });
      this.toast('Key deleted', 'success');
      this.showProject(this.currentProject._id);
    } catch (e) { /* already toasted */ }
  },

  // ==================== Helpers ====================
  esc(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  },

  render(html) {
    document.getElementById('app').innerHTML = html;
  },

  // ==================== Init ====================
  init() {
    this.showProjects();
  }
};

// Start the app
document.addEventListener('DOMContentLoaded', () => app.init());
