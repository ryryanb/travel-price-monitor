<script lang="ts">
  import { onMount } from 'svelte';
  import { env } from '$env/dynamic/public';

  let name = '';
  let origin = '';
  let destination = '';
  let departureDate = '';
  let roundTrip = true;
  let returnDate = '';
  let passengerCount = 1;
  let targetPrice = '';
  let currency = 'PHP';
  let minDate = '';
  let submitting = false;
  let errorMessage = '';
  let successMessage = '';
  let createdMonitorId = '';

  const apiBaseUrl = (env.PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');

  onMount(() => {
    minDate = new Date().toISOString().slice(0, 10);
  });

  $: normalizedOrigin = origin.trim().toUpperCase();
  $: normalizedDestination = destination.trim().toUpperCase();

  function validate(): string {
    if (!name.trim()) return 'Enter a name for this monitor.';
    if (name.trim().length > 100) return 'Monitor names must be 100 characters or fewer.';
    if (!/^[A-Za-z]{3}$/.test(origin.trim())) return 'Enter a valid three-letter IATA origin code, such as MNL.';
    if (!/^[A-Za-z]{3}$/.test(destination.trim())) return 'Enter a valid three-letter IATA destination code, such as NRT.';
    if (normalizedOrigin === normalizedDestination) return 'Origin and destination must be different.';
    if (!departureDate) return 'Choose a departure date.';
    if (departureDate < minDate) return 'Departure date cannot be in the past.';
    if (roundTrip && !returnDate) return 'Choose a return date or turn off round trip.';
    if (roundTrip && returnDate < departureDate) return 'Return date cannot be before departure.';
    if (!Number.isInteger(Number(passengerCount)) || Number(passengerCount) < 1 || Number(passengerCount) > 9) return 'Passengers must be between 1 and 9.';
    const price = Number(targetPrice);
    if (!targetPrice.trim() || !Number.isFinite(price) || price <= 0 || price > 10000000) return 'Enter a target price greater than 0 and no more than 10,000,000.';
    if (!/^[A-Z]{3}$/.test(currency)) return 'Choose a valid three-letter currency code.';
    return '';
  }

  async function submitMonitor(event: SubmitEvent) {
    event.preventDefault();
    errorMessage = '';
    successMessage = '';
    createdMonitorId = '';

    const validationError = validate();
    if (validationError) {
      errorMessage = validationError;
      return;
    }

    if (!apiBaseUrl) {
      errorMessage = 'The API URL is not configured. Set PUBLIC_API_BASE_URL and rebuild the web app.';
      return;
    }

    // The login story will populate this session key after authentication.
    const idToken = typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem('travelPriceMonitor.idToken')
      : null;
    if (!idToken) {
      errorMessage = 'You need to sign in before creating a monitor. Authentication is not connected to this page yet.';
      return;
    }

    submitting = true;
    try {
      const response = await fetch(apiBaseUrl + '/monitors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': idToken
        },
        body: JSON.stringify({
          name: name.trim(),
          origin: normalizedOrigin,
          destination: normalizedDestination,
          departureDate,
          ...(roundTrip ? { returnDate } : {}),
          passengerCount: Number(passengerCount),
          targetPrice: Number(targetPrice),
          currency
        })
      });

      const body: unknown = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
          ? body.message
          : 'The monitor could not be created. Please try again.';
        throw new Error(message);
      }

      const result = body as { monitorId?: string; name?: string };
      createdMonitorId = result.monitorId ?? '';
      successMessage = 'Monitor "' + (result.name ?? name.trim()) + '" was created.';
      name = '';
      origin = '';
      destination = '';
      departureDate = '';
      returnDate = '';
      passengerCount = 1;
      targetPrice = '';
      currency = 'PHP';
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred while creating the monitor.';
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>Create a monitor · Travel Price Monitor</title>
  <meta name="description" content="Create a flight price monitor with your route, travel dates, and target price." />
</svelte:head>

