(function (root, factory) {
  const api = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  root.TranslateHubCommandBar = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getItems(app) {
    const items = [
      { id: 'projects', label: 'Go to Projects', hint: 'View all projects', icon: 'fa-folder', run: () => app.navigate('projects') },
      { id: 'docs', label: 'Go to Documentation', hint: 'Open docs and API reference', icon: 'fa-book', run: () => app.navigate('docs') },
      { id: 'create-project', label: 'Create Project', hint: 'Open the new project modal', icon: 'fa-plus', run: () => app.showCreateProjectModal() }
    ];

    if (app.user && app.user.role === 'super_admin') {
      items.splice(1, 0, {
        id: 'admins',
        label: 'Go to Admins',
        hint: 'Manage dashboard access',
        icon: 'fa-users',
        run: () => app.navigate('admins')
      });
    }

    if (app.currentProject) {
      items.push(
        {
          id: 'project-settings',
          label: 'Project Settings',
          hint: app.currentProject.name,
          icon: 'fa-gear',
          run: () => app.showProjectSettingsModal()
        },
        {
          id: 'project-api-key',
          label: 'Show API Key',
          hint: app.currentProject.name,
          icon: 'fa-key',
          run: () => app.showApiKeyModal()
        }
      );
    }

    (app.projects || []).forEach((project) => {
      items.push({
        id: `project-${project._id}`,
        label: project.name,
        hint: `${project.isLocked ? 'Locked' : 'Unlocked'} project`,
        icon: project.isLocked ? 'fa-lock' : 'fa-language',
        run: () => app.showProject(project._id)
      });
    });

    return items;
  }

  function filterItems(items, query) {
    const normalizedQuery = String(query || '').trim().toLowerCase();
    return (items || []).filter((item) => {
      if (!normalizedQuery) return true;
      return `${item.label} ${item.hint}`.toLowerCase().includes(normalizedQuery);
    });
  }

  return {
    getItems,
    filterItems
  };
});
