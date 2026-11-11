import { safeEqual } from '@/lib/password'

export const CAKTO_CONFIG = {
  clientId: process.env.CAKTO_CLIENT_ID || '',
  clientSecret: process.env.CAKTO_CLIENT_SECRET || '',
  webhookSecret: process.env.CAKTO_WEBHOOK_SECRET || '',
  checkoutUrl: process.env.CAKTO_CHECKOUT_URL || 'https://pay.cakto.com.br/c2iyui9_851221',
  oauthUrl: 'https://api.cakto.com.br/public_api/token/',
  apiUrl: 'https://api.cakto.com.br/public_api' // Corrected based on Cakto docs
}

/**
 * Validates the origin/signature of a webhook request.
 * For now, verifies if a secret token matches.
 */
export function verifyCaktoWebhookSignature(token?: string | null) {
  return !!(CAKTO_CONFIG.webhookSecret && token && safeEqual(token, CAKTO_CONFIG.webhookSecret))
}

let cachedAccessToken: string | null = null;
let tokenExpiresAt: number | null = null;

/**
 * Requests an OAuth2 access token from Cakto for API usage.
 * Reuses the token if valid, ensuring we don't spam their token endpoint.
 */
export async function getCaktoToken(): Promise<string> {
  // Validate token lifetime buffer (60s)
  if (cachedAccessToken && tokenExpiresAt && Date.now() < tokenExpiresAt - 60000) {
    return cachedAccessToken;
  }

  if (!CAKTO_CONFIG.clientId || !CAKTO_CONFIG.clientSecret) {
    throw new Error('CAKTO_CLIENT_ID and CAKTO_CLIENT_SECRET are required for API calls.');
  }

  const payload = new URLSearchParams()
  payload.append('client_id', CAKTO_CONFIG.clientId)
  payload.append('client_secret', CAKTO_CONFIG.clientSecret)

  const res = await fetch(CAKTO_CONFIG.oauthUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: payload.toString()
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to fetch Cakto token (Status ${res.status}): ${errText}`);
  }

  const data = await res.json();
  cachedAccessToken = data.access_token;
  
  // Expiration logic based on expires_in representation in seconds
  const expiresInSeconds = data.expires_in || 3600;
  tokenExpiresAt = Date.now() + (expiresInSeconds * 1000);

  return cachedAccessToken as string;
}

/**
 * Helper to execute auth-checked Cakto API queries.
 * Ideal for later Orders, Offers, or Subscriptions lookups.
 */
export async function caktoFetch(endpoint: string, options: RequestInit = {}) {
  const token = await getCaktoToken();
  const baseEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const targetUrl = endpoint.startsWith('http') ? endpoint : `${CAKTO_CONFIG.apiUrl}${baseEndpoint}`;
  
  return fetch(targetUrl, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
}

/**
 * Helper methods for common authenticated endpoints based on /public_api/...
 */
export async function getCaktoProduct(productId: string) {
  return caktoFetch(`/products/${productId}`);
}

export async function getCaktoOrder(orderId: string) {
  return caktoFetch(`/orders/${orderId}`);
}

export async function getCaktoSubscription(subscriptionId: string) {
  return caktoFetch(`/subscriptions/${subscriptionId}`);
}
