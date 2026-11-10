import * as pc from 'playcanvas';
import {
  assetRevisionKey,
  type ArtifactReference,
  type AssetRevisionReference,
} from '@open-legend/assets';
import type {
  AppearanceFamilyDefinition,
  AppearanceRecipe,
  AppearanceView,
} from '@open-legend/protocol';
import { intersectBox } from '@open-legend/spatial';
import { readAssetJson } from '../asset-files';
import type { ArtMaterials, ArtTreatment } from '../art-treatment';
import type { WorldPresentation, RevealBinding } from '../world-presentation';
import type { MotionCue } from '../world-motion';
import { CharacterMotion } from './character-motion';
import type { Stride } from './gait';
import {
  admitPersonFamily,
  evaluatePerson,
  PersonFitError,
  requiredPersonValue,
  type CompiledPersonFamily,
  type EvaluatedPerson,
  type EvaluatedPersonMesh,
  type PersonPoint,
} from './person-family';
import { PersonMaterials, PersonTextures } from './person-materials';
import {
  fitPersonMotion,
  personMotionInputKey,
  personSupportOffset,
  type FittedPersonMotion,
} from './person-motion';
import { personAnimationTracks } from './person-animation';
import { PersonContact } from './person-contact';

export interface PersonAppearance {
  recipe: AppearanceRecipe;
  compiled: ArtifactReference;
  compiledPath: string;
  parts: readonly string[];
  definition?: AppearanceFamilyDefinition;
}

export function projectedPersonAppearance(view: AppearanceView): PersonAppearance {
  return {
    recipe: view.recipe,
    compiled: view.compiled,
    compiledPath: view.compiledPath,
    parts: view.outfit.map((item) => item.partId),
  };
}

/** Projection revisions change only on committed appearance/equipment edits;
 * ordinary movement snapshots retain this wearer's existing evaluated resources. */
export function sameProjectedPersonAppearance(
  a: AppearanceView | undefined,
  b: AppearanceView,
): boolean {
  return (
    !!a &&
    a.revision === b.revision &&
    a.outfit.length === b.outfit.length &&
    a.outfit.every((item, index) => {
      const other = b.outfit[index];
      return (
        !!other &&
        item.itemId === other.itemId &&
        item.revision === other.revision &&
        item.partId === other.partId
      );
    })
  );
}

export interface PersonActorEnvironment {
  app: pc.Application;
  camera: pc.Entity;
  presentation?: WorldPresentation;
  sun?: pc.Light;
  art?: ArtMaterials;
  changed?(): void;
  preview?: boolean;
}

/** One scene's finite admitted families and immutable maps. Preview and play use
 * this same resource owner and wearer implementation, not another GLB viewer. */
export class PersonActors {
  private readonly sources = new Map<string, Promise<CompiledPersonFamily>>();
  private readonly downloads = new Set<AbortController>();
  private readonly actors = new Set<PersonActor>();
  readonly textures: PersonTextures;
  private disposed = false;

  constructor(private readonly environment: PersonActorEnvironment) {
    this.textures = new PersonTextures(environment.app.graphicsDevice);
  }

  private family(
    reference: AssetRevisionReference,
    path: string,
    compiled: ArtifactReference,
    definition?: AppearanceFamilyDefinition,
  ): Promise<CompiledPersonFamily> {
    const key = JSON.stringify([
      assetRevisionKey(reference),
      reference.manifestSha256,
      path,
      compiled.sha256,
    ]);
    const existing = this.sources.get(key);
    if (existing) return existing;
    if (this.disposed) return Promise.reject(new Error('Appearance owner was destroyed.'));
    const download = new AbortController();
    this.downloads.add(download);
    const ready = readAssetJson<unknown>(path, download.signal, compiled)
      .then((value) => {
        if (this.disposed) throw new Error('Appearance owner was destroyed.');
        return admitPersonFamily(value, reference, definition);
      })
      .catch((error: unknown) => {
        this.sources.delete(key);
        throw error;
      })
      .finally(() => this.downloads.delete(download));
    this.sources.set(key, ready);
    return ready;
  }

