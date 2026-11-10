import type { NativeWorld } from '@open-legend/native-simulation';
import type {
  nativeSetupSettings,
  selectedNativeLawDefinitions,
} from '@open-legend/domain/native-install';
import {
  activityRequestDescriptors,
  installedActionMeanings,
  type WorldState,
} from '@open-legend/domain';
import {
  decodeNativeProduct,
  copyNativeProduct,
  freezeNativeProduct,
  releaseNativeProduct,
  retainNativeProduct,
  retainNativeSources,
} from './native-consumer.js';
import { NativeGeometryProviders } from './native-geometry.js';
import { nativePlayerViewDefinitions } from './native-view.js';
import type { NativeCurrentWorldInstallation } from './store.js';

export interface NativeInstalledDefinitions {
  readonly definitions: Parameters<typeof nativePlayerViewDefinitions>[2] &
    Pick<WorldState, 'hearthDefinitions'>;
  readonly geometry: ConstructorParameters<typeof NativeGeometryProviders>[0];
  readonly nativePolicies: Omit<
    ReturnType<typeof selectedNativeLawDefinitions>,
    'socialDefaults'
  > & {
    readonly work: typeof nativeSetupSettings.work;
  };
  readonly settings: Pick<
    typeof nativeSetupSettings,
    | 'actorResponse'
    | 'spatial'
    | 'movement'
    | 'personalEvidencePreparation'
    | 'mind'
    | 'agency'
    | 'maximumChangeScopes'
    | 'encounterBatchEntries'
    | 'timeEpsilon'
  >;
}

/** Setup for one opaque native world handle. The installation and definitions
 * come from that handle; neither operation reads live actors or saved history. */
export class NativeDefinitionCapture {
  private constructor(
    private identity: { readonly worldId: string } | undefined,
    private product: NativeInstalledDefinitions | undefined,
    private capacity: Pick<NativeWorld, 'reserveConsumerBytes'> | undefined,
  ) {}

  static async capture(world: NativeWorld): Promise<NativeDefinitionCapture> {
    const installation = decodeNativeProduct<NativeCurrentWorldInstallation>(
      await world.installation(),
    );
    let product: NativeInstalledDefinitions | undefined;
    let identity: { readonly worldId: string } | undefined;
    try {
      product = retainNativeProduct(
        freezeNativeProduct(
          decodeNativeProduct<NativeInstalledDefinitions>(await world.definitions()),
        ),
      );
      identity = retainNativeProduct(copyNativeProduct(world, { worldId: installation.worldId }));
      return new NativeDefinitionCapture(identity, product, world);
    } catch (error) {
      if (product) releaseNativeProduct(product);
      if (identity) releaseNativeProduct(identity);
      throw error;
    } finally {
      releaseNativeProduct(installation);
    }
  }

  get worldId(): string {
    if (!this.identity) throw new Error('The native definition capture was released.');
    return this.identity.worldId;
  }

  get facts(): NativeInstalledDefinitions {
    if (!this.product) throw new Error('The native definition capture was released.');
    return this.product;
  }

  player(actorId: string) {
    const facts = this.facts;
    const view = nativePlayerViewDefinitions(
      this.worldId,
      actorId,
      facts.definitions,
      this.capacity!,
    );
    try {
      return retainNativeSources(view, facts, this.identity!);
    } catch (error) {
      releaseNativeProduct(view);
      throw error;
    }
  }

  geometry() {
    const facts = this.facts;
    return retainNativeSources(new NativeGeometryProviders(facts.geometry, this.capacity!), facts);
  }

  /** These are the selected world's authored request and slot meanings. They
   * describe a model request; the native choice owner still admits execution. */
  actionRequirements() {
    const facts = this.facts;
    return retainNativeSources(
      installedActionMeanings(facts.definitions).map(([command, meaning]) => ({
        command,
        ...(meaning.toolFields ? { toolFields: meaning.toolFields } : {}),
        ...(meaning.unitPerCommand !== undefined ? { unitPerCommand: meaning.unitPerCommand } : {}),
      })),
      facts,
    );
  }

  requestDescriptors() {
    const facts = this.facts;
    return retainNativeSources(activityRequestDescriptors(facts.definitions), facts);
  }

  release(): void {
    if (this.product) releaseNativeProduct(this.product);
    if (this.identity) releaseNativeProduct(this.identity);
    this.product = undefined;
    this.identity = undefined;
    this.capacity = undefined;
  }
}
