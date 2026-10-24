import { Button } from '../design-system/components';
import { LoadingIndicator } from '../design-system/loading';
import type { WorldCreationHostStatus } from '@open-legend/protocol';
import { EntryNotice } from './entry-notice';
import type { SceneLoadProgress } from '../world-renderer';
import './entry-screen.css';

export type EntryStatus =
  | { kind: 'loading'; retryLabel?: 'Check access again' | 'Retry connection' }
  | { kind: 'scene-loading'; progress: SceneLoadProgress }
  | { kind: 'scene-failed'; message: string }
  | { kind: 'signed-out' }
  | { kind: 'forbidden' }
  | { kind: 'creation-host'; host: WorldCreationHostStatus }
  | { kind: 'failed'; message: string };

/** First entry needs a clear next action; requiring sign-in is not a connection failure. */
export function EntryScreen({ status, onRetry }: { status: EntryStatus; onRetry: () => void }) {
  const signedOut = status.kind === 'signed-out';
  const forbidden = status.kind === 'forbidden';
  const loading = status.kind === 'loading' || status.kind === 'scene-loading';
  const retryLabel =
    status.kind === 'loading'
      ? status.retryLabel
      : status.kind === 'scene-loading'
        ? undefined
        : status.kind === 'scene-failed'
          ? 'Retry scene'
          : forbidden
            ? 'Check access again'
            : 'Retry connection';
  return (
    <main className="ol-entry" aria-labelledby="entry-title">
      <section className="ol-card ol-entry-card">
        <header className="ol-entry-brand">
          <p className="ol-entry-eyebrow">Welcome</p>
          <h1 id="entry-title" className="ol-heading">
            Open Legend
          </h1>
        </header>
        <EntryNotice />
        <div
          className="ol-entry-message"
          role={status.kind === 'failed' || status.kind === 'scene-failed' ? 'alert' : 'status'}
        >
          {signedOut ? (
            <>
              <h2>Enter your world</h2>
              <p>Sign in with an account that has access to this world.</p>
            </>
          ) : forbidden ? (
            <>
              <h2>No access to this world</h2>
              <p>
                This account does not currently have access to this world. Ask the world operator to
                check your access or send an invitation.
              </p>
            </>
          ) : status.kind === 'scene-loading' ? (
            <div className="ol-entry-progress">
              <h2>
                {status.progress.phase === 'preparing' ? 'Preparing your world' : 'Loading artwork'}
              </h2>
              <progress
                aria-label="World preparation"
                max={Math.max(1, status.progress.total)}
                value={status.progress.total ? status.progress.completed : undefined}
              />
              {status.progress.total > 0 && (
                <p>
                  {status.progress.completed} of {status.progress.total} ready
                </p>
              )}
            </div>
          ) : status.kind === 'loading' ? (
            <LoadingIndicator active={loading} label="Connecting to your world" />
          ) : status.kind === 'scene-failed' ? (
            <>
              <h2>Your world’s artwork couldn’t finish loading</h2>
              <p>Retry to prepare the scene before entering.</p>
              <details>
                <summary>Loading details</summary>
                <p>{status.message}</p>
              </details>
            </>
          ) : status.kind === 'creation-host' ? (
            <>
              <h2>
                {status.host.status === 'awaiting-creation'
                  ? 'Waiting for a world'
                  : 'World created; host unavailable'}
              </h2>
              <p>{status.host.message}</p>
              {status.host.status === 'awaiting-creation' && (
                <p>
                  Prepare and review an opening from your authorized World Agent, then choose this
                  host.
                </p>
              )}
            </>
          ) : (
            <>
              <h2>We couldn’t connect to your world</h2>
              <p>The world may be temporarily unavailable. Try connecting again.</p>
              <details>
                <summary>Connection details</summary>
                <p>{status.message}</p>
              </details>
            </>
          )}
        </div>
        {(!loading || retryLabel) && (
          <div className="ol-entry-actions">
            {signedOut ? (
              <a className="ol-btn" data-variant="primary" href="/auth/login">
                Sign in
              </a>
            ) : (
              <Button variant="primary" busy={loading} onPress={onRetry}>
                {status.kind === 'creation-host' ? 'Check host again' : retryLabel}
              </Button>
            )}
            {forbidden && (
              <a className="ol-btn" data-variant="secondary" href="/auth/login?change-account=true">
                Change account
              </a>
            )}
          </div>
        )}
        {signedOut && (
          <p className="ol-entry-hint">
            Have an invitation? Open your invitation link before signing in.
          </p>
        )}
      </section>
    </main>
  );
}
