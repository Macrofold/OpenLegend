import type { WorldPoint } from '@open-legend/spatial';
import { KnownPlaces } from './known-places';
import { useEffect, useState } from 'react';
import type { ActionOption, ApiResult, GameView } from '@open-legend/protocol';
import { SegmentedControl, Tag } from '../design-system/components';
import { History } from './history';
import { Promises } from './promises';
import { captionScope } from '../speech-captions';
import './reading.css';

export function Journal({
  view,
  visible,
  storyRequest = 0,
  command,
  focus,
}: {
  view: GameView;
  visible: boolean;
  storyRequest?: number;
  command(action: ActionOption): Promise<ApiResult>;
  focus(point: WorldPoint): void;
}) {
  const [section, setSection] = useState('promises');
  useEffect(() => {
    if (storyRequest) setSection('story');
  }, [storyRequest]);
  return (
    <div className="ol-journal">
      <SegmentedControl
        label="Journal section"
        value={section}
        onChange={setSection}
        options={[
          { value: 'promises', label: 'Promises' },
          { value: 'beginnings', label: 'Beginnings' },
          { value: 'story', label: 'Your story' },
          { value: 'places', label: 'Places' },
        ]}
      />
      <div className="ol-journal-section" hidden={section !== 'promises'}>
        <h3 className="ol-heading">Your promises</h3>
        <Promises
          key={captionScope(view)}
          visible={visible && section === 'promises'}
          revision={view.historyRevision}
        />
      </div>
      <div className="ol-journal-section" hidden={section !== 'beginnings'}>
        <h3 className="ol-heading">Possible beginnings</h3>
        <p className="ol-caption">
          Invitations to explore this world. These are separate from promises you have spoken.
        </p>
        {view.milestones.map((milestone) => (
          <article className="ol-journal-beginning" key={milestone.id}>
            <p>{milestone.label}</p>
            <Tag tone={milestone.done ? 'accent' : 'neutral'}>
              {milestone.done ? 'Reached' : 'Possible beginning'}
            </Tag>
          </article>
        ))}
        {!view.milestones.length && <p>No suggested beginnings are recorded for this world.</p>}
      </div>
      <div className="ol-journal-section" hidden={section !== 'places'}>
        <h3 className="ol-heading">Known places</h3>
        <KnownPlaces
          key={`${captionScope(view)}:${view.historyEpoch}`}
          revision={view.historyRevision ?? ''}
          visible={visible && section === 'places'}
          command={command}
          focus={focus}
        />
      </div>
      <div className="ol-journal-section ol-journal-story" hidden={section !== 'story'}>
        <h3 className="ol-heading">Your story</h3>
        <History
          key={captionScope(view)}
          visible={visible && section === 'story'}
          epoch={view.historyEpoch}
          revision={`${view.historyRevision}:${JSON.stringify(view.narrator)}`}
          refreshRequest={storyRequest}
        />
      </div>
    </div>
  );
}
