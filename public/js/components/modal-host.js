import { h, render } from '/vendor/preact/dist/preact.module.js';
import htm from '/vendor/htm/dist/htm.module.js';

const html = htm.bind(h);
const Helpers = window.TranslateHubHelpers;

function ModalFrame({ title, icon, body, footer, tone }) {
  return html`
    <div class=${`modal-stack ${tone || ''}`}>
      <div class="modal-header">
        <h3>${icon ? html`<i class=${`fa-solid ${icon}`}></i>` : ''} ${title}</h3>
        <button class="btn-icon" type="button" onClick=${() => window.app.closeModal()}><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body">${body}</div>
      ${footer ? html`<div class="modal-footer">${footer}</div>` : ''}
    </div>
  `;
}

function LocaleRows({ kind, rows, sourceCode }) {
  return rows.map((row, index) => html`
    <div class="form-row" style="margin-bottom:8px">
      <div>
        <input
          type="text"
          value=${row.code}
          placeholder="Code"
          readOnly=${kind === 'settings' && row.code === sourceCode}
          style=${kind === 'settings' && row.code === sourceCode ? 'background:var(--gray-100)' : ''}
          onInput=${(event) => window.app.updateModalLocaleRow(kind, index, 'code', event.currentTarget.value)}
        />
      </div>
      <div style="display:flex;gap:8px">
        <input
          type="text"
          value=${row.name}
          placeholder="Name"
          style="flex:1"
          onInput=${(event) => window.app.updateModalLocaleRow(kind, index, 'name', event.currentTarget.value)}
        />
        ${!(kind === 'settings' && row.code === sourceCode)
          ? html`<button class="btn-icon" type="button" title="Remove" onClick=${() => window.app.removeModalLocaleRow(kind, index)}><i class="fa-solid fa-trash"></i></button>`
          : html`<div style="width:30px"></div>`}
      </div>
    </div>
  `);
}

function CreateProjectModal({ modalState }) {
  return html`
    <${ModalFrame}
      title="New Project"
      body=${html`
        <div class="form-group"><label>Project Name</label><input type="text" id="projectName" placeholder="My App" value=${modalState.name || ''} autoFocus onInput=${(event) => window.app.updateModalField('name', event.currentTarget.value)} /></div>
        <div class="form-group"><label>Description</label><textarea id="projectDesc" placeholder="Brief description of this project" rows="2" onInput=${(event) => window.app.updateModalField('description', event.currentTarget.value)}>${modalState.description || ''}</textarea></div>
        <div class="form-group">
          <label>Source Locale</label>
          <div class="form-row">
            <div><input type="text" id="projectSourceCode" value=${modalState.sourceCode || 'en'} placeholder="Code (e.g. en-US)" onInput=${(event) => window.app.updateModalField('sourceCode', event.currentTarget.value)} /></div>
            <div><input type="text" id="projectSourceName" value=${modalState.sourceName || 'English'} placeholder="Name (e.g. English)" onInput=${(event) => window.app.updateModalField('sourceName', event.currentTarget.value)} /></div>
          </div>
        </div>
        <div class="form-group">
          <label>Target Locales</label>
          <div>${html`<${LocaleRows} kind="create" rows=${modalState.targetLocales || []} />`}</div>
          <button class="btn btn-sm" type="button" style="margin-top:8px" onClick=${() => window.app.addModalLocaleRow('create')}><i class="fa-solid fa-plus"></i> Add Locale</button>
          <div class="form-hint">Add each target language with a code and display name.</div>
        </div>
        <div class="form-group">
          <label>Project Password</label>
          <input type="password" id="projectPassword" placeholder="Required for lock, unlock, and delete" autocomplete="new-password" value=${modalState.projectPassword || ''} onInput=${(event) => window.app.updateModalField('projectPassword', event.currentTarget.value)} />
          <div class="form-hint">Use at least 6 characters. You will need this password for lock, unlock, and delete actions.</div>
        </div>
      `}
      footer=${html`
        <button class="btn" type="button" onClick=${() => window.app.closeModal()}>Cancel</button>
        <button class="btn btn-primary" type="button" onClick=${() => window.app.createProject()}>Create Project</button>
      `}
    />
  `;
}

