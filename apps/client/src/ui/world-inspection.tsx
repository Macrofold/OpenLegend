import { useEffect, useRef, useState } from 'react';
import type { RelationshipNode, RelationshipPage, RelationshipRef } from '@open-legend/protocol';
import { Button, Tag } from '../design-system/components';
import { post } from '../api';
import './creator-workspaces.css';

type Trace = {
  nodes: RelationshipNode[];
  edges: RelationshipPage['edges'];
  coverage: { status: string; reason: string | null; limitations: string[] };
  frontier: { ref: RelationshipRef; depth: number; cursor?: string }[];
};
type Inspection = {
  node?: RelationshipNode;
  ref?: RelationshipRef;
  data: unknown;
  relationships: RelationshipPage & { subject?: { kind: 'entity' | 'item'; id: string } };
};
const key = (ref: RelationshipRef) => JSON.stringify([ref.kind, ref.id, ref.version]);
/** Owner-only relationship list uses the same service as MCP; it does not edit graph edges.
 * docs/invention-graph.md#graph-reader-implementation
 */
export function WorldInspection({ actorId }: { actorId: string }) {
  const [query, setQuery] = useState(''),
    [nodes, setNodes] = useState<RelationshipNode[]>([]);
  const [searchKind, setSearchKind] = useState<'definitions' | 'entities'>('definitions');
  const [trace, setTrace] = useState<Trace>();
  const [cursor, setCursor] = useState<string | null>(null),
    [submitted, setSubmitted] = useState('');
  const [searched, setSearched] = useState(false);
  const [trail, setTrail] = useState<Array<{ ref: RelationshipRef; label: string }>>([]);
  const [inspection, setInspection] = useState<Inspection>(),
    [extra, setExtra] = useState<{ title: string; value: unknown }>();
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const alive = useRef(true),
    pending = useRef(false);
  const queryInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function read<T>(name: string, args: unknown, accept: (value: T) => void) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await post<{
        ok: boolean;
        message?: string;
        result: { status: string; message?: string; data?: T };
      }>('/api/world-agent/inspect', { name, arguments: args });
      if (!result.ok || result.result.status !== 'ok')
        throw new Error(result.message ?? result.result.message ?? 'Read unavailable.');
      if (alive.current) accept(result.result.data!);
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : 'Read unavailable.');
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const inspect = (ref: { kind: string; id: string; version?: string }, newPath = false) =>
    void read<Inspection>('ol_inspect', { ...ref, sections: ['relationships'] }, (value) => {
      setInspection(value);
      const resolved = value.node?.ref ?? value.ref;
      if (resolved)
        setTrail((previous) => {
          const entry = { ref: resolved, label: value.node?.label ?? resolved.id };
          if (newPath) return [entry];
          const existing = previous.findIndex(
            (item) => item.ref.kind === resolved.kind && item.ref.id === resolved.id,
          );
          return existing < 0 ? [...previous, entry] : [...previous.slice(0, existing), entry];
        });
      setDirection(ref.kind === 'entity' || ref.kind === 'item' ? 'both' : 'out');
      setExtra(undefined);
      setTrace(undefined);
    });
  const search = (next?: string) =>
    void read<{ nodes: RelationshipNode[]; nextCursor: string | null }>(
      searchKind === 'entities' ? 'ol_entities' : 'ol_find',
      { query: next ? submitted : query, limit: 15, ...(next ? { cursor: next } : {}) },
      (value) => {
        setNodes(value.nodes);
        setCursor(value.nextCursor);
        setSearched(true);
        if (!next) setSubmitted(query);
      },
    );
  const root = inspection?.node?.ref ?? inspection?.ref;
  function relationships(direction: 'out' | 'in' | 'both', next?: string) {
    if (!root || !inspection) return;
    setTrace(undefined);
    void read<Inspection['relationships']>(
      'ol_graph',
      {
        root,
        direction,
        limit: 30,
        subject: inspection.relationships.subject,
        ...(next ? { cursor: next } : {}),
      },
      (value) => setInspection((previous) => previous && { ...previous, relationships: value }),
    );
  }
  const [direction, setDirection] = useState<'out' | 'in' | 'both'>('out');
  const page = inspection?.relationships;
  return (
    <section
      className="ol-inventions ol-creator-page"
      aria-label="World-owner relationship inspection"
    >
      <header className="ol-creator-context">
        <Tag tone="highlight">God mode · Read-only inspection</Tag>
        <h3>World relationships</h3>
        <p>
          This reads world records, not your character’s knowledge. Relationships are source-backed,
          but not a complete interaction proof. Reading uses no creation allowance.
        </p>
      </header>
      <form
        className="ol-inspection-search"
        onSubmit={(event) => {
          event.preventDefault();
          search();
        }}
      >
        <label>
          Search scope{' '}
          <select
            value={searchKind}
            disabled={busy}
            onChange={(event) => {
              setSearchKind(event.target.value === 'entities' ? 'entities' : 'definitions');
              setNodes([]);
              setCursor(null);
              setSearched(false);
            }}
          >
            <option value="definitions">Definitions</option>
            <option value="entities">World entities</option>
          </select>
        </label>
        <label>
          Name or ID{' '}
          <input
            ref={queryInput}
            value={query}
            maxLength={200}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="ol-agent-tools">
          <Button type="submit" size="sm" disabled={busy}>
            Search
          </Button>
          {query && (
            <Button
              type="button"
              variant="quiet"
              size="sm"
              disabled={busy}
              onPress={() => {
                setQuery('');
                setNodes([]);
                setCursor(null);
                setSearched(false);
                queryInput.current?.focus();
              }}
            >
              Clear search
            </Button>
          )}
        </div>
      </form>
      <div className="ol-agent-tools">
        <Button
          size="sm"
          variant="quiet"
          disabled={busy}
          onPress={() => inspect({ kind: 'entity', id: actorId }, true)}
        >
          Inspect your character
        </Button>
        <Button
          size="sm"
          disabled={busy}
          variant="quiet"
          onPress={() =>
            void read('ol_activity', { actorId }, (value) =>
              setExtra({ title: 'Your character’s current work', value }),
            )
          }
        >
          Current work
        </Button>
        <Button
          size="sm"
          disabled={busy}
          variant="quiet"
          onPress={() =>
            void read('ol_evidence', { actorId, limit: 10 }, (value) =>
              setExtra({ title: 'Retained evidence for your character', value }),
            )
          }
        >
          Retained evidence
        </Button>
      </div>
      {error && (
        <p role="alert">
          {error} Refresh the selection or restart the search if its source changed.
        </p>
      )}
      {busy && <p role="status">Reading current records…</p>}
      {searched && (
        <p className="ol-caption">
          {submitted ? `Results for “${submitted}”` : 'Records in the selected search scope'}
        </p>
      )}
      {searched && !nodes.length && !busy && !error && (
        <p role="status">No matching records on this search page. Try another name or ID.</p>
      )}
      <ul className="ol-inspection-list" aria-label="World search results">
        {nodes.map((node) => (
          <li key={key(node.ref)}>
            <Button
              variant="quiet"
              size="sm"
              disabled={busy}
              onPress={() => {
                setDirection('out');
                inspect(node.ref, true);
              }}
            >
              {node.label}
            </Button>{' '}
            <span className="ol-caption">{node.ref.kind}</span>
          </li>
        ))}
      </ul>
      {cursor && (
        <Button size="sm" disabled={busy} onPress={() => search(cursor)}>
          Next search page
        </Button>
      )}
      {root && page && (
        <>
          <nav className="ol-inspection-breadcrumbs" aria-label="Inspection path">
            {trail.map((entry, index) =>
              index === trail.length - 1 ? (
                <span key={key(entry.ref)} aria-current="page">
                  {entry.label}
                </span>
              ) : (
                <Button
                  key={key(entry.ref)}
                  size="sm"
                  variant="quiet"
                  disabled={busy}
                  onPress={() => inspect(entry.ref)}
                >
                  {entry.label}
                </Button>
              ),
            )}
            {trail.length > 1 && (
              <Button
                size="sm"
                variant="quiet"
                disabled={busy}
                onPress={() => {
                  const prior = trail.at(-2);
                  if (prior) inspect(prior.ref);
                }}
              >
                Back one source
              </Button>
            )}
          </nav>
          <h3>{inspection.node?.label ?? root.id}</h3>
          <p className="ol-caption">
            {root.kind} · {root.id} · version {root.version.slice(0, 12)}
          </p>
          <div
            className="ol-agent-tools ol-creator-views"
            role="group"
            aria-label="Source relationship controls"
          >
            <Button
              size="sm"
              disabled={busy}
              onPress={() => inspect({ kind: root.kind, id: root.id })}
            >
              Refresh this source
            </Button>
            {(['out', 'in', 'both'] as const).map((value) => (
              <Button
                size="sm"
                key={value}
                disabled={busy}
                variant="quiet"
                aria-pressed={direction === value}
                onPress={() => {
                  setDirection(value);
                  relationships(value);
                }}
              >
                {value === 'out'
                  ? 'Uses / produces'
                  : value === 'in'
                    ? 'Used by'
                    : 'Both directions'}
              </Button>
            ))}
            {!page.subject && root.kind !== 'memory-record' && (
              <Button
                size="sm"
                disabled={busy}
                onPress={() =>
                  void read<Trace>(
                    'ol_trace',
                    { root, direction, maxDepth: 4, maxNodes: 40 },
                    setTrace,
                  )
                }
              >
                Trace these relationships
              </Button>
            )}
          </div>
          <p>
            {page.coverage.status === 'page'
              ? 'Partial neighborhood; more records remain.'
              : 'Complete for this projected neighborhood only.'}
          </p>
          <ul aria-label="Source limitations">
            {page.coverage.limitations.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
          {!page.edges.length && (
            <p>
              No relationships are recorded in this projected page. This does not prove the subject
              has no other relationships.
            </p>
          )}
          <ul className="ol-inspection-list" aria-label="Relationships">
            {page.edges.map((edge) => {
              const target = key(edge.source) === key(root) ? edge.target : edge.source;
              const node = page.nodes.find((node) => key(node.ref) === key(target));
              const source = page.nodes.find((node) => key(node.ref) === key(edge.source));
              const destination = page.nodes.find((node) => key(node.ref) === key(edge.target));
              return (
                <li key={edge.id}>
                  <span>
                    {source?.label ?? edge.source.id} → {edge.relation}
                    {edge.role ? ` (${edge.role})` : ''} → {destination?.label ?? edge.target.id}
                  </span>
                  <span className="ol-caption">
                    {' '}
                    · {edge.assertion}
                    {edge.quantity !== undefined ? ` · quantity ${edge.quantity}` : ''}
                  </span>
                  {node?.canInspect && !node.availability && (
                    <Button
                      size="sm"
                      variant="quiet"
                      disabled={busy}
                      onPress={() => {
                        setDirection('out');
                        inspect(target);
                      }}
                    >
                      Inspect {node.label}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
          {page.nextCursor && (
            <Button
              size="sm"
              disabled={busy}
              onPress={() => relationships(direction, page.nextCursor!)}
            >
              Next relationship page
            </Button>
          )}
          <details>
            <summary>Exact source record</summary>
            <p className="ol-caption">Source revision: {root.version}</p>
            <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {JSON.stringify(inspection.data, null, 2)}
            </pre>
          </details>
        </>
      )}
      {trace && (
        <section aria-label="Projected relationship trace">
          <h3>Relationship reachability</h3>
          <p>
            {trace.nodes.length} projected records · {trace.edges.length} witness connections.
            {trace.coverage.status === 'complete'
              ? ' Complete for this projection and filter only.'
              : ` Bounded result (${trace.coverage.reason ?? trace.coverage.status}); expand frontier records for more.`}{' '}
            This is not a complete interaction-validation report.
          </p>
          <ul>
            {trace.nodes.map((node) => (
              <li key={key(node.ref)}>
                <Button
                  size="sm"
                  variant="quiet"
                  disabled={busy || !node.canInspect || !!node.availability}
                  onPress={() => inspect(node.ref)}
                >
                  {node.label}
                </Button>{' '}
                <span className="ol-caption">
                  {node.ref.kind}
                  {trace.frontier.some((entry) => key(entry.ref) === key(node.ref))
                    ? ' · frontier'
                    : ''}
                </span>
              </li>
            ))}
          </ul>
          <details>
            <summary>Source-backed witness connections and limits</summary>
            <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {JSON.stringify(trace, null, 2)}
            </pre>
          </details>
        </section>
      )}
      {extra !== undefined && (
        <details open>
          <summary>{extra.title}</summary>
          <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {JSON.stringify(extra.value, null, 2)}
          </pre>
        </details>
      )}
    </section>
  );
}
