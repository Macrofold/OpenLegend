import type { ConstructionView } from '@open-legend/protocol';

type Family = Extract<ConstructionView, { ok: true }>['family'];

/** A picture of the installed arrangement, not a catalogue of hard-coded buildings. */
export function ConstructionIllustration({
  arrangement,
  family,
}: {
  arrangement: Family['arrangements'][number];
  family: Family;
}) {
  const height = Math.max(...arrangement.rowHeights, 1);
  const project = (x: number, z: number, y: number) =>
    `${100 + x * 35 - z * 25},${107 + x * 10 + z * 15 - (y / height) * 65}`;
  const corners = [
    [-1, -1, arrangement.rowHeights[0]],
    [1, -1, arrangement.rowHeights[0]],
    [1, 1, arrangement.rowHeights[1]],
    [-1, 1, arrangement.rowHeights[1]],
  ] as const;
  return (
    <svg className="ol-building-illustration" viewBox="0 0 200 145" aria-hidden="true">
      <ellipse cx="100" cy="116" rx="78" ry="22" fill="currentColor" opacity=".08" />
      {corners.map(([x, z, y], index) => {
        const [x1, y1] = project(x, z, 0).split(',');
        const [x2, y2] = project(x, z, y).split(',');
        return (
          <line
            key={index}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#ac9470"
            strokeWidth={Math.max(4, family.bay.postSection * 25)}
          />
        );
      })}
      <polygon
        points={corners.map(([x, z, y]) => project(x, z, y)).join(' ')}
        fill="#b7bb86"
        stroke="#e1dfb1"
        strokeWidth="2"
      />
      <path
        d={`M ${project(-1, -1, arrangement.rowHeights[0])} L ${project(1, 1, arrangement.rowHeights[1])}`}
        fill="none"
        stroke="#89936f"
        opacity=".5"
      />
    </svg>
  );
}
