import { useId, useState, useSyncExternalStore } from 'react';
import { Slider, SliderThumb, SliderTrack } from 'react-aria-components';
import {
  appearanceControlFraction,
  appearanceControlRange,
  resolveAppearanceRecipe,
  type AppearanceControlDefinition,
  type AppearanceFamilyDefinition,
  type AppearanceRecipe,
} from '@open-legend/protocol';
import { formatDisplayNumber } from '@open-legend/language';
import { Button, SelectField } from '../design-system/components';
import { PersonAppearanceDraft, type PersonDraftSnapshot } from './person-appearance-draft';
import './person-appearance.css';

export function createPersonAppearanceDraft(
  family: AppearanceFamilyDefinition,
  recipe: AppearanceRecipe,
): PersonAppearanceDraft {
  return new PersonAppearanceDraft(recipe, family.controls, {
    validate(value) {
      const result = resolveAppearanceRecipe(family, value);
      return result.ok ? undefined : result.message;
    },
    range(value, id) {
      return appearanceControlRange(family, value, id);
    },
  });
}

function AppearanceControl({
  control,
  family,
  draft,
  snapshot,
  disabled,
  selected,
  select,
}: {
  control: AppearanceControlDefinition;
  family: AppearanceFamilyDefinition;
  draft: PersonAppearanceDraft;
  snapshot: PersonDraftSnapshot;
  disabled: boolean;
  selected: boolean;
  select(id: string): void;
}) {
  const id = useId();
  const value = snapshot.recipe.controls[control.id] ?? control.defaultValue;
  const range = appearanceControlRange(family, snapshot.recipe, control.id);
  const error = snapshot.errors[control.id];
  const fraction = appearanceControlFraction(control, value);
  if (!range) return <p role="alert">{control.label} is unavailable for these proportions.</p>;
  return (
    <div className={`ol-appearance-control${selected ? ' is-selected' : ''}`}>
      <div className="ol-appearance-control-head">
        <button
          type="button"
          className="ol-appearance-feature"
          aria-pressed={selected}
          onClick={() => select(control.id)}
          disabled={disabled}
        >
          {control.label}
        </button>
        <output className="ol-caption" htmlFor={`${id}-value`}>
          {formatDisplayNumber(fraction * 100)}%
        </output>
        <Button
          size="sm"
          variant="quiet"
          disabled={disabled || value === control.defaultValue}
          onPress={() => draft.setControl(control.id, control.defaultValue)}
          aria-label={`Reset ${control.label}`}
        >
          Reset
        </Button>
      </div>
      <div className="ol-appearance-control-inputs">
        {range.maximum > range.minimum ? (
          <Slider
            aria-label={control.label}
            aria-describedby={`${id}-range${error ? ` ${id}-error` : ''}`}
            className="ol-appearance-slider"
            minValue={range.minimum}
            maxValue={range.maximum}
            step={(control.maximum - control.minimum) / 1000}
            value={value}
            isDisabled={disabled}
            onChange={(next) => {
              select(control.id);
              draft.begin(control.id);
              draft.setControl(
                control.id,
                typeof next === 'number' ? next : (next[0] ?? value),
                true,
              );
            }}
            onChangeEnd={() => draft.end()}
            onPointerCancel={() => draft.cancelGesture()}
          >
            <SliderTrack className="ol-appearance-slider-track">
              {({ state }) => (
                <>
                  <span
                    className="ol-appearance-slider-fill"
                    style={{ width: `${state.getThumbPercent(0) * 100}%` }}
                  />
                  <SliderThumb className="ol-appearance-slider-thumb" />
                </>
              )}
            </SliderTrack>
          </Slider>
        ) : (
          <span className="ol-caption">Fixed by the current proportions</span>
        )}
        <label className="ol-appearance-number">
          <span className="ol-sr">
            {control.label} value{control.unit ? ` in ${control.unit}` : ''}
          </span>
          <input
            id={`${id}-value`}
            type="text"
            inputMode="decimal"
            value={snapshot.text[control.id] ?? String(value)}
            disabled={disabled}
            aria-describedby={`${id}-range${error ? ` ${id}-error` : ''}`}
            aria-invalid={!!error || undefined}
            onFocus={() => {
              select(control.id);
              draft.begin(control.id);
            }}
            onChange={(event) => {
              draft.begin(control.id);
              draft.setText(control.id, event.target.value);
            }}
            onBlur={() => draft.end()}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === 'Escape' && draft.getSnapshot().editing) {
                event.preventDefault();
                event.stopPropagation();
                draft.cancelGesture();
              }
              if (event.key === 'Enter') {
                event.preventDefault();
                draft.end();
              }
            }}
          />
          {control.unit && <span>{control.unit}</span>}
        </label>
      </div>
      <p id={`${id}-range`} className="ol-caption ol-appearance-range">
        {formatDisplayNumber(range.minimum)}–{formatDisplayNumber(range.maximum)}
        {control.unit ? ` ${control.unit}` : ''}
      </p>
      {error && (
        <p id={`${id}-error`} className="ol-form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function PersonAppearanceControls({
  family,
  draft,
  selected,
  select,
  disabled = false,
}: {
  family: AppearanceFamilyDefinition;
  draft: PersonAppearanceDraft;
  selected?: string;
  select(id: string): void;
  disabled?: boolean;
}) {
  const snapshot = useSyncExternalStore(draft.subscribe, draft.getSnapshot);
  const [error, setError] = useState('');
  return (
    <div className="ol-appearance-controls">
      <div className="ol-appearance-history">
        <Button
          size="sm"
          variant="quiet"
          disabled={disabled || !snapshot.canUndo}
          onPress={() => draft.undo()}
        >
          Undo
        </Button>
        <Button
          size="sm"
          variant="quiet"
          disabled={disabled || !snapshot.canRedo}
          onPress={() => draft.redo()}
        >
          Redo
        </Button>
      </div>
      {error && (
        <p className="ol-form-error" role="alert">
          {error}
        </p>
      )}
      {family.groups.map((group, index) => {
        const controls = family.controls.filter((control) => control.group === group.id);
        const selections = family.selections.filter((selection) => selection.group === group.id);
        const presets = family.presets.filter((preset) => preset.group === group.id);
        const selectedPreset = presets.find(
          (preset) =>
            Object.entries(preset.controls).every(
              ([id, value]) => snapshot.recipe.controls[id] === value,
            ) &&
            Object.entries(preset.selections).every(
              ([id, value]) => snapshot.recipe.selections[id] === value,
            ),
        );
        return (
          <details className="ol-appearance-group" key={group.id} open={index === 0 || undefined}>
            <summary>
              {group.label}
              {controls.some((control) => snapshot.errors[control.id]) ? ' · Check values' : ''}
            </summary>
            <div className="ol-appearance-group-head">
              {presets.length > 0 && (
                <SelectField
                  label={`${group.label} preset`}
                  value={selectedPreset?.id ?? null}
                  placeholder="Custom"
                  disabled={disabled}
                  options={presets.map((preset) => ({ id: preset.id, label: preset.label }))}
                  onChange={(id) => {
                    const preset = presets.find((candidate) => candidate.id === id);
                    if (preset) setError(draft.apply(preset) ?? '');
                  }}
                />
              )}
              <Button
                size="sm"
                variant="quiet"
                disabled={disabled}
                onPress={() =>
                  setError(
                    draft.apply({
                      controls: Object.fromEntries(
                        controls.map((control) => [control.id, control.defaultValue]),
                      ),
                      selections: Object.fromEntries(
                        selections.map((selection) => [selection.id, selection.defaultValue]),
                      ),
                    }) ?? '',
                  )
                }
              >
                Reset {group.label}
              </Button>
            </div>
            {selections.map((selection) => (
              <SelectField
                key={selection.id}
                label={selection.label}
                value={snapshot.recipe.selections[selection.id] ?? selection.defaultValue}
                options={selection.options}
                disabled={disabled}
                onChange={(value) =>
                  setError(draft.apply({ selections: { [selection.id]: value } }) ?? '')
                }
              />
            ))}
            {controls.map((control) => (
              <AppearanceControl
                key={control.id}
                control={control}
                family={family}
                draft={draft}
                snapshot={snapshot}
                disabled={disabled}
                selected={selected === control.id}
                select={select}
              />
            ))}
          </details>
        );
      })}
    </div>
  );
}
