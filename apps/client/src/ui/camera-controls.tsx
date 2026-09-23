import type { ComponentProps } from 'react';
import type { SpatialLayout } from '@open-legend/spatial';
import type { CameraCommand, CameraState } from '../world-camera';
import { IconButton, TextTooltip, Toolbar } from '../design-system/components';

function CameraButton(props: ComponentProps<typeof IconButton> & { hint?: string }) {
  const { hint, ...button } = props;
  return (
    <TextTooltip text={hint ?? button.label}>
      <IconButton {...button} />
    </TextTooltip>
  );
}

/** Always-visible, keyboard-accessible controls; meanings live in docs/spatial-world.md#picking-and-controls. */
export function CameraControls({
  levels,
  state,
  send,
  center,
}: {
  levels: SpatialLayout['levels'];
  state: Pick<CameraState, 'projection' | 'levelId' | 'rotationLocked' | 'following'>;
  send(command: CameraCommand): void;
  center(): void;
}) {
  return (
    <Toolbar className="ol-camera ol-card" aria-label="Camera">
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
            ? 'Orthographic · switch to perspective (P)'
            : 'Perspective · switch to orthographic (P)'
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
      <span className="ol-camera-spacer" />
      <CameraButton
        icon="ui.camera-help"
        label="Camera help"
        hint="Left/middle-drag to pan; right-drag or Shift-drag to rotate and tilt; scroll to zoom. With the world focused: arrows rotate/tilt, Page Up/Down changes floor, P switches projection, Home centers on you. Follow keeps you centered; dragging or choosing a floor stops following."
      />
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
    </Toolbar>
  );
}
