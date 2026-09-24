import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Button as AriaButton, Dialog, ListBox, ListBoxItem, Popover } from 'react-aria-components';
import { Icon } from '../design-system/components';

export type PulloutOption = {
  id: string;
  label: string;
  icon?: string;
  description?: string;
  disabled?: boolean;
};

export function PulloutPicker({
  label,
  icon,
  badge,
  placeholder,
  options,
  groups,
  onSelect,
  isOpen,
  onOpenChange,
}: {
  label: string;
  icon: string;
  badge?: string;
  placeholder: string;
  options: PulloutOption[];
  groups?: Array<{ label: string; icon: string; options: PulloutOption[] }>;
  onSelect(id: string): void;
  isOpen?: boolean;
  onOpenChange?(open: boolean): void;
}) {
  const [query, setQuery] = useState('');
  const [localOpen, setLocalOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const open = isOpen ?? localOpen;
  const setOpen = (value: boolean) => {
    setLocalOpen(value);
    onOpenChange?.(value);
    if (!value) {
      setQuery('');
      setOpenGroup(null);
    }
  };
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    setQuery('');
  };
  const filtered = useMemo(() => {
    const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    return options.filter((option) =>
      words.every((word) =>
        `${option.label} ${option.description ?? ''}`.toLocaleLowerCase().includes(word),
      ),
    );
  }, [options, query]);
  return (
    <>
      <AriaButton
        ref={trigger}
        data-picker-row
        className="ol-item"
        aria-haspopup="dialog"
        aria-expanded={open}
        onPress={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            event.stopPropagation();
            setOpen(true);
          }
        }}
        onHoverStart={() => setOpen(true)}
      >
        <Icon name={icon} />
        <span>{label}</span>
        <span className="ol-pullout-tail">
          {badge && <small className="ol-item-hint">{badge}</small>}
          <Icon name="ui.next" size={16} />
        </span>
      </AriaButton>
      <Popover
        triggerRef={trigger}
        isOpen={open}
        onOpenChange={(value) => {
          if (value) setOpen(true);
          else close();
        }}
        isNonModal
        shouldCloseOnInteractOutside={(element) => !element.closest('.ol-pullout-popover')}
        className="ol-root ol-pullout-popover"
        placement="right top"
        shouldFlip
      >
        <Dialog className="ol-pullout-dialog" aria-label={label}>
          <>
            <div className="ol-pullout-head">
              <strong>{label}</strong>
              <span className="ol-caption">{groups?.length ?? filtered.length} options</span>
            </div>
            {groups ? (
              groups.map((group) => (
                <PulloutPicker
                  key={group.label}
                  label={group.label}
                  icon={group.icon}
                  placeholder={`Search ${group.label.toLowerCase()}…`}
                  options={group.options}
                  isOpen={openGroup === group.label}
                  onOpenChange={(value) => setOpenGroup(value ? group.label : null)}
                  onSelect={(id) => {
                    onSelect(id);
                    close();
                  }}
                />
              ))
            ) : (
              <>
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
                      isDisabled={option.disabled}
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
          </>
        </Dialog>
      </Popover>
    </>
  );
}

export function PulloutAction({ children }: { children: ReactNode }) {
  return <div className="ol-pullout-action">{children}</div>;
}