function AddKeyModal({ modalState }) {
  const fullKeyPreview = Helpers.buildFullKey(modalState.pageKey, modalState.key || '');
  return html`
    <${ModalFrame}
      title="Add Translation Key"
      body=${html`
        <div class="form-group"><label>Key</label><input type="text" id="newKey" placeholder="e.g. greet" value=${modalState.key || ''} autoFocus onInput=${(event) => window.app.updateModalField('key', event.currentTarget.value)} /><div class="form-hint">Enter the page-local key only. The page prefix is added automatically.</div></div>
        <div class="form-group"><label>Full Key Preview</label><div class="api-key-box"><code>${fullKeyPreview || `${modalState.pageKey}.your_key`}</code></div></div>
        <div class="form-group"><label>Description (optional)</label><input type="text" id="newKeyDesc" value=${modalState.description || ''} placeholder="Context for translators" onInput=${(event) => window.app.updateModalField('description', event.currentTarget.value)} /></div>
        <div class="form-group"><label>Source text (${modalState.sourceName})</label><textarea id="newKeyValue" placeholder="Enter the source text" rows="2" onInput=${(event) => window.app.updateModalField('sourceValue', event.currentTarget.value)}>${modalState.sourceValue || ''}</textarea></div>
      `}
      footer=${html`
        <button class="btn" type="button" onClick=${() => window.app.closeModal()}>Cancel</button>
        <button class="btn btn-primary" type="button" onClick=${() => window.app.addKey()}>Add Key</button>
      `}
    />
  `;
}

function BulkAddModal({ modalState }) {
  return html`
    <${ModalFrame}
      title="Bulk Import Keys"
      body=${html`
        <div class="form-group">
          <label>Paste JSON (${modalState.sourceName})</label>
          <textarea id="bulkJson" rows="10" placeholder='{"greet":"Welcome"}'></textarea>
          <div class="form-hint">Flat page-local key/value object. Keys will be stored with the <code>${modalState.pageKey}</code> prefix automatically.</div>
        </div>
      `}
      footer=${html`
        <button class="btn" type="button" onClick=${() => window.app.closeModal()}>Cancel</button>
        <button class="btn btn-primary" type="button" onClick=${() => window.app.bulkImport()}>Import</button>
      `}
    />
  `;
}

function ApiKeyModal() {
  const p = window.app.currentProject;
  const currentPage = window.app.currentProjectPage || (p.pages || [])[0];
  return html`
    <${ModalFrame} title="API Key" icon="fa-key" body=${html`
      <p style="font-size:14px;color:var(--gray-600);margin-bottom:12px">Use this API key in your client app to fetch translations at runtime.</p>
      <div class="api-key-box">
        <code id="apiKeyDisplay">${p.apiKey}</code>
        <button class="btn btn-sm" type="button" onClick=${() => window.app.copyApiKey()}><i class="fa-solid fa-copy"></i> Copy</button>
      </div>
      <div style="margin-top:20px;padding:16px;background:var(--gray-50);border-radius:6px;font-size:13px">
        <strong>Usage Example:</strong>
        <pre style="margin-top:8px;overflow-x:auto;white-space:pre-wrap;word-break:break-all"><code>${`fetch('${window.location.origin}/api/v1/pages/${currentPage ? currentPage.pageKey : 'dashboard'}/translations/${p.sourceLocale}', {
  headers: { 'X-API-Key': '${p.apiKey}' }
})
.then(res => res.json())
.then(data => console.log(data.translations));`}</code></pre>
      </div>
      <div style="margin-top:12px"><button class="btn btn-sm btn-danger" type="button" onClick=${() => window.app.regenerateApiKey()}><i class="fa-solid fa-rotate"></i> Regenerate Key</button></div>
    `} />
  `;
}

