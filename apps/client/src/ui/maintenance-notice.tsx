import { useEffect, useState } from 'react';
import type { MaintenanceWindowView } from '@open-legend/protocol';
import { Button } from '../design-system/components';
import { useLocal } from './storage';
import { formatWindow, maintenanceHeadline } from './maintenance-time';
import './operations.css';

/** Terminal notices (cancelled/finished) stay visible for half an hour after the change. */
const TERMINAL_NOTICE_MS = 30 * 60_000;

/** Minute-level clock for countdown and overdue wording; no server traffic. */
export function useMinuteClock(): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
/** Player-facing notice. Active maintenance cannot be dismissed while it holds the world. */
export function MaintenanceNotice({ maintenance }: { maintenance?: MaintenanceWindowView | null }) {
  const now = useMinuteClock();
  const [dismissed, setDismissed] = useLocal(
    'open-legend:maintenance-dismissed',
    '',
    (value): value is string => typeof value === 'string',
  );
  if (!maintenance) return null;
  const key = `${maintenance.id}:${maintenance.revision}`;
  const terminal = maintenance.status === 'cancelled' || maintenance.status === 'completed';
  if (terminal && now - maintenance.updatedAt > TERMINAL_NOTICE_MS) return null;
  if (maintenance.status !== 'active' && dismissed === key) return null;
  const shown = formatWindow(maintenance);
  return (
    <section
      className="ol-card ol-maintenance-notice"
      data-status={maintenance.status}
      role={maintenance.status === 'active' ? 'alert' : 'status'}
      aria-label="World maintenance"
    >
      <strong>{maintenanceHeadline(maintenance, now)}</strong>
      {!terminal && (
        <>
          <span>
            {shown.announced} · {shown.duration} (announced end is an estimate)
          </span>
          {shown.local && (
            <span className="ol-caption">
              Your time ({shown.viewerZone}): {shown.local}
            </span>
          )}
        </>
      )}
      {maintenance.message && <span className="ol-caption">{maintenance.message}</span>}
      {maintenance.status !== 'active' && (
        <Button size="sm" variant="quiet" onPress={() => setDismissed(key)}>
          Dismiss
        </Button>
      )}
    </section>
  );
}
