import { ConstructionCooperation } from './construction-cooperation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type {
  ApiResult,
  BoundaryConstructionChoices,
  BoundaryConstructionPlan,
  ConstructionShape,
  ConstructionView,
} from '@open-legend/protocol';
import { getScoped, post, postContactRead } from '../api';
import { playerActionStatusKey } from '../action-browser';
import { Button, SelectField } from '../design-system/components';
import { LoadingIndicator } from '../design-system/loading';
import type { ConstructionWorkProps } from './construction';

type Material = BoundaryConstructionChoices['materials'][number];
type EditOperation = BoundaryConstructionChoices['editOperations'][number]['operation'];
type Draft = {
  owner: string;
  mode?: 'post' | 'panel' | 'gate' | EditOperation;
  destination?: 'carried' | 'ground';
  railIds?: Array<string | undefined>;
  gateBindingIds?: Array<string | undefined>;
  repairInputIds?: Array<string | undefined>;
  gateSpan?: string;
  rootId?: string;
  itemId?: string;
  toolId?: string;
  binding1?: string;
  binding2?: string;
  slot?: string;
  span?: string;
  site?: BoundaryConstructionPlan['site'];
  orientation?: 0 | 1 | 2 | 3;
  placing?: boolean;
};
const rootKey = (id: string) => JSON.stringify(['root', id]);
const spanKey = (from: string, to: string) => JSON.stringify([from, to]);
type GateSpan = BoundaryConstructionChoices['roots'][number]['gateSpans'][number];
const gateSpanKey = (span: GateSpan) =>
  JSON.stringify([span.fromSlot, span.toSlot, span.thirdSlot, span.parkingSectionId]);
// Explicit choices survive refreshes. Defaults use only the remaining actual units,
// including when several selections draw from the same material lot.
function chooseUnits(rows: Material[], ids: Array<string | undefined> | undefined, count: number) {
  const selected = Array.from({ length: count }, (_, index) =>
    ids?.[index] === undefined ? undefined : rows.find((row) => row.id === ids[index]),
  );
  const used = new Map<string, number>();
  for (const row of selected) if (row) used.set(row.id, (used.get(row.id) ?? 0) + 1);
  return selected.map((row, index) => {
    if (ids?.[index] !== undefined) return row;
    const choice = rows.find(
      (candidate) =>
        candidate.eligible && candidate.availableAfterReplacing > (used.get(candidate.id) ?? 0),
    );
    if (choice) used.set(choice.id, (used.get(choice.id) ?? 0) + 1);
    return choice;
  });
}
const materialLabel = (item: Material) =>
  item.name +
  ' — ' +
  item.availableQuantity +
  ' free' +
  (item.availableAfterReplacing !== item.availableQuantity
    ? ', ' + item.availableAfterReplacing + ' after replacing current work'
    : '') +
  (item.reason ? ': ' + item.reason : '');

