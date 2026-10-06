import { API_ORIGIN } from './api';

/**
 * Live API health probe.
 *
 * The navbar used to render a fixed "API 8.0: 18ms" string — a hard-coded value that
 * stayed green even when the backend was down. This service measures the real round
 * trip against the API's `/health` endpoint and reports the actual status.
 *
 * The origin comes from the same config the REST client uses, so there is no second
 * localhost URL to keep in sync.
 */
const HEALTH_URL = `${API_ORIGIN}/health`;
const DEFAULT_TIMEOUT_MS = 4000;

/** Last successful/failed probe, shared by every subscriber. */
let lastProbe = null;
const listeners = new Set();

function publish(probe) {
  lastProbe = probe;
  listeners.forEach((fn) => {
    try {
      fn(probe);
    } catch (err) {
      console.warn('Health listener failed:', err);
    }
  });
}

export function getLastProbe() {
  return lastProbe;
}

/** Subscribe to probe results. Returns an unsubscribe function. */
export function onHealthProbe(listener) {
  listeners.add(listener);
  if (lastProbe) listener(lastProbe);
  return () => listeners.delete(listener);
}

/**
 * Pings `/health` and measures real latency.
 * @returns {Promise<{ok: boolean, latencyMs: number|null, status: string, message: string, checkedAt: string}>}
 */
export async function probeApiHealth(timeoutMs = DEFAULT_TIMEOUT_MS) {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(HEALTH_URL, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });

    const latencyMs = Math.round(performance.now() - started);
    const probe = {
      ok: response.ok,
      latencyMs,
      status: response.ok ? 'healthy' : `error-${response.status}`,
      message: response.ok
        ? `API ${latencyMs}ms`
        : `API ${response.status}`,
      checkedAt: new Date().toISOString()
    };
    publish(probe);
    return probe;
  } catch (err) {
    const latencyMs = Math.round(performance.now() - started);
    const probe = {
      ok: false,
      latencyMs,
      status: 'offline',
      message: err?.name === 'AbortError' ? 'API timeout' : 'API offline',
      checkedAt: new Date().toISOString()
    };
    publish(probe);
    return probe;
  } finally {
    clearTimeout(timer);
  }
}

export default { probeApiHealth, getLastProbe, onHealthProbe };
