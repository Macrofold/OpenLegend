import { useId, useRef, useState, type ComponentProps } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import type { PerceptionOptions } from '../world-renderer';
import { GUIDE_HINTS } from '../perception-field';
import type { CameraCommand, CameraState } from '../world-camera';
import { Icon, IconButton, TextTooltip, Toolbar } from '../design-system/components';

function CameraButton(props: ComponentProps<typeof IconButton> & { hint?: string }) {
  const { hint, ...button } = props;
  return (
    <TextTooltip text={hint ?? button.label}>
      <IconButton {...button} />
    </TextTooltip>
  );
}

/** Common controls stay visible; orientation options expand without changing the camera; meanings live in docs/spatial-world.md#picking-and-controls. */
export function CameraControls({
  state,
  send,
  center,
  overlays,
  toggleOverlay,
}: {
  state: Pick<CameraState, 'projection' | 'rotationLocked' | 'following'>;
  send(command: CameraCommand): void;
  center(): void;
  overlays: PerceptionOptions;
  toggleOverlay(sense: keyof PerceptionOptions): void;
}) {
  const [expanded, setExpanded] = useState(false);
  const advancedId = useId();
  const optionsButton = useRef<HTMLButtonElement>(null);
  return (
    <Toolbar className="ol-camera ol-card" aria-label="Camera and range guides">
      <CameraButton
        icon="ui.plus"
        label="Zoom in"
        onPress={() => send({ type: 'zoom', delta: -2 })}
      />
      <CameraButton
        icon="ui.minus"
        label="Zoom out"
        onPress={() => send({ type: 'zoom', delta: 2 })}
      />
      <CameraButton
        icon="ui.recenter"
        label="Center on player"
        hint="Center on player (Home)"
        onPress={center}
      />
      <CameraButton
        icon="ui.follow"
        label="Follow player"
        hint={`Follow player: ${state.following ? 'on' : 'off'}. Pan to stop following.`}
        pressed={state.following}
        onPress={() => send({ type: 'follow' })}
      />
      <span className="ol-range-toggle" data-sense="vision">
        <CameraButton
          icon="ui.inview"
          label="Sight"
          hint={GUIDE_HINTS.vision}
          pressed={overlays.vision}
          onPress={() => toggleOverlay('vision')}
        />
      </span>
      <span className="ol-range-toggle" data-sense="hearing">
        <CameraButton
          icon="ui.hearing"
          label="Hearing"
          hint={GUIDE_HINTS.hearing}
          pressed={overlays.hearing}
          onPress={() => toggleOverlay('hearing')}
        />
      </span>
      <TextTooltip text="Camera settings">
        <AriaButton
          ref={optionsButton}
          className="ol-btn ol-camera-more"
          data-variant="quiet"
          data-size="sm"
          aria-expanded={expanded}
          aria-controls={advancedId}
          aria-label="Camera settings"
          onPress={() => setExpanded((value) => !value)}
        >
          <span className="ol-camera-settings-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M3 5h4l2-2h5l2 2h3v10H3Z" />
              <circle cx="11" cy="10" r="3" />
            </svg>
            <Icon name="ui.settings" size={14} />
          </span>
        </AriaButton>
      </TextTooltip>
      <div
        id={advancedId}
        className="ol-camera-advanced"
        hidden={!expanded}
        role="group"
        aria-label="Additional camera controls"
        onKeyDown={(event) => {
          if (event.key !== 'Escape' || event.defaultPrevented) return;
          event.preventDefault();
          event.stopPropagation();
          setExpanded(false);
          optionsButton.current?.focus();
        }}
      >
        <CameraButton
          icon="ui.rotate-left"
          label="Rotate left"
          disabled={state.rotationLocked}
          onPress={() => send({ type: 'orbit', yaw: -Math.PI / 4, pitch: 0 })}
        />
        <CameraButton
          icon="ui.rotate-right"
          label="Rotate right"
          disabled={state.rotationLocked}
          onPress={() => send({ type: 'orbit', yaw: Math.PI / 4, pitch: 0 })}
        />
        <CameraButton
          icon="ui.tilt-up"
          label="Tilt higher"
          onPress={() => send({ type: 'orbit', yaw: 0, pitch: 0.12 })}
        />
        <CameraButton
          icon="ui.tilt-down"
          label="Tilt lower"
          onPress={() => send({ type: 'orbit', yaw: 0, pitch: -0.12 })}
        />
        <CameraButton
          icon="ui.projection"
          label="Perspective view"
          hint={
            state.projection === 'orthographic'
              ? 'Orthographic (switch to perspective)'
              : 'Perspective (switch to orthographic)'
          }
          pressed={state.projection === 'perspective'}
          onPress={() => send({ type: 'projection' })}
        />
        <CameraButton
          icon="ui.rotation-lock"
          label="Lock rotation"
          pressed={state.rotationLocked}
          onPress={() => send({ type: 'rotation-lock' })}
        />
        <CameraButton
          icon="ui.camera-help"
          label="Camera help"
          hint="Right-drag to rotate and tilt; Shift + right-drag or middle-drag to pan; scroll to zoom. With the world focused: arrows rotate/tilt, Shift + arrows pan, Home centers on you. Hold Option to see character-visible things through scenery. Command-click uses an object’s main action. P pauses/resumes; Shift + ] speeds up; Shift + [ slows down. Panning stops following."
        />
      </div>
    </Toolbar>
  );
}