export function BoundaryConstruction({
  view,
  connected,
  visible,
  command,
  preview,
  placement,
  operations,
  registerResult,
}: ConstructionWorkProps) {
  const owner = JSON.stringify([
    view.worldId,
    view.saveTimeline,
    view.player.id,
    view.access?.privateDraftScope,
  ]);
  const active = visible && connected;
  const [availability, setAvailability] = useState({ active, revision: 0 });
  if (availability.active !== active)
    setAvailability({ active, revision: availability.revision + 1 });
  const [refresh, setRefresh] = useState(0);
  const [read, setRead] = useState<{
    owner: string;
    key: string;
    value?: ConstructionView;
    error?: string;
  }>();
  const rootsRevision = JSON.stringify(
    view.entities.flatMap((entity) =>
      entity.assembly?.implementation === 'grounded-panel-boundary'
        ? [[entity.id, entity.assembly.revision, entity.assembly.materialRevision]]
        : [],
    ),
  );
  const peopleKey = JSON.stringify(
    view.entities
      .filter((entity) => entity.kind === 'actor' && entity.id !== view.player.id)
      .map((entity) => [entity.id, entity.name]),
  );
  const readKey = JSON.stringify([
    peopleKey,
    owner,
    view.access?.scope,
    availability.revision,
    refresh,
    view.player.inventoryRevision,
    playerActionStatusKey(view.player),
    view.player.constructionRevision,
    rootsRevision,
  ]);
  const readTicket = useRef<string | undefined>(undefined);
  readTicket.current = active ? readKey : undefined;
  const ownRead = read?.owner === owner ? read : undefined;
  const response = ownRead?.value?.ok ? ownRead.value : undefined;
  const data = response?.boundary;
  const [draft, setDraft] = useState<Draft>();
  const ownDraft = draft?.owner === owner ? draft : undefined;
  const mode = ownDraft?.mode ?? 'post';
  const root = data?.roots.find((candidate) => candidate.id === ownDraft?.rootId);
  const editing = mode !== 'post' && mode !== 'panel' && mode !== 'gate';
  const repairing = mode === 'repair-boundary';
  const editOperation = data?.editOperations.find((operation) => operation.operation === mode);
  const editParts = root?.editableParts.filter((part) => part.operation === mode) ?? [];
  const editPart =
    ownDraft?.itemId === undefined
      ? editParts[0]
      : editParts.find((part) => part.id === ownDraft.itemId);
  const items =
    data?.materials.filter((item) =>
      mode === 'post'
        ? item.role === 'post' || item.role === 'gate-post'
        : mode === 'panel'
          ? item.role === 'panel' || item.role === 'access-panel'
          : item.role === 'gate',
    ) ?? [];
  const tools =
    data?.materials.filter((item) => item.role === (repairing ? 'repair-tool' : 'tool')) ?? [];
  const repairInputs = data?.materials.filter((item) => item.role === 'repair-input') ?? [];
  const selectedRepairInputs = chooseUnits(
    repairInputs,
    ownDraft?.repairInputIds,
    data?.repair.quantity ?? 0,
  );
  const bindings = data?.materials.filter((item) => item.role === 'binding') ?? [];
  const choose = (rows: Material[], id?: string) =>
    id === undefined
      ? (rows.find((item) => item.eligible) ?? rows[0])
      : rows.find((item) => item.id === id);
  const item = choose(items, ownDraft?.itemId),
    tool = choose(tools, ownDraft?.toolId);
  const binding1 = choose(bindings, ownDraft?.binding1);
  const binding2 =
    ownDraft?.binding2 === undefined
      ? bindings.find(
          (candidate) =>
            candidate.eligible &&
            (candidate.id !== binding1?.id || candidate.availableAfterReplacing >= 2),
        )
      : bindings.find((candidate) => candidate.id === ownDraft.binding2);
  const rails = data?.materials.filter((item) => item.role === 'rail') ?? [];
  const gateRails = chooseUnits(rails, ownDraft?.railIds, 2);
  const gateBindings = chooseUnits(
    bindings,
    ownDraft?.gateBindingIds,
    data?.gateBindingQuantity ?? 0,
  );
  const gateSpan =
    ownDraft?.gateSpan === undefined
      ? root?.gateSpans[0]
      : root?.gateSpans.find((candidate) => gateSpanKey(candidate) === ownDraft.gateSpan);
  const slot =
    ownDraft?.slot === undefined
      ? root
        ? root.postSlots[0]?.slot
        : data?.startSlot
      : root
        ? root.postSlots.find((candidate) => candidate.slot === ownDraft.slot)?.slot
        : ownDraft.slot;
  const span =
    ownDraft?.span === undefined
      ? root?.panelSpans[0]
      : root?.panelSpans.find(
          (candidate) => spanKey(candidate.fromSlot, candidate.toSlot) === ownDraft.span,
        );
  const site = root?.site ?? ownDraft?.site ?? response?.suggested;
  const orientation = root?.orientation ?? ownDraft?.orientation ?? 0;
  const planItem = editing ? editPart : item;
  const plan: BoundaryConstructionPlan | undefined =
    data &&
    planItem &&
    site &&
    (!ownDraft?.rootId || root) &&
    (editing
      ? !!root && !!editOperation && (!repairing || (!!tool && selectedRepairInputs.every(Boolean)))
      : mode === 'post'
        ? !!tool && !!slot
        : mode === 'panel'
          ? !!root && !!span && !!binding1 && !!binding2
          : !!root && !!gateSpan && gateRails.every(Boolean) && gateBindings.every(Boolean))
      ? {
          implementation: 'grounded-panel-boundary',
          familyId: data.definition.id,
          familyVersion: data.definition.version,
          familyDigest: data.definition.digest,
          site,
          orientation,
          ...(root ? { rootId: root.id, expectedRevision: root.revision } : {}),
          steps: editing
            ? repairing
              ? [
                  {
                    operation: 'repair-boundary',
                    itemId: planItem.id,
                    toolId: tool!.id,
                    inputIds: selectedRepairInputs.map((row) => row!.id),
                  },
                ]
              : [
                  {
                    operation: mode,
                    itemId: planItem.id,
                    ...((ownDraft?.destination ?? 'carried') === 'carried'
                      ? { destinationId: view.player.id }
                      : {}),
                  },
                ]
            : mode === 'post'
              ? [{ operation: 'post', slot: slot!, itemId: planItem.id, toolId: tool!.id }]
              : mode === 'panel'
                ? [
                    {
                      operation: 'boundary-panel',
                      fromSlot: span!.fromSlot,
                      toSlot: span!.toSlot,
                      itemId: planItem.id,
                      bindingIds: [binding1!.id, binding2!.id],
                    },
                  ]
                : [
                    {
                      operation: 'boundary-gate',
                      fromSlot: gateSpan!.fromSlot,
                      toSlot: gateSpan!.toSlot,
                      thirdSlot: gateSpan!.thirdSlot,
                      parkingSectionId: gateSpan!.parkingSectionId,
                      itemId: planItem.id,
                      railIds: [gateRails[0]!.id, gateRails[1]!.id],
                      bindingIds: gateBindings.map((row) => row!.id),
                    },
                  ],
        }
      : undefined;
  const required = editing
    ? repairing
      ? [tool, ...selectedRepairInputs]
      : []
    : mode === 'post'
      ? [item, tool]
      : mode === 'panel'
        ? [item, binding1, binding2]
        : [item, ...gateRails, ...gateBindings];
  const requiredCounts = new Map<string, number>();
  for (const row of required)
    if (row) requiredCounts.set(row.id, (requiredCounts.get(row.id) ?? 0) + 1);
  const stockReady = editing
    ? !!editPart &&
      !!editOperation &&
      required.every(
        (row) => !!row?.eligible && row.availableAfterReplacing >= requiredCounts.get(row.id)!,
      )
    : required.every(
        (row) => !!row?.eligible && row.availableAfterReplacing >= requiredCounts.get(row.id)!,
      );
  const [error, setError] = useState<{ owner: string; message: string }>();
  const [review, setReview] = useState<{
    key: string;
    plan: BoundaryConstructionPlan;
    result: ApiResult;
    shapes: ConstructionShape[];
  }>();
  const [checking, setChecking] = useState(false),
    [retry, setRetry] = useState(0);
  const [unsupported, setUnsupported] = useState(false);
  const unsupportedRef = useRef(false),
    submitting = useRef<{ owner: string } | undefined>(undefined),
    revision = useRef(0);
  const submitted = useRef<{ owner: string; revision: number } | undefined>(undefined);
  const key = JSON.stringify([
    readKey,
    plan,
    data?.authorized,
    view.commandEpoch,
    view.player.life,
    view.map.spatial.revision,
  ]);
  const current = useRef({ owner, key, usable: false, visible, site });
  function edit(patch: Partial<Draft> | ((value: Draft) => Partial<Draft>), clearReview = true) {
    if (current.current.owner !== owner) return;
    revision.current++;
    setDraft((previous) => {
      const own = previous?.owner === owner ? previous : { owner };
      return { ...own, ...(typeof patch === 'function' ? patch(own) : patch), owner };
    });
    setError(undefined);
    if (clearReview) {
      setReview(undefined);
      // An explicit selection can resolve to the same plan (including its
      // default). Clearing that check must still schedule its replacement.
      setRetry((value) => value + 1);
    }
  }
  function stopPlacement() {
    edit({ placing: false });
    unsupportedRef.current = false;
    setUnsupported(false);
    preview(null);
  }
  useLayoutEffect(() =>
    registerResult((result) => {
      if (submitted.current?.owner !== current.current.owner) return;
      if (submitting.current?.owner === current.current.owner) submitting.current = undefined;
      if (submitted.current.revision === revision.current)
        setDraft((previous) =>
          previous?.owner === current.current.owner ? { ...previous, placing: false } : previous,
        );
      setError({ owner: current.current.owner, message: result.ok ? '' : result.message });
      submitted.current = undefined;
      setRefresh((value) => value + 1);
    }),
  );
  const usable =
    active &&
    view.player.alive &&
    !view.clock.paused &&
    !operations.pending &&
    !!data?.authorized &&
    ownRead?.key === readKey &&
    !ownRead.error;
  current.current = { owner, key, usable, visible, site };
  const placing = !!ownDraft?.placing && !ownDraft.rootId;

  useEffect(() => {
    if (!active) return;
    const abort = new AbortController();
    let live = true;
    void getScoped<ConstructionView>(
      '/api/construction',
      AbortSignal.any([abort.signal, AbortSignal.timeout(15000)]),
    )
      .then((value) => {
        if (live && readTicket.current === readKey) setRead({ owner, key: readKey, value });
      })
      .catch((reason) => {
        if (live && !abort.signal.aborted && readTicket.current === readKey)
          setRead((previous) => ({
            owner,
            key: readKey,
            value: previous?.owner === owner ? previous.value : undefined,
            error: String(reason),
          }));
      });
    return () => {
      live = false;
      abort.abort();
    };
  }, [active, readKey]);

  useEffect(() => {
    if (!placing || !usable || !site) {
      placement(null);
      return;
    }
    placement({
      position: () => current.current.site ?? site,
      move(point) {
        if (!current.current.usable || submitting.current?.owner === owner) return;
        unsupportedRef.current = !point;
        setUnsupported(!point);
        if (point) edit({ site: point }, false);
      },
      place() {
        /* Selecting a point never starts work. */
      },
      rotate(delta) {
        if (!current.current.usable || submitting.current?.owner === owner) return;
        edit(
          (old) => ({ orientation: (((old.orientation ?? 0) + delta + 4) % 4) as 0 | 1 | 2 | 3 }),
          false,
        );
      },
      cancel: stopPlacement,
    });
    return () => placement(null);
  }, [placing, usable, !!site, orientation, owner]);

  useEffect(() => {
    if (!usable || !stockReady || !plan || unsupported || (!placing && !root)) return;
    const abort = new AbortController();
    let live = true;
    const timer = setTimeout(async () => {
      setChecking(true);
      try {
        const result = await postContactRead<ApiResult & { shapes: ConstructionShape[] }>(
          '/api/construction/preview',
          plan,
          [],
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
  }, [usable, stockReady, key, unsupported, placing, !!root, retry]);

  useEffect(() => {
    if (!usable || !review || !plan || (!placing && !root)) preview(null);
    else
      preview(review.shapes, !unsupported && review.key === key && review.result.ok, {
        origin: review.plan.site,
        position: plan.site,
        rotation: ((plan.orientation - review.plan.orientation) * Math.PI) / 2,
      });
  }, [usable, review, key, unsupported, placing, !!root]);
  useEffect(
    () => () => {
      preview(null);
      placement(null);
    },
    [],
  );

  async function start() {
    if (
      !current.current.usable ||
      submitting.current?.owner === owner ||
      unsupportedRef.current ||
      !review?.result.ok ||
      review.key !== current.current.key ||
      !data
    )
      return;
    const submission = { owner };
    submitting.current = submission;
    submitted.current = { owner, revision: revision.current };
    const step = review.plan.steps[0]!;
    // Keep the exact confirmed selections readable after their stock is installed;
    // a later refresh must not silently substitute another structural part.
    setDraft((previous) => ({
      ...previous,
      owner,
      itemId: step.itemId,
      ...(step.operation === 'post'
        ? { toolId: step.toolId, slot: step.slot }
        : step.operation === 'boundary-panel'
          ? {
              binding1: step.bindingIds[0],
              binding2: step.bindingIds[1],
              span: spanKey(step.fromSlot, step.toSlot),
            }
          : step.operation === 'boundary-gate'
            ? {
                railIds: step.railIds,
                gateBindingIds: step.bindingIds,
                gateSpan: gateSpanKey({ ...step, label: '' }),
              }
            : {}),
    }));
    try {
      const result = await operations.dispatch({
        id: 'construction',
        label: editing
          ? editOperation!.label
          : mode === 'post'
            ? data.postLabel
            : mode === 'panel'
              ? data.panelLabel
              : data.gateLabel,
        enabled: true,
        command: { type: 'construction', constructionPlan: review.plan },
      });
      if (current.current.key === key)
        setError({ owner, message: result.ok ? '' : result.message });
    } finally {
      if (submitting.current === submission) submitting.current = undefined;
    }
  }
  const materialPicker = (
    label: string,
    rows: Material[],
    selected: Material | undefined,
    onChange: (id: string) => void,
  ) => (
    <SelectField
      key={label}
      label={label}
      value={selected?.id}
      placeholder={'Choose ' + label.toLowerCase()}
      options={rows.map((value) => ({ id: value.id, label: materialLabel(value) }))}
      disabledKeys={rows.filter((value) => !value.eligible).map((value) => value.id)}
      disabled={!usable || !rows.length}
      onChange={onChange}
    />
  );

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
        </div>
      )}
      {operations.message && <p role="status">{operations.message}</p>}
      {ownRead?.error && (
        <div role="status">
          <p>Building choices could not be refreshed. Your draft is kept.</p>
          <Button disabled={!active} onPress={() => setRefresh((value) => value + 1)}>
            Retry building choices
          </Button>
        </div>
      )}
      {!data ? (
        <>
          <LoadingIndicator active={active && !ownRead} label="Reading building choices" />
          {ownRead && <p>No supported selection is available.</p>}
        </>
      ) : (
        <>
          <strong>{data.name}</strong>
          <p>{data.description}</p>
          <SelectField
            label="Structure"
            value={ownDraft?.rootId ? rootKey(ownDraft.rootId) : JSON.stringify(['new'])}
            options={[
              { id: JSON.stringify(['new']), label: 'New ' + data.name },
              ...data.roots.map((value, index) => ({
                id: rootKey(value.id),
                label: value.name + ' — ' + (index + 1),
              })),
            ]}
            disabled={!usable}
            onChange={(value) =>
              edit({
                rootId: data.roots.find((r) => rootKey(r.id) === value)?.id,
                itemId: undefined,
                slot: undefined,
                span: undefined,
                gateSpan: undefined,
                placing: false,
              })
            }
          />
          <SelectField
            label="Work"
            value={mode}
            options={[
              { id: 'post', label: data.postLabel },
              { id: 'panel', label: data.panelLabel },
              { id: 'gate', label: data.gateLabel },
              ...data.editOperations.map((operation) => ({
                id: operation.operation,
                label: operation.label,
              })),
            ]}
            disabled={!usable}
            onChange={(value) =>
              edit({ mode: value as Draft['mode'], itemId: undefined, placing: false })
            }
          />
          {editing ? (
            <>
              <SelectField
                label="Part"
                value={editPart?.id}
                options={editParts.map((part, index) => ({
                  id: part.id,
                  label: part.name + ' — ' + (index + 1),
                }))}
                disabled={!usable || !editParts.length}
                onChange={(itemId) => edit({ itemId })}
              />
              {!repairing && (
                <SelectField
                  label="Destination"
                  value={ownDraft?.destination ?? 'carried'}
                  options={[
                    { id: 'carried', label: 'My carried inventory' },
                    { id: 'ground', label: 'Supported ground beside the work' },
                  ]}
                  disabled={!usable}
                  onChange={(value) => edit({ destination: value as 'carried' | 'ground' })}
                />
              )}
              {repairing && (
                <>
                  {materialPicker('Kept tool', tools, tool, (id) => edit({ toolId: id }))}
                  {selectedRepairInputs.map((row, index) => (
                    <div key={index}>
                      {materialPicker(
                        data.repair.inputName + ' ' + (index + 1),
                        repairInputs,
                        row,
                        (id) => {
                          const ids = selectedRepairInputs.map((value) => value?.id);
                          ids[index] = id;
                          edit({ repairInputIds: ids });
                        },
                      )}
                    </div>
                  ))}
                  <p>
                    Uses {data.repair.quantity} × {data.repair.inputName}. Restores up to{' '}
                    {data.repair.amount} integrity; the tool is kept.
                  </p>
                </>
              )}
              {editPart && !repairing && (
                <p>
                  Returns:{' '}
                  {editPart.released.map((part) => part.quantity + ' × ' + part.name).join('; ')}.
                  Current condition is kept.
                </p>
              )}
              {!root ? (
                <p role="status">Choose an existing structure for this work.</p>
              ) : (
                !editPart && <p role="status">No current part is available for this selection.</p>
              )}
              {mode === 'reclaim-lowered' && (
                <p>
                  Inspect the actual ground pile, then refresh building choices to select its
                  protected material.
                </p>
              )}
              <Button
                variant="quiet"
                disabled={!active}
                onPress={() => setRefresh((value) => value + 1)}
              >
                Refresh building choices
              </Button>
            </>
          ) : (
            materialPicker('Material', items, item, (id) => edit({ itemId: id }))
          )}
          {editing ? null : mode === 'post' ? (
            <>
              {materialPicker('Kept tool', tools, tool, (id) => edit({ toolId: id }))}
              {root && (
                <SelectField
                  label="Position"
                  value={slot}
                  options={root.postSlots.map((value) => ({ id: value.slot, label: value.label }))}
                  disabled={!usable || !root.postSlots.length}
                  onChange={(value) => edit({ slot: value })}
                />
              )}
            </>
          ) : mode === 'panel' ? (
            <>
              {root && (
                <SelectField
                  label="Between supports"
                  value={span ? spanKey(span.fromSlot, span.toSlot) : undefined}
                  options={root.panelSpans.map((value) => ({
                    id: spanKey(value.fromSlot, value.toSlot),
                    label: value.label,
                  }))}
                  disabled={!usable || !root.panelSpans.length}
                  onChange={(value) => edit({ span: value })}
                />
              )}
              {materialPicker(data.bindingName + ' 1', bindings, binding1, (id) =>
                edit({ binding1: id }),
              )}
              {materialPicker(data.bindingName + ' 2', bindings, binding2, (id) =>
                edit({ binding2: id }),
              )}
              <p>
                {data.bindingQuantity} × {data.bindingName}.
              </p>
            </>
          ) : (
            <>
              <SelectField
                label="Gate position"
                value={gateSpan ? gateSpanKey(gateSpan) : undefined}
                options={(root?.gateSpans ?? []).map((candidate) => ({
                  id: gateSpanKey(candidate),
                  label: candidate.label,
                }))}
                disabled={!usable || !root?.gateSpans.length}
                onChange={(value) => edit({ gateSpan: value })}
              />
              {gateRails.map((selected, index) =>
                materialPicker(data.railName + ' ' + (index + 1), rails, selected, (id) =>
                  edit({ railIds: gateRails.map((row, i) => (i === index ? id : row?.id)) }),
                ),
              )}
              {gateBindings.map((selected, index) =>
                materialPicker(data.bindingName + ' ' + (index + 1), bindings, selected, (id) =>
                  edit({
                    gateBindingIds: gateBindings.map((row, i) => (i === index ? id : row?.id)),
                  }),
                ),
              )}
              <p>
                2 × {data.railName}; {data.gateBindingQuantity} × {data.bindingName}.
              </p>
            </>
          )}
          <p>
            {editing
              ? editOperation?.seconds
              : mode === 'post'
                ? data.postSeconds
                : mode === 'panel'
                  ? data.panelSeconds
                  : data.gateSeconds}{' '}
            work seconds, plus walking.
          </p>
          <p>{data.help}</p>
          {!data.authorized && <p role="status">Current construction permission is required.</p>}
          {ownDraft?.rootId && !root && (
            <p role="status">The selected structure is not currently available.</p>
          )}
          {mode === 'panel' && (!root || !span) && (
            <p role="status">
              {!root
                ? 'Choose an existing structure for this work.'
                : root.panelSpans.length
                  ? 'The earlier selected supports are no longer available.'
                  : 'No unjoined neighboring supports are available.'}
            </p>
          )}
          {mode === 'gate' && (!root || !gateSpan) && (
            <p role="status">
              {!root
                ? 'Choose an existing structure for this work.'
                : 'No current gate position is available. Review the supports and parking section.'}
            </p>
          )}
          {mode === 'post' && root && !slot && (
            <p role="status">Choose a current position for this work.</p>
          )}
          {!editing && !stockReady && (
            <p role="status">Choose enough available material and any required kept tool.</p>
          )}
          {!ownDraft?.rootId && mode === 'post' && !placing && (
            <Button
              disabled={!usable || !stockReady}
              onPress={() => {
                unsupportedRef.current = false;
                setUnsupported(false);
                edit({ placing: true, site, itemId: item?.id, toolId: tool?.id });
              }}
            >
              Choose a place
            </Button>
          )}
          {(placing || root) && (
            <div className="ol-placement-controls">
              {placing && (
                <p>
                  Move over supported ground or use the arrow keys. Rotate with Q/E or the button.
                  Start is separate; Escape cancels.
                </p>
              )}
              <p role="status">
                {unsupported
                  ? 'Choose supported ground.'
                  : review?.key === key
                    ? review.result.message
                    : 'Waiting for a current placement check.'}
              </p>
              <LoadingIndicator active={checking} label="Checking placement" />
              {view.player.hasWork && (
                <p>Starting replaces your current activity. Completed effects remain.</p>
              )}
              <ConstructionCooperation
                view={view}
                cooperation={response?.cooperation}
                plan={review?.key === key ? review.plan : undefined}
                ready={
                  usable && stockReady && !unsupported && review?.key === key && !!review.result.ok
                }
                operations={operations}
              />
              <div className="ol-actions">
                <Button
                  disabled={
                    !usable ||
                    !stockReady ||
                    unsupported ||
                    review?.key !== key ||
                    !review.result.ok
                  }
                  onPress={() => void start()}
                >
                  Start
                </Button>
                {placing && (
                  <Button
                    variant="quiet"
                    disabled={!usable}
                    onPress={() =>
                      edit(
                        (old) => ({
                          orientation: (((old.orientation ?? 0) + 1) % 4) as 0 | 1 | 2 | 3,
                        }),
                        false,
                      )
                    }
                  >
                    Rotate
                  </Button>
                )}
                {placing && response?.suggested && (
                  <Button
                    variant="quiet"
                    disabled={!usable}
                    onPress={() => {
                      unsupportedRef.current = false;
                      setUnsupported(false);
                      edit({ site: response.suggested }, false);
                    }}
                  >
                    Use suggested place
                  </Button>
                )}
                <Button
                  variant="quiet"
                  disabled={!usable || checking}
                  onPress={() => setRetry((value) => value + 1)}
                >
                  Check again
                </Button>
                {placing && (
                  <Button variant="quiet" onPress={stopPlacement}>
                    Cancel placement
                  </Button>
                )}
              </div>
            </div>
          )}
          {view.clock.paused && <p>Resume the world before checking or starting work.</p>}
          {!connected && <p>Reconnect before checking or starting. Your selection is kept.</p>}
        </>
      )}
      {error?.owner === owner && error.message && <p role="status">{error.message}</p>}
    </div>
  );
}
