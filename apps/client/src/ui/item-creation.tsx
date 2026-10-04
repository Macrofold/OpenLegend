import { useRef, useState, type FormEvent } from 'react';
import { Dialog, Modal, ModalOverlay } from 'react-aria-components';
import type { SurfacePoint } from '@open-legend/protocol';
import { post } from '../api';
import { Button, IconButton, SelectField, Tag } from '../design-system/components';
export type ItemCreationTarget = { actorId: string } | { position: SurfacePoint };
export function ItemCreationModal({
  options,
  target,
  targetLabel,
  initialDefinitionId,
  close,
  notify,
}: {
  options: Array<{ id: string; label: string; description: string }>;
  target: ItemCreationTarget;
  targetLabel?: string;
  initialDefinitionId?: string;
  close(): void;
  notify(text: string): void;
}) {
  const [definitionId, setDefinitionId] = useState(initialDefinitionId ?? '');
  const [quantity, setQuantity] = useState(1);
  const [saving, setSaving] = useState(false),
    [error, setError] = useState('');
  // An uncertain HTTP result can be retried without duplicating creation.
  const attempt = useRef<{ body: string; id: string } | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving || !definitionId || !Number.isSafeInteger(quantity) || quantity < 1) return;
    const body = JSON.stringify({ definitionId, quantity, destination: target });
    if (attempt.current?.body !== body) attempt.current = { body, id: crypto.randomUUID() };
    setSaving(true);
    setError('');
    try {
      const result = await post('/api/god/items', { ...JSON.parse(body), id: attempt.current.id });
      if (result.ok) {
        notify(result.message);
        close();
      } else setError(result.message);
    } catch (reason) {
      setError(String(reason));
    } finally {
      setSaving(false);
    }
  }
  return (
    <ModalOverlay
      className="ol-root ol-modal-overlay"
      isOpen
      isDismissable={!saving}
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
                  onChange={(event) => setQuantity(Number(event.target.value))}
                />
              </label>
              {error && (
                <p role="alert" className="ol-form-error">
                  {error}
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
                disabled={!definitionId || !Number.isSafeInteger(quantity) || quantity < 1}
              >
                Create {quantity} {quantity === 1 ? 'item' : 'items'}
              </Button>
            </footer>
          </form>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
