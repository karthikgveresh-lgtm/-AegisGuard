/**
 * API Service for Fraud Scoring Microservice
 */

const BASE_URL = '/api';

export async function evaluateTransaction(payload) {
  const res = await fetch(`${BASE_URL}/transactions/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || 'Evaluation failed');
  }
  return res.json();
}

export async function verifyChallenge(transactionId, { code, trust_device = true }) {
  const res = await fetch(`${BASE_URL}/transactions/${transactionId}/challenge/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, trust_device })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw {
      status: res.status,
      ...data
    };
  }
  return data;
}

export async function getTransactions({ limit = 50, offset = 0, decision = '', search = '' } = {}) {
  const params = new URLSearchParams();
  if (limit) params.set('limit', limit);
  if (offset) params.set('offset', offset);
  if (decision && decision !== 'ALL') params.set('decision', decision);
  if (search) params.set('search', search);

  const res = await fetch(`${BASE_URL}/transactions?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch transactions');
  return res.json();
}

export async function getTransactionDetails(id) {
  const res = await fetch(`${BASE_URL}/transactions/${id}`);
  if (!res.ok) throw new Error('Failed to load transaction details');
  return res.json();
}

export async function getMetrics() {
  const res = await fetch(`${BASE_URL}/metrics`);
  if (!res.ok) throw new Error('Failed to fetch metrics');
  return res.json();
}

export async function getUsers() {
  const res = await fetch(`${BASE_URL}/metrics/users`);
  if (!res.ok) throw new Error('Failed to load users');
  return res.json();
}

export async function getPersonas() {
  const res = await fetch(`${BASE_URL}/metrics/personas`);
  if (!res.ok) throw new Error('Failed to load personas');
  return res.json();
}

export async function getDemoTotp() {
  const res = await fetch(`${BASE_URL}/metrics/demo/totp`);
  if (!res.ok) throw new Error('Failed to load demo TOTP');
  return res.json();
}

export async function triggerAttackSimulation(count = 6) {
  const res = await fetch(`${BASE_URL}/simulate/attack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count })
  });
  if (!res.ok) throw new Error('Failed to trigger attack simulation');
  return res.json();
}

export async function resetDemoState() {
  const res = await fetch(`${BASE_URL}/demo/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error('Failed to reset demo state');
  return res.json();
}

/**
 * Connect to SSE real-time stream
 */
export function subscribeToStream(onMessage, onStatusChange) {
  const eventSource = new EventSource(`${BASE_URL}/stream`);

  eventSource.onopen = () => {
    if (onStatusChange) onStatusChange('connected');
  };

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (onMessage) onMessage(data);
    } catch (e) {
      console.warn('Error parsing SSE message:', e);
    }
  };

  eventSource.onerror = (err) => {
    console.error('SSE Error:', err);
    if (onStatusChange) onStatusChange('reconnecting');
  };

  return () => {
    eventSource.close();
    if (onStatusChange) onStatusChange('closed');
  };
}
