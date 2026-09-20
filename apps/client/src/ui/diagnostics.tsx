import { useEffect, useRef, useState } from 'react';
import type { GodMindView, IntelligenceCall } from '@open-legend/protocol';
import { post } from '../api';
import { Button, Section, Tag } from '../design-system/components';
function Json({ title, value }: { title: string; value: unknown }) {
  const [copied, setCopied] = useState(false);
  return (
    <details>
      <summary>{title}</summary>
      <Button
        size="sm"
        variant="quiet"
        onPress={() =>
          void navigator.clipboard
            .writeText(JSON.stringify(value, null, 2))
            .then(() => setCopied(true))
            .catch(() => setCopied(false))
        }
      >
        {copied ? 'Copied' : 'Copy'}
      </Button>
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
      .then((r) => {
        if (active) {
          setMind(r.ok ? (r.mind ?? null) : null);
          setError(r.ok ? '' : (r.message ?? 'Inspection unavailable.'));
        }
      })
      .catch((e) => {
        if (active) setError(String(e));
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
          {mind.documents.map((d) => (
            <details key={d.id}>
              <summary>{d.title}</summary>
              <p className="ol-prose">{d.text}</p>
            </details>
          ))}
          <Json
            title="Memories, experiences and commitments"
            value={{
              records: mind.records,
              experiences: mind.experiences,
              commitments: mind.commitments,
            }}
          />
          <Json title="Thoughts and sleep" value={{ thoughts: mind.thoughts, rest: mind.rest }} />
        </>
      ) : (
        !error && <p>Loading mind…</p>
      )}
    </div>
  );
}
type Row = IntelligenceCall & { stageCount: number; knownCostUsd: number; costIncomplete: boolean };
function stageSummary(call: IntelligenceCall) {
  const receipt = (
    call.output as
      | {
          receipt?: {
            latencyMs?: number;
            estimatedCostUsd?: number;
            usage?: { inputTokens: number; outputTokens: number };
          };
        }
      | undefined
  )?.receipt;
  return `${call.kind} · ${call.status}${receipt ? ` · ${receipt.latencyMs ?? '?'} ms · ${receipt.usage ? `${receipt.usage.inputTokens} in / ${receipt.usage.outputTokens} out` : 'tokens unknown'} · ${receipt.estimatedCostUsd === undefined ? 'cost unknown' : `$${receipt.estimatedCostUsd.toFixed(6)}`}` : ''}`;
}

function Trace({ row }: { row: Row }) {
  const [detail, setDetail] = useState<{
      root: IntelligenceCall;
      children: IntelligenceCall[];
      coverage: string;
    } | null>(null),
    [error, setError] = useState(''),
    [remote, setRemote] = useState<Record<string, unknown>>({});
  async function load() {
    try {
      const r = await post<{ ok: boolean; message?: string; details: NonNullable<typeof detail> }>(
        '/api/god/trigger',
        { id: row.id },
      );
      if (!r.ok) throw new Error(r.message ?? 'Inspection unavailable.');
      setDetail(r.details);
    } catch (e) {
      setDetail(null);
      setError(String(e));
    }
  }
  return (
    <details
      className="ol-trace"
      onToggle={(e) => {
        if (e.currentTarget.open && !detail) void load();
      }}
    >
      <summary>
        <time>{new Date(row.startedAt).toLocaleTimeString()}</time> ·{' '}
        <span>{row.actorName ?? 'World agent'}</span> · {row.trigger ?? row.kind}
        <br />
        <small>
          {row.route ?? '—'} · {row.disposition ?? row.status} · ${row.knownCostUsd.toFixed(4)}
          {row.costIncomplete ? ' + unknown' : ''}
        </small>
      </summary>
      {error && <p role="alert">{error}</p>}
      {detail && (
        <>
          <p className="ol-meta">{detail.coverage}</p>
          <Json title="Trigger and outcome" value={detail.root} />
          {detail.children.map((call) => (
            <details key={call.id}>
              <summary>{stageSummary(call)}</summary>
              <Json title="Input" value={call.input} />
              <Json title="Output / receipts" value={call.output} />
              <Json title="Provider requests and responses" value={call.exchanges} />
              {call.exchanges.some(
                (e) => e.method === 'POST' && ['/v1/runs', '/v1/inferences'].includes(e.path),
              ) && (
                <Button
                  size="sm"
                  onPress={() =>
                    void post<{ ok: boolean; details?: unknown; message?: string }>(
                      '/api/god/intelligence-details',
                      { id: call.id },
                    )
                      .then((r) => {
                        if (r.ok) setRemote((v) => ({ ...v, [call.id]: r.details }));
                        else setError(r.message ?? 'Provider details unavailable.');
                      })
                      .catch((e) => setError(String(e)))
                  }
                >
                  Fetch provider billing/details
                </Button>
              )}
              {remote[call.id] !== undefined && (
                <Json title="Provider details" value={remote[call.id]} />
              )}
            </details>
          ))}
          <Button size="sm" onPress={() => void load()}>
            Refresh stages
          </Button>
        </>
      )}
    </details>
  );
}
export function Diagnostics({ worldId }: { worldId: string }) {
  const [rows, setRows] = useState<Row[]>([]),
    [offset, setOffset] = useState(0),
    [more, setMore] = useState(false),
    [follow, setFollow] = useState(false),
    [newActivity, setNewActivity] = useState(false),
    [error, setError] = useState(''),
    [filters, setFilters] = useState<Record<string, string>>({});
  const generation = useRef(0),
    panel = useRef<HTMLDivElement>(null),
    newest = useRef<string | undefined>(undefined);
  newest.current = rows[0]?.id;
  async function refresh() {
    const id = ++generation.current;
    try {
      const r = await post<{
        ok: boolean;
        message?: string;
        worldId?: string;
        roots?: Row[];
        hasMore?: boolean;
      }>('/api/god/triggers', {
        offset,
        ...Object.fromEntries(
          Object.entries(filters)
            .filter(([, v]) => v)
            .map(([k, v]) => [k, k === 'from' || k === 'to' ? new Date(v).toISOString() : v]),
        ),
      });
      if (id !== generation.current) return;
      if (!r.ok || r.worldId !== worldId) throw new Error(r.message ?? 'Diagnostics unavailable.');
      setRows(r.roots ?? []);
      setMore(!!r.hasMore);
      setError('');
      setNewActivity(false);
    } catch (e) {
      if (id === generation.current) {
        setRows([]);
        setError(String(e));
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
                onChange={(e) => {
                  setOffset(0);
                  setFilters({ ...filters, [name]: e.target.value });
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
        <Trace key={row.id} row={row} />
      ))}
      {!rows.length && !error && <p>No matching retained triggers.</p>}
    </div>
  );
}
