import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Focusable, Tooltip, TooltipTrigger } from 'react-aria-components';
import type {
  AuthoredAppraisalRequest,
  GodMindView,
  IntelligenceCall,
} from '@open-legend/protocol';
import { post } from '../api';
import { EventTime } from './event-time';
import { Button, Icon, IconButton, Section, Tag } from '../design-system/components';

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

function KnowledgeEditor({
  mind,
  onSaved,
  owned = false,
}: {
  owned?: boolean;
  mind: GodMindView;
  onSaved: (mind: GodMindView) => void;
}) {
  const [subject, setSubject] = useState('');
  const document = mind.notepads?.find((doc) => doc.subjectId === (subject || null));
  const identity = subject ? mind.identities?.[subject] : undefined;
  const [text, setText] = useState(document?.text ?? '');
  const [name, setName] = useState(identity?.givenName ?? '');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => setMessage(''), [subject]);
  useEffect(() => {
    setText(document?.text ?? '');
    setName(identity?.givenName ?? '');
  }, [subject, document?.revision, identity?.revision]);
  const limit =
    document?.maxCharacters ?? mind.knowledgeLimits?.[subject ? 'subject' : 'general'] ?? 0;
  const characters = Array.from(text).length;
  return (
    <Section title="Knowledge notepads">
      <label>
        Person or general knowledge
        <select
          aria-label="Person or general knowledge"
          disabled={saving}
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
        >
          <option value="">General knowledge</option>
          {(
            mind.continuity?.subjects ??
            mind.notepads?.flatMap((doc) =>
              doc.subjectId ? [{ id: doc.subjectId, label: doc.label }] : [],
            ) ??
            []
          ).map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
      </label>
      {subject && (
        <label>
          Given name known by this observer
          <input disabled={saving} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
      )}
      <label>
        Editable knowledge
        <textarea
          rows={8}
          disabled={saving}
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
        disabled={saving || characters > limit}
        onPress={() => {
          setSaving(true);
          setMessage('');
          void post<{ ok: boolean; message?: string; mind?: GodMindView }>(
            owned ? '/api/knowledge' : '/api/god/knowledge',
            {
              actorId: mind.actorId,
              worldId: mind.worldId,
              generation: mind.generation,
              subjectId: subject || null,
              expectedRevision: document?.revision ?? 0,
              text,
              ...(subject && name.trim() && name !== identity?.givenName
                ? { givenName: name, nameRevision: identity?.revision ?? 0 }
                : {}),
            },
          )
            .then((result) => {
              setMessage(result.message ?? '');
              if (result.ok && result.mind) onSaved(result.mind);
            })
            .catch((error) => setMessage(String(error)))
            .finally(() => setSaving(false));
        }}
      >
        Save knowledge
      </Button>
      {message && <p role="status">{message}</p>}
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
    [subject, setSubject] = useState('');
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
      <label>
        About
        <select value={subject} onChange={(event) => setSubject(event.target.value)}>
          <option value="">No particular person</option>
          {mind.continuity?.subjects.map((value) => (
            <option key={value.id} value={value.id}>
              {value.label}
            </option>
          ))}
        </select>
      </label>
      <Button
        disabled={busy}
        onPress={() =>
          send({ kind: 'create', definitionPin: policy.pin, targetId: subject || null })
        }
      >
        Author feeling
      </Button>
    </div>
  );
}

