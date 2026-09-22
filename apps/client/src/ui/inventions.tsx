import { useLocal } from './storage';
import { useEffect, useRef, useState } from 'react';
import { Dialog, Modal, ModalOverlay } from 'react-aria-components';
import type {
  ActionOption,
  InventionContinuation,
  InventionHistory,
  InventionRequestView,
  RecipeView,
} from '@open-legend/protocol';
import { post } from '../api';
import { Button, Tag } from '../design-system/components';
import { Actions } from './panels';

const active = (request: InventionRequestView) =>
  ['queued', 'judging', 'generating'].includes(request.status);
type Draft = {
  text: string;
  requestId: string;
  conversationId: string;
  seedId: string;
  continuation?: InventionContinuation;
};
const merge = (current: InventionRequestView[], incoming: InventionRequestView[]) =>
  [...new Map([...current, ...incoming].map((entry) => [entry.id, entry])).values()].sort(
    (a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id),
  );
export function Inventions({
  worldId,
  seed,
  visible,
  recipes,
  command,
  connected,
}: {
  worldId: string;
  seed: { id: string; text: string } | null;
  visible: boolean;
  recipes: RecipeView[];
  command(action: ActionOption): void;
  connected: boolean;
}) {
  const [form, saveForm] = useLocal<Draft>(
    `open-legend:invention-draft:${worldId}`,
    {
      text: seed?.text ?? '',
      requestId: crypto.randomUUID(),
      conversationId: seed?.id ?? crypto.randomUUID(),
      seedId: seed?.id ?? '',
    },
    (value): value is Draft => {
      if (!value || typeof value !== 'object') return false;
      const fields = value as Record<string, unknown>;
      return (
        ['text', 'requestId', 'conversationId', 'seedId'].every(
          (key) => typeof fields[key] === 'string',
        ) &&
        (fields['continuation'] === undefined ||
          (!!fields['continuation'] &&
            typeof fields['continuation'] === 'object' &&
            typeof (fields['continuation'] as InventionContinuation).parentId === 'string' &&
            ['clarify', 'revise', 'search', 'new', 'modify', 'reuse'].includes(
              (fields['continuation'] as InventionContinuation).action,
            )))
      );
    },
  );
  const formRef = useRef(form);
  function setForm(next: Draft) {
    formRef.current = next;
    saveForm(next);
  }
  const [requests, setRequests] = useState<InventionRequestView[]>([]);
  const [next, setNext] = useState<InventionHistory['next']>();
  const [pending, setPending] = useState(false),
    [error, setError] = useState('');
  const sending = useRef(false),
    paged = useRef(false);
  const [refresh, setRefresh] = useState(0);
  const [choiceId, setChoiceId] = useState<string>();
  const dismissed = useRef(new Set<string>());
  const composer = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (seed && seed.id !== formRef.current.seedId)
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
      let delay = 15000;
      try {
        const result = await post<InventionHistory>('/api/inventions/list', { worldId });
        if (disposed) return;
        if (!result.ok) throw new Error(result.message);
        if (result.requests.some(active)) delay = 2000;
        setRequests((current) => merge(current, result.requests));
        if (!paged.current) setNext(result.next);
        const waiting = result.requests.find(
          (request) =>
            request.currentTimeline &&
            !request.continuedBy &&
            request.search &&
            !dismissed.current.has(request.id),
        );
        if (waiting) setChoiceId(waiting.id);
      } catch (error) {
        if (!disposed) setError(String(error));
      } finally {
        if (!disposed) timer = setTimeout(() => void load(), delay);
      }
    }
    void load();
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [worldId, visible, refresh]);
  async function submit(submission = formRef.current) {
    if (sending.current || !submission.text.trim()) return;
    sending.current = true;
    setPending(true);
    setError('');
    try {
      const result = await post('/api/world-agent/messages', {
        requestId: submission.requestId,
        conversationId: submission.conversationId,
        continuation: submission.continuation,
        worldId,
        mode: 'invent',
        text: submission.text.trim(),
      });
      if (!result.ok && !result.jobId) throw new Error(result.message);
      // A late response may clear only the submitted draft, never a newly opened request.
      if (formRef.current.requestId === submission.requestId)
        setForm({
          ...formRef.current,
          text: '',
          continuation: undefined,
          requestId: crypto.randomUUID(),
        });
      if (submission.continuation) dismissed.current.add(submission.continuation.parentId);
      setChoiceId(undefined);
      setRefresh((value) => value + 1);
      if (!result.ok) setError(result.message);
    } catch (error) {
      setError(String(error));
    } finally {
      sending.current = false;
      setPending(false);
    }
  }
  function follow(
    request: InventionRequestView,
    action: InventionContinuation['action'],
    recipeId?: string,
  ) {
    if (sending.current) return;
    const continuation = { parentId: request.id, action, ...(recipeId ? { recipeId } : {}) };
    const prior = formRef.current;
    const same = JSON.stringify(prior.continuation) === JSON.stringify(continuation);
    const draft: Draft = {
      ...prior,
      text: same && prior.text ? prior.text : request.intent,
      requestId: same ? prior.requestId : crypto.randomUUID(),
      conversationId: request.conversationId!,
      continuation,
    };
    setForm(draft);
    dismissed.current.add(request.id);
    setChoiceId(undefined);
    if (['reuse', 'new', 'search'].includes(action)) void submit(draft);
    else {
      composer.current?.focus();
      composer.current?.scrollIntoView({ block: 'nearest' });
    }
  }
  async function older() {
    try {
      const result = await post<InventionHistory>('/api/inventions/list', {
        worldId,
        before: next,
      });
      if (!result.ok) throw new Error(result.message);
      paged.current = true;
      setRequests((current) => merge(current, result.requests));
      setNext(result.next);
    } catch (error) {
      setError(String(error));
    }
  }
  const choice = requests.find(
    (request) => request.id === choiceId && !request.continuedBy && request.currentTimeline,
  );
  return (
    <div className="ol-inventions">
      <p>
        Describe one physical sling, bow or arrow and its materials. Inventing makes a technique
        available; crafting still consumes materials and time.
      </p>
      {form.continuation && (
        <p>
          Follow-up:{' '}
          {form.continuation.action === 'modify'
            ? 'describe the changes to the selected technique'
            : 'revise the purpose and method below'}
          . The earlier proposal stays saved.
        </p>
      )}
      <label>
        Invention request
        <textarea
          ref={composer}
          rows={4}
          aria-label="Invention request"
          value={form.text}
          maxLength={2000}
          disabled={pending}
          onChange={(event) =>
            setForm({
              ...formRef.current,
              text: event.target.value,
              requestId: crypto.randomUUID(),
            })
          }
        />
      </label>
      <Button onPress={() => void submit()} isDisabled={pending || !form.text.trim()}>
        {form.continuation ? 'Send follow-up' : 'Request invention'}
      </Button>
      {form.continuation && (
        <Button
          variant="quiet"
          isDisabled={pending}
          onPress={() =>
            setForm({
              ...form,
              text: '',
              continuation: undefined,
              requestId: crypto.randomUUID(),
              conversationId: crypto.randomUUID(),
            })
          }
        >
          Start a separate invention
        </Button>
      )}
      <Button variant="quiet" onPress={() => setRefresh((value) => value + 1)}>
        Refresh saved results
      </Button>
      {error && <p role="alert">{error}</p>}
      {requests.map((request) => {
        const recipe = request.installed
          ? recipes.find((entry) => entry.id === request.recipeId)
          : undefined;
        return (
          <article key={request.id} id={`invention-${request.id}`}>
            <h3>{request.intent}</h3>
            <Tag>{active(request) ? request.status : request.code}</Tag>
            {request.parentId && (
              <p className="ol-caption">
                Saved follow-up in this invention.{' '}
                {requests.some((entry) => entry.id === request.parentId) && (
                  <a href={`#invention-${request.parentId}`}>Earlier request and feedback</a>
                )}
              </p>
            )}
            <p>{request.message}</p>
            {request.recipeId && (
              <p>
                {request.installed
                  ? 'Available in Crafting.'
                  : 'Historical result; this technique is not available in the current world.'}
              </p>
            )}
            {recipe && (
              <>
                <h4>{recipe.name}</h4>
                <p>
                  {recipe.ingredients
                    .map((input) => `${input.quantity} ${input.name} (${input.available} held)`)
                    .join(' · ')}{' '}
                  · {recipe.workSeconds} game seconds
                </p>
                <Actions actions={recipe.actions} command={command} connected={connected} />
              </>
            )}
            {!request.currentTimeline && <p>Requested before the current save timeline.</p>}
            {request.candidate !== undefined && (
              <details>
                <summary>Inspect saved proposal</summary>
                <pre>{JSON.stringify(request.candidate, null, 2)}</pre>
              </details>
            )}
            {request.continuedBy ? (
              <p className="ol-caption">Continued in a later saved request.</p>
            ) : (
              !active(request) &&
              request.currentTimeline &&
              request.conversationId && (
                <>
                  {request.search && (
                    <Button size="sm" isDisabled={pending} onPress={() => setChoiceId(request.id)}>
                      Review choices
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="quiet"
                    isDisabled={pending}
                    onPress={() =>
                      follow(request, request.code === 'needs-clarification' ? 'clarify' : 'revise')
                    }
                  >
                    {request.code === 'needs-clarification'
                      ? 'Answer clarification'
                      : 'Revise request'}
                  </Button>
                </>
              )
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
        );
      })}
      {!requests.length && <p>No saved invention requests for this character.</p>}
      {next && (
        <Button variant="quiet" onPress={() => void older()}>
          Older requests
        </Button>
      )}
      {visible && choice?.search && (
        <ModalOverlay
          className="ol-root ol-modal-overlay"
          isOpen
          isDismissable={!pending}
          onOpenChange={(open) => {
            if (!open) {
              dismissed.current.add(choice.id);
              setChoiceId(undefined);
            }
          }}
        >
          <Modal className="ol-modal">
            <Dialog className="ol-person-dialog" aria-label="Similar inventions">
              <h2>Similar inventions</h2>
              <p>{choice.intent}</p>
              <p>{choice.search.message}</p>
              {choice.search.matches.map((match) => (
                <article key={match.recipeId}>
                  <h3>{match.name}</h3>
                  <p>{match.description}</p>
                  <p>{match.behavior}</p>
                  <p>{match.materials}</p>
                  <details>
                    <summary>Search details</summary>
                    <p>
                      Version {match.version} · similarity {match.score?.toFixed(3)}. Similarity is
                      not proof of equivalent mechanics.
                    </p>
                  </details>
                  <Button
                    isDisabled={pending}
                    onPress={() => follow(choice, 'reuse', match.recipeId)}
                  >
                    Use existing
                  </Button>
                  <Button
                    variant="quiet"
                    isDisabled={pending}
                    onPress={() => follow(choice, 'modify', match.recipeId)}
                  >
                    Modify existing
                  </Button>
                </article>
              ))}
              {choice.search.status === 'unavailable' && (
                <Button isDisabled={pending} onPress={() => follow(choice, 'search')}>
                  Retry search
                </Button>
              )}
              <Button isDisabled={pending} onPress={() => follow(choice, 'new')}>
                {choice.search.status === 'unavailable' ? 'Continue without search' : 'Invent new'}
              </Button>
              <Button
                variant="quiet"
                isDisabled={pending}
                onPress={() => {
                  dismissed.current.add(choice.id);
                  setChoiceId(undefined);
                }}
              >
                Cancel
              </Button>
            </Dialog>
          </Modal>
        </ModalOverlay>
      )}
    </div>
  );
}
