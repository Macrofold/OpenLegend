import type {
  WorldAgentQuestion,
  WorldAgentQuestionAnswer,
  WorldAgentReply,
} from '@open-legend/protocol';
import { useRef, useState } from 'react';
import {
  Checkbox,
  CheckboxGroup,
  Label,
  Radio,
  RadioGroup,
  TextArea,
  TextField,
} from 'react-aria-components';
import { Button } from '../design-system/components';
import { post, privateDraftScope } from '../api';
import { readLocal, writeLocal } from './storage';
import { authoringKey } from './world-agent-identity';

type Answers = WorldAgentQuestionAnswer['answers'];
type Pending = {
  answerId: string;
  answers: Answers;
  supersedes?: string;
  continueIfReady: boolean;
};
const answersValue = (value: unknown): value is Answers =>
  Array.isArray(value) &&
  value.length <= 3 &&
  value.every(
    (answer) =>
      answer &&
      typeof answer === 'object' &&
      typeof answer.questionId === 'string' &&
      (answer.kind === 'text'
        ? typeof answer.text === 'string'
        : answer.kind === 'options' &&
          Array.isArray(answer.optionIds) &&
          answer.optionIds.every((id: unknown) => typeof id === 'string')),
  );
const pendingValue = (value: unknown): value is Pending =>
  !!value &&
  typeof value === 'object' &&
  'answerId' in value &&
  typeof value.answerId === 'string' &&
  'answers' in value &&
  answersValue(value.answers) &&
  (!('supersedes' in value) || typeof value.supersedes === 'string') &&
  'continueIfReady' in value &&
  typeof value.continueIfReady === 'boolean';
function readPending(key: string): Pending | null {
  const text = localStorage.getItem(key);
  if (text === null) return null;
  const value: unknown = JSON.parse(text);
  if (value === null) return null;
  if (!pendingValue(value))
    throw new Error('The original answer record is unreadable. Restore storage before sending.');
  return value;
}
const samePending = (a: Pending, b: Pending) => JSON.stringify(a) === JSON.stringify(b);
function writePending(key: string, value: Pending, clear = false) {
  const current = readPending(key);
  if (current && !samePending(current, value))
    throw new Error('A different original answer remains retained. Check its saved result first.');
  const text = JSON.stringify(clear ? null : value);
  localStorage.setItem(key, text);
  if (localStorage.getItem(key) !== text)
    throw new Error(
      'This browser could not retain or clear the original answer record. Restore storage and check its saved result.',
    );
}
const message = (error: unknown) =>
  error instanceof Error ? error.message : 'The answer could not be confirmed.';

/** The local draft never grants authority. Stable request identity survives a lost reply;
 * reconnect only reads status and never sends an answer or starts generation. */
