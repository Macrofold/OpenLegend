import { memo } from 'react';
import type { EntityView } from '@open-legend/protocol';
import { EntityRow, symbol } from '../design-system/components';

type RowProps = Pick<EntityView, 'id' | 'name' | 'icon' | 'status' | 'quantity'> & {
  select(id: string): void;
  contextMenu(id: string, x: number, y: number): void;
};
const NearbyRow = memo(function NearbyRow({
  id,
  name,
  icon,
  status,
  quantity,
  select,
  contextMenu,
}: RowProps) {
  return (
    <div
      data-entity={id}
      onContextMenu={(event) => {
        event.preventDefault();
        contextMenu(id, event.clientX, event.clientY);
      }}
    >
      <EntityRow
        name={name}
        icon={symbol(icon ?? '')}
        meta={status}
        count={quantity}
        onPress={() => select(id)}
      />
    </div>
  );
});
export const NearbyEntities = memo(function NearbyEntities({
  entities,
  select,
  contextMenu,
}: {
  entities: EntityView[];
  select(id: string): void;
  contextMenu(id: string, x: number, y: number): void;
}) {
  return entities.map((entity) => (
    <NearbyRow
      key={entity.id}
      id={entity.id}
      name={entity.name}
      icon={entity.icon}
      status={entity.status}
      quantity={entity.quantity}
      select={select}
      contextMenu={contextMenu}
    />
  ));
});
