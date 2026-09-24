import { useEffect, useRef, useState } from 'react';
import type { RelationshipNode, RelationshipPage, RelationshipRef } from '@open-legend/protocol';
import { Button, Tag } from '../design-system/components';
import { post } from '../api';

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
  const [cursor, setCursor] = useState<string | null>(null),
    [submitted, setSubmitted] = useState('');
  const [inspection, setInspection] = useState<Inspection>(),
    [extra, setExtra] = useState<unknown>();
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const alive = useRef(true),
    pending = useRef(false);
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
  const inspect = (ref: { kind: string; id: string; version?: string }) =>
    void read<Inspection>('ol_inspect', ref, (value) => {
      setInspection(value);
      setDirection(ref.kind === 'entity' || ref.kind === 'item' ? 'both' : 'out');
      setExtra(undefined);
    });
  const search = (next?: string) =>
    void read<{ nodes: RelationshipNode[]; nextCursor: string | null }>(
      'ol_find',
      { query: next ? submitted : query, limit: 15, ...(next ? { cursor: next } : {}) },
      (value) => {
        setNodes(value.nodes);
        setCursor(value.nextCursor);
        if (!next) setSubmitted(query);
      },
    );
  const root = inspection?.node?.ref ?? inspection?.ref;
  function relationships(direction: 'out' | 'in' | 'both', next?: string) {
    if (!root || !inspection) return;
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
    <section className="ol-inventions" aria-label="World-owner relationship inspection">
      <Tag>World-owner inspection · no paid calls</Tag>
      <p>
        This reads world records, not your character’s knowledge. Relationships are source-backed,
        but not a complete interaction proof.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          search();
        }}
      >
        <label>
          Find definitions{' '}
          <input value={query} maxLength={200} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <Button type="submit" size="sm" disabled={busy}>
          Search
        </Button>
      </form>
      <div className="ol-agent-tools">
        <Button size="sm" disabled={busy} onPress={() => inspect({ kind: 'entity', id: actorId })}>
          Inspect current actor
        </Button>
        <Button
          size="sm"
          disabled={busy}
          onPress={() => void read('ol_activity', { actorId }, setExtra)}
        >
          Current work
        </Button>
        <Button
          size="sm"
          disabled={busy}
          onPress={() => void read('ol_evidence', { actorId, limit: 10 }, setExtra)}
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
      <ul aria-label="Definition search results">
        {nodes.map((node) => (
          <li key={key(node.ref)}>
            <Button
              variant="quiet"
              size="sm"
              disabled={busy}
              onPress={() => {
                setDirection('out');
                inspect(node.ref);
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
          Next definition page
        </Button>
      )}
      {root && page && (
        <>
          <h3>{inspection.node?.label ?? root.id}</h3>
          <p className="ol-caption">
            {root.kind} · {root.id} · version {root.version.slice(0, 12)}
          </p>
          <div className="ol-agent-tools">
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
                variant={direction === value ? 'primary' : 'quiet'}
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
          <ul aria-label="Relationships">
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
            <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {JSON.stringify(inspection.data, null, 2)}
            </pre>
          </details>
        </>
      )}
      {extra !== undefined && (
        <details open>
          <summary>Current work / retained evidence</summary>
          <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {JSON.stringify(extra, null, 2)}
          </pre>
        </details>
      )}
    </section>
  );
}
