# OIDC Authentication Setup

DashClaw supports generic OpenID Connect (OIDC) for authentication, which allows you to integrate with identity providers like Authentik, Keycloak, or Okta.

## Configuration

Add the following environment variables to your `.env` file or container environment:

| Variable | Description |
|----------|-------------|
| `OIDC_ISSUER_URL` | The issuer URL of your OIDC provider (e.g., `https://authentik.my.domain/application/o/dashclaw`) |
| `OIDC_CLIENT_ID` | The Client ID provided by your identity provider |
| `OIDC_CLIENT_SECRET` | The Client Secret provided by your identity provider |
| `OIDC_DISPLAY_NAME` | (Optional) The name to display on the login button (e.g., "Authentik"). Defaults to "OIDC". |

## Authentik Setup Guide

1.  **Create a Provider**:
    *   In Authentik, go to **Applications -> Providers**.
    *   Create a new **OAuth2/OpenID Provider**.
    *   Set the **Client ID** and **Client Secret**.
    *   Set the **Redirect URIs** to `https://<your-dashclaw-url>/api/auth/callback/oidc`.
    *   Ensure the **Authorization Flow** is set (usually `default-provider-authorization-implicit-flow` or similar).

2.  **Create an Application**:
    *   Go to **Applications -> Applications**.
    *   Create a new application and assign the provider you just created.
    *   Note the slug of the application.

3.  **Configure DashClaw**:
    *   `OIDC_ISSUER_URL`: `https://<authentik-url>/application/o/<app-slug>/`
    *   `OIDC_CLIENT_ID`: `<your-client-id>`
    *   `OIDC_CLIENT_SECRET`: `<your-client-secret>`
    *   `OIDC_DISPLAY_NAME`: "Authentik"

## Keycloak Setup Guide

1.  **Create a Client**:
    *   In Keycloak, select your realm and go to **Clients**.
    *   Create a new client with `openid-connect`.
    *   Set **Valid Redirect URIs** to `https://<your-dashclaw-url>/api/auth/callback/oidc`.
    *   Set **Client authentication** to `ON` to get a client secret.

2.  **Configure DashClaw**:
    *   `OIDC_ISSUER_URL`: `https://<keycloak-url>/realms/<your-realm>`
    *   `OIDC_CLIENT_ID`: `<your-client-id>`
    *   `OIDC_CLIENT_SECRET`: `<your-client-secret>`
    *   `OIDC_DISPLAY_NAME`: "Keycloak"
