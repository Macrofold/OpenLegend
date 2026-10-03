import { Button } from '../design-system/components';
import { EntryNotice } from './entry-notice';
import './entry-screen.css';

export type EntryStatus =
  | { kind: 'loading'; retryLabel?: 'Check access again' | 'Retry connection' }
  | { kind: 'signed-out' }
  | { kind: 'forbidden' }
  | { kind: 'failed'; message: string };

/** First entry needs a clear next action; requiring sign-in is not a connection failure. */
export function EntryScreen({ status, onRetry }: { status: EntryStatus; onRetry: () => void }) {
  const signedOut = status.kind === 'signed-out';
  const forbidden = status.kind === 'forbidden';
  const loading = status.kind === 'loading';
  const retryLabel = loading
    ? status.retryLabel
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
        <div className="ol-entry-message" role={status.kind === 'failed' ? 'alert' : 'status'}>
          {signedOut ? (
            <p>Sign in to enter your world.</p>
          ) : forbidden ? (
            <>
              <h2>No access to this world</h2>
              <p>
                This account does not currently have access to this world. Ask the world operator to
                check your access or send an invitation.
              </p>
            </>
          ) : loading ? (
            <p>Connecting to your world…</p>
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
                {retryLabel}
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
