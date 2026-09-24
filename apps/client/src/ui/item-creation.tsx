import { useRef, useState, type FormEvent } from 'react';
import { Dialog, Modal, ModalOverlay } from 'react-aria-components';
import type { SurfacePoint } from '@open-legend/protocol';
import { post } from '../api';
import { Button, IconButton, SelectField, Tag } from '../design-system/components';
export type ItemCreationTarget = { actorId: string } | { position: SurfacePoint };
export function ItemCreationModal({
  options,
  target,
  initialDefinitionId,
  close,
  notify,
}: {
  options: Array<{ id: string; label: string; description: string }>;
  target: ItemCreationTarget;
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
        <Dialog className="ol-person-dialog" aria-label="Add item">
          <form onSubmit={(event) => void submit(event)}>
            <header className="ol-modal-head">
              <div>
                <Tag tone="highlight">God mode</Tag>
                <h2 className="ol-heading">Add item</h2>
              </div>
              <IconButton
                icon="ui.close"
                label="Close item creation"
                disabled={saving}
                onPress={close}
              />
            </header>
            <div className="ol-person-form">
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
              <p className="ol-caption">
                {'actorId' in target
                  ? 'Add to this character’s inventory.'
                  : 'Place on the selected ground surface.'}
              </p>
              {error && (
                <p role="alert" className="ol-form-error">
                  {error}
                </p>
              )}
            </div>
            <footer className="ol-modal-actions">
              <Button type="button" variant="quiet" onPress={close} disabled={saving}>
                Cancel
              </Button>
              <Button
                type="submit"
                busy={saving}
                disabled={!definitionId || !Number.isSafeInteger(quantity) || quantity < 1}
              >
                Add item
              </Button>
            </footer>
          </form>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
