import { selectedTemporalPolicy, type ExperiencePrivacy } from '@open-legend/domain';
import { nativeSetupSettings } from '@open-legend/domain/native-install';
import type { NativeHost, NativeWorld, NativeWorldConsumer } from '@open-legend/native-simulation';
import { NativeActorRoster } from './native-actor-roster.js';
import {
  copyNativeProduct,
  encodeNativeJson,
  releaseNativeProduct,
  retainNativeProduct,
} from './native-consumer.js';
import {
  nativeSourceFlatStringFields,
  withAdmittedWorkingSources,
} from './native-current-sources.js';
import { nativeDefinitionSources } from './native-definition-sources.js';
import { nativeRecordLayouts, nativeStorageSettings } from './native-install-inputs.js';
import type { NativeMilestones } from './native-milestones.js';
import { NativeRetention } from './native-retention.js';
import { parseSourceJson } from './native-source-preparation.js';
import type { OperationalSettings } from './native-world-service.js';
import { DATABASE_SCHEMA, type SqlGameRepository } from './store.js';
import { RECORD_NODES } from './world-record-schema.js';

interface OpeningHeader {
  readonly playerActorId: string;
  readonly nextId: number;
  readonly simTime: number;
  readonly sequence: number;
  readonly paused: boolean;
}

/** End SQL/source decoding and authored-definition preparation before the
 * native constructor starts. Only the independently encoded packet and finite
 * scheduling metadata cross that boundary; neither can pin the source graph. */
export class NativeCurrentOpening {
  private packet?: Buffer;
  private headerOwner?: OpeningHeader;
  private operationalOwner?: OperationalSettings;
  private privacyOwner?: ExperiencePrivacy;
  private milestonesOwner?: NativeMilestones;
  private actorsOwner?: NativeActorRoster;
  private retentionOwner?: NativeRetention;

  private constructor(
    private host: NativeHost | undefined,
    private fixed: NativeWorldConsumer | undefined,
  ) {}

  static async capture(host: NativeHost, store: SqlGameRepository): Promise<NativeCurrentOpening> {
    await store.ready;
    const fixed = host.reserveConsumerBytes(12 * 32 * 8);
    const opening = new NativeCurrentOpening(host, fixed);
    try {
      return await withAdmittedWorkingSources(
        store.records,
        DATABASE_SCHEMA,
        host,
        async (source) => {
          if (!source) throw new Error('Native opening requires an existing current-format world.');
          // Preserve the existing selected installer refusal: this owner does not
          // implement a maintenance-window writer or silently resume its hold.
          if (
            (await store.maintenance.load(source.records.worldId)).some(
              (window) => window.status === 'scheduled' || window.status === 'active',
            )
          )
            throw new Error(
              'Native opening cannot yet execute an operational maintenance schedule.',
            );

          const row = source.records.tables['data_world']?.find((value) => value.id === '[]');
          const player = source.records.tables['world_player_accounts']?.[0];
          if (!row || !player)
            throw new Error('Native opening requires its actual host and player owner.');

          // This existing owner validates the exact selected profile/families.
          // The header below supplies scalar metadata and the same profile for
          // deadline selection; it is never a replacement definition authority.
          const definitions = nativeDefinitionSources(source);
          const header = parseSourceJson<{
            profile: Parameters<typeof selectedTemporalPolicy>[0]['profile'];
            nextId: number;
            simTime: number;
            sequence: number;
            paused: boolean;
          }>(source.records.tables['world_settings']![0]!.payload);
          const saved = parseSourceJson<OperationalSettings>(row.payload);
          const forgotten = source.records.tables['mind_forgotten'] ?? [];
          const corrections = source.records.tables['mind_corrections'] ?? [];
          const milestoneRows = source.records.tables['actor_milestones'] ?? [];
          // Before constructing the metadata selection, admit its object/maps,
          // per-actor arrays and Object.fromEntries tuples. Strings still borrow
          // admitted SQL rows until each independent copy is encoded below.
          const metadata = host.reserveConsumerBytes(
            (12 + forgotten.length + corrections.length + milestoneRows.length) * 32 * 8 +
              (forgotten.length * 2 + corrections.length * 3 + milestoneRows.length * 3) * 64 * 8,
          );
          try {
            opening.headerOwner = retainNativeProduct(
              copyNativeProduct(host, {
                playerActorId: player.slot,
                nextId: header.nextId,
                simTime: header.simTime,
                sequence: header.sequence,
                paused: header.paused,
              }),
            );
            opening.operationalOwner = retainNativeProduct(
              copyNativeProduct(host, {
                speed: saved.speed,
                manuallyPaused: saved.manuallyPaused,
                ...(saved.presentationRelease
                  ? { presentationRelease: saved.presentationRelease }
                  : {}),
                ...(saved.presentationReleaseRevision === undefined
                  ? {}
                  : {
                      presentationReleaseRevision: saved.presentationReleaseRevision,
                    }),
              }),
            );
            const privacy: ExperiencePrivacy = { forgotten: {}, corrections: {} };
            for (const table of ['mind_forgotten', 'mind_corrections'] as const) {
              const columns = Object.keys(RECORD_NODES.get(table)!.columns!);
              for (const row of source.records.tables[table] ?? []) {
                const actor = String(row.extra[columns.indexOf('actor_id')]);
                const id = String(row.extra[columns.indexOf('source_id')]);
                if (table === 'mind_forgotten') (privacy.forgotten[actor] ??= []).push(id);
                else
                  (privacy.corrections[actor] ??= {})[id] = String(
                    row.extra[columns.indexOf('correction_id')],
                  );
              }
            }
            opening.privacyOwner = retainNativeProduct(copyNativeProduct(host, privacy));
            opening.milestonesOwner = retainNativeProduct(
              copyNativeProduct(
                host,
                Object.fromEntries(
                  milestoneRows.map((row) => [
                    row.slot,
                    parseSourceJson<Record<string, boolean>>(row.payload),
                  ]),
                ),
              ),
            );
          } finally {
            metadata.release();
          }
          opening.actorsOwner = NativeActorRoster.capture(
            host,
            source.records.tables['sim_actors'] ?? [],
            source.records.tables['sim_exit_exposures'] ?? [],
            source.records.tables['sim_native_response_episodes'] ?? [],
          );
          opening.retentionOwner = NativeRetention.capture(
            host,
            source.records.worldId,
            selectedTemporalPolicy({ profile: header.profile }),
            source.records.tables['mind_temporal_actors'] ?? [],
          );
          opening.packet = retainNativeProduct(
            encodeNativeJson(
              host,
              {
                ...source,
                definitions,
                settings: nativeSetupSettings,
                storage: nativeStorageSettings,
                layouts: nativeRecordLayouts(),
                acceptedCut: 0,
              },
              { installationRoot: { flatStringFields: nativeSourceFlatStringFields } },
            ),
          );
          return opening;
        },
      );
    } catch (error) {
      opening.release();
      throw error;
    }
  }

