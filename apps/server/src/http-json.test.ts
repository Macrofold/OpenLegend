import { EventEmitter } from 'node:events';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import { afterEach, expect, it, vi } from 'vitest';
import { receiveBodyDeadline } from './http-json.js';

afterEach(() => vi.useRealTimers());
function pending(path: string, headers: IncomingHttpHeaders = { 'content-length': '100' }) {
  const request = Object.assign(new EventEmitter(), { complete: false, headers, destroy: vi.fn() });
  const response = { headersSent: false, writeHead: vi.fn(), end: vi.fn() };
  receiveBodyDeadline(
    request as unknown as IncomingMessage,
    response as unknown as ServerResponse,
    path,
  );
  return { request, response };
}
it('retains ordinary receive deadlines while allowing an explicit streamed import', () => {
  vi.useFakeTimers();
  const ordinary = pending('/api/cognition-lab/operations');
  const upload = pending('/api/cognition-lab/imports', { 'transfer-encoding': 'chunked' });
  vi.advanceTimersByTime(10_000);
  expect(ordinary.response.writeHead).toHaveBeenCalledWith(408, { Connection: 'close' });
  expect(ordinary.request.destroy).toHaveBeenCalledOnce();
  expect(upload.request.destroy).not.toHaveBeenCalled();
  vi.advanceTimersByTime(110_000);
  expect(upload.request.destroy).toHaveBeenCalledOnce();
});
it('ends receive timing when the body finishes even if native processing continues', () => {
  vi.useFakeTimers();
  const request = pending('/api/cognition-lab/imports');
  request.request.emit('end');
  vi.advanceTimersByTime(120_000);
  expect(request.request.destroy).not.toHaveBeenCalled();
});
it('does not time bodyless GET streams or zero-length mutations before the parser completion flag arrives', () => {
  vi.useFakeTimers();
  const events = pending('/api/events', {});
  const emptyMutation = pending('/api/cognition-lab/operations', { 'content-length': '0' });
  events.response.headersSent = true;
  vi.advanceTimersByTime(120_000);
  for (const { request, response } of [events, emptyMutation]) {
    expect(request.destroy).not.toHaveBeenCalled();
    expect(response.end).not.toHaveBeenCalled();
    expect(response.writeHead).not.toHaveBeenCalled();
  }
});
it('does not turn a fully received unread body into an authentication or execution deadline', () => {
  vi.useFakeTimers();
  const { request, response } = pending('/api/cognition-lab/operations');
  // Native parsing can finish without a readable-stream end event if the
  // application is still authenticating and has not started consuming the body.
  request.complete = true;
  vi.advanceTimersByTime(10_000);
  expect(request.destroy).not.toHaveBeenCalled();
  expect(response.end).not.toHaveBeenCalled();
  expect(response.writeHead).not.toHaveBeenCalled();
});
