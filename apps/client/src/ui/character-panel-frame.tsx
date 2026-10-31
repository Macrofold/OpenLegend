import { useId, type CSSProperties } from 'react';

type Point = readonly [number, number];
type Rect = readonly [number, number, number, number];
type LockDisk = { centre: Point; radius: number };

/** Keep the plate's rims and corners at their authored size while only the
 * quiet side edges and lower backing adapt to the live status groups. */
export function CharacterStatusFrame({
  plateUrl,
  size,
  glass,
  headerCut,
  removedLock,
}: {
  plateUrl: string;
  size: Point;
  glass: Rect;
  headerCut: number;
  removedLock?: LockDisk;
}) {
  const maskId = `${useId()}-status-frame`;
  const [width, height] = size;
  const [glassX, glassY, glassWidth, glassHeight] = glass;
  const glassRight = glassX + glassWidth;
  const bottomCut = glassY + glassHeight - 8;
  const topHeight = glassY - headerCut;
  const bottomHeight = height - bottomCut;
  const middleHeight = `calc(100% - ${topHeight + bottomHeight}px)`;
  const outsideLock = removedLock && removedLock.centre[0] > glassRight;
  const edgeX = Math.floor(glassRight) - 1;
  // The six-pixel strip includes the quiet edge and its transparent surround.
  // Four pixels beyond the nearest glass boundary retain the corner while
  // excluding the lock housing.
  const outsideTrim = Math.round(glassRight) + 4;
  const band = (top: number, sourceHeight: number, style: CSSProperties) => (
    <svg
      viewBox={`0 ${top} ${width} ${sourceHeight}`}
      preserveAspectRatio="none"
      focusable="false"
      style={{ position: 'absolute', left: 0, width, overflow: 'hidden', ...style }}
    >
      <image href={plateUrl} width={width} height={height} mask={`url(#${maskId})`} />
    </svg>
  );
  return (
    <div
      className="ol-character-panel-status-frame"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <svg width="0" height="0" focusable="false" style={{ position: 'absolute' }}>
        <defs>
          <mask
            id={maskId}
            maskUnits="userSpaceOnUse"
            maskContentUnits="userSpaceOnUse"
            x="0"
            y="0"
            width={width}
            height={height}
          >
            <rect width={width} height={height} fill="white" />
            {/* The source interior includes dividers and some lock rims; only
             * the frame belongs here. Live glass and grouping draw beneath it. */}
            <rect x={glassX} y={glassY} width={glassWidth} height={glassHeight} fill="black" />
            {removedLock && (
              <circle
                cx={removedLock.centre[0]}
                cy={removedLock.centre[1]}
                r={removedLock.radius}
                fill="black"
              />
            )}
            {outsideLock && (
              <>
                <rect x={outsideTrim} width={width - outsideTrim} height={height} fill="black" />
                <rect x={edgeX} y={glassY} width="6" height={bottomCut - glassY} fill="black" />
              </>
            )}
          </mask>
        </defs>
      </svg>
      {band(headerCut, topHeight, { top: 0, height: topHeight })}
      {band(glassY, bottomCut - glassY, {
        top: topHeight,
        height: middleHeight,
      })}
      {band(bottomCut, bottomHeight, { bottom: 0, height: bottomHeight })}
      {outsideLock && (
        <svg
          viewBox={`${edgeX} ${glassY + 8} 6 4`}
          preserveAspectRatio="none"
          focusable="false"
          style={{
            position: 'absolute',
            left: edgeX,
            top: topHeight,
            width: 6,
            height: middleHeight,
            overflow: 'hidden',
          }}
        >
          <image href={plateUrl} width={width} height={height} />
        </svg>
      )}
    </div>
  );
}

/** Reuse the original lock rim without stretching it with the status tray. */
export function CharacterPanelLockRim({
  plateUrl,
  size,
  sourceCentre,
  centre,
  radius,
}: {
  plateUrl: string;
  size: Point;
  sourceCentre: Point;
  centre: Point;
  radius: number;
}) {
  const clipId = `${useId()}-lock-rim`;
  const diameter = radius * 2;
  return (
    <svg
      className="ol-character-panel-lock-rim"
      aria-hidden="true"
      focusable="false"
      viewBox={`${sourceCentre[0] - radius} ${sourceCentre[1] - radius} ${diameter} ${diameter}`}
      style={{
        position: 'absolute',
        left: centre[0] - radius,
        top: centre[1] - radius,
        width: diameter,
        height: diameter,
        pointerEvents: 'none',
      }}
    >
      <defs>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          <circle cx={sourceCentre[0]} cy={sourceCentre[1]} r={radius} />
        </clipPath>
      </defs>
      <image href={plateUrl} width={size[0]} height={size[1]} clipPath={`url(#${clipId})`} />
    </svg>
  );
}
