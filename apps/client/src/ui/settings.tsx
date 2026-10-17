import type { GameView } from '@open-legend/protocol';
import { Tab, TabList, TabPanel, Tabs } from 'react-aria-components';
import { Button, Section, SegmentedControl } from '../design-system/components';
import type { ShadowQuality } from '../world-renderer';
import { InventionSettings } from './invention-settings';
import { WorldVisualSettings } from './world-visual-settings';
import icons from '../design-system/icons/icons.json';
import './settings.css';

export function Settings({
  view,
  section,
  setSection,
  theme,
  setTheme,
  scale,
  setScale,
  reduce,
  setReduce,
  captionsPaused,
  setCaptionsPaused,
  captionReadingScale,
  setCaptionReadingScale,
  shadowQuality,
  setShadowQuality,
  performance,
  setPerformance,
  browseActions,
}: {
  view: GameView;
  section: string;
  setSection(value: string): void;
  theme: string;
  setTheme(value: string): void;
  scale: number;
  setScale(value: number): void;
  reduce: boolean;
  setReduce(value: boolean): void;
  captionsPaused: boolean;
  setCaptionsPaused(value: boolean): void;
  captionReadingScale: number;
  setCaptionReadingScale(value: number): void;
  shadowQuality: ShadowQuality;
  setShadowQuality(value: ShadowQuality): void;
  performance: boolean;
  setPerformance(value: boolean): void;
  browseActions(opener: HTMLElement): void;
}) {
  return (
    <Tabs
      className="ol-settings"
      selectedKey={section === 'policy' && !view.godMode ? 'reading' : section}
      onSelectionChange={(key) => setSection(String(key))}
    >
      <Button
        onPress={(event) => {
          if (event.target instanceof HTMLElement) browseActions(event.target);
        }}
      >
        Browse known actions
      </Button>
      <TabList aria-label="Settings sections" className="ol-settings-tabs">
        <Tab id="reading">Appearance & reading</Tab>
        <Tab id="graphics">Camera & graphics</Tab>
        <Tab id="controls">Controls & help</Tab>
        {view.godMode && <Tab id="policy">World permissions</Tab>}
      </TabList>
      <TabPanel id="reading" shouldForceMount className="ol-settings-page">
        <p className="ol-setting-scope">This device, changes apply immediately</p>
        <Section title="Appearance">
          <label>
            Interface theme
            <select
              aria-label="Interface theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
            >
              <option value="wilderness">Wilderness</option>
              <option value="fantasy">Fantasy</option>
              <option value="scifi">Sci-fi</option>
            </select>
          </label>
          <p className="ol-caption">
            Changes the interface colors and type. The world and its rules stay the same.
          </p>
          <SegmentedControl
            label="UI scale"
            options={[0.9, 1, 1.15, 1.3].map((n) => ({
              value: String(n),
              label: `${Math.round(n * 100)}%`,
            }))}
            value={String(scale)}
            onChange={(v) => setScale(Number(v))}
          />
          <label>
            <input type="checkbox" checked={reduce} onChange={(e) => setReduce(e.target.checked)} />{' '}
            Reduce motion
          </label>
        </Section>
        <Section title="Speech captions">
          <p>Heard speech appears in the world and remains available in Events.</p>
          <label>
            <input
              type="checkbox"
              checked={captionsPaused}
              onChange={(e) => setCaptionsPaused(e.target.checked)}
            />{' '}
            Pause caption countdowns
          </label>
          <label>
            Reading time
            <select
              aria-label="Caption reading time"
              value={captionReadingScale}
              onChange={(e) => setCaptionReadingScale(Number(e.target.value))}
            >
              {[1, 1.5, 2, 3].map((value) => (
                <option key={value} value={value}>
                  {value}×
                </option>
              ))}
            </select>
          </label>
          <p className="ol-caption">
            Caption countdowns control how long speech stays on screen. The world keeps moving
            unless you pause it. Heard speech remains available in Events.
          </p>
        </Section>
      </TabPanel>
      <TabPanel id="graphics" shouldForceMount className="ol-settings-page">
        <WorldVisualSettings
          view={view}
          shadowQuality={shadowQuality}
          setShadowQuality={setShadowQuality}
        />
        <Section title="Performance display">
          <p className="ol-setting-scope">This device, changes apply immediately</p>
          <label>
            <input
              type="checkbox"
              checked={performance}
              onChange={(e) => setPerformance(e.target.checked)}
            />{' '}
            Show rendering rate in the world
          </label>
          <p className="ol-caption">
            Frames per second measures how often this browser renders the scene. It does not measure
            world time or how quickly a character replies.
          </p>
        </Section>
      </TabPanel>
      <TabPanel id="controls" shouldForceMount className="ol-settings-page">
        <Section title="Interacting with the world">
          <p>
            Click ground to walk. Click an object to look closer. Right-click or Control-click for
            its actions. In view offers a readable list of the objects your character can currently
            see. Command-click uses the object's preferred action.
          </p>
          <p>
            Open a container from that object. Your belongings and its contents stay together while
            you move items. Shift + A opens Act when you want to express an intention in your own
            words.
          </p>
          <p>
            When choosing a subject, click the intended object or use In view. Choosing only
            prepares the action; Send is a separate decision. Escape cancels subject selection.
          </p>
        </Section>
        <Section title="Camera">
          <p>
            Right-drag to rotate and tilt. Shift + right-drag or middle-drag pans. Scroll to zoom.
            Left-drag does not pan or act on release.
          </p>
          <p>
            With the world canvas focused, use Left / Right to rotate, Up / Down to tilt, Shift +
            arrows to pan, and Home to recenter. Hold Option to make things your character can see
            visible through obstructing scenery. Sight and Hearing show the permitted range guides.
          </p>
        </Section>
        <Section title="Keyboard shortcuts">
          <dl className="ol-shortcut-list">
            {[
              ['I', 'Inventory'],
              ['C', 'Craft'],
              ['K', 'Character'],
              ['J', 'Events'],
              ['Shift + S', 'Speak'],
              ['Shift + A', 'Act'],
              ['T', 'Use the equipped item on a target'],
              ['V', 'In view'],
              ['W', 'Create'],
              ['1–3', 'Pinned shortcuts'],
              ['P', 'Pause or resume the world'],
              ['Shift + ] / [', 'Faster / slower world time'],
              ['Escape', 'Cancel the current choice first; otherwise open or close Game'],
            ].map(([key, purpose]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{purpose}</dd>
              </div>
            ))}
          </dl>
          <p className="ol-caption">
            Typing and choosing text with an input method take priority over game shortcuts. Enter
            sends the text you are writing; Shift + Enter adds a new line.
          </p>
        </Section>
        <Section title="Leaving and returning">
          <p>
            Leaving this tab pauses your play. Returning resumes automatically unless you started
            playing in another tab. Resume Here appears only when another tab controls your
            character. World pause, caption countdowns and connection recovery are separate
            controls.
          </p>
          <p>
            Game provides account access, checkpoints when permitted, and the separate World
            operations page. Checkpoints are deliberate snapshots. Game reports save status; a save
            failure also remains visible on your character card.
          </p>
        </Section>
        <Section title="Credits">
          <p>Open Legend, AGPL-3.0-only</p>
          <details>
            <summary>Icon and font credits</summary>
            <p>
              <a
                href="https://creativecommons.org/licenses/by/3.0/"
                target="_blank"
                rel="noreferrer"
              >
                Game-icons.net, CC BY 3.0
              </a>
              . Silhouettes adapted to inherit interface color.
            </p>
            <ul>
              {Object.entries(icons)
                .filter(([, icon]) => 'author' in icon)
                .map(([id, icon]) => {
                  const credit = icon as { source: string; author: string; url: string };
                  return (
                    <li key={id}>
                      <a href={credit.url} target="_blank" rel="noreferrer">
                        {credit.source}
                      </a>{' '}
                      — {credit.author}
                    </li>
                  );
                })}
            </ul>
            <p>Lucide utility icons — Lucide contributors, ISC.</p>
            <p>
              Self-hosted fonts: Cormorant Garamond, Atkinson Hyperlegible Next, IBM Plex Mono,
              Cinzel and Chakra Petch. SIL Open Font License 1.1.
            </p>
          </details>
        </Section>
      </TabPanel>
      {view.godMode && (
        <TabPanel id="policy" shouldForceMount className="ol-settings-page">
          <InventionSettings view={view} />
        </TabPanel>
      )}
    </Tabs>
  );
}
