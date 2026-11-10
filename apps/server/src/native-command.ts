import { canonicalJson, type Command } from '@open-legend/domain';
import type { NativeWorld, NativeWorldConsumer } from '@open-legend/native-simulation';
import {
  encodeNativeJson,
  nativeCanonicalJsonWorkspace,
  releaseNativeProduct,
  withNativeUtf8Input,
} from './native-consumer.js';

/** The actual command bytes and separately ordered receipt signature live
 * through the native borrow. Canonical ordering does not change encoded size
 * for these trusted plain command values. Preview keeps the same input owner. */
export async function beginNativeCommand(world: NativeWorld, command: Command, preview = false) {
  const encoded = encodeNativeJson(world, command);
  let output: NativeWorldConsumer | undefined;
  let workspace: NativeWorldConsumer | undefined;
  try {
    output = world.reserveConsumerBytes(2 * encoded.length + 256);
    workspace = world.reserveConsumerBytes(nativeCanonicalJsonWorkspace(command, encoded.length));
    let canonical: string;
    try {
      canonical = canonicalJson(command);
    } finally {
      workspace.release();
      workspace = undefined;
    }
    return await withNativeUtf8Input(world, canonical, (signature) =>
      world.command(encoded, signature, preview),
    );
  } finally {
    workspace?.release();
    output?.release();
    releaseNativeProduct(encoded);
  }
}

/** The ordinary receipt codec formats one already selected native command.
 * It reads no world, changes no binding and grants no execution authority. */
export function nativeCanonicalCommand(request: {
  binding: {
    candidateId: number;
    baseCut: number;
    generation: number;
    geometryRevision: number;
    serial: number;
  };
  command: Command;
}) {
  return { binding: request.binding, canonical: canonicalJson(request.command) };
}
