import { h, render } from '/vendor/preact/dist/preact.module.js';
import htm from '/vendor/htm/dist/htm.module.js';

const html = htm.bind(h);

function CommandEmpty() {
  return html`<div class="command-empty"><i class="fa-solid fa-compass"></i><strong>No matches</strong><span>Try a project name, page, or action.</span></div>`;
}

function CommandResults({ items, activeIndex, onSelect }) {
  if (!items.length) return html`<${CommandEmpty} />`;

  return items.map((item, index) => html`
    <button
      class=${`command-item ${index === activeIndex ? 'active' : ''}`}
      type="button"
      role="option"
      aria-selected=${index === activeIndex}
      onClick=${() => onSelect(index)}
    >
      <span class="command-item-icon"><i class=${`fa-solid ${item.icon}`}></i></span>
      <span class="command-item-copy">
        <strong>${item.label}</strong>
        <small>${item.hint}</small>
      </span>
    </button>
  `);
}

function CommandBar({ items, activeIndex, onSelect }) {
  return html`<${CommandResults} items=${items} activeIndex=${activeIndex} onSelect=${onSelect} />`;
}

export function renderCommandBar(container, props) {
  render(html`<${CommandBar} ...${props} />`, container);
}
