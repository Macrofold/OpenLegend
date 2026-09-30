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
import { post } from '../api';
import { readLocal, writeLocal } from './storage';

type Answers = WorldAgentQuestionAnswer['answers'];
type Pending = {
  answerId: string;
  answers: Answers;
  supersedes?: string;
  continueIfReady: boolean;
};
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
  const key = `open-legend:authoring:question:${worldId}:${sessionId}:${question.digest}`;
  const [answers, setAnswers] = useState<Answers>(() =>
    readLocal(
      `${key}:draft`,
      question.answer?.answers ?? [],
      (v): v is Answers =>
        Array.isArray(v) &&
        v.length <= 3 &&
        v.every(
          (a) =>
            a &&
            typeof a === 'object' &&
            typeof a.questionId === 'string' &&
            (a.kind === 'text'
              ? typeof a.text === 'string'
              : a.kind === 'options' &&
                Array.isArray(a.optionIds) &&
                a.optionIds.every((id: unknown) => typeof id === 'string')),
        ),
    ),
  );
  const [pending, setPending] = useState<Pending | null>(() =>
    readLocal(
      `${key}:pending`,
      null,
      (v): v is Pending =>
        !!v &&
        typeof v === 'object' &&
        'answerId' in v &&
        typeof v.answerId === 'string' &&
        'answers' in v &&
        Array.isArray(v.answers) &&
        'continueIfReady' in v &&
        typeof v.continueIfReady === 'boolean',
    ),
  );
  const [editingRequested, setEditing] = useState(!question.answer);
  const [editingAnswerId, setEditingAnswerId] = useState(question.answer?.id);
  // A winning answer from another tab is shown as accepted, never overwritten by our draft.
  const editing = editingRequested && editingAnswerId === question.answer?.id;
  const working = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // A different accepted successor resolves a race. Keep our draft for an explicit
  // correction; only an unchanged predecessor leaves the send outcome uncertain.
  const unconfirmed =
    pending &&
    pending.answerId !== question.answer?.id &&
    (!question.answer || pending.supersedes === question.answer.id)
      ? pending
      : null;
  const complete = question.questions.every((q) => {
    const value = answers.find((a) => a.questionId === q.id);
    return value?.kind === 'text' ? !!value.text.trim() : !!value?.optionIds.length;
  });
  function update(answer: Answers[number]) {
    const next = [...answers.filter((a) => a.questionId !== answer.questionId), answer];
    setAnswers(next);
    writeLocal(`${key}:draft`, next);
  }
  async function act(work: () => Promise<void>) {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError('');
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
      const value = saved ?? {
        answerId: crypto.randomUUID(),
        answers,
        continueIfReady: canContinue,
        ...(question.answer ? { supersedes: question.answer.id } : {}),
      };
      writeLocal(`${key}:pending`, value);
      setPending(value);
      const reply = await post<WorldAgentReply>('/api/world-agent/session/question-answer', {
        worldId,
        sessionId,
        questionTurnId: question.turnId,
        digest: question.digest,
        ...value,
      });
      if (!reply.ok) {
        if (['authoring-request', 'invalid-input'].includes(reply.code)) {
          writeLocal(`${key}:pending`, null);
          setPending(null);
        }
        throw new Error(reply.message);
      }
      writeLocal(`${key}:pending`, null);
      setPending(null);
      setEditing(false);
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
            writeLocal(`${key}:pending`, null);
            setPending(null);
            setAnswers(answers.length ? answers : question.answer!.answers);
            setEditingAnswerId(question.answer!.id);
            setEditing(true);
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
      {unconfirmed && (
        <div role="status">
          <p>Checking whether your answer was saved. Your choices are retained.</p>
          <Button disabled={busy || !connected} onPress={() => void send(unconfirmed)}>
            Resend the same answer
          </Button>
          <Button variant="quiet" onPress={onChanged}>
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
    </section>
  );
}
