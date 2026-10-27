import { useEffect, useRef, useState } from 'react';
import type {
  ApiResult,
  ConstructionShape,
  HearthConstructionView,
  HearthPlan,
} from '@open-legend/protocol';
import { getScoped, post } from '../api';
import { playerActionStatusKey } from '../action-browser';
import { Button, Icon, SelectField } from '../design-system/components';
import { LoadingIndicator } from '../design-system/loading';
import { useInventoryCommand } from './use-inventory-command';
import type { ConstructionProps } from './construction';

export function HearthConstruction({
  view,
  connected,
  visible,
  readVisible,
  command,
  preview,
  placement,
  onCatalogue,
  onCatalogueFailure,
  readRetry,
}: ConstructionProps & {
  readVisible: boolean;
  onCatalogue(value: HearthConstructionView): void;
  onCatalogueFailure(): void;
  readRetry: number;
}) {
  const owner = JSON.stringify([
    view.worldId,
    view.saveTimeline,
    view.player.id,
    view.access?.privateDraftScope,
  ]);
  const [refresh, setRefresh] = useState(0);
  const [availability, setAvailability] = useState({ connected, revision: 0 });
  if (availability.connected !== connected)
    setAvailability({ connected, revision: availability.revision + 1 });
  const readKey = JSON.stringify([
    owner,
    view.access?.scope,
    refresh,
    availability.revision,
    view.player.constructionRevision,
    readRetry,
  ]);
  const currentReadKey = useRef<string | undefined>(undefined);
  currentReadKey.current = readVisible && connected ? readKey : undefined;
  const [read, setRead] = useState<{
    owner: string;
    key: string;
    value?: HearthConstructionView;
    error?: string;
  }>();
  const data = read?.owner === owner ? read.value : undefined;
  const readError = read?.owner === owner ? read.error : undefined;
  const [draft, setDraft] = useState<{
    owner: string;
    definitionId: string;
    site?: HearthPlan['site'];
    placing: boolean;
  }>();
  const ownDraft = draft?.owner === owner ? draft : undefined;
  const choice =
    ownDraft?.definitionId === undefined
      ? data?.choices[0]
      : data?.choices.find((candidate) => candidate.definition.id === ownDraft.definitionId);
  const site = ownDraft?.site ?? data?.suggested;
  const placing = !!ownDraft?.placing;
  const plan = choice && site ? { definition: choice.definition, site } : undefined;
  const key = JSON.stringify([
    readKey,
    plan,
    view.commandEpoch,
    view.player.inventoryRevision,
    playerActionStatusKey(view.player),
    view.map.spatial.revision,
    data?.authorityRevision,
    data?.authorized,
  ]);
  const current = useRef({ owner, key, visible, connected, paused: view.clock.paused });
  current.current = { owner, key, visible, connected, paused: view.clock.paused };
  const [review, setReview] = useState<{
    key: string;
    plan: HearthPlan;
    result: ApiResult;
    shapes: ConstructionShape[];
  }>();
  const [error, retainError] = useState<{ owner: string; message: string }>();
  const setError = (message: string) => retainError({ owner, message });
  const [checking, setChecking] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const unsupportedRef = useRef(false);
  const revision = useRef(0);
  const submitted = useRef<{ owner: string; revision: number } | undefined>(undefined);
  const submitting = useRef(false);
  const [retry, setRetry] = useState(0);
  function stopPlacement() {
    revision.current++;
    setDraft((old) => (old?.owner === owner ? { ...old, placing: false } : old));
    setReview(undefined);
    unsupportedRef.current = false;
    setUnsupported(false);
    preview(null);
  }
  const operations = useInventoryCommand({
    worldId: view.worldId,
    actorId: view.player.id,
    timeline: view.saveTimeline,
    scope: view.access?.scope ?? '',
    recoveryScope: view.access?.commandRecoveryScope,
    epoch: view.commandEpoch,
    connected,
    task: 'hearth',
    command,
    onResolved(result) {
      if (
        result.ok &&
        submitted.current?.owner === current.current.owner &&
        submitted.current.revision === revision.current
      )
        stopPlacement();
      submitted.current = undefined;
      setError(result.ok ? '' : result.message);
      setRefresh((value) => value + 1);
    },
  });
  const usable =
    visible &&
    connected &&
    view.player.alive &&
    !view.clock.paused &&
    !operations.pending &&
    !!choice &&
    !!data?.authorized &&
    read?.key === readKey &&
    !readError;
  const interaction = useRef({ site, usable });
  interaction.current = { site, usable };
  useEffect(() => {
    if (!readVisible || !connected) return;
    const abort = new AbortController();
    let live = true;
    async function load() {
      try {
        const value = await getScoped<HearthConstructionView>(
          '/api/construction/hearths',
          AbortSignal.any([abort.signal, AbortSignal.timeout(15000)]),
        );
        if (live && currentReadKey.current === readKey) {
          setRead({ owner, key: readKey, value });
          onCatalogue(value);
        }
      } catch (reason) {
        if (live && !abort.signal.aborted && currentReadKey.current === readKey) {
          onCatalogueFailure();
          setRead((old) => ({
            owner,
            key: readKey,
            value: old?.owner === owner ? old.value : undefined,
            error: String(reason),
          }));
        }
      }
    }
    void load();
    return () => {
      live = false;
      abort.abort();
    };
  }, [readVisible, connected, readKey, onCatalogue, onCatalogueFailure]);
  useEffect(() => {
    if (!placing || !usable || !site) {
      placement(null);
      return;
    }
    placement({
      position: () => interaction.current.site ?? site,
      move(point) {
        if (!interaction.current.usable || submitting.current) return;
        revision.current++;
        unsupportedRef.current = !point;
        setUnsupported(!point);
        if (point)
          setDraft({ owner, definitionId: choice!.definition.id, site: point, placing: true });
      },
      place() {
        /* Placement selects a site. Starting work remains an explicit button. */
      },
      rotate() {
        /* This installed shape is round. */
      },
      cancel: stopPlacement,
    });
    return () => placement(null);
  }, [placing, usable, !!site, choice?.definition.id, owner]);
  useEffect(() => {
    if (!placing || !usable || !plan || unsupported) return;
    const abort = new AbortController();
    let live = true;
    const timer = setTimeout(async () => {
      setChecking(true);
      try {
        const result = await post<ApiResult & { shapes: ConstructionShape[] }>(
          '/api/construction/hearth-preview',
          plan,
          AbortSignal.any([abort.signal, AbortSignal.timeout(25000)]),
        );
        // Repeated pointer events can keep the exact same selection. Only the
        // complete selection/permission key and this effect's lifetime stale a read;
        // draft revisions separately protect late command completion.
        if (live && current.current.key === key && current.current.visible)
          setReview({ key, plan, result, shapes: result.shapes });
      } catch {
        if (live && current.current.key === key)
          setReview({
            key,
            plan,
            shapes: [],
            result: {
              ok: false,
              code: 'unavailable',
              message: 'The placement check could not finish. Check again before starting.',
            },
          });
      } finally {
        if (live) setChecking(false);
      }
    }, 180);
    return () => {
      live = false;
      abort.abort();
      clearTimeout(timer);
      setChecking(false);
    };
  }, [placing, usable, key, unsupported, retry]);
  useEffect(() => {
    if (!placing || !usable || !review || !plan) preview(null);
    else
      preview(review.shapes, !unsupported && review.key === key && review.result.ok, {
        origin: review.plan.site,
        position: plan.site,
        rotation: 0,
      });
  }, [placing, usable, review, key, unsupported]);
  useEffect(
    () => () => {
      preview(null);
      placement(null);
    },
    [],
  );
  async function start() {
    if (
      !interaction.current.usable ||
      unsupportedRef.current ||
      submitting.current ||
      !placing ||
      !review?.result.ok ||
      review.key !== current.current.key ||
      !choice
    )
      return;
    submitting.current = true;
    submitted.current = { owner, revision: revision.current };
    try {
      const result = await operations.dispatch({
        id: 'place-hearth',
        label: choice.actionLabel,
        enabled: true,
        command: { type: 'place-hearth', hearthPlan: review.plan },
      });
      if (current.current.key === key) setError(result.ok ? '' : result.message);
    } finally {
      submitting.current = false;
    }
  }
  return (
    <div className="ol-building-workspace ol-construction">
      {operations.pending && (
        <div role="status">
          <p>
            {operations.pending.request?.label ?? 'Earlier construction action'}:{' '}
            {operations.pending.status === 'sending'
              ? 'Sending'
              : operations.pending.status === 'checking'
                ? 'Checking the original result'
                : 'Original request needs recovery'}
          </p>
          <Button
            disabled={!connected || operations.pending.status !== 'unknown'}
            onPress={() => void operations.check()}
          >
            {operations.pending.request ? 'Check result' : 'Read retained request'}
          </Button>
          {!operations.pending.request && (
            <p>The original action could not be read. New construction remains blocked.</p>
          )}
        </div>
      )}
      {operations.message && <p role="status">{operations.message}</p>}
      {data && data.choices.length > 0 && (data.choices.length > 1 || !choice) && (
        <SelectField
          label="Build"
          value={choice?.definition.id}
          placeholder="Choose a supported definition"
          options={data.choices.map((value) => ({
            id: value.definition.id,
            label: value.name,
          }))}
          onChange={(definitionId) => {
            stopPlacement();
            setDraft({ owner, definitionId, site, placing: false });
          }}
        />
      )}
      {!data ? (
        connected ? (
          <LoadingIndicator active label="Reading building choices" />
        ) : (
          <p>Reconnect to read building choices.</p>
        )
      ) : !choice ? (
        <p role="status">
          {ownDraft?.definitionId && data.choices.length
            ? 'The earlier selected definition is no longer available. Choose another to continue.'
            : 'No supported definitions are installed.'}
        </p>
      ) : (
        <>
          <p>
            <Icon name={choice.icon} /> <strong>{choice.name}</strong>
          </p>
          <p>{choice.description}</p>
          <p>
            {choice.inputQuantity} × {choice.inputName}; {choice.workSeconds} work seconds, plus
            walking.
          </p>
          <p>{choice.help}</p>
          {!data.authorized && <p role="status">{data.reason}</p>}
          {!placing ? (
            <Button
              disabled={!usable}
              onPress={() => {
                revision.current++;
                setReview(undefined);
                setError('');
                setDraft({ owner, definitionId: choice.definition.id, site, placing: true });
              }}
            >
              Choose a place
            </Button>
          ) : (
            <div className="ol-placement-controls">
              <p>
                Move the pointer over supported ground, or use the arrow keys to move the preview.
                Choose Start when the placement check is ready. Escape cancels.
              </p>
              {unsupported ? (
                <p role="status">Choose supported ground.</p>
              ) : review?.key === key ? (
                <p role="status">{review.result.message}</p>
              ) : (
                <p role="status">Waiting for a current placement check.</p>
              )}
              <LoadingIndicator active={checking} label="Checking placement" />
              {view.player.hasWork && (
                <p>Starting this work replaces your current activity. Completed effects remain.</p>
              )}
              <div className="ol-actions">
                <Button
                  disabled={!usable || unsupported || review?.key !== key || !review.result.ok}
                  onPress={() => void start()}
                >
                  Start
                </Button>
                <Button variant="quiet" onPress={stopPlacement}>
                  Cancel placement
                </Button>
                <Button
                  variant="quiet"
                  disabled={!usable || checking}
                  onPress={() => setRetry((value) => value + 1)}
                >
                  Check again
                </Button>
              </div>
            </div>
          )}
          {view.clock.paused && <p>Resume the world to choose a place or start work.</p>}
          {!connected && <p>Reconnect before checking or starting. Your selection is kept.</p>}
        </>
      )}
      {error?.owner === owner && error.message && <p role="status">{error.message}</p>}
    </div>
  );
}
