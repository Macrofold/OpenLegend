import { useId } from 'react';
import { Button } from '../design-system/components';
import './inventory.css';

/** A blank or intermediate edit remains text until the player explicitly acts. */
export function exactQuantity(text: string, maximum: number | undefined): number | undefined {
  if (!/^\d+$/.test(text.trim()) || maximum === undefined) return undefined;
  const amount = Number(text.trim());
  return Number.isSafeInteger(amount) && amount > 0 && amount <= maximum ? amount : undefined;
}

/** Shared by exact possession transfers and task-specific camp requests. Presets only edit. */
export function InventoryQuantity({
  value,
  onChange,
  maximum,
  disabled = false,
  error,
}: {
  value: string;
  onChange(value: string): void;
  maximum?: number;
  disabled?: boolean;
  error?: string;
}) {
  const id = useId();
  return (
    <div className="ol-inventory-quantity">
      <label htmlFor={id}>Quantity</label>
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
      <p id={`${id}-hint`} className="ol-caption">
        {maximum === undefined
          ? 'Available quantity is unknown.'
          : `${maximum} available whole units.`}{' '}
        All and Half fill this draft; they do not move anything.
      </p>
      {error && (
        <p id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
