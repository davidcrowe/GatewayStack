/**
 * Example Auth0 Post-Login Action for ChatGPT connectors.
 *
 * - Detects ChatGPT based on client name (Auth0 DCR creates unique client IDs)
 * - Ensures required scopes are present on the access token
 * - Assigns an optional role to the user
 * - Can be customized by applications using gatewaystack
 */
exports.onExecutePostLogin = async (event, api) => {
  const CONNECTOR_ROLE_ID = event.secrets.CONNECTOR_ROLE_ID;
  const API_AUDIENCE = event.secrets.API_AUDIENCE;

  // Match the ChatGPT dynamic client
  const clientName = (event.client?.name || '').toLowerCase();
  const isChatGPT = clientName.includes('chatgpt');

  console.log('post-login', {
    client_id: event.client?.client_id,
    client_name: event.client?.name,
    isChatGPT
  });

  if (!isChatGPT) return;

  // -----------------------------------------
  // Required scopes — customize these for your app
  // -----------------------------------------
  const REQUIRED_SCOPES = [
    'yourapi.read',
    'yourapi.write'
  ];

  REQUIRED_SCOPES.forEach((s) => api.accessToken.addScope(s));

  // -----------------------------------------
  // Optional: stable custom claim
  // -----------------------------------------
  // api.accessToken.setCustomClaim('https://your.app/uid', event.user.user_id);

  // -----------------------------------------
  // Optional: auto-assign a role
  // -----------------------------------------
  if (CONNECTOR_ROLE_ID) {
    const alreadyHasRole =
      Array.isArray(event.authorization?.roles) &&
      event.authorization.roles.some((r) => r?.id === CONNECTOR_ROLE_ID);

    if (!alreadyHasRole) {
      try {
        await api.roles.assignUserRoles(event.user.user_id, [CONNECTOR_ROLE_ID]);
        console.log('Assigned connector role', {
          user: event.user.user_id,
          role: CONNECTOR_ROLE_ID,
        });
      } catch (e) {
        console.error('Role assignment failed', { error: e.message });
      }
    }
  }
};
