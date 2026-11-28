<script lang="ts">
  import { PUBLIC_API_BASE_URL } from '$env/static/public';
  import { env } from '$env/dynamic/public';
  import { onMount } from 'svelte';

  type Monitor = {
    monitorId: string;
    name: string;
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    passengerCount: number;
    targetPrice: number;
    currency: string;
    status: 'ACTIVE' | 'PAUSED';
    createdAt: string;
  };

  const apiBaseUrl = (PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');
  let monitors: Monitor[] = [];
  let loading = true;
  let errorMessage = '';

  function formatPrice(monitor: Monitor): string {
    try {
      return new Intl.NumberFormat('en-PH', {
        style: 'currency', currency: monitor.currency, maximumFractionDigits: 2
      }).format(monitor.targetPrice);
    } catch {
      return monitor.currency + ' ' + monitor.targetPrice.toLocaleString();
    }
  }

  function formatDate(value: string): string {
    // ISO date-only strings must not shift a day with the viewer's timezone.
    const date = new Date(value + 'T00:00:00Z');
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en', {
      month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'
    }).format(date);
  }

  async function getIdToken(): Promise<string | null> {
    if (typeof sessionStorage === 'undefined') return null;
    const token = sessionStorage.getItem('travelPriceMonitor.idToken');
    const expiresAt = Number(sessionStorage.getItem('travelPriceMonitor.expiresAt') || 0);
    if (token && (!expiresAt || expiresAt > Date.now() + 60_000)) return token;

    const refreshToken = sessionStorage.getItem('travelPriceMonitor.refreshToken');
    if (!refreshToken) return null;
    try {
      const response = await fetch(apiBaseUrl + '/auth/refresh', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      if (!response.ok) return null;
      const result: { idToken?: string; accessToken?: string; expiresIn?: number } = await response.json();
      if (!result.idToken || !result.accessToken || !result.expiresIn) return null;
      sessionStorage.setItem('travelPriceMonitor.idToken', result.idToken);
      sessionStorage.setItem('travelPriceMonitor.accessToken', result.accessToken);
      sessionStorage.setItem('travelPriceMonitor.expiresAt', String(Date.now() + result.expiresIn * 1000));
      return result.idToken;
    } catch {
      return null;
    }
  }

  async function loadMonitors() {
    loading = true;
    errorMessage = '';
    if (!apiBaseUrl) {
      errorMessage = 'The API URL is not configured. Set PUBLIC_API_BASE_URL.';
      loading = false;
      return;
    }

    const localMode = env.PUBLIC_LOCAL_AUTH_DISABLED === 'true';
    const token = localMode ? null : await getIdToken();
    if (!localMode && !token) {
      errorMessage = 'Sign in above to view your monitors.';
      loading = false;
      return;
    }

    try {
      const response = await fetch(apiBaseUrl + '/monitors', {
        headers: { ...(token ? { Authorization: token } : {}) }
      });
      const payload: unknown = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = payload && typeof payload === 'object' && 'message' in payload &&
          typeof payload.message === 'string' ? payload.message : 'Unable to load monitors.';
        throw new Error(message);
      }
      if (!payload || typeof payload !== 'object' || !('monitors' in payload) || !Array.isArray(payload.monitors)) {
        throw new Error('The API returned an unexpected monitor list.');
      }
      monitors = payload.monitors as Monitor[];
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unable to load monitors.';
    } finally {
      loading = false;
    }
  }

  onMount(() => { void loadMonitors(); });
</script>

<svelte:head>
  <title>My Monitors · Travel Price Monitor</title>
  <meta name="description" content="See all your tracked flight prices in one place." />
</svelte:head>

