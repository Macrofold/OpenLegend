import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type {
  ActionOption,
  GameView,
  RecipeView,
  WorldAgentSessionSummary,
  WorldAgentSessionCursor,
} from '@open-legend/protocol';
import { Button, EmptyState, Tag } from '../design-system/components';
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
  worldId: string;
  accessScope: string;
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
};
export function WorldAgent(props: Props) {
  // A restore changes authority and model context. Retained old sessions stay explicitly historical.
  return (
    <WorldAgentPanel
      key={authoringKey(
        'panel-component',
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
    worldId,
    accessScope,
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
  } = props;
  const navigationRef = useRef<HTMLDetailsElement>(null);
  const navigationId = useId();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const selectionKey = authoringKey(
    'conversation-selection',
    worldId,
    accessScope,
    saveTimeline ?? null,
  );
  const [active, setActive] = useState(() =>
    readLocal(
      selectionKey,
      '',
      (v): v is string => typeof v === 'string' && /^[\w-]{1,100}$/.test(v),
    ),
  );
  const [sessions, setSessions] = useState<WorldAgentSessionSummary[]>([]);
  const [before, setBefore] = useState<WorldAgentSessionCursor | null>(null);
  const [workspace, setWorkspace] = useState<'authoring' | 'workshop' | 'relationships'>(
    godMode ? 'authoring' : 'workshop',
  );
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const alive = useRef(true),
    listing = useRef(false);
  const seedSeen = useRef<string | undefined>(undefined);
  const [seedTarget, setSeedTarget] = useState<string>();
  const [inventionTarget, setInventionTarget] = useState<string>();
  const [creationTarget, setCreationTarget] = useState<{ id: string; native: boolean }>();
  const [inspectionReview, setInspectionReview] = useState<{ sessionId: string; planId: string }>();
  const [conditionPolicyRevision, setConditionPolicyRevision] = useState(0);
  const conditionPolicyChanged = useCallback(() => {
    setConditionPolicyRevision((revision) => revision + 1);
  }, []);
  const inspectionTask = useRef<HTMLDivElement>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    writeLocal(selectionKey, active);
  }, [selectionKey, active]);
  async function list(next?: WorldAgentSessionCursor) {
    if (!godMode || !connected || listing.current) return;
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
        for (const s of r.data.sessions) map.set(s.sessionId, s);
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
  }, [visible, connected, godMode]);
  useEffect(() => {
    if (inventionSeed && seedSeen.current !== inventionSeed.id) {
      seedSeen.current = inventionSeed.id;
      // An explicit Invent action starts its own draft; it cannot silently retarget
      // a retained policy conversation or dispatch before the person presses Send.
      const id = crypto.randomUUID();
      setActive(id);
      setSeedTarget(id);
      setInventionTarget(id);
      setWorkspace(godMode ? 'authoring' : 'workshop');
    }
  }, [inventionSeed, godMode]);
  function create(purpose?: 'invention' | 'creation', native = false) {
    const id = crypto.randomUUID();
    setActive(id);
    setInventionTarget(purpose === 'invention' ? id : undefined);
    setCreationTarget(purpose === 'creation' ? { id, native } : undefined);
    setSeedTarget(undefined);
    setWorkspace('authoring');
  }
  const activeTitle =
    sessions.find((session) => session.sessionId === active)?.title ??
    (inventionTarget === active
      ? 'New invention'
      : creationTarget?.id === active
        ? 'New world'
        : 'New conversation');
  const compactNavigation = !!godMode && workspace === 'authoring' && !!active;
  const closeNavigation = () => {
    if (navigationRef.current?.hasAttribute('data-compact')) navigationRef.current.open = false;
  };
  const navigation = (
    <nav
      id={navigationId}
      className="ol-creator-views ol-creator-navigation"
      aria-label="Creation workspaces"
      hidden={compactNavigation && !navigationOpen}
    >
      <Button
        variant="quiet"
        aria-pressed={workspace === 'workshop'}
        onPress={() => setWorkspace('workshop')}
      >
        Your workshop
      </Button>
      <Button
        variant="quiet"
        aria-pressed={workspace === 'authoring'}
        onPress={() => {
          setWorkspace('authoring');
          if (active)
            requestAnimationFrame(() => {
              const navigation = navigationRef.current;
              if (!navigation?.hasAttribute('data-compact')) return;
              navigation.open = false;
              navigation.querySelector('summary')?.focus();
            });
        }}
      >
        World authoring
      </Button>
      <Button
        variant="quiet"
        aria-pressed={workspace === 'relationships'}
        onPress={() => setWorkspace('relationships')}
      >
        Inspect world
      </Button>
    </nav>
  );
  const allowance = (
    <UsageRemaining
      limit={budget.limitUsd}
      spent={budget.accounts?.[actorId]?.spentUsd ?? 0}
      reserved={budget.accounts?.[actorId]?.reservedUsd ?? 0}
      available={connected && !!budget.accounts}
    />
  );
  const controls = (
    <>
      {allowance}
      <header className="ol-creator-context">
        <Tag tone="highlight">God mode · World authoring</Tag>
        <h3>{active ? activeTitle : 'Investigate and shape this world'}</h3>
        <p className="ol-caption">
          Discuss an idea in Conversation, inspect saved Work, then review an exact change before
          applying it.
        </p>
      </header>
      <div className="ol-agent-tools">
        <Button size="sm" variant="quiet" onPress={() => create()}>
          New conversation
        </Button>
        <Button size="sm" variant="quiet" onPress={() => create('invention')}>
          New invention
        </Button>
        <Button size="sm" variant="quiet" onPress={() => create('creation', true)}>
          Create a world
        </Button>
        <Button size="sm" variant="quiet" onPress={() => create('creation')}>
          Describe a world
        </Button>
      </div>
      <details className="ol-creator-history">
        <summary>Saved conversations and history</summary>
        <p className="ol-caption">
          Opening history only reads it. Ended conversations remain separate from new work.
        </p>
        <div className="ol-creator-records">
          {sessions.map((session) => (
            <Button
              key={session.sessionId}
              variant="quiet"
              aria-pressed={active === session.sessionId}
              onPress={() => setActive(session.sessionId)}
            >
              <strong>{session.title}</strong>
              <span className="ol-caption">
                {session.available ? 'Available conversation' : 'History · read only'}
              </span>
            </Button>
          ))}
        </div>
        {!sessions.length && !busy && (
          <p className="ol-caption">No saved conversations on this page.</p>
        )}
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
      </details>
      {error && <p role="alert">{error}</p>}
    </>
  );
  return (
    <div
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || event.defaultPrevented || event.nativeEvent.isComposing)
          return;
        const target = event.target;
        if (
          !(target instanceof Element) ||
          !event.currentTarget.contains(target) ||
          target.closest('[aria-modal="true"]')
        )
          return;
        const owned =
          '.ol-creator-workspace-switch[data-compact][open], .ol-world-agent-controls[open]';
        const disclosure =
          target.closest<HTMLDetailsElement>(owned) ??
          event.currentTarget.querySelector<HTMLDetailsElement>(owned);
        if (!disclosure) return;
        event.preventDefault();
        event.stopPropagation();
        disclosure.open = false;
        disclosure.querySelector('summary')?.focus();
      }}
      className="ol-agent ol-creator-workspace"
      data-session={compactNavigation ? '' : undefined}
    >
      {godMode && (
        <>
          <details
            ref={navigationRef}
            className="ol-creator-workspace-switch"
            data-compact={compactNavigation || undefined}
            open={!compactNavigation}
            onToggle={(event) => {
              const open = compactNavigation && event.currentTarget.open;
              setNavigationOpen(open);
              if (open) {
                const details =
                  event.currentTarget.parentElement?.querySelector<HTMLDetailsElement>(
                    '.ol-world-agent-controls[open]',
                  );
                if (details) details.open = false;
              }
            }}
          >
            <summary
              hidden={!compactNavigation}
              aria-label="Creation workspaces"
              aria-controls={navigationId}
            >
              <span className="ol-creator-workspace-label">Creation workspaces</span>
              <span className="ol-creator-workspace-label-short" aria-hidden="true">
                Workspaces
              </span>
            </summary>
          </details>
          {navigation}
        </>
      )}
      {(!godMode || workspace !== 'authoring') && allowance}
      {godMode && (
        <div hidden={workspace !== 'authoring'} className="ol-creator-page ol-creator-authoring">
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
              visible={visible && workspace === 'authoring'}
              seed={seedTarget === active ? inventionSeed : null}
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
              navigationOpen={compactNavigation && navigationOpen}
              closeNavigation={closeNavigation}
              onStatusPolicyChanged={conditionPolicyChanged}
            />
          ) : (
            <>
              {controls}
              <EmptyState title="Investigate and create in one conversation">
                <Button onPress={() => create()}>New conversation</Button>
              </EmptyState>
            </>
          )}
        </div>
      )}
      {godMode && (
        <div hidden={workspace !== 'relationships'} className="ol-creator-page">
          <div ref={inspectionTask} tabIndex={-1}>
            {/* Read results expire independently of this same-owner writing workspace.
                docs/memory-architecture.md#private-retrieval-fencing */}
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
                void list();
              }}
            />
          </div>
        </div>
      )}
      {godMode && inspectionReview && (
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
              if (document.activeElement === document.body || !document.activeElement?.isConnected)
                (
                  inspectionTask.current?.querySelector<HTMLElement>('[data-removal-focus]') ??
                  inspectionTask.current
                )?.focus({ preventScroll: true });
            });
          }}
          onChanged={() => void list()}
          onStatusPolicyChanged={conditionPolicyChanged}
        />
      )}
      <div hidden={workspace !== 'workshop'} className="ol-creator-page">
        <Inventions
          worldId={worldId}
          accessScope={accessScope}
          seed={godMode ? null : inventionSeed}
          visible={visible && workspace === 'workshop'}
          recipes={recipes}
          command={command}
          connected={connected}
        />
      </div>
    </div>
  );
}
