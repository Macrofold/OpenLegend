import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type RefObject,
  type ReactNode,
} from 'react';
import type { GameView } from '@open-legend/protocol';
import { assetUrl, readAssetBytes, readAssetJson } from '../asset-files';
import { Button, Condition, IconButton, TextTooltip } from '../design-system/components';
import { JadeGlass } from '../design-system/jade-glass';
import { Portrait } from '../design-system/portrait';
import { ConditionStatuses, type ConditionStatusLayout } from './gildmoss-hud';
import { CharacterPanelLockRim, CharacterStatusFrame } from './character-panel-frame';
import './character-panel.css';

const panelRoot = 'apps/client/src/design-system/art/character-panels';
type Rect = [number, number, number, number];
export interface CharacterPanelStyle {
  id: string;
  name: string;
  size: [number, number];
  layout: string;
  plate: string;
}
interface CharacterPanelArt {
  id: string;
  size: [number, number];
  layout: {
    portrait: {
      centre: [number, number];
      drawRadius: [number, number];
      windowClip?: { maxX: number; minY: number; maxY: number };
    };
    glass: {
      needs: Rect;
      statuses: Rect;
      lockButtonFace?: { centre: [number, number]; radius: number };
    };
    needs: {
      rows: Array<{
        track: Rect;
        icon: Rect;
        value: { x: number; y: number; w: number; h: number; align: 'left' | 'right' };
      }>;
    };
    statuses: ConditionStatusLayout;
    lockButton: {
      centre: [number, number];
      faceRadius: number;
      rimRadius: number;
      face: string;
    };
  };
}

interface PreparedImage {
  url: string;
  release(): void;
}
interface PreparedCharacterPanel extends CharacterPanelArt {
  images: { plate: PreparedImage; density: number };
}

/** Native decoding only sees already verified local bytes. Cancellation clears
 * the detached image and its object URL; it never starts another HTTP loader. */
async function prepareImage(path: string, signal: AbortSignal): Promise<PreparedImage> {
  const bytes = await readAssetBytes(assetUrl(path), signal);
  signal.throwIfAborted();
  const url = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
  const image = new Image();
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    image.removeAttribute('src');
    URL.revokeObjectURL(url);
  };
  let cancel: (() => void) | undefined;
  try {
    const cancelled = new Promise<never>((_, reject) => {
      cancel = () => {
        image.removeAttribute('src');
        reject(signal.reason);
      };
      signal.addEventListener('abort', cancel, { once: true });
    });
    image.src = url;
    await Promise.race([image.decode(), cancelled]);
    signal.throwIfAborted();
    return { url, release };
  } catch (error) {
    release();
    throw error;
  } finally {
    if (cancel) signal.removeEventListener('abort', cancel);
  }
}

/** Metadata and decoded images enter the visible panel together. A changed
 * choice cancels its pending preparation; no other style is prefetched. */