  create(parent: pc.Entity, appearance: PersonAppearance): PersonActor {
    const actor = new PersonActor(
      parent,
      appearance,
      this.family(
        appearance.recipe.family,
        appearance.compiledPath,
        appearance.compiled,
        appearance.definition,
      ),
      this.environment,
      this.textures,
      () => this.actors.delete(actor),
    );
    this.actors.add(actor);
    return actor;
  }

  diagnostics() {
    return {
      families: this.sources.size,
      wearers: this.actors.size,
      ...this.textures.diagnostics(),
    };
  }

  destroy(): void {
    this.disposed = true;
    for (const actor of [...this.actors]) actor.destroy();
    for (const download of this.downloads) download.abort();
    this.downloads.clear();
    this.sources.clear();
    this.textures.destroy();
  }
}

interface DrawMesh {
  mesh: pc.Mesh;
  instance: pc.MeshInstance;
  source: EvaluatedPersonMesh;
}

interface PreparedPersonMotion {
  readonly rest: Float32Array;
  readonly inputKey: string;
  readonly clips: FittedPersonMotion[];
  readonly tracks: pc.AnimTrack[];
}

const materialIds = (person: EvaluatedPerson): string[] => [
  ...new Set([...person.meshes.values()].map((mesh) => mesh.materialId)),
];

function appearanceFailure(reason: unknown): string {
  if (reason instanceof PersonFitError) {
    if (reason.kind === 'unsupported-shape')
      return 'These proportions cannot be previewed together. Adjust the proportions before saving.';
    if (reason.kind === 'part-fit')
      return 'This outfit does not fit the selected proportions. Choose another item or adjust the proportions.';
    if (reason.kind === 'motion-fit') return 'This movement is unavailable for these proportions.';
    return 'Some artwork needed for this appearance is unavailable.';
  }
  return 'Appearance could not be prepared. Check access to its artwork.';
}

/** A modular wearer owns evaluated geometry, rig, binds, uniforms and pose.
 * Its immutable compiler inputs and texture leases may be shared with neighbours.
 * docs/projects/people-from-parts-tech-design.md#live-preview-and-resource-ownership */
export class PersonActor {
  readonly ready: Promise<boolean>;
  state: 'loading' | 'ready' | 'failed' = 'loading';
  error?: string;
  visible = false;
  preparing = false;
  private requestedVisible = false;
  private readonly node: pc.Entity;
  private readonly meshes = new Map<string, DrawMesh>();
  private meshInstances: pc.MeshInstance[] = [];
  private readonly joints: pc.Entity[] = [];
  private readonly worldLayer: pc.Layer;
  private readonly camera: pc.CameraComponent;
  private family?: CompiledPersonFamily;
  private evaluated?: EvaluatedPerson;
  private skin?: pc.Skin;
  private skinInstance?: pc.SkinInstance;
  private materials?: PersonMaterials;
  private binding?: RevealBinding;
  private motion?: CharacterMotion;
  private contact?: PersonContact;
  private fittedRest?: Float32Array;
  private fittedInputKey?: string;
  private fittedMotion: FittedPersonMotion[] = [];
  private tracks: pc.AnimTrack[] = [];
  private previewClip?: string;
  private previewMotionError = false;
  private yaw?: number;
  private selected = false;
  private disposed = false;
  private generation = 0;
  private widthMetres = 0;
  private appearance: PersonAppearance;
  private renderedParts: readonly string[] = [];

