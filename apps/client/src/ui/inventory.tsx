import { JadeGlass } from '../design-system/jade-glass';
import { inventoryCommandStorageKey } from '../inventory-command-record';
import { RecipeDetails } from './recipe-details';
import { namePhrase } from '@open-legend/language';
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from 'react';
import { Popover } from 'react-aria-components';
import type {
  ActionOption,
  ContainerPage,
  GameView,
  InventoryItemView,
  InventoryItemSummary,
  InventoryTransferSource,
  ApiResult,
} from '@open-legend/protocol';
import { post } from '../api';
import type { CommandDispatcher, CommandRequestIdentity } from '../command-request';
import { Button, Tag } from '../design-system/components';
import { ItemIllustration } from '../design-system/item-illustration';
import { LoadingDialog, LoadingIndicator } from '../design-system/loading';
import { InventoryCollection, type InventorySide } from './inventory-collection';
import { InventoryHistory, MergeTargets } from './inventory-details';
import { InventoryQuantity, exactQuantity } from './inventory-controls';
import { InventoryOffer } from './inventory-offer';
import { ItemTrade, type TradeNegotiationTarget } from './item-trade';
import { useInventoryCollection } from './use-inventory-collection';
import { useInventoryCommand, type InventoryCommandRecovery } from './use-inventory-command';
import './inventory.css';
import { inventoryPresentation, type InventoryPresentation } from './inventory-presentation';
import { BagWindow } from './bag-window';
import type { OpenContainerRequest } from './container-opening';
import type { InventoryCollectionState } from './use-inventory-collection';

type InventoryProps = {
  bagWindowHost: HTMLElement | null;
  bagWindowsVisible: boolean;
  bagSheetVisible: boolean;
  onActivateBagWindow(): void;
  onShowBelongings(opener?: HTMLElement): void;
  onBagWindowsEmpty(): void;
  onNegotiationTarget?(target: TradeNegotiationTarget, clear?: boolean): void;
  tradeCommand(action: ActionOption, tradeScope: string): Promise<ApiResult>;
  tradeRecovery: InventoryCommandRecovery;
  tradeRequestKey?: string;
  view: GameView;
  addItem(): void;
  chooseWork?(item: InventoryItemView): void;
  browseActions?(
    item: InventoryItemSummary,
    opener: Element,
    dispatchCommand: (action: ActionOption) => Promise<ApiResult>,
  ): void;
  contextMenu(
    item: InventoryItemView,
    point: { x: number; y: number },
    opener: HTMLElement,
    dispatchCommand: (action: ActionOption) => Promise<ApiResult>,
  ): void;
  command: CommandDispatcher;
  connected: boolean;
  visible: boolean;
  narrow: boolean;
  showHeading?: boolean;
  openContainer?: OpenContainerRequest;
};
type Selection = { side: InventorySide; itemId: string; actions: boolean };
type AmountDraft = {
  operation: 'move' | 'split' | 'drop' | 'offer';
  item: InventoryItemView;
  source: ContainerPage['container'];
  target?: ContainerPage['container'];
  targetSide?: InventorySide;
  action?: ActionOption;
  value: string;
  recipientId?: string;
};
type DragIntention = {
  token: string;
  side: InventorySide;
  item: InventoryItemView;
  sourceId: string;
  sourceRevision: number;
  opener: HTMLButtonElement;
};
type WorldRoot = { id: string; placementRevision?: number; position?: string };
type OpenBag = {
  side: InventorySide;
  id: string;
  name: string;
  root?: WorldRoot;
  invalid?: boolean;
  opener?: HTMLElement | null;
  order: number;
};
type InputFocus = { origin: HTMLElement; opener?: HTMLElement; generation: number };
type CollectionFocus = InputFocus & { recipient: HTMLElement };
const dragFormat = 'application/x-open-legend-possession';

function sameItem(left: InventoryItemView, right: InventoryItemView) {
  return (
    left.id === right.id &&
    left.revision === right.revision &&
    left.placementRevision === right.placementRevision &&
    left.group?.members === right.group?.members &&
    left.quantity === right.quantity &&
    left.container?.revision === right.container?.revision &&
    left.availableQuantity === right.availableQuantity
  );
}
function arrange(
  type: 'transfer-item' | 'merge-item',
  item: InventoryItemView,
  targetId: string,
  targetRevision: number,
  quantity: number,
  label: string,
): ActionOption {
  return {
    id: `${type}-${item.id}-${targetId}`,
    label,
    enabled: true,
    command: {
      type,
      ...(type === 'transfer-item' && item.group ? { inventoryGroup: item.group.token } : {}),
      itemId: item.id,
      targetId,
      quantity,
      expectedRevision: item.revision,
      placementRevision: item.placementRevision,
      expectedContentsRevision: item.container?.revision,
      targetRevision,
    },
  };
}
function transferSource(
  item: InventoryItemView,
  container: ContainerPage['container'],
  quantity: number,
): InventoryTransferSource {
  return {
    itemId: item.id,
    revision: item.revision,
    placementRevision: item.placementRevision,
    contentsRevision: item.container?.revision,
    containerId: container.id,
    containerRevision: container.revision,
    quantity,
  };
}

/** Private ownership owns editable work; connection/control scope owns permitted reads.
 * Regaining control refreshes the pages without discarding an unsubmitted amount. */
export function Inventory(props: InventoryProps) {
  const latest = useRef(props);
  latest.current = props;
  const lastView = useRef<InventoryPresentation | undefined>(undefined);
  const view = inventoryPresentation(props.view, lastView.current);
  lastView.current = view;
  const callbacks = useMemo(
    () => ({
      addItem: () => latest.current.addItem(),
      chooseWork: (item: InventoryItemView) => latest.current.chooseWork?.(item),
      browseActions: (
        item: InventoryItemSummary,
        opener: Element,
        dispatchCommand: (action: ActionOption) => Promise<ApiResult>,
      ) => latest.current.browseActions?.(item, opener, dispatchCommand),
      contextMenu: (
        item: InventoryItemView,
        point: { x: number; y: number },
        opener: HTMLElement,
        dispatchCommand: (action: ActionOption) => Promise<ApiResult>,
      ) => latest.current.contextMenu(item, point, opener, dispatchCommand),
      command: (action: ActionOption, request?: CommandRequestIdentity) =>
        latest.current.command(action, request),
      tradeCommand: (action: ActionOption, tradeScope: string) =>
        latest.current.tradeCommand(action, tradeScope),
    }),
    [],
  );
  const access = props.view.access;
  if (!access?.scope || !access.privateDraftScope)
    return <p role="status">Refresh character access before opening belongings.</p>;
  const privateOwner = JSON.stringify([
    props.view.worldId,
    props.view.player.id,
    access.privateDraftScope,
    props.view.saveTimeline,
  ]);
  return (
    <InventoryWorkspace
      key={privateOwner}
      {...props}
      {...callbacks}
      chooseWork={props.chooseWork ? callbacks.chooseWork : undefined}
      browseActions={props.browseActions ? callbacks.browseActions : undefined}
      view={view}
      scope={access.scope}
      displayOwner={privateOwner}
    />
  );
}

