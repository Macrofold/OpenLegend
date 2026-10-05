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
import { RecipeDetails } from './recipe-details';

const active = (request: InventionRequestView) =>
  ['queued', 'judging', 'generating'].includes(request.status);
type Draft = {
  mode?: 'workshop';
  candidateJson?: string;
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
  accessScope,
  seed,
  visible,
  recipes,
  command,
  connected,
}: {
  worldId: string;
  accessScope: string;
  seed: { id: string; text: string } | null;
  visible: boolean;
  recipes: RecipeView[];
  command(action: ActionOption): void;
  connected: boolean;
}) {
  const [form, saveForm] = useLocal<Draft>(
    `open-legend:invention-draft:${worldId}:${accessScope}`,
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
        (fields['mode'] === undefined || fields['mode'] === 'workshop') &&
        (fields['candidateJson'] === undefined || typeof fields['candidateJson'] === 'string') &&
        (fields['continuation'] === undefined ||
          (!!fields['continuation'] &&
            typeof fields['continuation'] === 'object' &&
            typeof (fields['continuation'] as InventionContinuation).parentId === 'string' &&
            ['clarify', 'revise', 'search', 'new', 'modify', 'reuse', 'apply'].includes(
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
  const [view, setView] = useState<'idea' | 'recipes' | 'history'>('idea');
  const focusIdea = useRef(false);
  const [next, setNext] = useState<InventionHistory['next']>();
  const [pending, setPending] = useState(false),
    [error, setError] = useState('');
  const sending = useRef(false),
    paged = useRef(false);
  const [refresh, setRefresh] = useState(0);
  const [catalogue, setCatalogue] =
    useState<Array<{ id: string; description: string; limitation: string }>>();
  const [choiceId, setChoiceId] = useState<string>();
  const dismissed = useRef(new Set<string>());
  const composer = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (visible && view === 'idea' && focusIdea.current) {
      focusIdea.current = false;
      composer.current?.focus();
    }
  }, [view, visible]);
  useEffect(() => {
    if (seed && seed.id !== formRef.current.seedId) {
      setView('idea');
      setForm({
        text: seed.text,
        requestId: crypto.randomUUID(),
        conversationId: seed.id,
        seedId: seed.id,
      });
    }
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
        mode: submission.mode ?? 'invent',
        text: submission.text.trim(),
        ...(submission.candidateJson?.trim()
          ? { candidate: JSON.parse(submission.candidateJson) }
          : {}),
      });
      if (!result.ok && !result.jobId) throw new Error(result.message);
      // A late response may clear only the submitted draft, never a newly opened request.
      if (formRef.current.requestId === submission.requestId) {
        setForm({
          ...formRef.current,
          text: '',
          candidateJson: undefined,
          continuation: undefined,
          requestId: crypto.randomUUID(),
        });
        setView('history');
      }
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
    const continuation = {
      parentId: request.id,
      action,
      ...(recipeId ? { recipeId } : {}),
      ...(action === 'apply' ? { candidateDigest: request.candidateDigest } : {}),
    };
    const prior = formRef.current;
    const same = JSON.stringify(prior.continuation) === JSON.stringify(continuation);
    const draft: Draft = {
      ...prior,
      mode: action === 'apply' ? undefined : request.mode,
      candidateJson: action === 'apply' ? undefined : same ? prior.candidateJson : undefined,
      text: action === 'apply' ? request.intent : same && prior.text ? prior.text : request.intent,
      requestId: same ? prior.requestId : crypto.randomUUID(),
      conversationId: request.conversationId!,
      continuation,
    };
    setForm(draft);
    dismissed.current.add(request.id);
    setChoiceId(undefined);
    if (['reuse', 'new', 'search', 'apply'].includes(action)) void submit(draft);
    else {
      focusIdea.current = true;
      setView('idea');
      if (view === 'idea') {
        focusIdea.current = false;
        composer.current?.focus();
        composer.current?.scrollIntoView({ block: 'nearest' });
      }
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
    <div className="ol-inventions ol-player-workshop">
      <nav className="ol-creator-views" aria-label="Your workshop views">
        <Button variant="quiet" aria-pressed={view === 'idea'} onPress={() => setView('idea')}>
          New idea
        </Button>
        <Button
          variant="quiet"
          aria-pressed={view === 'recipes'}
          onPress={() => setView('recipes')}
        >
          Learned recipes · {recipes.length}
        </Button>
        <Button
          variant="quiet"
          aria-pressed={view === 'history'}
          onPress={() => setView('history')}
        >
          Saved requests
        </Button>
      </nav>
      {error && <p role="alert">{error}</p>}
      <section hidden={view !== 'recipes'} className="ol-creator-page" aria-label="Learned recipes">
        <h3>Learned recipes</h3>
        <p className="ol-caption">
          A learned technique is available to this character. Crafting still uses the required
          materials and time.
        </p>
        {recipes.length ? (
          recipes.map((recipe) => (
            <LearnedRecipeCard
              key={recipe.id}
              recipe={recipe}
              command={command}
              connected={connected}
            />
          ))
        ) : (
          <p>No recipes known by this character yet.</p>
        )}
      </section>
      <section
        hidden={view !== 'idea'}
        className="ol-creator-page"
        aria-label="Develop an invention"
      >
        {form.continuation && (
          <p>
            Follow-up:{' '}
            {form.continuation.action === 'modify'
              ? 'describe the changes to the selected technique'
              : 'revise the purpose and method'}
            . The earlier proposal stays saved.
          </p>
        )}
        <label>
          What would you like to make?
          <textarea
            ref={composer}
            rows={3}
            aria-label="Invention request"
            value={form.text}
            maxLength={2000}
            disabled={pending}
            placeholder="Describe what it should do and any materials you have in mind…"
            onChange={(event) =>
              setForm({
                ...formRef.current,
                text: event.target.value,
                requestId: crypto.randomUUID(),
              })
            }
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={form.mode === 'workshop'}
            disabled={pending || form.continuation?.action === 'apply'}
            onChange={(event) =>
              setForm({
                ...formRef.current,
                mode: event.target.checked ? 'workshop' : undefined,
                requestId: crypto.randomUUID(),
              })
            }
          />
          Review in workshop before installing
        </label>
        <p className="ol-caption">
          {form.mode === 'workshop'
            ? 'Keep a saved proposal for review. Apply installs it when you choose.'
            : 'A supported recipe may be learned from this request. Crafting comes later.'}
        </p>
        <Button
          variant="primary"
          onPress={() => void submit()}
          isDisabled={pending || !form.text.trim()}
        >
          {form.continuation
            ? 'Send follow-up'
            : form.mode === 'workshop'
              ? 'Prepare workshop draft'
              : 'Request invention'}
        </Button>
        {form.continuation && (
          <Button
            variant="quiet"
            isDisabled={pending}
            onPress={() =>
              setForm({
                ...form,
                text: '',
                candidateJson: undefined,
                continuation: undefined,
                requestId: crypto.randomUUID(),
                conversationId: crypto.randomUUID(),
              })
            }
          >
            Start a separate invention
          </Button>
        )}
        <Button
          size="sm"
          variant="quiet"
          onPress={async () => {
            try {
              const response = await post<{
                ok: boolean;
                message?: string;
                result: {
                  families: Array<{ id: string; description: string; limitation: string }>;
                };
              }>('/api/world-agent/tools', {
                worldId,
                tool: { operation: 'catalogue', recipeId: null, candidateJson: null, offset: 0 },
              });
              if (!response.ok) throw new Error(response.message);
              setCatalogue(response.result.families);
            } catch (error) {
              setError(String(error));
            }
          }}
        >
          What can I build?
        </Button>
        {catalogue && (
          <div>
            <p>You can currently make:</p>
            {catalogue.map((family) => (
              <p key={family.id}>
                <strong>{family.description}</strong> {family.limitation}
              </p>
            ))}
          </div>
        )}
        <details>
          <summary>Supply a complete proposal</summary>
          <p>
            A supplied proposal is validated exactly as written, without paid rewriting. Leave empty
            to describe an invention normally.
          </p>
          <textarea
            aria-label="Complete invention proposal JSON"
            rows={6}
            value={form.candidateJson ?? ''}
            disabled={pending}
            maxLength={12000}
            onChange={(event) =>
              setForm({
                ...formRef.current,
                candidateJson: event.target.value,
                requestId: crypto.randomUUID(),
              })
            }
          />
        </details>
      </section>
      <section
        hidden={view !== 'history'}
        className="ol-creator-page"
        aria-label="Saved invention requests"
      >
        <h3>Saved requests</h3>
        <p className="ol-caption">
          Read the result, revise the idea, or apply a saved proposal. Opening a result does not
          repeat its request.
        </p>
        <Button variant="quiet" onPress={() => setRefresh((value) => value + 1)}>
          Refresh saved results
        </Button>
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
              {request.validation && (
                <details>
                  <summary>Native checks and supported effects</summary>
                  <p>{request.validation.summary}</p>
                  {request.validation.errors.map((error, index) => (
                    <p key={index}>{error}</p>
                  ))}
                  <p>
                    Definition dependencies:{' '}
                    {request.validation.dependencies
                      .map((entry) => `${entry.id} v${entry.version} (${entry.role})`)
                      .join(' · ') || 'None resolved.'}
                  </p>
                  {request.validation.limits.map((limit, index) => (
                    <p key={index}>{limit}</p>
                  ))}
                </details>
              )}
              {request.recipeId && (
                <p>
                  {request.installed
                    ? 'Available in Crafting.'
                    : 'Historical result; this technique is not available in the current world.'}
                </p>
              )}
              {recipe && (
                <LearnedRecipeCard recipe={recipe} command={command} connected={connected} />
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
                    {request.code === 'draft-ready' && request.candidateDigest && (
                      <Button
                        size="sm"
                        isDisabled={pending}
                        onPress={() => follow(request, 'apply')}
                      >
                        Apply saved proposal
                      </Button>
                    )}
                    {request.search && (
                      <Button
                        size="sm"
                        isDisabled={pending}
                        onPress={() => setChoiceId(request.id)}
                      >
                        Review choices
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="quiet"
                      isDisabled={pending}
                      onPress={() =>
                        follow(
                          request,
                          request.code === 'needs-clarification' ? 'clarify' : 'revise',
                        )
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
      </section>
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

/** This surface uses only the actor's permitted recipe knowledge and ordinary native actions. */
function LearnedRecipeCard({
  recipe,
  command,
  connected,
}: {
  recipe: RecipeView;
  command(action: ActionOption): void;
  connected: boolean;
}) {
  return (
    <article className="ol-learned-recipe">
      <h4>{recipe.name}</h4>
      <RecipeDetails recipe={recipe} />
      <Actions actions={recipe.actions} command={command} connected={connected} />
    </article>
  );
}
