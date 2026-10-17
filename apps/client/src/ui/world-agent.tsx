import { useEffect, useRef, useState } from 'react';
import type {
  ActionOption,
  GameView,
  RecipeView,
  WorldAgentSessionSummary,
  WorldAgentSessionCursor,
} from '@open-legend/protocol';
import { Button, Tag } from '../design-system/components';
import { post } from '../api';
import { readLocal, writeLocal } from './storage';
import { Inventions } from './inventions';
import { WorldInspection } from './world-inspection';
import { WorldAgentSession } from './world-agent-session';
import { UsageRemaining } from './usage-remaining';
import './creator-workspaces.css';
import { authoringKey } from './world-agent-identity';
import { WorldAgentReview } from './world-agent-review';

type Props = {
  mode: 'invent' | 'author' | 'inspect';
  worldId: string;
  accessScope: string;
  requestScope: string;
  inspectionScope: string;
  budget: GameView['ai']['budget'];
  actorId: string;
  godMode?: boolean;
  saveTimeline?: string;
  inventionSeed: { id: string; text: string } | null;
  invent(text: string): void;
  visible: boolean;
  recipes: RecipeView[];
  command(action: ActionOption): void;
  connected: boolean;
  conditionPolicyRevision: number;
  onStatusPolicyChanged(): void;
};

/** Ordinary invention and owner editing have separate entrances and retained state.
 * A presentation mode never grants the authority checked by the native handlers. */
export function WorldAgent(props: Props) {
  return (
    <WorldAgentPanel
      key={authoringKey(
        'panel-component',
        props.mode,
        props.worldId,
        props.accessScope,
        props.saveTimeline ?? null,
      )}
      {...props}
    />
  );
}

