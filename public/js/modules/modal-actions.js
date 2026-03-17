(function (root) {
  root.TranslateHubModalActions = {
    openModal(modalState) {
      this.lastFocusedElement = document.activeElement;
      this.modalState = modalState;
      this.isModalOpen = true;
      this.renderModalHost();
      setTimeout(() => root.TranslateHubAccessibility.focusFirst(document.getElementById('modalContent')), 0);
    },

    closeModal(e) {
      if (e && e.target !== e.currentTarget) return;
      this.isModalOpen = false;
      this.modalState = null;
      this.renderModalHost();
      if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
        this.lastFocusedElement.focus();
        this.lastFocusedElement = null;
      }
    },

    renderModalHost() {
      if (!root.TranslateHubPreact) return;
      root.TranslateHubPreact.renderModalHost(document.getElementById('modalRoot'), {
        isOpen: this.isModalOpen,
        modalState: this.modalState
      });
    },

    addModalLocaleRow(kind) {
      if (!this.modalState) return;
      const key = kind === 'settings' ? 'settingsLocales' : 'targetLocales';
      const current = this.modalState[key] || [];
      this.modalState = { ...this.modalState, [key]: [...current, { code: '', name: '' }] };
      this.renderModalHost();
    },

    updateModalLocaleRow(kind, index, field, value) {
      if (!this.modalState) return;
      const key = kind === 'settings' ? 'settingsLocales' : 'targetLocales';
      const current = [...(this.modalState[key] || [])];
      current[index] = { ...current[index], [field]: value };
      this.modalState = { ...this.modalState, [key]: current };
      this.renderModalHost();
    },

    updateModalField(field, value) {
      if (!this.modalState) return;
      this.modalState = { ...this.modalState, [field]: value };
      this.renderModalHost();
    },

    removeModalLocaleRow(kind, index) {
      if (!this.modalState) return;
      const key = kind === 'settings' ? 'settingsLocales' : 'targetLocales';
      const current = [...(this.modalState[key] || [])];
      current.splice(index, 1);
      this.modalState = { ...this.modalState, [key]: current };
      this.renderModalHost();
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
