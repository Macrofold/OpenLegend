import { useLocal } from './storage';
import { useEffect, useState } from 'react';
import type { InventionHistory, InventionRequestView } from '@open-legend/protocol';
import { post } from '../api';
import { Button, Tag } from '../design-system/components';

const active = (request: InventionRequestView) =>
  ['queued', 'judging', 'generating'].includes(request.status);
export function Inventions({
  worldId,
  seed,
  visible,
}: {
  worldId: string;
  seed: { id: string; text: string } | null;
  visible: boolean;
}) {
  const [form, setForm] = useLocal(
    `open-legend:invention-draft:${worldId}`,
    {
      text: seed?.text ?? '',
      requestId: crypto.randomUUID(),
      conversationId: seed?.id ?? crypto.randomUUID(),
      seedId: seed?.id ?? '',
    },
    (
      value,
    ): value is { text: string; requestId: string; conversationId: string; seedId: string } => {
      if (!value || typeof value !== 'object') return false;
      const fields = value as Record<string, unknown>;
      return ['text', 'requestId', 'conversationId', 'seedId'].every(
        (key) => typeof fields[key] === 'string',
      );
    },
  );
  const draft = form.text;
  const identity = { requestId: form.requestId, conversationId: form.conversationId };
  const [requests, setRequests] = useState<InventionRequestView[]>([]);
  const [next, setNext] = useState<InventionHistory['next']>();
  const [pending, setPending] = useState(false),
    [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (seed && seed.id !== form.seedId)
      setForm({
        text: seed.text,
        requestId: crypto.randomUUID(),
        conversationId: seed.id,
        seedId: seed.id,
      });
  }, [seed]);
  useEffect(() => {
    if (!visible) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function load() {
      try {
        const result = await post<InventionHistory>('/api/inventions/list', { worldId });
        if (disposed) return;
        if (!result.ok) throw new Error(result.message);
        setRequests(result.requests);
        setNext(result.next);
        if (result.requests.some(active)) timer = setTimeout(() => void load(), 2000);
      } catch (error) {
        if (!disposed) setError(String(error));
      }
    }
    void load();
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [worldId, visible, refresh]);
  async function submit() {
    if (pending || !draft.trim()) return;
    setPending(true);
    setError('');
    try {
      // Reuse this ID after transport uncertainty; a refresh/retry cannot purchase the same job twice.
      const result = await post('/api/world-agent/messages', {
        ...identity,
        worldId,
        mode: 'invent',
        text: draft.trim(),
      });
      if (!result.ok && !result.jobId) throw new Error(result.message);
      setForm({ ...form, text: '', requestId: crypto.randomUUID() });
      setRefresh((value) => value + 1);
      if (!result.ok) setError(result.message);
    } catch (error) {
      setError(String(error));
    } finally {
      setPending(false);
    }
  }
  async function older() {
    try {
      const result = await post<InventionHistory>('/api/inventions/list', {
        worldId,
        before: next,
      });
      if (!result.ok) throw new Error(result.message);
      setRequests((current) => [
        ...current,
        ...result.requests.filter((entry) => !current.some((old) => old.id === entry.id)),
      ]);
      setNext(result.next);
    } catch (error) {
      setError(String(error));
    }
  }
  return (
    <div className="ol-inventions">
      <p>
        Describe one physical sling, bow or arrow and its materials. This requests a new technique;
        crafting still consumes materials and time.
      </p>
      <label>
        Invention request
        <textarea
          rows={4}
          aria-label="Invention request"
          value={draft}
          maxLength={2000}
          disabled={pending}
          onChange={(event) => {
            setForm({ ...form, text: event.target.value, requestId: crypto.randomUUID() });
          }}
        />
      </label>
      <Button onPress={() => void submit()} isDisabled={pending || !draft.trim()}>
        Request invention
      </Button>
      <Button variant="quiet" onPress={() => setRefresh((value) => value + 1)}>
        Refresh saved results
      </Button>
      {error && <p role="alert">{error}</p>}
      {requests.map((request) => (
        <article key={request.id}>
          <h3>{request.intent}</h3>
          <Tag>{active(request) ? request.status : request.code}</Tag>
          <p>{request.message}</p>
          {request.recipeId && (
            <p>
              {request.installed
                ? 'Available in Crafting.'
                : 'Historical result; this technique is not available in the current world.'}
            </p>
          )}
          {!request.currentTimeline && <p>Requested before the current save timeline.</p>}
          {request.candidate !== undefined && (
            <details>
              <summary>Inspect saved proposal</summary>
              <pre>{JSON.stringify(request.candidate, null, 2)}</pre>
            </details>
          )}
          {active(request) && (
            <Button
              size="sm"
              variant="quiet"
              onPress={async () => {
                try {
                  const result = await post('/api/ai/cancel', { jobId: request.id });
                  if (!result.ok) setError(result.message);
                  setRefresh((value) => value + 1);
                } catch (error) {
                  setError(String(error));
                }
              }}
            >
              Cancel request
            </Button>
          )}
        </article>
      ))}
      {!requests.length && <p>No saved invention requests for this character.</p>}
      {next && (
        <Button variant="quiet" onPress={() => void older()}>
          Older requests
        </Button>
      )}
    </div>
  );
}