function WorldAgentPanel(props: Props) {
  const {
    mode,
    worldId,
    accessScope,
    requestScope,
    inspectionScope,
    budget,
    actorId,
    godMode,
    saveTimeline,
    inventionSeed,
    visible,
    recipes,
    command,
    connected,
    conditionPolicyRevision,
    onStatusPolicyChanged,
  } = props;
  const selectionKey = authoringKey(
    'conversation-selection',
    worldId,
    accessScope,
    saveTimeline ?? null,
  );
  const [active, setActive] = useState(
    () =>
      readLocal(
        selectionKey,
        '',
        (v): v is string => typeof v === 'string' && /^[\w-]{1,100}$/.test(v),
      ) || (mode === 'author' ? crypto.randomUUID() : ''),
  );
  const [sessions, setSessions] = useState<WorldAgentSessionSummary[]>([]);
  const [before, setBefore] = useState<WorldAgentSessionCursor | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  const listing = useRef(false);
  const [inventionTarget, setInventionTarget] = useState<string>();
  const [creationTarget, setCreationTarget] = useState<{ id: string; native: boolean }>();
  const [inspectionReview, setInspectionReview] = useState<{ sessionId: string; planId: string }>();
  const inspectionTask = useRef<HTMLDivElement>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (mode === 'author') writeLocal(selectionKey, active);
  }, [selectionKey, active, mode]);
  async function list(next?: WorldAgentSessionCursor) {
    if (mode !== 'author' || !godMode || !connected || listing.current) return;
    listing.current = true;
    setBusy(true);
    try {
      const r = await post<{
        ok: boolean;
        message?: string;
        data: { sessions: WorldAgentSessionSummary[]; next: WorldAgentSessionCursor | null };
      }>(
        '/api/world-agent/session/list',
        { worldId, ...(next ? { before: next } : {}) },
        AbortSignal.timeout(15000),
      );
      if (!r.ok) throw new Error(r.message ?? 'Could not read conversations.');
      if (!alive.current) return;
      setSessions((previous) => {
        const map = new Map((next ? previous : []).map((s) => [s.sessionId, s]));
        for (const session of r.data.sessions) map.set(session.sessionId, session);
        return [...map.values()];
      });
      setBefore(r.data.next);
      setError('');
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : 'Could not read conversations.');
    } finally {
      listing.current = false;
      if (alive.current) setBusy(false);
    }
  }
  useEffect(() => {
    if (visible) void list();
  }, [visible, connected, godMode, mode]);
  function create(purpose?: 'invention' | 'creation', native = false) {
    const id = crypto.randomUUID();
    setActive(id);
    setInventionTarget(purpose === 'invention' ? id : undefined);
    setCreationTarget(purpose === 'creation' ? { id, native } : undefined);
  }
  const activeTitle =
    sessions.find((session) => session.sessionId === active)?.title ??
    (inventionTarget === active
      ? 'New invention'
      : creationTarget?.id === active
        ? 'New world'
        : 'New conversation');
  const controls = (
    <div className="ol-creator-options">
      <h3>Conversations</h3>
      <div className="ol-agent-tools">
        <Button size="sm" variant="quiet" onPress={() => create()}>
          New conversation
        </Button>
        <Button size="sm" variant="quiet" onPress={() => create('invention')}>
          Design an invention
        </Button>
        <Button size="sm" variant="quiet" onPress={() => create('creation')}>
          Describe a new world
        </Button>
        <Button size="sm" variant="quiet" onPress={() => create('creation', true)}>
          Choose a starting world
        </Button>
      </div>
      <div className="ol-creator-records">
        {sessions.map((session) => (
          <Button
            key={session.sessionId}
            variant="quiet"
            aria-pressed={active === session.sessionId}
            onPress={() => setActive(session.sessionId)}
          >
            <strong>{session.title}</strong>
            {!session.available && <span className="ol-caption">Read-only history</span>}
          </Button>
        ))}
      </div>
      {!sessions.length && !busy && <p className="ol-caption">No saved conversations yet.</p>}
      <div className="ol-agent-tools">
        <Button size="sm" variant="quiet" disabled={busy} onPress={() => void list()}>
          Refresh conversations
        </Button>
        {before && (
          <Button size="sm" variant="quiet" disabled={busy} onPress={() => void list(before)}>
            Earlier conversations
          </Button>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
    </div>
  );
  if (mode === 'invent')
    return (
      <div className="ol-creator-workspace ol-creator-invent">
        <Inventions
          worldId={worldId}
          accessScope={accessScope}
          requestScope={requestScope}
          timeline={saveTimeline}
          seed={inventionSeed}
          visible={visible}
          recipes={recipes}
          command={command}
          connected={connected}
          allowance={
            <UsageRemaining
              limit={budget.limitUsd}
              spent={budget.accounts?.[actorId]?.spentUsd ?? 0}
              reserved={budget.accounts?.[actorId]?.reservedUsd ?? 0}
              available={connected && !!budget.accounts}
            />
          }
        />
      </div>
    );
  if (!godMode) return <p>God mode is required to open these tools.</p>;
  if (mode === 'inspect')
    return (
      <div className="ol-creator-workspace">
        <header className="ol-creator-context">
          <Tag tone="highlight">God mode</Tag>
          <p>Find objects and world rules, then inspect their relationships.</p>
        </header>
        <div ref={inspectionTask} tabIndex={-1}>
          <WorldInspection
            key={inspectionScope}
            actorId={actorId}
            worldId={worldId}
            sessionId={active || undefined}
            connected={connected}
            conditionPolicyRevision={conditionPolicyRevision}
            onRemovalPrepared={(sessionId, plan) => {
              if (!active) setActive(sessionId);
              setInspectionReview({ sessionId, planId: plan.id });
            }}
          />
        </div>
        {inspectionReview && (
          <WorldAgentReview
            key={authoringKey(
              'inspection-review',
              worldId,
              accessScope,
              saveTimeline ?? null,
              inspectionReview.sessionId,
              inspectionReview.planId,
            )}
            worldId={worldId}
            sessionId={inspectionReview.sessionId}
            planId={inspectionReview.planId}
            canApply={connected}
            mutationReason={!connected ? 'Reconnect before changing saved work.' : undefined}
            onClose={() => {
              setInspectionReview(undefined);
              requestAnimationFrame(() => {
                if (
                  document.activeElement === document.body ||
                  !document.activeElement?.isConnected
                )
                  (
                    inspectionTask.current?.querySelector<HTMLElement>('[data-removal-focus]') ??
                    inspectionTask.current
                  )?.focus({ preventScroll: true });
              });
            }}
            onChanged={() => undefined}
            onStatusPolicyChanged={onStatusPolicyChanged}
          />
        )}
      </div>
    );
  return (
    <div
      className="ol-agent ol-creator-workspace ol-creator-author"
      data-session={active ? '' : undefined}
    >
      <header className="ol-creator-heading">
        <div>
          <Tag tone="highlight">God mode</Tag>
          <h3 title={active ? activeTitle : undefined}>
            {active ? activeTitle : 'Shape this world'}
          </h3>
        </div>
        {sessions.some((session) => session.sessionId === active) && (
          <Button size="sm" variant="quiet" onPress={() => create()}>
            New chat
          </Button>
        )}
      </header>
      {active ? (
        <WorldAgentSession
          key={authoringKey(
            'session-component',
            worldId,
            accessScope,
            saveTimeline ?? null,
            active,
          )}
          worldId={worldId}
          accessScope={accessScope}
          sessionId={active}
          connected={connected}
          visible={visible}
          purpose={
            creationTarget?.id === active
              ? 'creation'
              : inventionTarget === active
                ? 'invention'
                : undefined
          }
          nativeCreation={creationTarget?.id === active ? creationTarget.native : undefined}
          onCreated={() => void list()}
          controls={controls}
          onStatusPolicyChanged={onStatusPolicyChanged}
        />
      ) : null}
    </div>
  );
}
