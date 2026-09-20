import { useEffect, useRef, useState } from 'react';
import { Button as AriaButton } from 'react-aria-components';
import type { ActionOption, GameView } from '@open-legend/protocol';
import { Icon, IconButton, SelectField, Toolbar, symbol } from '../design-system/components';
import { useLocal } from './storage';
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
    (v): v is string[] =>
      Array.isArray(v) && v.length === 3 && v.every((s) => typeof s === 'string'),
  );
  const [editing, setEditing] = useState<number | null>(null);
  const native = [
    ...view.player.actions,
    ...view.player.inventory.flatMap((i) =>
      i.actions.map((a) => ({ ...a, label: `${a.label} · ${i.name}` })),
    ),
    ...view.entities.flatMap((e) =>
      e.actions.map((a) => ({ ...a, label: `${a.label} · ${e.name}` })),
    ),
    ...view.recipes.flatMap((r) =>
      r.actions.map((a) => ({ ...a, label: `${a.label} · ${r.name}` })),
    ),
  ];
  const options = [...new Map(native.map((a) => [a.id, a])).values()].map((a) => {
    const resource =
      a.command.type === 'gather'
        ? view.entities.find((e) => e.id === a.command.targetId)
        : undefined;
    return {
      id: a.id,
      label: a.label,
      enabled: connected && a.enabled,
      reason: a.reason,
      icon: symbol(resource?.subtype ?? a.command.type),
      badge: resource ? 'action.gather' : undefined,
      run: () => command(a),
    };
  });
  const people = view.entities
    .filter((e) => e.canTalk)
    .map((e) => ({
      id: `talk-${e.id}`,
      label: `Talk to ${e.name}`,
      enabled: connected,
      reason: undefined,
      icon: 'action.talk',
      badge: undefined,
      run: () => talk(e.id),
    }));
  options.push(...people);
  const candidateSuggestions = [
    options.find((a) => a.id === 'recover'),
    ...(view.player.energy < 35 ? [options.find((a) => a.id === 'rest')] : []),
    ...(view.player.hunger > 70 ? [options.find((a) => a.id.startsWith('eat-') && a.enabled)] : []),
    ...people,
  ]
    .filter((a) => !!a)
    .slice(0, 3);
  const bar = useRef<HTMLDivElement>(null);
  const suggestionIds = useRef<string[]>([]);
  if (!bar.current?.matches(':hover') && !bar.current?.contains(document.activeElement))
    suggestionIds.current = candidateSuggestions.map((a) => a.id);
  const suggested = suggestionIds.current
    .map((id) => options.find((a) => a.id === id))
    .filter((a) => !!a);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName) ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      )
        return;
      const i = Number(e.key) - 1;
      if (i >= 0 && i < 3) {
        const a = options.find((a) => a.id === pins[i]);
        if (a?.enabled) a.run();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  return (
    <div className="ol-quick-position" ref={bar}>
      <Toolbar className="ol-qabar" aria-label="Quick actions">
        <div className="ol-qagroup">
          {suggested.map((a) => (
            <div key={a.id} className="ol-qa-wrap">
              <AriaButton
                className="ol-qa"
                data-kind="suggested"
                aria-label={a.label}
                isDisabled={!a.enabled}
                onPress={a.run}
              >
                <Icon name={a.icon} badge={a.badge} size={24} />
              </AriaButton>
              <span className="ol-hover-label">{a.reason ?? a.label}</span>
            </div>
          ))}
        </div>
        {!!suggested.length && <span className="ol-qadivider" />}
        <div className="ol-qagroup">
          {pins.map((id, i) => {
            const a = options.find((a) => a.id === id);
            return (
              <div key={i} className="ol-qa-wrap">
                <AriaButton
                  className="ol-qa"
                  data-kind={id ? 'shortcut' : 'empty'}
                  aria-label={a?.label ?? `Assign shortcut ${i + 1}`}
                  onPress={() => (a?.enabled ? a.run() : setEditing(i))}
                >
                  <Icon name={a?.icon ?? 'ui.plus'} badge={a?.badge} size={24} />
                  <span className="ol-qa-key">{i + 1}</span>
                </AriaButton>
                <span className="ol-hover-label">
                  {a?.reason ?? a?.label ?? 'Assign a shortcut'}
                </span>
                <div className="ol-qa-edit">
                  <IconButton
                    icon="ui.settings"
                    label={`Configure quick action ${i + 1}`}
                    onPress={() => setEditing(i)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Toolbar>
      {editing !== null && (
        <div className="ol-card ol-shortcut-picker ol-interaction-enter">
          <SelectField
            autoFocus
            label={`Shortcut ${editing + 1}`}
            value={pins[editing] || 'empty'}
            options={[
              { id: 'empty', label: 'Empty slot', icon: 'ui.close' },
              ...options.map((a) => ({
                id: a.id,
                label: a.label,
                icon: a.icon,
                badge: a.badge,
              })),
            ]}
            onChange={(value) => {
              const next = [...pins];
              next[editing] = value === 'empty' ? '' : value;
              setPins(next);
              setEditing(null);
            }}
          />
          <IconButton
            icon="ui.close"
            label="Close shortcut picker"
            onPress={() => setEditing(null)}
          />
        </div>
      )}
    </div>
  );
}
