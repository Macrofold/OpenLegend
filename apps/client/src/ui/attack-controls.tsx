import { JadeGlass } from '../design-system/jade-glass';
import { useEffect, useRef } from 'react';
import type { GameView } from '@open-legend/protocol';
import { Button } from '../design-system/components';
import type { useActionExecution } from './action-execution';
import { ringRadius, timingPhase } from './action-input';
import { useActionControlFocus } from './use-action-control-focus';
import './skilled-actions.css';

export type ActionExecutionController = ReturnType<typeof useActionExecution>;

/** Animation stays outside React and never submits input or advances native work. */
export function AttackReticle({ controller }: { controller: ActionExecutionController }) {
  const frame = useRef<HTMLDivElement>(null),
    ring = useRef<SVGCircleElement>(null);
  const profile = controller.presentation?.profile;
  const origin = controller.presentation?.phaseOrigin;
  const active = controller.mode || !!controller.presentation;
  const tracking = controller.hasLiveAttempt || !!controller.presentation;
  const latest = useRef({ controller, profile, origin });
  latest.current = { controller, profile, origin };
  useEffect(() => {
    if (!active) return;
    const canvas = document.getElementById('world');
    let bounds = canvas?.getBoundingClientRect();
    const resize = new ResizeObserver(() => {
      bounds = canvas?.getBoundingClientRect();
    });
    if (canvas) resize.observe(canvas);
    let handle = 0;
    const draw = () => {
      const value = latest.current,
        p = value.controller.point.current.screen;
      if (frame.current) {
        frame.current.hidden = !p;
        frame.current.dataset.aimAvailable = String(!!value.controller.point.current.aim);
        if (p)
          frame.current.style.transform = `translate(${p.x + (bounds?.left ?? 0)}px,${p.y + (bounds?.top ?? 0)}px)`;
      }
      if (ring.current && value.profile && value.origin !== undefined) {
        const phase = timingPhase(value.origin, performance.now(), value.profile.periodSeconds);
        ring.current.setAttribute('r', String(Math.max(0.1, ringRadius(phase) * 70)));
      }
      if (tracking) handle = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(handle);
      resize.disconnect();
    };
  }, [active, tracking, controller.reticle?.x, controller.reticle?.y]);
  if (!active) return null;
  const showing =
    profile && origin !== undefined && controller.presentation?.status === 'preparing';
  return (
    <div ref={frame} className="ol-attack-reticle" aria-hidden="true">
      <svg viewBox="-80 -80 160 160">
        {showing && (
          <>
            <circle
              r={profile.center * 70}
              strokeWidth={profile.ordinaryWidth * 140}
              className="ol-timing-ordinary"
            />
            <circle
              r={profile.center * 70}
              strokeWidth={profile.greenWidth * 140}
              className="ol-timing-excellent"
            />
            <circle r={(profile.center - profile.greenWidth) * 70} className="ol-timing-boundary" />
            <circle r={(profile.center + profile.greenWidth) * 70} className="ol-timing-boundary" />
            <circle ref={ring} r=".1" className="ol-timing-ring" />
          </>
        )}
        <path d="M -6 0 H -2 M 2 0 H 6 M 0 -6 V -2 M 0 2 V 6" className="ol-reticle-cross" />
        <path d="M -8 -8 L 8 8 M -8 8 L 8 -8" className="ol-reticle-unavailable" />
      </svg>
    </div>
  );
}

