import { distance3D } from '@open-legend/spatial';
import { namePhrase } from '@open-legend/language';
import { useEffect, useId, useRef, useState } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import type { ActionOption, GameView } from '@open-legend/protocol';
import {
  Button,
  Icon,
  IconButton,
  SelectField,
  Toolbar,
  symbol,
} from '../design-system/components';
import { useLocal } from './storage';
import './character-actions.css';

/** Group only genuine, permitted native actions using the installed world's own
 * shortcut metadata. A subtype name cannot create a capability or its wording. */
export function gatherQuickActions(view: GameView): ActionOption[] {
  const groups = new Map<
    string,
    { action: ActionOption; source: GameView['entities'][number] }[]
  >();
  for (const source of view.entities) {
    for (const action of source.actions) {
      if (!action.shortcut) continue;
      const entries = groups.get(action.shortcut.id) ?? [];
      entries.push({ action, source });
      groups.set(action.shortcut.id, entries);
    }
  }
  return [...groups.values()].flatMap((entries) => {
    entries.sort(
      (a, b) =>
        Number(b.action.enabled) - Number(a.action.enabled) ||
        distance3D(a.source.position, view.player.position) -
          distance3D(b.source.position, view.player.position) ||
        a.source.id.localeCompare(b.source.id),
    );
    const selected = entries[0];
    if (!selected?.action.shortcut) return [];
    const { action, source } = selected;
    return [
      {
        ...action,
        id: selected.action.shortcut.id,
        label: `${selected.action.shortcut.label} · ${source.name}`,
        icon: selected.action.shortcut.icon ?? action.icon,
      },
    ];
  });
}

