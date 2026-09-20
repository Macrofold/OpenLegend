import { useMemo, useState, type ReactNode } from 'react';
import {
  Button as AriaButton,
  Dialog,
  DialogTrigger,
  ListBox,
  ListBoxItem,
  Popover,
} from 'react-aria-components';
import { Icon } from '../design-system/components';

export type PulloutOption = {
  id: string;
  label: string;
  icon?: string;
  description?: string;
};

export function PulloutPicker({
  label,
  icon,
  badge,
  placeholder,
  options,
  onSelect,
}: {
  label: string;
  icon: string;
  badge?: string;
  placeholder: string;
  options: PulloutOption[];
  onSelect(id: string): void;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    return options.filter((option) =>
      words.every((word) =>
        `${option.label} ${option.description ?? ''}`.toLocaleLowerCase().includes(word),
      ),
    );
  }, [options, query]);
  return (
    <DialogTrigger onOpenChange={(open) => !open && setQuery('')}>
      <AriaButton data-picker-row className="ol-item ol-god-action">
        <Icon name={icon} />
        <span>{label}</span>
        <span className="ol-pullout-tail">
          {badge && <small className="ol-item-hint">{badge}</small>}
          <Icon name="ui.next" size={16} />
        </span>
      </AriaButton>
      <Popover className="ol-root ol-pullout-popover" placement="right top" shouldFlip>
        <Dialog className="ol-pullout-dialog" aria-label={label}>
          {({ close }) => (
            <>
              <div className="ol-pullout-head">
                <strong>{label}</strong>
                <span className="ol-caption">{filtered.length} options</span>
              </div>
              <div className="ol-search ol-pullout-search">
                <Icon name="ui.search" size={16} />
                <input
                  autoFocus
                  type="search"
                  value={query}
                  placeholder={placeholder}
                  aria-label={placeholder}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <ListBox
                className="ol-pullout-list"
                items={filtered}
                aria-label={label}
                selectionMode="single"
                onAction={(key) => {
                  onSelect(String(key));
                  close();
                }}
                renderEmptyState={() => <p className="ol-empty-pullout">No matches.</p>}
              >
                {(option) => (
                  <ListBoxItem
                    className="ol-pullout-option"
                    id={option.id}
                    textValue={option.label}
                  >
                    <Icon name={option.icon ?? 'ui.plus'} size={18} />
                    <span>
                      <strong>{option.label}</strong>
                      {option.description && <small>{option.description}</small>}
                    </span>
                  </ListBoxItem>
                )}
              </ListBox>
            </>
          )}
        </Dialog>
      </Popover>
    </DialogTrigger>
  );
}

export function PulloutAction({ children }: { children: ReactNode }) {
  return <div className="ol-pullout-action">{children}</div>;
}
