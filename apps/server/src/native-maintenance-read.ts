import type { NativeWorld, NativeWorldMaintenanceRead } from '@open-legend/native-simulation';
import { EXPERIENCE_LIMITS, type MindFiles } from '@open-legend/domain';
import type { IntakeInputs } from './actor-work.js';
import type { MaintenanceActor, MaintenanceAdmission } from './maintenance-host.js';
import {
  decodeNativeProduct,
  freezeNativeProduct,
  retainNativeSources,
} from './native-consumer.js';

/** The Source host samples this resident warning before the advance. Canonical
 * SQL pressure is a separate maintenance decision and keeps its existing owner. */
export async function readNativeResidentPressure(world: NativeWorld): Promise<boolean> {
  const product = await world.maintenancePressure(
    Buffer.from(
      JSON.stringify({
        awareness: EXPERIENCE_LIMITS.consolidationPressure,
        memories: EXPERIENCE_LIMITS.consolidationPressure + 16,
      }),
    ),
  );
  const read = decodeNativeProduct<{ readonly residentPressure: boolean }>(product);
  return read.residentPressure;
}

export interface NativeMaintenanceFacts extends MaintenanceActor {
  readonly worldId: string;
  readonly generation: string;
  readonly mindRevision: number;
  readonly innerWorldRevision: number | null;
  readonly lastDreamEpisode: string | null;
  readonly activeObligationsDigest: string;
  readonly enrolled: boolean;
  readonly values: readonly string[];
  readonly dependencyToken: string;
  readonly residentPressure?: boolean;
}
function admissionInput(admission: MaintenanceAdmission): Buffer {
  return Buffer.from(
    JSON.stringify({
      purpose: admission.purpose,
      requiresBody: admission.requiresBody,
      ...(admission.dreamEpisode !== undefined ? { dreamEpisode: admission.dreamEpisode } : {}),
    }),
  );
}

/** One real native maintenance origin. JSON supplies advisory scheduling facts;
 * admission and final synchronous disclosure use this actual retained read. */
export class NativeMaintenanceRead {
  private constructor(
    private product: NativeMaintenanceFacts | undefined,
    readonly native: NativeWorldMaintenanceRead,
  ) {}
  static async capture(world: NativeWorld, actorId: string, pressure = false) {
    const read = await world.readMaintenance(
      Buffer.from(
        JSON.stringify({
          actorId,
          ...(pressure
            ? {
                residentPressure: {
                  awareness: EXPERIENCE_LIMITS.consolidationPressure,
                  memories: EXPERIENCE_LIMITS.consolidationPressure + 16,
                },
              }
            : {}),
        }),
      ),
    );
    try {
      return new NativeMaintenanceRead(
        freezeNativeProduct(decodeNativeProduct<NativeMaintenanceFacts>(await read.packet())),
        read,
      );
    } catch (error) {
      read.release();
      throw error;
    }
  }
  get facts(): NativeMaintenanceFacts {
    if (!this.product) throw new Error('Native maintenance read was released.');
    return this.product;
  }
  inputs(backlog: unknown, sourceRevision: unknown): IntakeInputs {
    const facts = this.facts;
    return {
      values: retainNativeSources(
        [...facts.values, facts.dependencyToken, backlog, sourceRevision],
        facts,
      ),
      reasons: [],
    };
  }
  current(admission: MaintenanceAdmission): boolean {
    const facts = this.product;
    return (
      !!facts &&
      facts.actorId === admission.actorId &&
      facts.generation === admission.generation &&
      facts.bodyFence === admission.fence &&
      this.native.isCurrent(admissionInput(admission))
    );
  }
  publication(world: NativeWorld, admission: MaintenanceAdmission) {
    this.facts;
    return world.maintenancePublication(this.native, admissionInput(admission));
  }
  async files(): Promise<MindFiles> {
    this.facts;
    return decodeNativeProduct<MindFiles>(await this.native.details());
  }
  async rawDeadlines(): Promise<readonly number[]> {
    this.facts;
    const times = decodeNativeProduct<number[]>(await this.native.rawTimes());
    return retainNativeSources(
      times.map((at) => at + EXPERIENCE_LIMITS.rawHours * 3600),
      times,
    );
  }
  release(): void {
    this.product = undefined;
    this.native.release();
  }
}
