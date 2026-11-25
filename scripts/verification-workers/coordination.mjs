// Short metadata critical sections; unrelated workers never share this lock.
// Every committed write checks the token, so an expired controller cannot publish late state.
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { PutCommand, DeleteCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
const conflict = (error) =>
  error.name === 'TransactionConflictException' ||
  (error.name === 'TransactionCanceledException' &&
    error.CancellationReasons?.some((reason) => reason.Code === 'TransactionConflict') &&
    error.CancellationReasons.every((reason) =>
      ['None', 'TransactionConflict'].includes(reason.Code),
    ));
// Only definite, effect-free transaction rejection is retried; unknown delivery is never replayed.
async function metadataWrite(work, timeoutMs = 6000) {
  const until = Date.now() + Math.min(timeoutMs, 6000);
  for (let attempt = 0; ; attempt++) {
    try {
      return await work(Math.max(1, Math.min(2000, until - Date.now())));
    } catch (error) {
      if (!conflict(error) || attempt === 4 || Date.now() + 200 >= until) throw error;
      await delay(25 * 2 ** attempt + Math.random() * 25);
    }
  }
}
export function coordination({ db, table, send }) {
  const scope = new AsyncLocalStorage();
  function conditions() {
    return (scope.getStore() ?? []).map(({ pk, token }) => ({
      ConditionCheck: {
        TableName: table,
        Key: { pk },
        ConditionExpression: '#token = :token AND expiresAt > :now',
        ExpressionAttributeNames: { '#token': 'token' },
        ExpressionAttributeValues: { ':token': token, ':now': Date.now() },
      },
    }));
  }
  async function transact(items, timeoutMs) {
    return metadataWrite(
      (remaining) =>
        send(db, TransactWriteCommand, { TransactItems: [...conditions(), ...items] }, remaining),
      timeoutMs,
    );
  }
  async function lock(key, work) {
    const held = scope.getStore() ?? [],
      pk = `mutex:${key}`;
    if (held.some((item) => item.pk === pk)) return work();
    const token = randomUUID();
    try {
      await send(
        db,
        PutCommand,
        {
          TableName: table,
          Item: { pk, token, expiresAt: Date.now() + 75000 },
          ConditionExpression: 'attribute_not_exists(pk) OR expiresAt < :now',
          ExpressionAttributeValues: { ':now': Date.now() },
        },
        5000,
      );
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException' || conflict(error))
        return { busy: true };
      throw error;
    }
    try {
      return await scope.run([...held, { pk, token }], work);
    } finally {
      try {
        await metadataWrite((remaining) =>
          send(
            db,
            DeleteCommand,
            {
              TableName: table,
              Key: { pk },
              ConditionExpression: '#token = :token',
              ExpressionAttributeNames: { '#token': 'token' },
              ExpressionAttributeValues: { ':token': token },
            },
            remaining,
          ),
        );
      } catch (error) {
        if (error.name !== 'ConditionalCheckFailedException')
          console.error('Control-lock release pending:', error.name);
      }
    }
  }
  return { lock, transact };
}
