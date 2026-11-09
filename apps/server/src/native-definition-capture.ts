import type { NativeWorld } from '@open-legend/native-simulation';
import type {
  nativeSetupSettings,
  selectedNativeLawDefinitions,
} from '@open-legend/domain/native-install';
import {
  decodeNativeProduct,
  freezeNativeProduct,
  retainNativeSources,
} from './native-consumer.js';
import { NativeGeometryProviders } from './native-geometry.js';
import { nativePlayerViewDefinitions } from './native-view.js';
import type { NativeCurrentWorldInstallation } from './store.js';

export interface NativeInstalledDefinitions {
  readonly definitions: Parameters<typeof nativePlayerViewDefinitions>[2];
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
    readonly worldId: string,
    private product: NativeInstalledDefinitions | undefined,
  ) {}

  static async capture(world: NativeWorld): Promise<NativeDefinitionCapture> {
    const installation = decodeNativeProduct<NativeCurrentWorldInstallation>(
      await world.installation(),
    );
    const product = freezeNativeProduct(
      decodeNativeProduct<NativeInstalledDefinitions>(await world.definitions()),
    );
    return new NativeDefinitionCapture(installation.worldId, product);
  }

  get facts(): NativeInstalledDefinitions {
    if (!this.product) throw new Error('The native definition capture was released.');
    return this.product;
  }

  player(actorId: string) {
    const facts = this.facts;
    return retainNativeSources(
      nativePlayerViewDefinitions(this.worldId, actorId, facts.definitions),
      facts,
    );
  }

  geometry() {
    const facts = this.facts;
    return retainNativeSources(new NativeGeometryProviders(facts.geometry), facts);
  }

  release(): void {
    this.product = undefined;
  }
}
