import { h, render } from '/vendor/preact/dist/preact.module.js';
import { useState } from '/vendor/preact/hooks/dist/hooks.module.js';
import htm from '/vendor/htm/dist/htm.module.js';

const html = htm.bind(h);

function Sidebar({ projects, currentPage, currentProjectId, currentProjectPageId, filter, isSuperAdmin, onFilter }) {
  const [expandedProjects, setExpandedProjects] = useState({});
  const filteredProjects = projects.filter((project) => project.name.toLowerCase().includes((filter || '').toLowerCase()));

  const toggleProjectExpanded = (projectId) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  return html`
    <div class="sidebar-section">
      <div class="sidebar-section-label">Menu</div>
      <button class=${`sidebar-item ${currentPage === 'projects' && !currentProjectId ? 'active' : ''}`} type="button" onClick=${() => window.app.navigate('projects')}>
        <i class="fa-solid fa-folder icon"></i> Projects
      </button>
      ${isSuperAdmin ? html`
        <button class=${`sidebar-item ${currentPage === 'admins' ? 'active' : ''}`} type="button" onClick=${() => window.app.navigate('admins')}>
          <i class="fa-solid fa-users icon"></i> Admins
        </button>
      ` : ''}
      <button class=${`sidebar-item ${currentPage === 'docs' ? 'active' : ''}`} type="button" onClick=${() => window.app.navigate('docs')}>
        <i class="fa-solid fa-book icon"></i> Documentation
      </button>
    </div>
    <div class="sidebar-section">
      <div class="sidebar-section-head">
        <div class="sidebar-section-label">Your Projects</div>
        <span class="sidebar-count">${projects.length}</span>
      </div>
      <div class="sidebar-project-search">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input type="text" placeholder="Filter projects" value=${filter} onInput=${(event) => onFilter(event.currentTarget.value)} />
      </div>
      ${filteredProjects.length
        ? filteredProjects.map((project) => {
            const isExpanded = expandedProjects[project._id] !== false;
            const hasPages = (project.pages || []).length > 0;
            return html`
              <div class="sidebar-project-group">
                <button
                  class=${`sidebar-project-header ${currentProjectId === project._id ? 'active' : ''}`}
                  type="button"
                  onClick=${() => window.app.showProject(project._id, { pageId: null })}
                >
                  <div class="sidebar-project-left">
                    <i class=${`fa-solid ${project.isLocked ? 'fa-lock' : 'fa-language'} icon`}></i>
                    <span>${project.name}</span>
                  </div>
                  ${hasPages ? html`
                    <button
                      class="sidebar-expand-toggle"
                      type="button"
                      onClick=${(e) => { e.stopPropagation(); toggleProjectExpanded(project._id); }}
                      title=${isExpanded ? 'Collapse' : 'Expand'}
                    >
                      <i class=${`fa-solid fa-chevron-down ${isExpanded ? 'expanded' : ''}`}></i>
                    </button>
                  ` : ''}
                </button>
                ${hasPages && isExpanded ? html`
                  <div class="sidebar-pages-list">
                    ${(project.pages || []).map((page) => html`
                      <button
                        class=${`sidebar-page-item ${currentProjectPageId === page._id ? 'active' : ''}`}
                        type="button"
                        onClick=${() => window.app.showProject(project._id, { pageId: page._id })}
                      >
                        ${page.name}
                      </button>
                    `)}
                  </div>
                ` : ''}
              </div>
            `;
          })
        : html`<div class="sidebar-empty">No matching projects</div>`}
    </div>
  `;
}

export function renderSidebar(container, props) {
  render(html`<${Sidebar} ...${props} />`, container);
}