<div class="page-shell">
  <header class="topbar">
    <a class="brand" href="/" aria-label="Travel Price Monitor home">
      <span class="brand-mark" aria-hidden="true">✦</span>
      <span>Travel Price Monitor</span>
    </a>
    <span class="topbar-note">Travel smarter. Pay less.</span>
  </header>

  <main>
    <section class="intro" aria-labelledby="page-title">
      <p class="eyebrow">YOUR NEXT TRIP</p>
      <h1 id="page-title">Create a price monitor</h1>
      <p class="subtitle">Tell us where you’re going and what you’d like to pay. We’ll keep your criteria together so you can track the fare you care about.</p>
    </section>

    <form class="monitor-form" on:submit={submitMonitor} novalidate>
      <div class="form-heading">
        <div>
          <h2>Monitor details</h2>
          <p>Fields marked <span aria-hidden="true">*</span> are required.</p>
        </div>
        <span class="step-label"><span class="step-dot"></span> New monitor</span>
      </div>

      <div class="field">
        <label for="monitor-name">Monitor name <span>*</span></label>
        <input id="monitor-name" bind:value={name} maxlength="100" placeholder="e.g. Tokyo winter trip" autocomplete="off" required />
        <small>Give this search a name you’ll recognize later.</small>
      </div>

      <div class="section-divider"></div>
      <div class="section-title">
        <span class="section-icon" aria-hidden="true">↗</span>
        <div><h3>Where are you flying?</h3><p>Use three-letter IATA airport codes.</p></div>
      </div>

      <div class="route-grid">
        <div class="field">
          <label for="origin">From <span>*</span></label>
          <input id="origin" bind:value={origin} maxlength="3" minlength="3" placeholder="MNL" autocomplete="off" autocapitalize="characters" required />
          <small>Origin airport</small>
        </div>
        <div class="route-arrow" aria-hidden="true">→</div>
        <div class="field">
          <label for="destination">To <span>*</span></label>
          <input id="destination" bind:value={destination} maxlength="3" minlength="3" placeholder="NRT" autocomplete="off" autocapitalize="characters" required />
          <small>Destination airport</small>
        </div>
      </div>

      <div class="section-divider"></div>
      <div class="section-title">
        <span class="section-icon" aria-hidden="true">▦</span>
        <div><h3>When do you want to travel?</h3><p>Choose your departure and optional return date.</p></div>
      </div>

      <div class="trip-toggle">
        <span>Trip type</span>
        <div class="toggle-options" role="group" aria-label="Trip type">
          <button type="button" class:active={roundTrip} aria-pressed={roundTrip} on:click={() => roundTrip = true}>Round trip</button>
          <button type="button" class:active={!roundTrip} aria-pressed={!roundTrip} on:click={() => { roundTrip = false; returnDate = ''; }}>One way</button>
        </div>
      </div>

      <div class="date-grid">
        <div class="field">
          <label for="departure-date">Departure date <span>*</span></label>
          <input id="departure-date" type="date" bind:value={departureDate} min={minDate} required />
        </div>
        {#if roundTrip}
          <div class="field">
            <label for="return-date">Return date <span>*</span></label>
            <input id="return-date" type="date" bind:value={returnDate} min={departureDate || minDate} required />
          </div>
        {/if}
      </div>

      <div class="field passenger-field">
        <label for="passengers">Passengers <span>*</span></label>
        <select id="passengers" bind:value={passengerCount}>
          {#each Array.from({ length: 9 }, (_, index) => index + 1) as count}
            <option value={count}>{count} {count === 1 ? 'passenger' : 'passengers'}</option>
          {/each}
        </select>
      </div>

      <div class="section-divider"></div>
      <div class="section-title">
        <span class="section-icon price-icon" aria-hidden="true">₱</span>
        <div><h3>What’s your target price?</h3><p>We’ll use this as your preferred maximum fare.</p></div>
      </div>

      <div class="price-grid">
        <div class="field currency-field">
          <label for="currency">Currency <span>*</span></label>
          <select id="currency" bind:value={currency}>
            <option value="PHP">PHP · Philippine peso</option>
            <option value="USD">USD · US dollar</option>
            <option value="JPY">JPY · Japanese yen</option>
            <option value="SGD">SGD · Singapore dollar</option>
            <option value="THB">THB · Thai baht</option>
            <option value="MYR">MYR · Malaysian ringgit</option>
            <option value="EUR">EUR · Euro</option>
            <option value="GBP">GBP · British pound</option>
            <option value="AUD">AUD · Australian dollar</option>
            <option value="CAD">CAD · Canadian dollar</option>
          </select>
        </div>
        <div class="field">
          <label for="target-price">Target price <span>*</span></label>
          <input id="target-price" type="number" bind:value={targetPrice} min="0.01" max="10000000" step="0.01" placeholder="25000" required />
          <small>For the full trip, in your selected currency.</small>
        </div>
      </div>

      {#if errorMessage}
        <div class="feedback error" role="alert"><span aria-hidden="true">!</span><p>{errorMessage}</p></div>
      {/if}
      {#if successMessage}
        <div class="feedback success" role="status"><span aria-hidden="true">✓</span><div><p>{successMessage}</p>{#if createdMonitorId}<small>Monitor ID: {createdMonitorId}</small>{/if}</div></div>
      {/if}

      <div class="form-actions">
        <p>Your monitor starts with these criteria. You can manage it later.</p>
        <button class="submit-button" type="submit" disabled={submitting}>
          {#if submitting}<span class="spinner" aria-hidden="true"></span> Creating monitor…{:else}Create monitor <span aria-hidden="true">→</span>{/if}
        </button>
      </div>
    </form>

    <p class="privacy-note"><span aria-hidden="true">⌑</span> Your travel criteria are submitted securely to your Travel Price Monitor API.</p>
  </main>
  <footer>Travel Price Monitor <span>·</span> Keep an eye on the fare, not the tabs.</footer>
</div>

<style>
  :global(*) { box-sizing: border-box; }
  :global(body) { margin: 0; background: #f7f8fc; color: #17243b; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased; }
  :global(button), :global(input), :global(select) { font: inherit; }
  .page-shell { min-height: 100vh; }
  .topbar { height: 72px; padding: 0 max(24px, calc((100vw - 1080px) / 2)); display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,.88); border-bottom: 1px solid #e8ebf2; }
  .brand { display: inline-flex; gap: 11px; align-items: center; text-decoration: none; color: #17243b; font-weight: 760; letter-spacing: -.025em; }
  .brand-mark { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; background: #3158d8; color: white; font-size: 19px; box-shadow: 0 4px 10px #3158d82e; }
  .topbar-note { color: #7b879b; font-size: 13px; }
  main { width: min(100% - 32px, 760px); margin: 0 auto; padding: 54px 0 24px; }
  .intro { margin: 0 0 28px; }
  .eyebrow { margin: 0 0 11px; color: #3158d8; font-size: 11px; font-weight: 800; letter-spacing: .15em; }
  h1 { margin: 0; font-size: clamp(30px, 4vw, 40px); line-height: 1.15; letter-spacing: -.045em; font-weight: 780; }
  .subtitle { max-width: 630px; margin: 14px 0 0; color: #64718a; font-size: 15px; line-height: 1.7; }
  .monitor-form { background: white; border: 1px solid #e7eaf1; border-radius: 20px; padding: 32px 36px 28px; box-shadow: 0 12px 38px #1b2d4d0a; }
  .form-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 28px; }
  h2 { margin: 0; font-size: 19px; letter-spacing: -.02em; }
  .form-heading p { margin: 7px 0 0; color: #8791a3; font-size: 12px; }
  .form-heading p span, label span { color: #d34c59; }
  .step-label { white-space: nowrap; display: inline-flex; align-items: center; gap: 7px; padding: 7px 10px; border-radius: 20px; background: #eef2ff; color: #3158d8; font-size: 11px; font-weight: 700; }
  .step-dot { width: 6px; height: 6px; border-radius: 50%; background: #3158d8; }
  .field { display: flex; flex-direction: column; min-width: 0; gap: 8px; }
  label { color: #27364f; font-size: 12px; font-weight: 700; }
  input, select { width: 100%; min-height: 46px; border: 1px solid #dce2ed; border-radius: 9px; padding: 0 13px; outline: none; background: #fff; color: #17243b; transition: border-color .15s, box-shadow .15s; }
  input::placeholder { color: #aab3c1; }
  input:focus, select:focus { border-color: #5476e5; box-shadow: 0 0 0 3px #3158d817; }
  input:focus-visible, select:focus-visible, button:focus-visible { outline: 3px solid #3158d84d; outline-offset: 2px; }
  small { color: #8a95a8; font-size: 11px; line-height: 1.5; }
  .section-divider { height: 1px; background: #edf0f5; margin: 25px 0; }
  .section-title { display: flex; gap: 12px; align-items: center; margin-bottom: 20px; }
  .section-icon { display: grid; place-items: center; flex: 0 0 36px; height: 36px; border-radius: 10px; background: #edf2ff; color: #3158d8; font-size: 18px; font-weight: 700; }
  .price-icon { background: #e9f8f1; color: #14815d; }
  h3 { margin: 0; font-size: 14px; letter-spacing: -.01em; }
  .section-title p { margin: 5px 0 0; color: #8791a3; font-size: 11px; }
  .route-grid { display: grid; grid-template-columns: 1fr 28px 1fr; gap: 12px; align-items: center; }
  .route-arrow { text-align: center; padding-top: 21px; color: #9aa5b7; font-size: 20px; }
  .date-grid, .price-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .trip-toggle { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; color: #27364f; font-size: 12px; font-weight: 700; }
  .toggle-options { display: inline-flex; gap: 3px; padding: 3px; border-radius: 9px; background: #f1f3f8; }
  .toggle-options button { padding: 8px 12px; border: 0; border-radius: 7px; background: transparent; color: #7b879b; font-size: 11px; font-weight: 700; cursor: pointer; }
  .toggle-options button.active { background: white; color: #3158d8; box-shadow: 0 1px 4px #18274712; }
  .passenger-field { margin-top: 17px; max-width: 240px; }
  .form-actions { display: flex; justify-content: space-between; align-items: center; gap: 18px; margin-top: 28px; padding-top: 23px; border-top: 1px solid #edf0f5; }
  .form-actions p { margin: 0; max-width: 290px; color: #8993a5; font-size: 11px; line-height: 1.6; }
  .submit-button { display: inline-flex; align-items: center; justify-content: center; gap: 12px; min-height: 46px; border: 0; border-radius: 9px; padding: 0 19px; background: #3158d8; color: white; font-size: 12px; font-weight: 750; cursor: pointer; box-shadow: 0 5px 13px #3158d82b; transition: background .15s, transform .15s; }
  .submit-button:hover:not(:disabled) { background: #2448c3; transform: translateY(-1px); }
  .submit-button:disabled { opacity: .7; cursor: wait; }
  .spinner { width: 13px; height: 13px; border: 2px solid #ffffff70; border-top-color: white; border-radius: 50%; animation: spin .7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .feedback { display: flex; align-items: flex-start; gap: 10px; margin-top: 22px; padding: 13px 14px; border-radius: 9px; font-size: 12px; line-height: 1.6; }
  .feedback > span { display: grid; place-items: center; flex: 0 0 20px; height: 20px; border-radius: 50%; font-weight: 800; }
  .feedback p { margin: 0; }
  .error { color: #9b303b; background: #fff0f1; border: 1px solid #f8dadd; }
  .error > span { color: white; background: #cc4b57; }
  .success { color: #17674d; background: #ecfaf3; border: 1px solid #ccefe0; }
  .success > span { color: white; background: #20956b; }
  .success small { display: block; margin-top: 3px; color: #47876e; overflow-wrap: anywhere; }
  .privacy-note { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 18px 0 0; color: #8993a5; font-size: 11px; }
  .privacy-note span { font-size: 16px; color: #6f9b8b; }
  footer { padding: 26px 16px 32px; text-align: center; color: #a1a9b7; font-size: 11px; }
  footer span { padding: 0 5px; }
  @media (max-width: 600px) {
    .topbar { height: 62px; padding: 0 18px; }
    .brand { font-size: 13px; }
    .brand-mark { width: 29px; height: 29px; }
    .topbar-note { display: none; }
    main { width: min(100% - 24px, 760px); padding-top: 34px; }
    .intro { margin-bottom: 22px; }
    .subtitle { font-size: 13px; }
    .monitor-form { padding: 23px 18px 20px; border-radius: 15px; }
    .form-heading { flex-direction: column; gap: 12px; margin-bottom: 24px; }
    .route-grid { grid-template-columns: 1fr 18px 1fr; gap: 7px; }
    .route-arrow { font-size: 16px; }
    .date-grid, .price-grid { grid-template-columns: 1fr; gap: 16px; }
    .passenger-field { max-width: none; }
    .form-actions { align-items: stretch; flex-direction: column; }
    .form-actions p { max-width: none; }
    .submit-button { width: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
  }
</style>
