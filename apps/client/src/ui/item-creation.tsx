import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Dialog, Modal, ModalOverlay } from 'react-aria-components';
import type { ApiResult, SurfacePoint } from '@open-legend/protocol';
import { Button, IconButton, SelectField, Tag } from '../design-system/components';
export type ItemCreationTarget = { actorId: string } | { position: SurfacePoint };
export function ItemCreationModal({
  options,
  target,
  targetLabel,
  initialDefinitionId,
  enabled,
  close,
  create,
}: {
  options: Array<{ id: string; label: string; description: string }>;
  target: ItemCreationTarget;
  targetLabel?: string;
  initialDefinitionId?: string;
  enabled: boolean;
  close(): void;
  create(definitionId: string, quantity: number): Promise<ApiResult | undefined>;
}) {
  const [definitionId, setDefinitionId] = useState(initialDefinitionId ?? '');
  const [quantity, setQuantity] = useState('1');
  const amount = Number(quantity);
  const validAmount = !!quantity.trim() && Number.isSafeInteger(amount) && amount >= 1;
  const [saving, setSaving] = useState(false),
    [error, setError] = useState('');
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving || !enabled || !definitionId || !validAmount) return;
    setSaving(true);
    setError('');
    try {
      const result = await create(definitionId, amount);
      if (!alive.current || !result) return;
      if (result.ok) close();
      else setError(result.message);
    } catch (reason) {
      if (alive.current) setError(String(reason));
    } finally {
      if (alive.current) setSaving(false);
    }
  }
  return (
    <ModalOverlay
      className="ol-root ol-modal-overlay"
      isOpen
      isDismissable={!saving}
      isKeyboardDismissDisabled={saving}
      onOpenChange={(open) => !open && close()}
    >
      <Modal className="ol-modal">
        <Dialog className="ol-person-dialog" aria-label="Create item">
          <form onSubmit={(event) => void submit(event)}>
            <header className="ol-modal-head">
              <div>
                <Tag tone="highlight">God mode</Tag>
                <h2 className="ol-heading">Create item</h2>
              </div>
              <IconButton
                icon="ui.close"
                label="Close item creation"
                disabled={saving}
                onPress={close}
              />
            </header>
            <fieldset className="ol-person-form" disabled={saving} style={{ border: 0, margin: 0 }}>
              <p className="ol-caption">
                {'actorId' in target
                  ? `Create new belongings in ${targetLabel ? `${targetLabel}’s` : 'the selected character’s'} inventory.`
                  : `Create on the selected ground at ${target.position.x.toFixed(1)}, ${target.position.z.toFixed(1)}.`}
              </p>
              <SelectField
                label="Item"
                value={definitionId}
                placeholder="Search known items…"
                options={options}
                onChange={setDefinitionId}
              />
              <label>
                Quantity
                <input
                  type="number"
                  min={1}
                  max={Number.MAX_SAFE_INTEGER}
                  step={1}
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                />
              </label>
              {!validAmount && (
                <p className="ol-caption">Enter a whole quantity of at least one.</p>
              )}
              {error && (
                <p role="alert" className="ol-form-error">
                  {error}
                </p>
              )}
              {!enabled && (
                <p role="status">
                  Reconnect with control of this character and God mode to create.
                </p>
              )}
            </fieldset>
            <footer className="ol-modal-actions">
              <Button type="button" variant="quiet" onPress={close} disabled={saving}>
                Cancel
              </Button>
              <Button
                type="submit"
                busy={saving}
                disabled={!enabled || !definitionId || !validAmount}
              >
                {validAmount
                  ? `Create ${amount} ${amount === 1 ? 'item' : 'items'}`
                  : 'Create item'}
              </Button>
            </footer>
          </form>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
