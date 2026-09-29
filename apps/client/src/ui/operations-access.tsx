import { useState } from 'react';
import type { AccessCapability, OperationsView } from '@open-legend/protocol';
import { post } from '../api';
import { Button, Section, Tag } from '../design-system/components';

type Access = NonNullable<OperationsView['access']>;
type Role = 'player' | 'spectator' | 'operator';
const EXPIRY = [
  { hours: 1, label: '1 hour' },
  { hours: 24, label: '1 day' },
  { hours: 168, label: '7 days' },
  { hours: 720, label: '30 days' },
];
const ROLE_TEXT: Record<Role, string> = {
  player: 'Player: plays the chosen character',
  spectator: 'Spectator: watches the public overview',
  operator: 'Operator: no character; chosen operations only',
};
const OPERATOR_OPTIONS: AccessCapability[] = [
  'spectate',
  'inspect',
  'save',
  'manage-access',
  'create',
];
const when = (at: number) =>
  new Date(at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** Invite enrollment and access removal for `manage-access` holders. The server owns every
 * rule; this form only offers choices the issuer can currently delegate. */
export function AccessSection({
  view,
  access,
  describe,
  onChanged,
}: {
  view: OperationsView;
  access: Access;
  describe: (capability: AccessCapability) => string;
  onChanged: () => void;
}) {
  const [role, setRole] = useState<Role>('player');
  const [actorId, setActorId] = useState('');
  const [label, setLabel] = useState('');
  const [hours, setHours] = useState(168);
  const [chosen, setChosen] = useState<AccessCapability[]>(['spectate']);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [link, setLink] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const character = access.candidates.some((candidate) => candidate.actorId === actorId)
    ? actorId
    : (access.candidates[0]?.actorId ?? '');
  const delegable = OPERATOR_OPTIONS.filter((capability) => view.capabilities.includes(capability));
  async function run(
    request: () => Promise<{ ok: boolean; message?: string; link?: string }>,
  ): Promise<void> {
    setBusy(true);
    setMessage('');
    try {
      const result = await request();
      setMessage(result.message ?? (result.ok ? 'Done.' : 'The request was not accepted.'));
      if (result.ok && result.link) setLink(result.link);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
      onChanged();
    }
  }
  const create = () =>
    run(() => {
      setLink(null);
      return post<{ ok: boolean; message?: string; link?: string }>('/api/invites/create', {
        id: crypto.randomUUID(),
        role,
        label,
        expiresInHours: hours,
        ...(role === 'player' ? { actorId: character } : {}),
        ...(role === 'operator' ? { capabilities: chosen } : {}),
      });
    });
  const pending = access.invites.filter((invite) => invite.status === 'pending');
  return (
    <>
      <Section title="Invite someone">
        {view.mode !== 'oidc' ? (
          <p className="ol-muted">Invites need OIDC sign-in. Local mode has a single player.</p>
        ) : (
          <form
            className="ol-operations-form"
            onSubmit={(event) => {
              event.preventDefault();
              void create();
            }}
          >
            <label>
              Who is this for?
              <input
                value={label}
                maxLength={80}
                required
                placeholder="Name you will recognize"
                onChange={(event) => setLabel(event.target.value)}
              />
            </label>
            <label>
              Role
              <select value={role} onChange={(event) => setRole(event.target.value as Role)}>
                {(Object.keys(ROLE_TEXT) as Role[]).map((value) => (
                  <option key={value} value={value}>
                    {ROLE_TEXT[value]}
                  </option>
                ))}
              </select>
            </label>
            {role === 'player' &&
              (access.candidates.length ? (
                <label>
                  Character
                  <select value={character} onChange={(event) => setActorId(event.target.value)}>
                    {access.candidates.map((candidate) => (
                      <option key={candidate.actorId} value={candidate.actorId}>
                        {candidate.name} ({candidate.actorId})
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p className="ol-muted">
                  No living person without a human owner is available. A creator can add a person
                  with God mode first.
                </p>
              ))}
            {role === 'operator' && (
              <fieldset>
                <legend>Operations (you can delegate only what you hold)</legend>
                {delegable.map((capability) => (
                  <label key={capability}>
                    <input
                      type="checkbox"
                      checked={chosen.includes(capability)}
                      onChange={(event) =>
                        setChosen((current) =>
                          event.target.checked
                            ? [...current, capability]
                            : current.filter((item) => item !== capability),
                        )
                      }
                    />
                    {describe(capability)}
                  </label>
                ))}
              </fieldset>
            )}
            <label>
              Link expires after
              <select value={hours} onChange={(event) => setHours(Number(event.target.value))}>
                {EXPIRY.map((option) => (
                  <option key={option.hours} value={option.hours}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="submit"
              variant="primary"
              busy={busy}
              disabled={
                !label.trim() ||
                (role === 'player' && !character) ||
                (role === 'operator' && !chosen.length)
              }
            >
              Create invite link
            </Button>
          </form>
        )}
        {message && <p role="status">{message}</p>}
        {link && (
          <div className="ol-operations-row">
            <code className="ol-operations-secret" aria-label="Invite link">
              {link}
            </code>
            <Button size="sm" onPress={() => void navigator.clipboard?.writeText(link)}>
              Copy link
            </Button>
          </div>
        )}
      </Section>
      <Section title="Invites" count={pending.length}>
        {!access.invites.length ? (
          <p className="ol-muted">No invites yet.</p>
        ) : (
          <ul className="ol-operations-list">
            {access.invites.map((invite) => (
              <li key={invite.id}>
                <div className="ol-operations-row">
                  <strong>{invite.label}</strong>
                  <Tag>{invite.role}</Tag>
                  <Tag tone={invite.status === 'pending' ? 'accent' : 'neutral'}>
                    {invite.status}
                  </Tag>
                  {invite.actorId && <span className="ol-muted">{invite.actorId}</span>}
                </div>
                <span className="ol-caption">
                  {invite.status === 'redeemed' && invite.redeemedAt
                    ? `Used ${when(invite.redeemedAt)}`
                    : `Expires ${when(invite.expiresAt)}`}
                </span>
                {invite.status === 'pending' && (
                  <Button
                    size="sm"
                    variant="quiet"
                    disabled={busy}
                    onPress={() => void run(() => post('/api/invites/revoke', { id: invite.id }))}
                  >
                    Revoke invite
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Accounts with access" count={access.grants.length}>
        <ul className="ol-operations-list">
          {access.grants.map((grant) => (
            <li key={grant.accountId}>
              <div className="ol-operations-row">
                <strong>{grant.label ?? grant.accountId}</strong>
                {grant.self && <Tag>you</Tag>}
                <span className="ol-muted">
                  {grant.actorId ? `Character ${grant.actorId}` : 'No character'}
                </span>
              </div>
              <span className="ol-caption">
                {grant.capabilities.length
                  ? grant.capabilities.map(describe).join(' · ')
                  : 'Access removed'}
              </span>
              {!grant.self &&
                grant.capabilities.length > 0 &&
                (removing === grant.accountId ? (
                  <div className="ol-operations-row">
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={busy}
                      onPress={() => {
                        setRemoving(null);
                        void run(() =>
                          post('/api/access', {
                            accountId: grant.accountId,
                            expectedRevision: grant.revision,
                            capabilities: [],
                          }),
                        );
                      }}
                    >
                      Confirm removing access
                    </Button>
                    <Button size="sm" variant="quiet" onPress={() => setRemoving(null)}>
                      Keep access
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="quiet"
                    disabled={busy}
                    onPress={() => setRemoving(grant.accountId)}
                  >
                    Remove access
                  </Button>
                ))}
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
