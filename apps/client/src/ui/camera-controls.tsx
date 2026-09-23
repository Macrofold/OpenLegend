import type { SpatialLayout } from '@open-legend/spatial';
import type { CameraCommand, CameraState } from '../world-camera';
import { Button, IconButton, Toolbar } from '../design-system/components';

/** Visible controls also serve touch and keyboard users; orbit never shares an action shortcut. */
export function CameraControls({
  levels,
  state,
  send,
  center,
}: {
  levels: SpatialLayout['levels'];
  state: Pick<CameraState, 'projection' | 'levelId' | 'rotationLocked'>;
  send(command: CameraCommand): void;
  center(): void;
}) {
  return (
    <Toolbar className="ol-camera ol-card" aria-label="Camera">
      <IconButton
        icon="ui.plus"
        label="Zoom in"
        onPress={() => send({ type: 'zoom', delta: -2 })}
      />
      <IconButton
        icon="ui.minus"
        label="Zoom out"
        onPress={() => send({ type: 'zoom', delta: 2 })}
      />
      <IconButton icon="ui.recenter" label="Recenter camera" onPress={center} />
      <details className="ol-camera-options">
        <summary aria-label="Camera options">View</summary>
        <div className="ol-camera-popover" role="group" aria-label="World view controls">
          <label>
            Focus level
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
          </label>
          <div className="ol-camera-row">
            <Button
              aria-label="Rotate camera left"
              isDisabled={state.rotationLocked}
              onPress={() => send({ type: 'orbit', yaw: -Math.PI / 4, pitch: 0 })}
            >
              Rotate left
            </Button>
            <Button
              aria-label="Rotate camera right"
              isDisabled={state.rotationLocked}
              onPress={() => send({ type: 'orbit', yaw: Math.PI / 4, pitch: 0 })}
            >
              Rotate right
            </Button>
          </div>
          <div className="ol-camera-row">
            <Button
              aria-label="Tilt camera higher"
              onPress={() => send({ type: 'orbit', yaw: 0, pitch: 0.12 })}
            >
              Tilt higher
            </Button>
            <Button
              aria-label="Tilt camera lower"
              onPress={() => send({ type: 'orbit', yaw: 0, pitch: -0.12 })}
            >
              Tilt lower
            </Button>
          </div>
          <Button
            aria-label="Toggle camera projection"
            onPress={() => send({ type: 'projection' })}
          >
            {state.projection === 'orthographic'
              ? 'Orthographic · switch to perspective'
              : 'Perspective · switch to orthographic'}
          </Button>
          <Button
            aria-label="Toggle camera rotation lock"
            onPress={() => send({ type: 'rotation-lock' })}
          >
            {state.rotationLocked ? 'Unlock rotation' : 'Lock rotation'}
          </Button>
          <p>
            Left/middle-drag to pan. Right-drag (or Shift-drag) to orbit and tilt. Scroll to zoom.
            With the world focused: arrows rotate/tilt, Page Up/Down changes level, P changes
            projection, Home recenters.
          </p>
        </div>
      </details>
    </Toolbar>
  );
}
