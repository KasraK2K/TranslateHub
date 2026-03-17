import { h, render } from '/vendor/preact/dist/preact.module.js';
import htm from '/vendor/htm/dist/htm.module.js';

const html = htm.bind(h);

const DOCS_HTML = `
  <div class="docs-content docs-wide">
    <h1><i class="fa-solid fa-book"></i> TranslateHub Documentation</h1>
    <p>TranslateHub is a translation management platform that lets you manage your application's translations externally. Your client apps fetch translations at runtime via a REST API, so you never need to redeploy to update text.</p>
    <h2>Getting Started</h2>
    <h3>1. Create a Project</h3>
    <p>Go to the <strong>Projects</strong> page and click <strong>"+ New Project"</strong>. Fill in:</p>
    <ul>
      <li><strong>Project Name</strong> - A human-readable name for your app or service</li>
      <li><strong>Source Locale</strong> - The primary language with a code and name (e.g. code: <code>en-US</code>, name: <code>United States</code>)</li>
      <li><strong>Target Locales</strong> - Each language gets a code + name (e.g. code: <code>fa</code>, name: <code>Persian</code>)</li>
    </ul>
    <p>Locale codes can use any format you prefer: <code>en</code>, <code>en-US</code>, <code>en-UK</code>, <code>fr</code>, <code>fa</code>, etc. Each project gets its own <strong>API Key</strong> for client app integration.</p>
    <h3>2. Create Pages and Add Translation Keys</h3>
    <p>Each project can contain multiple pages. Every page has a required <strong>page key</strong> like <code>dashboard</code> or <code>auth</code>. Inside that page, you create short local keys such as <code>greet</code> or <code>title</code>. TranslateHub stores the full key automatically:</p>
    <pre><code>dashboard.greet       = "Welcome to our app!"
dashboard.home        = "Home"
dashboard.settings    = "Settings"
auth.login_title      = "Sign In"
auth.login_email      = "Email Address"
dashboard.not_found   = "Page not found"</code></pre>
    <p>You can add keys one at a time via <strong>"+ Add Key"</strong>, or import many at once with <strong>"Bulk Import"</strong> by pasting a page-local JSON object:</p>
    <pre><code>{
  "greet": "Welcome to our app!",
  "home": "Home",
  "settings": "Settings"
}</code></pre>
    <p>TranslateHub adds the current page prefix automatically and blocks duplicate local keys inside the same page.</p>
    <h3>3. Translate</h3>
    <p>On the project detail page, choose a page first, then use the <strong>locale selector</strong> dropdown to switch between languages. Click into any translation cell to type the translated text. Changes save automatically when you leave the field.</p>
    <p>The <strong>Translation Progress</strong> section shows completion percentage for each locale across the whole project.</p>
    <h2>Integrating with Your Application</h2>
    <h3>Getting Your API Key</h3>
    <p>Open your project, click <strong>"API Key"</strong>, and copy the key. It looks like: <code>th_a1b2c3d4e5...</code></p>
    <div class="docs-callout info"><strong>Important:</strong> The API key identifies your project. Keep it in environment variables, not in source code.</div>
    <h3>REST API Endpoints</h3>
    <p>All public endpoints require the <code>X-API-Key</code> header.</p>
    <h3>Fetch translations for a single page and locale</h3>
    <pre><code>GET /api/v1/pages/:pageKey/translations/:localeCode

GET /api/v1/pages/dashboard/translations/fr
Headers: { "X-API-Key": "th_your_key_here" }</code></pre>
    <h3>Best Practices</h3>
    <ul>
      <li><strong>Use clear page keys</strong> such as <code>dashboard</code> or <code>settings</code></li>
      <li><strong>Keep local keys short</strong> because the page prefix is added automatically</li>
      <li><strong>Add descriptions</strong> for translator context</li>
      <li><strong>Cache translations</strong> on the client side</li>
      <li><strong>Use fallback logic</strong> to source locale</li>
      <li><strong>Keep API keys secret</strong> and regenerate when exposed</li>
    </ul>
  </div>
`;

function DocsPage() {
  return html`
    <div>
      <div class="page-hero">
        <div>
          <div class="page-eyebrow">Reference</div>
          <h1>Documentation</h1>
          <p>Everything you need to configure, use, and integrate TranslateHub.</p>
        </div>
      </div>
      <div dangerouslySetInnerHTML=${{ __html: DOCS_HTML }}></div>
    </div>
  `;
}

export function renderDocsPage(container) {
  render(html`<${DocsPage} />`, container);
}