export function Mind({ actorId, owned = false }: { actorId: string; owned?: boolean }) {
  const [mind, setMind] = useState<GodMindView | null>(null),
    [error, setError] = useState(''),
    [authoring, setAuthoring] = useState(false);
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
  }, [actorId, owned]);
  return (
    <div>
      {error && <p role="alert">{error}</p>}
      {mind ? (
        <>
          <Tag>{owned ? 'Private to your character' : 'Private god inspection'}</Tag>
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
          <KnowledgeEditor
            key={`${mind.actorId}:${mind.continuity?.cursor ?? 'last'}`}
            mind={mind}
            onSaved={setMind}
            owned={owned}
          />
          {mind.continuity?.cursor && (
            <Button
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
              More feelings and people
            </Button>
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
  const match = route?.match(/level[ -]?(\d)/i);
  return match
    ? `Level ${match[1]}`
    : route === 'native'
      ? 'Level 1 · Native'
      : route === 'full-harness'
        ? 'Full harness'
        : undefined;
}
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
  if (call.kind.startsWith('LM'))
    return `${lmPurposeTitle(textAt(call.input, 'task'))} · ${String(path(call.input, 'context') ?? '').length.toLocaleString()} context characters`;
  return shortValue(call.input);
}
function stageResult(call: IntelligenceCall): string {
  const answers =
    object(path(call.output, 'value', 'answers')) ?? object(path(call.output, 'answers'));
  if (answers) {
    const entries = Object.entries(answers);
    if (entries.some(([, answer]) => path(answer, 'type') === 'noul')) {
      const yes = entries.filter(([, answer]) => answerBucket(answer) === 'yes').length;
      return `${yes} included · ${entries.length - yes} excluded`;
    }
    return entries
      .map(
        ([key, answer]) =>
          `${humanize(key)}: ${levelLabel(answerLabel(answer)) ?? answerLabel(answer)}`,
      )
      .join(' · ');
  }
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
    const purpose =
      call.kind === 'Action context'
        ? 'Action relevance'
        : call.kind === 'Semantic decision'
          ? 'Response routing'
          : undefined;
    const attempt = call.id.match(/^(.*:attempt:\d+):/)?.[1];
    if (purpose && attempt)
      owner = calls.find(
        (c) =>
          c.kind === 'Jev' &&
          jevPurpose(c) === purpose &&
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
  if (ids.includes('route')) return 'Response routing';
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

function jevQuestionText(question: JsonObject | undefined, id: string): string {
  const instructions = valueText(question?.['instructions']) ?? 'No question text was recorded.';
  return instructions
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

function jevTarget(state: JsonObject | undefined, id: string): { handle: string; text: string } {
  const candidate = object(state?.['candidates'])?.[id];
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

function JevSummary({ call }: { call: IntelligenceCall }) {
  const [excluded, setExcluded] = useState<Record<string, string[]>>({});
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
            ...(group.question?.['type'] === 'noul'
              ? ['yes', 'no']
              : options.map(([label]) => label)),
            ...group.entries.map(({ answer }) => answerBucket(answer)),
          ]),
        ];
        const hidden = excluded[groupKey] ?? [];
        const counts = new Map<string, number>();
        for (const entry of group.entries) {
          const label = answerBucket(entry.answer);
          counts.set(label, (counts.get(label) ?? 0) + 1);
        }
        const visible = group.entries.filter(
          ({ answer }) => !hidden.includes(answerBucket(answer)),
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
            {group.question?.['type'] === 'noul' && (
              <p className="ol-caption">
                Yes ≥ 50%; No &lt; 50%. Exact probabilities remain visible.
              </p>
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
                const target = jevTarget(state, id);
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
};

function retrievalFrom(calls: IntelligenceCall[]): Retrieval | undefined {
  const stage = calls.find((call) => call.kind === 'Context and retrieval');
  if (!stage) return undefined;
  const selection = object(path(stage.input, 'selection'));
  if (!selection) return undefined;
  return {
    query: valueText(selection['query']),
    triggerFacts: path(stage.input, 'triggerFacts'),
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

function StatusIcon({ status }: { status: string }) {
  return (
    <span className="ol-diagnostic-status" data-status={status} title={humanize(status)}>
      <Icon
        name={
          status === 'skipped'
            ? 'ui.minus'
            : status === 'failed'
              ? 'ui.close'
              : status === 'completed'
                ? 'ui.check'
                : 'ui.more'
        }
        label={humanize(status)}
        size={16}
      />
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
  return (
    <dl className="ol-preview-facts">
      {Object.entries(answers).map(([key, answer]) => (
        <Labeled key={key} label={humanize(key)}>
          <strong>{levelLabel(answerLabel(answer)) ?? humanize(answerLabel(answer))}</strong>
          <span className="ol-route-probabilities">{jevScores(object(answer), [])}</span>
        </Labeled>
      ))}
      {path(call.output, 'confidence') != null && (
        <Labeled label="Confidence">{String(path(call.output, 'confidence'))}</Labeled>
      )}
    </dl>
  );
}

function StageReadable({
  call,
  retrieval,
  trigger,
}: {
  call: IntelligenceCall;
  retrieval?: Retrieval;
  trigger?: string;
}) {
  const routing = call.kind === 'Semantic decision';
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
        (!lm && !worldAgent && message)) && (
        <dl className="ol-diagnostic-fields">
          {stimulus && <Labeled label="Trigger">{trigger ?? stimulus}</Labeled>}
          {!lm && task && <Labeled label="Task">{humanize(task)}</Labeled>}
          {speech && <Labeled label="Actor response">“{speech}”</Labeled>}
          {proposedAction && <Labeled label="Decision">{proposedAction}</Labeled>}
          {!lm && !worldAgent && message && (
            <Labeled label={failureStage ? 'Error' : 'Outcome'}>{message}</Labeled>
          )}
        </dl>
      )}
      {routing && <RoutingResult call={call} />}
      {jev && <JevSummary key={call.id} call={call} />}
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
      {!routing && !jev && !lm && !worldAgent && !embedding && !showRetrieval && (
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
          <StatusIcon status={failure ? 'failed' : call.status} />
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
        <StageReadable call={call} retrieval={retrieval} trigger={trigger} />
        {supporting.map((context) => (
          <details key={context.id} className="ol-supporting-stage">
            <summary>
              <StatusIcon status={context.status} />{' '}
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

function TraceDetail({ row, showJson }: { row: Row; showJson(raw: RawView): void }) {
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
  useEffect(() => void load(), [row.id]);
  const calls = detail
    ? detail.children.length
      ? detail.children
      : detail.root.kind === 'Semantic trigger'
        ? []
        : [detail.root]
    : [];
  const retrieval = detail ? retrievalFrom(calls) : undefined;
  const response = detail?.responseSummary;
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
              ${row.knownCostUsd.toFixed(6)}
              {row.costIncomplete ? ' + unreported usage' : ''}
            </Labeled>
            <Labeled label="Route">{detail.root.route ?? 'No route recorded'}</Labeled>
            <Labeled label="Outcome">
              {humanize(detail.root.disposition ?? detail.root.status)}
            </Labeled>
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
      <StatusIcon status={row.disposition === 'skipped' ? 'skipped' : row.status} />
    </button>
  );
}

export function Diagnostics({
  worldId,
  selection,
  onSelect,
}: {
  worldId: string;
  selection: DiagnosticSelection | null;
  onSelect(row: DiagnosticSelection): void;
}) {
  const [rows, setRows] = useState<Row[]>([]),
    [loading, setLoading] = useState(true),
    [offset, setOffset] = useState(0),
    [more, setMore] = useState(false),
    [follow, setFollow] = useState(false),
    [newActivity, setNewActivity] = useState(false),
    [error, setError] = useState(''),
    [filters, setFilters] = useState<Record<string, string>>({}),
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
    void refresh();
    return () => {
      generation.current++;
    };
  }, [offset, worldId, filters]);
  useEffect(() => {
    if (selection) return;
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
  }, [follow, offset, filters, worldId, selection]);
  useEffect(() => setRaw(null), [worldId, selection?.id]);
  if (selection)
    return (
      <div ref={panel}>
        <TraceDetail key={selection.id} row={selection} showJson={setRaw} />
        {raw && <RawJsonPanel raw={raw} onClose={() => setRaw(null)} />}
      </div>
    );
  return (
    <div ref={panel}>
      <div className="ol-actions">
        <Button size="sm" onPress={() => void refresh()}>
          Refresh
        </Button>
        <Button size="sm" onPress={() => setFollow(!follow)}>
          Follow: {follow ? 'on' : 'off'}
        </Button>
        <Button size="sm" disabled={!offset} onPress={() => setOffset(Math.max(0, offset - 25))}>
          Newer
        </Button>
        <Button size="sm" disabled={!more} onPress={() => setOffset(offset + 25)}>
          Older
        </Button>
      </div>
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
        <summary>Filter triggers</summary>
        <div className="ol-filter-grid">
          {['search', 'actor', 'route', 'outcome', 'stage', 'from', 'to'].map((name) => (
            <label key={name}>
              {name}
              <input
                aria-label={name}
                type={name === 'from' || name === 'to' ? 'datetime-local' : 'search'}
                value={filters[name] ?? ''}
                onChange={(event) => {
                  setOffset(0);
                  setFilters({ ...filters, [name]: event.target.value });
                }}
              />
            </label>
          ))}
        </div>
      </details>
      <p className="ol-caption">
        Recorded triggers and stages. Costs are estimates; missing usage stays unknown. Inspection
        never reruns inference.
      </p>
      {error && <p role="alert">{error}</p>}
      {rows.map((row) => (
        <TraceRow key={row.id} row={row} onSelect={onSelect} />
      ))}
      {loading && (
        <p role="status" className="ol-caption">
          Loading triggers…
        </p>
      )}
      {!rows.length && !error && !loading && <p>No matching retained triggers.</p>}
      {raw && <RawJsonPanel raw={raw} onClose={() => setRaw(null)} />}
    </div>
  );
}