  constructor(
    private readonly parent: pc.Entity,
    appearance: PersonAppearance,
    loading: Promise<CompiledPersonFamily>,
    private readonly environment: PersonActorEnvironment,
    textures: PersonTextures,
    private readonly release: () => void,
  ) {
    this.appearance = appearance;
    const camera = environment.camera.camera;
    if (!camera) throw new Error('Appearance camera is unavailable.');
    this.camera = camera;
    this.node = new pc.Entity('Person', environment.app);
    parent.addChild(this.node);
    const world = environment.app.scene.layers.getLayerById(pc.LAYERID_WORLD);
    if (!world) throw new Error('Appearance world layer is unavailable.');
    this.worldLayer = world;
    this.ready = loading
      .then(async (family) => {
        if (this.disposed) return false;
        this.family = family;
        this.materials = new PersonMaterials(
          family,
          textures,
          environment.app.graphicsDevice,
          (materials) => this.clearPresentation(materials),
          environment.sun,
          environment.art,
        );
        for (const joint of family.rig.joints) {
          const node = new pc.Entity(joint.id, environment.app);
          (joint.parent < 0
            ? this.node
            : requiredPersonValue(this.joints[joint.parent], 'parent joint')
          ).addChild(node);
          this.joints.push(node);
        }
        this.skin = new pc.Skin(
          environment.app.graphicsDevice,
          family.rig.joints.map(() => new pc.Mat4()),
          family.rig.joints.map((joint) => joint.id),
        );
        this.skinInstance = new pc.SkinInstance(this.skin);
        this.skinInstance.bones = this.joints;
        this.skinInstance.rootBone = this.node;
        return this.setAppearance(this.appearance);
      })
      .catch((reason: unknown) => {
        if (this.disposed) return false;
        this.error = appearanceFailure(reason);
        this.state = 'failed';
        this.preparing = false;
        this.setVisible(false);
        environment.changed?.();
        return false;
      });
  }

  get height(): number {
    return this.evaluated?.statureMetres ?? 0;
  }
  get width(): number {
    return this.widthMetres;
  }
  get supportOffset(): number {
    return this.node.getLocalPosition().y;
  }
  get presentationReady(): boolean {
    return this.state === 'ready';
  }
  get animatesStrikes(): boolean {
    return this.motion?.animatesStrikes ?? false;
  }
  get availableMotions(): readonly string[] {
    return this.family?.motion?.clips.map((clip) => clip.name) ?? [];
  }
  get availableStrides(): readonly Stride[] {
    return this.fittedMotion
      .flatMap((clip) =>
        clip.groundSpeed === undefined ||
        !this.family?.motion?.clips.some((source) => source.name === clip.name && source.stride)
          ? []
          : [{ name: clip.name, groundSpeed: clip.groundSpeed, seconds: clip.duration }],
      )
      .sort((a, b) => a.groundSpeed - b.groundSpeed);
  }
  get source(): CompiledPersonFamily | undefined {
    return this.family;
  }
  get evaluation(): EvaluatedPerson | undefined {
    return this.evaluated;
  }
  get displayedParts(): readonly string[] {
    return this.renderedParts;
  }
  get outlineMeshes(): readonly pc.MeshInstance[] {
    return this.meshInstances;
  }

  private clearPresentation(materials: readonly pc.StandardMaterial[] = []): void {
    if (this.binding) this.environment.presentation?.removeReveal(this.binding);
    this.binding = undefined;
    for (const material of materials) this.environment.presentation?.releaseMaterial(material);
  }

  private refreshPresentation(): void {
    if (this.binding || !this.environment.presentation) return;
    const meshes = this.outlineMeshes;
    const first = meshes[0]?.material;
    if (first instanceof pc.StandardMaterial)
      this.binding = this.environment.presentation.addReveal(this.node, first, false, true, meshes);
  }

  private rest(evaluated: EvaluatedPerson): void {
    const family = this.family;
    if (!family || !this.skin) return;
    const worlds: pc.Mat4[] = [];
    for (let i = 0; i < family.rig.joints.length; i++) {
      const definition = requiredPersonValue(family.rig.joints[i], 'rig joint');
      const world = new pc.Mat4().set(
        Array.from(evaluated.restMatrices.subarray(i * 16, i * 16 + 16)),
      );
      const local =
        definition.parent < 0
          ? world
          : new pc.Mat4().mul2(
              requiredPersonValue(worlds[definition.parent], 'parent rest').clone().invert(),
              world,
            );
      const joint = requiredPersonValue(this.joints[i], 'joint');
      joint.setLocalPosition(local.getTranslation());
      joint.setLocalRotation(new pc.Quat().setFromMat4(local));
      joint.setLocalScale(local.getScale());
      requiredPersonValue(this.skin.inverseBindPose[i], 'inverse bind').set(
        Array.from(evaluated.inverseBindMatrices.subarray(i * 16, i * 16 + 16)),
      );
      worlds.push(world);
    }
    this.motion = undefined;
    this.contact?.reset();
    if (this.node.anim) this.node.removeComponent('anim');
  }

