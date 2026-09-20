import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import type { GodMindView, IntelligenceCall } from '@open-legend/protocol';
import { post } from '../api';
import { Button, EntityRow, IconButton, Section, Tag } from '../design-system/components';

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

export function Mind({ actorId }: { actorId: string }) {
  const [mind, setMind] = useState<GodMindView | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void post<{ ok: boolean; message?: string; mind?: GodMindView }>('/api/god/mind', { actorId })
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
  }, [actorId]);
  return (
    <div>
      {error && <p role="alert">{error}</p>}
      {mind ? (
        <>
          <Tag>Private god inspection</Tag>
          <Section title="About me">
            <p className="ol-prose">{mind.acceptedText}</p>
          </Section>
          {mind.documents.map((document) => (
            <details key={document.id}>
              <summary>{document.title}</summary>
              <p className="ol-prose">{document.text}</p>
            </details>
          ))}
          <InlineJson
            title="Memories, experiences and commitments"
            value={{
              records: mind.records,
              experiences: mind.experiences,
              commitments: mind.commitments,
            }}
          />
          <InlineJson
            title="Thoughts and sleep"
            value={{ thoughts: mind.thoughts, rest: mind.rest }}
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
};
type Row = DiagnosticSelection;
type RawView = { title: string; value: unknown };

function stageSummary(call: IntelligenceCall) {
  const receipt = object(call.output)?.['receipt'] as
    | {
        latencyMs?: number;
        estimatedCostUsd?: number;
        usage?: { inputTokens: number; outputTokens: number };
      }
    | undefined;
  return `${call.kind} · ${call.status}${receipt ? ` · ${receipt.latencyMs ?? '?'} ms · ${receipt.usage ? `${receipt.usage.inputTokens} in / ${receipt.usage.outputTokens} out` : 'tokens unknown'} · ${receipt.estimatedCostUsd === undefined ? 'cost unknown' : `$${receipt.estimatedCostUsd.toFixed(6)}`}` : ''}`;
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

function answerLabel(answer: unknown): string {
  const data = object(answer);
  if (!data) return 'No recorded decision';
  if (typeof data['choice'] === 'string') return data['choice'];
  if (typeof data['score'] === 'number') return String(data['score']);
  if (typeof data['noul'] === 'number') return `${Math.round(data['noul'] * 100)}% yes`;
  return 'No recorded decision';
}

function jevQuestionText(question: JsonObject | undefined, id: string): string {
  const instructions = valueText(question?.['instructions']) ?? 'No question text was recorded.';
  return instructions.replace(
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
    text:
      candidateText ??
      id
        .replaceAll(/([a-z])([A-Z])/g, '$1 $2')
        .replaceAll(/[_-]/g, ' ')
        .replace(/^./, (character) => character.toUpperCase()),
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
      {[...groups.entries()].map(([groupKey, group]) => {
        const options = jevOptions(group.question);
        return (
          <section className="ol-diagnostic-card ol-jev-question" key={groupKey}>
            <div className="ol-diagnostic-card-head">
              <strong>Question</strong>
              <span className="ol-caption">
                {group.entries.length} {group.entries.length === 1 ? 'target' : 'targets'}
              </span>
            </div>
            <p className="ol-prose">{group.text}</p>
            {!!options.length && (
              <div className="ol-jev-options">
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
              </div>
            )}
            <div className="ol-jev-results-head">
              <span className="ol-eyebrow">Results</span>
            </div>
            <ul className="ol-jev-target-list">
              {group.entries.map(({ id, answer }) => {
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

type Retrieval = {
  query?: string;
  embedding?: JsonObject;
  candidates: JsonObject[];
};

function retrievalFrom(calls: IntelligenceCall[]): Retrieval | undefined {
  const stage = calls.find((call) => call.kind === 'Context and retrieval');
  if (!stage) return undefined;
  const selection = object(path(stage.input, 'selection'));
  if (!selection) return undefined;
  return {
    query: valueText(selection['query']),
    embedding: object(selection['embedding']),
    candidates: Array.isArray(selection['candidates'])
      ? selection['candidates'].map(object).filter((item): item is JsonObject => !!item)
      : [],
  };
}

function RetrievalSummary({ retrieval }: { retrieval: Retrieval }) {
  const semantic = retrieval.candidates
    .filter((candidate) => typeof candidate['score'] === 'number')
    .sort((a, b) => Number(b['score']) - Number(a['score']));
  return (
    <div className="ol-retrieval-summary">
      <dl className="ol-diagnostic-fields">
        {retrieval.query && <Labeled label="Query">{retrieval.query}</Labeled>}
        <Labeled label="Retrieves from">
          {valueText(retrieval.embedding?.['table']) ??
            (retrieval.embedding?.['storage'] === 'pgvector'
              ? 'recall_vectors'
              : (valueText(retrieval.embedding?.['storage']) ?? 'Unavailable'))}
        </Labeled>
        {retrieval.embedding?.['model'] !== undefined && (
          <Labeled label="Embedding model">{String(retrieval.embedding['model'])}</Labeled>
        )}
        {retrieval.embedding?.['search'] !== undefined && (
          <Labeled label="Search">{String(retrieval.embedding['search'])}</Labeled>
        )}
      </dl>
      <section className="ol-diagnostic-card">
        <div className="ol-diagnostic-card-head">
          <strong>Top {semantic.length} semantic results</strong>
          <span className="ol-caption">cosine similarity</span>
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
          <p className="ol-caption">No scored semantic results were retained for this request.</p>
        )}
      </section>
    </div>
  );
}

function responseFrom(calls: IntelligenceCall[]): string | undefined {
  for (const call of [...calls].reverse()) {
    const response =
      textAt(call.input, 'proposed', 'speech') ??
      textAt(call.output, 'value', 'speech') ??
      textAt(call.output, 'speech');
    if (response) return response;
  }
  for (const call of [...calls].reverse()) {
    const outcome = textAt(call.output, 'message') ?? textAt(call.output, 'reason');
    if (outcome) return outcome;
  }
  return undefined;
}

function StageReadable({ call, retrieval }: { call: IntelligenceCall; retrieval?: Retrieval }) {
  const jev = call.kind === 'Jev' || !!path(call.input, 'questions');
  const speech =
    textAt(call.input, 'proposed', 'speech') ??
    textAt(call.output, 'value', 'speech') ??
    textAt(call.output, 'speech');
  const stimulus =
    textAt(call.input, 'context', 'stimulus') ??
    textAt(call.input, 'state', 'stimulus') ??
    textAt(call.output, 'stimulus');
  const proposedAction = textAt(call.input, 'proposed', 'actionId');
  const message = textAt(call.output, 'message') ?? textAt(call.output, 'reason');
  const task = textAt(call.input, 'task');
  const showRetrieval = call.kind === 'Embeddings' || call.kind === 'Context and retrieval';
  return (
    <div className="ol-stage-readable">
      {(stimulus || task || speech || proposedAction || message) && (
        <dl className="ol-diagnostic-fields">
          {stimulus && <Labeled label="Trigger">{stimulus}</Labeled>}
          {task && <Labeled label="Task">{task.replaceAll('_', ' ')}</Labeled>}
          {speech && <Labeled label="Actor response">“{speech}”</Labeled>}
          {proposedAction && <Labeled label="Decision">{proposedAction}</Labeled>}
          {message && <Labeled label="Outcome">{message}</Labeled>}
        </dl>
      )}
      {jev && <JevSummary call={call} />}
      {showRetrieval && retrieval && <RetrievalSummary retrieval={retrieval} />}
      {!stimulus && !task && !speech && !proposedAction && !message && !jev && !showRetrieval && (
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
  remote,
  setRemote,
  setError,
  showJson,
}: {
  call: IntelligenceCall;
  retrieval?: Retrieval;
  remote: unknown;
  setRemote(value: unknown): void;
  setError(message: string): void;
  showJson(raw: RawView): void;
}) {
  const hasProviderDetails = call.exchanges.some(
    (exchange) =>
      exchange.method === 'POST' && ['/v1/runs', '/v1/inferences'].includes(exchange.path),
  );
  return (
    <section className="ol-diagnostic-stage">
      <details>
        <summary>{stageSummary(call)}</summary>
        <StageReadable call={call} retrieval={retrieval} />
        {hasProviderDetails && (
          <div className="ol-diagnostic-stage-actions">
            <Button
              size="sm"
              variant="quiet"
              onPress={() =>
                void post<{ ok: boolean; details?: unknown; message?: string }>(
                  '/api/god/intelligence-details',
                  { id: call.id },
                )
                  .then((result) => {
                    if (result.ok) setRemote(result.details);
                    else setError(result.message ?? 'Provider details unavailable.');
                  })
                  .catch((fetchError) => setError(String(fetchError)))
              }
            >
              Fetch billing details
            </Button>
          </div>
        )}
      </details>
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
    } | null>(null),
    [error, setError] = useState(''),
    [remote, setRemote] = useState<Record<string, unknown>>({});
  async function load() {
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
  const retrieval = detail ? retrievalFrom(detail.children) : undefined;
  const response = detail ? responseFrom(detail.children) : undefined;
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
            <Labeled label="Trigger">{detail.root.trigger ?? detail.root.kind}</Labeled>
            <Labeled label="Actor">{detail.root.actorName ?? 'World agent'}</Labeled>
            <Labeled label="Route">{detail.root.route ?? 'No route recorded'}</Labeled>
            <Labeled label="Outcome">{detail.root.disposition ?? detail.root.status}</Labeled>
            {response && <Labeled label="Response">“{response}”</Labeled>}
          </dl>
          {detail.children.map((call) => (
            <Stage
              key={call.id}
              call={call}
              retrieval={retrieval}
              remote={remote[call.id]}
              setRemote={(value) => setRemote((current) => ({ ...current, [call.id]: value }))}
              setError={setError}
              showJson={showJson}
            />
          ))}
        </>
      )}
      {!detail && !error && <p>Loading request…</p>}
    </div>
  );
}

function TraceRow({ row, onSelect }: { row: Row; onSelect(row: Row): void }) {
  return (
    <div className="ol-trace">
      <EntityRow
        name={`${new Date(row.startedAt).toLocaleTimeString()} · ${row.actorName ?? 'World agent'} · ${row.trigger ?? row.kind}`}
        meta={`${row.route ?? '—'} · ${row.disposition ?? row.status} · $${row.knownCostUsd.toFixed(4)}${row.costIncomplete ? ' + unknown' : ''}`}
        icon="ui.star"
        onPress={() => onSelect(row)}
      />
    </div>
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
    }
  }
  useEffect(() => {
    void refresh();
    return () => {
      generation.current++;
    };
  }, [offset, worldId, filters]);
  useEffect(() => {
    let active = true;
    const id = setInterval(async () => {
      if (follow && offset === 0 && !panel.current?.contains(document.activeElement)) {
        await refresh();
        return;
      }
      try {
        const result = await post<{ ok: boolean; roots?: Row[] }>('/api/god/triggers', {
          offset: 0,
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
  }, [follow, offset, filters, worldId]);
  useEffect(() => setRaw(null), [worldId, selection?.id]);
  if (selection)
    return (
      <div ref={panel}>
        <TraceDetail row={selection} showJson={setRaw} />
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
      {!rows.length && !error && <p>No matching retained triggers.</p>}
      {raw && <RawJsonPanel raw={raw} onClose={() => setRaw(null)} />}
    </div>
  );
}
