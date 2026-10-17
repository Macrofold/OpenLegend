import { formatDisplayNumber } from '@open-legend/language';
import { LoadingDialog, LoadingIndicator } from '../design-system/loading';
import { useLocal } from './storage';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Modal, ModalOverlay } from 'react-aria-components';
import type {
  ActionOption,
  ApiResult,
  InventionContinuation,
  InventionHistory,
  InventionRequestView,
  RecipeView,
  RequestRecoveryResult,
} from '@open-legend/protocol';
import { post } from '../api';
import { Button, Explanation, Icon, Tag } from '../design-system/components';
import './inventions.css';
import { RecipeDetails } from './recipe-details';
import {
  readRetainedRequest,
  retainRequest,
  releaseRequest,
  type RetainedRequest,
} from '../retained-request';

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
function validDraft(value: unknown): value is Draft {
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
}
// Bound recovery parsing while allowing JSON escaping of the full UI
// 12,000-character proposal, 2,000-character request and identities.
const recoveryCharacters = 128 * 1024;
const definiteRefusals = new Set([
  'invalid',
  'invalid-input',
  'invalid-declaration',
  'stale',
  'continuation-limit',
  'paused',
  'actor',
  'unconfigured',
  'busy',
  'invention-authority',
  'invention-locked',
  'invention-revoked',
]);
const merge = (current: InventionRequestView[], incoming: InventionRequestView[]) =>
  [...new Map([...current, ...incoming].map((entry) => [entry.id, entry])).values()].sort(
    (a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id),
  );
