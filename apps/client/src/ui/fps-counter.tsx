import { useEffect, useState, type RefObject } from 'react';
import type { WorldRenderer } from '../world-renderer';

export function FpsCounter({ renderer }: { renderer: RefObject<WorldRenderer | null> }) {
  const [fps, setFps] = useState<number | null>(null);
  useEffect(() => {
    const sample = () => setFps(renderer.current?.sampleFrameRate() ?? null);
    const interval = window.setInterval(sample, 1000);
    document.addEventListener('visibilitychange', sample);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', sample);
    };
  }, [renderer]);

  return (
    <output
      className="ol-fps-counter"
      aria-label="Rendered frames per second"
      aria-live="off"
      title="Rendered frames per second, averaged over the last sample (about one second)."
    >
      {fps === null ? 'FPS —' : `${fps.toFixed(1)} FPS`}
    </output>
  );
}
