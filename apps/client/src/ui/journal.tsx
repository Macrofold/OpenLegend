import type { WorldPoint } from '@open-legend/spatial';
import { KnownPlaces } from './known-places';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Tab, TabList, TabPanel, Tabs } from 'react-aria-components';
import type { ActionOption, ApiResult, GameView } from '@open-legend/protocol';
import { Icon } from '../design-system/components';
import { History } from './history';
import { Promises } from './promises';
import { WorldEvents } from './world-events';
import { MemoryHistory } from './memory-history';
import { OwnKnowledge } from './diagnostics';
import { captionScope } from '../speech-captions';
import './reading.css';
import './journal.css';

const sections = [
  { value: 'events', label: 'Events', icon: 'ui.events' },
  { value: 'memories', label: 'Memories', icon: 'ui.memories' },
  { value: 'notes', label: 'Notes', icon: 'ui.notes' },
  { value: 'people', label: 'People', icon: 'ui.people' },
  { value: 'promises', label: 'Commitments', icon: 'ui.commitments' },
  { value: 'places', label: 'Places', icon: 'ui.places' },
  { value: 'story', label: 'Story', icon: 'ui.story' },
];

/** All readers retain their existing scopes and mutation owners when a tab hides. */
export function Journal({
  view,
  visible,
  connected = true,
  storyRequest = 0,
  command,
  focus,
  addressPerson,
  inspectEntity,
}: {
  view: GameView;
  visible: boolean;
  connected?: boolean;
  storyRequest?: number;
  command(action: ActionOption): Promise<ApiResult>;
  focus(point: WorldPoint): void;
  addressPerson?(id: string, label: string): void;
  inspectEntity?(id: string): void;
}) {
  const [section, setSection] = useState('events');
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('vertical');
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    // Match the existing container-query breakpoint in unscaled CSS pixels.
    // The tab library then owns the matching directional-key behavior.
    const update = (width: number) => setOrientation(width <= 720 ? 'horizontal' : 'vertical');
    update(element.clientWidth);
    const observer = new ResizeObserver(([entry]) => {
      update(entry?.contentBoxSize[0]?.inlineSize ?? element.clientWidth);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (storyRequest) setSection('story');
  }, [storyRequest]);
  return (
    <Tabs
      ref={root}
      className="ol-journal"
      selectedKey={section}
      onSelectionChange={(key) => setSection(String(key))}
      orientation={orientation}
    >
      <TabList className="ol-journal-nav" aria-label="Journal section">
        {sections.map(({ value, label, icon }) => (
          <Tab key={value} id={value} className="ol-btn" data-variant="quiet">
            <Icon name={icon} size={18} />
            <span>{label}</span>
          </Tab>
        ))}
      </TabList>
      <TabPanel
        id="events"
        shouldForceMount
        className="ol-journal-pane ol-journal-events"
        hidden={section !== 'events'}
      >
        <WorldEvents
          key={captionScope(view)}
          view={view}
          scope={captionScope(view)}
          revision={view.worldEventsRevision}
          layout="journal"
          visible={visible && section === 'events'}
          addressPerson={addressPerson}
          inspectEntity={inspectEntity}
        />
      </TabPanel>
      <TabPanel
        id="memories"
        shouldForceMount
        className="ol-journal-pane"
        hidden={section !== 'memories'}
      >
        <MemoryHistory
          actorId={view.player.id}
          owned
          visible={visible && section === 'memories'}
          requestScope={JSON.stringify([
            view.access?.scope,
            view.access?.controlGeneration,
            view.historyEpoch,
          ])}
          revision={view.player.memoryRevision}
        />
      </TabPanel>
      <TabPanel
        id="notes"
        shouldForceMount
        className="ol-journal-pane"
        hidden={section !== 'notes'}
      >
        <OwnKnowledge
          view={view}
          connected={connected}
          visible={visible && section === 'notes'}
          mode="notes"
        />
      </TabPanel>
      <TabPanel
        id="people"
        shouldForceMount
        className="ol-journal-pane"
        hidden={section !== 'people'}
      >
        <OwnKnowledge
          view={view}
          connected={connected}
          visible={visible && section === 'people'}
          mode="people"
        />
      </TabPanel>
      <TabPanel
        id="promises"
        shouldForceMount
        className="ol-journal-pane ol-journal-section"
        hidden={section !== 'promises'}
      >
        <h3 className="ol-heading">Your commitments</h3>
        <Promises
          key={captionScope(view)}
          visible={visible && section === 'promises'}
          revision={view.historyRevision}
        />
      </TabPanel>
      <TabPanel
        id="places"
        shouldForceMount
        className="ol-journal-pane ol-journal-section"
        hidden={section !== 'places'}
      >
        <h3 className="ol-heading">Known places</h3>
        <KnownPlaces
          key={`${captionScope(view)}:${view.historyEpoch}`}
          revision={view.historyRevision ?? ''}
          visible={visible && section === 'places'}
          paused={view.clock.paused}
          command={command}
          focus={focus}
        />
      </TabPanel>
      <TabPanel
        id="story"
        shouldForceMount
        className="ol-journal-pane ol-journal-section ol-journal-story"
        hidden={section !== 'story'}
      >
        <h3 className="ol-heading">Your story</h3>
        <History
          key={captionScope(view)}
          visible={visible && section === 'story'}
          epoch={view.historyEpoch}
          revision={`${view.historyRevision}:${JSON.stringify(view.narrator)}`}
          refreshRequest={storyRequest}
        />
      </TabPanel>
    </Tabs>
  );
}
