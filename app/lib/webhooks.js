/**
 * Webhook dispatch helpers.
 * HMAC signing, delivery with logging, and org-level dispatch.
 */

import crypto from 'crypto';

/**
 * Sign a payload with HMAC-SHA256.
 */
export function signPayload(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Deliver a webhook: POST payload to url, log result to webhook_deliveries.
 *
 * @returns {Promise<{success: boolean, status?: number}>}
 */
export async function deliverWebhook({ webhookId, orgId, url, secret, eventType, payload, sql }) {
  const deliveryId = `wd_${crypto.randomUUID()}`;
  const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const signature = signPayload(payloadStr, secret);
  const now = new Date().toISOString();
  const start = Date.now();

  let status = 'failed';
  let responseStatus = null;
  let responseBody = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DashClaw-Signature': signature,
        'X-DashClaw-Event': eventType,
        'X-DashClaw-Delivery': deliveryId,
        'User-Agent': 'DashClaw-Webhooks/1.0',
      },
      body: payloadStr,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    responseStatus = res.status;
    responseBody = await res.text().catch(() => '');
    if (responseBody.length > 2000) responseBody = responseBody.substring(0, 2000);
    status = res.ok ? 'success' : 'failed';
  } catch (err) {
    responseBody = err.message || 'Request failed';
    status = 'failed';
  }

  const durationMs = Date.now() - start;

  // Log delivery
  sql`
    INSERT INTO webhook_deliveries (id, webhook_id, org_id, event_type, payload, status, response_status, response_body, attempted_at, duration_ms)
    VALUES (${deliveryId}, ${webhookId}, ${orgId}, ${eventType}, ${payloadStr}, ${status}, ${responseStatus}, ${responseBody}, ${now}, ${durationMs})
  `.catch((err) => {
    console.error('[WEBHOOK] Failed to log delivery:', err.message);
  });

  return { success: status === 'success', status: responseStatus };
}

/**
 * Deliver a guard webhook: POST evaluation context to customer URL for custom decision logic.
 * No HMAC signing — guard webhooks are policy-based, not integration-based.
 *
 * @returns {Promise<{success: boolean, response: Object|null, status: number|null}>}
 */
export async function deliverGuardWebhook({ url, policyId, orgId, payload, timeoutMs, sql }) {
  const deliveryId = `wd_${crypto.randomUUID()}`;
  const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const now = new Date().toISOString();
  const start = Date.now();

  let status = 'failed';
  let responseStatus = null;
  let responseBody = null;
  let parsedResponse = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs || 5000);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DashClaw-Event': 'guard.evaluation',
        'X-DashClaw-Delivery': deliveryId,
        'User-Agent': 'DashClaw-Guard/1.0',
      },
      body: payloadStr,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    responseStatus = res.status;
    responseBody = await res.text().catch(() => '');
    if (responseBody.length > 2000) responseBody = responseBody.substring(0, 2000);
    status = res.ok ? 'success' : 'failed';

    if (res.ok) {
      try {
        parsedResponse = JSON.parse(responseBody);
      } catch { /* non-JSON response treated as no-op */ }
    }
  } catch (err) {
    responseBody = err.name === 'AbortError' ? 'Request timed out' : (err.message || 'Request failed');
    status = 'failed';
  }

  const durationMs = Date.now() - start;

  // Log delivery (use policyId as webhook_id for guard webhooks)
  sql`
    INSERT INTO webhook_deliveries (id, webhook_id, org_id, event_type, payload, status, response_status, response_body, attempted_at, duration_ms)
    VALUES (${deliveryId}, ${policyId}, ${orgId}, ${'guard.evaluation'}, ${payloadStr}, ${status}, ${responseStatus}, ${responseBody}, ${now}, ${durationMs})
  `.catch((err) => {
    console.error('[GUARD WEBHOOK] Failed to log delivery:', err.message);
  });

  return { success: status === 'success', response: parsedResponse, status: responseStatus };
}

/**
 * Fire webhooks for an org when new signals are detected.
 * Loads active webhooks, filters by event subscription, delivers, manages failure_count.
 */
export async function fireWebhooksForOrg(orgId, signals, sql) {
  if (!signals || signals.length === 0) return [];

  const webhooks = await sql`
    SELECT id, url, secret, events, failure_count
    FROM webhooks
    WHERE org_id = ${orgId} AND active = 1
  `;

  if (webhooks.length === 0) return [];

  const results = [];

  for (const wh of webhooks) {
    let subscribedEvents;
    try {
      subscribedEvents = JSON.parse(wh.events);
    } catch {
      subscribedEvents = ['all'];
    }

    // Filter signals this webhook cares about
    const relevantSignals = subscribedEvents.includes('all')
      ? signals
      : signals.filter(s => subscribedEvents.includes(s.type));

    if (relevantSignals.length === 0) continue;

    const payload = {
      event: 'signals.detected',
      org_id: orgId,
      timestamp: new Date().toISOString(),
      signals: relevantSignals,
    };

    const result = await deliverWebhook({
      webhookId: wh.id,
      orgId,
      url: wh.url,
      secret: wh.secret,
      eventType: 'signals.detected',
      payload,
      sql,
    });

    if (result.success) {
      // Reset failure count on success
      sql`UPDATE webhooks SET failure_count = 0, last_triggered_at = ${new Date().toISOString()} WHERE id = ${wh.id}`.catch(() => {});
    } else {
      const newCount = (parseInt(wh.failure_count, 10) || 0) + 1;
      if (newCount >= 10) {
        // Disable webhook after 10 consecutive failures
        sql`UPDATE webhooks SET failure_count = ${newCount}, active = 0, last_triggered_at = ${new Date().toISOString()} WHERE id = ${wh.id}`.catch(() => {});
      } else {
        sql`UPDATE webhooks SET failure_count = ${newCount}, last_triggered_at = ${new Date().toISOString()} WHERE id = ${wh.id}`.catch(() => {});
      }
    }

    results.push({ webhookId: wh.id, success: result.success, signalCount: relevantSignals.length });
  }

  return results;
}