export function WorldAgentQuestionCard({
  question,
  worldId,
  sessionId,
  canAnswer,
  canContinue,
  reason,
  connected,
  onChanged,
}: {
  question: WorldAgentQuestion;
  worldId: string;
  sessionId: string;
  canAnswer: boolean;
  canContinue: boolean;
  reason?: string;
  connected: boolean;
  onChanged(): void;
}) {
  // The server must authorize this session/question before rendering the card.
  // Connection IDs change on reload; using them here would lose unsent answers.
  const audience = privateDraftScope();
  const recordKey = (record: string) =>
    authoringKey(
      'question-record',
      worldId,
      audience,
      sessionId,
      question.turnId,
      question.digest,
      record,
    );
  const [answers, setAnswers] = useState<Answers>(() =>
    readLocal(recordKey('draft'), question.answer?.answers ?? [], answersValue),
  );
  const [pending, setPending] = useState<Pending | null>(() =>
    readLocal(recordKey('pending'), null, pendingValue),
  );
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const [editingRequested, setEditing] = useState(!question.answer);
  const [editingAnswerId, setEditingAnswerId] = useState(question.answer?.id);
  // A winning answer from another tab is shown as accepted, never overwritten by our draft.
  const editing = editingRequested && editingAnswerId === question.answer?.id;
  const working = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // A different accepted successor resolves a race. Keep our draft for an explicit
  // correction; only an unchanged predecessor leaves the send outcome uncertain.
  const needsConfirmation = (value: Pending) =>
    value.answerId !== question.answer?.id &&
    (!question.answer || value.supersedes === question.answer.id);
  const unconfirmed = pending && needsConfirmation(pending) ? pending : null;
  function rememberPending(value: Pending | null) {
    pendingRef.current = value;
    setPending(value);
  }
  function settleConfirmedAnswer() {
    const stored = readPending(recordKey('pending'));
    const original = pendingRef.current ?? stored;
    if (!original) return;
    if (needsConfirmation(original))
      throw new Error(
        'Check the original answer before changing it. Your later draft remains here.',
      );
    writePending(recordKey('pending'), original, true);
    rememberPending(null);
  }
  const complete = question.questions.every((q) => {
    const value = answers.find((a) => a.questionId === q.id);
    return value?.kind === 'text' ? !!value.text.trim() : !!value?.optionIds.length;
  });
  function update(answer: Answers[number]) {
    const next = [...answers.filter((a) => a.questionId !== answer.questionId), answer];
    setAnswers(next);
    writeLocal(recordKey('draft'), next);
  }
  async function act(work: () => Promise<void>) {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await work();
    } catch (error) {
      setError(message(error));
    } finally {
      working.current = false;
      setBusy(false);
      onChanged();
    }
  }
  async function send(saved?: Pending) {
    await act(async () => {
      let dispatched = false;
      try {
        // Check before allocating an identity: optional draft persistence cannot
        // replace an unresolved answer that may already have continued paid work.
        const stored = readPending(recordKey('pending'));
        if (!saved && (pendingRef.current || stored)) {
          if (!pendingRef.current && stored) rememberPending(stored);
          throw new Error(
            'Check the original answer before sending another one. Your later draft remains here.',
          );
        }
        const value = saved ?? {
          answerId: crypto.randomUUID(),
          answers,
          continueIfReady: canContinue,
          ...(question.answer ? { supersedes: question.answer.id } : {}),
        };
        writePending(recordKey('pending'), value);
        rememberPending(value);
        dispatched = true;
        const reply = await post<WorldAgentReply>('/api/world-agent/session/question-answer', {
          worldId,
          sessionId,
          questionTurnId: question.turnId,
          digest: question.digest,
          ...value,
        });
        if (!reply.ok) {
          if (['authoring-request', 'invalid-input'].includes(reply.code)) {
            setNotice(reply.message);
            writePending(recordKey('pending'), value, true);
            rememberPending(null);
          }
          throw new Error(reply.message);
        }
        // An acknowledged native answer stays known even if browser cleanup fails.
        setNotice(reply.message);
        setEditing(false);
        writePending(recordKey('pending'), value, true);
        rememberPending(null);
      } catch (failure) {
        throw new Error(`${message(failure)}${dispatched ? '' : ' No answer request was sent.'}`);
      }
    });
  }
  async function resume() {
    await act(async () => {
      const reply = await post<WorldAgentReply>('/api/world-agent/session/question-continue', {
        worldId,
        sessionId,
        questionTurnId: question.turnId,
        answerId: question.answer?.id,
      });
      if (!reply.ok) throw new Error(reply.message);
    });
  }
  const editable = canAnswer && editing && !unconfirmed;
  return (
    <section className="ol-agent-question" aria-label="Question from the world agent">
      {question.questions.map((q) => {
        const value = answers.find((a) => a.questionId === q.id);
        const displayed = (question.answer?.answers ?? unconfirmed?.answers)?.find(
          (a) => a.questionId === q.id,
        );
        return (
          <div key={q.id} className="ol-agent-question-item">
            {q.header && <p className="ol-caption">{q.header}</p>}
            <p>{q.text}</p>
            {editable ? (
              <>
                {!!q.options.length && (
                  <p className="ol-caption" id={`${question.digest}-${q.id}-mode`}>
                    {q.multiple ? 'Choose one or more.' : 'Choose one.'}
                    {q.custom && ' Your own answer replaces the listed choices.'}
                  </p>
                )}
                {!!q.options.length &&
                  (q.multiple ? (
                    <CheckboxGroup
                      aria-label={q.text}
                      aria-describedby={`${question.digest}-${q.id}-mode`}
                      value={value?.kind === 'options' ? value.optionIds : []}
                      onChange={(optionIds) =>
                        update({ questionId: q.id, kind: 'options', optionIds })
                      }
                      isDisabled={busy || !connected}
                    >
                      {q.options.map((o) => (
                        <Checkbox key={o.id} value={o.id} className="ol-agent-question-option">
                          <span className="ol-agent-choice-mark" aria-hidden="true" />
                          <span>
                            <b>{o.label}</b>
                            {o.description && <span className="ol-caption">{o.description}</span>}
                          </span>
                        </Checkbox>
                      ))}
                    </CheckboxGroup>
                  ) : (
                    <RadioGroup
                      aria-label={q.text}
                      aria-describedby={`${question.digest}-${q.id}-mode`}
                      value={value?.kind === 'options' ? (value.optionIds[0] ?? '') : ''}
                      onChange={(id) =>
                        update({ questionId: q.id, kind: 'options', optionIds: [id] })
                      }
                      isDisabled={busy || !connected}
                    >
                      {q.options.map((o) => (
                        <Radio
                          key={o.id}
                          value={o.id}
                          className="ol-agent-question-option ol-agent-question-radio"
                        >
                          <span className="ol-agent-choice-mark" aria-hidden="true" />
                          <span>
                            <b>{o.label}</b>
                            {o.description && <span className="ol-caption">{o.description}</span>}
                          </span>
                        </Radio>
                      ))}
                    </RadioGroup>
                  ))}
                {q.custom && (
                  <TextField
                    className="ol-agent-custom-answer"
                    isDisabled={busy || !connected}
                    value={value?.kind === 'text' ? value.text : ''}
                    onChange={(text) => update({ questionId: q.id, kind: 'text', text })}
                  >
                    <Label>{q.options.length ? 'Or write your own answer' : 'Your answer'}</Label>
                    <TextArea maxLength={8000} rows={2} />
                  </TextField>
                )}
              </>
            ) : displayed ? (
              <p className="ol-agent-saved-answer">
                {displayed.kind === 'text'
                  ? displayed.text
                  : displayed.optionIds
                      .map((id) => {
                        const o = q.options.find((v) => v.id === id);
                        return o ? `${o.label}${o.description ? `: ${o.description}` : ''}` : '';
                      })
                      .join('\n')}
              </p>
            ) : (
              <p className="ol-caption">
                {question.state === 'open'
                  ? 'Awaiting your answer.'
                  : 'This question is no longer active.'}
              </p>
            )}
          </div>
        );
      })}
      {editable && (
        <Button
          variant="primary"
          busy={busy}
          disabled={!connected || !complete}
          onPress={() => void send()}
        >
          {canContinue ? 'Send answer and continue' : 'Save answer'}
        </Button>
      )}
      {question.answer && canAnswer && !editing && (
        <Button
          size="sm"
          variant="quiet"
          disabled={busy || !connected}
          onPress={() => {
            try {
              settleConfirmedAnswer();
              setAnswers(answers.length ? answers : question.answer!.answers);
              setEditingAnswerId(question.answer!.id);
              setEditing(true);
              setError('');
            } catch (failure) {
              setError(message(failure));
            }
          }}
        >
          Change my answer
        </Button>
      )}
      {question.answer && canAnswer && !editing && !question.answer.continuationId && (
        <Button busy={busy} disabled={!connected || !canContinue} onPress={() => void resume()}>
          Continue
        </Button>
      )}
      {pending && (
        <div role="status">
          <p>
            {unconfirmed
              ? 'Checking whether your answer was saved. Your choices are retained.'
              : 'The current saved answer is shown. Check saved answer before changing it.'}
          </p>
          {unconfirmed && (
            <Button disabled={busy || !connected} onPress={() => void send(unconfirmed)}>
              Resend the same answer
            </Button>
          )}
          <Button
            variant="quiet"
            disabled={busy}
            onPress={() =>
              void act(async () => {
                if (!unconfirmed) settleConfirmedAnswer();
              })
            }
          >
            Check saved answer
          </Button>
        </div>
      )}
      {reason && (
        <p className="ol-caption" role="status">
          {reason}
        </p>
      )}
      <p className="ol-caption">
        Your answer guides the design. You will review any proposed world change separately.
      </p>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
