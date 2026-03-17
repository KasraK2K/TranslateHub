import { h, render } from '/vendor/preact/dist/preact.module.js';
import htm from '/vendor/htm/dist/htm.module.js';

const html = htm.bind(h);

function AuthScreen({ needsSetup, errorMessage }) {
  if (!needsSetup) {
    return html`
      <div class="auth-wrapper">
        <div class="auth-card">
          <div class="auth-logo">
            <div class="icon"><img src="/logo/logo.png" alt="TranslateHub" class="brand-logo brand-logo-auth" /></div>
            <p>Sign in to manage your translations</p>
          </div>

          <div class=${`auth-error ${errorMessage ? 'visible' : ''}`} id="authError">${errorMessage || ''}</div>

          <div class="form-group">
            <label>Username</label>
            <input type="text" id="loginUsername" placeholder="Enter username" onKeyDown=${(event) => event.key === 'Enter' && window.app.doLogin()} />
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" id="loginPassword" placeholder="Enter password" onKeyDown=${(event) => event.key === 'Enter' && window.app.doLogin()} />
          </div>
          <button class="btn-auth" onClick=${() => window.app.doLogin()}><i class="fa-solid fa-right-to-bracket"></i> Sign In</button>
        </div>
      </div>
    `;
  }

  return html`
    <div class="auth-wrapper">
      <div class="auth-card">
        <div class="auth-logo">
          <div class="icon"><img src="/logo/logo.png" alt="TranslateHub" class="brand-logo brand-logo-auth" /></div>
          <p>Create your super admin account to get started</p>
        </div>

        <div class=${`auth-error ${errorMessage ? 'visible' : ''}`} id="authError">${errorMessage || ''}</div>

        <div class="form-group">
          <label>Display Name</label>
          <input type="text" id="setupDisplayName" placeholder="Your full name (optional)" />
        </div>
        <div class="form-group">
          <label>Username</label>
          <input type="text" id="setupUsername" placeholder="Choose a username" />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="setupPassword" placeholder="Choose a password (min 6 chars)" onKeyDown=${(event) => event.key === 'Enter' && window.app.doSetup()} />
        </div>
        <button class="btn-auth" onClick=${() => window.app.doSetup()}><i class="fa-solid fa-user-shield"></i> Create Super Admin</button>
      </div>
    </div>
  `;
}

export function renderAuthScreen(container, props) {
  render(html`<${AuthScreen} ...${props} />`, container);
}
