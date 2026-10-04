import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { ActivityHistory } from './activity-history';
import { Focusable, Tooltip, TooltipTrigger } from 'react-aria-components';
import type {
  AuthoredAppraisalRequest,
  GodMindView,
  IntelligenceCall,
  MindSubject,
  MindSubjectPage,
} from '@open-legend/protocol';
import { post } from '../api';
import { EventTime } from './event-time';
import { SubjectPicker, subjectPath } from './subject-picker';
import { MemoryHistory } from './memory-history';
import { Button, Icon, IconButton, Section, Tag } from '../design-system/components';
import './creator-workspaces.css';

type JsonObject = Record<string, unknown>;

function object(value: unknown): JsonObject | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonObject)
    : undefined;
}

function path(value: unknown, ...keys: string[]): unknown {
  let current = value;
  for (const key of keys) {
    current = object(current)?.[key];
    if (current === undefined) return undefined;
  }
  return current;
}

function textAt(value: unknown, ...keys: string[]): string | undefined {
  const found = path(value, ...keys);
  return typeof found === 'string' && found.trim() ? found : undefined;
}

function InlineJson({ title, value }: { title: string; value: unknown }) {
  const [copied, setCopied] = useState(false);
  return (
    <details>
      <summary>{title}</summary>
      <IconButton
        icon="ui.copy"
        label={copied ? 'Copied JSON' : 'Copy JSON'}
        onPress={() =>
          void navigator.clipboard
            .writeText(JSON.stringify(value, null, 2))
            .then(() => setCopied(true))
            .catch(() => setCopied(false))
        }
      />
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}

type SubjectDetails = NonNullable<MindSubjectPage['selected']>;

function KnowledgeEditor({
  mind,
  onSaved,
  owned = false,
  visible,
  readScope,
  onDirtyChange,
}: {
  owned?: boolean;
  visible: boolean;
  readScope?: string;
  mind: GodMindView;
  onSaved: (mind: GodMindView) => void;
  onDirtyChange(dirty: boolean): void;
}) {
  const [subject, setSubject] = useState<MindSubject | null>(null);
  // A subject's notes may lie on another notes page; load them by exact subject instead.
  const [details, setDetails] = useState<SubjectDetails | null | undefined>(null);
  const [reload, setReload] = useState(0);
  const general = mind.notepads?.find((doc) => doc.subjectId === null);
  const document = subject ? details?.notepad : general;
  const identity = subject ? details?.identity : undefined;
  const [text, setText] = useState(document?.text ?? '');
  const [name, setName] = useState(identity?.givenName ?? '');
  const [base, setBase] = useState(() => ({
    text: document?.text ?? '',
    name: identity?.givenName ?? '',
    revision: document?.revision ?? 0,
    nameRevision: identity?.revision ?? 0,
  }));
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  // The details refresh after a save; editing waits for the saved revisions.
  const [refreshing, setRefreshing] = useState(false);
  const loadedFor = useRef('');
  const dirty = text !== base.text || name !== base.name;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  useEffect(() => onDirtyChange(dirty || saving), [dirty, saving, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);
  // Only a different person or character clears the status; a refresh after saving keeps it.
  useEffect(() => setMessage(''), [subject?.id, mind.actorId, owned]);
  useEffect(() => {
    if (!visible) return;
    setFailed(false);
    if (!subject) {
      loadedFor.current = '';
      setRefreshing(false);
      return setDetails(null);
    }
    const key = JSON.stringify([mind.actorId, owned, subject.id]);
    // A refresh after saving keeps the saved text on screen until the fresh copy arrives.
    if (loadedFor.current !== key) setDetails(undefined);
    let active = true;
    void post<MindSubjectPage | { ok: false; message?: string }>(subjectPath(owned), {
      actorId: mind.actorId,
      subjectId: subject.id,
    })
      .then((result) => {
        if (!active) return;
        if (!result.ok) throw new Error(result.message ?? 'These notes are unavailable.');
        loadedFor.current = key;
        setRefreshing(false);
        setDetails(result.selected ?? null);
        if (result.selected) setSubject(result.selected.subject);
        else setMessage('This person is no longer available for notes.');
      })
      .catch((error) => {
        if (!active) return;
        loadedFor.current = '';
        setRefreshing(false);
        setDetails(null);
        setFailed(true);
        setMessage(error instanceof Error ? error.message : String(error));
      });
    return () => {
      active = false;
    };
  }, [subject?.id, mind.actorId, owned, reload, visible, readScope]);
  useEffect(() => {
    // A refreshed page cannot silently rebase an unsaved edit onto newer authority.
    if (dirtyRef.current || (subject && details === undefined)) return;
    const next = {
      text: document?.text ?? '',
      name: identity?.givenName ?? '',
      revision: document?.revision ?? 0,
      nameRevision: identity?.revision ?? 0,
    };
    setBase(next);
    setText(next.text);
    setName(next.name);
  }, [subject?.id, document?.revision, identity?.revision, details === undefined]);
  const loading = (!!subject && details === undefined) || refreshing;
  const unavailable = !!subject && details === null;
  const limit =
    document?.maxCharacters ?? mind.knowledgeLimits?.[subject ? 'subject' : 'general'] ?? 0;
  const characters = Array.from(text).length;
  const sourceChanged =
    dirty &&
    !loading &&
    !unavailable &&
    (base.revision !== (document?.revision ?? 0) ||
      base.nameRevision !== (identity?.revision ?? 0));
  return (
    <Section title="Knowledge notepads">
      <div className="ol-knowledge-editor">
        <p className="ol-caption">
          {owned ? 'Your character’s understanding' : `${mind.name}’s understanding`}. Editing these
          notes does not change the subject or establish an objective world fact.
        </p>
        <SubjectPicker
          actorId={mind.actorId}
          owned={owned}
          label="Person or general knowledge"
          none="General knowledge"
          value={subject}
          onSelect={(next) => {
            if (!dirty && !saving) setSubject(next);
          }}
          disabled={saving || dirty}
        />
        {dirty && (
          <p role="status" className="ol-caption">
            Unsaved notes. Save or discard before choosing another subject or page.
          </p>
        )}
        {sourceChanged && (
          <p role="status">
            Newer saved notes are available. Your edit is still based on revision {base.revision};
            discard it to load the newer copy, or keep it for comparison.
          </p>
        )}
        {sourceChanged && (
          <details>
            <summary>Compare with saved revision {document?.revision ?? 0}</summary>
            <p className="ol-prose">{document?.text || 'No saved note text.'}</p>
            {subject && <p>Saved known name: {identity?.givenName || 'Not named'}</p>}
            <Button
              variant="quiet"
              disabled={saving || loading}
              onPress={() => {
                setBase({
                  text: document?.text ?? '',
                  name: identity?.givenName ?? '',
                  revision: document?.revision ?? 0,
                  nameRevision: identity?.revision ?? 0,
                });
                setMessage(
                  'Your edit now starts from the displayed saved revision. Save remains separate.',
                );
              }}
            >
              Reapply my edit to this revision
            </Button>
          </details>
        )}
        {loading && <p role="status">Loading notes…</p>}
        {failed && (
          <Button
            size="sm"
            onPress={() => {
              setMessage('');
              setReload((value) => value + 1);
            }}
          >
            Retry loading notes
          </Button>
        )}
        {subject && !unavailable && (
          <label>
            Given name known by this observer
            <input
              disabled={saving || loading}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
        )}
        <label>
          Editable knowledge
          <textarea
            rows={8}
            disabled={saving || loading || unavailable}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </label>
        <p>
          {characters.toLocaleString()} / {limit.toLocaleString()} characters.{' '}
          {characters > limit
            ? 'Rewrite or shorten before saving.'
            : subject
              ? 'This is your understanding of this person; it does not change their view of you.'
              : 'Record current understanding; rewrite when space is needed.'}
        </p>
        <Button
          disabled={
            saving || loading || unavailable || !dirty || sourceChanged || characters > limit
          }
          onPress={() => {
            setSaving(true);
            setMessage('');
            void post<{ ok: boolean; message?: string; mind?: GodMindView }>(
              owned ? '/api/knowledge' : '/api/god/knowledge',
              {
                actorId: mind.actorId,
                worldId: mind.worldId,
                generation: mind.generation,
                subjectId: subject?.id ?? null,
                expectedRevision: base.revision,
                text,
                ...(subject && name.trim() && name !== base.name
                  ? { givenName: name, nameRevision: base.nameRevision }
                  : {}),
              },
            )
              .then((result) => {
                setMessage(result.message ?? '');
                if (result.ok) {
                  setBase((previous) => ({ ...previous, text, name }));
                }
                if (result.ok && result.mind) onSaved(result.mind);
                if (result.ok && subject) {
                  setRefreshing(true);
                  setReload((value) => value + 1);
                }
              })
              .catch((error) => setMessage(String(error)))
              .finally(() => setSaving(false));
          }}
        >
          Save knowledge
        </Button>
        {dirty && (
          <Button
            variant="quiet"
            disabled={saving || loading}
            onPress={() => {
              const next = unavailable
                ? base
                : {
                    text: document?.text ?? '',
                    name: identity?.givenName ?? '',
                    revision: document?.revision ?? 0,
                    nameRevision: identity?.revision ?? 0,
                  };
              setBase(next);
              setText(next.text);
              setName(next.name);
              setMessage('Local edits discarded.');
            }}
          >
            {sourceChanged ? 'Discard edit and load saved notes' : 'Discard note edits'}
          </Button>
        )}
        {message && <p role="status">{message}</p>}
      </div>
    </Section>
  );
}

function AuthoredFeeling({
  mind,
  busy,
  send,
}: {
  mind: GodMindView;
  busy: boolean;
  send: (change: AuthoredAppraisalRequest['change']) => void;
}) {
  const [policyId, setPolicyId] = useState(''),
    [subject, setSubject] = useState<MindSubject | null>(null);
  const policies = mind.continuity?.authoring?.policies ?? [];
  const policy = policies.find((value) => value.pin.id === policyId) ?? policies[0];
  if (!policy) return null;
  return (
    <div>
      <p className="ol-caption">
        Author a fictional feeling for this character. This does not add an experienced event.
      </p>
      <label>
        Feeling
        <select value={policy.pin.id} onChange={(event) => setPolicyId(event.target.value)}>
          {policies.map((value) => (
            <option key={value.pin.id} value={value.pin.id}>
              {value.label}
            </option>
          ))}
        </select>
      </label>
      {/* Feelings need a currently recognized subject; notes-only people stay visible but disabled. */}
      <SubjectPicker
        actorId={mind.actorId}
        owned={false}
        label="About"
        none="No particular person"
        value={subject}
        onSelect={setSubject}
        onlyRecognized
      />
      <Button
        disabled={busy}
        onPress={() =>
          send({ kind: 'create', definitionPin: policy.pin, targetId: subject?.id ?? null })
        }
      >
        Author feeling
      </Button>
    </div>
  );
}

export function Mind({
  actorId,
  owned = false,
  visible = true,
  readScope,
  onDirtyChange,
}: {
  actorId: string;
  owned?: boolean;
  visible?: boolean;
  readScope?: string;
  onDirtyChange?(dirty: boolean): void;
}) {
  const [mind, setMind] = useState<GodMindView | null>(null),
    [error, setError] = useState(''),
    [authoring, setAuthoring] = useState(false);
  const [knowledgeDirty, setKnowledgeDirty] = useState(false);
  const [refreshRevision, setRefreshRevision] = useState(0);
  useEffect(() => onDirtyChange?.(knowledgeDirty), [knowledgeDirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  const pending = useRef<{ body: string; request: AuthoredAppraisalRequest } | null>(null);
  const author = (change: AuthoredAppraisalRequest['change']) => {
    const epoch = mind?.continuity?.authoring?.epoch;
    if (!mind?.worldId || !mind.generation || !epoch || authoring) return;
    const body = JSON.stringify([mind.worldId, mind.generation, actorId, epoch, change]);
    const request =
      pending.current?.body === body
        ? pending.current.request
        : {
            id: crypto.randomUUID(),
            worldId: mind.worldId,
            generation: mind.generation,
            actorId,
            epoch,
            change,
          };
    pending.current = { body, request };
    setAuthoring(true);
    void post<{ ok: boolean; message?: string; mind?: GodMindView }>('/api/god/appraisal', request)
      .then((result) => {
        setError(result.ok ? '' : (result.message ?? 'Unable to author feeling.'));
        if (result.ok && result.mind) {
          pending.current = null;
          setMind(result.mind);
        }
      })
      .catch((error) => setError(String(error)))
      .finally(() => setAuthoring(false));
  };
  useEffect(() => {
    if (!visible) return;
    let active = true;
    void post<{ ok: boolean; message?: string; mind?: GodMindView }>(
      owned ? '/api/mind' : '/api/god/mind',
      { actorId },
    )
      .then((result) => {
        if (active) {
          setMind(result.ok ? (result.mind ?? null) : null);
          setError(result.ok ? '' : (result.message ?? 'Inspection unavailable.'));
        }
      })
      .catch((loadError) => {
        if (active) setError(String(loadError));
      });
    return () => {
      active = false;
    };
  }, [actorId, owned, visible, refreshRevision, readScope]);
  return (
    <div>
      {error && <p role="alert">{error}</p>}
      {mind ? (
        <>
          <header className="ol-creator-context">
            <Tag>{owned ? 'Private to your character' : 'God mode · Private inspection'}</Tag>
            <h3>{mind.name}’s private mind</h3>
            <p className="ol-caption">
              {owned
                ? 'Read your character’s beliefs, feelings and remembered experiences.'
                : 'You are inspecting this person as a creator. This does not reveal these facts to your character.'}
            </p>
            <Button
              size="sm"
              variant="quiet"
              disabled={authoring}
              onPress={() => setRefreshRevision((value) => value + 1)}
            >
              Refresh private mind
            </Button>
          </header>
          <Section title="About me">
            <p className="ol-prose">{mind.acceptedText}</p>
          </Section>
          {mind.documents.map((document) => (
            <details key={document.id}>
              <summary>{document.title}</summary>
              <p className="ol-prose">{document.text}</p>
            </details>
          ))}
          <Section title="Feelings">
            {mind.continuity?.appraisals.length ? (
              mind.continuity.appraisals.map((feeling) => (
                <div key={feeling.id}>
                  <p>
                    {feeling.label}
                    {feeling.subject ? ` · ${feeling.subject}` : ''}
                    {feeling.value !== null ? ` · ${Number(feeling.value.toFixed(3))}` : ''}
                  </p>
                  <p className="ol-caption">
                    {feeling.lifetime === 'persistent'
                      ? 'Persists until resolved'
                      : feeling.lifetime.replaceAll('-', ' ')}{' '}
                    · {feeling.coverage}
                  </p>
                  {mind.continuity?.authoring && (
                    <Button
                      disabled={authoring}
                      onPress={() =>
                        author({
                          kind: 'resolve',
                          id: feeling.id,
                          expectedRevision: feeling.revision,
                        })
                      }
                    >
                      Resolve {feeling.label}
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <p className="ol-meta">No current feelings on this page.</p>
            )}
          </Section>
          {mind.continuity?.authoring && (
            <AuthoredFeeling key={mind.actorId} mind={mind} busy={authoring} send={author} />
          )}
          <Section title="My understanding of people">
            {mind.notepads
              ?.filter((doc) => doc.subjectId && doc.text)
              .map((doc) => (
                <details key={doc.subjectId}>
                  <summary>{doc.label}</summary>
                  <p className="ol-prose">{doc.text}</p>
                  <p className="ol-caption">Edit this same text in Knowledge notepads below.</p>
                </details>
              ))}
          </Section>
          {/* Not keyed by the page cursor: a save changes it, and details load by subject. */}
          <KnowledgeEditor
            key={`${mind.worldId}:${mind.generation}:${mind.actorId}`}
            mind={mind}
            onSaved={setMind}
            owned={owned}
            visible={visible}
            readScope={readScope}
            onDirtyChange={setKnowledgeDirty}
          />
          {mind.continuity?.cursor && (
            <Button
              disabled={knowledgeDirty}
              onPress={() => {
                const cursor = mind.continuity!.cursor!;
                void post<{ ok: boolean; message?: string; mind?: GodMindView }>(
                  owned ? '/api/mind' : '/api/god/mind',
                  { actorId, cursor },
                )
                  .then((result) => {
                    if (result.ok && result.mind) setMind(result.mind);
                    else setError(result.message ?? 'Unable to load page.');
                  })
                  .catch((error) => setError(String(error)));
              }}
            >
              More feelings and notes
            </Button>
          )}
          <ActivityHistory
            key={`${mind.worldId}:${mind.generation}:${mind.actorId}:${readScope}`}
            actorId={mind.actorId}
            owned={owned}
          />
          {!owned && (
            <Section title="Memory and thought history">
              <MemoryHistory
                key={`${mind.worldId}:${mind.generation}:${mind.actorId}:${readScope}`}
                actorId={mind.actorId}
                owned={false}
                visible={visible}
              />
            </Section>
          )}
          <InlineJson
            title="Memories, experiences and commitments"
            value={{
              records: mind.records,
              experiences: mind.experiences,
              commitments: mind.commitments,
            }}
          />
          <InlineJson
            title="Thoughts and active states"
            value={{ thoughts: mind.thoughts, statusEffects: mind.statusEffects }}
          />
        </>
      ) : (
        !error && <p>Loading mind…</p>
      )}
    </div>
  );
}

export type DiagnosticSelection = IntelligenceCall & {
  stageCount: number;
  knownCostUsd: number;
  costIncomplete: boolean;
  actorKind?: string;
  actorSpecies?: string;
  responseSummary?: string;
  responseParts?: { label: string; text: string }[];
  errorSummary?: string;
};
type Row = DiagnosticSelection;
type RawView = { title: string; value: unknown };

/** Rich previews share the accessible tooltip primitives and escape panel clipping. */
function Preview({
  title,
  value,
  children,
}: {
  title: string;
  value: ReactNode;
  children: ReactNode;
}) {
  return (
    <TooltipTrigger delay={250} closeDelay={150}>
      <Focusable>
        <span tabIndex={0} className="ol-inspection-preview">
          {children}
        </span>
      </Focusable>
      <Tooltip className="ol-root ol-inspection-tooltip" placement="start" offset={8}>
        <strong>{title}</strong>
        <div>{value}</div>
      </Tooltip>
    </TooltipTrigger>
  );
}
function levelLabel(route?: string): string | undefined {
  // An escalated level-1 decision records both levels, e.g. `level1→level2`.
  const levels = [...(route?.matchAll(/level[ -]?(\d)/gi) ?? [])].map((match) => match[1]);
  return levels.length > 1
    ? `Level ${levels.join(' → ')}`
    : levels.length
      ? `Level ${levels[0]}`
      : route === 'native'
        ? 'Native'
        : route === 'full-harness'
          ? 'Full harness'
          : undefined;
}
/** Outcome kinds shown distinctly; the job status alone merges cancellation, staleness,
 * provider outcomes and deferral. docs/memory-architecture.md#god-mode-cognition-debugger */
function outcomeKind(status: string, disposition?: string): string {
  // A queued reflection opportunity merged into an existing one stays running but is coalesced.
  if (disposition === 'coalesced') return 'coalesced';
  if (status === 'running') return 'pending';
  switch (disposition) {
    case 'skipped':
    case 'deferred':
    case 'coalesced':
    case 'stale':
    case 'uncertain':
      return disposition;
    case 'cancelled':
    case 'actor-unavailable':
      return 'canceled';
    case 'response-rejected':
      return 'rejected';
    case 'queued':
    case 'judging':
    case 'generating':
      return status === 'completed' ? 'completed' : 'pending';
  }
  return status === 'failed' ? 'failed' : 'completed';
}
const outcomeLabels: Record<string, string> = {
  pending: 'Pending',
  skipped: 'Skipped',
  deferred: 'Deferred',
  coalesced: 'Coalesced',
  canceled: 'Canceled',
  stale: 'Stale',
  uncertain: 'Uncertain completion',
  rejected: 'Rejected',
  failed: 'Failed',
  completed: 'Completed',
};
function ResponsePreview({ row }: { row: Row }) {
  return (
    <dl className="ol-preview-facts">
      {row.responseParts?.length ? (
        row.responseParts.map((part, index) => (
          <Labeled key={index} label={part.label}>
            {part.text}
          </Labeled>
        ))
      ) : (
        <Labeled label="Response">{row.responseSummary ?? 'No response recorded'}</Labeled>
      )}
    </dl>
  );
}
function shortValue(value: unknown): string {
  if (value == null) return 'Not recorded';
  if (typeof value === 'string') return value.length > 240 ? `${value.slice(0, 240)}…` : value;
  if (Array.isArray(value)) return `${value.length} items`;
  const fields = object(value);
  if (!fields) return String(value);
  return (
    Object.entries(fields)
      .filter(([key, item]) => item != null && !['receipt', 'schema', 'requestId'].includes(key))
      .slice(0, 4)
      .map(
        ([key, item]) =>
          `${humanize(key)}: ${typeof item === 'object' ? (Array.isArray(item) ? `${item.length} items` : `${Object.keys(item as object).length} fields`) : shortValue(item)}`,
      )
      .join(' · ') || 'No additional fields'
  );
}
function stageInput(call: IntelligenceCall): string {
  if (call.kind === 'Jev')
    return `${Object.keys(object(path(call.input, 'questions')) ?? {}).length} questions · actor context and candidates`;
  if (call.kind.startsWith('LM')) {
    const context = path(call.input, 'context') ?? '';
    const rendered = typeof context === 'string' ? context : JSON.stringify(context);
    return `${lmPurposeTitle(textAt(call.input, 'task'))} · ${rendered.length.toLocaleString()} context characters`;
  }
  return shortValue(call.input);
}
function stageResult(call: IntelligenceCall): string {
  const answers =
    object(path(call.output, 'value', 'answers')) ?? object(path(call.output, 'answers'));
  if (answers) {
    const entries = Object.entries(answers);
    const rated = entries.filter(([, answer]) => path(answer, 'type') === 'noul');
    const choices = entries
      .filter(([, answer]) => path(answer, 'type') !== 'noul')
      .map(
        ([key, answer]) =>
          `${humanize(key)}: ${levelLabel(answerLabel(answer)) ?? answerLabel(answer)}`,
      );
    // Level-1 action ratings carry explicit criteria and a separate selection threshold, so
    // the 50% relevance line would misstate them.
    const actionRatings = rated.some(
      ([key]) => !!object(path(call.input, 'questions', key, 'criteria')),
    );
    if (rated.length && (choices.length || actionRatings)) {
      const best = Math.max(...rated.map(([, answer]) => Number(path(answer, 'noul') ?? 0)));
      return [...choices, `${rated.length} actions rated · best ${Math.round(best * 100)}%`].join(
        ' · ',
      );
    }
    if (rated.length) {
      const yes = rated.filter(([, answer]) => answerBucket(answer) === 'yes').length;
      return `${yes} included · ${rated.length - yes} excluded`;
    }
    return choices.join(' · ');
  }
  if (call.kind === 'Decision accounting')
    return `${usd(path(call.output, 'total', 'settledUsd'))} across ${String(path(call.output, 'total', 'requests') ?? 0)} requests`;
  return (
    textAt(call.output, 'reason') ??
    textAt(call.output, 'error') ??
    textAt(call.output, 'message') ??
    shortValue(path(call.output, 'value') ?? call.output)
  );
}
// Only fold records when their request/attempt identity identifies the consuming stage.
// docs/memory-architecture.md#god-mode-cognition-debugger
function stageGroups(calls: IntelligenceCall[]) {
  const supporting = new Map<string, IntelligenceCall[]>();
  const folded = new Set<string>();
  for (const call of calls) {
    let owner: IntelligenceCall | undefined;
    if (call.kind === 'Accounting')
      owner = calls.find(
        (c) =>
          (c.id === textAt(call.input, 'requestId') ||
            textAt(c.input, 'requestId') === textAt(call.input, 'requestId')) &&
          c.kind !== 'Accounting',
      );
    // A combined request carries routing and action ratings in one Jev call.
    const questionIds = (c: IntelligenceCall) =>
      Object.keys(object(path(c.input, 'questions')) ?? {});
    const consumes =
      call.kind === 'Semantic decision'
        ? (c: IntelligenceCall) => questionIds(c).includes('route')
        : call.kind === 'Action context' || call.kind === 'Level-1 selection'
          ? (c: IntelligenceCall) => questionIds(c).some((id) => /^a\d+$/.test(id))
          : undefined;
    const attempt = call.id.match(/^(.*:attempt:\d+):/)?.[1];
    if (consumes && attempt)
      owner = calls.find(
        (c) =>
          c.kind === 'Jev' &&
          consumes(c) &&
          (textAt(c.input, 'requestId') ?? c.id).startsWith(`${attempt}:`),
      );
    if (owner && owner.id !== call.id) {
      supporting.set(owner.id, [...(supporting.get(owner.id) ?? []), call]);
      folded.add(call.id);
    }
  }
  return calls
    .filter((c) => !folded.has(c.id))
    .map((call) => ({ call, supporting: supporting.get(call.id) ?? [] }));
}

function stageTitle(call: IntelligenceCall): string {
  if (call.kind === 'Jev') return `Jev · ${jevPurpose(call)}`;
  if (call.kind.startsWith('LM ·')) return `LM · ${lmPurposeTitle(textAt(call.input, 'task'))}`;
  switch (call.kind) {
    case 'Embeddings':
      return 'Semantic retrieval · Query embedding';
    case 'Context and retrieval':
      return 'Semantic retrieval · Memory context';
    case 'Semantic decision':
      return 'Routing · Selected response level';
    case 'Level-1 selection':
      return 'Level 1 · Action selection';
    case 'Decision accounting':
      return 'Accounting · Cost by level';
    case 'Response admission':
      return 'Response · Admission';
    case 'Workflow failure':
      return 'Workflow · Failure';
    case 'Full harness · world agent':
      return 'World agent · Conversation';
    case 'Reflection context':
      return 'Reflection · Context';
    case 'Consolidation coverage':
      return 'Memory consolidation · Coverage';
    case 'Summary publication':
      return 'Memory consolidation · Publication';
    default:
      return call.kind;
  }
}

function StageMetrics({ call }: { call: IntelligenceCall }) {
  const receipt = object(path(call.output, 'receipt'));
  const usage = object(receipt?.['usage']);
  const elapsed = call.completedAt
    ? Date.parse(call.completedAt) - Date.parse(call.startedAt)
    : receipt?.['latencyMs'];
  return (
    <dl className="ol-diagnostic-metrics">
      {typeof elapsed === 'number' && (
        <Labeled label="Elapsed">{Math.max(0, elapsed).toLocaleString()} ms</Labeled>
      )}
      {receipt && (
        <>
          <Labeled label="Model">
            {valueText(receipt['model']) ?? valueText(receipt['requestedModel']) ?? 'Not reported'}
          </Labeled>
          <Labeled label="Tokens">
            {usage
              ? `${usage['inputTokens'] ?? '?'} in / ${usage['outputTokens'] ?? '?'} out`
              : 'Not reported'}
          </Labeled>
          <Labeled label="Estimated cost">
            {typeof receipt['estimatedCostUsd'] === 'number'
              ? `$${receipt['estimatedCostUsd'].toFixed(6)}`
              : receipt['dispatched'] === false
                ? 'No provider dispatch'
                : 'Not reported'}
          </Labeled>
          {typeof receipt['providerQueueLatencyMs'] === 'number' && (
            <Labeled label="Provider queue">{String(receipt['providerQueueLatencyMs'])} ms</Labeled>
          )}
        </>
      )}
    </dl>
  );
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="ol-diagnostic-field">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function valueText(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}

function humanize(value: string): string {
  const text = value
    .replaceAll(/([a-z])([A-Z])/g, '$1 $2')
    .replaceAll(/[_-]/g, ' ')
    .trim();
  return text ? text.replace(/^./, (character) => character.toUpperCase()) : value;
}

function jevPurpose(call: IntelligenceCall): string {
  const ids = Object.keys(object(path(call.input, 'questions')) ?? {});
  const requestId = textAt(call.input, 'requestId') ?? '';
  if (ids.includes('admissibility')) return 'Invention judgment';
  if (ids.includes('route') && ids.some((id) => /^a\d+$/.test(id)))
    return 'Routing and action selection';
  if (ids.includes('route')) return 'Response routing';
  // Level-1 selection questions carry explicit criteria; relevance questions do not.
  if (
    ids.some((id) => /^a\d+$/.test(id) && !!object(path(call.input, 'questions', id, 'criteria')))
  )
    return 'Level-1 action selection';
  if (requestId.includes('action-attention') || ids.some((id) => /^a\d+$/.test(id)))
    return 'Action relevance';
  if (ids.some((id) => /^c\d+$/.test(id))) return 'Context relevance';
  if (requestId.endsWith(':route')) return 'Semantic routing';
  if (requestId.includes(':attention')) return 'Context relevance';
  return 'Semantic judgment';
}

function lmPurposeTitle(task?: string): string {
  switch (task) {
    case 'npc_response':
      return 'NPC response';
    case 'invent_supported_technique':
      return 'Invention proposal';
    case 'memory_consolidation':
      return 'Memory consolidation';
    case 'conversation_compaction':
      return 'Conversation compaction';
    case 'background_reflection':
      return 'Background reflection';
    case 'npc_cognition':
      return 'NPC cognition';
    default:
      return task ? humanize(task) : 'Generation';
  }
}

function lmPurpose(task?: string): string {
  switch (task) {
    case 'npc_response':
      return 'Compose this actor’s spoken response, optional action, and private thought.';
    case 'invent_supported_technique':
      return 'Propose one recipe for the invention family selected by Jev.';
    case 'memory_consolidation':
      return 'Condense routine memories while preserving their chronology and source links.';
    case 'background_reflection':
      return 'Reconsider lasting beliefs, relationships, goals, and unresolved concerns.';
    case 'npc_cognition':
      return 'Choose the actor’s next semantic thought or intention.';
    default:
      return task
        ? `Run the ${humanize(task).toLowerCase()} generation task.`
        : 'Generate a typed result.';
  }
}

function answerLabel(answer: unknown): string {
  const data = object(answer);
  if (!data) return 'No recorded decision';
  if (typeof data['choice'] === 'string') return data['choice'];
  if (typeof data['score'] === 'number') return String(data['score']);
  if (typeof data['noul'] === 'number') return `${Math.round(data['noul'] * 100)}% yes`;
  return 'No recorded decision';
}

function answerBucket(answer: unknown): string {
  const data = object(answer);
  // Noul is a probability, not a distinct option for every percentage.
  // docs/memory-architecture.md#god-mode-cognition-debugger
  if (typeof data?.['noul'] === 'number') return data['noul'] >= 0.5 ? 'yes' : 'no';
  return answerLabel(answer);
}

/** Action questions name their target by a request label such as `Option 3`, not by handle. */
const optionLabel = (question: JsonObject | undefined) =>
  valueText(question?.['instructions'])?.match(/\bOption \d+\b/)?.[0];
function jevQuestionText(question: JsonObject | undefined, id: string): string {
  const instructions = valueText(question?.['instructions']) ?? 'No question text was recorded.';
  const label = optionLabel(question);
  return (label ? instructions.replace(label, 'each option') : instructions)
    .replace(`Is \`candidates.${id}\``, 'Is each candidate')
    .replace(`Would candidate ${id}`, 'Would each candidate')
    .replace(
      `For candidate ${id} in candidates, would including it`,
      'Would including each candidate',
    );
}

function jevOptions(question: JsonObject | undefined): [string, string | undefined][] {
  const criteria = question?.['criteria'];
  if (Array.isArray(criteria))
    return criteria.map((description, index) => [String(index), valueText(description)]);
  return Object.entries(object(criteria) ?? {}).map(([option, description]) => [
    option,
    valueText(description),
  ]);
}

function jevTarget(
  state: JsonObject | undefined,
  id: string,
  question?: JsonObject,
): { handle: string; text: string } {
  const candidates = object(state?.['candidates']);
  const candidate = candidates?.[id] ?? candidates?.[optionLabel(question) ?? ''];
  const data = object(candidate);
  const candidateText =
    valueText(candidate) ??
    valueText(data?.['text']) ??
    valueText(data?.['description']) ??
    valueText(data?.['name']);
  return {
    handle: candidateText ? id : 'Question',
    text: candidateText ?? humanize(id),
  };
}

function jevScores(answer: JsonObject | undefined, options: string[]): string {
  const probabilities = object(answer?.['probabilities']);
  if (probabilities) {
    const keys = [...new Set([...options, ...Object.keys(probabilities)])];
    return keys
      .filter((key) => typeof probabilities[key] === 'number')
      .map((key) => `${key} ${Math.round(Number(probabilities[key]) * 100)}%`)
      .join(' · ');
  }
  if (typeof answer?.['noul'] === 'number') {
    const yes = Math.round(answer['noul'] * 100);
    return `yes ${yes}% · no ${100 - yes}%`;
  }
  return '';
}

function JevSummary({
  call,
  selectionPolicy,
}: {
  call: IntelligenceCall;
  selectionPolicy?: JsonObject;
}) {
  const [excluded, setExcluded] = useState<Record<string, string[]>>({});
  // Level-1 action ratings (Noul questions with explicit criteria) use the recorded selection
  // policy, not the 50% relevance line. docs/memory-architecture.md#god-mode-cognition-debugger
  const selectAt = Number(selectionPolicy?.['selectAt'] ?? NaN);
  const uncertainAt = Number(selectionPolicy?.['uncertainAt'] ?? NaN);
  const selecting = (question: JsonObject | undefined) =>
    question?.['type'] === 'noul' &&
    !!object(question['criteria']) &&
    Number.isFinite(selectAt) &&
    Number.isFinite(uncertainAt);
  const bucket = (question: JsonObject | undefined, answer: JsonObject | undefined) => {
    const noul = answer?.['noul'];
    if (!selecting(question) || typeof noul !== 'number') return answerBucket(answer);
    return noul >= selectAt ? 'selectable' : noul >= uncertainAt ? 'uncertain' : 'no fit';
  };
  const questions = object(path(call.input, 'questions'));
  const answers =
    object(path(call.output, 'value', 'answers')) ?? object(path(call.output, 'answers'));
  if (!questions && !answers) return null;
  const ids = [...new Set([...Object.keys(questions ?? {}), ...Object.keys(answers ?? {})])];
  const state = object(path(call.input, 'state'));
  const groups = new Map<
    string,
    {
      question: JsonObject | undefined;
      text: string;
      entries: { id: string; answer: JsonObject | undefined }[];
    }
  >();
  for (const id of ids) {
    const question = object(questions?.[id]);
    const text = jevQuestionText(question, id);
    const key = question
      ? JSON.stringify([question['type'], text, question['criteria']])
      : `missing:${id}`;
    const group = groups.get(key) ?? { question, text, entries: [] };
    group.entries.push({ id, answer: object(answers?.[id]) });
    groups.set(key, group);
  }
  return (
    <div className="ol-jev-summary">
      <dl className="ol-diagnostic-fields ol-jev-purpose">
        <Labeled label="Jev stage">{jevPurpose(call)}</Labeled>
        <Labeled label="Question count">{Object.keys(questions ?? {}).length}</Labeled>
        {valueText(path(call.output, 'reason')) && (
          <Labeled label="Failure">{valueText(path(call.output, 'reason'))}</Labeled>
        )}
        {path(call.output, 'receipt', 'dispatched') === false && (
          <Labeled label="Dispatch">Not sent to provider</Labeled>
        )}
      </dl>
      {[...groups.entries()].map(([groupKey, group]) => {
        const options = jevOptions(group.question);
        const labels = [
          ...new Set([
            ...(selecting(group.question)
              ? ['selectable', 'uncertain', 'no fit']
              : group.question?.['type'] === 'noul'
                ? ['yes', 'no']
                : options.map(([label]) => label)),
            ...group.entries.map(({ answer }) => bucket(group.question, answer)),
          ]),
        ];
        const hidden = excluded[groupKey] ?? [];
        const counts = new Map<string, number>();
        for (const entry of group.entries) {
          const label = bucket(group.question, entry.answer);
          counts.set(label, (counts.get(label) ?? 0) + 1);
        }
        const visible = group.entries.filter(
          ({ answer }) => !hidden.includes(bucket(group.question, answer)),
        );
        return (
          <section className="ol-diagnostic-card ol-jev-question" key={groupKey}>
            <div className="ol-diagnostic-card-head">
              <strong>Question</strong>
              <span className="ol-caption">
                {group.entries.length} {group.entries.length === 1 ? 'target' : 'targets'}
              </span>
            </div>
            <p className="ol-prose">{group.text}</p>
            {selecting(group.question) ? (
              <p className="ol-caption">
                Level-1 selection: selectable ≥ {Math.round(selectAt * 100)}%; uncertain{' '}
                {Math.round(uncertainAt * 100)}–{Math.round(selectAt * 100)}%; no fit below{' '}
                {Math.round(uncertainAt * 100)}%. Exact probabilities remain visible.
              </p>
            ) : (
              group.question?.['type'] === 'noul' && (
                <p className="ol-caption">
                  Yes ≥ 50%; No &lt; 50%. Exact probabilities remain visible.
                </p>
              )
            )}
            {!!options.length && (
              <details className="ol-jev-options">
                <summary>Answer definitions</summary>
                <span className="ol-eyebrow">Options</span>
                <ul className="ol-choice-list">
                  {options.map(([option, description]) => (
                    <li key={option}>
                      <span>
                        <strong>{option}</strong>
                        {description && <small>{description}</small>}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <div className="ol-jev-results-head">
              <span className="ol-eyebrow">Results</span>
            </div>
            <div className="ol-answer-filters" role="group" aria-label="Filter answers">
              {labels.map((label) => (
                <button
                  type="button"
                  key={label}
                  aria-pressed={!hidden.includes(label)}
                  onClick={() =>
                    setExcluded((current) => ({
                      ...current,
                      [groupKey]: hidden.includes(label)
                        ? hidden.filter((value) => value !== label)
                        : [...hidden, label],
                    }))
                  }
                >
                  {humanize(label)} <span>{counts.get(label) ?? 0}</span>
                </button>
              ))}
            </div>
            <p className="ol-caption">
              {visible.length} of {group.entries.length} results
            </p>
            <ul className="ol-jev-target-list">
              {visible.map(({ id, answer }) => {
                const target = jevTarget(state, id, object(questions?.[id]));
                const scores = jevScores(
                  answer,
                  options.map(([option]) => option),
                );
                return (
                  <li key={id}>
                    <span className="ol-jev-target">
                      <small>{target.handle}</small>
                      <span>{target.text}</span>
                    </span>
                    <span className="ol-jev-result">
                      <Tag tone="accent">{answerLabel(answer)}</Tag>
                      {scores && <small>{scores}</small>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function LmResponse({ value }: { value: JsonObject }) {
  // Follow the operation envelope; absent/malformed data must never masquerade as silence.
  // docs/memory-architecture.md#god-mode-cognition-debugger
  if (!Array.isArray(value['operations']))
    return <p className="ol-prose">Response format unavailable. Inspect the raw record.</p>;
  const operations = value['operations'].map(object);
  if (!operations.length)
    return <p className="ol-prose">No new operations proposed; continue existing behavior.</p>;
  return (
    <div className="ol-lm-components">
      {operations.map((operation, index) => {
        const kinds = ['talk', 'act', 'think', 'goal', 'plan'].filter(
          (kind) => operation?.[kind] != null,
        );
        if (!operation || kinds.length !== 1 || !object(operation[kinds[0]!]))
          return <p key={index}>Malformed operation {index + 1}; inspect the raw record.</p>;
        const kind = kinds[0]!;
        const part = object(operation[kind])!;
        const target = part['targetEntityId'] ?? part['addresseeEntityId'];
        const description =
          kind === 'act'
            ? part['kind'] === 'known'
              ? `Use action ${String(part['actionId'])}`
              : part['kind'] === 'expression'
                ? humanize(String(part['verb']))
                : valueText(part['description'])
            : kind === 'goal'
              ? `${humanize(String(part['operation']))}: ${String(part['objective'] ?? part['goalId'] ?? '')}`
              : kind === 'plan'
                ? `${humanize(String(part['mode']))} plan; expected revision ${String(part['expectedRevision'])}`
                : valueText(part['text']);
        return (
          <section className="ol-diagnostic-card" key={index}>
            <span className="ol-eyebrow">
              Proposed{' '}
              {kind === 'talk'
                ? 'speech'
                : kind === 'think'
                  ? 'private thought'
                  : kind === 'act'
                    ? 'action'
                    : kind}{' '}
              · {String(operation['localId'] ?? index + 1)}
            </span>
            <p className="ol-prose">{description ?? 'Details unavailable; inspect raw record.'}</p>
            {target != null && <p className="ol-caption">Target: {String(target)}</p>}
            {Array.isArray(part['aboutEntityIds']) && part['aboutEntityIds'].length > 0 && (
              <p className="ol-caption">About: {part['aboutEntityIds'].map(String).join(', ')}</p>
            )}
            {kind === 'plan' && <StructuredValue value={part['steps']} />}
            {Array.isArray(operation['requiresAccepted']) &&
              operation['requiresAccepted'].length > 0 && (
                <p className="ol-caption">
                  Requires accepted: {operation['requiresAccepted'].map(String).join(', ')}
                </p>
              )}
          </section>
        );
      })}
    </div>
  );
}

function LmInvention({ value }: { value: JsonObject }) {
  const output = object(value['output']);
  const inputs = Array.isArray(value['inputs']) ? value['inputs'].map(object).filter(Boolean) : [];
  return (
    <section className="ol-diagnostic-card">
      <span className="ol-eyebrow">Proposed invention</span>
      <h4>{valueText(output?.['name']) ?? 'Unnamed proposal'}</h4>
      {valueText(output?.['description']) && (
        <p className="ol-prose">{valueText(output?.['description'])}</p>
      )}
      {!!inputs.length && (
        <p className="ol-caption">
          Materials:{' '}
          {inputs
            .map(
              (input) =>
                `${String(input?.['quantity'] ?? '?')} × ${String(input?.['definitionId'] ?? 'unknown')}`,
            )
            .join(', ')}
        </p>
      )}
    </section>
  );
}

function LmConsolidation({ value }: { value: JsonObject }) {
  const groups = Array.isArray(value['groups'])
    ? value['groups'].map(object).filter((group): group is JsonObject => !!group)
    : [];
  return (
    <section className="ol-diagnostic-card">
      <span className="ol-eyebrow">Memory summaries</span>
      {groups.length ? (
        <ul className="ol-lm-summary-list">
          {groups.map((group, index) => (
            <li key={index}>
              <span>{valueText(group['text']) ?? 'No summary text returned.'}</span>
              {Array.isArray(group['sourceIds']) && (
                <small>{group['sourceIds'].length} source memories</small>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="ol-prose">No memory groups returned.</p>
      )}
    </section>
  );
}

function LmSummary({ call, trigger }: { call: IntelligenceCall; trigger?: string }) {
  const task = textAt(call.input, 'task');
  const context = object(path(call.input, 'context'));
  const output = object(call.output);
  const value = object(output?.['value']);
  const failure =
    valueText(output?.['reason']) ?? valueText(output?.['error']) ?? valueText(output?.['message']);
  const requestLabel =
    task === 'npc_response'
      ? 'Cognition trigger'
      : task === 'invent_supported_technique'
        ? 'Invention request'
        : task === 'background_reflection'
          ? 'Reflection trigger'
          : 'Trigger';
  const sourceCount = object(context?.['sources'])
    ? Object.keys(object(context?.['sources'])!).length
    : undefined;
  return (
    <div className="ol-lm-summary">
      <dl className="ol-diagnostic-fields">
        <Labeled label="Purpose">{lmPurpose(task)}</Labeled>
        {trigger && <Labeled label={requestLabel}>{trigger}</Labeled>}
        {(valueText(path(call.input, 'model')) || valueText(path(call.input, 'execution'))) && (
          <Labeled label="Requested execution">
            {[
              valueText(path(call.input, 'model')),
              valueText(path(call.input, 'execution')),
              valueText(path(call.input, 'reasoningEffort')) &&
                `${valueText(path(call.input, 'reasoningEffort'))} effort`,
              valueText(path(call.input, 'maxOutputTokens')) &&
                `≤ ${valueText(path(call.input, 'maxOutputTokens'))} output tokens`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Labeled>
        )}
        {valueText(context?.['selectedFamily']) && (
          <Labeled label="Jev-selected family">{valueText(context?.['selectedFamily'])}</Labeled>
        )}
        {valueText(context?.['mode']) && (
          <Labeled label="Consolidation mode">{humanize(String(context?.['mode']))}</Labeled>
        )}
        {sourceCount !== undefined && <Labeled label="Source memories">{sourceCount}</Labeled>}
        {failure && <Labeled label="Failure">{failure}</Labeled>}
      </dl>
      {value && task === 'npc_response' && <LmResponse value={value} />}
      {value && task === 'invent_supported_technique' && <LmInvention value={value} />}
      {value && task === 'memory_consolidation' && <LmConsolidation value={value} />}
      {value && task === 'background_reflection' && Array.isArray(value['thoughts']) && (
        <section className="ol-diagnostic-card">
          <span className="ol-eyebrow">Reflection thoughts</span>
          <ul className="ol-lm-summary-list">
            {value['thoughts'].map((thought, index) => (
              <li key={index}>{valueText(object(thought)?.['text']) ?? valueText(thought)}</li>
            ))}
          </ul>
        </section>
      )}
      {!value && !failure && (
        <p className="ol-caption">No typed model response was retained for this call.</p>
      )}
    </div>
  );
}

function WorldAgentSummary({ call }: { call: IntelligenceCall }) {
  const input = object(call.input);
  const output = object(call.output);
  const failed = output?.['ok'] === false || call.status === 'failed';
  return (
    <div className="ol-lm-summary">
      <dl className="ol-diagnostic-fields">
        <Labeled label="Purpose">
          Answer the player’s world question or discuss an idea using public observations.
        </Labeled>
        {valueText(input?.['conversationId']) && (
          <Labeled label="Conversation">{valueText(input?.['conversationId'])}</Labeled>
        )}
        {valueText(input?.['text']) && (
          <Labeled label="Player message">“{valueText(input?.['text'])}”</Labeled>
        )}
        {valueText(output?.['message']) && (
          <Labeled label={failed ? 'Error' : 'Response'}>{valueText(output?.['message'])}</Labeled>
        )}
        {valueText(output?.['code']) && (
          <Labeled label="Result code">{valueText(output?.['code'])}</Labeled>
        )}
      </dl>
    </div>
  );
}

type Retrieval = {
  query?: string;
  embedding?: JsonObject;
  candidates: JsonObject[];
  mandatoryCount: number;
  automaticCount: number;
  attentionStatus?: string;
  triggerFacts?: unknown;
  conversation?: JsonObject;
};

function retrievalFrom(calls: IntelligenceCall[]): Retrieval | undefined {
  const stage = calls.find((call) => call.kind === 'Context and retrieval');
  if (!stage) return undefined;
  const selection = object(path(stage.input, 'selection'));
  if (!selection) return undefined;
  return {
    query: valueText(selection['query']),
    triggerFacts: path(stage.input, 'triggerFacts'),
    conversation: object(path(stage.input, 'conversation')),
    embedding: object(selection['embedding']),
    mandatoryCount: Array.isArray(selection['mandatory']) ? selection['mandatory'].length : 0,
    automaticCount: Array.isArray(selection['automatic']) ? selection['automatic'].length : 0,
    attentionStatus: valueText(selection['attentionStatus']),
    candidates: Array.isArray(selection['candidates'])
      ? selection['candidates'].map(object).filter((item): item is JsonObject => !!item)
      : [],
  };
}

function RetrievalSummary({ retrieval }: { retrieval: Retrieval }) {
  const searchStatus = valueText(retrieval.embedding?.['status']);
  const direct = searchStatus?.includes('direct-Jev limit') ?? false;
  const judged = retrieval.candidates.filter((candidate) => candidate['attention'] != null).length;
  const selected = retrieval.candidates.filter(
    (candidate) => candidate['selected'] === true,
  ).length;
  const semantic = retrieval.candidates
    .filter((candidate) => typeof candidate['score'] === 'number')
    .sort((a, b) => Number(b['score']) - Number(a['score']));
  return (
    <div className="ol-retrieval-summary">
      {retrieval.conversation && (
        <section className="ol-diagnostic-card">
          <strong>Conversation context</strong>
          <dl className="ol-diagnostic-fields">
            <Labeled label="Mode">{valueText(retrieval.conversation['mode'])}</Labeled>
            <Labeled label="Conversation">
              {valueText(retrieval.conversation['conversationId']) ?? 'None'}
            </Labeled>
            <Labeled label="Compactor version">
              {valueText(retrieval.conversation['compactorVersion'])}
            </Labeled>
            <Labeled label="Permitted speech">
              {valueText(retrieval.conversation['permittedTurns'])} turns ·{' '}
              {valueText(retrieval.conversation['permittedBytes'])} bytes
            </Labeled>
            <Labeled label="Model context">
              {valueText(retrieval.conversation['projectionBytes'])} /{' '}
              {valueText(retrieval.conversation['maxBytes'])} bytes
            </Labeled>
            <Labeled label="Recent verbatim speech">
              {valueText(retrieval.conversation['recentTurns'])} turns ·{' '}
              {valueText(retrieval.conversation['recentBytes'])} bytes
            </Labeled>
            <Labeled label="Summary">
              {valueText(retrieval.conversation['summaryBytes'])} bytes · coverage{' '}
              {valueText(retrieval.conversation['throughAwarenessSequence']) ?? 'none'}
            </Labeled>
            <Labeled label="Compaction calls">
              {valueText(retrieval.conversation['compactionCalls'])}
            </Labeled>
          </dl>
          <details>
            <summary>Exact model-facing conversation</summary>
            <pre>
              {valueText(retrieval.conversation['projection']) ?? 'No conversation supplied.'}
            </pre>
          </details>
        </section>
      )}
      {retrieval.triggerFacts != null && (
        <section className="ol-diagnostic-card">
          <strong>Trigger facts</strong>
          <StructuredValue value={retrieval.triggerFacts} />
        </section>
      )}
      <dl className="ol-diagnostic-fields">
        {retrieval.query && <Labeled label="Query">{retrieval.query}</Labeled>}
        <Labeled label="Vector search">
          {direct
            ? 'Skipped — candidates evaluated directly by Jev'
            : (searchStatus ?? 'Status unavailable')}
        </Labeled>
        <Labeled label="Hard-query context">
          {retrieval.mandatoryCount + retrieval.automaticCount} entries
        </Labeled>
        <Labeled label="Optional candidates">{retrieval.candidates.length}</Labeled>
        <Labeled label="Jev judgments">
          {judged} · {retrieval.attentionStatus ?? 'Status unavailable'}
        </Labeled>
        <Labeled label="Optional entries selected">{selected}</Labeled>
        <Labeled label="Configured vector store">
          {valueText(retrieval.embedding?.['table']) ??
            (retrieval.embedding?.['storage'] === 'pgvector'
              ? 'recall_vectors'
              : (valueText(retrieval.embedding?.['storage']) ?? 'Unavailable'))}
        </Labeled>
        {retrieval.embedding?.['model'] !== undefined && (
          <Labeled label="Embedding model">{String(retrieval.embedding['model'])}</Labeled>
        )}
        {retrieval.embedding?.['search'] !== undefined && (
          <Labeled label="Retrieval policy">{String(retrieval.embedding['search'])}</Labeled>
        )}
      </dl>
      <section className="ol-diagnostic-card">
        <div className="ol-diagnostic-card-head">
          <strong>
            {direct
              ? 'Vector search skipped'
              : semantic.length
                ? `Top ${semantic.length} vector results`
                : 'No vector-scored results'}
          </strong>
          {!direct && <span className="ol-caption">cosine similarity</span>}
        </div>
        {semantic.length ? (
          <ol className="ol-result-list">
            {semantic.map((candidate) => (
              <li key={String(candidate['id'])}>
                <span className="ol-result-rank" />
                <span>
                  <strong>{String(candidate['kind'] ?? candidate['id'])}</strong>
                  <small>{String(candidate['text'] ?? candidate['id'])}</small>
                </span>
                <span>{Number(candidate['score']).toFixed(3)}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="ol-caption">
            {direct
              ? 'Candidates went directly to Jev; no vector scores were needed.'
              : 'No vector scores were retained. This does not mean Jev rejected every candidate.'}
          </p>
        )}
      </section>
    </div>
  );
}

function StructuredValue({ value }: { value: unknown }) {
  if (value == null) return <span className="ol-caption">Not recorded</span>;
  if (Array.isArray(value))
    return value.length ? (
      <ol className="ol-structured-list">
        {value.map((item, index) => (
          <li key={index}>
            <StructuredValue value={item} />
          </li>
        ))}
      </ol>
    ) : (
      <span className="ol-caption">None</span>
    );
  const fields = object(value);
  if (!fields) return <span className="ol-prose">{String(value)}</span>;
  return (
    <dl className="ol-diagnostic-fields ol-structured-fields">
      {Object.entries(fields)
        .filter(([, item]) => item != null)
        .map(([key, item]) => (
          <Labeled key={key} label={humanize(key)}>
            <StructuredValue value={item} />
          </Labeled>
        ))}
    </dl>
  );
}

const outcomeIcons: Record<string, string> = {
  skipped: 'ui.minus',
  deferred: 'ui.pause',
  coalesced: 'ui.next',
  canceled: 'ui.close',
  stale: 'ui.refresh',
  uncertain: 'ui.help',
  rejected: 'ui.close',
  failed: 'ui.close',
  completed: 'ui.check',
};
function StatusIcon({ status }: { status: string }) {
  const label = outcomeLabels[status] ?? humanize(status);
  return (
    <span className="ol-diagnostic-status" data-status={status} title={label}>
      <Icon name={outcomeIcons[status] ?? 'ui.more'} label={label} size={16} />
    </span>
  );
}

function CopyValue({ label, value }: { label: string; value: unknown }) {
  const [status, setStatus] = useState('');
  return (
    <span className="ol-copy-value">
      <Button
        size="sm"
        variant="quiet"
        icon="ui.copy"
        onPress={() =>
          void navigator.clipboard
            .writeText(JSON.stringify(value ?? null, null, 2))
            .then(() => setStatus('Copied'))
            .catch(() => setStatus('Copy failed; use the JSON view'))
        }
      >
        {label}
      </Button>
      <small role="status">{status}</small>
    </span>
  );
}

function BillingDetails({ value }: { value: unknown }) {
  const data = object(value);
  const runs = Array.isArray(data?.['runs']) ? data['runs'] : [];
  const money = (value: unknown) =>
    typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value))
      ? `$${(Number(value) / 1e6).toFixed(6)}`
      : 'Not reported';
  return (
    <section className="ol-diagnostic-card">
      <strong>Provider billing</strong>
      {!runs.length && (
        <p>No provider run ID was recorded; remote billing cannot be retrieved for this stage.</p>
      )}
      {runs.map((raw, index) => {
        const run = object(raw),
          billing = object(run?.['billing']);
        const entries = Array.isArray(billing?.['data']) ? billing['data'] : [];
        return (
          <div key={index}>
            {typeof billing?.['unavailable'] === 'string' && (
              <p role="alert" className="ol-diagnostic-error">
                {billing['unavailable']}
              </p>
            )}
            {!entries.length && !billing?.['unavailable'] && (
              <p>Usage has not been reported yet.</p>
            )}
            {entries.map((entry, i) => {
              const line = object(entry),
                usage = object(line?.['model_usage']);
              return (
                <dl key={i} className="ol-diagnostic-metrics">
                  <Labeled label="Model">
                    {valueText(line?.['model']) ?? valueText(line?.['kind']) ?? 'Not reported'}
                  </Labeled>
                  <Labeled label="Billing mode">
                    {valueText(line?.['billing_mode']) ?? 'Not reported'}
                  </Labeled>
                  <Labeled label="Macrofold charge">{money(line?.['charged_micro_usd'])}</Labeled>
                  <Labeled label="Provider cost">
                    {money(usage?.['provider_cost_micro_usd'])}
                  </Labeled>
                  <Labeled label="Tokens">
                    {String(usage?.['input_tokens'] ?? '?')} in /{' '}
                    {String(usage?.['output_tokens'] ?? '?')} out
                  </Labeled>
                  <Labeled label="Reporting status">
                    {valueText(usage?.['completeness']) ?? 'Not reported'} ·{' '}
                    {valueText(usage?.['provider_cost_status']) ?? 'Cost status unknown'}
                  </Labeled>
                </dl>
              );
            })}
            <details>
              <summary>Billing records and run ID</summary>
              <p className="ol-diagnostic-id">{String(run?.['runId'] ?? 'Unknown')}</p>
              <StructuredValue value={billing} />
            </details>
            <details>
              <summary>Provider events</summary>
              <StructuredValue value={run?.['events']} />
            </details>
          </div>
        );
      })}
      <p className="ol-caption">{valueText(data?.['note'])}</p>
    </section>
  );
}

function RoutingResult({ call }: { call: IntelligenceCall }) {
  const answers =
    object(path(call.output, 'answers')) ?? object(path(call.output, 'value', 'answers')) ?? {};
  const offered = object(path(call.input, 'offeredRoutes'));
  const gates = object(path(call.input, 'nativeGates'));
  const route = textAt(call.output, 'route');
  const mode = textAt(call.input, 'selectionRequest');
  return (
    <>
      <dl className="ol-preview-facts">
        {route && (
          <Labeled label="Routed to">
            <strong>{levelLabel(route) ?? humanize(route)}</strong>
          </Labeled>
        )}
        {Object.entries(answers).map(([key, answer]) => (
          <Labeled key={key} label={humanize(key)}>
            <strong>{levelLabel(answerLabel(answer)) ?? humanize(answerLabel(answer))}</strong>
            <span className="ol-route-probabilities">{jevScores(object(answer), [])}</span>
          </Labeled>
        ))}
        {path(call.output, 'confidence') != null && (
          <Labeled label="Confidence">{String(path(call.output, 'confidence'))}</Labeled>
        )}
        {mode && (
          <Labeled label="Action selection">
            {mode === 'combined'
              ? 'Rated in this routing request'
              : 'Dependent second request, only when the route needs actions'}
          </Labeled>
        )}
      </dl>
      {offered && (
        <details className="ol-jev-options">
          <summary>Offered routes ({Object.keys(offered).length})</summary>
          <ul className="ol-choice-list">
            {Object.entries(offered).map(([option, description]) => (
              <li key={option}>
                <span>
                  <strong>{levelLabel(option) ?? humanize(option)}</strong>
                  {valueText(description) && <small>{valueText(description)}</small>}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
      {gates && (
        <details className="ol-jev-options">
          <summary>Native policy gates</summary>
          <dl className="ol-preview-facts">
            {Object.entries(gates).map(([gate, value]) => (
              <Labeled key={gate} label={humanize(gate)}>
                {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
              </Labeled>
            ))}
          </dl>
        </details>
      )}
    </>
  );
}

const percent = (value: number) => `${Math.round(value * 100)}%`;
const usd = (value: unknown) =>
  typeof value === 'number' ? `$${value.toFixed(6)}` : 'Not reported';
/** Per-decision totals by level, including preparation and grounding requests. Unpriced or
 * uncertain requests keep their reservation charged; absent usage is unknown, not zero. */
function DecisionAccounting({ call }: { call: IntelligenceCall }) {
  const groups = object(path(call.output, 'groups')) ?? {};
  const total = object(path(call.output, 'total'));
  const limits = object(path(call.input, 'limits')) ?? {};
  const label = (key: string) =>
    key.startsWith('level') ? (levelLabel(key) ?? key) : humanize(key);
  return (
    <div className="ol-lm-summary">
      <dl className="ol-diagnostic-fields">
        <Labeled label="Decision total">
          {usd(total?.['settledUsd'])} charged across {String(total?.['requests'] ?? 0)} paid
          requests{total?.['uncertain'] ? '; includes uncertain or unpriced reservations' : ''}
        </Labeled>
      </dl>
      <p className="ol-caption">
        Sizes are UTF-8 bytes as submitted. Jev's own request limit is checked separately in
        serialized characters.
      </p>
      <ul className="ol-jev-target-list">
        {Object.entries(groups).map(([key, raw]) => {
          const group = object(raw);
          const limit = object(limits[key]);
          return (
            <li key={key}>
              <span className="ol-jev-target">
                <small>{label(key)}</small>
                <span>
                  {Number(group?.['requests'] ?? 0)}{' '}
                  {Number(group?.['requests']) === 1 ? 'request' : 'requests'} · size{' '}
                  {Number(group?.['inputBytes'] ?? 0).toLocaleString()} input +{' '}
                  {Number(group?.['schemaBytes'] ?? 0).toLocaleString()} schema/questions · tokens{' '}
                  {String(group?.['inputTokens'] ?? 0)} in / {String(group?.['outputTokens'] ?? 0)}{' '}
                  out ({String(group?.['reasoningTokens'] ?? 0)} reasoning)
                  {group?.['usageMissing'] ? ' · some usage not reported' : ''}
                  {limit &&
                    ` · limits: ${String(limit['requestsPerDecision'])} requests, ${usd(limit['decisionUsd'])}`}
                </span>
              </span>
              <span className="ol-jev-result">
                <Tag>{usd(group?.['settledUsd'])}</Tag>
                <small>reserved {usd(group?.['reservedUsd'])}</small>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
/** Level-1 selection result: every offered rating against the recorded policy, the outcome and
 * its reason. Reasons are policy results, not model explanations. */
function Level1Selection({ call }: { call: IntelligenceCall }) {
  const outcome = object(path(call.output, 'outcome'));
  const policy = object(path(call.input, 'policy'));
  const ratings = path(call.input, 'ratings');
  const ignored = path(call.input, 'ignoredAnswers');
  const selectAt = Number(policy?.['selectAt'] ?? 0.7);
  const uncertainAt = Number(policy?.['uncertainAt'] ?? 0.5);
  const kind = valueText(outcome?.['kind']);
  const selected = valueText(outcome?.['handle']);
  const refused = path(call.input, 'escalationRefused') === true;
  return (
    <div className="ol-lm-summary">
      <dl className="ol-diagnostic-fields">
        <Labeled label="Outcome">
          <strong>
            {kind === 'act'
              ? 'Act on the selected binding'
              : kind === 'continue'
                ? 'Continue existing work'
                : kind === 'escalate'
                  ? `Escalate to level ${String(outcome?.['level'])}`
                  : kind === 'defer'
                    ? 'Defer'
                    : 'Not recorded'}
          </strong>
        </Labeled>
        {valueText(outcome?.['reason']) && (
          <Labeled label="Reason">{humanize(String(outcome?.['reason']))}</Labeled>
        )}
        {valueText(outcome?.['escalationBlocked']) && (
          <Labeled label="Escalation blocked">
            {humanize(String(outcome?.['escalationBlocked']))}
          </Labeled>
        )}
        <Labeled label="Thresholds">
          Select at {percent(selectAt)} or above; {percent(uncertainAt)}–{percent(selectAt)} is
          uncertain; below {percent(uncertainAt)} no supplied action fits. Provisional policy, not
          calibrated probability.
        </Labeled>
        {valueText(policy?.['version']) && (
          <Labeled label="Policy version">{valueText(policy?.['version'])}</Labeled>
        )}
      </dl>
      {refused ? (
        <p className="ol-caption">
          The escalation's allowance was refused before any generative request; the ratings are in
          the preceding selection stage.
        </p>
      ) : Array.isArray(ratings) && ratings.length > 0 ? (
        <ul className="ol-jev-target-list">
          {ratings.map((raw, index) => {
            const rating = object(raw);
            const handle = valueText(rating?.['handle']) ?? String(index);
            const value = rating?.['rating'];
            return (
              <li key={handle}>
                <span className="ol-jev-target">
                  <small>{handle}</small>
                  <span>{valueText(rating?.['description']) ?? 'Description not captured'}</span>
                </span>
                <span className="ol-jev-result">
                  <Tag tone={handle === selected ? 'accent' : undefined}>
                    {typeof value === 'number'
                      ? `${percent(value)} ${value >= selectAt ? 'selectable' : value >= uncertainAt ? 'uncertain' : 'no fit'}`
                      : humanize(String(rating?.['status'] ?? 'missing'))}
                  </Tag>
                  {handle === selected && <small>Selected</small>}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="ol-caption">No supplied action was offered for rating.</p>
      )}
      {Array.isArray(ignored) && ignored.length > 0 && (
        <p className="ol-caption">
          Ignored answers for unoffered handles: {ignored.map(String).join(', ')}. They were never
          executed.
        </p>
      )}
    </div>
  );
}

function StageReadable({
  call,
  retrieval,
  trigger,
  selectionPolicy,
}: {
  call: IntelligenceCall;
  retrieval?: Retrieval;
  trigger?: string;
  selectionPolicy?: JsonObject;
}) {
  const routing = call.kind === 'Semantic decision';
  const level1Stage = call.kind === 'Level-1 selection';
  const accounting = call.kind === 'Decision accounting';
  const jev = call.kind === 'Jev' || !!path(call.input, 'questions');
  const lm = call.kind.startsWith('LM ·');
  const worldAgent = call.kind.toLowerCase().includes('world agent');
  const speech =
    textAt(call.input, 'proposed', 'speech') ??
    textAt(call.input, 'proposed', 'talk', 'text') ??
    textAt(call.output, 'value', 'speech') ??
    textAt(call.output, 'speech');
  const stimulus =
    textAt(call.input, 'context', 'stimulus') ??
    textAt(call.input, 'state', 'stimulus') ??
    textAt(call.output, 'stimulus');
  const proposedAction = textAt(call.input, 'proposed', 'actionId');
  const message =
    textAt(call.output, 'message') ??
    textAt(call.output, 'reason') ??
    textAt(call.output, 'error') ??
    textAt(call.input, 'reason');
  const task = textAt(call.input, 'task');
  const embedding = /embedding/i.test(call.kind);
  const showRetrieval = call.kind === 'Context and retrieval';
  const embeddingTexts = path(call.input, 'texts');
  const failureStage = /failure|error/i.test(call.kind);
  return (
    <div className="ol-stage-readable">
      {(stimulus ||
        (!lm && task) ||
        speech ||
        proposedAction ||
        (!lm && !worldAgent && !level1Stage && message)) && (
        <dl className="ol-diagnostic-fields">
          {stimulus && <Labeled label="Trigger">{trigger ?? stimulus}</Labeled>}
          {!lm && task && <Labeled label="Task">{humanize(task)}</Labeled>}
          {speech && <Labeled label="Actor response">“{speech}”</Labeled>}
          {proposedAction && <Labeled label="Decision">{proposedAction}</Labeled>}
          {!lm && !worldAgent && !level1Stage && message && (
            <Labeled label={failureStage ? 'Error' : routing ? 'Routing reason' : 'Outcome'}>
              {message}
            </Labeled>
          )}
        </dl>
      )}
      {routing && <RoutingResult call={call} />}
      {level1Stage && <Level1Selection call={call} />}
      {accounting && <DecisionAccounting call={call} />}
      {jev && <JevSummary key={call.id} call={call} selectionPolicy={selectionPolicy} />}
      {lm && <LmSummary call={call} trigger={trigger} />}
      {worldAgent && <WorldAgentSummary call={call} />}
      {embedding && (
        <dl className="ol-diagnostic-fields">
          <Labeled label="Purpose">
            Create vectors for the semantic query and any candidates missing from the index.
          </Labeled>
          {textAt(call.input, 'model') && (
            <Labeled label="Embedding model">{textAt(call.input, 'model')}</Labeled>
          )}
          {Array.isArray(embeddingTexts) && (
            <Labeled label="Inputs embedded">{embeddingTexts.length}</Labeled>
          )}
        </dl>
      )}
      {showRetrieval && retrieval && <RetrievalSummary retrieval={retrieval} />}
      {!routing &&
        !level1Stage &&
        !accounting &&
        !jev &&
        !lm &&
        !worldAgent &&
        !embedding &&
        !showRetrieval && (
          <>
            <StructuredValue value={call.output} />
            {call.input != null && (
              <details>
                <summary>Decision context</summary>
                <StructuredValue value={call.input} />
              </details>
            )}
          </>
        )}
      {!stimulus &&
        !task &&
        !speech &&
        !proposedAction &&
        !message &&
        !level1Stage &&
        !accounting &&
        !jev &&
        !lm &&
        !worldAgent &&
        !embedding &&
        !showRetrieval &&
        call.output == null && (
          <p className="ol-caption">No additional rendered fields were recorded for this stage.</p>
        )}
    </div>
  );
}

function RawJsonPanel({ raw, onClose }: { raw: RawView; onClose(): void }) {
  const [copied, setCopied] = useState(false),
    [placement, setPlacement] = useState<CSSProperties>({});
  useEffect(() => setCopied(false), [raw]);
  useLayoutEffect(() => {
    function place() {
      const source = document.getElementById('intelligencePanel');
      if (!source || innerWidth < 900) {
        setPlacement({ inset: 12, width: 'auto', minWidth: 0 });
        return;
      }
      const bounds = source.getBoundingClientRect(),
        gap = 12,
        width = Math.min(640, Math.max(320, bounds.left - gap * 2));
      setPlacement({
        top: bounds.top,
        left: Math.max(gap, bounds.left - gap - width),
        bottom: 'auto',
        right: 'auto',
        width,
        height: bounds.height,
      });
    }
    place();
    addEventListener('resize', place);
    return () => removeEventListener('resize', place);
  }, []);
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    addEventListener('keydown', close);
    return () => removeEventListener('keydown', close);
  }, [onClose]);
  return createPortal(
    <aside className="ol-root ol-json-pullout" style={placement} aria-label={`${raw.title} JSON`}>
      <header>
        <div>
          <span className="ol-eyebrow">Raw JSON</span>
          <h2>{raw.title}</h2>
        </div>
        <div className="ol-actions">
          <IconButton
            icon="ui.copy"
            label={copied ? 'Copied JSON' : 'Copy JSON'}
            onPress={() =>
              void navigator.clipboard
                .writeText(JSON.stringify(raw.value, null, 2))
                .then(() => setCopied(true))
                .catch(() => setCopied(false))
            }
          />
          <IconButton icon="ui.close" label="Close JSON panel" onPress={onClose} />
        </div>
      </header>
      {copied && <p className="ol-caption">Copied to clipboard.</p>}
      <pre>{JSON.stringify(raw.value, null, 2)}</pre>
    </aside>,
    document.body,
  );
}

function Stage({
  call,
  retrieval,
  trigger,
  remote,
  setRemote,
  showJson,
  supporting = [],
}: {
  call: IntelligenceCall;
  supporting?: IntelligenceCall[];
  retrieval?: Retrieval;
  trigger?: string;
  remote: unknown;
  setRemote(value: unknown): void;
  showJson(raw: RawView): void;
}) {
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [billingError, setBillingError] = useState('');
  const supportingFailure = supporting.find(
    (c) => c.status === 'failed' || path(c.output, 'ok') === false,
  );
  const failure =
    call.status === 'failed' || path(call.output, 'ok') === false || !!supportingFailure;
  const reason =
    textAt(call.output, 'reason') ??
    textAt(call.output, 'error') ??
    textAt(call.output, 'message') ??
    textAt(supportingFailure?.output, 'error') ??
    (supportingFailure
      ? `${supportingFailure.kind} failed; inspect supporting details.`
      : undefined);
  const hasProviderDetails =
    !!path(call.output, 'receipt', 'providerRequestId') ||
    call.exchanges.some(
      (exchange) =>
        exchange.method === 'POST' && ['/v1/runs', '/v1/inferences'].includes(exchange.path),
    );
  return (
    <section className="ol-diagnostic-stage">
      <details>
        <summary>
          <StatusIcon status={outcomeKind(failure ? 'failed' : call.status, call.disposition)} />
          <span className="ol-stage-heading">
            <strong>{stageTitle(call)}</strong>
            <span className="ol-stage-peek">
              <Preview title="Input" value={<StructuredValue value={call.input} />}>
                <span className="ol-truncate">Input · {stageInput(call)}</span>
              </Preview>
            </span>
            <span className="ol-stage-peek">
              <Preview
                title="Output"
                value={
                  <>
                    <p>{stageResult(call)}</p>
                    <StructuredValue value={path(call.output, 'value') ?? call.output} />
                  </>
                }
              >
                <span className="ol-truncate">Output · {stageResult(call)}</span>
              </Preview>
            </span>
          </span>
        </summary>
        <details className="ol-stage-technical">
          <summary>Timing, usage and stage ID</summary>
          <StageMetrics call={call} />
          <p className="ol-caption ol-diagnostic-id">Stage ID: {call.id}</p>
        </details>
        <div className="ol-actions">
          <CopyValue label="Copy input" value={call.input} />
          <CopyValue label="Copy output" value={call.output} />
        </div>
        <StageReadable
          call={call}
          retrieval={retrieval}
          trigger={trigger}
          selectionPolicy={object(
            path(supporting.find((c) => c.kind === 'Level-1 selection')?.input, 'policy'),
          )}
        />
        {supporting.map((context) => (
          <details key={context.id} className="ol-supporting-stage">
            <summary>
              <StatusIcon status={outcomeKind(context.status, context.disposition)} />{' '}
              {context.kind === 'Action context'
                ? 'Action options and retrieval'
                : stageTitle(context)}{' '}
              · {stageResult(context)}
            </summary>
            <p className="ol-caption ol-diagnostic-id">Stage ID: {context.id}</p>
            <CopyValue label="Copy input" value={context.input} />{' '}
            <CopyValue label="Copy output" value={context.output} />
            <StageReadable call={context} trigger={trigger} />
          </details>
        ))}
        {hasProviderDetails && (
          <div className="ol-diagnostic-stage-actions">
            <Button
              size="sm"
              variant="quiet"
              disabled={loadingBilling}
              onPress={async () => {
                setLoadingBilling(true);
                setBillingError('');
                try {
                  const result = await post<{ ok: boolean; details?: unknown; message?: string }>(
                    '/api/god/intelligence-details',
                    { id: call.id },
                  );
                  if (!result.ok)
                    throw new Error(result.message ?? 'Provider details unavailable.');
                  setRemote(result.details);
                } catch (error) {
                  setBillingError(error instanceof Error ? error.message : String(error));
                } finally {
                  setLoadingBilling(false);
                }
              }}
            >
              {loadingBilling
                ? 'Fetching billing…'
                : remote === undefined
                  ? 'Fetch billing details'
                  : 'Refresh billing details'}
            </Button>
          </div>
        )}
        {billingError && (
          <p role="alert" className="ol-diagnostic-error">
            {billingError}
          </p>
        )}
        {remote !== undefined && <BillingDetails value={remote} />}
      </details>
      {failure && (
        <p role="alert" className="ol-diagnostic-error">
          {reason ?? 'Stage failed; open the stage to inspect input and output.'}
        </p>
      )}
      <div className="ol-diagnostic-stage-json">
        <IconButton
          icon="ui.json"
          label={`Show ${call.kind} request and response JSON`}
          onPress={() =>
            showJson({
              title: `${call.kind} · request and response`,
              value: remote === undefined ? call : { ...call, providerDetails: remote },
            })
          }
        />
      </div>
    </section>
  );
}

function TraceDetail({
  row,
  showJson,
  visible,
}: {
  row: Row;
  showJson(raw: RawView): void;
  visible: boolean;
}) {
  const [detail, setDetail] = useState<{
      root: IntelligenceCall;
      children: IntelligenceCall[];
      coverage: string;
      responseSummary?: string;
    } | null>(null),
    [error, setError] = useState(''),
    [remote, setRemote] = useState<Record<string, unknown>>({});
  async function load() {
    setError('');
    try {
      const result = await post<{
        ok: boolean;
        message?: string;
        details: NonNullable<typeof detail>;
      }>('/api/god/trigger', { id: row.id });
      if (!result.ok) throw new Error(result.message ?? 'Inspection unavailable.');
      setDetail(result.details);
    } catch (loadError) {
      setDetail(null);
      setError(String(loadError));
    }
  }
  useEffect(() => {
    if (visible) void load();
  }, [row.id, visible]);
  const calls = detail
    ? detail.children.length
      ? detail.children
      : detail.root.kind === 'Semantic trigger'
        ? []
        : [detail.root]
    : [];
  const retrieval = detail ? retrievalFrom(calls) : undefined;
  const response = detail?.responseSummary;
  const rootMessage = textAt(detail?.root.output, 'message');
  const level1 = object(path(detail?.root.output, 'result', 'level1'));
  const coalesced = path(detail?.root.input, 'coalescedCount');
  const routeList = path(detail?.root.input, 'offeredRoutes');
  // Earlier roots stored a numeric placeholder before routing; show only recorded route keys.
  const offeredRoutes =
    Array.isArray(routeList) && routeList.every((route) => typeof route === 'string')
      ? routeList
      : undefined;
  return (
    <div className="ol-trace-detail">
      {error && <p role="alert">{error}</p>}
      {detail && (
        <>
          <div className="ol-diagnostic-detail-tools">
            <p className="ol-meta">{detail.coverage}</p>
            <div className="ol-actions">
              <IconButton
                icon="ui.refresh"
                label="Refresh request stages"
                onPress={() => void load()}
              />
              <IconButton
                icon="ui.json"
                label="Show full request and response JSON"
                onPress={() =>
                  showJson({
                    title: `${detail.root.actorName ?? 'World agent'} · full request and response`,
                    value: { root: detail.root, stages: detail.children, providerDetails: remote },
                  })
                }
              />
            </div>
          </div>
          <dl className="ol-diagnostic-overview">
            <Labeled label="Trigger type">
              {detail.root.triggerType ?? 'Unclassified trigger'}
            </Labeled>
            <Labeled label={detail.root.disposition === 'skipped' ? 'Reason' : 'Trigger'}>
              {detail.root.trigger ?? detail.root.kind}
            </Labeled>
            <Labeled label="Actor">{detail.root.actorName ?? 'World agent'}</Labeled>
            {response && <Labeled label="Proposed response">{response}</Labeled>}
            <Labeled label="Trace ID">
              <span className="ol-diagnostic-id">{detail.root.id}</span>
            </Labeled>
            <Labeled label="Recorded at">
              {new Date(detail.root.startedAt).toLocaleString()}
            </Labeled>
            {detail.root.gameTime !== undefined && (
              <Labeled label="World time at request">
                <EventTime time={detail.root.gameTime} />
              </Labeled>
            )}
            <Labeled label="Child stages">{detail.children.length}</Labeled>
            <Labeled label="Recorded cost">
              {row.costIncomplete && row.knownCostUsd === 0
                ? 'Unknown · usage unreported'
                : `$${row.knownCostUsd.toFixed(6)}${row.costIncomplete ? ' + unreported usage' : ''}`}
            </Labeled>
            <Labeled label="Route">
              {levelLabel(detail.root.route) ?? detail.root.route ?? 'No route recorded'}
            </Labeled>
            <Labeled label="Outcome">
              <StatusIcon status={outcomeKind(detail.root.status, detail.root.disposition)} />{' '}
              {outcomeLabels[outcomeKind(detail.root.status, detail.root.disposition)]}
              {detail.root.disposition &&
                !outcomeLabels[detail.root.disposition] &&
                ` · ${humanize(detail.root.disposition)}`}
            </Labeled>
            {rootMessage && <Labeled label="Outcome detail">{rootMessage}</Labeled>}
            {level1 && (
              <Labeled label="Level-1 selection">
                {humanize(String(level1['kind']))} · {humanize(String(level1['reason']))}
                {valueText(level1['escalationBlocked']) &&
                  ` · escalation blocked: ${humanize(String(level1['escalationBlocked']))}`}
              </Labeled>
            )}
            {typeof coalesced === 'number' && coalesced > 0 && (
              <Labeled label="Coalesced changes">
                {coalesced} earlier {coalesced === 1 ? 'change' : 'changes'} folded into this
                opportunity
              </Labeled>
            )}
            {offeredRoutes && (
              <Labeled label="Offered routes">
                {offeredRoutes.map((route) => levelLabel(route) ?? humanize(route)).join(', ')}
              </Labeled>
            )}
          </dl>
          {detail.root.disposition === 'skipped' && !calls.length && (
            <p className="ol-caption">Cognition was skipped. No execution stages were recorded.</p>
          )}
          {stageGroups(calls).map(({ call, supporting }) => (
            <Stage
              key={call.id}
              call={call}
              supporting={supporting}
              retrieval={retrieval}
              trigger={detail.root.trigger}
              remote={remote[call.id]}
              setRemote={(value) => setRemote((current) => ({ ...current, [call.id]: value }))}
              showJson={showJson}
            />
          ))}
        </>
      )}
      {!detail && !error && <p>Loading request…</p>}
    </div>
  );
}

function triggerIcon(type: string): string {
  if (/autonomous/i.test(type)) return 'ui.cognition';
  if (/world-agent/i.test(type)) return 'ui.world';
  if (/speech|message/i.test(type)) return 'action.talk';
  if (/invention/i.test(type)) return 'action.invent';
  if (/survival|need/i.test(type)) return 'meter.health';
  if (/dream/i.test(type)) return 'ui.night';
  if (/reflection/i.test(type)) return 'ui.refresh';
  if (/consolidation|memory/i.test(type)) return 'ui.journal';
  return 'ui.help';
}
function TraceRow({ row, onSelect }: { row: Row; onSelect(row: Row): void }) {
  const type = row.triggerType ?? row.kind;
  const actorIcon =
    row.actorKind === 'animal'
      ? row.actorSpecies === 'deer'
        ? 'creature.deer'
        : row.actorSpecies === 'hare'
          ? 'creature.hare'
          : 'creature.animal'
      : row.actorKind === 'world'
        ? 'ui.world'
        : row.actorKind === 'person'
          ? 'ui.character'
          : 'ui.inview';
  return (
    <button type="button" className="ol-trace-row" onClick={() => onSelect(row)}>
      <Icon name={actorIcon} label={row.actorKind ?? 'Actor'} size={24} />
      <span className="ol-trace-copy">
        <span className="ol-trace-heading">
          <strong>{row.actorName ?? 'World agent'}</strong>
          {levelLabel(row.route) && <Tag>{levelLabel(row.route)}</Tag>}
        </span>
        <span className="ol-trace-type">
          <Icon name={triggerIcon(type)} size={14} />
          <span>{type}</span>
        </span>
        <Preview
          title="Trigger"
          value={
            <dl className="ol-preview-facts">
              <Labeled label="Type">{type}</Labeled>
              <Labeled label="Trigger">{row.trigger ?? row.kind}</Labeled>
            </dl>
          }
        >
          <span className="ol-truncate">{row.trigger ?? row.kind}</span>
        </Preview>
        <span className="ol-trace-bottom">
          {row.responseParts?.some((part) => part.label === 'Speech') && (
            <Icon name="action.talk" size={14} />
          )}
          <Preview
            title={row.errorSummary ? 'Failure' : 'Proposed response'}
            value={
              <>
                {row.errorSummary && <p className="ol-diagnostic-error">{row.errorSummary}</p>}
                <ResponsePreview row={row} />
              </>
            }
          >
            <span
              className={`ol-truncate ${row.errorSummary ? 'ol-diagnostic-error' : 'ol-trace-response'}`}
            >
              {row.errorSummary ?? row.responseSummary ?? row.disposition ?? 'No response recorded'}
            </span>
          </Preview>
          <time dateTime={row.startedAt}>{new Date(row.startedAt).toLocaleTimeString()}</time>
        </span>
      </span>
      <StatusIcon status={outcomeKind(row.status, row.disposition)} />
    </button>
  );
}

export function Diagnostics({
  worldId,
  selection,
  onSelect,
  visible = true,
  readScope,
}: {
  worldId: string;
  selection: DiagnosticSelection | null;
  onSelect(row: DiagnosticSelection): void;
  visible?: boolean;
  readScope?: string;
}) {
  const [rows, setRows] = useState<Row[]>([]),
    [loading, setLoading] = useState(true),
    [offset, setOffset] = useState(0),
    [more, setMore] = useState(false),
    [follow, setFollow] = useState(false),
    [newActivity, setNewActivity] = useState(false),
    [error, setError] = useState(''),
    [filters, setFilters] = useState<Record<string, string>>({}),
    [draftFilters, setDraftFilters] = useState<Record<string, string>>({}),
    [raw, setRaw] = useState<RawView | null>(null);
  const generation = useRef(0),
    panel = useRef<HTMLDivElement>(null),
    newest = useRef<string | undefined>(undefined);
  newest.current = rows[0]?.id;
  async function refresh() {
    const id = ++generation.current;
    setLoading(true);
    try {
      const result = await post<{
        ok: boolean;
        message?: string;
        worldId?: string;
        roots?: Row[];
        hasMore?: boolean;
      }>('/api/god/triggers', {
        offset,
        ...Object.fromEntries(
          Object.entries(filters)
            .filter(([, value]) => value)
            .map(([key, value]) => [
              key,
              key === 'from' || key === 'to' ? new Date(value).toISOString() : value,
            ]),
        ),
      });
      if (id !== generation.current) return;
      if (!result.ok || result.worldId !== worldId)
        throw new Error(result.message ?? 'Diagnostics unavailable.');
      setRows(result.roots ?? []);
      setMore(!!result.hasMore);
      setError('');
      setNewActivity(false);
    } catch (refreshError) {
      if (id === generation.current) {
        setRows([]);
        setError(String(refreshError));
      }
    } finally {
      if (id === generation.current) setLoading(false);
    }
  }
  useEffect(() => {
    if (!visible) return;
    void refresh();
    return () => {
      generation.current++;
    };
  }, [offset, worldId, filters, visible, readScope]);
  useEffect(() => {
    if (selection || !visible) return;
    let active = true;
    const id = setInterval(async () => {
      if (follow && offset === 0 && !panel.current?.contains(document.activeElement)) {
        await refresh();
        return;
      }
      try {
        const result = await post<{ ok: boolean; roots?: Row[] }>('/api/god/triggers', {
          offset: 0,
          peek: true,
        });
        if (!active) return;
        if (!result.ok) {
          setRows([]);
          return;
        }
        if (result.roots?.[0]?.id && result.roots[0].id !== newest.current) setNewActivity(true);
      } catch {
        /* Explicit Refresh exposes errors without replacing a reader's open row. */
      }
    }, 3000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [follow, offset, filters, worldId, selection, visible, readScope]);
  useEffect(() => setRaw(null), [worldId, selection?.id]);
  if (selection)
    return (
      <div ref={panel}>
        <TraceDetail key={selection.id} row={selection} showJson={setRaw} visible={visible} />
        {raw && visible && <RawJsonPanel raw={raw} onClose={() => setRaw(null)} />}
      </div>
    );
  return (
    <div ref={panel}>
      <div className="ol-actions">
        <Button size="sm" onPress={() => void refresh()}>
          Refresh
        </Button>
        <Button size="sm" variant="quiet" aria-pressed={follow} onPress={() => setFollow(!follow)}>
          {follow ? 'Following new records' : 'Follow new records'}
        </Button>
        <Button size="sm" disabled={!offset} onPress={() => setOffset(Math.max(0, offset - 25))}>
          Newer
        </Button>
        <Button size="sm" disabled={!more} onPress={() => setOffset(offset + 25)}>
          Older
        </Button>
      </div>
      <p className="ol-caption ol-diagnostic-context">
        {follow
          ? 'Newest records refresh while you are not interacting with the list.'
          : 'Reading stays on this page. New records wait for you to open them.'}
      </p>
      {newActivity && (
        <Button
          size="sm"
          onPress={() => {
            if (offset) setOffset(0);
            else void refresh();
          }}
        >
          New activity · show newest
        </Button>
      )}
      <details>
        <summary>
          Filter records{Object.values(filters).some(Boolean) ? ' · filters applied' : ''}
        </summary>
        <form
          className="ol-diagnostic-filters"
          onSubmit={(event) => {
            event.preventDefault();
            setOffset(0);
            setFilters({ ...draftFilters });
          }}
        >
          <div className="ol-filter-grid">
            {(
              [
                ['search', 'Search text'],
                ['actor', 'Character'],
                ['route', 'Route'],
                ['outcome', 'Outcome'],
                ['stage', 'Stage'],
                ['from', 'From local time'],
                ['to', 'To local time'],
              ] as const
            ).map(([name, label]) => (
              <label key={name}>
                {label}
                <input
                  aria-label={label}
                  type={name === 'from' || name === 'to' ? 'datetime-local' : 'search'}
                  value={draftFilters[name] ?? ''}
                  onChange={(event) => {
                    setDraftFilters({ ...draftFilters, [name]: event.target.value });
                  }}
                />
              </label>
            ))}
          </div>
          <div className="ol-actions">
            <Button type="submit" size="sm">
              Apply filters
            </Button>
            <Button
              type="button"
              size="sm"
              variant="quiet"
              onPress={() => {
                setDraftFilters({});
                setFilters({});
                setOffset(0);
              }}
            >
              Clear filters
            </Button>
          </div>
        </form>
      </details>
      <p className="ol-caption">
        Recorded triggers and stages. Costs are estimates; missing usage stays unknown. Inspection
        never reruns inference.
      </p>
      {error && <p role="alert">{error}</p>}
      {rows.map((row) => (
        <TraceRow key={row.id} row={row} onSelect={onSelect} />
      ))}
      {!!rows.length && (
        <p className="ol-caption">
          Records {offset + 1}–{offset + rows.length} on this retained history page.
        </p>
      )}
      {loading && (
        <p role="status" className="ol-caption">
          Loading triggers…
        </p>
      )}
      {!rows.length && !error && !loading && <p>No matching retained triggers.</p>}
      {raw && visible && <RawJsonPanel raw={raw} onClose={() => setRaw(null)} />}
    </div>
  );
}