function ProjectPasswordActionModal({ modalState }) {
  const locked = modalState.action === 'lock';
  return html`
    <${ModalFrame}
      title=${locked ? 'Lock Project' : 'Unlock Project'}
      icon=${locked ? 'fa-lock' : 'fa-lock-open'}
      body=${html`
        <p style="font-size:14px;color:var(--gray-600);margin-bottom:12px">Enter the project password to ${locked ? 'lock' : 'unlock'} <strong>${window.app.currentProject.name}</strong>.</p>
        <div class="form-group"><label>Project Password</label><input type="password" id="projectActionPassword" placeholder="Enter project password" autoFocus /></div>
      `}
      footer=${html`
        <button class="btn" type="button" onClick=${() => window.app.closeModal()}>Cancel</button>
        <button class="btn btn-primary" type="button" onClick=${() => window.app.submitProjectLockAction(modalState.action)}>${locked ? 'Lock Project' : 'Unlock Project'}</button>
      `}
    />
  `;
}

function ProjectSettingsModal({ modalState }) {
  const p = window.app.currentProject;
  const hasPassword = !!p.hasProjectPassword;
  return html`
    <${ModalFrame}
      title="Project Settings"
      icon="fa-gear"
      body=${html`
        <div class="form-group"><label>Project Name</label><input type="text" id="editName" value=${modalState.name || ''} onInput=${(event) => window.app.updateModalField('name', event.currentTarget.value)} /></div>
        <div class="form-group"><label>Description</label><textarea id="editDesc" rows="2" onInput=${(event) => window.app.updateModalField('description', event.currentTarget.value)}>${modalState.description || ''}</textarea></div>
        <div class="form-group">
          <label>Locales</label>
          <div class="form-hint" style="margin-bottom:8px">Source locale (${p.sourceLocale}) code cannot be changed.</div>
          <div>${html`<${LocaleRows} kind="settings" rows=${modalState.settingsLocales || []} sourceCode=${p.sourceLocale} />`}</div>
          <button class="btn btn-sm" type="button" style="margin-top:8px" onClick=${() => window.app.addModalLocaleRow('settings')}><i class="fa-solid fa-plus"></i> Add Locale</button>
        </div>
        <div class="form-group">
          <label>${hasPassword ? 'Change Project Password' : 'Add Project Password'}</label>
          ${hasPassword ? html`<input type="password" id="editCurrentProjectPassword" placeholder="Current project password" autocomplete="current-password" style="margin-bottom:8px" value=${modalState.currentProjectPassword || ''} onInput=${(event) => window.app.updateModalField('currentProjectPassword', event.currentTarget.value)} />` : ''}
          <input type="password" id="editProjectPassword" placeholder=${hasPassword ? 'New project password' : 'Set a project password'} autocomplete="new-password" style="margin-bottom:8px" value=${modalState.projectPassword || ''} onInput=${(event) => window.app.updateModalField('projectPassword', event.currentTarget.value)} />
          <input type="password" id="editProjectPasswordConfirm" placeholder="Confirm new password" autocomplete="new-password" value=${modalState.confirmProjectPassword || ''} onInput=${(event) => window.app.updateModalField('confirmProjectPassword', event.currentTarget.value)} />
          <div class="form-hint">${hasPassword ? 'To change the password, enter the current password, a new password, and confirm it.' : 'This project has no password yet. Add one to enable lock, unlock, and delete protection.'}</div>
        </div>
      `}
      footer=${html`
        <button class="btn" type="button" onClick=${() => window.app.closeModal()}>Cancel</button>
        <button class="btn btn-primary" type="button" onClick=${() => window.app.updateProject()}>Save</button>
      `}
    />
  `;
}