  private removeMesh(entry: DrawMesh): void {
    this.worldLayer.removeMeshInstances([entry.instance]);
    // All parts borrow this wearer's one palette; the actor releases it once.
    entry.instance.skinInstance = null;
    entry.instance.destroy();
  }

  private draw(evaluated: EvaluatedPerson): void {
    if (!this.materials || !this.skin || !this.skinInstance) return;
    const membershipChanged =
      this.meshes.size !== evaluated.meshes.size ||
      [...evaluated.meshes].some(([id, source]) => {
        const previous = this.meshes.get(id);
        return !previous || previous.source.materialId !== source.materialId;
      });
    if (membershipChanged) this.clearPresentation();
    for (const [id, existing] of this.meshes) {
      if (evaluated.meshes.has(id)) continue;
      this.removeMesh(existing);
      this.meshes.delete(id);
    }
    let width = 0;
    for (const [id, source] of evaluated.meshes) {
      let existing = this.meshes.get(id);
      if (!existing) {
        const mesh = new pc.Mesh(this.environment.app.graphicsDevice);
        mesh.clear(true, true);
        mesh.skin = this.skin;
        // The pinned renderer captures UV/tangent shader flags at construction.
        // Supply the vertex format before creating its draw instance.
        this.upload(mesh, source);
        const instance = new pc.MeshInstance(
          mesh,
          this.materials.material(source.materialId),
          this.node,
        );
        instance.skinInstance = source.jointWeights ? this.skinInstance : null;
        instance.visible = false;
        // PlayCanvas registers shadow-caster membership only when the mesh is added.
        // Visibility admission below controls whether that registered caster draws.
        instance.castShadow = true;
        existing = { mesh, instance, source };
        this.meshes.set(id, existing);
        this.worldLayer.addMeshInstances([instance]);
        instance.castShadow = false;
      } else if (existing.source !== source) {
        this.upload(existing.mesh, source, existing.source);
        existing.instance.material = this.materials.material(source.materialId);
        existing.source = source;
      }
      width = Math.max(
        width,
        existing.mesh.aabb.halfExtents.x * 2,
        existing.mesh.aabb.halfExtents.z * 2,
      );
    }
    this.widthMetres = width;
    // Lift the complete visual assembly once; rest/binds and bare stature stay
    // anatomical. The same offset is used by setup-time sole fitting and export.
    this.node.setLocalPosition(0, personSupportOffset(evaluated), 0);
    if (membershipChanged)
      this.meshInstances = [...this.meshes.values()].map((mesh) => mesh.instance);
    if (this.evaluated?.restMatrices !== evaluated.restMatrices) this.rest(evaluated);
    this.evaluated = evaluated;
    this.refreshPresentation();
    this.setVisible(this.requestedVisible);
  }

  private upload(mesh: pc.Mesh, source: EvaluatedPersonMesh, previous?: EvaluatedPersonMesh): void {
    if (!previous || previous.positions !== source.positions) mesh.setPositions(source.positions);
    if (!previous || previous.normals !== source.normals) mesh.setNormals(source.normals);
    if (!previous || previous.triangles !== source.triangles) mesh.setIndices(source.triangles);
    if (!previous && source.uvs) mesh.setUvs(0, Float32Array.from(source.uvs));
    if (!previous && source.jointIndices)
      mesh.setVertexStream(
        pc.SEMANTIC_BLENDINDICES,
        Uint16Array.from(source.jointIndices),
        4,
        undefined,
        pc.TYPE_UINT16,
      );
    if (!previous && source.jointWeights)
      mesh.setVertexStream(pc.SEMANTIC_BLENDWEIGHT, Float32Array.from(source.jointWeights), 4);
    mesh.update(pc.PRIMITIVE_TRIANGLES, true);
    // Position changes invalidate the pinned engine's cached per-bone bounds.
    mesh.boneAabb = null;
  }

