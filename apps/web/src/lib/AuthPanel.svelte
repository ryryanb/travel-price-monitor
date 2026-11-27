<script lang="ts">
  export let apiBaseUrl = '';
  export let onAuthenticated: (idToken: string) => void;

  type AuthMode = 'login' | 'register';
  let mode: AuthMode = 'login';
  let email = '';
  let password = '';
  let busy = false;
  let errorMessage = '';
  let statusMessage = '';

  const sessionKeys = [
    'travelPriceMonitor.idToken',
    'travelPriceMonitor.accessToken',
    'travelPriceMonitor.refreshToken',
    'travelPriceMonitor.expiresAt'
  ];

  async function submitAuth(event: SubmitEvent) {
    event.preventDefault();
    errorMessage = '';
    statusMessage = '';

    const normalizedEmail = email.trim().toLowerCase();
    if (!apiBaseUrl) {
      errorMessage = 'The API URL is not configured. Set PUBLIC_API_BASE_URL and restart or rebuild the web app.';
      return;
    }
    if (!normalizedEmail || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(normalizedEmail)) {
      errorMessage = 'Enter a valid email address.';
      return;
    }
    if (!password || (mode === 'register' && password.length < 8)) {
      errorMessage = mode === 'register'
        ? 'Password must be at least 8 characters.'
        : 'Enter your password.';
      return;
    }

    busy = true;
    try {
      const response = await fetch(apiBaseUrl + '/auth/' + mode, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password })
      });
      const body: unknown = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
          ? body.message
          : mode === 'login' ? 'Unable to sign in. Please try again.' : 'Unable to create your account.';
        throw new Error(message);
      }

      if (mode === 'register') {
        const result = body as { userConfirmed?: boolean };
        mode = 'login';
        password = '';
        statusMessage = result.userConfirmed
          ? 'Account created. Sign in with your email and password.'
          : 'Account created, but Cognito confirmation is required. This page does not yet have a confirmation-code form; confirm the user in Cognito/LocalStack, then sign in.';
        return;
      }

      const result = body as {
        idToken?: string;
        accessToken?: string;
        refreshToken?: string;
        expiresIn?: number;
      };
      if (!result.idToken || !result.accessToken) {
        throw new Error('The authentication service did not return the required tokens.');
      }

      for (const key of sessionKeys) sessionStorage.removeItem(key);
      sessionStorage.setItem('travelPriceMonitor.idToken', result.idToken);
      sessionStorage.setItem('travelPriceMonitor.accessToken', result.accessToken);
      if (result.refreshToken) sessionStorage.setItem('travelPriceMonitor.refreshToken', result.refreshToken);
      if (result.expiresIn) {
        sessionStorage.setItem('travelPriceMonitor.expiresAt', String(Date.now() + result.expiresIn * 1000));
      }
      password = '';
      statusMessage = 'Signed in. You can now create a monitor.';
      onAuthenticated(result.idToken);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'An unexpected authentication error occurred.';
    } finally {
      busy = false;
    }
  }

  function signOut() {
    for (const key of sessionKeys) sessionStorage.removeItem(key);
    password = '';
    errorMessage = '';
    statusMessage = 'You have been signed out.';
    onAuthenticated('');
  }
</script>

<section class="auth-card" aria-labelledby="auth-title">
  <div class="auth-heading">
    <div>
      <h2 id="auth-title">{mode === 'login' ? 'Sign in to your account' : 'Create your account'}</h2>
      <p>{mode === 'login' ? 'Sign in to save and manage your travel monitors.' : 'Use your email to get started with Travel Price Monitor.'}</p>
    </div>
    {#if typeof sessionStorage !== 'undefined' && sessionStorage.getItem('travelPriceMonitor.idToken')}
      <button class="sign-out" type="button" on:click={signOut}>Sign out</button>
    {/if}
  </div>

  <form on:submit={submitAuth} novalidate>
    <div class="auth-fields">
      <label>
        <span>Email</span>
        <input type="email" bind:value={email} autocomplete="email" placeholder="you@example.com" required />
      </label>
      <label>
        <span>Password</span>
        <input type="password" bind:value={password} autocomplete={mode === 'login' ? 'current-password' : 'new-password'} minlength={mode === 'register' ? 8 : undefined} placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'} required />
      </label>
    </div>
    {#if errorMessage}
      <p class="auth-feedback error" role="alert">{errorMessage}</p>
    {/if}
    {#if statusMessage}
      <p class="auth-feedback status" role="status">{statusMessage}</p>
    {/if}
    <div class="auth-actions">
      <button class="auth-submit" type="submit" disabled={busy}>
        {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
      </button>
      <button class="mode-switch" type="button" on:click={() => { mode = mode === 'login' ? 'register' : 'login'; errorMessage = ''; statusMessage = ''; }}>
        {mode === 'login' ? 'Create an account' : 'Already registered? Sign in'}
      </button>
    </div>
  </form>
  <p class="auth-note">Your password is sent to Cognito for authentication and is not stored by this app. Your tokens remain in this browser tab's session storage.</p>
</section>

<style>
  .auth-card { margin: 0 0 22px; padding: 24px 28px; background: #fff; border: 1px solid #e7eaf1; border-radius: 16px; box-shadow: 0 8px 24px #1b2d4d08; }
  .auth-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; margin-bottom: 18px; }
  h2 { margin: 0; color: #17243b; font-size: 16px; letter-spacing: -.02em; }
  .auth-heading p { margin: 6px 0 0; color: #7f8ba0; font-size: 12px; line-height: 1.5; }
  .auth-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  label { display: flex; flex-direction: column; gap: 7px; color: #27364f; font-size: 12px; font-weight: 700; }
  input { width: 100%; min-height: 43px; border: 1px solid #dce2ed; border-radius: 8px; padding: 0 12px; color: #17243b; font: inherit; font-weight: 400; outline: none; }
  input:focus { border-color: #5476e5; box-shadow: 0 0 0 3px #3158d817; }
  input::placeholder { color: #aab3c1; }
  .auth-actions { display: flex; align-items: center; gap: 14px; margin-top: 16px; }
  button { font: inherit; cursor: pointer; }
  .auth-submit { min-height: 41px; padding: 0 17px; border: 0; border-radius: 8px; background: #3158d8; color: #fff; font-size: 12px; font-weight: 750; }
  .auth-submit:disabled { opacity: .65; cursor: wait; }
  .mode-switch, .sign-out { border: 0; background: transparent; color: #3158d8; font-size: 12px; font-weight: 700; }
  .sign-out { white-space: nowrap; }
  .auth-feedback { margin: 13px 0 0; padding: 10px 12px; border-radius: 8px; font-size: 12px; line-height: 1.5; }
  .error { color: #9b303b; background: #fff0f1; border: 1px solid #f8dadd; }
  .status { color: #17674d; background: #ecfaf3; border: 1px solid #ccefe0; }
  .auth-note { margin: 15px 0 0; color: #8a95a8; font-size: 10px; line-height: 1.5; }
  @media (max-width: 600px) {
    .auth-card { padding: 20px 17px; }
    .auth-fields { grid-template-columns: 1fr; }
    .auth-actions { align-items: stretch; flex-direction: column; gap: 12px; }
    .auth-submit { width: 100%; }
  }
</style>
