import type { NativeWorld, NativeWorldConsumer } from '@open-legend/native-simulation';
import { jsonByteLength } from '@open-legend/domain';
import { attachNativeConsumer, nativeJsonEncodingWorkspace } from './native-consumer.js';
import { measureReadableDecisionContext, readableDecisionContext } from './response-context.js';

type Budget = Pick<NativeWorld, 'reserveConsumerBytes'>;
type Actions = { id: string; description: string }[];
export interface NativeDecisionText {
  readonly text: string;
  readonly bytes: number;
}

function measureJson(world: Budget, value: unknown, workspace: number): number {
  // jsonByteLength traverses Object.keys arrays. Admit that selected traversal
  // before measuring; no serialized JSON body is constructed by this pass.
  const temporary = world.reserveConsumerBytes(workspace + 256);
  try {
    return jsonByteLength(value);
  } finally {
    temporary.release();
  }
}

export function nativeDecisionJsonSize(world: Budget, value: unknown): number {
  return measureJson(world, value, nativeJsonEncodingWorkspace(value));
}

function measurePrompt(
  world: Budget,
  context: Record<string, unknown>,
  actions: Actions,
  includeActions: boolean,
  extra: string,
) {
  return measureReadableDecisionContext(
    context,
    actions,
    includeActions,
    (value, workspace) => measureJson(world, value, workspace),
    extra,
  );
}

export function nativeDecisionPromptSize(
  world: Budget,
  context: Record<string, unknown>,
  actions: Actions,
  includeActions = false,
  extra = '',
): number {
  const frame = world.reserveConsumerBytes(2 * 256);
  try {
    return measurePrompt(world, context, actions, includeActions, extra).bytes;
  } finally {
    frame.release();
  }
}

/** This product stays with the actual preparation/provider consumer. Borrowed
 * capture pins cannot fund its new UTF-16 string or the renderer's work arrays. */
export function nativeDecisionPrompt(
  world: Budget,
  context: Record<string, unknown>,
  actions: Actions,
  includeActions = false,
  extra = '',
): NativeDecisionText {
  const frame = world.reserveConsumerBytes(2 * 256);
  let output: NativeWorldConsumer | undefined;
  let workspace: NativeWorldConsumer | undefined;
  try {
    const size = measurePrompt(world, context, actions, includeActions, extra);
    output = world.reserveConsumerBytes(2 * size.stringUnits + 2 * 256);
    workspace = world.reserveConsumerBytes(size.workspaceBytes);
    const text = readableDecisionContext(context, actions, includeActions) + extra;
    return attachNativeConsumer({ text, bytes: Buffer.byteLength(text) }, output);
  } catch (error) {
    output?.release();
    throw error;
  } finally {
    workspace?.release();
    frame.release();
  }
}

/** The finite instruction/suffix parts already exist. Fund their new joined
 * string before concatenation; retain the product with its request preparation. */
export function joinNativeDecisionText(
  world: Budget,
  first: string,
  second = '',
  third = '',
  fourth = '',
): NativeDecisionText {
  const units = first.length + second.length + third.length + fourth.length;
  const output = world.reserveConsumerBytes(2 * units + 2 * 256);
  let workspace: NativeWorldConsumer | undefined;
  try {
    workspace = world.reserveConsumerBytes(2 * units + 4 * 256);
    const text = first + second + third + fourth;
    return attachNativeConsumer({ text, bytes: Buffer.byteLength(text) }, output);
  } catch (error) {
    output.release();
    throw error;
  } finally {
    workspace?.release();
  }
}

export function nativeDecisionJsonText(world: Budget, value: unknown): NativeDecisionText {
  const shape = nativeJsonEncodingWorkspace(value);
  const bytes = measureJson(world, value, shape);
  const output = world.reserveConsumerBytes(2 * bytes + 2 * 256);
  let workspace: NativeWorldConsumer | undefined;
  try {
    workspace = world.reserveConsumerBytes(4 * bytes + shape);
    const text = JSON.stringify(value);
    return attachNativeConsumer({ text, bytes }, output);
  } catch (error) {
    output.release();
    throw error;
  } finally {
    workspace?.release();
  }
}