export function QuickActions({
  view,
  connected,
  command,
  talk,
}: {
  view: GameView;
  connected: boolean;
  command(a: ActionOption): void;
  talk(id: string): void;
}) {
  const [pins, setPins] = useLocal<string[]>(
    `open-legend:quick-actions:${view.worldId}`,
    ['', '', ''],
    (value): value is string[] =>
      Array.isArray(value) && value.length === 3 && value.every((id) => typeof id === 'string'),
  );
  const [editing, setEditing] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [review, setReview] = useState<ActionOption | null>(null);
  const bar = useRef<HTMLDivElement>(null);
  const reviewPanel = useRef<HTMLDivElement>(null);
  const reviewOpener = useRef<HTMLElement | null>(null);
  const suggestionIds = useRef<string[]>([]);
  const labelId = useId();
  const gate = !connected
    ? 'Reconnect to act.'
    : view.access?.controlling === false
      ? 'Resume control here to act.'
      : '';
  const native = [
    ...view.player.actions,
    ...view.player.inventory.flatMap((item) =>
      item.actions.map((action) => ({
        ...action,
        icon: action.icon ?? item.icon,
        label: `${action.label} · ${item.name}`,
      })),
    ),
    ...view.entities.flatMap((entity) =>
      entity.actions
        .filter((action) => !action.shortcut)
        .map((action) => ({
          ...action,
          icon: action.icon ?? entity.icon,
          label: `${action.label} · ${entity.name}`,
        })),
    ),
    ...gatherQuickActions(view),
    ...view.recipes.flatMap((recipe) =>
      recipe.actions.map((action) => ({ ...action, label: `${action.label} · ${recipe.name}` })),
    ),
  ];
  const options = [...new Map(native.map((action) => [action.id, action])).values()].map(
    (action) => ({
      id: action.id,
      label: action.label,
      enabled: !gate && action.enabled,
      reason: gate || action.reason,
      icon: action.icon ?? symbol(action.command.type),
      description:
        action.command.type === 'cancel'
          ? 'Stops current work and discards work paused for later.'
          : undefined,
      run: () => {
        setReason('');
        // A grouped shortcut chooses a current source. Show that exact source before
        // committing so a changed nearest source cannot redirect the player's intent.
        if (action.shortcut) {
          reviewOpener.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
          setReview(action);
        } else command(action);
      },
    }),
  );
  const people = view.entities
    .filter((entity) => entity.canTalk)
    .map((entity) => ({
      id: `talk-${entity.id}`,
      label: `Talk to ${namePhrase(entity, 'definite')}`,
      enabled: !gate,
      reason: gate || undefined,
      icon: 'action.talk',
      description: undefined,
      run: () => talk(entity.id),
    }));
  options.push(...people);
  const candidates = [
    ...new Map(
      [
        ...view.player.suggestedActionIds.map((id) => options.find((action) => action.id === id)),
        ...people,
      ]
        .filter((action) => !!action)
        .map((action) => [action.id, action]),
    ).values(),
  ].slice(0, 3);
  if (!bar.current?.matches(':hover') && !bar.current?.contains(document.activeElement))
    suggestionIds.current = candidates.map((action) => action.id);
  const suggested = suggestionIds.current.map(
    (id) =>
      options.find((action) => action.id === id) ?? {
        id,
        label: 'Suggestion no longer available',
        enabled: false,
        reason: 'This suggestion is no longer available. Choose another action.',
        icon: 'ui.lock',
        description: undefined,
        run: () => {},
      },
  );
  const reviewedNative = review
    ? view.entities
        .flatMap((entity) => entity.actions)
        .find(
          (action) =>
            action.shortcut?.id === review.shortcut?.id &&
            JSON.stringify(action.command) === JSON.stringify(review.command),
        )
    : undefined;
  const reviewedReason = review
    ? gate ||
      (!reviewedNative
        ? 'This source or action has changed. Choose the shortcut again.'
        : !reviewedNative.enabled
          ? (reviewedNative.reason ?? 'This action is no longer available.')
          : '')
    : '';
  const activatePin = (index: number) => {
    const id = pins[index];
    const action = options.find((option) => option.id === id);
    if (!id) setEditing(index);
    else if (action?.enabled) action.run();
    else
      setReason(
        action?.reason ??
          'This pinned action is unavailable in the current view. Its assignment is still saved.',
      );
  };
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        gate ||
        event.defaultPrevented ||
        event.isComposing ||
        event.repeat ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        editing !== null ||
        review ||
        document.querySelector(
          '[aria-modal="true"], #contextMenu, [role="listbox"], [role="menu"]',
        ) ||
        (event.target instanceof Element &&
          event.target.closest(
            'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="dialog"]',
          ))
      )
        return;
      const index = Number(event.key) - 1;
      if (Number.isInteger(index) && index >= 0 && index < 3) {
        event.preventDefault();
        activatePin(index);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  const closePicker = () => {
    const index = editing;
    setEditing(null);
    if (index !== null) document.getElementById(`${labelId}-pin-${index}`)?.focus();
  };
  const closeReview = () => {
    setReview(null);
    reviewOpener.current?.focus();
  };
  useEffect(() => {
    if (review) reviewPanel.current?.focus();
  }, [review]);
  return (
    <div className="ol-quick-position" ref={bar}>
      <Toolbar className="ol-qabar" aria-label="Quick actions">
        {!!suggested.length && (
          <>
            <div className="ol-qa-section">
              <span className="ol-qa-heading">Suggestions</span>
              <div className="ol-qagroup">
                {suggested.map((action) => (
                  <div key={action.id} className="ol-qa-wrap">
                    <AriaButton
                      className="ol-qa"
                      data-kind="suggested"
                      aria-label={action.label}
                      aria-disabled={!action.enabled}
                      aria-describedby={`${labelId}-${action.id}`}
                      onPress={() =>
                        action.enabled
                          ? action.run()
                          : setReason(action.reason ?? 'Unavailable now.')
                      }
                    >
                      <Icon name={action.icon} fallbackLabel={action.label} size={24} />
                    </AriaButton>
                    <span id={`${labelId}-${action.id}`} className="ol-hover-label">
                      {[action.label, action.description, action.reason]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <span className="ol-qadivider" />
          </>
        )}
        <div className="ol-qa-section">
          <span className="ol-qa-heading">Shortcuts · 1–3</span>
          <div className="ol-qagroup">
            {pins.map((id, index) => {
              const action = options.find((option) => option.id === id);
              const unavailable = !!id && !action?.enabled;
              const label =
                action?.label ??
                (id ? `Shortcut ${index + 1} unavailable` : `Assign shortcut ${index + 1}`);
              return (
                <div key={index} className="ol-qa-wrap">
                  <AriaButton
                    id={`${labelId}-pin-${index}`}
                    className="ol-qa"
                    data-kind={id ? 'shortcut' : 'empty'}
                    aria-label={label}
                    aria-disabled={unavailable || undefined}
                    aria-describedby={`${labelId}-pin-reason-${index}`}
                    onPress={() => activatePin(index)}
                  >
                    <Icon
                      name={action?.icon ?? (id ? 'ui.lock' : 'ui.plus')}
                      fallbackLabel={label}
                      size={24}
                    />
                    <span className="ol-qa-key">{index + 1}</span>
                  </AriaButton>
                  <span id={`${labelId}-pin-reason-${index}`} className="ol-hover-label">
                    {action
                      ? [action.label, action.description, action.reason]
                          .filter(Boolean)
                          .join(' · ')
                      : id
                        ? 'Pinned action unavailable; assignment retained.'
                        : 'Assign a shortcut'}
                  </span>
                  <div className="ol-qa-edit">
                    <IconButton
                      icon="ui.settings"
                      label={`Configure quick action ${index + 1}`}
                      onPress={() => {
                        setReason('');
                        setReview(null);
                        setEditing(index);
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Toolbar>
      {reason && (
        <div className="ol-quick-reason" role="status">
          <p>{reason}</p>
          <IconButton
            icon="ui.close"
            label="Dismiss shortcut explanation"
            onPress={() => setReason('')}
          />
        </div>
      )}
      {editing !== null && (
        <div
          className="ol-card ol-shortcut-picker ol-interaction-enter"
          role="dialog"
          aria-label={`Configure shortcut ${editing + 1}`}
          onKeyDown={(event) => {
            if (
              event.key === 'Escape' &&
              !event.defaultPrevented &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              event.stopPropagation();
              closePicker();
            }
          }}
        >
          <SelectField
            autoFocus
            label={`Shortcut ${editing + 1}`}
            value={pins[editing] || 'empty'}
            options={[
              { id: 'empty', label: 'Empty slot', icon: 'ui.close' },
              ...options.map((action) => ({
                id: action.id,
                label: action.label,
                icon: action.icon,
                description: [action.description, action.reason].filter(Boolean).join(' · '),
              })),
            ]}
            onChange={(value) => {
              const next = [...pins];
              next[editing] = value === 'empty' ? '' : value;
              setPins(next);
              closePicker();
            }}
          />
          <IconButton icon="ui.close" label="Close shortcut picker" onPress={closePicker} />
        </div>
      )}
      {review && (
        <div
          className="ol-quick-source ol-card"
          ref={reviewPanel}
          tabIndex={-1}
          role="dialog"
          aria-label="Shortcut target"
          onKeyDown={(event) => {
            if (
              event.key === 'Escape' &&
              !event.defaultPrevented &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              event.stopPropagation();
              closeReview();
            }
          }}
        >
          <strong>{review.label}</strong>
          <p className="ol-caption">This is the source selected for this shortcut.</p>
          {reviewedReason && <p role="status">{reviewedReason}</p>}
          <div className="ol-actions">
            <Button
              variant="primary"
              disabled={!!reviewedReason}
              onPress={() => {
                if (reviewedNative?.enabled && !reviewedReason) {
                  command(reviewedNative);
                  closeReview();
                }
              }}
            >
              {review.shortcut?.label ?? review.label}
            </Button>
            <Button variant="quiet" onPress={closeReview}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
