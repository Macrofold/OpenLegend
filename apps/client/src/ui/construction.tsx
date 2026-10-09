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
import { Button, Section, SelectField } from '../design-system/components';
import './construction.css';
export function Construction({
  view,
  connected,
  visible,
  command,
  preview,
}: {
  view: GameView;
  connected: boolean;
  visible: boolean;
  command(action: ActionOption): Promise<ApiResult | undefined>;
  preview(shapes: readonly ConstructionShape[] | null, valid?: boolean): void;
}) {
  const [opened, setOpened] = useState(false),
    [data, setData] = useState<ConstructionView>(),
    [error, setError] = useState(''),
    [readError, setReadError] = useState(''),
    [readRevision, setReadRevision] = useState(0),
    [busy, setBusy] = useState(false);
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
  const roots = view.entities.filter((entity) => entity.assembly),
    root = roots.find((entity) => entity.id === rootId);
  useEffect(() => {
    if (!opened || !visible || !connected) return;
    const abort = new AbortController();
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      try {
        const next = await getScoped<ConstructionView>('/api/construction', abort.signal);
        if (live) {
          setData(next);
          setReadError('');
          setSite((old) => old ?? next.suggested);
        }
      } catch (reason) {
        if (live && !abort.signal.aborted) setReadError(String(reason));
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
  }, [opened, visible, connected, view.access?.scope, view.saveTimeline, readRevision]);
  const { covers, defaultBindings, postOptionsByHeight, coverOptions, bindingOptions } =
    useMemo(() => {
      const materials = data?.materials ?? [],
        posts = materials.filter((m) => m.role === 'post' && m.eligible),
        covers = materials.filter((m) => m.role === 'cover' && m.eligible),
        bindings = materials.filter((m) => m.role === 'binding' && m.eligible);
      // Only four units are needed. Clock/player updates reuse these choices, and
      // a large stock list never expands every binding lot merely to take its prefix.
      const defaultBindings: string[] = [];
      for (const binding of bindings) {
        const units = Math.min(4 - defaultBindings.length, binding.quantity);
        for (let n = 0; n < units; n++) defaultBindings.push(binding.id);
        if (defaultBindings.length === 4) break;
      }
      const options = (choices: typeof materials) =>
        choices.map((item) => ({
          id: item.id,
          label: `${item.name} · ${item.quantity}${item.condition ? ` · ${item.condition}` : ''}`,
        }));
      const postOptionsByHeight = new Map<number, ReturnType<typeof options>>();
      for (const p of posts) {
        if (!p.postHeight) continue;
        const group = postOptionsByHeight.get(p.postHeight) ?? [];
        group.push({ id: p.id, label: `${p.name} · ${p.quantity}` });
        postOptionsByHeight.set(p.postHeight, group);
      }
      return {
        posts,
        covers,
        defaultBindings,
        postOptionsByHeight,
        coverOptions: options(covers),
        bindingOptions: options(bindings),
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
  const plan = useMemo<ConstructionPlan | undefined>(
    () =>
      !data || !site || (rootId && !root)
        ? undefined
        : {
            familyId: data.family.id,
            arrangementId: arrangement?.id ?? '',
            operation,
            site: root?.assembly?.site ?? site,
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
  const key = JSON.stringify(plan);
  const currentKey = useRef(key);
  currentKey.current = key;
  useEffect(() => {
    if (!visible || !opened || readError || !review || review.key !== key) preview(null);
    else preview(review.shapes, review.result.ok);
  }, [visible, opened, readError, key, review]);
  useEffect(() => () => preview(null), []);
  const invoke = (
    type: ActionOption['command']['type'],
    label: string,
    extra: Partial<ActionOption['command']> = {},
  ) => command({ id: `construction-${type}`, label, enabled: true, command: { type, ...extra } });
  const check = async () => {
    if (!plan || readError) return;
    setBusy(true);
    setError('');
    try {
      const result = await post<ApiResult & { shapes: ConstructionShape[] }>(
        '/api/construction/preview',
        plan,
      );
      if (currentKey.current === key) {
        setReview({ result, shapes: result.shapes, plan, key });
      }
    } catch (reason) {
      setError(String(reason));
    } finally {
      setBusy(false);
    }
  };
  const start = async () => {
    if (readError || !review?.result.ok || review.key !== key) return;
    setBusy(true);
    try {
      const result = await invoke('construction', 'Start selected construction', {
        constructionPlan: review.plan,
      });
      if (result) {
        setError(result.ok ? '' : result.message);
        if (result.ok) {
          preview(null);
          setReview(undefined);
        }
      }
      setReadRevision((revision) => revision + 1);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Section title="Make a place">
      <Button onPress={() => setOpened(!opened)}>
        {opened ? 'Close shelter controls' : 'Preview a shelter'}
      </Button>
      {opened && (
        <div className="ol-construction">
          {!connected ? (
            <p>Reconnect to inspect the current place and materials.</p>
          ) : !data ? (
            <p>Reading current building choices…</p>
          ) : (
            <>
              <p>{data.family.description}</p>
              <p className="ol-caption">{data.family.help}</p>
              {view.player.activity?.name === data.family.name && (
                <p role="status">
                  {view.player.activity.status === 'active'
                    ? `${view.player.action?.label ?? 'Preparing the next phase'}${view.player.action ? ` · ${Math.ceil((view.player.action.durationSeconds - view.player.action.elapsedSeconds) / 60)} game minutes remaining` : ''}`
                    : view.player.activity.status === 'blocked'
                      ? `Work stopped: ${view.player.activity.reason ?? 'Review the current place and materials.'}`
                      : view.player.activity.status === 'completed'
                        ? 'The selected work is complete.'
                        : 'Work stopped. Completed parts remain.'}
                </p>
              )}
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
                  setOutgoingId('');
                  setReview(undefined);
                }}
              />
              {root?.assembly && (
                <>
                  <p>
                    {root.assembly.parts.filter((p) => p.role === 'post').length} installed posts ·{' '}
                    {root.assembly.parts.filter((p) => p.role === 'cover').length} coverings
                  </p>
                  <div className="ol-actions">
                    {root.assembly.parts
                      .filter((p) => p.role === 'cover')
                      .map((part) => (
                        <Button
                          key={part.id}
                          disabled={!connected || view.clock.paused}
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
                      disabled={!connected || view.clock.paused}
                      onPress={() =>
                        void invoke('move', 'Visit this place', { position: root.assembly!.site })
                      }
                    >
                      Walk here
                    </Button>
                    <Button
                      disabled={!connected || view.clock.paused}
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
                          {part.condition ? ` · ${part.condition}` : ''}
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
                    }}
                  />
                  {!root && (
                    <>
                      <SelectField
                        label="Arrangement"
                        value={arrangement?.id ?? ''}
                        options={data.family.arrangements.map((a) => ({ id: a.id, label: a.name }))}
                        onChange={(id) => {
                          setArrangementId(id);
                          setPostIds([]);
                          setReview(undefined);
                        }}
                      />
                      <p className="ol-caption">{arrangement?.description}</p>
                      <div className="ol-construction-coordinates">
                        <label>
                          Ground X
                          <input
                            type="number"
                            step="0.25"
                            value={site?.x ?? 0}
                            onChange={(e) => setSite({ ...site!, x: e.target.valueAsNumber })}
                          />
                        </label>
                        <label>
                          Ground Z
                          <input
                            type="number"
                            step="0.25"
                            value={site?.z ?? 0}
                            onChange={(e) => setSite({ ...site!, z: e.target.valueAsNumber })}
                          />
                        </label>
                      </div>
                      <SelectField
                        label="Orientation"
                        value={String(heading)}
                        options={[0, 1, 2, 3].map((id) => ({
                          id: String(id),
                          label: `${id * 90}°`,
                        }))}
                        onChange={(id) => setHeading(Number(id) as 0 | 1 | 2 | 3)}
                      />
                    </>
                  )}
                  {['replace', 'lower'].includes(operation) && (
                    <SelectField
                      label="Actual covering to remove"
                      value={outgoingId}
                      options={
                        root?.assembly?.parts
                          .filter((p) => p.role === 'cover')
                          .map((p) => ({ id: p.id, label: `${p.name} · bay ${p.bay + 1}` })) ?? []
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
                  {Array.from({ length: missing }, (_, i) => (
                    <SelectField
                      key={`post-${i}`}
                      label={`Actual post ${i + 1} · ${arrangement?.rowHeights[Number(requiredSlots[i]?.split(':')[1])]?.toFixed(2)} m`}
                      value={chosenPosts[i]}
                      options={
                        postOptionsByHeight.get(
                          arrangement?.rowHeights[Number(requiredSlots[i]?.split(':')[1])] ?? 0,
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
                        label="Actual covering"
                        value={coverId || covers[0]?.id}
                        options={coverOptions}
                        onChange={setCoverId}
                      />
                      {[0, 1, 2, 3].map((i) => (
                        <SelectField
                          key={i}
                          label={`Binding unit ${i + 1}`}
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
                        Select enough eligible material for the remaining work. Reclaim parts or
                        choose another arrangement if stock is missing.
                      </p>
                    )}
                  <p className="ol-caption">
                    Each post takes {data.family.postSeconds / 60} game minutes. Fastening a
                    covering takes {data.family.coverSeconds / 60}, including work at every corner.
                    Stop releases unused material and leaves completed parts.
                  </p>
                  <div className="ol-actions">
                    <Button
                      busy={busy}
                      disabled={!plan || !!readError}
                      onPress={() => void check()}
                    >
                      Review placement and materials
                    </Button>
                    <Button
                      variant="primary"
                      busy={busy}
                      disabled={
                        !!readError || !review?.result.ok || review.key !== key || view.clock.paused
                      }
                      onPress={() => void start()}
                    >
                      Start selected work
                    </Button>
                    <Button
                      disabled={!connected}
                      onPress={() => void invoke('cancel', 'Stop current work')}
                    >
                      Stop current work
                    </Button>
                  </div>
                  {view.clock.paused && (
                    <p className="ol-caption">Resume the world to start the selected work.</p>
                  )}
                  {review && (
                    <p role="status">
                      {review.key !== key
                        ? 'The place or selections changed. Review again.'
                        : review.result.message}
                    </p>
                  )}
                </>
              )}
              {data.canCueShower && (
                <Button
                  disabled={!connected || view.clock.paused}
                  onPress={() =>
                    void post<ApiResult>('/api/god/canopy-shower', { id: crypto.randomUUID() })
                      .then((result) => {
                        setError(result.message);
                        setReadRevision((revision) => revision + 1);
                      })
                      .catch((reason) => setError(String(reason)))
                  }
                >
                  Run a {data.family.showerSeconds / 60}-minute shower
                </Button>
              )}
              {data.weather && (
                <p>
                  {view.clock.seconds < data.weather.endsAt
                    ? `The shower has ${Math.ceil((data.weather.endsAt - view.clock.seconds) / 60)} game minutes remaining.`
                    : 'The shower ended.'}{' '}
                  Drying continues during ordinary world time.
                </p>
              )}
            </>
          )}
          {error && <p role="status">{error}</p>}
          {readError && (
            <p role="status">
              Building choices could not be refreshed. Your selections are kept; editing will be
              available after the next successful read.
            </p>
          )}
        </div>
      )}
    </Section>
  );
}