  /** A committed removal cannot wait for replacement maps. Keep the last valid
   * body and coverage, suppress obsolete hair/items, and derive fresh masks. */
  private retainParts(appearance: PersonAppearance): void {
    const previous = this.evaluated,
      family = this.family;
    if (!previous || !family || !this.materials) return;
    const requested = new Set(appearance.parts);
    for (const [role, choices] of Object.entries(family.selectionParts))
      for (const id of requiredPersonValue(
        choices[requiredPersonValue(appearance.recipe.selections[role], role)],
        role,
      ))
        requested.add(id);
    const coverageRole = family.coverageSelectionRole;
    const coverage = coverageRole
      ? new Set(
          family.selectionParts[coverageRole]?.[previous.recipe.selections[coverageRole] ?? ''] ??
            [],
        )
      : new Set<string>();
    const available = previous.selectedParts.filter((id) => requested.has(id) || coverage.has(id));
    if (available.length === previous.selectedParts.length) return;
    const retained = this.renderedParts.filter((id) => appearance.parts.includes(id));
    const interim = evaluatePerson(family, previous.recipe, {
      parts: retained,
      previous,
      availableParts: available,
    });
    const motion = this.prepareMotion(interim);
    this.draw(interim);
    this.installPreparedMotion(interim, motion);
    this.renderedParts = retained.filter((id) => interim.selectedParts.includes(id));
    this.materials.retain(materialIds(interim));
    this.refreshPresentation();
    this.environment.changed?.();
  }

  private commitAppearance(
    evaluated: EvaluatedPerson,
    appearance: PersonAppearance,
    generation: number,
    deferMotion: boolean,
  ) {
    // The callback is prepared before materials can change their maps/uniforms.
    // A rejected fit leaves the last drawable, rig and graph intact.
    const motion = deferMotion ? undefined : this.prepareMotion(evaluated);
    return {
      current: () => !this.disposed && generation === this.generation,
      install: () => {
        this.draw(evaluated);
        this.renderedParts = [...appearance.parts];
        this.installPreparedMotion(evaluated, motion);
        this.materials?.retain(materialIds(evaluated));
        this.state = 'ready';
        this.preparing = false;
        this.refreshPresentation();
        this.setVisible(this.requestedVisible);
        this.environment.changed?.();
      },
    };
  }

  private preparationFailed(reason: unknown, generation: number): false {
    if (this.disposed || generation !== this.generation) return false;
    this.materials?.cancelPreparation();
    try {
      this.retainParts(this.appearance);
    } catch {
      this.setVisible(false);
    }
    this.error = appearanceFailure(reason);
    this.previewMotionError = false;
    if (this.state === 'loading') this.state = 'failed';
    this.preparing = false;
    this.environment.changed?.();
    return false;
  }

  setAppearance(
    appearance: PersonAppearance,
    changedControls?: readonly string[],
    deferMotion = false,
  ): Promise<boolean> {
    this.appearance = appearance;
    if (!this.family || !this.materials || this.disposed) return Promise.resolve(false);
    const generation = ++this.generation;
    this.preparing = true;
    this.error = undefined;
    this.previewMotionError = false;
    this.environment.changed?.();
    try {
      const previous = this.evaluated;
      const evaluated = evaluatePerson(this.family, appearance.recipe, {
        parts: appearance.parts,
        previous,
        changedControls,
      });
      this.retainParts(appearance);
      // Surface-only edits can keep the same rest matrices. A private gesture
      // still uses the upright fitting pose rather than a paused stride frame.
      if (this.environment.preview && deferMotion && this.node.anim && this.evaluated)
        this.rest(this.evaluated);
      // Only the material request's latest commit callback retains staged mesh
      // buffers. Older pointer updates retain a small outcome/generation closure,
      // not a suspended async frame containing their full evaluated person.
      return this.materials
        .prepare(
          appearance.recipe,
          materialIds(evaluated),
          this.commitAppearance(evaluated, appearance, generation, deferMotion),
        )
        .then(
          (ready) => !this.disposed && generation === this.generation && ready,
          (reason: unknown) => this.preparationFailed(reason, generation),
        );
    } catch (reason) {
      return Promise.resolve(this.preparationFailed(reason, generation));
    }
  }

