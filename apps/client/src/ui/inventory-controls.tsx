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
      <label htmlFor={id}>{label}</label>
      <div className="ol-inventory-quantity-controls">
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
          size="sm"
          variant="quiet"
          disabled={disabled || maximum === undefined || maximum < 1}
          onPress={() => onChange(String(maximum))}
        >
          All
        </Button>
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
      <p id={`${id}-hint`} className="ol-caption">
        {hint ??
          (maximum === undefined
            ? 'Available quantity is unknown.'
            : `${maximum} available whole units.`)}{' '}
        The slider, All and Half only edit this amount.
        {amount === undefined &&
          maximum !== undefined &&
          maximum > 1 &&
          ' Enter a valid quantity or choose a preset to use the slider.'}
      </p>
      {error && (
        <p id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
