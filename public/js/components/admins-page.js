import { h, render } from '/vendor/preact/dist/preact.module.js';
import htm from '/vendor/htm/dist/htm.module.js';

const html = htm.bind(h);

function AdminRow({ admin, currentUserId }) {
  return html`
    <tr>
      <td><strong>${admin.displayName || admin.username}</strong></td>
      <td><code style="font-size:13px">${admin.username}</code></td>
      <td><span class=${`role-badge ${admin.role}`}>${admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}</span></td>
      <td><span class=${`status-badge ${admin.active ? 'active' : 'inactive'}`}>${admin.active ? 'Active' : 'Inactive'}</span></td>
      <td style="text-align:right">
        <button class="btn btn-sm" type="button" onClick=${() => window.app.showEditAdminModal(admin._id)}><i class="fa-solid fa-pen"></i> Edit</button>
        ${admin._id !== currentUserId ? html`<button class="btn btn-sm btn-danger" type="button" onClick=${() => window.app.confirmDeleteAdmin(admin._id, admin.username)}><i class="fa-solid fa-trash"></i> Delete</button>` : ''}
      </td>
    </tr>
  `;
}

function AdminsPage({ admins, currentUserId }) {
  return html`
    <div class="page-hero">
      <div>
        <div class="page-eyebrow">Access Control</div>
        <h1>Admin Users</h1>
        <p>Manage who can access the dashboard and what level of control they have.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" type="button" onClick=${() => window.app.showCreateAdminModal()}><i class="fa-solid fa-user-plus"></i> New Admin</button>
      </div>
    </div>
    <div class="card">
      <table class="admin-table">
        <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th style="text-align:right">Actions</th></tr></thead>
        <tbody>
          ${admins.map((admin) => html`<${AdminRow} key=${admin._id} admin=${admin} currentUserId=${currentUserId} />`)}
        </tbody>
      </table>
    </div>
  `;
}

export function renderAdminsPage(container, props) {
  render(html`<${AdminsPage} ...${props} />`, container);
}
