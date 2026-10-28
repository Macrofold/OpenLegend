import { useId } from 'react';
import { Slider, SliderTrack, SliderThumb } from 'react-aria-components';
import { Button } from '../design-system/components';
import './inventory.css';

/** A blank or intermediate edit remains text until the player explicitly acts. */
export function exactQuantity(text: string, maximum: number | undefined): number | undefined {
  if (!/^\d+$/.test(text.trim()) || maximum === undefined) return undefined;
  const amount = Number(text.trim());
  return Number.isSafeInteger(amount) && amount > 0 && amount <= maximum ? amount : undefined;
}

/** Exact possession and trade quantities share one draft; controls never execute it. */
export function InventoryQuantity({
  value,
  onChange,
  maximum,
  disabled = false,
  error,
  label = 'Quantity',
  hint,
}: {
  value: string;
  onChange(value: string): void;
  maximum?: number;
  disabled?: boolean;
  error?: string;
  label?: string;
  hint?: string;
}) {
  const id = useId();
  const amount = exactQuantity(value, maximum);
  return (
    <div className="ol-inventory-quantity">
      <label className="ol-sr" htmlFor={id}>
        {label}
      </label>
      <div className="ol-inventory-quantity-controls">
        <Button
          variant="quiet"
          className="ol-quantity-step"
          icon="ui.minus"
          children={null}
          aria-label={`Decrease ${label}`}
          disabled={disabled || amount === undefined || amount <= 1}
          onPress={() => amount !== undefined && onChange(String(amount - 1))}
        />
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={value}
          disabled={disabled}
          aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
          aria-invalid={!!error || undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        <Button
          variant="quiet"
          className="ol-quantity-step"
          icon="ui.plus"
          children={null}
          aria-label={`Increase ${label}`}
          disabled={disabled || amount === undefined || maximum === undefined || amount >= maximum}
          onPress={() => amount !== undefined && onChange(String(amount + 1))}
        />
        <span className="ol-caption ol-quantity-available">
          {maximum === undefined ? 'Available quantity unknown' : `of ${maximum}`}
        </span>
        <Button
          size="sm"
          variant="quiet"
          className="ol-quantity-max"
          disabled={disabled || maximum === undefined || maximum < 1}
          onPress={() => onChange(String(maximum))}
        >
          Max
        </Button>
      </div>
      {maximum !== undefined && maximum > 1 && (
        <Slider
          className="ol-quantity-slider"
          aria-label={`${label} slider`}
          aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
          minValue={1}
          maxValue={maximum}
          step={1}
          value={amount ?? 1}
          isDisabled={disabled || amount === undefined}
          onChange={(next) => onChange(String(next))}
        >
          <SliderTrack className="ol-quantity-slider-track">
            {({ state }) => (
              <>
                <span
                  className="ol-quantity-slider-fill"
                  style={{ width: `${state.getThumbPercent(0) * 100}%` }}
                />
                <SliderThumb className="ol-quantity-slider-thumb" />
              </>
            )}
          </SliderTrack>
        </Slider>
      )}
      <details className="ol-quantity-options">
        <summary>More amounts</summary>
        <Button
          size="sm"
          variant="quiet"
          disabled={disabled || maximum === undefined || maximum < 2}
          onPress={() => {
            if (maximum !== undefined && maximum >= 2) onChange(String(Math.floor(maximum / 2)));
          }}
        >
          Half
        </Button>
        <p id={`${id}-hint`} className="ol-caption">
          {hint ??
            (maximum === undefined
              ? 'Available quantity is unknown.'
              : `${maximum} available whole units.`)}{' '}
          The slider, Max and Half only edit this amount.
          {amount === undefined &&
            maximum !== undefined &&
            maximum > 1 &&
            ' Enter a valid quantity or choose a preset to use the slider.'}
        </p>
      </details>
      {error && (
        <p id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