function CreatePageModal({ modalState }) {
  return html`
    <${ModalFrame}
      title="New Page"
      icon="fa-file-lines"
      body=${html`
        <div class="form-group"><label>Page Name</label><input type="text" value=${modalState.name || ''} placeholder="Dashboard" autoFocus onInput=${(event) => window.app.updateModalField('name', event.currentTarget.value)} /></div>
        <div class="form-group"><label>Page Key</label><input type="text" value=${modalState.pageKey || ''} placeholder="dashboard" onInput=${(event) => window.app.updateModalField('pageKey', event.currentTarget.value)} /><div class="form-hint">Used as the prefix for all keys in this page, for example <code>dashboard.greet</code>.</div></div>
        <div class="form-group"><label>Description</label><textarea rows="2" onInput=${(event) => window.app.updateModalField('description', event.currentTarget.value)}>${modalState.description || ''}</textarea></div>
      `}
      footer=${html`
        <button class="btn" type="button" onClick=${() => window.app.closeModal()}>Cancel</button>
        <button class="btn btn-primary" type="button" onClick=${() => window.app.createPage()}>Create Page</button>
      `}
    />
  `;
}

function EditPageModal({ modalState }) {
  return html`
    <${ModalFrame}
      title="Edit Page"
      icon="fa-pen"
      body=${html`
        <div class="form-group"><label>Page Name</label><input type="text" value=${modalState.name || ''} autoFocus onInput=${(event) => window.app.updateModalField('name', event.currentTarget.value)} /></div>
        <div class="form-group"><label>Page Key</label><input type="text" value=${modalState.pageKey || ''} onInput=${(event) => window.app.updateModalField('pageKey', event.currentTarget.value)} /><div class="form-hint">If this page already has keys, changing the page key is blocked to avoid breaking stored full keys.</div></div>
        <div class="form-group"><label>Description</label><textarea rows="2" onInput=${(event) => window.app.updateModalField('description', event.currentTarget.value)}>${modalState.description || ''}</textarea></div>
      `}
      footer=${html`
        <button class="btn" type="button" onClick=${() => window.app.closeModal()}>Cancel</button>
        <button class="btn btn-primary" type="button" onClick=${() => window.app.updatePage()}>Save</button>
      `}
    />
  `;
}

function DeletePageModal({ modalState }) {
  return html`
    <${ModalFrame}
      title="Delete Page"
      icon="fa-triangle-exclamation"
      tone="destructive"
      body=${html`
        <p style="font-size:14px;color:var(--gray-600);margin-bottom:12px">Delete <strong>${modalState.pageName}</strong>. If it still has translation keys, you can choose force delete to remove the page and all its keys.</p>
      `}
      footer=${html`
        <button class="btn" type="button" onClick=${() => window.app.closeModal()}>Cancel</button>
        <button class="btn btn-danger" type="button" onClick=${() => window.app.submitDeletePage(false)}>Delete Empty Page</button>
        <button class="btn btn-danger" type="button" onClick=${() => window.app.submitDeletePage(true)}>Force Delete</button>
      `}
    />
  `;
}

function DeleteProjectModal() {
  return html`
    <${ModalFrame}
      title="Delete Project"
      icon="fa-triangle-exclamation"
      tone="destructive"
      body=${html`
        <p style="font-size:14px;color:var(--gray-600);margin-bottom:12px">Enter the project password to continue deleting <strong>${window.app.currentProject.name}</strong>.</p>
        <div class="form-group"><label>Project Password</label><input type="password" id="deleteProjectPassword" placeholder="Enter project password" autoFocus /></div>
      `}
      footer=${html`
        <button class="btn" type="button" onClick=${() => window.app.closeModal()}>Cancel</button>
        <button class="btn btn-danger" type="button" onClick=${() => window.app.submitDeleteProjectPassword()}><i class="fa-solid fa-trash"></i> Continue</button>
      `}
    />
  `;
}