<div class="page-shell">
  <header class="topbar">
    <a class="brand" href="/" aria-label="Travel Price Monitor home"><span class="brand-mark" aria-hidden="true">✦</span>Travel Price Monitor</a>
    <nav aria-label="Main navigation">
      <a href="/">Create monitor</a>
      <a href="/monitors" aria-current="page">My monitors</a>
    </nav>
  </header>

  <main>
    <div class="heading">
      <div>
        <p class="eyebrow">YOUR TRACKED TRIPS</p>
        <h1>My monitors</h1>
        <p class="subtitle">Your flight searches and target fares, together in one place.</p>
      </div>
      <a class="new-button" href="/">+ New monitor</a>
    </div>

    {#if loading}
      <div class="state" role="status"><div class="spinner" aria-hidden="true"></div>Loading your monitors…</div>
    {:else if errorMessage}
      <div class="state error" role="alert">
        <strong>Could not load monitors</strong>
        <p>{errorMessage}</p>
        <button type="button" on:click={loadMonitors}>Try again</button>
      </div>
    {:else if monitors.length === 0}
      <div class="state empty">
        <span class="empty-icon" aria-hidden="true">✈</span>
        <h2>No monitors yet</h2>
        <p>Create your first flight monitor to start tracking a route and a target price.</p>
        <a class="new-button" href="/">Create your first monitor</a>
      </div>
    {:else}
      <div class="results-bar">
        <span>{monitors.length} {monitors.length === 1 ? 'monitor' : 'monitors'}</span>
        <button type="button" on:click={loadMonitors}>↻ Refresh</button>
      </div>
      <div class="monitor-list">
        {#each monitors as monitor (monitor.monitorId)}
          <article class="monitor-card">
            <div class="card-main">
              <div class="name-row">
                <h2>{monitor.name}</h2>
                <span class:paused={monitor.status === 'PAUSED'} class="status">{monitor.status === 'ACTIVE' ? 'Active' : 'Paused'}</span>
              </div>
              <p class="route">{monitor.origin} <span aria-hidden="true">→</span> {monitor.destination}</p>
              <div class="details">
                <span>Depart {formatDate(monitor.departureDate)}</span>
                {#if monitor.returnDate}<span>Return {formatDate(monitor.returnDate)}</span>{/if}
                <span>{monitor.passengerCount} {monitor.passengerCount === 1 ? 'passenger' : 'passengers'}</span>
              </div>
            </div>
            <div class="price-block">
              <span class="price-label">Target price</span>
              <strong>{formatPrice(monitor)}</strong>
            </div>
          </article>
        {/each}
      </div>
    {/if}
  </main>
  <footer>Travel Price Monitor <span>·</span> Keep an eye on the fare, not the tabs.</footer>
</div>

<style>
  :global(*) { box-sizing: border-box; }
  :global(body) { margin: 0; background: #f7f8fc; color: #17243b; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased; }
  :global(button), :global(input), :global(select) { font: inherit; }
  .page-shell { min-height: 100vh; }
  .topbar { min-height: 72px; padding: 16px max(24px, calc((100vw - 1080px) / 2)); display: flex; align-items: center; justify-content: space-between; gap: 16px; background: #fff; border-bottom: 1px solid #e8ebf2; }
  .brand { display: inline-flex; gap: 10px; align-items: center; text-decoration: none; color: #17243b; font-weight: 760; letter-spacing: -.025em; }
  .brand-mark { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; background: #3158d8; color: white; font-size: 19px; }
  nav { display: flex; gap: 20px; }
  nav a { color: #64718a; text-decoration: none; font-size: 13px; font-weight: 650; }
  nav a[aria-current] { color: #3158d8; }
  a:focus-visible, button:focus-visible { outline: 3px solid #3158d84d; outline-offset: 3px; }
  main { width: min(100% - 32px, 960px); margin: 0 auto; padding: 55px 0 80px; min-height: 70vh; }
  .heading { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; margin-bottom: 28px; }
  .eyebrow { margin: 0 0 11px; color: #3158d8; font-size: 11px; font-weight: 800; letter-spacing: .15em; }
  h1 { margin: 0; font-size: clamp(30px, 4vw, 40px); letter-spacing: -.045em; }
  .subtitle { margin: 12px 0 0; color: #64718a; font-size: 14px; line-height: 1.5; }
  .new-button { display: inline-flex; align-items: center; justify-content: center; white-space: nowrap; padding: 13px 19px; background: #3158d8; color: white; text-decoration: none; border-radius: 10px; font-size: 13px; font-weight: 700; }
  .new-button:hover { background: #2448c3; }
  .results-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; color: #64718a; font-size: 13px; }
  .results-bar button, .state button { border: 0; background: transparent; color: #3158d8; font-size: 13px; font-weight: 700; cursor: pointer; }
  .monitor-list { display: grid; gap: 14px; }
  .monitor-card { display: flex; align-items: center; justify-content: space-between; gap: 24px; background: white; border: 1px solid #e7eaf1; padding: 24px 27px; border-radius: 16px; box-shadow: 0 9px 25px #1b2d4d08; }
  .card-main { min-width: 0; }
  .name-row { display: flex; align-items: center; flex-wrap: wrap; gap: 11px; }
  .name-row h2 { font-size: 17px; letter-spacing: -.025em; margin: 0; overflow-wrap: anywhere; }
  .status { padding: 5px 9px; border-radius: 20px; background: #e8f8ef; color: #167451; font-size: 11px; font-weight: 750; }
  .status.paused { background: #fff4e1; color: #9d6416; }
  .route { margin: 14px 0 12px; font-size: 19px; font-weight: 760; letter-spacing: .01em; }
  .route span { color: #8997ad; padding: 0 6px; }
  .details { display: flex; gap: 9px 16px; flex-wrap: wrap; color: #768299; font-size: 12px; }
  .price-block { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex-shrink: 0; }
  .price-label { color: #8a95a8; font-size: 11px; }
  .price-block strong { font-size: 21px; letter-spacing: -.02em; white-space: nowrap; }
  .state { display: flex; align-items: center; justify-content: center; flex-direction: column; text-align: center; gap: 12px; padding: 70px 24px; background: white; border: 1px solid #e7eaf1; border-radius: 18px; color: #64718a; font-size: 14px; }
  .state h2 { margin: 0; color: #17243b; }
  .state p { margin: 0; line-height: 1.65; max-width: 430px; }
  .state.error { color: #9b303b; }
  .state.error strong { font-size: 18px; }
  .state.empty .new-button { margin-top: 12px; }
  .empty-icon { font-size: 38px; color: #3158d8; }
  .spinner { width: 26px; height: 26px; border: 3px solid #e5eafb; border-top-color: #3158d8; border-radius: 50%; animation: spin .8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  footer { padding: 20px 16px 35px; text-align: center; color: #a1a9b7; font-size: 11px; }
  footer span { padding: 0 5px; }
  @media (max-width: 600px) {
    .topbar { padding: 14px 16px; align-items: flex-start; flex-direction: column; }
    nav { gap: 16px; }
    main { width: min(100% - 24px, 960px); padding-top: 35px; }
    .heading { align-items: flex-start; flex-direction: column; }
    .monitor-card { flex-direction: column; align-items: stretch; padding: 22px 20px; }
    .price-block { align-items: flex-start; }
  }
  @media (prefers-reduced-motion: reduce) {
    .spinner { animation: none; }
  }
</style>