export function AttackControls({
  controller,
  view,
  connected,
  inView,
}: {
  controller: ActionExecutionController;
  view: GameView;
  connected: boolean;
  inView(): void;
}) {
  const action = view.player.action;
  const focus = useActionControlFocus('[data-attack-mode-toggle]');
  if (!controller.mode && !controller.presentation && !controller.pending && !action?.execution)
    return null;
  const active = !!controller.presentation || !!action?.execution;
  const source = view.player.attackSource;
  const available =
    connected &&
    !view.clock.paused &&
    !!view.access?.controlling &&
    (!!action?.execution || source?.enabled === true);
  const aimAvailable = !!controller.point.current.aim;
  // A saved pending record is evidence, not renewed foreground authority.
  // Reconnected players may deliberately choose a fresh neutral release.
  const waitingRelease = controller.liveReleaseRequested;
  const recovered = !!action?.execution && !controller.hasLiveAttempt && !waitingRelease;
  const nativeRelease = action?.controls?.find((choice) =>
    ['release-shot', 'release-strike'].includes(choice.command.type),
  );
  const releaseAvailable = !recovered || nativeRelease?.enabled === true;
  const recovering = !!action?.execution?.assessment && !action.execution.releaseRequested;
  const reason = !connected
    ? 'Reconnect to continue.'
    : !view.access?.controlling
      ? 'Take control of this character to continue.'
      : view.clock.paused
        ? 'The world is paused. Resume to attack, or cancel this preparation.'
        : !action?.execution && !source?.enabled
          ? (source?.reason ?? 'No supported attack is available.')
          : recovered && !releaseAvailable
            ? (nativeRelease?.reason ?? 'Wait until this preparation is ready to release.')
            : !controller.point.current.screen
              ? 'Choose a subject from In view, or aim in the world.'
              : !aimAvailable
                ? 'No visible point here. Move your aim onto a displayed body or surface.'
                : undefined;
  return (
    <section
      {...focus}
      tabIndex={-1}
      className="ol-card ol-attack-controls"
      aria-label="Attack controls"
    >
      <JadeGlass identity="attack-controls:ol-attack-controls:card:1" />
      <div className="ol-attack-controls-content">
        <strong>
          {controller.presentation?.label ?? view.player.attackSource?.label ?? 'Attack mode'}
        </strong>
        <p className="ol-caption" role="status">
          {controller.presentation?.status === 'pending'
            ? 'Requesting preparation…'
            : recovering
              ? 'Attack released. Recovering.'
              : waitingRelease
                ? 'Release requested.'
                : action?.execution?.ready
                  ? 'Ready to release.'
                  : active
                    ? 'Preparing. You can release when you choose.'
                    : view.player.attackSource?.profile
                      ? 'Tap for an ordinary attack, or hold to choose a timed release.'
                      : 'Choose your aim, then Attack for an ordinary attack.'}
        </p>
        {reason && (
          <p className="ol-caption" role="status">
            {reason}
          </p>
        )}
        <div className="ol-combat-buttons">
          <Button
            size="sm"
            variant="secondary"
            disabled={!available || !!controller.pending || waitingRelease || recovering}
            onPress={inView}
          >
            In view
          </Button>
          {!active && view.player.attackSource?.profile && (
            <Button
              size="sm"
              disabled={!available || !!controller.pending || !aimAvailable || recovering}
              onPress={controller.prepare}
            >
              Prepare
            </Button>
          )}
          <Button
            size="sm"
            disabled={
              !available ||
              !!controller.pending ||
              !aimAvailable ||
              recovering ||
              waitingRelease ||
              !releaseAvailable
            }
            onPress={controller.attackNormally}
          >
            {active ? 'Attack normally' : 'Attack'}
          </Button>
          {active && (
            <Button
              size="sm"
              disabled={
                !available ||
                !!controller.pending ||
                !aimAvailable ||
                recovering ||
                waitingRelease ||
                !releaseAvailable
              }
              onPress={controller.release}
            >
              Release
            </Button>
          )}
          {active && (
            <Button
              size="sm"
              variant="secondary"
              disabled={!connected || !view.access?.controlling}
              onPress={controller.cancel}
            >
              Cancel
            </Button>
          )}
        </div>
        {controller.presentation?.profile && (
          <p className="ol-caption">
            {controller.profile?.labels?.instruction ?? 'Choose when to release.'}
          </p>
        )}
        {controller.message && (
          <p className="ol-caption" role="status">
            {controller.message}
          </p>
        )}
        {controller.pending && (
          <Button
            size="sm"
            disabled={!connected || controller.pending.status !== 'unknown'}
            onPress={() => void controller.check()}
          >
            Check result
          </Button>
        )}
      </div>
    </section>
  );
}
