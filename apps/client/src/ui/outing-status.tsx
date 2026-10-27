import { useEffect, useMemo, useRef, useState } from 'react';
import { GameDeadline } from './event-time';
import type { CommandInput, CommandReceiptResult, GameView } from '@open-legend/protocol';
import type { CommandDispatcher } from '../command-request';
import { post } from '../api';
import { readRetainedRequest, releaseRequest, retainRequest } from '../retained-request';
import { holdActionFocus } from './action-focus';
import { Button, Section, Tag } from '../design-system/components';

type Props = { view: GameView; connected: boolean; command: CommandDispatcher };
type PendingAgreement = { requestId: string; commandEpoch: string; command: CommandInput };
const changeEvent = 'ol-agreement-requests';
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
/** Stored commands are receipt proofs, never replayed or offered as executable choices. */
function validPending(value: unknown): value is PendingAgreement {
  return (
    record(value) &&
    typeof value.requestId === 'string' &&
    !!value.requestId &&
    typeof value.commandEpoch === 'string' &&
    !!value.commandEpoch &&
    record(value.command) &&
    typeof value.command.type === 'string'
  );
}
function requestKeys(prefix: string | undefined): string[] | null {
  if (!prefix) return null;
  try {
    return Object.keys(sessionStorage).filter((key) => key.startsWith(prefix));
  } catch {
    return null;
  }
}

