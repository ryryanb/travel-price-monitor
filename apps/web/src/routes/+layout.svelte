<script lang="ts">
  import { PUBLIC_API_BASE_URL } from '$env/static/public';
  import AuthPanel from '$lib/AuthPanel.svelte';

  const apiBaseUrl = (PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');
  function onAuthenticated(_idToken: string) {
    // AuthPanel stores the session token; the create-monitor page reads it on submit.
  }
</script>

<svelte:head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="auth-layout">
  <AuthPanel {apiBaseUrl} {onAuthenticated} />
</div>
<slot />

<style>
  .auth-layout { width: min(100% - 32px, 760px); margin: 22px auto 0; }
  @media (max-width: 600px) {
    .auth-layout { width: min(100% - 24px, 760px); margin-top: 14px; }
  }
</style>
