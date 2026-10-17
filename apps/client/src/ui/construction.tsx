import { LoadingIndicator } from '../design-system/loading';
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  ActionOption,
  ApiResult,
  ConstructionPlan,
  ConstructionShape,
  ConstructionView,
  GameView,
} from '@open-legend/protocol';
import { getScoped, post } from '../api';
import type { CommandDispatcher } from '../command-request';
import { Button, SelectField } from '../design-system/components';
import { useInventoryCommand } from './use-inventory-command';
import type { ConstructionPlacement, ConstructionPreviewTransform } from '../world-renderer';
import { ConstructionIllustration } from './construction-illustration';
import './construction.css';
export function Construction({
  view,
  connected,
  visible,
  command,
  preview,
  placement,
}: {
  view: GameView;
  connected: boolean;
  visible: boolean;
  command: CommandDispatcher;
  preview(
    shapes: readonly ConstructionShape[] | null,
    valid?: boolean,
    transform?: ConstructionPreviewTransform,
  ): void;
  placement(controls: ConstructionPlacement | null): void;
}) {
  const [placing, setPlacing] = useState(false),
    [commitRequested, setCommitRequested] = useState(false),
    [unsupportedPoint, setUnsupportedPoint] = useState(false),
    [read, setRead] = useState<{
      key: string;
      owner: string;
      value?: ConstructionView;
      error?: string;
    }>(),
    [error, setError] = useState(''),
    [readRevision, setReadRevision] = useState(0),
    [busyScope, setBusyScope] = useState<string>();
  const available = visible && connected;
  const owner = JSON.stringify([
    view.worldId,
    view.saveTimeline,
    view.player.id,
    view.access?.privateDraftScope,
  ]);
  const currentOwner = useRef(owner);
  currentOwner.current = owner;
  const placementRevision = useRef(0);
  const submittedPlacement = useRef<{ owner: string; revision: number } | null>(null);
  function choosePlacement(active: boolean) {
    placementRevision.current++;
    setPlacing(active);
    setCommitRequested(false);
    setUnsupportedPoint(false);
    setReview(undefined);
    preview(null);
  }
  const [availability, setAvailability] = useState({ available, revision: 0 });
  if (availability.available !== available)
    setAvailability({ available, revision: availability.revision + 1 });
  const readKey = JSON.stringify([
    view.access?.scope,
    view.saveTimeline,
    availability.revision,
    readRevision,
  ]);
  const currentReadKey = useRef<string | null>(null);
  // Drafts survive same-owner Resume; old material facts and checked ghosts do not.
  // Fence completions during render, before the earlier read's Effect cleans up.
  currentReadKey.current = available ? readKey : null;
  // Pausing a tab suspends commands, not the player's view of the materials.
  // Ownership/timeline loss still removes private information immediately.
  const currentRead = read?.owner === owner ? read : undefined;
  const data = currentRead?.value?.ok ? currentRead.value : undefined;
  const unsupported = currentRead?.value?.ok === false ? currentRead.value.message : '';
  const readError = currentRead?.error ?? '';
  const busy = available && busyScope === readKey;
  const [operation, setOperation] = useState<ConstructionPlan['operation']>('build'),
    [rootId, setRootId] = useState(''),
    [arrangementId, setArrangementId] = useState(''),
    [coverId, setCoverId] = useState(''),
    [outgoingId, setOutgoingId] = useState(''),
    [postIds, setPostIds] = useState<string[]>([]),
    [bindingIds, setBindingIds] = useState<string[]>([]);
  const [site, setSite] = useState<ConstructionPlan['site']>(),
    [heading, setHeading] = useState<0 | 1 | 2 | 3>(0),
    [keepCovered, setKeepCovered] = useState(true),
    [review, setReview] = useState<{
      result: ApiResult;
      shapes: ConstructionShape[];
      plan: ConstructionPlan;
      key: string;
    }>();
  const roots = view.entities.filter(
      (entity) => !!data && entity.assembly?.familyId === data.family.id,
    ),
    root = roots.find((entity) => entity.id === rootId);
  useEffect(() => {
    if (!available) return;
    const abort = new AbortController();
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      try {
        const next = await getScoped<ConstructionView>(
          '/api/construction',
          AbortSignal.any([abort.signal, AbortSignal.timeout(15000)]),
        );
        if (live && currentReadKey.current === readKey) {
          setRead({ key: readKey, owner, value: next });
          if (next.ok) {
            setSite((old) => old ?? next.suggested);
          } else {
            setReview(undefined);
            preview(null);
          }
        }
      } catch (reason) {
        if (live && !abort.signal.aborted && currentReadKey.current === readKey)
          setRead((previous) => ({
            key: readKey,
            owner,
            value: previous?.owner === owner ? previous.value : undefined,
            error: String(reason),
          }));
      } finally {
        // One read at a time. A completed write restarts this owner and aborts its
        // older read, so slow polling cannot restore outdated material choices.
        if (live) timer = setTimeout(() => void load(), 2000);
      }
    };
    void load();
    return () => {
      live = false;
      abort.abort();
      clearTimeout(timer);
    };
  }, [available, readKey]);
  const {
    covers,
    defaultBindings,
    postOptionsByHeight,
    coverOptions,
    bindingOptions,
    materialsById,
  } = useMemo(() => {
    const materials = data?.materials ?? [],
      posts = materials.filter((m) => m.role === 'post' && m.eligible),
      covers = materials.filter((m) => m.role === 'cover' && m.eligible),
      bindings = materials.filter((m) => m.role === 'binding' && m.eligible);
    // Only four units are needed. Clock/player updates reuse these choices, and
    // a large stock list never expands every binding lot merely to take its prefix.
    const defaultBindings: string[] = [];
    for (const binding of bindings) {
      const units = Math.min(4 - defaultBindings.length, binding.availableQuantity);
      for (let n = 0; n < units; n++) defaultBindings.push(binding.id);
      if (defaultBindings.length === 4) break;
    }
    const options = (choices: typeof materials) =>
      choices.map((item) => ({
        id: item.id,
        label: `${item.name}, ${item.availableQuantity === item.quantity ? item.quantity : `${item.availableQuantity} available of ${item.quantity}`}${item.condition ? `, ${item.condition}` : ''}`,
      }));
    const postOptionsByHeight = new Map<number, ReturnType<typeof options>>();
    for (const p of posts) {
      if (!p.postHeight) continue;
      const group = postOptionsByHeight.get(p.postHeight) ?? [];
      group.push({ id: p.id, label: `${p.name}, ${p.availableQuantity}` });
      postOptionsByHeight.set(p.postHeight, group);
    }
    return {
      posts,
      covers,
      defaultBindings,
      postOptionsByHeight,
      coverOptions: options(covers),
      bindingOptions: options(bindings),
      materialsById: new Map(materials.map((material) => [material.id, material])),
    };
  }, [data]);
  const bay =
    operation === 'extend'
      ? 1
      : operation === 'replace'
        ? (root?.assembly?.parts.find((p) => p.id === outgoingId)?.bay ?? 0)
        : operation === 'resume' && root?.assembly?.parts.some((p) => p.bay === 1)
          ? 1
          : 0;
  const arrangement = data?.family.arrangements.find(
    (a) =>
      a.id ===
      (root?.assembly?.arrangementId ?? (arrangementId || data.family.defaultArrangementId)),
  );
  const requiredSlots = ['build', 'extend', 'resume'].includes(operation)
    ? [`${bay}:0`, `${bay}:1`, `${bay + 1}:1`, `${bay + 1}:0`].filter(
        (slot) => !root?.assembly?.parts.some((p) => p.role === 'post' && p.slot === slot),
      )
    : [];
  const missing = requiredSlots.length;
  const chosenPosts: string[] = [];
  const usedPosts = new Set(postIds);
  for (const [i, slot] of requiredSlots.entries()) {
    const height = arrangement?.rowHeights[Number(slot.split(':')[1])];
    const selected =
      postIds[i] ??
      postOptionsByHeight.get(height ?? 0)?.find((p) => !usedPosts.has(p.id))?.id ??
      '';
    chosenPosts.push(selected);
    usedPosts.add(selected);
  }
  const installing = ['build', 'extend', 'replace', 'resume'].includes(operation);
  const selectedSite = root?.assembly?.site ?? site;
  const plan = useMemo<ConstructionPlan | undefined>(
    () =>
      !data || !selectedSite || (rootId && !root)
        ? undefined
        : {
            familyId: data.family.id,
            arrangementId: arrangement?.id ?? '',
            operation,
            site: selectedSite,
            orientation: root?.assembly
              ? (Math.round(root.assembly.heading / (Math.PI / 2)) as 0 | 1 | 2 | 3)
              : heading,
            ...(root ? { rootId: root.id, expectedRevision: root.assembly!.revision } : {}),
            postIds: chosenPosts.filter(Boolean),
            ...(installing
              ? {
                  coverId: coverId || covers[0]?.id,
                  bindingIds: Array.from(
                    { length: 4 },
                    (_, i) => bindingIds[i] ?? defaultBindings[i] ?? '',
                  ).filter(Boolean),
                }
              : { bindingIds: [] }),
            ...(outgoingId ? { outgoingId } : {}),
            destinationId: view.player.id,
            keepCovered,
          },
    [
      data,
      site,
      operation,
      rootId,
      root,
      heading,
      arrangement,
      JSON.stringify(chosenPosts),
      missing,
      postIds,
      coverId,
      bindingIds,
      outgoingId,
      keepCovered,
      view.player.id,
    ],
  );
  // Refresh only facts this read can represent, rather than every clock revision.
  // Actual placement and permission are checked again by native Start admission.
  const key = useMemo(
    () =>
      JSON.stringify([
        readKey,
        plan,
        data?.family,
        data?.authorized,
        plan &&
          [
            ...new Set([
              ...plan.postIds,
              ...plan.bindingIds,
              ...(plan.coverId ? [plan.coverId] : []),
            ]),
          ].map((id) => materialsById.get(id) ?? { id, unavailable: true }),
        plan?.operation === 'reclaim'
          ? data?.lowered.find((material) => material.id === plan.outgoingId)
          : undefined,
      ]),
    [readKey, plan, data?.family, data?.authorized, data?.lowered, materialsById],
  );
  const currentKey = useRef(key);
  currentKey.current = key;
  useEffect(() => {
    if (
      !available ||
      !placing ||
      !data?.authorized ||
      readError ||
      read?.key !== readKey ||
      !review ||
      !plan
    )
      preview(null);
    else
      preview(review.shapes, !unsupportedPoint && review.key === key && review.result.ok, {
        origin: review.plan.site,
        position: plan.site,
        rotation: ((plan.orientation - review.plan.orientation) * Math.PI) / 2,
      });
  }, [available, placing, key, review, unsupportedPoint, readError, read?.key, readKey]);
  useEffect(
    () => () => {
      preview(null);
      placement(null);
    },
    [],
  );
  const operations = useInventoryCommand({
    worldId: view.worldId,
    actorId: view.player.id,
    timeline: view.saveTimeline,
    scope: view.access?.scope ?? '',
    recoveryScope: view.access?.commandRecoveryScope,
    epoch: view.commandEpoch,
    connected,
    command,
    task: 'construction',
    onResolved(result) {
      const submitted = submittedPlacement.current;
      if (
        result.ok &&
        submitted?.owner === currentOwner.current &&
        submitted.revision === placementRevision.current
      ) {
        // A receipt may arrive after reconnect or after its material refresh.
        // Clear only the placement that submitted it, never a newer selection.
        choosePlacement(false);
      }
      submittedPlacement.current = null;
      setError(result.ok ? '' : result.message);
      setReadRevision((revision) => revision + 1);
    },
  });
  const canCommand = connected && !operations.pending;
  const invoke = (
    type: ActionOption['command']['type'],
    label: string,
    extra: Partial<ActionOption['command']> = {},
  ) => {
    if (type !== 'construction') submittedPlacement.current = null;
    return operations.dispatch({
      id: `construction-${type}`,
      label,
      enabled: true,
      command: { type, ...extra },
    });
  };
  const checking = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      checking.current?.abort();
      checking.current = null;
    },
    [available, readKey],
  );
  const submitting = useRef(false);
  const [previewRevision, setPreviewRevision] = useState(0);
  const check = async () => {
    if (
      checking.current ||
      interaction.current.unsupportedPoint ||
      !plan ||
      !data?.authorized ||
      readError ||
      read?.key !== readKey ||
      currentReadKey.current !== readKey
    )
      return;
    const abort = new AbortController();
    checking.current = abort;
    const checkedPlacement = placementRevision.current;
    setBusyScope(readKey);
    setError('');
    try {
      const result = await post<ApiResult & { shapes: ConstructionShape[] }>(
        '/api/construction/preview',
        plan,
        AbortSignal.any([abort.signal, AbortSignal.timeout(15000)]),
      );
      if (
        checking.current === abort &&
        currentKey.current === key &&
        placementRevision.current === checkedPlacement
      ) {
        setReview({ result, shapes: result.shapes, plan, key });
      }
    } catch {
      if (
        checking.current === abort &&
        currentKey.current === key &&
        placementRevision.current === checkedPlacement
      ) {
        setReview({
          result: {
            ok: false,
            code: 'unavailable',
            message: 'The placement check could not finish. Check again before building.',
          },
          shapes: [],
          plan,
          key,
        });
        setCommitRequested(false);
      }
    } finally {
      if (checking.current === abort) {
        checking.current = null;
        setBusyScope((current) => (current === readKey ? undefined : current));
        if (currentKey.current !== key || placementRevision.current !== checkedPlacement)
          setPreviewRevision((value) => value + 1);
      }
    }
  };
  const start = async () => {
    if (
      !canCommand ||
      submitting.current ||
      interaction.current.unsupportedPoint ||
      !placing ||
      !data?.authorized ||
      view.clock.paused ||
      readError ||
      currentReadKey.current !== readKey ||
      !review?.result.ok ||
      review.key !== key
    )
      return;
    submitting.current = true;
    setBusyScope(readKey);
    submittedPlacement.current = { owner, revision: placementRevision.current };
    try {
      const result = await invoke('construction', 'Start selected construction', {
        constructionPlan: review.plan,
      });
      if (currentKey.current !== key) return;
      if (result) setError(result.ok ? '' : result.message);
    } finally {
      submitting.current = false;
      setBusyScope((current) => (current === readKey ? undefined : current));
    }
  };
  const interaction = useRef({
    commitRequested,
    connected,
    site,
    unsupportedPoint,
    pending: !!operations.pending,
  });
  interaction.current = {
    commitRequested,
    connected,
    site,
    unsupportedPoint,
    pending: !!operations.pending,
  };
  function requestPlacement() {
    if (
      interaction.current.commitRequested ||
      !interaction.current.connected ||
      interaction.current.unsupportedPoint ||
      interaction.current.pending ||
      submitting.current
    )
      return;
    // A completed edit keeps the selected structure but ends its preview. The
    // next explicit action must be able to check that same work choice again.
    if (root) setPlacing(true);
    interaction.current.commitRequested = true;
    setCommitRequested(true);
  }
  useEffect(() => {
    if (
      !placing ||
      !available ||
      !site ||
      root ||
      !data?.authorized ||
      readError ||
      read?.key !== readKey ||
      view.clock.paused ||
      operations.pending
    ) {
      placement(null);
      return;
    }
    placement({
      position: () => interaction.current.site ?? site,
      move(point) {
        if (
          interaction.current.commitRequested ||
          interaction.current.pending ||
          submitting.current
        )
          return;
        // Retain the draft's location without treating a blocked ray as a choice
        // of that older location. The ref fences confirmation before React renders.
        interaction.current.unsupportedPoint = !point;
        setUnsupportedPoint(!point);
        if (point) {
          interaction.current.site = point;
          setSite(point);
        }
      },
      place: requestPlacement,
      rotate(direction) {
        if (
          !interaction.current.commitRequested &&
          !interaction.current.pending &&
          !submitting.current
        )
          setHeading((old) => ((old + direction + 4) % 4) as 0 | 1 | 2 | 3);
      },
      cancel() {
        choosePlacement(false);
      },
    });
    return () => placement(null);
  }, [
    placing,
    available,
    !!site,
    rootId,
    data?.authorized,
    readError,
    read?.key,
    readKey,
    view.clock.paused,
    !!operations.pending,
  ]);
  useEffect(() => {
    if (!placing || !available || !plan || unsupportedPoint || readError || operations.pending)
      return;
    // One settled pointer position is checked; obsolete replies cannot replace it.
    const timer = setTimeout(() => void check(), commitRequested ? 0 : 180);
    return () => clearTimeout(timer);
  }, [
    placing,
    available,
    key,
    read?.key,
    commitRequested,
    unsupportedPoint,
    !!operations.pending,
    previewRevision,
  ]);
  useEffect(() => {
    if (!commitRequested || review?.key !== key || !available) return;
    setCommitRequested(false);
    if (review.result.ok) void start();
    else setError(review.result.message);
  }, [commitRequested, review, key, available]);
  const actionStatusVisible = !!(data?.authorized && (!rootId || root) && (placing || root));
  const readNotice = readError ? (
    <p role="status">
      Building choices could not be refreshed. Your selections are kept; checking and building will
      return when current choices are available.
    </p>
  ) : null;
  return (
    <div className="ol-building-workspace">
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
            <p>The original action could not be read. New construction actions remain blocked.</p>
          )}
        </div>
      )}
      {operations.message && <p role="status">{operations.message}</p>}
      {
        <div className="ol-construction">
          {!actionStatusVisible && readNotice}
          {unsupported ? (
            <p role="status">{unsupported}</p>
          ) : !data ? (
            !readError &&
            (connected ? (
              <LoadingIndicator active label="Reading building choices" />
            ) : (
              <p>Building choices will be available when you reconnect.</p>
            ))
          ) : (
            <>
              {!placing && !root && (
                <p className="ol-caption">Choose what to build, then place it in the world.</p>
              )}
              {view.player.activity?.name === data.family.name && (
                <p role="status">
                  {view.player.activity.status === 'active'
                    ? `${view.player.action?.label ?? 'Preparing the next phase'}${view.player.action ? `, ${Math.ceil((view.player.action.durationSeconds - view.player.action.elapsedSeconds) / 60)} game minutes remaining` : ''}`
                    : view.player.activity.status === 'blocked'
                      ? `Work stopped: ${view.player.activity.reason ?? 'Review the current place and materials.'}`
                      : view.player.activity.status === 'completed'
                        ? 'The selected work is complete.'
                        : 'Work stopped. Completed parts remain.'}
                </p>
              )}
              {(roots.length > 0 || rootId) && (
                <details className="ol-building-existing" open={!!rootId}>
                  <summary>Work on an existing structure</summary>
                  <SelectField
                    label="Structure"
                    value={rootId}
                    options={[
                      { id: '', label: 'New place' },
                      ...(rootId && !root
                        ? [{ id: rootId, label: 'Selected structure is not in view' }]
                        : []),
                      ...roots.map((e) => ({ id: e.id, label: e.name })),
                    ]}
                    onChange={(id) => {
                      setRootId(id);
                      setPostIds([]);
                      setOperation(id ? 'resume' : 'build');
                      choosePlacement(!!id);
                      setOutgoingId('');
                      setReview(undefined);
                    }}
                  />
                </details>
              )}
              {root?.assembly && (
                <>
                  <p>
                    {root.assembly.parts.filter((p) => p.role === 'post').length} installed posts,{' '}
                    {root.assembly.parts.filter((p) => p.role === 'cover').length} coverings
                  </p>
                  <div className="ol-actions">
                    {root.assembly.parts
                      .filter((p) => p.role === 'cover')
                      .map((part) => (
                        <Button
                          key={part.id}
                          disabled={!canCommand || view.clock.paused}
                          onPress={() =>
                            void invoke('construction-rest', 'Rest in covered bay', {
                              targetId: root.id,
                              bay: part.bay,
                            })
                          }
                        >
                          Rest in bay {part.bay + 1}
                        </Button>
                      ))}
                    <Button
                      disabled={!canCommand || view.clock.paused}
                      onPress={() =>
                        void invoke('move', 'Visit this place', { position: root.assembly!.site })
                      }
                    >
                      Walk here
                    </Button>
                    <Button
                      disabled={!canCommand || view.clock.paused}
                      onPress={() =>
                        void invoke('say', 'Invite a visitor', { text: data.family.invitationText })
                      }
                    >
                      Invite someone nearby
                    </Button>
                  </div>
                  <p className="ol-caption">
                    {view.clock.paused ? 'Resume the world to walk, rest or invite someone. ' : ''}
                    {data.family.useHelp}
                  </p>
                  <ul>
                    {root.assembly.parts
                      .filter((p) => p.role !== 'binding')
                      .map((part) => (
                        <li key={part.id}>
                          {part.name}
                          {part.condition ? `, ${part.condition}` : ''}
                        </li>
                      ))}
                  </ul>
                </>
              )}
              {rootId && !root ? (
                <p>
                  The selected structure is not in view. Bring it back into view or choose another
                  place.
                </p>
              ) : !data.authorized ? (
                <p>
                  You may visit and rest here. You have no current permission to edit the structure.
                </p>
              ) : (
                <>
                  {root && (
                    <SelectField
                      label="Work"
                      value={operation}
                      options={(root
                        ? [
                            'resume',
                            ...(arrangement?.maximumBays === 2 ? ['extend'] : []),
                            'replace',
                            'lower',
                            'dismantle',
                            'reclaim',
                          ]
                        : ['build']
                      ).map((id) => ({
                        id,
                        label: data.family.planLabels[id as ConstructionPlan['operation']],
                      }))}
                      onChange={(id) => {
                        setOperation(id as ConstructionPlan['operation']);
                        setPostIds([]);
                        setReview(undefined);
                        choosePlacement(true);
                      }}
                    />
                  )}
                  {!root && (
                    <>
                      <div
                        className="ol-building-catalogue"
                        aria-label="Building choices"
                        hidden={placing}
                      >
                        {data.family.arrangements.map((choice) => (
                          <button
                            type="button"
                            className="ol-building-tile"
                            key={choice.id}
                            aria-pressed={arrangement?.id === choice.id && placing}
                            onClick={() => {
                              setArrangementId(choice.id);
                              setPostIds([]);
                              setReview(undefined);
                              choosePlacement(true);
                            }}
                          >
                            <ConstructionIllustration arrangement={choice} family={data.family} />
                            <strong>{choice.name}</strong>
                          </button>
                        ))}
                      </div>
                      {placing && (
                        <div
                          className="ol-placement-controls"
                          role="group"
                          aria-label="Place building"
                        >
                          <strong>{arrangement?.name}</strong>
                          <p>
                            Point or use arrow keys to place. Click or Enter builds. Q / E rotate.
                            Escape cancels.
                          </p>
                          <div className="ol-actions">
                            <Button
                              size="sm"
                              disabled={commitRequested || !!operations.pending}
                              onPress={() => setHeading((old) => ((old + 3) % 4) as 0 | 1 | 2 | 3)}
                            >
                              Rotate left
                            </Button>
                            <Button
                              size="sm"
                              disabled={commitRequested || !!operations.pending}
                              onPress={() => setHeading((old) => ((old + 1) % 4) as 0 | 1 | 2 | 3)}
                            >
                              Rotate right
                            </Button>
                            <Button
                              size="sm"
                              variant="quiet"
                              onPress={() => {
                                choosePlacement(false);
                              }}
                            >
                              Cancel placement
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {['replace', 'lower'].includes(operation) && (
                    <SelectField
                      label="Actual covering to remove"
                      value={outgoingId}
                      options={
                        root?.assembly?.parts
                          .filter((p) => p.role === 'cover')
                          .map((p) => ({ id: p.id, label: `${p.name}, bay ${p.bay + 1}` })) ?? []
                      }
                      onChange={setOutgoingId}
                    />
                  )}
                  {operation === 'replace' && (
                    <label>
                      <input
                        type="checkbox"
                        checked={keepCovered}
                        onChange={(e) => setKeepCovered(e.target.checked)}
                      />
                      {data.family.replacementHelp}
                    </label>
                  )}
                  {operation === 'reclaim' && (
                    <SelectField
                      label="Actual lowered material"
                      value={outgoingId}
                      options={data.lowered
                        .filter((m) => m.rootId === rootId)
                        .map((m) => ({ id: m.id, label: m.name }))}
                      onChange={setOutgoingId}
                    />
                  )}
                  {(placing || root) && (
                    <>
                      <details className="ol-building-materials">
                        <summary>
                          Materials{installing ? `: ${missing} posts, 1 covering, 4 bindings` : ''}
                        </summary>
                        {Array.from({ length: missing }, (_, i) => (
                          <SelectField
                            key={`post-${i}`}
                            label={`Post ${i + 1}, ${arrangement?.rowHeights[Number(requiredSlots[i]?.split(':')[1])]?.toFixed(2)} m`}
                            value={chosenPosts[i]}
                            options={
                              postOptionsByHeight.get(
                                arrangement?.rowHeights[Number(requiredSlots[i]?.split(':')[1])] ??
                                  0,
                              ) ?? []
                            }
                            onChange={(id) =>
                              setPostIds((old) => {
                                const next = [...old];
                                next[i] = id;
                                return next;
                              })
                            }
                          />
                        ))}
                        {installing && (
                          <>
                            <SelectField
                              label="Covering"
                              value={coverId || covers[0]?.id}
                              options={coverOptions}
                              onChange={setCoverId}
                            />
                            {[0, 1, 2, 3].map((i) => (
                              <SelectField
                                key={i}
                                label={`Binding ${i + 1}`}
                                value={bindingIds[i] ?? defaultBindings[i]}
                                options={bindingOptions}
                                onChange={(id) =>
                                  setBindingIds((old) => {
                                    const next = [...old];
                                    next[i] = id;
                                    return next;
                                  })
                                }
                              />
                            ))}
                          </>
                        )}
                        {installing &&
                          (chosenPosts.some((id) => !id) ||
                            !covers.length ||
                            defaultBindings.length < 4) && (
                            <p role="status">
                              Select enough eligible material for the remaining work. Reclaim parts
                              or choose another arrangement if stock is missing.
                            </p>
                          )}
                      </details>
                      <div className="ol-actions">
                        <Button
                          busy={busy}
                          disabled={!connected || !plan || unsupportedPoint || !!readError}
                          onPress={() => void check()}
                        >
                          Check placement
                        </Button>
                        <Button
                          variant="primary"
                          busy={busy}
                          disabled={
                            !canCommand ||
                            !!readError ||
                            (!placing && !root) ||
                            !plan ||
                            unsupportedPoint ||
                            view.clock.paused
                          }
                          onPress={requestPlacement}
                        >
                          {root ? data.family.planLabels[operation] : 'Build here'}
                        </Button>
                        {view.player.hasWork && (
                          <Button
                            disabled={!canCommand}
                            onPress={() => void invoke('cancel', 'Stop current work')}
                          >
                            Stop current work
                          </Button>
                        )}
                      </div>
                      {view.clock.paused && (
                        <p className="ol-caption">Resume the world to start the selected work.</p>
                      )}
                      {readError ? (
                        readNotice
                      ) : unsupportedPoint ? (
                        <p role="status">Choose a visible supported surface.</p>
                      ) : review ? (
                        <p role="status">
                          {review.key !== key
                            ? 'The place, materials or permissions changed. Review again.'
                            : review.result.message}
                        </p>
                      ) : null}
                      <details className="ol-building-details">
                        <summary>Building details</summary>
                        {arrangement?.description && <p>{arrangement.description}</p>}
                        <p className="ol-caption">
                          Each post takes {data.family.postSeconds / 60} game minutes. Fastening a
                          covering takes {data.family.coverSeconds / 60}, including work at every
                          corner. Stop releases unused material and leaves completed parts.
                        </p>
                        <p className="ol-caption">
                          The preview shows the last checked placement. Starting work checks the
                          current place, materials and permissions again.
                        </p>
                      </details>
                    </>
                  )}
                </>
              )}
              {data.canCueShower && (
                <details>
                  <summary>Developer tools</summary>
                  <Button
                    disabled={!connected || view.clock.paused}
                    onPress={() =>
                      void post<ApiResult>('/api/god/construction-shower', {
                        id: crypto.randomUUID(),
                      })
                        .then((result) => {
                          setError(result.message);
                          setReadRevision((revision) => revision + 1);
                        })
                        .catch((reason) => setError(String(reason)))
                    }
                  >
                    {data.shower?.actionLabel}
                  </Button>
                </details>
              )}
              {data.weather && data.shower && (
                <p>
                  {view.clock.seconds < data.weather.endsAt
                    ? data.shower.remainingText.replace(
                        '{minutes}',
                        String(Math.ceil((data.weather.endsAt - view.clock.seconds) / 60)),
                      )
                    : data.shower.endedText}
                </p>
              )}
            </>
          )}
          {error && <p role="status">{error}</p>}
        </div>
      }
    </div>
  );
}
