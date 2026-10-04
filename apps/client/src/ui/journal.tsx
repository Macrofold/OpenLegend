import { useEffect, useState } from 'react';
import type { GameView } from '@open-legend/protocol';
import { SegmentedControl, Tag } from '../design-system/components';
import { History } from './history';
import { Promises } from './promises';
import './reading.css';

export function Journal({
  view,
  visible,
  storyRequest = 0,
}: {
  view: GameView;
  visible: boolean;
  storyRequest?: number;
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
        ]}
      />
      <div className="ol-journal-section" hidden={section !== 'promises'}>
        <h3 className="ol-heading">Your promises</h3>
        <Promises visible={visible && section === 'promises'} revision={view.historyRevision} />
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
      <div className="ol-journal-section ol-journal-story" hidden={section !== 'story'}>
        <h3 className="ol-heading">Your story</h3>
        <History
          visible={visible && section === 'story'}
          epoch={view.historyEpoch}
          revision={`${view.historyRevision}:${JSON.stringify(view.narrator)}`}
          refreshRequest={storyRequest}
        />
      </div>
    </div>
  );
}