  private prepareMotion(
    evaluated: EvaluatedPerson,
    previewClip = this.previewClip,
  ): PreparedPersonMotion | undefined {
    const family = this.family;
    if (!family?.motion) return;
    if (this.environment.preview && previewClip === undefined) return;
    const inputKey = personMotionInputKey(evaluated);
    if (
      this.fittedRest === evaluated.restMatrices &&
      this.fittedInputKey === inputKey &&
      (!this.environment.preview || this.fittedMotion.some((clip) => clip.name === previewClip))
    )
      return;
    const clips = fitPersonMotion(
      evaluated,
      family.motion,
      this.environment.preview ? [requiredPersonValue(previewClip, 'preview clip')] : undefined,
    );
    return {
      rest: evaluated.restMatrices,
      inputKey,
      clips,
      tracks: personAnimationTracks(family, clips),
    };
  }

  private installPreparedMotion(
    evaluated: EvaluatedPerson,
    prepared: PreparedPersonMotion | undefined,
  ): void {
    if (!prepared) return;
    // A same-rest sole or attachment edit also replaces the preview's keys.
    // Clear its graph only after fitting and material preparation have succeeded.
    if (this.environment.preview && this.node.anim) this.rest(evaluated);
    this.fittedMotion = prepared.clips;
    this.tracks = prepared.tracks;
    this.fittedRest = prepared.rest;
    this.fittedInputKey = prepared.inputKey;
    this.contact?.destroy();
    this.contact = evaluated.source.motion?.legs.length ? new PersonContact(evaluated) : undefined;
    if (!this.environment.preview) {
      const strides = this.availableStrides;
      if (strides.length && this.tracks.some((track) => track.name === 'Idle'))
        this.installMotion(this.tracks, strides);
    }
  }

  private clearPreviewMotionError(): void {
    if (!this.previewMotionError) return;
    this.error = undefined;
    this.previewMotionError = false;
    this.environment.changed?.();
  }

  setPreviewMotion(name: string | undefined): void {
    if (!this.evaluated || this.disposed || !this.environment.preview) return;
    if (this.previewClip === name && (name === undefined || this.node.anim)) {
      this.clearPreviewMotionError();
      return;
    }
    if (name === undefined) {
      this.previewClip = name;
      this.rest(this.evaluated);
      this.clearPreviewMotionError();
      return;
    }
    let prepared: PreparedPersonMotion | undefined;
    try {
      prepared = this.prepareMotion(this.evaluated, name);
    } catch (error) {
      this.error = appearanceFailure(error);
      this.previewMotionError = true;
      this.environment.changed?.();
      return;
    }
    this.previewClip = name;
    this.rest(this.evaluated);
    this.installPreparedMotion(this.evaluated, prepared);
    const track = this.tracks.find((candidate) => candidate.name === name);
    const clip = this.fittedMotion.find((candidate) => candidate.name === name);
    if (!track || !clip) return;
    this.node.addComponent('anim', { activate: true });
    const anim = this.node.anim;
    if (!anim) throw new Error('Appearance animation could not be prepared.');
    anim.loadStateGraph({
      layers: [
        {
          name: 'Body',
          states: [{ name: 'START' }, { name: 'Preview', loop: clip.loop }],
          transitions: [{ from: 'START', to: 'Preview' }],
        },
      ],
      parameters: {},
    });
    anim.assignAnimation('Preview', track, undefined, 1, clip.loop);
    anim.playing = false;
    anim.baseLayer?.play('Preview');
    anim.update(0);
    this.contact?.update(anim, this.joints);
    // A valid clip resolves its own selection failure. An appearance failure
    // still belongs to that requested recipe and must not become saveable here.
    this.clearPreviewMotionError();
  }

  advancePreview(dt: number): boolean {
    if (!this.previewClip || !this.node.anim || this.preparing || !this.visible) return false;
    this.node.anim.update(Math.min(0.1, dt));
    this.contact?.update(this.node.anim, this.joints);
    return true;
  }