/** The participant's own received terms, never a party tracker or an execution queue. */
export function OutingStatus(props: Props) {
  const scope = props.view.access?.commandRecoveryScope;
  const prefix = scope
    ? `open-legend:agreement-command:${JSON.stringify([scope, props.view.worldId, props.view.saveTimeline, props.view.player.id])}:`
    : undefined;
  return <AgreementControls key={prefix ?? 'no-recovery-access'} {...props} prefix={prefix} />;
}
function AgreementControls({ view, connected, command, prefix }: Props & { prefix?: string }) {
  const [keys, setKeys] = useState(() => requestKeys(prefix));
  const [shown, setShown] = useState(40);
  const [message, setMessage] = useState('');
  const [, render] = useState(0);
  const active = useRef(new Map<string, 'sending' | 'reading'>());
  const surface = useRef<HTMLDivElement>(null);
  const alive = useRef(true),
    access = useRef(view.access?.scope);
  access.current = view.access?.scope;
  const available = connected && view.access?.controlling !== false && !!prefix;
  const refresh = () => setKeys(requestKeys(prefix));
  const changed = () => window.dispatchEvent(new Event(changeEvent));
  useEffect(() => {
    alive.current = true;
    window.addEventListener(changeEvent, refresh);
    window.addEventListener('focus', refresh);
    return () => {
      alive.current = false;
      window.removeEventListener(changeEvent, refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [prefix]);
  // Select keys before reading bodies. Routine movement does not reparse recovery data.
  const retained = useMemo(
    () =>
      keys
        ?.slice(0, shown)
        .map((key) => ({ key, value: readRetainedRequest(key, validPending) })) ?? [],
    [keys, shown],
  );
  function settle(key: string, original: PendingAgreement) {
    const current = readRetainedRequest(key, validPending);
    if (
      current.status !== 'pending' ||
      current.request.requestId !== original.requestId ||
      current.request.commandEpoch !== original.commandEpoch ||
      JSON.stringify(current.request.command) !== JSON.stringify(original.command)
    )
      throw new Error('The retained agreement request changed. Check its original result.');
    releaseRequest(key, original.requestId);
    changed();
  }
  async function perform(
    key: string,
    choice: GameView['player']['outings'][number]['choices'][number],
  ) {
    if (!available || active.current.has(key) || !view.commandEpoch) return;
    const scope = view.access?.scope;
    const original = {
      requestId: crypto.randomUUID(),
      commandEpoch: view.commandEpoch,
      command: choice.command,
    };
    try {
      retainRequest(key, original);
    } catch (error) {
      setMessage(String(error));
      refresh();
      return;
    }
    active.current.set(key, 'sending');
    render((v) => v + 1);
    changed();
    const restoreFocus = holdActionFocus(
      surface.current,
      surface.current?.closest<HTMLElement>('.ol-panel'),
    );
    try {
      const result = await command(
        { ...choice, enabled: true },
        { commandId: original.requestId, commandEpoch: original.commandEpoch },
      );
      if (!alive.current || access.current !== scope) return;
      if (!['unconfirmed', 'expired', 'idempotency-conflict'].includes(result.code))
        settle(key, original);
      setMessage(result.message);
    } catch (error) {
      if (alive.current && access.current === scope)
        setMessage(
          `${String(error)} The agreement request remains unconfirmed. Check its original result.`,
        );
    } finally {
      active.current.delete(key);
      if (alive.current && access.current === scope) {
        render((v) => v + 1);
        restoreFocus();
      }
    }
  }
  async function recover(key: string, original: PendingAgreement) {
    if (!available || active.current.has(key)) return;
    const scope = view.access?.scope;
    active.current.set(key, 'reading');
    render((v) => v + 1);
    const restoreFocus = holdActionFocus(
      surface.current,
      surface.current?.closest<HTMLElement>('.ol-panel'),
    );
    try {
      const receipt = await post<CommandReceiptResult>('/api/command/receipt', {
        commandId: original.requestId,
        commandEpoch: original.commandEpoch,
        command: original.command,
      });
      if (!alive.current || access.current !== scope) return;
      if (receipt.scope !== scope) throw new Error('Your access changed. Reopen Agreements.');
      if (receipt.status === 'resolved') {
        settle(key, original);
        setMessage(receipt.result.message);
      } else setMessage(receipt.message);
    } catch (error) {
      if (alive.current && access.current === scope)
        setMessage(`${String(error)} Nothing was resubmitted.`);
    } finally {
      active.current.delete(key);
      if (alive.current && access.current === scope) {
        render((v) => v + 1);
        restoreFocus();
      }
    }
  }
  if (!view.player.outings.length && !keys?.length && !message && (keys !== null || !prefix))
    return null;
  return (
    <div ref={surface}>
      <Section title="Agreements">
        {view.player.outings.map((trip) => (
          <div key={trip.id} className="ol-camp-activities">
            <p>
              <Tag>{`Last known ${trip.status}`}</Tag> <strong>{trip.destination}</strong>
              {(trip.distance !== null || trip.kind === 'combat-help') && (
                <>
                  {' '}
                  ·{' '}
                  {trip.distance === null
                    ? 'Location unknown'
                    : `${trip.distance.toFixed(1)} m away`}
                </>
              )}
            </p>
            <p>
              With {trip.companion}. {trip.company}.
            </p>
            {trip.purpose && <p>Stated purpose: “{trip.purpose}”</p>}
            <p className="ol-caption">{trip.description}</p>
            {trip.deadline !== undefined && <GameDeadline at={trip.deadline} />}
            {trip.choices.map((choice) => {
              const key = `${prefix}${JSON.stringify(choice.id)}`;
              return (
                <Button
                  key={choice.id}
                  disabled={
                    !available || keys === null || keys.includes(key) || active.current.has(key)
                  }
                  onPress={() => void perform(key, choice)}
                >
                  {choice.label}
                </Button>
              );
            })}
          </div>
        ))}
        {keys === null && prefix && (
          <p role="status">
            Agreement request storage cannot be read. Nothing new will be sent until it is
            available.
          </p>
        )}
        {retained
          .filter(({ key }) => active.current.get(key) !== 'sending')
          .map(({ key, value }) => (
            <div key={key} className="ol-camp-activities">
              <p>
                {value.status === 'pending'
                  ? 'An agreement change has an unconfirmed result.'
                  : 'An earlier agreement request cannot be read. Restore browser storage before replacing it.'}
              </p>
              {value.status === 'pending' && (
                <Button
                  disabled={!available || active.current.has(key)}
                  onPress={() => void recover(key, value.request)}
                >
                  Check request result
                </Button>
              )}
            </div>
          ))}
        {keys && keys.length > shown && (
          <Button onPress={() => setShown((v) => v + 40)}>Show more retained requests</Button>
        )}
        {message && (
          <p role="status" className="ol-meta">
            {message}
          </p>
        )}
      </Section>
    </div>
  );
}
