import {
  useEffect,
  useMemo,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from 'react';
import type { GameView, KnownPlaceView } from '@open-legend/protocol';
import { mapPlaceReader } from './map-place-reader';
import { assetUrl } from '../asset-files';
import { post } from '../api';
import { Button, EmptyState, Icon, IconButton } from '../design-system/components';
import { Portrait } from '../design-system/portrait';
import './map-workspace.css';

type Marker = NonNullable<GameView['cartography']>['markers'][number];
type Selection = { kind: 'marker'; id: string } | { kind: 'place'; id: string };
const noteExitRefusal =
  'Save or discard your note before choosing another place or editing a marker.';
const placeReference = (place: KnownPlaceView) => ({
  id: place.id,
  sourceId: place.sourceId,
  revision: place.revision,
});

function useMapPlaces(view: GameView, visible: boolean) {
  const scope = JSON.stringify([
    view.worldId,
    view.saveTimeline,
    view.player.id,
    view.access?.scope,
    view.historyEpoch,
  ]);
  const reader = useMemo(() => mapPlaceReader(scope), [scope]);
  const read = useSyncExternalStore(reader.subscribe, reader.snapshot);
  const revision = view.cartography?.placesRevision ?? '';
  useEffect(() => {
    if (visible && view.cartography) reader.load(revision);
    // Only the committed place-evidence/note owner changes this token. The reader
    // finishes an active page chain and coalesces newer tokens into one trailing read.
  }, [reader, visible, !!view.cartography, revision]);
  return {
    ...read,
    newer: read.revision !== undefined && read.revision !== revision,
    refresh: () => reader.load(revision, true),
  };
}

function OwnedMapWorkspace({
  view,
  mode = 'full',
  visible = true,
  onOpenMap,
}: {
  view: GameView;
  mode?: 'full' | 'minimap';
  visible?: boolean;
  onOpenMap?: () => void;
}) {
  const map = view.cartography;
  const mini = mode === 'minimap';
  const known = useMapPlaces(view, visible);
  const [query, setQuery] = useState('');
  const [browsing, setBrowsing] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [zoom, setZoom] = useState(mini ? 2 : 1);
  const [center, setCenter] = useState({ x: 0.5, z: 0.5 });
  const [selection, setSelection] = useState<Selection>();
  const [draft, setDraft] = useState<{
    id: string;
    x: number;
    z: number;
    label: string;
    icon: string;
  }>();
  const [adding, setAdding] = useState(false);
  const [movingId, setMovingId] = useState<string>();
  const [noteDraft, setNoteDraft] = useState<{
    key: string;
    text: string;
    baseText: string;
    revision: number;
  }>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [aspect, setAspect] = useState(1.5);
  const [artState, setArtState] = useState<'loading' | 'ready' | 'error'>('loading');
  const mounted = useRef(true);
  const committing = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => setArtState('loading'), [map?.art.path]);
  const plane = useRef<HTMLDivElement>(null);
  const searchCard = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const noteCard = useRef<HTMLElement>(null);
  const noteEditButton = useRef<HTMLButtonElement>(null);
  const toolsCard = useRef<HTMLDetailsElement>(null);
  const selectionOpener = useRef<HTMLElement | null>(null);
  const resultsId = useId();
  const drag = useRef<
    | {
        id: number;
        x: number;
        y: number;
        width: number;
        height: number;
        center: { x: number; z: number };
        moved: boolean;
      }
    | undefined
  >(undefined);
  const privateOwner = `${view.worldId}:${view.saveTimeline}:${view.player.id}:${view.access?.scope ?? ''}`;
  useEffect(() => {
    setSelection(undefined);
    setDraft(undefined);
    setAdding(false);
    setMessage('');
    setNoteDraft(undefined);
    setQuery('');
    setBrowsing(false);
    setEditingNote(false);
    setCenter({ x: 0.5, z: 0.5 });
  }, [privateOwner]);
  const selected =
    selection?.kind === 'marker'
      ? map?.markers.find((item) => item.id === selection.id)
      : known.places.find((item) => item.id === selection?.id);
  const noteKey = selection ? `${selection.kind}:${selection.id}` : '';
  const activeNote = noteDraft?.key === noteKey ? noteDraft : undefined;
  const note = activeNote?.text ?? selected?.note?.text ?? '';
  const noteDirty = !!activeNote && activeNote.text !== activeNote.baseText;
  const noteChanged = noteDirty && activeNote.revision !== (selected?.note?.revision ?? 0);
  if (!map)
    return mini ? null : (
      <EmptyState title="No map">This world does not provide map artwork.</EmptyState>
    );
  const b = map.art.bounds;
  const normalized = (point: { x: number; z: number }) => ({
    x: (point.x - b.minX) / (b.maxX - b.minX),
    z: (point.z - b.minZ) / (b.maxZ - b.minZ),
  });
  const player = normalized(view.player.position);
  const focus = mini ? player : center;
  const inside = (point: { x: number; z: number }) =>
    point.x >= 0 && point.x <= 1 && point.z >= 0 && point.z <= 1;
  const clearNoteRefusal = () =>
    setMessage((current) => (current === noteExitRefusal ? '' : current));
  const canLeaveNote = () => {
    if (busy) return false;
    if (!noteDirty) {
      clearNoteRefusal();
      return true;
    }
    setMessage(noteExitRefusal);
    return false;
  };
  const draftAt = (point: { x: number; z: number }, existing?: Marker) => {
    if (!canLeaveNote()) return;
    setDraft({
      id: existing?.id ?? `map-${crypto.randomUUID()}`,
      x: point.x,
      z: point.z,
      label: existing?.label ?? '',
      icon: existing?.icon ?? map.markerIcons[0]!.id,
    });
    setMovingId(undefined);
    setAdding(false);
    setSelection(undefined);
    setNoteDraft(undefined);
    setEditingNote(false);
    setBrowsing(false);
    if (toolsCard.current) toolsCard.current.open = false;
  };
  const mapCenter = {
    x: b.minX + center.x * (b.maxX - b.minX),
    z: b.minZ + center.z * (b.maxZ - b.minZ),
  };
  const select = (item: Selection, point: { x: number; z: number }, opener?: HTMLElement) => {
    if (item.kind === selection?.kind && item.id === selection.id) {
      if (!mini) setCenter(normalized(point));
      return true;
    }
    if ((item.kind !== selection?.kind || item.id !== selection?.id) && !canLeaveNote())
      return false;
    if (draft) {
      setMessage('Save or cancel your marker before choosing another place.');
      return false;
    }
    setSelection(item);
    setNoteDraft(undefined);
    setEditingNote(false);
    selectionOpener.current = opener ?? null;
    setDraft(undefined);
    setAdding(false);
    setMessage('');
    if (!mini) setCenter(normalized(point));
    return true;
  };
  const chooseResult = (item: Selection, point: { x: number; z: number }, opener: HTMLElement) => {
    const focused = document.activeElement;
    const chosen = select(item, point, opener);
    if (!chosen) return;
    setBrowsing(false);
    requestAnimationFrame(() => {
      if (
        mounted.current &&
        (document.activeElement === focused || document.activeElement === document.body)
      )
        noteCard.current?.querySelector<HTMLElement>('h3')?.focus({ preventScroll: true });
    });
  };
  const closeSelection = () => {
    if (!canLeaveNote()) return false;
    setSelection(undefined);
    setNoteDraft(undefined);
    setEditingNote(false);
    requestAnimationFrame(() => {
      if (!mounted.current || document.activeElement !== document.body) return;
      const opener = selectionOpener.current;
      if (opener?.isConnected && opener.getClientRects().length)
        opener.focus({ preventScroll: true });
      else searchInput.current?.focus({ preventScroll: true });
    });
    return true;
  };
  async function commit(path: string, payload: object) {
    if (committing.current) return false;
    committing.current = true;
    setBusy(true);
    setMessage('');
    try {
      const result = await post(path, {
        worldId: view.worldId,
        generation: view.historyEpoch?.split(':')[0] ?? '',
        ...payload,
      });
      if (!mounted.current) return false;
      setMessage(result.message ?? (result.ok ? 'Saved.' : 'Your change was not saved.'));
      return mounted.current && result.ok;
    } catch (error) {
      if (mounted.current) setMessage(error instanceof Error ? error.message : String(error));
      return false;
    } finally {
      committing.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  const search = query.trim().toLocaleLowerCase();
  const matchingMarkers = map.markers.filter(
    (item) => !search || `${item.label} ${item.note.text}`.toLocaleLowerCase().includes(search),
  );
  const matchingPlaces = known.places.filter(
    (item) =>
      !search || `${item.label} ${item.note?.text ?? ''}`.toLocaleLowerCase().includes(search),
  );
  const positionStyle = (point: { x: number; z: number }): CSSProperties => {
    const n = normalized(point);
    return { left: `${n.x * 100}%`, top: `${n.z * 100}%` };
  };
  const changeZoom = (direction: number) => {
    drag.current = undefined;
    setZoom((value) =>
      mini
        ? Math.max(1, Math.min(3, value + direction))
        : Math.max(0.75, Math.min(4, value + direction * 0.25)),
    );
  };
  const cancelMarker = () => {
    if (busy) return;
    setDraft(undefined);
    setAdding(false);
    setMovingId(undefined);
    plane.current?.parentElement?.focus({ preventScroll: true });
  };
  const beginMarker = () => {
    if (!canLeaveNote()) return;
    setMovingId(undefined);
    setAdding(true);
    setDraft(undefined);
    setSelection(undefined);
    setEditingNote(false);
    setBrowsing(false);
    if (toolsCard.current) toolsCard.current.open = false;
    plane.current?.parentElement?.focus({ preventScroll: true });
  };
  return (
    <section
      className={`ol-map-workspace ${mini ? 'ol-map-workspace--minimap' : ''}`}
      aria-label={mini ? 'Minimap' : 'Map'}
      hidden={!visible}
      data-browsing={browsing || undefined}
      onKeyDown={(event) => {
        if (
          mini ||
          event.key !== 'Escape' ||
          event.defaultPrevented ||
          event.nativeEvent.isComposing
        )
          return;
        if (event.target instanceof HTMLSelectElement) {
          event.stopPropagation();
          return;
        }
        const tools = event.target instanceof HTMLElement && event.target.closest('details[open]');
        if (tools instanceof HTMLDetailsElement) {
          event.preventDefault();
          event.stopPropagation();
          tools.open = false;
          tools.querySelector('summary')?.focus();
          return;
        }
        if (browsing && searchCard.current?.contains(event.target as Node)) {
          event.preventDefault();
          event.stopPropagation();
          setBrowsing(false);
          searchInput.current?.focus();
        } else if (draft || adding) {
          event.preventDefault();
          event.stopPropagation();
          cancelMarker();
        } else if (selected) {
          event.preventDefault();
          event.stopPropagation();
          if (editingNote && !noteDirty) {
            setEditingNote(false);
            noteEditButton.current?.focus();
          } else closeSelection();
        } else if (browsing) {
          event.preventDefault();
          event.stopPropagation();
          setBrowsing(false);
          searchInput.current?.focus();
        } else if (toolsCard.current?.open) {
          event.preventDefault();
          event.stopPropagation();
          toolsCard.current.open = false;
          toolsCard.current.querySelector('summary')?.focus();
        }
      }}
    >
      {!mini && (
        <div ref={searchCard} className="ol-map-search">
          <label>
            <span className="ol-sr">Search known places, markers and notes</span>
            <input
              ref={searchInput}
              type="search"
              placeholder="Search places"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setBrowsing(true);
              }}
            />
          </label>
          <IconButton
            icon="ui.places"
            label="Browse places and markers"
            aria-expanded={browsing}
            aria-controls={resultsId}
            onPress={() => setBrowsing((value) => !value)}
          />
          <aside
            id={resultsId}
            className="ol-map-results"
            aria-label="Known places and markers"
            hidden={!browsing}
          >
            {known.loading && <p role="status">Loading known places…</p>}
            {known.newer && (
              <p role="status">
                New place memories or notes are available. Refresh places to read them.
              </p>
            )}
            {known.error && <p role="alert">{known.error}</p>}
            <h3>Known places</h3>
            {matchingPlaces.map((place) => (
              <Button
                key={place.id}
                variant="quiet"
                onPress={(event) =>
                  chooseResult(
                    { kind: 'place', id: place.id },
                    place.position,
                    event.target as HTMLElement,
                  )
                }
              >
                <Icon name="ui.places" size={16} />
                {place.label}
              </Button>
            ))}
            <h3>Your markers</h3>
            {matchingMarkers.map((marker) => (
              <Button
                key={marker.id}
                variant="quiet"
                onPress={(event) =>
                  chooseResult(
                    { kind: 'marker', id: marker.id },
                    marker,
                    event.target as HTMLElement,
                  )
                }
              >
                <Icon
                  name={
                    map.markerIcons.find((icon) => icon.id === marker.icon)?.icon ?? 'ui.map-marker'
                  }
                  size={16}
                />
                {marker.label}
              </Button>
            ))}
            {!matchingPlaces.length && !matchingMarkers.length && !known.loading && (
              <p>
                {query
                  ? 'No matching place, marker or note.'
                  : 'Places you learn and markers you add appear here.'}
              </p>
            )}
            <Button variant="quiet" disabled={known.loading} onPress={known.refresh}>
              Refresh places
            </Button>
          </aside>
        </div>
      )}
      <div className="ol-map-body">
        <div className="ol-map-stage">
          <div
            className="ol-map-viewport"
            tabIndex={mini ? -1 : 0}
            aria-label={
              mini
                ? 'Your known map'
                : adding
                  ? 'Choose a point for your marker'
                  : 'Map. Drag to pan; arrow keys also pan. Plus and minus zoom.'
            }
            onWheel={(event) => {
              if (!mini) {
                event.preventDefault();
                changeZoom(event.deltaY < 0 ? 1 : -1);
              }
            }}
            onKeyDown={(event) => {
              if (mini) return;
              const moves: Record<string, { x: number; z: number }> = {
                ArrowLeft: { x: -0.05, z: 0 },
                ArrowRight: { x: 0.05, z: 0 },
                ArrowUp: { x: 0, z: -0.05 },
                ArrowDown: { x: 0, z: 0.05 },
              };
              const step = moves[event.key];
              if (step) {
                event.preventDefault();
                event.stopPropagation();
                setCenter((value) => ({
                  x: Math.max(0, Math.min(1, value.x + step.x / zoom)),
                  z: Math.max(0, Math.min(1, value.z + step.z / zoom)),
                }));
              }
              if (event.key === '+' || event.key === '-' || event.key === '=') {
                event.preventDefault();
                event.stopPropagation();
                changeZoom(event.key === '-' ? -1 : 1);
              }
            }}
            onPointerDown={(event) => {
              if (mini || event.button !== 0 || (event.target as HTMLElement).closest('button'))
                return;
              const rect = plane.current?.getBoundingClientRect();
              if (!rect) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              drag.current = {
                id: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                width: rect.width,
                height: rect.height,
                center,
                moved: false,
              };
            }}
            onPointerMove={(event) => {
              const active = drag.current;
              if (!active || active.id !== event.pointerId) return;
              const dx = event.clientX - active.x,
                dz = event.clientY - active.y;
              if (Math.abs(dx) + Math.abs(dz) > 4) active.moved = true;
              if (adding) return;
              if (active.moved)
                setCenter({
                  x: Math.max(0, Math.min(1, active.center.x - dx / active.width)),
                  z: Math.max(0, Math.min(1, active.center.z - dz / active.height)),
                });
            }}
            onPointerUp={(event) => {
              const active = drag.current;
              drag.current = undefined;
              if (!active || active.id !== event.pointerId) return;
              if (adding && !active.moved) {
                const rect = plane.current?.getBoundingClientRect();
                if (!rect) return;
                const x = (event.clientX - rect.left) / rect.width,
                  z = (event.clientY - rect.top) / rect.height;
                if (x < 0 || x > 1 || z < 0 || z > 1) return;
                draftAt(
                  {
                    x: b.minX + x * (b.maxX - b.minX),
                    z: b.minZ + z * (b.maxZ - b.minZ),
                  },
                  map.markers.find((marker) => marker.id === movingId),
                );
              }
            }}
            onPointerCancel={() => {
              drag.current = undefined;
            }}
          >
            <div
              className="ol-map-plane"
              ref={plane}
              style={
                {
                  aspectRatio: aspect,
                  transformOrigin: `${focus.x * 100}% ${focus.z * 100}%`,
                  transform: `translate(${-focus.x * 100}%, ${-focus.z * 100}%) scale(${zoom})`,
                  '--ol-map-symbol-scale': 1 / zoom,
                  '--ol-map-aspect': aspect,
                } as CSSProperties
              }
            >
              <img
                src={assetUrl(map.art.path)}
                alt=""
                draggable={false}
                onLoad={(event) => {
                  const image = event.currentTarget;
                  if (image.naturalHeight) setAspect(image.naturalWidth / image.naturalHeight);
                  setArtState('ready');
                }}
                onError={() => setArtState('error')}
              />
              {map.markers.map(
                (item) =>
                  inside(normalized(item)) && (
                    <button
                      key={item.id}
                      className={`ol-map-marker ${selection?.kind === 'marker' && selection.id === item.id ? 'is-selected' : ''}`}
                      style={positionStyle(item)}
                      aria-label={`Marker: ${item.label}`}
                      tabIndex={mini ? -1 : 0}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (mini) onOpenMap?.();
                        else select({ kind: 'marker', id: item.id }, item, event.currentTarget);
                      }}
                    >
                      <Icon
                        name={
                          map.markerIcons.find((icon) => icon.id === item.icon)?.icon ??
                          'ui.map-marker'
                        }
                      />
                      <span className="ol-map-label">{item.label}</span>
                    </button>
                  ),
              )}
              {known.places.map(
                (place) =>
                  inside(normalized(place.position)) && (
                    <button
                      key={place.id}
                      className={`ol-map-place ${selection?.kind === 'place' && selection.id === place.id ? 'is-selected' : ''}`}
                      style={positionStyle(place.position)}
                      aria-label={`Known place: ${place.label}`}
                      tabIndex={mini ? -1 : 0}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (mini) onOpenMap?.();
                        else
                          select(
                            { kind: 'place', id: place.id },
                            place.position,
                            event.currentTarget,
                          );
                      }}
                    >
                      <Icon name="ui.places" />
                      <span className="ol-map-label">{place.label}</span>
                    </button>
                  ),
              )}
              {inside(player) && (
                <span
                  className="ol-map-player"
                  style={positionStyle(view.player.position)}
                  title={view.player.name}
                >
                  {mini ? (
                    <img
                      className="ol-map-facing"
                      src={assetUrl(
                        'apps/client/src/design-system/gildmoss/icons/hud/hud-player-marker.svg',
                      )}
                      alt=""
                      width={22}
                      height={22}
                      style={{
                        // The image's map bounds define x-right/z-down. Project
                        // the native heading into that same image, including aspect.
                        transform: `rotate(${Math.atan2(
                          Math.sin(view.player.heading) / (b.maxX - b.minX),
                          -Math.cos(view.player.heading) / ((b.maxZ - b.minZ) * aspect),
                        )}rad)`,
                      }}
                    />
                  ) : (
                    <Portrait art={view.player.portrait} size={42} />
                  )}
                  <span className="ol-sr">{view.player.name}</span>
                </span>
              )}
              {draft && (
                <span className="ol-map-draft" style={positionStyle(draft)}>
                  <Icon
                    name={
                      map.markerIcons.find((icon) => icon.id === draft.icon)?.icon ??
                      'ui.map-marker'
                    }
                  />
                </span>
              )}
            </div>
            {mini && <button className="ol-map-open" aria-label="Open Map" onClick={onOpenMap} />}
          </div>
          {artState !== 'ready' && (
            <p className="ol-map-art-state" role={artState === 'error' ? 'alert' : 'status'}>
              {artState === 'error' ? 'Map artwork could not load.' : 'Loading map…'}
            </p>
          )}
          <div
            className="ol-map-north"
            aria-label="North"
            style={{ transform: `rotate(${map.art.northDegrees}deg)` }}
          >
            N
          </div>
          <div className="ol-map-zoom">
            {!mini && (
              <IconButton
                icon="ui.map-marker"
                label="Add marker"
                disabled={busy || !!draft || map.markers.length >= map.maxMarkers}
                onPress={beginMarker}
              />
            )}
            <IconButton icon="ui.plus" label="Zoom map in" onPress={() => changeZoom(1)} />
            <IconButton icon="ui.minus" label="Zoom map out" onPress={() => changeZoom(-1)} />
          </div>
          {!mini && (
            <details ref={toolsCard} className="ol-map-tools">
              <summary>Map tools</summary>
              <div className="ol-map-marker-controls">
                <Button variant="quiet" onPress={() => setCenter(player)}>
                  Find me
                </Button>
                <Button
                  disabled={busy || !!draft || map.markers.length >= map.maxMarkers}
                  onPress={beginMarker}
                >
                  Add marker
                </Button>
                <Button
                  variant="quiet"
                  disabled={
                    busy || !!draft || map.markers.length >= map.maxMarkers || !inside(player)
                  }
                  onPress={() => draftAt(view.player.position)}
                >
                  Mark my position
                </Button>
                <Button
                  variant="quiet"
                  disabled={busy || !!draft || (!movingId && map.markers.length >= map.maxMarkers)}
                  onPress={() =>
                    draftAt(
                      mapCenter,
                      map.markers.find((marker) => marker.id === movingId),
                    )
                  }
                >
                  {movingId ? 'Move to map centre' : 'Mark map centre'}
                </Button>
                <Button variant="quiet" disabled={known.loading} onPress={known.refresh}>
                  Refresh places
                </Button>
              </div>
            </details>
          )}
        </div>
        {!mini && (draft || selected) && (
          <aside
            ref={noteCard}
            className="ol-map-sidebar"
            aria-label="Map places and notes"
            data-editing={!!draft || editingNote || undefined}
          >
            {draft ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void commit('/api/map/marker', { ...draft, expectedRevision: map.revision }).then(
                    (ok) => {
                      if (ok) {
                        setSelection({ kind: 'marker', id: draft.id });
                        setDraft(undefined);
                        plane.current?.parentElement?.focus({ preventScroll: true });
                      }
                    },
                  );
                }}
              >
                <div className="ol-map-card-head">
                  <h3 tabIndex={-1}>
                    {map.markers.some((marker) => marker.id === draft.id)
                      ? 'Edit marker'
                      : 'New marker'}
                  </h3>
                  <IconButton
                    icon="ui.close"
                    label="Cancel marker"
                    disabled={busy}
                    onPress={cancelMarker}
                  />
                </div>
                <label>
                  Label
                  <input
                    autoFocus
                    disabled={busy}
                    maxLength={map.labelCharacters * 2}
                    value={draft.label}
                    onChange={(event) => setDraft({ ...draft, label: event.target.value })}
                  />
                </label>
                <p className="ol-caption">
                  {Array.from(draft.label.trim()).length} / {map.labelCharacters} characters
                </p>
                <label>
                  Icon
                  <select
                    disabled={busy}
                    value={draft.icon}
                    onChange={(event) => setDraft({ ...draft, icon: event.target.value })}
                  >
                    {map.markerIcons.map((icon) => (
                      <option key={icon.id} value={icon.id}>
                        {icon.label}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  type="submit"
                  disabled={
                    busy ||
                    !draft.label.trim() ||
                    Array.from(draft.label.trim()).length > map.labelCharacters
                  }
                >
                  Save marker
                </Button>
                <Button variant="quiet" disabled={busy} onPress={cancelMarker}>
                  Cancel
                </Button>
              </form>
            ) : selected ? (
              <div>
                <div className="ol-map-card-head">
                  <h3 tabIndex={-1}>{selected.label}</h3>
                  {map.noteCharacters !== undefined && (
                    <Button
                      size="sm"
                      variant="quiet"
                      aria-label={
                        editingNote ? 'Close note editor' : note ? 'Edit note' : 'Add note'
                      }
                      disabled={busy}
                      onPress={(event) => {
                        const focused = document.activeElement;
                        noteEditButton.current = event.target as HTMLButtonElement;
                        if (editingNote) {
                          if (canLeaveNote()) setEditingNote(false);
                        } else {
                          setEditingNote(true);
                          requestAnimationFrame(() => {
                            if (
                              mounted.current &&
                              (document.activeElement === focused ||
                                document.activeElement === document.body)
                            )
                              noteCard.current
                                ?.querySelector<HTMLTextAreaElement>('textarea')
                                ?.focus({ preventScroll: true });
                          });
                        }
                      }}
                    >
                      <Icon name="ui.edit" />
                    </Button>
                  )}
                  <IconButton
                    icon="ui.close"
                    label="Close place note"
                    disabled={busy}
                    onPress={closeSelection}
                  />
                </div>
                {map.noteCharacters !== undefined && !editingNote && (
                  <div className="ol-map-note-preview">
                    <p>{note || 'No note yet.'}</p>
                  </div>
                )}
                <div
                  className="ol-map-note-editor"
                  hidden={map.noteCharacters === undefined || !editingNote}
                >
                  <label>
                    Your note
                    <textarea
                      disabled={busy}
                      rows={4}
                      value={note}
                      onChange={(event) =>
                        setNoteDraft({
                          key: noteKey,
                          text: event.target.value,
                          baseText: activeNote?.baseText ?? selected.note?.text ?? '',
                          revision: activeNote?.revision ?? selected.note?.revision ?? 0,
                        })
                      }
                    />
                  </label>
                  <p className="ol-caption">
                    {Array.from(note).length} / {map.noteCharacters} characters · Revision{' '}
                    {activeNote?.revision ?? selected.note?.revision ?? 0}
                  </p>
                  <Button
                    disabled={
                      busy ||
                      !noteDirty ||
                      noteChanged ||
                      map.noteCharacters === undefined ||
                      Array.from(note).length > map.noteCharacters
                    }
                    onPress={() => {
                      const focused = document.activeElement;
                      void commit('/api/knowledge', {
                        actorId: view.player.id,
                        subjectId:
                          selection?.kind === 'place'
                            ? { kind: 'place', placeId: selected.id }
                            : { kind: 'map-marker', markerId: selected.id },
                        expectedRevision: activeNote?.revision ?? 0,
                        text: note,
                        ...(selection?.kind === 'place'
                          ? { place: placeReference(selected as KnownPlaceView) }
                          : {}),
                      }).then((ok) => {
                        if (ok) {
                          setNoteDraft(undefined);
                          setEditingNote(false);
                          requestAnimationFrame(() => {
                            const target = noteEditButton.current;
                            if (
                              mounted.current &&
                              target?.isConnected &&
                              target.getClientRects().length &&
                              (document.activeElement === focused ||
                                document.activeElement === document.body)
                            )
                              target.focus({ preventScroll: true });
                          });
                        }
                      });
                    }}
                  >
                    Save note
                  </Button>
                  {noteChanged && (
                    <p role="status">
                      This note changed while you were editing. Your draft is kept; discard it to
                      read the current note.
                    </p>
                  )}
                  {noteDirty && (
                    <Button
                      variant="quiet"
                      disabled={busy}
                      onPress={() => {
                        setNoteDraft(undefined);
                        clearNoteRefusal();
                        noteCard.current
                          ?.querySelector<HTMLTextAreaElement>('textarea')
                          ?.focus({ preventScroll: true });
                      }}
                    >
                      Discard note changes
                    </Button>
                  )}
                </div>
                {selection?.kind === 'marker' && (
                  <details className="ol-map-marker-actions">
                    <summary>Marker actions</summary>
                    <div className="ol-button-row">
                      <Button
                        variant="quiet"
                        onPress={() => draftAt(selected as Marker, selected as Marker)}
                      >
                        Edit marker
                      </Button>
                      <Button
                        variant="quiet"
                        onPress={() => {
                          if (!canLeaveNote()) return;
                          setMovingId(selected.id);
                          setAdding(true);
                          setSelection(undefined);
                          plane.current?.parentElement?.focus({ preventScroll: true });
                        }}
                      >
                        Move marker
                      </Button>
                      <Button
                        variant="quiet"
                        disabled={!inside(player)}
                        onPress={() => draftAt(view.player.position, selected as Marker)}
                      >
                        Move to my position
                      </Button>
                      <Button
                        variant="quiet"
                        disabled={busy}
                        onPress={() => {
                          if (!canLeaveNote()) return;
                          void commit('/api/map/marker', {
                            id: selected.id,
                            expectedRevision: map.revision,
                            remove: true,
                          }).then((ok) => {
                            if (ok) closeSelection();
                          });
                        }}
                      >
                        Delete marker
                      </Button>
                    </div>
                  </details>
                )}
                <Button
                  variant="quiet"
                  onPress={() => {
                    if (closeSelection()) setBrowsing(true);
                  }}
                >
                  Back to places
                </Button>
              </div>
            ) : null}
            {message && <p role="status">{message}</p>}
          </aside>
        )}
      </div>
      {!mini && (adding || (!draft && !selected && (message || (!browsing && known.error)))) && (
        <p className="ol-map-message" role={known.error && !message ? 'alert' : 'status'}>
          {message || known.error || (
            <>
              Choose a point on the map, or pan with the arrow keys and use{' '}
              {movingId ? 'Move to map centre' : 'Mark map centre'} in Map tools.
            </>
          )}
        </p>
      )}
    </section>
  );
}

/** Owner-keying clears private drafts before a different actor can render them. */
export function MapWorkspace(props: Parameters<typeof OwnedMapWorkspace>[0]) {
  const { view, mode } = props;
  return (
    <OwnedMapWorkspace
      key={`${view.worldId}:${view.saveTimeline}:${view.historyEpoch}:${view.player.id}:${view.access?.scope ?? ''}:${mode ?? 'full'}`}
      {...props}
    />
  );
}
