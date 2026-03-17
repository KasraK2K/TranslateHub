import { h, render } from '/vendor/preact/dist/preact.module.js';
import htm from '/vendor/htm/dist/htm.module.js';

const html = htm.bind(h);

function Hero({ eyebrow, title, description, actionLabel, actionClick }) {
  return html`
    <div class="page-hero">
      <div>
        ${eyebrow ? html`<div class="page-eyebrow">${eyebrow}</div>` : ''}
        <h1>${title}</h1>
        <p>${description}</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" type="button" onClick=${actionClick}><i class="fa-solid fa-plus"></i> ${actionLabel}</button>
      </div>
    </div>
  `;
}

function ProjectCard({ project, locales, completion, keyCount, pageCount, onOpen }) {
  return html`
    <button class="project-card" type="button" onClick=${onOpen}>
      <div class="project-card-topline">
        <span class=${`project-status ${project.isLocked ? 'locked' : 'unlocked'}`}><i class=${`fa-solid ${project.isLocked ? 'fa-lock' : 'fa-lock-open'}`}></i> ${project.isLocked ? 'Locked' : 'Live'}</span>
        <span class="project-score">${completion}% ready</span>
      </div>
      <h3>${project.name}</h3>
      <div class="project-desc">${project.description || 'No description'}</div>
      <div class="project-meta">
        <span><i class="fa-solid fa-language"></i> Source: <strong>${project.sourceLocale}</strong></span>
        <span><i class="fa-solid fa-earth-americas"></i> ${locales.length} locale${locales.length !== 1 ? 's' : ''}</span>
        <span><i class="fa-solid fa-window-maximize"></i> ${pageCount} page${pageCount !== 1 ? 's' : ''}</span>
        <span><i class="fa-solid fa-file-lines"></i> ${keyCount} keys</span>
      </div>
      <div class="project-card-progress">
        <div class="project-card-progress-bar"><span style=${`width:${completion}%`}></span></div>
      </div>
      <div class="locale-tags">
        ${locales.map((locale) => html`<span class="locale-tag">${locale.code} - ${locale.name}</span>`)}
      </div>
    </button>
  `;
}

function EmptyProjects() {
  return html`
    <div class="card">
      <div class="status-panel error">
        <div class="status-pill">Workspace empty</div>
        <div class="status-icon"><i class="fa-solid fa-language"></i></div>
        <h3>No projects yet</h3>
        <p>Create your first translation project to get started.</p>
        <button class="btn btn-primary" type="button" onClick=${() => window.app.showCreateProjectModal()}><i class="fa-solid fa-plus"></i> New Project</button>
      </div>
    </div>
  `;
}

function ProjectsPage({ projects }) {
  return html`
    <${Hero}
      eyebrow="Workspace"
      title="Projects"
      description=${projects.length
        ? 'Jump back into any app, keep locale work organized, and ship copy changes faster.'
        : 'Create and manage localized apps from one place.'}
      actionLabel="New Project"
      actionClick=${() => window.app.showCreateProjectModal()}
    />
    ${projects.length
      ? html`
          <div class="project-grid wide-grid">
            ${projects.map((project) => {
              const locales = window.app.getProjectLocales(project);
              const translated = project.stats ? Object.values(project.stats).reduce((sum, item) => sum + (item.translated || 0), 0) : 0;
              const total = project.stats ? Object.values(project.stats).reduce((sum, item) => sum + (item.total || 0), 0) : 0;
              const completion = total ? Math.round((translated / total) * 100) : 0;
              const keyCount = (project.stats && Object.values(project.stats)[0] && Object.values(project.stats)[0].total) || 0;
              const pageCount = ((project.pages || []).length) || 0;

              return html`<${ProjectCard}
                key=${project._id}
                project=${project}
                locales=${locales}
                completion=${completion}
                keyCount=${keyCount}
                pageCount=${pageCount}
                onOpen=${() => window.app.showProject(project._id)}
              />`;
            })}
          </div>
        `
      : html`<${EmptyProjects} />`}
  `;
}

export function renderProjectsPage(container, props) {
  render(html`<${ProjectsPage} ...${props} />`, container);
}
