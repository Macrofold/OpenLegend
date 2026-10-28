import { useState } from 'react';
import type { ItemArt } from '@open-legend/protocol';
import { assetUrl } from '../asset-files';
import { Icon, symbol } from './components';
import './item-illustration.css';

/** Artwork arrives only with a permitted item/method row. Exact selected-release
 * delivery stays with assetUrl; failed art preserves the semantic icon or sigil. */
export function ItemIllustration({
  art,
  icon,
  label,
  size = 32,
  fallbackSize = size,
  detail = false,
  nativeSize = false,
  className = '',
}: {
  art?: ItemArt;
  icon?: string;
  label?: string;
  size?: number;
  fallbackSize?: number;
  detail?: boolean;
  /** Slot artwork keeps its authored pixels; the surrounding well still bounds it. */
  nativeSize?: boolean;
  className?: string;
}) {
  const path = detail ? (art?.detailPath ?? art?.path) : art?.path;
  const [failedPath, setFailedPath] = useState<string>();
  return (
    <span
      className={`ol-item-illustration ${className}`.trim()}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {path && failedPath !== path ? (
        <img
          src={assetUrl(path)}
          alt=""
          width={nativeSize ? undefined : size}
          height={nativeSize ? undefined : size}
          draggable={false}
          onError={() => setFailedPath(path)}
        />
      ) : (
        <Icon name={symbol(icon ?? '')} fallbackLabel={label} size={fallbackSize} />
      )}
    </span>
  );
}
