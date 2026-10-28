import { useState } from 'react';
import type { PortraitArt } from '@open-legend/protocol';
import { assetUrl } from '../asset-files';
import { Icon } from './components';
import './portrait.css';

/** The server supplies artwork only for this permitted subject. A missing or
 * unavailable illustration keeps the same readable footprint and name. */
export function Portrait({
  art,
  head = false,
  size = 64,
  fallbackSize = size,
  label,
  className = '',
}: {
  art?: PortraitArt;
  head?: boolean;
  size?: number;
  fallbackSize?: number;
  label?: string;
  className?: string;
}) {
  const path = head ? (art?.headPath ?? art?.path) : art?.path;
  const [failedPath, setFailedPath] = useState<string>();
  return (
    <span
      className={`ol-portrait ${className}`.trim()}
      style={{ width: size, height: size }}
      data-head={head || undefined}
    >
      {path && failedPath !== path ? (
        <img
          src={assetUrl(path)}
          alt={label ?? ''}
          width={size}
          height={size}
          onError={() => setFailedPath(path)}
        />
      ) : (
        <Icon name="ui.character" size={fallbackSize} label={label} />
      )}
    </span>
  );
}
