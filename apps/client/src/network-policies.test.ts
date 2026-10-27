import { expect, it } from 'vitest';
import { browserRequestPolicy, browserRequestPolicies } from './network-policies';

it('classifies POST reads, shared-path operations, and retained recovery without method fallbacks', () => {
  expect(browserRequestPolicy('POST', '/api/memories', {})).toMatchObject({
    semantic: 'read',
    timeoutMs: 15_000,
  });
  expect(browserRequestPolicy('POST', '/api/god/appraisal', {})).toMatchObject({
    semantic: 'mutation',
    recovery: 'current-state',
  });
  expect(browserRequestPolicy('POST', '/api/attention', { targetId: null })).toMatchObject({
    semantic: 'mutation',
    timeoutMs: 30_000,
    recovery: 'current-state',
  });
  expect(browserRequestPolicy('POST', '/api/god/status-effects', {})).toMatchObject({
    semantic: 'read',
  });
  expect(browserRequestPolicy('POST', '/api/god/status-effects', { policy: {} })).toMatchObject({
    semantic: 'mutation',
  });
  expect(
    browserRequestPolicy('POST', '/api/world-agent/messages', { mode: 'invent' }),
  ).toMatchObject({ timeoutMs: 15_000, recovery: 'receipt' });
  expect(
    browserRequestPolicy('POST', '/api/world-agent/messages', {
      sessionId: 'session',
      mode: 'discuss',
    }),
  ).toMatchObject({ timeoutMs: 30_000, recovery: 'same-id' });
  expect(browserRequestPolicy('POST', '/api/saves/load', {})).toMatchObject({
    timeoutMs: 60_000,
    recovery: 'receipt',
  });
  expect(browserRequestPolicy('POST', '/api/god/items', {})).toMatchObject({ recovery: 'same-id' });
  expect(browserRequestPolicy('GET', '/api/history?cursor=private')).toMatchObject({
    pathname: '/api/history',
    semantic: 'read',
  });
  expect(() => browserRequestPolicy('POST', '/api/unclassified', {})).toThrow();
  expect(() => browserRequestPolicy('GET', '/api/god/appraisal')).toThrow();
  expect(() => browserRequestPolicy('GET', 'https://elsewhere.example/api/state')).toThrow();
  const keys = browserRequestPolicies.map((entry) =>
    JSON.stringify([entry.method, entry.pathname, entry.discriminator]),
  );
  expect(new Set(keys).size).toBe(keys.length);
});