const InventoryWorkspace = memo(function InventoryWorkspace({
  view,
  addItem,
  browseActions,
  chooseWork,
  contextMenu,
  command,
  connected,
  visible,
  narrow,
  showHeading = true,
  openContainer,
  bagWindowHost,
  bagWindowsVisible,
  bagSheetVisible,
  onActivateBagWindow,
  onShowBelongings,
  onBagWindowsEmpty,
  onNegotiationTarget,
  tradeCommand,
  tradeRecovery,
  tradeRequestKey,
  scope,
  displayOwner,
}: Omit<InventoryProps, 'view'> & {
  view: InventoryPresentation;
  scope: string;
  displayOwner: string;
}) {
  const workspace = useRef<HTMLDivElement>(null);
  const anchor = useRef<HTMLButtonElement>(null);
  const detail = useRef<HTMLDivElement>(null);
  const previousTradeRecipient = useRef<string | undefined>(undefined);
  const focusGeneration = useRef(0);
  const focusFrame = useRef<number | undefined>(undefined);
  const focusAvailable = useRef(false);
  const actionInput = useRef<CollectionFocus | undefined>(undefined);
  const [selection, setSelection] = useState<Selection>();
  const [moveDestination, setMoveDestination] = useState<{
    source: InventorySide;
    itemId: string;
    target: InventorySide;
  }>();
  const inspectedSelection = useRef<string | undefined>(undefined);
  const [detailOpen, setDetailOpen] = useState(false);
  const [amountDraft, setAmountDraft] = useState<AmountDraft>();
  const [quantityError, setQuantityError] = useState('');
  const requestSeen = useRef<string | undefined>(undefined);
  const [bags, setBags] = useState<OpenBag[]>([]);
  const currentBags = useRef(bags);
  currentBags.current = bags;
  const [activeBag, setActiveBag] = useState<InventorySide>('container');
  const bagOrder = useRef(0);
  const [bagCollections, setBagCollections] = useState(
    new Map<InventorySide, InventoryCollectionState>(),
  );
  const registerBagCollection = useCallback(
    (side: InventorySide, state?: InventoryCollectionState) => {
      setBagCollections((previous) => {
        const before = previous.get(side);
        if (
          state &&
          before &&
          [
            'key',
            'page',
            'current',
            'error',
            'loading',
            'available',
            'blockedReason',
            'notice',
          ].every(
            (key) =>
              before[key as keyof InventoryCollectionState] ===
              state[key as keyof InventoryCollectionState],
          )
        )
          return previous;
        if (!state && !before) return previous;
        const next = new Map(previous);
        if (state) next.set(side, state);
        else next.delete(side);
        return next;
      });
    },
    [],
  );
  const activeBagWindows = bagWindowsVisible && bags.length > 0 && (!narrow || bagSheetVisible);
  const workspaceVisible = visible || activeBagWindows;
  function captureWorldRoot(id: string): WorldRoot {
    const entity = view.entities.find((entry) => entry.id === id);
    return {
      id,
      placementRevision: entity?.storage?.placementRevision,
      position: entity ? JSON.stringify([entity.position, entity.supportSurfaceId]) : undefined,
    };
  }
  const primaryBag = bags.find((bag) => bag.side === 'container');
  const worldRoot = primaryBag?.root;
  const currentWorldRoot = worldRoot && view.entities.find((entry) => entry.id === worldRoot.id);
  const worldRootValid =
    !worldRoot ||
    !!(
      currentWorldRoot?.storage &&
      currentWorldRoot.storage.containerId === worldRoot.id &&
      currentWorldRoot.storage.revision !== undefined &&
      currentWorldRoot.storage.placementRevision === worldRoot.placementRevision &&
      JSON.stringify([currentWorldRoot.position, currentWorldRoot.supportSurfaceId]) ===
        worldRoot.position
    );
  const [drag, setDrag] = useState<DragIntention>();
  const dragRef = useRef<DragIntention | undefined>(undefined);
  const ignoreClick = useRef(false);
  const actionFocus = useRef<
    { side: InventorySide; containerId: string; neighborId?: string } | undefined
  >(undefined);
  const [resolvedFocus, setResolvedFocus] = useState<{
    side: InventorySide;
    containerId: string;
    neighborId?: string;
    itemId?: string;
    input?: CollectionFocus;
  }>();
  const [ownerBusy, setOwnerBusy] = useState(false);
  const ownerGuard = useRef(false);
  const [holder, setHolder] = useState(view.player.id);
  const [disclosure, setDisclosure] = useState<'custodian' | 'public'>('custodian');
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  // These are permitted native changes, not world-clock ticks. Exterior storage loses its
  // revision hint on lost reach/access; that invalidates any previously readable contents.
  const inventoryKey = useMemo(
    () =>
      JSON.stringify(
        view.player.inventory.map((item) => [
          item.id,
          item.equipped,
          item.container?.revision,
          item.characteristics,
          item.equipmentConflicts,
          item.recipeRecord,
          item.materialCondition,
          item.art,
        ]),
      ),
    [view.player.inventory],
  );
  const recipeKey = useMemo(
    () => JSON.stringify(view.recipes.map((recipe) => recipe.id)),
    [view.recipes],
  );
  const revisionKey = useMemo(
    () =>
      JSON.stringify([
        view.player.inventoryRevision,
        view.player.canUseInventory,
        view.clock.paused,
        view.access?.controlling,
        view.player.alive,
        view.player.participation,
        !!view.player.action,
        view.player.statusEffects,
        // These pages contain native Drop/manufacture choices as well as stock.
        // Support and free placement can change while the character moves.
        view.player.position,
        view.player.supportSurfaceId,
        view.map.spatial.revision,
        inventoryKey,
        recipeKey,
      ]),
    [
      view.player.inventoryRevision,
      view.player.canUseInventory,
      view.clock.paused,
      view.access?.controlling,
      view.player.alive,
      view.player.participation,
      !!view.player.action,
      view.player.statusEffects,
      view.player.position,
      view.player.supportSurfaceId,
      view.map.spatial.revision,
      inventoryKey,
      recipeKey,
    ],
  );
  const left = useInventoryCollection({
    initialId: view.player.id,
    scope,
    displayOwner,
    revisionKey,
    visible: workspaceVisible,
    connected,
    expectedRootId: view.player.id,
  });
  const right = useInventoryCollection({
    initialId: '',
    scope,
    displayOwner,
    revisionKey: JSON.stringify([
      revisionKey,
      worldRoot,
      worldRoot && view.player.position,
      worldRoot && view.map.spatial.revision,
      currentWorldRoot?.storage,
    ]),
    visible:
      bagWindowsVisible &&
      !!primaryBag &&
      (!narrow ||
        (activeBag === 'container' && bagSheetVisible) ||
        (selection?.side === 'container' && detailOpen) ||
        amountDraft?.targetSide === 'container' ||
        (detailOpen && moveDestination?.target === 'container')),
    connected,
    expectedRootId: worldRoot?.id ?? view.player.id,
    blockedReason:
      primaryBag?.invalid || !worldRootValid
        ? 'This container moved or is no longer within permitted reach. Open it again from the world.'
        : undefined,
  });
  const requestId = openContainer?.requestId;
  useLayoutEffect(() => {
    focusAvailable.current = workspaceVisible && connected;
    return () => {
      focusAvailable.current = false;
      cancelCollectionFocus();
    };
  }, [workspaceVisible, connected, requestId, scope]);
  useLayoutEffect(() => {
    if (!openContainer || requestSeen.current === openContainer.requestId) return;
    requestSeen.current = openContainer.requestId;
    if (openContainer.scope !== scope) return;
    openBag(
      openContainer.containerId,
      openContainer.name,
      captureWorldRoot(openContainer.containerId),
      openContainer.opener,
    );
  }, [requestId, scope]);
  const operations = useInventoryCommand({
    worldId: view.worldId,
    actorId: view.player.id,
    timeline: view.saveTimeline,
    scope: view.access?.scope ?? '',
    recoveryScope: view.access?.commandRecoveryScope,
    epoch: view.commandEpoch,
    connected,
    command,
    onResolved(result) {
      left.refresh();
      right.refresh();
      for (const state of bagCollections.values()) state.refresh();
      if (result.ok) {
        closeDetail(false);
      }
      if (result.ok && actionFocus.current)
        setResolvedFocus({
          ...actionFocus.current,
          itemId: result.itemId,
          input: actionInput.current,
        });
      actionFocus.current = undefined;
      actionInput.current = undefined;
    },
  });
  const busy = !!operations.pending || ownerBusy;
  // After choosing a person, trading owns its current stock/proposal reads. The
  // original Give source is only a hint, not a continued external-container grant.
  const canTrade =
    workspaceVisible &&
    connected &&
    view.player.canUseInventory &&
    !!view.access?.controlling &&
    view.access.scope === scope &&
    !busy;
  const canAct =
    workspaceVisible &&
    connected &&
    view.player.canUseInventory &&
    !busy &&
    !!(
      !selection ||
      (selection.side === 'belongings'
        ? left.current
        : selection.side === 'container'
          ? right.current
          : bagCollections.get(selection.side)?.current)
    );
  const collection = (side: InventorySide) =>
    side === 'belongings' ? left : side === 'container' ? right : bagCollections.get(side);
  const oppositeSide = (side: InventorySide): InventorySide =>
    moveDestination?.source === side && moveDestination.itemId === selection?.itemId
      ? moveDestination.target
      : side === 'belongings'
        ? activeBag
        : 'belongings';
  const opposite = (side: InventorySide) => collection(oppositeSide(side));
  const activeContainer = collection(activeBag);
  const activeSpec = bags.find((bag) => bag.side === activeBag);
  const currentTitle = activeSpec ? bagName(activeSpec, activeContainer) : 'Container';
  function publishBags(next: OpenBag[]) {
    currentBags.current = next;
    setBags(next);
  }
  function raiseBag(side: InventorySide, opener?: HTMLElement) {
    if (!currentBags.current.some((bag) => bag.side === side)) return;
    if (activeBag === side && !(narrow && !bagSheetVisible) && !opener) {
      onActivateBagWindow();
      return;
    }
    publishBags(
      currentBags.current.map((bag) =>
        bag.side === side
          ? { ...bag, opener: opener ?? bag.opener, order: ++bagOrder.current }
          : bag,
      ),
    );
    setActiveBag(side);
    onActivateBagWindow();
  }
  function openBag(id: string, name: string, root?: WorldRoot, opener?: HTMLElement | null) {
    const existing = currentBags.current.find((bag) => bag.id === id);
    if (existing) {
      publishBags(
        currentBags.current.map((bag) =>
          bag === existing
            ? {
                ...bag,
                name,
                root,
                invalid: false,
                opener: opener ?? bag.opener,
                order: ++bagOrder.current,
              }
            : bag,
        ),
      );
      collection(existing.side)?.refresh();
      setActiveBag(existing.side);
    } else {
      const side: InventorySide = currentBags.current.some((bag) => bag.side === 'container')
        ? `bag-${crypto.randomUUID()}`
        : 'container';
      const bag = { side, id, name, root, opener, order: ++bagOrder.current };
      publishBags([...currentBags.current, bag]);
      if (side === 'container') right.navigate(id);
      setActiveBag(side);
    }
    onActivateBagWindow();
  }
  function closeBag(side: InventorySide) {
    const remaining = currentBags.current.filter((bag) => bag.side !== side);
    publishBags(remaining);
    if (!remaining.length) onBagWindowsEmpty();
    if (side === 'container') right.navigate('');
    if (selection?.side === side || amountDraft?.targetSide === side) closeDetail(false);
    if (dragRef.current?.side === side) stopDrag();
    if (activeBag === side && !(narrow && !bagSheetVisible)) {
      setActiveBag(remaining.at(-1)?.side ?? 'container');
      if (narrow) onShowBelongings();
    }
  }
  function rootValid(bag: OpenBag) {
    if (!bag.root) return true;
    const root = view.entities.find((entity) => entity.id === bag.root!.id);
    return !!(
      root?.storage &&
      root.storage.revision !== undefined &&
      root.storage.containerId === bag.root.id &&
      root.storage.placementRevision === bag.root.placementRevision &&
      JSON.stringify([root.position, root.supportSurfaceId]) === bag.root.position
    );
  }
  function bagName(bag: OpenBag, state = collection(bag.side)) {
    if (bag.invalid || !rootValid(bag)) return 'Container';
    return state?.page?.container.name ?? (state?.error ? 'Container' : bag.name);
  }
  useLayoutEffect(() => {
    if (bags.some((bag) => bag.root && !bag.invalid && !rootValid(bag)))
      publishBags(
        bags.map((bag) => (bag.root && !rootValid(bag) ? { ...bag, invalid: true } : bag)),
      );
  }, [bags, view.entities]);
  function collectionElement(side: InventorySide) {
    const selector = `[data-side="${side}"]`;
    return (
      workspace.current?.querySelector<HTMLElement>(selector) ??
      bagWindowHost?.querySelector<HTMLElement>(selector)
    );
  }
  const selectedCollection = selection && collection(selection.side);
  const item = selectedCollection?.page?.items.find((entry) => entry.id === selection?.itemId);
  const target = selection && opposite(selection.side)?.page?.container;
  const amountTarget = amountDraft?.targetSide
    ? collection(amountDraft.targetSide)?.page?.container
    : target;
  const selectedContainer = selectedCollection?.page?.container;
  if (
    !selection ||
    !selectedContainer ||
    inspectedSelection.current !==
      JSON.stringify([
        selection.side,
        selectedContainer.id,
        selectedContainer.revision,
        selection.itemId,
      ])
  )
    inspectedSelection.current = undefined;
  const amountMaximum =
    amountDraft?.operation === 'offer' && item?.group
      ? item.group.representativeAvailableQuantity
      : item?.availableQuantity;
  const amount = amountDraft && exactQuantity(amountDraft.value, amountMaximum);
  const draftStale =
    !!amountDraft &&
    (!item ||
      !selectedContainer ||
      !sameItem(amountDraft.item, item) ||
      amountDraft.source.id !== selectedContainer.id ||
      amountDraft.source.revision !== selectedContainer.revision ||
      (amountDraft.operation === 'move' &&
        (!amountTarget ||
          amountTarget.id !== amountDraft.target?.id ||
          amountTarget.revision !== amountDraft.target?.revision)));

  const tradeRecipientId = amountDraft?.operation === 'offer' ? amountDraft.recipientId : undefined;
  useLayoutEffect(() => {
    if (!narrow || !bagSheetVisible || !detailOpen || !selection) return;
    // A responsive change must not hide the opener behind a different bag sheet.
    // Keep the existing quantity/detail layer and its exact endpoints mounted.
    if (selection.side === 'belongings') onShowBelongings();
    else if (activeBag !== selection.side && bags.some((bag) => bag.side === selection.side))
      setActiveBag(selection.side);
  }, [narrow, bagSheetVisible, detailOpen, selection?.side, activeBag, bags]);
  const currentTrade = tradeRecipientId
    ? view.entities.find((person) => person.id === tradeRecipientId)?.trade
    : undefined;
  useLayoutEffect(() => {
    const previous = previousTradeRecipient.current;
    previousTradeRecipient.current = tradeRecipientId;
    if (!detailOpen) return;
    // Choosing a recipient replaces its button with the wider task in the same overlay.
    // Move focus only for that intentional transition, never an ordinary view refresh.
    if (tradeRecipientId) detail.current?.querySelector<HTMLElement>('.ol-item-trade')?.focus();
    else if (previous) {
      const chooser = detail.current?.querySelector<HTMLInputElement>('.ol-inventory-offer input');
      if (chooser && !chooser.disabled) chooser.focus();
      else detail.current?.querySelector<HTMLElement>('.ol-inventory-detail')?.focus();
    }
  }, [tradeRecipientId, detailOpen]);

  useEffect(() => {
    if (!resolvedFocus) return;
    const state = collection(resolvedFocus.side);
    if (!state || state.loading) return;
    const region = collectionElement(resolvedFocus.side);
    const input = resolvedFocus.input;
    // Refresh and overlay teardown can finish in either order. Restore once after
    // both commit, without requiring an earlier frame to have focused the region.
    // A removed source opener may have left focus on body; later input still wins.
    if (
      input &&
      region &&
      region === input.recipient &&
      state.page?.container.id === resolvedFocus.containerId
    ) {
      if (focusFrame.current !== undefined) window.cancelAnimationFrame(focusFrame.current);
      focusFrame.current = window.requestAnimationFrame(() => {
        focusFrame.current = undefined;
        if (!ownsCollectionFocus(input)) return;
        const buttons = Array.from(region.querySelectorAll<HTMLButtonElement>('[data-item-id]'));
        const target =
          buttons.find((entry) => entry.dataset.itemId === resolvedFocus.neighborId) ??
          buttons.find((entry) => entry.dataset.itemId === resolvedFocus.itemId) ??
          buttons[0] ??
          region.querySelector<HTMLInputElement>('.ol-inventory-search input');
        target?.focus({ preventScroll: true });
      });
    }
    setResolvedFocus(undefined);
  }, [resolvedFocus, left.key, left.page, right.key, right.page, bagCollections]);

  function cancelCollectionFocus() {
    focusGeneration.current++;
    if (focusFrame.current !== undefined) window.cancelAnimationFrame(focusFrame.current);
    focusFrame.current = undefined;
  }
  function captureInputFocus(): InputFocus | undefined {
    const origin = document.activeElement;
    if (
      !focusAvailable.current ||
      !(origin instanceof HTMLElement) ||
      (!workspace.current?.contains(origin) &&
        !detail.current?.contains(origin) &&
        !bagWindowHost?.contains(origin))
    )
      return;
    return {
      origin,
      opener: detail.current?.contains(origin) ? (anchor.current ?? undefined) : undefined,
      generation: focusGeneration.current,
    };
  }
  function captureCollectionFocus(side: InventorySide): CollectionFocus | undefined {
    const input = captureInputFocus();
    const recipient = collectionElement(side);
    return input && recipient ? { ...input, recipient } : undefined;
  }
  function ownsCollectionFocus(focus: CollectionFocus) {
    return (
      focusAvailable.current &&
      focus.generation === focusGeneration.current &&
      focus.recipient.isConnected &&
      (document.activeElement === focus.origin ||
        document.activeElement === focus.recipient ||
        (!focus.origin.isConnected && document.activeElement === focus.opener) ||
        (document.activeElement === document.body &&
          (!focus.origin.isConnected || focus.origin.matches(':disabled'))))
    );
  }
  function scheduleCollectionFocus(focus: CollectionFocus | undefined) {
    if (!focus) return;
    const ownsInput = () => ownsCollectionFocus(focus);
    if (!ownsInput()) return;
    if (focusFrame.current !== undefined) window.cancelAnimationFrame(focusFrame.current);
    focusFrame.current = window.requestAnimationFrame(() => {
      focusFrame.current = undefined;
      if (ownsInput()) focus.recipient.focus();
    });
  }
  function focusCollection(side: InventorySide) {
    scheduleCollectionFocus(captureCollectionFocus(side));
  }
  function closeDetail(restoreFocus = true) {
    inspectedSelection.current = undefined;
    setDetailOpen(false);
    setSelection(undefined);
    setAmountDraft(undefined);
    setMoveDestination(undefined);
    setQuantityError('');
    if (restoreFocus) {
      if (anchor.current?.isConnected) anchor.current.focus();
      else if (selection) focusCollection(selection.side);
    }
  }
  function stopDrag() {
    dragRef.current = undefined;
    setDrag(undefined);
    // HTML drag completion may synthesize a click. It must not inspect or move again.
    window.setTimeout(() => {
      ignoreClick.current = false;
    }, 0);
  }
  useEffect(() => {
    const cancel = () => {
      stopDrag();
      cancelCollectionFocus();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dragRef.current) {
        event.preventDefault();
        event.stopImmediatePropagation();
        cancel();
      }
    };
    // A later input owns its own focus, even if the prior receipt has not arrived.
    document.addEventListener('pointerdown', cancelCollectionFocus, true);
    document.addEventListener('keydown', cancelCollectionFocus, true);
    window.addEventListener('blur', cancel);
    window.addEventListener('keydown', escape, true);
    return () => {
      document.removeEventListener('pointerdown', cancelCollectionFocus, true);
      document.removeEventListener('keydown', cancelCollectionFocus, true);
      window.removeEventListener('blur', cancel);
      window.removeEventListener('keydown', escape, true);
    };
  }, []);
  useEffect(() => {
    if (!workspaceVisible || !connected) stopDrag();
    else if (selection && amountDraft) setDetailOpen(true);
  }, [workspaceVisible, connected]);

  function navigate(side: InventorySide, id: string, opener?: HTMLElement) {
    if (busy) return;
    if (!id) {
      closeBag(side);
      return;
    }
    if (id === view.player.id) {
      onShowBelongings();
      return;
    }
    const state = collection(side);
    if (!state?.current || !state.page) return;
    const name =
      state.page.items.find((item) => item.id === id)?.name ??
      state.page.breadcrumbs.find((parent) => parent.id === id)?.name ??
      'Container';
    const input = opener ?? anchor.current;
    closeDetail(false);
    stopDrag();
    openBag(
      id,
      name,
      side === 'belongings' ? undefined : bags.find((bag) => bag.side === side)?.root,
      input,
    );
  }
  function choose(
    side: InventorySide,
    selected: InventoryItemView,
    button: HTMLButtonElement,
    actions: boolean,
  ) {
    if (ignoreClick.current || busy) return;
    anchor.current = button;
    setDetailOpen(true);
    const retained = selection?.side === side && selection.itemId === selected.id;
    setSelection({ side, itemId: selected.id, actions });
    if (!retained) {
      setAmountDraft(undefined);
      setMoveDestination(undefined);
      setQuantityError('');
    }
    const source = collection(side)?.page;
    if (
      connected &&
      view.access?.controlling &&
      source &&
      collection(side)?.available &&
      !collection(side)?.loading
    ) {
      const identity = JSON.stringify([
        side,
        source.container.id,
        source.container.revision,
        selected.id,
      ]);
      inspectedSelection.current = identity;
      void command({
        id: `inspect:${selected.id}`,
        label: `Inspect ${selected.name}`,
        enabled: true,
        command: {
          type: 'inspect-inventory',
          itemId: selected.id,
          containerId: source.container.id,
          expectedRevision: source.container.revision,
        },
      })
        .then((result) => {
          if (alive.current && inspectedSelection.current === identity) {
            if (result.ok) collection(side)?.refresh();
            else operations.setMessage(result.message);
          }
        })
        .catch((error: unknown) => {
          if (alive.current && inspectedSelection.current === identity)
            operations.setMessage(
              error instanceof Error ? error.message : 'Inspection could not be confirmed.',
            );
        });
    }
  }
  function openItemContext(
    side: InventorySide,
    selected: InventoryItemView,
    button: HTMLButtonElement,
    open: (
      item: InventoryItemView,
      opener: HTMLElement,
      dispatchCommand: (action: ActionOption) => Promise<ApiResult>,
    ) => void,
  ) {
    const state = collection(side);
    const source = state?.page;
    if (
      ignoreClick.current ||
      busy ||
      ownerGuard.current ||
      !workspaceVisible ||
      !connected ||
      !view.access?.controlling ||
      view.access.scope !== scope ||
      !state?.available ||
      state?.loading ||
      !source ||
      source.container.id !== state.location.id
    )
      return;
    const current = source.items.find((entry) => entry.id === selected.id);
    if (!current || !sameItem(current, selected)) return;
    anchor.current = button;
    setSelection({ side, itemId: current.id, actions: true });
    // Opening an action menu is not inspection. In particular it must not send a
    // write and replace the inventory behind the menu.
    // The native item catalogue accepts possessions, including carried bags.
    // World-container contents keep their exact local transfer/details route.
    if (!source.breadcrumbs.some((entry) => entry.id === view.player.id)) {
      choose(side, current, button, true);
      return;
    }
    setDetailOpen(false);
    open(current, button, (action) => contextDispatch.current(action, side));
  }
  function moveIntention(
    side: InventorySide,
    sourceItem: InventoryItemView,
    destinationSide = oppositeSide(side),
  ): ActionOption | undefined {
    const source = collection(side)?.page;
    const destination = collection(destinationSide)?.page?.container;
    if (
      !canTrade ||
      !source ||
      !destination ||
      !collection(side)?.current ||
      !collection(destinationSide)?.current ||
      source.container.id === destination.id ||
      destination.id === sourceItem.id
    )
      return;
    const current = source.items.find((entry) => entry.id === sourceItem.id);
    if (!current || !sameItem(current, sourceItem)) return;
    if (current.availableQuantity === undefined || current.availableQuantity < 1) {
      operations.setMessage(
        'No inspected quantity is available to move. Inspect the item for its current availability.',
      );
      return;
    }
    return arrange(
      'transfer-item',
      current,
      destination.id,
      destination.revision,
      current.availableQuantity,
      `Move ${current.availableQuantity} ${current.name} to ${namePhrase(destination, 'definite')}`,
    );
  }
  function send(
    action: ActionOption,
    side: InventorySide,
    tradeScope?: string,
  ): Promise<ApiResult> {
    if (
      !alive.current ||
      !action.enabled ||
      !canTrade ||
      (!tradeScope && !collection(side)?.current)
    )
      return Promise.resolve({
        ok: false,
        code: operations.pending ? 'unconfirmed' : 'unavailable',
        message: operations.pending
          ? 'Resolve the retained inventory request before acting again.'
          : 'This action is not currently available. Nothing was sent.',
      });
    if (tradeScope) {
      stopDrag();
      return tradeCommand(action, tradeScope);
    }
    const source = collection(side)?.page;
    actionInput.current = captureCollectionFocus(side);
    if (source) {
      const index = source.items.findIndex((entry) => entry.id === action.command.itemId);
      actionFocus.current = {
        side,
        containerId: source.container.id,
        neighborId: source.items[index + 1]?.id ?? source.items[index - 1]?.id,
      };
    }
    stopDrag();
    if (!selection) focusCollection(side);
    return operations.dispatch(action);
  }
  // A retained external menu invokes the current inventory owner, never an old page closure.
  const contextDispatch = useRef(send);
  contextDispatch.current = send;
  function quickMove(side: InventorySide, sourceItem: InventoryItemView) {
    if (ignoreClick.current) return;
    const action = moveIntention(side, sourceItem);
    if (action) send(action, side);
  }
  function beginDrag(
    side: InventorySide,
    sourceItem: InventoryItemView,
    event: DragEvent<HTMLButtonElement>,
  ) {
    event.stopPropagation();
    const state = collection(side),
      source = state?.page;
    const current = source?.items.find((item) => item.id === sourceItem.id);
    if (
      !canTrade ||
      !state?.current ||
      !source ||
      !current ||
      !sameItem(current, sourceItem) ||
      !current.availableQuantity
    ) {
      event.preventDefault();
      return;
    }
    closeDetail(false);
    ignoreClick.current = true;
    const intention = {
      token: crypto.randomUUID(),
      side,
      item: current,
      sourceId: source.container.id,
      sourceRevision: source.container.revision,
      opener: event.currentTarget,
    };
    dragRef.current = intention;
    setDrag(intention);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(dragFormat, intention.token);
  }
  function canDrop(side: InventorySide, state: InventoryCollectionState) {
    return !!(
      drag &&
      drag.side !== side &&
      state.current &&
      state.page &&
      state.page.container.id !== drag.sourceId &&
      state.page.container.id !== drag.item.id &&
      canTrade
    );
  }
  function drop(side: InventorySide, event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    const intention = dragRef.current,
      destination = collection(side),
      source = intention && collection(intention.side);
    if (
      intention &&
      destination &&
      source?.current &&
      source.page &&
      canDrop(side, destination) &&
      event.dataTransfer.getData(dragFormat) === intention.token &&
      source.page.container.id === intention.sourceId &&
      source.page.container.revision === intention.sourceRevision
    ) {
      const current = source.page.items.find((item) => item.id === intention.item.id),
        target = destination.page!.container;
      if (current && sameItem(current, intention.item) && current.availableQuantity) {
        if (current.availableQuantity > 1 && !current.individual) {
          anchor.current = intention.opener;
          setSelection({ side: intention.side, itemId: current.id, actions: true });
          setAmountDraft({
            operation: 'move',
            item: current,
            source: source.page.container,
            target,
            targetSide: side,
            value: String(current.availableQuantity),
          });
          setQuantityError('');
          setDetailOpen(true);
        } else {
          const action = moveIntention(intention.side, current, side);
          if (action) void send(action, intention.side);
        }
      }
    }
    stopDrag();
  }
  function chooseAmount(operation: AmountDraft['operation'], action?: ActionOption) {
    if (!item || !selectedContainer || !selection) return;
    setQuantityError('');
    setAmountDraft({
      operation,
      item,
      source: selectedContainer,
      target: operation === 'move' ? target : undefined,
      targetSide: operation === 'move' ? oppositeSide(selection.side) : undefined,
      action,
      value:
        operation === 'split'
          ? '1'
          : String(
              operation === 'offer' && item.group
                ? item.group.representativeAvailableQuantity
                : (item.availableQuantity ?? ''),
            ),
    });
  }
  function submitAmount() {
    if (!selection || !amountDraft || draftStale) return;
    if (
      amount === undefined ||
      (amountDraft.operation === 'split' && amount >= amountDraft.item.quantity)
    ) {
      setQuantityError(
        amountDraft.operation === 'split'
          ? 'Choose a whole amount that leaves some units in this stack.'
          : 'Choose an available whole amount.',
      );
      return;
    }
    if (amountDraft.operation === 'move' && amountDraft.target) {
      send(
        arrange(
          'transfer-item',
          amountDraft.item,
          amountDraft.target.id,
          amountDraft.target.revision,
          amount,
          `Move ${amount} ${amountDraft.item.name} to ${namePhrase(amountDraft.target, 'definite')}`,
        ),
        selection.side,
      );
    } else if (amountDraft.action)
      send(
        { ...amountDraft.action, command: { ...amountDraft.action.command, quantity: amount } },
        selection.side,
      );
  }
  async function ownerWrite(path: string, body: object) {
    if (!canAct || ownerGuard.current) return;
    ownerGuard.current = true;
    setOwnerBusy(true);
    try {
      const receipt = await post(path, body);
      if (alive.current) {
        operations.setMessage(receipt.message);
        left.refresh();
        right.refresh();
        for (const state of bagCollections.values()) state.refresh();
      }
    } catch (error: unknown) {
      if (alive.current)
        operations.setMessage(
          `${error instanceof Error ? error.message : 'No result received.'} Refresh and inspect the declaration before repeating this edit.`,
        );
    } finally {
      ownerGuard.current = false;
      if (alive.current) setOwnerBusy(false);
    }
  }

  function renderCollection(side: InventorySide, state: InventoryCollectionState, title: string) {
    return (
      <InventoryCollection
        side={side}
        title={title}
        heading={side === 'belongings' ? 'Inventory' : undefined}
        tools={side === 'belongings' ? inventoryTools : undefined}
        state={state}
        selectedId={selection?.side === side ? selection.itemId : undefined}
        onSelectedAnchor={(button) => {
          if (button) anchor.current = button;
        }}
        busy={busy}
        canMove={canTrade && state.current && bags.length > 0}
        dropActive={canDrop(side, state)}
        onNavigate={(id, opener) => navigate(side, id, opener)}
        onSelect={(selected, button, actions) => choose(side, selected, button, actions)}
        onContextMenu={(selected, button, point) =>
          openItemContext(side, selected, button, (current, opener, dispatchCommand) =>
            contextMenu(current, point, opener, dispatchCommand),
          )
        }
        onQuickMove={(selected) => quickMove(side, selected)}
        onDragStart={(selected, event) => beginDrag(side, selected, event)}
        onDragEnd={stopDrag}
        onDrop={(event) => drop(side, event)}
      />
    );
  }
  const feedback = (
    <footer className="ol-inventory-feedback">
      <LoadingIndicator
        active={operations.pending?.status === 'sending'}
        label="Sending inventory action"
      />
      {operations.pending && operations.pending.status !== 'sending' && (
        <section className="ol-inventory-pending" aria-label="Unresolved inventory action">
          <p role="status">
            The original request for{' '}
            {operations.pending.request?.label ?? 'an earlier inventory action'} needs confirmation.
            Further inventory actions are paused to avoid repeating it.
          </p>
          <Button
            disabled={!connected}
            busy={operations.pending.status === 'checking'}
            onPress={() => {
              if (actionFocus.current)
                actionInput.current = captureCollectionFocus(actionFocus.current.side);
              void operations.check();
            }}
          >
            {operations.pending.request ? 'Check result' : 'Read retained request'}
          </Button>
          <p className="ol-caption">
            Checking reads the existing result. It never sends the action again.
          </p>
        </section>
      )}
      {operations.message && <p role="status">{operations.message}</p>}
      {!view.player.canUseInventory && (
        <p className="ol-caption">
          {view.clock.paused
            ? 'Resume the world to act.'
            : 'Current character control and the ability to handle possessions are required.'}
        </p>
      )}
      {view.godMode &&
        [left, right, ...bagCollections.values()].map((state) => {
          const container = state.page?.container;
          return container?.capacity !== undefined ? (
            <Button
              key={container.id}
              size="sm"
              variant="quiet"
              disabled={!canAct}
              onPress={() =>
                void ownerWrite('/api/god/container-access', {
                  id: crypto.randomUUID(),
                  itemId: container.id,
                  expectedRevision: container.revision,
                  actors: container.restricted ? null : [view.player.id],
                })
              }
            >
              God mode: {container.restricted ? 'Share' : 'Restrict'} {container.name}
            </Button>
          ) : null;
        })}
    </footer>
  );
  const inventoryTools = (
    <>
      {view.godMode && (
        <Button size="sm" variant="quiet" disabled={busy || !connected} onPress={addItem}>
          Add item (God mode)
        </Button>
      )}
      <details>
        <summary>Controls</summary>
        <p className="ol-caption">
          Select an item to inspect it. With two containers open, drag between them or Shift-click
          to move its available units. Keyboard: Tab to an item, Enter to inspect, Shift+Enter to
          move.
        </p>
        {!right.location.id && (
          <p>
            Open a container in the world to see it beside your belongings. You can also open one of
            your bags beside them.
          </p>
        )}
      </details>
      {view.player.inventory.some((entry) => entry.equipped) && (
        <section className="ol-inventory-equipment" aria-label="Equipped items">
          <strong>Equipped</strong>
          {view.player.inventory
            .filter((entry) => entry.equipped)
            .map((entry) => (
              <div key={entry.id}>
                <ItemIllustration art={entry.art} icon={entry.icon} label={entry.name} />
                <span>{entry.name}</span>
                {browseActions && (
                  <Button
                    size="sm"
                    variant="quiet"
                    disabled={!canAct}
                    onPress={(event) =>
                      browseActions(entry, event.target, (action) =>
                        contextDispatch.current(action, 'belongings'),
                      )
                    }
                  >
                    Item actions
                  </Button>
                )}
              </div>
            ))}
        </section>
      )}
    </>
  );
  return (
    <div
      ref={workspace}
      className="ol-inventory-workspace"
      onDragOver={(event) => event.stopPropagation()}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        stopDrag();
      }}
    >
      {showHeading && <h2 className="ol-heading">Belongings</h2>}
      {bags.length > 0 && (
        <div className="ol-inventory-context" role="group" aria-label="Open inventory containers">
          <div>
            <span className="ol-caption">Belongings</span>
            <strong>{left.page?.container.name ?? view.player.name}</strong>
          </div>
          <span aria-hidden="true">↔</span>
          <div>
            <span className="ol-caption">Container</span>
            <strong>{currentTitle}</strong>
          </div>
        </div>
      )}
      {selectedCollection?.page && !item && (
        <p className="ol-inventory-unavailable" role="status">
          The selected item is not on this page of these contents. Change the search or page, or
          select another item.{amountDraft && ' Your entered amount is retained.'}
        </p>
      )}
      <div className="ol-inventory-panes">
        <div className="ol-inventory-side">
          {renderCollection('belongings', left, 'Your belongings')}
        </div>
      </div>
      {bags.length > 0 && (
        <div className="ol-inventory-open-bags" role="group" aria-label="Open bags">
          {bags.map((bag) => (
            <Button
              key={bag.side}
              size="sm"
              variant="quiet"
              onPress={(event) =>
                raiseBag(bag.side, event.target instanceof HTMLElement ? event.target : undefined)
              }
            >
              {bagName(bag)}
            </Button>
          ))}
        </div>
      )}
      {bags.map((bag) => {
        const windowVisible =
          bagWindowsVisible && (!narrow || (activeBag === bag.side && bagSheetVisible));
        const readerVisible =
          windowVisible ||
          (bagWindowsVisible &&
            ((selection?.side === bag.side && detailOpen) ||
              amountDraft?.targetSide === bag.side ||
              (detailOpen && moveDestination?.target === bag.side)));
        const blockedReason =
          bag.invalid || !rootValid(bag)
            ? 'This container moved or is no longer within permitted reach. Open it again from the world.'
            : undefined;
        const content = (state: InventoryCollectionState) => (
          <BagWindow
            id={bag.side}
            title={bagName(bag, state)}
            host={bagWindowHost}
            narrow={narrow}
            visible={windowVisible}
            active={activeBag === bag.side}
            order={bag.order}
            opener={bag.opener}
            onActivate={() => raiseBag(bag.side)}
            onClose={() => closeBag(bag.side)}
            onShowBelongings={onShowBelongings}
            windowSwitcher={
              bags.length > 1 ? (
                <label>
                  Open bag
                  <select
                    aria-label="Open bag"
                    value={activeBag}
                    onChange={(event) =>
                      raiseBag(event.target.value as InventorySide, event.currentTarget)
                    }
                  >
                    {bags.map((other) => (
                      <option key={other.side} value={other.side}>
                        {bagName(other)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : undefined
            }
          >
            {renderCollection(bag.side, state, bagName(bag, state))}
            {windowVisible && activeBag === bag.side && feedback}
          </BagWindow>
        );
        return bag.side === 'container' ? (
          <span key={bag.side}>{content(right)}</span>
        ) : (
          <BagCollectionReader
            key={bag.side}
            side={bag.side}
            onState={registerBagCollection}
            options={{
              initialId: bag.id,
              scope,
              displayOwner,
              revisionKey: JSON.stringify([
                revisionKey,
                bag.root,
                bag.root && view.player.position,
                bag.root && view.map.spatial.revision,
                bag.root && view.entities.find((entity) => entity.id === bag.root!.id)?.storage,
              ]),
              visible: readerVisible,
              connected,
              expectedRootId: bag.root?.id ?? view.player.id,
              blockedReason,
            }}
          >
            {content}
          </BagCollectionReader>
        );
      })}
      <Popover
        triggerRef={anchor}
        isOpen={detailOpen && !!selection && (!!item || !!tradeRecipientId) && workspaceVisible}
        onOpenChange={(open) => {
          setDetailOpen(open);
        }}
        isNonModal
        className="ol-root ol-inventory-popover"
        data-trade={!!tradeRecipientId || undefined}
        // A sheet leaves no room beside its item; vertical placement lets the
        // overlay owner keep the same detail and draft within the viewport width.
        placement={narrow ? 'bottom start' : 'right top'}
        shouldFlip
      >
        <JadeGlass identity="inventory::inventory-popover:1" />
        <div
          ref={detail}
          className="ol-portal-content"
          onKeyDown={(event) => {
            // A child lot editor/picker owns Escape first. Otherwise close this one
            // trade layer and restore the original item opener through the same owner.
            if (
              event.key === 'Escape' &&
              tradeRecipientId &&
              !event.defaultPrevented &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              event.stopPropagation();
              closeDetail();
            }
          }}
          onKeyDownCapture={(event) => {
            if (
              event.key === 'Escape' &&
              amountDraft &&
              !tradeRecipientId &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              event.stopPropagation();
              setAmountDraft(undefined);
              setQuantityError('');
            }
          }}
        >
          <LoadingDialog
            className={`ol-inventory-detail${tradeRecipientId ? ' ol-inventory-detail--trade' : ''}`}
            aria-label={
              tradeRecipientId
                ? currentTrade
                  ? `${currentTrade.labels.title}: ${currentTrade.personName}`
                  : 'Trade'
                : item
                  ? `${item.name} actions and details`
                  : 'Item details'
            }
          >
            {tradeRecipientId && amountDraft && selection ? (
              currentTrade ? (
                <ItemTrade
                  key={currentTrade.scope}
                  trade={currentTrade}
                  visible={workspaceVisible}
                  view={view}
                  onNegotiationTarget={onNegotiationTarget}
                  recovery={tradeRecovery}
                  inventoryRequestKeys={[
                    inventoryCommandStorageKey(
                      view.access?.commandRecoveryScope,
                      view.worldId,
                      view.player.id,
                      view.saveTimeline,
                    ),
                    tradeRequestKey,
                  ].filter((key): key is string => !!key)}
                  connected={canTrade}
                  command={(action) => send(action, selection.side, currentTrade.scope)}
                  initialQuantity={amountDraft.value}
                  selected={
                    draftStale
                      ? undefined
                      : {
                          id: amountDraft.item.id,
                          art: amountDraft.item.art,
                          icon: amountDraft.item.icon,
                          name: amountDraft.item.name,
                          label: amountDraft.item.name,
                          description: amountDraft.item.description,
                          quantity:
                            amountDraft.item.group?.representativeAvailableQuantity ??
                            amountDraft.item.availableQuantity ??
                            amountDraft.item.quantity,
                          revision: amountDraft.item.revision,
                          placementRevision: amountDraft.item.placementRevision,
                          contentsRevision: amountDraft.item.container?.revision,
                          whole: !!amountDraft.item.container || !!amountDraft.item.individual,
                        }
                  }
                  onClose={() => closeDetail()}
                  onChooseRecipient={() =>
                    setAmountDraft({ ...amountDraft, recipientId: undefined })
                  }
                />
              ) : (
                <section className="ol-inventory-trade-unavailable">
                  <div className="ol-inventory-toolbar">
                    <h3 className="ol-heading">Trade</h3>
                    <Button size="sm" variant="quiet" onPress={() => closeDetail()}>
                      Close
                    </Button>
                  </div>
                  <p role="status">
                    This person is no longer available for trade. Choose a current recipient.
                  </p>
                  <Button
                    variant="quiet"
                    disabled={busy}
                    onPress={() => setAmountDraft({ ...amountDraft, recipientId: undefined })}
                  >
                    Choose another person
                  </Button>
                </section>
              )
            ) : (
              <>
                <div className="ol-inventory-toolbar">
                  <h3 className="ol-heading">{item?.name ?? 'Item details'}</h3>
                  <Button size="sm" variant="quiet" onPress={() => closeDetail()}>
                    Close
                  </Button>
                </div>
                <LoadingIndicator
                  active={operations.pending?.status === 'sending'}
                  label="Sending inventory action"
                />
                {operations.pending && operations.pending.status !== 'sending' && (
                  <p className="ol-caption">
                    The original request needs recovery. Use Check result in the inventory.
                  </p>
                )}
                {operations.message && <p className="ol-caption">{operations.message}</p>}
                {item && selectedContainer && selection && (
                  <>
                    <p className="ol-caption">
                      {selectedContainer.name}, {item.quantity} units{' '}
                      {item.equipped && ', equipped'}
                    </p>
                    {amountDraft ? (
                      <>
                        <h4>
                          {amountDraft.operation === 'move'
                            ? `Move to ${amountDraft.target ? namePhrase(amountDraft.target, 'definite') : 'container'}`
                            : amountDraft.operation === 'offer'
                              ? 'Give to a person'
                              : amountDraft.operation === 'split'
                                ? 'Split this stack'
                                : 'Drop items'}
                        </h4>
                        <InventoryQuantity
                          value={amountDraft.value}
                          onChange={(value) => {
                            setAmountDraft({ ...amountDraft, value });
                            setQuantityError('');
                          }}
                          maximum={amountMaximum}
                          disabled={busy}
                          error={quantityError}
                        />
                        {draftStale && (
                          <p role="status">
                            These contents changed. Refresh the available amount before acting; the
                            entered quantity stays in place.
                          </p>
                        )}
                        {draftStale && (
                          <Button
                            variant="quiet"
                            disabled={
                              !canAct ||
                              !item ||
                              !selectedContainer ||
                              (amountDraft.operation === 'move' &&
                                amountTarget?.id !== amountDraft.target?.id)
                            }
                            onPress={() => {
                              setAmountDraft({
                                ...amountDraft,
                                item,
                                source: selectedContainer,
                                target: amountDraft.operation === 'move' ? amountTarget : undefined,
                                action: amountDraft.action
                                  ? item.actions.find(
                                      (entry) => entry.id === amountDraft.action?.id,
                                    )
                                  : undefined,
                              });
                              setQuantityError('');
                            }}
                          >
                            Refresh available amount
                          </Button>
                        )}
                        {amountDraft.operation === 'offer' && amount !== undefined && (
                          <InventoryOffer
                            source={transferSource(amountDraft.item, amountDraft.source, amount)}
                            scope={view.access?.scope ?? ''}
                            active={canAct && !draftStale}
                            existingTrades={view.entities
                              .filter((person) => !!person.trade?.offers.length)
                              .map((person) => ({ id: person.id, name: person.name }))}
                            canOpenExisting={workspaceVisible && connected}
                            onOffer={(recipient) =>
                              setAmountDraft({ ...amountDraft, recipientId: recipient.id })
                            }
                          />
                        )}
                        <div className="ol-actions">
                          {amountDraft.operation !== 'offer' && (
                            <Button disabled={!canAct || draftStale} onPress={submitAmount}>
                              {amountDraft.operation === 'move'
                                ? 'Move amount'
                                : amountDraft.operation === 'split'
                                  ? 'Split stack'
                                  : 'Drop amount'}
                            </Button>
                          )}
                          <Button
                            variant="quiet"
                            onPress={() => {
                              setAmountDraft(undefined);
                              setQuantityError('');
                            }}
                          >
                            Back to item
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        {!!item.equipmentConflicts?.length && (
                          <section aria-label="Equipment put away when equipping">
                            <p>Equipping this item puts away these currently equipped items:</p>
                            <ul>
                              {item.equipmentConflicts.map((equipped) => (
                                <li key={equipped.id}>{equipped.name}</li>
                              ))}
                            </ul>
                          </section>
                        )}
                        <div className="ol-inventory-item-actions">
                          {bags.length > 0 && (
                            <label>
                              Move to
                              <select
                                aria-label="Move destination"
                                value={oppositeSide(selection.side)}
                                disabled={busy}
                                onChange={(event) =>
                                  setMoveDestination({
                                    source: selection.side,
                                    itemId: item.id,
                                    target: event.target.value as InventorySide,
                                  })
                                }
                              >
                                {selectedContainer.id !== view.player.id && (
                                  <option value="belongings">Your belongings</option>
                                )}
                                {bags
                                  .filter(
                                    (bag) => bag.id !== selectedContainer.id && bag.id !== item.id,
                                  )
                                  .map((bag) => (
                                    <option key={bag.side} value={bag.side}>
                                      {bagName(bag)}
                                    </option>
                                  ))}
                              </select>
                            </label>
                          )}
                          {target &&
                            target.id !== selectedContainer.id &&
                            target.id !== item.id && (
                              <>
                                <Button
                                  disabled={
                                    !canAct ||
                                    item.availableQuantity === undefined ||
                                    item.availableQuantity < 1
                                  }
                                  onPress={() => quickMove(selection.side, item)}
                                >
                                  {item.availableQuantity !== item.quantity
                                    ? `Move ${item.availableQuantity ?? 'available'} available to ${namePhrase(target, 'definite')}`
                                    : `Move to ${namePhrase(target, 'definite')}`}
                                </Button>
                                {!item.individual && item.quantity > 1 && (
                                  <Button
                                    variant="quiet"
                                    disabled={!canAct}
                                    onPress={() => chooseAmount('move')}
                                  >
                                    Move an amount…
                                  </Button>
                                )}
                              </>
                            )}
                          {item.container && (
                            <>
                              <Button
                                variant="quiet"
                                disabled={busy}
                                onPress={() => navigate(selection.side, item.id)}
                              >
                                Open {namePhrase(item, 'definite')}
                              </Button>
                              {selection.side === 'belongings' && !right.location.id && (
                                <Button
                                  variant="quiet"
                                  disabled={busy}
                                  onPress={() => {
                                    navigate('belongings', item.id);
                                  }}
                                >
                                  Open beside belongings
                                </Button>
                              )}
                            </>
                          )}
                          <Button
                            variant="quiet"
                            disabled={
                              !canAct ||
                              item.availableQuantity === undefined ||
                              item.availableQuantity < 1
                            }
                            onPress={() => chooseAmount('offer')}
                            aria-description={
                              item.group
                                ? `Choose up to ${item.group.representativeAvailableQuantity} from the selected stack.`
                                : undefined
                            }
                          >
                            Give
                          </Button>
                          {browseActions &&
                            selectedCollection?.page?.breadcrumbs.some(
                              (entry) => entry.id === view.player.id,
                            ) && (
                              <Button
                                size="sm"
                                variant="quiet"
                                disabled={
                                  busy ||
                                  !connected ||
                                  !selectedCollection.available ||
                                  selectedCollection.loading
                                }
                                onPress={() => {
                                  if (anchor.current?.isConnected)
                                    openItemContext(
                                      selection.side,
                                      item,
                                      anchor.current,
                                      browseActions,
                                    );
                                }}
                              >
                                Explore uses and targets
                              </Button>
                            )}
                          {item.workBatch && chooseWork && (
                            <Button
                              variant="quiet"
                              disabled={!connected || !view.access?.controlling || busy}
                              onPress={() => {
                                chooseWork(item);
                                closeDetail();
                              }}
                            >
                              {item.workBatch.label}
                            </Button>
                          )}
                          {item.actions.map((action) => (
                            <div key={action.id}>
                              <Button
                                variant="quiet"
                                disabled={!canAct || !action.enabled}
                                onPress={() =>
                                  action.command.type === 'split-item'
                                    ? chooseAmount('split', action)
                                    : action.command.type === 'drop' && item.quantity > 1
                                      ? chooseAmount('drop', action)
                                      : send(action, selection.side)
                                }
                              >
                                {action.command.type === 'split-item'
                                  ? 'Split stack…'
                                  : action.command.type === 'drop' && item.quantity > 1
                                    ? 'Drop an amount…'
                                    : action.label}
                              </Button>
                              {!action.enabled && action.reason && (
                                <p className="ol-caption">{action.reason}</p>
                              )}
                            </div>
                          ))}
                        </div>
                        <details open={!selection.actions}>
                          <summary>Known details</summary>
                          <p>{item.description}</p>
                          {item.materialCondition && (
                            <p>
                              {item.materialCondition.label},{' '}
                              {item.materialCondition.coveredFraction >= 1 - 1e-6
                                ? 'covered'
                                : item.materialCondition.coveredFraction > 0
                                  ? 'partly covered'
                                  : 'exposed'}{' '}
                              , {item.materialCondition.process}
                            </p>
                          )}
                          <div className="ol-tags">
                            {item.tags.map((tag) => (
                              <Tag key={tag}>{tag}</Tag>
                            ))}
                            {item.individual && <Tag>Individual object</Tag>}
                          </div>
                          <p className="ol-caption">
                            Available: {item.availableQuantity ?? 'Unknown'}, Packing load:{' '}
                            {item.packingLoad ?? 'Unknown'}
                            {item.container ? ' including its contents' : ' per unit'}
                          </p>
                          {item.declaredOwner && <p>Declared owner: {item.declaredOwner.name}</p>}
                          {item.recipeRecord && (!connected || selectedCollection?.current) && (
                            <section aria-label="Recorded production method">
                              <h4>
                                {item.recipeRecord.method?.name ?? 'Recorded method unavailable'}
                              </h4>
                              <p>{item.recipeRecord.message}</p>
                              {item.recipeRecord.method && (
                                <RecipeDetails recipe={item.recipeRecord.method} />
                              )}
                            </section>
                          )}
                          <dl className="ol-inventory-facts">
                            {item.characteristics?.map((fact) => (
                              <div key={fact.id}>
                                <dt>{fact.label}</dt>
                                <dd>
                                  {fact.value ?? 'Unknown'} {fact.unit}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </details>
                        {item.equipmentConflicts?.map((equipped) => {
                          const matching = item.characteristics?.flatMap((fact) => {
                            const other = equipped.characteristics.find(
                              (entry) => entry.id === fact.id && entry.unit === fact.unit,
                            );
                            return other ? [{ fact, other }] : [];
                          });
                          return matching?.length ? (
                            <details key={equipped.id}>
                              <summary>
                                Compare with {namePhrase(equipped, 'definite')} (equipped)
                              </summary>
                              <table className="ol-inventory-comparison">
                                <caption>
                                  Compared with {namePhrase(equipped, 'definite')} (equipped)
                                </caption>
                                <thead>
                                  <tr>
                                    <th>Characteristic</th>
                                    <th>{item.name}</th>
                                    <th>{equipped.name}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {matching.map(({ fact, other }) => (
                                    <tr key={fact.id}>
                                      <th>
                                        {fact.label} {fact.unit}
                                      </th>
                                      <td>{fact.value ?? 'Unknown'}</td>
                                      <td>{other.value ?? 'Unknown'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              <p className="ol-caption">
                                Only matching meanings and units are compared. Unknown facts stay
                                unknown; there is no total equipment score.
                              </p>
                            </details>
                          ) : null;
                        })}
                        {!item.group && !item.individual && !item.container && !item.equipped && (
                          <MergeTargets
                            key={item.id}
                            item={item}
                            containerId={selectedContainer.id}
                            pageKey={selectedCollection?.key ?? ''}
                            canAct={canAct && item.availableQuantity === item.quantity}
                            visible={workspaceVisible && connected}
                            onMerge={(match) =>
                              send(
                                arrange(
                                  'merge-item',
                                  item,
                                  match.id,
                                  match.revision,
                                  item.quantity,
                                  'Merge stacks',
                                ),
                                selection.side,
                              )
                            }
                          />
                        )}
                        {view.godMode && (
                          <details>
                            <summary>Declare ownership (God mode)</summary>
                            <p>
                              A declaration records an owner; it does not move the object or grant
                              access.
                            </p>
                            <label>
                              Holder{' '}
                              <select
                                value={holder}
                                onChange={(event) => setHolder(event.target.value)}
                              >
                                <option value="">No declared owner</option>
                                <option value={view.player.id}>{view.player.name}</option>
                                {view.entities
                                  .filter((entry) => entry.kind === 'actor')
                                  .map((entry) => (
                                    <option key={entry.id} value={entry.id}>
                                      {entry.name}
                                    </option>
                                  ))}
                              </select>
                            </label>
                            <label>
                              Disclosure{' '}
                              <select
                                value={disclosure}
                                onChange={(event) => {
                                  if (
                                    event.target.value === 'custodian' ||
                                    event.target.value === 'public'
                                  )
                                    setDisclosure(event.target.value);
                                }}
                              >
                                <option value="custodian">Current custodian</option>
                                <option value="public">Public declaration</option>
                              </select>
                            </label>
                            <Button
                              disabled={!canAct}
                              onPress={() =>
                                void ownerWrite('/api/god/ownership', {
                                  id: crypto.randomUUID(),
                                  itemId: item.id,
                                  expectedRevision: item.declaredOwner?.revision ?? 0,
                                  holderId: holder || null,
                                  disclosure,
                                })
                              }
                            >
                              Save declaration
                            </Button>
                          </details>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </LoadingDialog>
        </div>
      </Popover>
      {(!activeBagWindows || !bags.some((bag) => bag.side === activeBag)) && feedback}
      <footer className="ol-inventory-history">
        <InventoryHistory
          scope={scope}
          revision={view.player.inventoryRevision}
          visible={visible && connected}
          readRevision={JSON.stringify([
            left.key,
            right.key,
            [...bagCollections.values()].map((state) => state.key),
          ])}
        />
      </footer>
    </div>
  );
});

/** Each explicitly opened bag owns one bounded read, while every write stays in the
 * surrounding Inventory controller. Notify that controller only on semantic read
 * changes; freshly allocated callback objects must not create a render/read loop. */
function BagCollectionReader({
  side,
  options,
  onState,
  children,
}: {
  side: InventorySide;
  options: Parameters<typeof useInventoryCollection>[0];
  onState(side: InventorySide, state?: InventoryCollectionState): void;
  children(state: InventoryCollectionState): ReactNode;
}) {
  const state = useInventoryCollection(options);
  useLayoutEffect(() => {
    onState(side, state);
  }, [
    side,
    onState,
    state.key,
    state.page,
    state.current,
    state.error,
    state.loading,
    state.available,
    state.blockedReason,
    state.notice,
  ]);
  useLayoutEffect(() => () => onState(side, undefined), [side, onState]);
  return children(state);
}