function CreateAdminModal() {
  return html`
    <${ModalFrame}
      title="New Admin"
      body=${html`
        <div class="form-group"><label>Display Name</label><input type="text" id="adminDisplayName" placeholder="John Doe" autoFocus /></div>
        <div class="form-group"><label>Username</label><input type="text" id="adminUsername" placeholder="johndoe" /></div>
        <div class="form-group"><label>Password</label><input type="password" id="adminPassword" placeholder="Min 6 characters" /></div>
        <div class="form-group"><label>Role</label><select id="adminRole"><option value="admin">Admin</option><option value="super_admin">Super Admin</option></select></div>
      `}
      footer=${html`
        <button class="btn" type="button" onClick=${() => window.app.closeModal()}>Cancel</button>
        <button class="btn btn-primary" type="button" onClick=${() => window.app.createAdmin()}>Create Admin</button>
      `}
    />
  `;
}

function EditAdminModal({ modalState }) {
  const admin = window.app.admins.find((item) => item._id === modalState.adminId);
  if (!admin) return html``;
  return html`
    <${ModalFrame}
      title="Edit Admin"
      body=${html`
        <div class="form-group"><label>Display Name</label><input type="text" id="editAdminDisplayName" value=${admin.displayName || ''} /></div>
        <div class="form-group"><label>Role</label><select id="editAdminRole" value=${admin.role}><option value="admin">Admin</option><option value="super_admin">Super Admin</option></select></div>
        <div class="form-group"><label>Status</label><select id="editAdminActive" value=${String(admin.active)}><option value="true">Active</option><option value="false">Inactive</option></select></div>
        <div class="form-group"><label>New Password (leave blank to keep current)</label><input type="password" id="editAdminPassword" placeholder="Leave blank to keep unchanged" /></div>
      `}
      footer=${html`
        <button class="btn" type="button" onClick=${() => window.app.closeModal()}>Cancel</button>
        <button class="btn btn-primary" type="button" onClick=${() => window.app.updateAdmin(admin._id)}>Save</button>
      `}
    />
  `;
}

function ModalContent({ modalState }) {
  if (!modalState) return html``;
  switch (modalState.type) {
    case 'create-project': return html`<${CreateProjectModal} modalState=${modalState} />`;
    case 'create-page': return html`<${CreatePageModal} modalState=${modalState} />`;
    case 'edit-page': return html`<${EditPageModal} modalState=${modalState} />`;
    case 'delete-page': return html`<${DeletePageModal} modalState=${modalState} />`;
    case 'add-key': return html`<${AddKeyModal} modalState=${modalState} />`;
    case 'bulk-add': return html`<${BulkAddModal} modalState=${modalState} />`;
    case 'api-key': return html`<${ApiKeyModal} />`;
    case 'project-password-action': return html`<${ProjectPasswordActionModal} modalState=${modalState} />`;
    case 'project-settings': return html`<${ProjectSettingsModal} modalState=${modalState} />`;
    case 'delete-project': return html`<${DeleteProjectModal} />`;
    case 'create-admin': return html`<${CreateAdminModal} />`;
    case 'edit-admin': return html`<${EditAdminModal} modalState=${modalState} />`;
    default: return html``;
  }
}

function ModalHost({ isOpen, modalState }) {
  const hasContent = isOpen && !!modalState;
  return html`
    <div class=${`modal-overlay ${hasContent ? 'active' : ''}`} id="modalOverlay" onClick=${(event) => window.app.closeModal(event)} role="dialog" aria-modal="true" aria-label="Dialog window">
      ${hasContent ? html`
        <div class="modal" id="modalContent">
          <${ModalContent} modalState=${modalState} />
        </div>
      ` : ''}
    </div>
  `;
}

export function renderModalHost(container, props) {
  render(html`<${ModalHost} ...${props} />`, container);
}