  private owned<T>(value: T | undefined): T {
    if (!value) throw new Error('Native opening metadata was released or transferred.');
    return value;
  }
  get header(): OpeningHeader {
    return this.owned(this.headerOwner);
  }
  get operational(): OperationalSettings {
    return this.owned(this.operationalOwner);
  }
  get privacy(): ExperiencePrivacy {
    return this.owned(this.privacyOwner);
  }
  get milestones(): NativeMilestones {
    return this.owned(this.milestonesOwner);
  }
  get actors(): NativeActorRoster {
    return this.owned(this.actorsOwner);
  }
  get retention(): NativeRetention {
    return this.owned(this.retentionOwner);
  }

  async install(): Promise<NativeWorld> {
    const host = this.owned(this.host),
      packet = this.owned(this.packet);
    this.packet = undefined;
    try {
      return await host.installWorld(packet, DATABASE_SCHEMA);
    } finally {
      // Taking the packet out of the owner keeps release() during the borrow
      // from ending its reservation before the native constructor completes.
      releaseNativeProduct(packet);
    }
  }

  /** The service has adopted these exact independent owners. Header/packet
   * remain local preparation and are still ended by release(). */
  transfer(): void {
    this.operationalOwner = this.privacyOwner = this.milestonesOwner = undefined;
    this.actorsOwner = this.retentionOwner = undefined;
  }

  release(): void {
    const packet = this.packet,
      header = this.headerOwner,
      operational = this.operationalOwner,
      privacy = this.privacyOwner,
      milestones = this.milestonesOwner;
    this.packet =
      this.headerOwner =
      this.operationalOwner =
      this.privacyOwner =
      this.milestonesOwner =
        undefined;
    if (packet) releaseNativeProduct(packet);
    if (header) releaseNativeProduct(header);
    if (operational) releaseNativeProduct(operational);
    if (privacy) releaseNativeProduct(privacy);
    if (milestones) releaseNativeProduct(milestones);
    this.actorsOwner?.release();
    this.actorsOwner = undefined;
    this.retentionOwner?.release();
    this.retentionOwner = undefined;
    this.host = undefined;
    this.fixed?.release();
    this.fixed = undefined;
  }
}
