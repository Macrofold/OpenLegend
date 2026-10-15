import { useId, useRef, useState, type ComponentProps } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import type { SpatialLayout } from '@open-legend/spatial';
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
  levels,
  state,
  send,
  center,
  overlays,
  toggleOverlay,
}: {
  levels: SpatialLayout['levels'];
  state: Pick<CameraState, 'projection' | 'levelId' | 'rotationLocked' | 'following'>;
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
        hint="Center on player · Home"
        onPress={center}
      />
      <CameraButton
        icon="ui.follow"
        label="Follow player"
        hint={`Follow player · ${state.following ? 'on' : 'off'}. Drag to stop following.`}
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
      <AriaButton
        ref={optionsButton}
        className="ol-btn ol-camera-more"
        data-variant="quiet"
        data-size="sm"
        aria-expanded={expanded}
        aria-controls={advancedId}
        onPress={() => setExpanded((value) => !value)}
      >
        <Icon name="ui.settings" size={16} />
        <span>Camera options</span>
      </AriaButton>
      {levels.length > 0 && (
        <select
          aria-label="Focus level"
          value={state.levelId ?? ''}
          onChange={(event) => {
            const level = levels.find((entry) => entry.id === event.target.value);
            send({ type: 'level', id: level?.id ?? null, y: level?.focusY ?? 0 });
          }}
        >
          <option value="">All levels</option>
          {levels.map((level) => (
            <option key={level.id} value={level.id}>
              {level.name}
            </option>
          ))}
        </select>
      )}
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
              ? 'Orthographic · switch to perspective'
              : 'Perspective · switch to orthographic'
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
          hint="Right-drag to rotate and tilt; Shift + right-drag or middle-drag to pan; scroll to zoom. With the world focused: arrows rotate/tilt, Page Up/Down changes floor, Home centers on you. P pauses/resumes; Shift + ] speeds up; Shift + [ slows down. Panning or choosing a floor stops following."
        />
      </div>
    </Toolbar>
  );
}