  installMotion(tracks: readonly pc.AnimTrack[], strides: readonly Stride[]): void {
    if (this.disposed) return;
    if (this.motion?.replaceTracks(tracks, strides)) {
      if (this.node.anim) this.contact?.update(this.node.anim, this.joints);
      return;
    }
    if (this.node.anim) this.node.removeComponent('anim');
    this.node.addComponent('anim', { activate: true });
    const anim = this.node.anim;
    if (!anim) throw new Error('Appearance animation could not be prepared.');
    this.motion = new CharacterMotion(anim, tracks, { strides });
    this.contact?.update(anim, this.joints);
  }

  setVisible(visible: boolean): void {
    this.requestedVisible = visible;
    this.visible = visible && this.state === 'ready' && !this.disposed;
    for (const { instance } of this.meshes.values())
      instance.visible = instance.castShadow = this.visible;
    if (!this.visible) this.updateReveal(0, 0, false);
  }

  private updateReveal(strength: number, dt: number, readThrough: boolean): void {
    const first = this.meshes.values().next().value?.instance.material;
    if (this.binding && first instanceof pc.StandardMaterial)
      this.environment.presentation?.updateReveal(
        this.binding,
        first,
        this.parent.getPosition(),
        this.width,
        this.height,
        strength,
        dt,
        this.visible,
        this.selected,
        readThrough,
      );
  }

  update(
    cue: Readonly<Pick<MotionCue, 'heading' | 'action'>>,
    dt: number,
    speed: number,
    paused: boolean,
    reveal: number,
    selected: boolean,
    art: Readonly<ArtTreatment>,
  ): void {
    if (!this.visible) return;
    this.selected = selected;
    const step = Math.min(dt, 0.1);
    const strike = this.motion && cue.action?.direction;
    const target =
      (strike && (strike.x || strike.z) ? Math.atan2(strike.x, strike.z) : cue.heading) *
      pc.math.RAD_TO_DEG;
    this.yaw =
      this.yaw === undefined
        ? target
        : pc.math.lerpAngle(this.yaw, target, 1 - Math.exp(-step * 12));
    this.node.setLocalEulerAngles(0, this.yaw, 0);
    this.motion?.update(dt, speed, paused, art.actionFixture, cue.action);
    if (this.node.anim) this.contact?.update(this.node.anim, this.joints);
    this.updateReveal(reveal, step, false);
  }

  setReadThrough(strength: number): void {
    this.updateReveal(strength, 0, true);
  }
  get revealStrength(): number {
    return this.visible ? (this.binding?.strength ?? 0) : 0;
  }
  screenPoint(point: pc.Vec3): pc.Vec3 {
    return this.camera.worldToScreen(point);
  }
  landmarkPoint(id: string): PersonPoint | undefined {
    return this.evaluated?.landmarks[id];
  }

  hit(from: pc.Vec3, to: pc.Vec3): { fraction: number; point: pc.Vec3 } | null {
    let fraction: number | null = null;
    for (const { instance } of this.meshes.values()) {
      const hit = intersectBox(from, to, {
        min: instance.aabb.getMin(),
        max: instance.aabb.getMax(),
      });
      if (hit !== null && (fraction === null || hit < fraction)) fraction = hit;
    }
    return fraction === null ? null : { fraction, point: new pc.Vec3().lerp(from, to, fraction) };
  }

  motionDiagnostics() {
    return { visible: this.visible, motion: this.motion?.diagnostics() };
  }

  diagnostics() {
    return {
      state: this.state,
      visible: this.visible,
      preparing: this.preparing,
      representation: 'modular-person',
      height: this.height,
      width: this.width,
      meshes: this.meshes.size,
      geometryBytes: [...this.meshes.values()].reduce(
        (sum, { source }) =>
          sum +
          source.positions.byteLength +
          source.normals.byteLength +
          source.triangles.byteLength,
        0,
      ),
      motion: this.motion?.diagnostics(),
      contact: this.contact?.diagnostics(),
    };
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.generation++;
    this.clearPresentation();
    for (const mesh of this.meshes.values()) this.removeMesh(mesh);
    this.meshes.clear();
    this.meshInstances = [];
    this.materials?.destroy();
    this.skinInstance?.destroy();
    this.contact?.destroy();
    this.node.destroy();
    this.joints.length = 0;
    this.motion = undefined;
    this.contact = undefined;
    this.evaluated = undefined;
    this.visible = false;
    this.release();
  }
}
