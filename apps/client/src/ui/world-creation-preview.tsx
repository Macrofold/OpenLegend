import { useId } from 'react';
import type { WorldCreationPreview } from '@open-legend/protocol';
import './world-creation.css';

/** This is authored setup, never a projection or command target in the source world. */
export function WorldCreationPreviewView({ preview }: { preview: WorldCreationPreview }) {
  const title = useId();
  const xs = preview.entries.map((entry) => entry.position.x);
  const zs = preview.entries.map((entry) => entry.position.z);
  const left = Math.min(0, ...xs) - 2;
  const top = Math.min(0, ...zs) - 2;
  const width = Math.max(4, Math.max(0, ...xs) - left + 2);
  const height = Math.max(4, Math.max(0, ...zs) - top + 2);
  const scale = Math.max(width, height) / 60;
  return (
    <section className="ol-world-creation-preview" aria-labelledby={title}>
      <h4 id={title}>{preview.title}: proposed opening</h4>
      <p>{preview.activity}</p>
      <p>{preview.payoff}</p>
      {preview.harsh && <p role="status">This opening deliberately includes scarce supplies.</p>}
      <p className="ol-caption">
        Preview only. Nothing here advances the world, uses supplies or teaches a character.
      </p>
      <svg
        viewBox={`${left} ${top} ${width} ${height}`}
        role="img"
        aria-label="Top view of the proposed opening; the numbered list below describes every location"
        className="ol-world-creation-map"
      >
        {preview.entries.map((entry, index) => (
          <g key={entry.id} transform={`translate(${entry.position.x} ${entry.position.z})`}>
            <circle r={scale} />
            <text fontSize={scale * 1.3} textAnchor="middle" dominantBaseline="central">
              {index + 1}
            </text>
          </g>
        ))}
      </svg>
      <p className="ol-caption">Top view. Exact positions and height are included below.</p>
      <ol className="ol-world-creation-entries">
        {preview.entries.map((entry) => (
          <li key={entry.id}>
            <strong>{entry.label}</strong>
            <p>{entry.description}</p>
            <p className="ol-caption">
              Position ({entry.position.x}, {entry.position.y}, {entry.position.z})
              {entry.quantity !== undefined && ` · Quantity ${entry.quantity}`}
            </p>
          </li>
        ))}
      </ol>
      {!!preview.findings.length && (
        <section aria-label="Opening readiness">
          <h4>What has been checked</h4>
          <ul>
            {preview.findings.map((finding) => (
              <li key={finding.id}>
                <strong>
                  {finding.status === 'passed'
                    ? 'Checked'
                    : finding.status === 'failed'
                      ? 'Blocked'
                      : 'Not yet established'}
                </strong>
                : {finding.message}
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
