import { h, render } from '/vendor/preact/dist/preact.module.js';
import htm from '/vendor/htm/dist/htm.module.js';

const html = htm.bind(h);

function ModalHost({ isOpen, content }) {
  return html`
    <div class=${`modal-overlay ${isOpen ? 'active' : ''}`} id="modalOverlay" onclick=${(event) => window.app.closeModal(event)} role="dialog" aria-modal="true" aria-label="Dialog window">
      <div class="modal" id="modalContent" dangerouslySetInnerHTML=${{ __html: content || '' }}></div>
    </div>
  `;
}

export function renderModalHost(container, props) {
  render(html`<${ModalHost} ...${props} />`, container);
}