export function Inventions({
  worldId,
  accessScope,
  requestScope,
  timeline,
  seed,
  visible,
  recipes,
  command,
  connected,
  allowance,
}: {
  worldId: string;
  accessScope: string;
  requestScope: string;
  timeline?: string;
  seed: { id: string; text: string } | null;
  visible: boolean;
  recipes: RecipeView[];
  command(action: ActionOption): void;
  connected: boolean;
  allowance?: ReactNode;
}) {
  const [initialDraft] = useState<Draft>(() => ({
    text: seed?.text ?? '',
    requestId: crypto.randomUUID(),
    conversationId: seed?.id ?? crypto.randomUUID(),
    seedId: seed?.id ?? '',
  }));
  const [form, saveForm] = useLocal<Draft>(
    `open-legend:invention-draft:${JSON.stringify([worldId, accessScope, timeline])}`,
    initialDraft,
    validDraft,
  );
  const recoveryKey = timeline
    ? `open-legend:invention-request:${JSON.stringify([worldId, accessScope, timeline])}`
    : undefined;
  const [retained, setRetained] = useState<RetainedRequest<Draft>>(() =>
    readRetainedRequest(recoveryKey, validDraft, recoveryCharacters),
  );
  const retainedRef = useRef(retained);
  function remember(value: RetainedRequest<Draft>) {
    retainedRef.current = value;
    setRetained(value);
  }
  const [checking, setChecking] = useState(false);
  const checkingRef = useRef(false);
  const [retryAllowed, setRetryAllowed] = useState(false);
  const attempt = useRef(0);
  const currentScope = useRef(requestScope);
  currentScope.current = requestScope;
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const formRef = useRef(form);
  function setForm(next: Draft) {
    formRef.current = next;
    saveForm(next);
  }
  const [requests, setRequests] = useState<InventionRequestView[]>([]);
  const [historyRead, setHistoryRead] = useState(false);
  const [view, setView] = useState<'idea' | 'recipes' | 'history'>('idea');
  const [recipeQuery, setRecipeQuery] = useState('');
  const focusIdea = useRef(false);
  const [next, setNext] = useState<InventionHistory['next']>();
  const [pending, setPending] = useState(false),
    [error, setError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [olderBusy, setOlderBusy] = useState(false);
  const loadOlder = useRef<((before: NonNullable<InventionHistory['next']>) => void) | undefined>(
    undefined,
  );
  const sending = useRef(false),
    paged = useRef(false);
  const [refresh, setRefresh] = useState(0);
  const [catalogue, setCatalogue] =
    useState<Array<{ id: string; description: string; limitation: string }>>();
  const [choiceId, setChoiceId] = useState<string>();
  const dismissed = useRef(new Set<string>());
  const composer = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    // Renewed control preserves the original request; obsolete waits cannot
    // clear it or block its independent read-only receipt check.
    attempt.current++;
    sending.current = false;
    checkingRef.current = false;
    setPending(false);
    setChecking(false);
    setRetryAllowed(false);
  }, [requestScope]);
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
    if (!visible || !connected) return;
    let disposed = false;
    let currentRead: { abort: AbortController; older: boolean } | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function load(before?: InventionHistory['next']) {
      if (disposed || currentRead?.older || (currentRead && !before)) return;
      // Both entry points share one read owner: a historical page supersedes
      // an in-flight head read, whose older snapshot must not overwrite it.
      currentRead?.abort.abort();
      clearTimeout(timer);
      const read = { abort: new AbortController(), older: !!before };
      currentRead = read;
      if (read.older) setOlderBusy(true);
      const current = () => !disposed && currentRead === read;
      let delay = 15000;
      try {
        const result = await post<InventionHistory>(
          '/api/inventions/list',
          { worldId, ...(before ? { before } : {}) },
          AbortSignal.any([read.abort.signal, AbortSignal.timeout(15000)]),
        );
        if (!current()) return;
        if (!result.ok) throw new Error(result.message);
        if (result.requests.some(active)) delay = 2000;
        setRequests((current) => merge(current, result.requests));
        setHistoryRead(true);
        setHistoryError('');
        if (before) paged.current = true;
        if (before || !paged.current) setNext(result.next);
        const waiting = result.requests.find(
          (request) =>
            request.currentTimeline &&
            !request.continuedBy &&
            request.search &&
            !dismissed.current.has(request.id),
        );
        if (waiting) setChoiceId(waiting.id);
      } catch (error) {
        if (current()) setHistoryError(String(error));
      } finally {
        if (current()) {
          currentRead = undefined;
          if (read.older) setOlderBusy(false);
          timer = setTimeout(() => void load(), delay);
        }
      }
    }
    loadOlder.current = (before) => void load(before);
    void load();
    return () => {
      disposed = true;
      currentRead?.abort.abort();
      loadOlder.current = undefined;
      setOlderBusy(false);
      clearTimeout(timer);
    };
  }, [worldId, visible, connected, requestScope, refresh]);
  function settle(submission: Draft, result: ApiResult) {
    releaseRequest(recoveryKey, submission.requestId);
    remember({ status: 'empty' });
    attempt.current++;
    sending.current = false;
    setPending(false);
    setRetryAllowed(false);
    if (result.ok || result.jobId) {
      // Only this original draft can be cleared; later edits remain untouched.
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
    }
    setError(result.ok ? '' : result.message);
  }
  async function checkOriginal() {
    if (!connected || checkingRef.current) return;
    const original = readRetainedRequest(recoveryKey, validDraft, recoveryCharacters);
    remember(original);
    if (original.status !== 'pending' || !timeline) return;
    checkingRef.current = true;
    setChecking(true);
    const current = () =>
      alive.current &&
      currentScope.current === requestScope &&
      retainedRef.current.status === 'pending' &&
      retainedRef.current.request.requestId === original.request.requestId;
    try {
      const result = await post<RequestRecoveryResult>(
        '/api/inventions/receipt',
        {
          requestId: original.request.requestId,
          timeline,
        },
        AbortSignal.timeout(15000),
      );
      if (!current()) return;
      if (!result.ok) throw new Error(result.message);
      if (result.scope !== requestScope) return;
      if (result.status === 'resolved') settle(original.request, result.result);
      else {
        setError(result.message);
        setRetryAllowed(result.status === 'unknown');
      }
    } catch (reason) {
      if (current()) setError(String(reason));
    } finally {
      if (alive.current && currentScope.current === requestScope) {
        checkingRef.current = false;
        setChecking(false);
      }
    }
  }
  async function submit(submission = formRef.current, retry = false) {
    if (!connected || sending.current || !submission.text.trim()) return;
    const original = readRetainedRequest(recoveryKey, validDraft, recoveryCharacters);
    remember(original);
    if (
      retry
        ? original.status !== 'pending' || original.request.requestId !== submission.requestId
        : original.status !== 'empty'
    )
      return;
    sending.current = true;
    const submittedAttempt = ++attempt.current;
    const current = () =>
      alive.current &&
      currentScope.current === requestScope &&
      submittedAttempt === attempt.current;
    setPending(true);
    setRetryAllowed(false);
    setError('');
    try {
      // Parse before retention: a local JSON error cannot have submitted work.
      const candidate = submission.candidateJson?.trim()
        ? JSON.parse(submission.candidateJson)
        : undefined;
      if (!retry) {
        retainRequest(recoveryKey, submission, recoveryCharacters);
        remember({ status: 'pending', request: submission });
      }
      const result = await post(
        '/api/world-agent/messages',
        {
          requestId: submission.requestId,
          conversationId: submission.conversationId,
          continuation: submission.continuation,
          worldId,
          mode: submission.mode ?? 'invent',
          text: submission.text.trim(),
          ...(candidate !== undefined ? { candidate } : {}),
        },
        AbortSignal.timeout(15000),
      );
      if (!current()) return;
      if (result.ok || result.jobId || definiteRefusals.has(result.code))
        settle(submission, result);
      else throw new Error(result.message);
    } catch (error) {
      if (current()) {
        remember(readRetainedRequest(recoveryKey, validDraft, recoveryCharacters));
        setError(String(error));
      }
    } finally {
      if (current()) {
        sending.current = false;
        setPending(false);
      }
    }
  }
  function follow(
    request: InventionRequestView,
    action: InventionContinuation['action'],
    recipeId?: string,
  ) {
    if (!connected || sending.current || retainedRef.current.status !== 'empty') return;
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
  function older() {
    if (connected && visible && next) loadOlder.current?.(next);
  }
  const choice = requests.find(
    (request) => request.id === choiceId && !request.continuedBy && request.currentTimeline,
  );
  const matchingRecipes = useMemo(() => {
    const terms = recipeQuery.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return recipes;
    return recipes.filter((recipe) => {
      const text = `${recipe.name} ${recipe.description} ${recipe.output.name}`.toLocaleLowerCase();
      return terms.every((term) => text.includes(term));
    });
  }, [recipes, recipeQuery]);
  const recipeById = useMemo(
    () => new Map(recipes.map((recipe) => [recipe.id, recipe])),
    [recipes],
  );
  const requestIds = useMemo(() => new Set(requests.map((request) => request.id)), [requests]);
  const blocked = pending || retained.status !== 'empty';
  return (
    <div className="ol-inventions ol-player-workshop">
      <nav className="ol-creator-views" aria-label="Create views">
        <Button variant="quiet" aria-pressed={view === 'idea'} onPress={() => setView('idea')}>
          Invent
        </Button>
        <Button
          variant="quiet"
          aria-pressed={view === 'recipes'}
          onPress={() => setView('recipes')}
        >
          Recipes <span className="ol-caption">{recipes.length}</span>
        </Button>
        <Button
          variant="quiet"
          aria-pressed={view === 'history'}
          onPress={() => setView('history')}
        >
          Requests
        </Button>
      </nav>
      {error && <p role="alert">{error}</p>}
      <LoadingIndicator active={pending} label="Sending original invention" />
      {retained.status !== 'empty' && !pending && (
        <div className="ol-notice" role="status">
          <strong>Original invention request</strong>
          {retained.status === 'pending' ? (
            <>
              <p>{retained.request.text}</p>
              <p>
                Your draft can change. Check the original result before sending another invention.
              </p>
              <Button
                variant="quiet"
                disabled={!connected}
                busy={checking}
                onPress={() => void checkOriginal()}
              >
                Check original invention
              </Button>
              {retryAllowed && (
                <Button
                  variant="quiet"
                  disabled={!connected || pending || checking}
                  onPress={() => void submit(retained.request, true)}
                >
                  Resubmit the same invention
                </Button>
              )}
            </>
          ) : (
            <>
              <p>
                This browser could not read the original request. Restore storage access before
                sending another invention.
              </p>
              <Button
                variant="quiet"
                disabled={!connected || checking}
                onPress={() => void checkOriginal()}
              >
                Read retained request
              </Button>
            </>
          )}
        </div>
      )}
      <section hidden={view !== 'recipes'} className="ol-creator-page" aria-label="Learned recipes">
        <label className="ol-invention-search">
          <span>Find a recipe</span>
          <input
            type="search"
            placeholder="Search recipes…"
            value={recipeQuery}
            onChange={(event) => setRecipeQuery(event.target.value)}
          />
        </label>
        {matchingRecipes.length ? (
          matchingRecipes.map((recipe) => (
            <LearnedRecipeCard
              key={recipe.id}
              recipe={recipe}
              command={command}
              connected={connected}
            />
          ))
        ) : (
          <p>
            {recipes.length
              ? 'No recipes match your search.'
              : 'You have not learned a recipe yet.'}
          </p>
        )}
      </section>
      <section
        hidden={view !== 'idea'}
        className="ol-creator-page"
        aria-label="Develop an invention"
      >
        {allowance}
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
          Save a proposal to review before learning
        </label>
        <p className="ol-caption">
          {form.mode === 'workshop'
            ? 'Review the proposed recipe before choosing to learn it.'
            : 'You can learn a supported recipe. Making the item still takes materials and time.'}
        </p>
        <Button
          variant="primary"
          onPress={() => void submit()}
          isDisabled={!connected || blocked || !form.text.trim()}
        >
          {form.continuation
            ? 'Send follow-up'
            : form.mode === 'workshop'
              ? 'Prepare a proposal'
              : 'Request invention'}
        </Button>
        {form.continuation && (
          <Button
            variant="quiet"
            isDisabled={!connected || pending}
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
          What can I invent?
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
        {historyError && <p role="alert">{historyError}</p>}
        <p className="ol-caption">
          Read the result, revise the idea, or apply a saved proposal. Opening a result does not
          repeat its request.
        </p>
        <Button variant="quiet" onPress={() => setRefresh((value) => value + 1)}>
          Refresh saved results
        </Button>
        {requests.map((request) => {
          const recipe =
            request.installed && request.recipeId ? recipeById.get(request.recipeId) : undefined;
          return (
            <article
              className="ol-invention-request"
              key={request.id}
              id={`invention-${request.id}`}
            >
              <h3 className="ol-invention-intent">{request.intent}</h3>
              <Tag>{requestLabel(request)}</Tag>
              {request.parentId && (
                <p className="ol-caption">
                  Saved follow-up in this invention.{' '}
                  {requestIds.has(request.parentId) && (
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
                <LearnedRecipeCard recipe={recipe} command={command} connected={connected} />
              )}
              {!request.currentTimeline && <p>Requested before the current save timeline.</p>}
              <RequestDetails request={request} />
              <div className="ol-invention-actions">
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
                          variant="primary"
                          isDisabled={!connected || blocked}
                          onPress={() => follow(request, 'apply')}
                        >
                          Apply saved proposal
                        </Button>
                      )}
                      {request.search && (
                        <Button
                          size="sm"
                          isDisabled={!connected || blocked}
                          onPress={() => setChoiceId(request.id)}
                        >
                          Review choices
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="quiet"
                        isDisabled={!connected || blocked}
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
              </div>
            </article>
          );
        })}
        {!requests.length && (
          <p role={!historyRead ? 'status' : undefined}>
            {historyRead ? (
              'No saved invention requests yet.'
            ) : historyError ? (
              'Saved requests could not be read.'
            ) : (
              <LoadingIndicator active label="Loading saved invention requests" />
            )}
          </p>
        )}
        {next && (
          <Button
            variant="quiet"
            busy={olderBusy}
            disabled={!connected}
            onPress={() => void older()}
          >
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
            <LoadingDialog className="ol-invention-choice" aria-label="Similar inventions">
              <header className="ol-modal-head">
                <h2>Similar inventions</h2>
              </header>
              <div className="ol-invention-choice-body">
                <p className="ol-invention-choice-intent">{choice.intent}</p>
                {choice.search.status === 'unavailable' ? (
                  <>
                    <p>
                      Similar recipes could not be checked. Retry the search, or continue with a new
                      invention.
                    </p>
                    <details>
                      <summary>Search details</summary>
                      <p>{choice.search.message}</p>
                    </details>
                  </>
                ) : (
                  <p>{choice.search.message}</p>
                )}
                {choice.search.matches.map((match) => (
                  <article className="ol-invention-match" key={match.recipeId}>
                    <h3>{match.name}</h3>
                    <p>{match.description}</p>
                    <p>{match.materials}</p>
                    <details>
                      <summary>Recipe and search details</summary>
                      <p>{match.behavior}</p>
                      <p>
                        Version {match.version}. Similarity{' '}
                        {match.score === undefined
                          ? 'unavailable'
                          : formatDisplayNumber(match.score)}
                        . Similarity does not establish equivalent behavior.
                      </p>
                    </details>
                    <div className="ol-invention-actions">
                      <Button
                        isDisabled={!connected || blocked}
                        onPress={() => follow(choice, 'reuse', match.recipeId)}
                      >
                        Use this recipe
                      </Button>
                      <Button
                        variant="quiet"
                        isDisabled={!connected || blocked}
                        onPress={() => follow(choice, 'modify', match.recipeId)}
                      >
                        Modify this recipe
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
              <footer className="ol-modal-actions ol-invention-actions">
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
                {choice.search.status === 'unavailable' && (
                  <Button
                    variant="secondary"
                    isDisabled={!connected || blocked}
                    onPress={() => follow(choice, 'search')}
                  >
                    Retry search
                  </Button>
                )}
                <Button
                  variant="primary"
                  isDisabled={!connected || blocked}
                  onPress={() => follow(choice, 'new')}
                >
                  {choice.search.status === 'unavailable'
                    ? 'Continue without search'
                    : 'Invent something new'}
                </Button>
              </footer>
            </LoadingDialog>
          </Modal>
        </ModalOverlay>
      )}
    </div>
  );
}

function requestLabel(request: InventionRequestView) {
  if (request.installed) return 'Recipe learned';
  if (request.continuedBy) return 'Continued';
  if (request.status === 'queued') return 'Waiting';
  if (request.status === 'judging') return 'Checking your idea';
  if (request.status === 'generating') return 'Developing your idea';
  if (request.code === 'needs-clarification') return 'Needs your answer';
  if (request.code === 'draft-ready') return 'Ready to review';
  if (request.search)
    return request.search.status === 'unavailable' ? 'Search unavailable' : 'Choose a recipe';
  if (request.status === 'failed') return 'Could not finish';
  if (request.status === 'cancelled') return 'Cancelled';
  return 'Saved result';
}

function RequestDetails({ request }: { request: InventionRequestView }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="ol-invention-details"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>Request details</summary>
      {open && (
        <div>
          <p>{request.intent}</p>
          <p className="ol-caption">Result: {request.code}</p>
          {request.validation && (
            <section>
              <h4>Recipe checks</h4>
              {request.validation.summary && <p>{request.validation.summary}</p>}
              {request.validation.errors.map((error, index) => (
                <p key={index}>{error}</p>
              ))}
              <p>
                Definitions:{' '}
                {request.validation.dependencies
                  .map((entry) => `${entry.id} v${entry.version} (${entry.role})`)
                  .join(', ') || 'None resolved.'}
              </p>
              {request.validation.limits.map((limit, index) => (
                <p key={index}>{limit}</p>
              ))}
            </section>
          )}
          {request.candidate !== undefined && (
            <details>
              <summary>Saved proposal data</summary>
              <pre>{JSON.stringify(request.candidate, null, 2)}</pre>
            </details>
          )}
        </div>
      )}
    </details>
  );
}

/** Compact knowledge summaries defer detail rendering without changing native actions. */
function LearnedRecipeCard({
  recipe,
  command,
  connected,
}: {
  recipe: RecipeView;
  command(action: ActionOption): void;
  connected: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const missingMaterials = recipe.ingredients.some(
    (ingredient) =>
      Number.isFinite(ingredient.available) && ingredient.available < ingredient.quantity,
  );
  const reasons = [
    ...new Set(
      recipe.actions.flatMap((action) => (!action.enabled && action.reason ? [action.reason] : [])),
    ),
  ];
  return (
    <article className="ol-learned-recipe">
      <header>
        <div className="ol-recipe-heading">
          <Icon name="ui.crafting" size={24} />
          <h4>{recipe.name}</h4>
        </div>
        <div className="ol-invention-actions">
          {recipe.actions.map((action) => (
            <Explanation
              key={action.id}
              title={action.label}
              text={
                [!action.enabled && action.reason, action.detail].filter(Boolean).join('\n') ||
                action.label
              }
              facts={action.facts}
            >
              <Button
                size="sm"
                disabled={!action.enabled || !connected}
                onPress={() => command(action)}
              >
                {action.label}
              </Button>
            </Explanation>
          ))}
        </div>
      </header>
      <p className="ol-caption ol-recipe-material-summary">
        {recipe.ingredients.map((ingredient, index) => (
          <span key={`${ingredient.role}:${index}`}>
            {ingredient.quantity} {ingredient.name}
            {Number.isFinite(ingredient.available) &&
              ingredient.available < ingredient.quantity && (
                <strong> (need {ingredient.quantity - ingredient.available} more)</strong>
              )}
            {index < recipe.ingredients.length - 1 && ', '}
          </span>
        ))}
        {recipe.ingredients.length > 0 && '; '}
        {formatDisplayNumber(recipe.workSeconds)} game seconds
      </p>
      {!missingMaterials &&
        reasons.map((reason) => (
          <p className="ol-caption" key={reason}>
            {reason}
          </p>
        ))}
      <details onToggle={(event) => setExpanded(event.currentTarget.open)}>
        <summary>Recipe details</summary>
        {expanded && (
          <>
            <RecipeDetails recipe={recipe} />
            {missingMaterials && reasons.map((reason) => <p key={reason}>{reason}</p>)}
          </>
        )}
      </details>
    </article>
  );
}