export function useCharacterPanelArt(styleId: string, enabled: boolean, scale: number) {
  const [catalog, setCatalog] = useState<{
    default: string;
    styles: CharacterPanelStyle[];
  }>();
  const styles = catalog?.styles ?? [];
  const [art, setArt] = useState<PreparedCharacterPanel>();
  const [resources] = useState(() => new Set<PreparedCharacterPanel['images']>());
  const [failedArt, setFailedArt] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (catalog) return;
    const download = new AbortController();
    setError(false);
    void readAssetJson<{ default: string; styles: CharacterPanelStyle[] }>(
      `${panelRoot}/styles.json`,
      download.signal,
    )
      .then((next) => {
        if (!download.signal.aborted) setCatalog(next);
      })
      .catch(() => {
        if (!download.signal.aborted) {
          setError(true);
          setLoading(false);
        }
      });
    return () => download.abort();
  }, [retry, catalog]);
  const selected =
    styles.find((style) => style.id === styleId) ??
    styles.find((style) => style.id === catalog?.default);
  const density = window.devicePixelRatio * scale > 1 ? 2 : 1;
  useLayoutEffect(() => {
    // Retire the old URLs after the new complete panel has entered the DOM.
    for (const images of resources)
      if (images !== art?.images) {
        images.plate.release();
        resources.delete(images);
      }
  }, [art, resources]);
  useEffect(
    () => () => {
      for (const images of resources) {
        images.plate.release();
      }
      resources.clear();
    },
    [resources],
  );
  useEffect(() => {
    if (!enabled || !selected) return;
    const download = new AbortController();
    const signal = AbortSignal.any([download.signal, AbortSignal.timeout(15000)]);
    let preparing: PreparedImage | undefined;
    let published = false;
    setLoading(true);
    setError(false);
    void readAssetJson<CharacterPanelArt>(`${panelRoot}/${selected.layout}`, signal)
      .then(async (next) => {
        signal.throwIfAborted();
        // Clear Slab draws the glass natively. Its old PNG stays preserved in
        // the asset release but no longer needs a download or decoded handle.
        preparing = await prepareImage(`${panelRoot}/${next.id}/plate@${density}x.png`, signal);
        signal.throwIfAborted();
        const images = { plate: preparing, density };
        resources.add(images);
        setArt({ ...next, images });
        published = true;
        setError(false);
        setLoading(false);
      })
      .catch(() => {
        if (!published) preparing?.release();
        if (!download.signal.aborted) {
          download.abort();
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      download.abort();
      if (!published) preparing?.release();
    };
  }, [enabled, selected, retry, density, resources]);
  return {
    styles,
    selectedId: selected?.id ?? styleId,
    art: art?.id === failedArt ? undefined : art,
    loading: enabled && loading,
    error,
    imageFailed: useCallback(() => {
      setFailedArt(art?.id);
      setError(true);
    }, [art?.id]),
    retry: useCallback(() => {
      setFailedArt(undefined);
      setRetry((value) => value + 1);
    }, []),
  };
}

function rectangle([left, top, width, height]: Rect): CSSProperties {
  return { left, top, width, height };
}

function rowGeometry(row: CharacterPanelArt['layout']['needs']['rows'][number]): CSSProperties {
  const [tx, ty, tw, th] = row.track;
  const [ix, iy, iw, ih] = row.icon;
  const { x: vx, y: vy, w: vw, h: vh } = row.value;
  const left = Math.min(tx, ix, vx);
  const top = Math.min(ty, iy, vy);
  return {
    left,
    top,
    width: Math.max(tx + tw, ix + iw, vx + vw) - left,
    height: Math.max(ty + th, iy + ih, vy + vh) - top,
    '--cp-icon-x': `${ix - left}px`,
    '--cp-icon-y': `${iy - top}px`,
    '--cp-icon-width': `${iw}px`,
    '--cp-icon-height': `${ih}px`,
    '--cp-track-x': `${tx - left}px`,
    '--cp-track-y': `${ty - top}px`,
    '--cp-track-width': `${tw}px`,
    '--cp-track-height': `${th}px`,
    '--cp-value-x': `${vx - left}px`,
    '--cp-value-y': `${vy + vh / 2 - top}px`,
    '--cp-value-width': `${vw}px`,
    '--cp-value-align': row.value.align,
  } as CSSProperties;
}

/** The plate's lower well is independent of the portrait/needs. Locks below
 * the header move beside the needs so an empty tray can disappear. */
export function characterPanelGeometry({ layout, size }: CharacterPanelArt) {
  const { glass, portrait, lockButton } = layout;
  const headerHeight = Math.min(
    glass.statuses[1],
    Math.ceil(
      Math.max(
        glass.needs[1] + glass.needs[3] + 4,
        portrait.centre[1] + portrait.drawRadius[1] + 2,
      ),
    ),
  );
  const movedLock = lockButton.centre[1] + lockButton.rimRadius > headerHeight;
  const lockCentre: [number, number] = movedLock
    ? [
        glass.needs[0] + glass.needs[2] + lockButton.rimRadius + 8,
        glass.needs[1] + glass.needs[3] / 2,
      ]
    : lockButton.centre;
  return {
    headerHeight,
    // Preserve the ornamental collar outside the live portrait ellipse when
    // the lower well disappears; a rectangular crop cuts the gold rim flat.
    headerArtHeight: Math.max(headerHeight, portrait.centre[1] + portrait.drawRadius[1] + 16),
    movedLock,
    lockCentre,
    width: Math.max(size[0], Math.ceil(lockCentre[0] + lockButton.rimRadius + 2)),
  };
}

export function CharacterPanel({
  art,
  view,
  panelRef,
  openCondition,
  perspectiveLocked,
  togglePerspective,
  children,
  imageFailed,
}: {
  art: PreparedCharacterPanel;
  view: GameView;
  panelRef: RefObject<HTMLElement | null>;
  openCondition(): void;
  perspectiveLocked: boolean;
  togglePerspective(): void;
  children?: ReactNode;
  imageFailed(): void;
}) {
  const id = useId();
  const { layout } = art;
  const { portrait, glass, lockButton } = layout;
  const geometry = characterPanelGeometry(art);
  const [cx, cy] = portrait.centre;
  const [rx, ry] = portrait.drawRadius;
  const window = portrait.windowClip;
  const lockFace =
    glass.lockButtonFace ??
    (lockButton.face.startsWith('glass')
      ? { centre: lockButton.centre, radius: lockButton.faceRadius }
      : undefined);
  return (
    <section
      ref={panelRef}
      className="ol-survival ol-character-panel"
      aria-label="Your condition"
      data-character-panel={art.id}
      style={
        {
          width: geometry.width,
          '--cp-header-height': `${geometry.headerHeight}px`,
          '--cp-header-art-height': `${geometry.headerArtHeight}px`,
        } as CSSProperties
      }
    >
      <svg width="0" height="0" aria-hidden="true" className="ol-character-panel-clips">
        <defs>
          <clipPath id={`${id}-header`} clipPathUnits="userSpaceOnUse">
            <rect width={art.size[0]} height={geometry.headerHeight} />
            <ellipse cx={cx} cy={cy} rx={rx + 14} ry={ry + 16} />
          </clipPath>
          <clipPath id={`${id}-portrait`} clipPathUnits="objectBoundingBox">
            <ellipse cx="0.5" cy="0.5" rx="0.5" ry="0.5" />
            {/* The package's Mossbound mask includes the right half, then
             * intersects both shapes with its straight window edges below. */}
            {window && <rect x="0.5" y="0" width="0.5" height="1" />}
          </clipPath>
          {window && (
            <clipPath id={`${id}-window`}>
              <rect x="0" y={window.minY} width={window.maxX} height={window.maxY - window.minY} />
            </clipPath>
          )}
        </defs>
      </svg>
      <div className="ol-character-panel-glass" aria-hidden="true" style={rectangle(glass.needs)}>
        <JadeGlass identity={`character:${art.id}:needs`} bezel={false} />
      </div>
      {lockFace && (
        <div
          className="ol-character-panel-glass ol-character-panel-lock-face"
          aria-hidden="true"
          style={{
            left: geometry.lockCentre[0] - lockFace.radius,
            top: geometry.lockCentre[1] - lockFace.radius,
            width: lockFace.radius * 2,
            height: lockFace.radius * 2,
          }}
        >
          <JadeGlass identity={`character:${art.id}:lock`} bezel={false} />
        </div>
      )}
      <div
        className="ol-character-panel-portrait-window"
        style={window ? { clipPath: `url(#${id}-window)` } : undefined}
      >
        <TextTooltip text={`Character (C) · ${view.player.name}`}>
          <Button
            variant="quiet"
            className="ol-character-panel-portrait"
            aria-label={`Character: ${view.player.name} (C)`}
            onPress={openCondition}
            style={{
              left: cx - rx,
              top: cy - ry,
              width: rx * 2,
              height: ry * 2,
              clipPath: `url(#${id}-portrait)`,
            }}
          >
            <Portrait art={view.player.portrait} size={rx * 2} />
          </Button>
        </TextTooltip>
      </div>
      {/* Mike selected positions 1–3 for the three installed rows. The fourth
       * art position stays unused; artwork never supplies a world attribute. */}
      {view.player.attributes.map((attribute, index) => {
        const row = layout.needs.rows[index];
        return row ? (
          <div className="ol-character-panel-meter" key={attribute.id} style={rowGeometry(row)}>
            <Condition attributes={[attribute]} />
          </div>
        ) : null;
      })}
      <div
        className="ol-character-panel-header-art"
        style={{ height: geometry.headerArtHeight, width: art.size[0] }}
      >
        <img
          key={art.images.plate.url}
          className="ol-character-panel-plate"
          src={art.images.plate.url}
          data-asset-path={`${panelRoot}/${art.id}/plate@${art.images.density}x.png`}
          width={art.size[0]}
          height={art.size[1]}
          alt=""
          draggable={false}
          style={{ clipPath: `url(#${id}-header)` }}
          onError={imageFailed}
        />
      </div>
      <div className="ol-character-panel-body">
        <div
          className="ol-character-panel-status"
          style={{
            width: art.size[0],
            paddingTop: glass.statuses[1] - geometry.headerHeight,
            paddingBottom: art.size[1] - glass.statuses[1] - glass.statuses[3],
          }}
        >
          <div
            className="ol-character-panel-status-well"
            style={{ marginLeft: glass.statuses[0], width: glass.statuses[2] }}
          >
            <div className="ol-character-panel-glass" aria-hidden="true">
              <JadeGlass identity={`character:${art.id}:statuses`} bezel={false} />
            </div>
            <ConditionStatuses view={view} openCondition={openCondition} layout={layout.statuses} />
          </div>
          <CharacterStatusFrame
            plateUrl={art.images.plate.url}
            size={art.size}
            glass={glass.statuses}
            headerCut={geometry.headerHeight}
            removedLock={
              geometry.movedLock
                ? { centre: lockButton.centre, radius: lockButton.rimRadius + 1 }
                : undefined
            }
          />
        </div>
        <div className="ol-character-panel-notices">{children}</div>
      </div>
      {geometry.movedLock && (
        <CharacterPanelLockRim
          plateUrl={art.images.plate.url}
          size={art.size}
          sourceCentre={lockButton.centre}
          centre={geometry.lockCentre}
          radius={lockButton.rimRadius}
        />
      )}
      <div
        className="ol-character-panel-lock"
        style={{
          left: geometry.lockCentre[0] - lockButton.faceRadius,
          top: geometry.lockCentre[1] - lockButton.faceRadius,
          width: lockButton.faceRadius * 2,
          height: lockButton.faceRadius * 2,
        }}
      >
        <IconButton
          icon="ui.lock-perspective"
          label="Lock perspective"
          pressed={perspectiveLocked}
          onPress={togglePerspective}
        />
      </div>
    </section>
  );
}
