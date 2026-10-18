import * as pc from 'playcanvas';

interface Group {
  source: pc.StandardMaterial;
  opacity: number;
  members: pc.MeshInstance[];
  batch?: Batch;
}

interface Batch {
  material: pc.StandardMaterial;
  instance: pc.MeshInstance;
  buffer?: pc.VertexBuffer;
  data: Float32Array;
  bounds?: pc.BoundingBox;
}

function changedValues(data: Float32Array, offset: number, values: ArrayLike<number>): boolean {
  for (let i = 0; i < values.length; i++)
    if (!Object.is(data[offset + i], Math.fround(values[i]!))) return true;
  return false;
}

function sameBounds(a: pc.BoundingBox, b: pc.BoundingBox): boolean {
  return (
    Object.is(a.center.x, b.center.x) &&
    Object.is(a.center.y, b.center.y) &&
    Object.is(a.center.z, b.center.z) &&
    Object.is(a.halfExtents.x, b.halfExtents.x) &&
    Object.is(a.halfExtents.y, b.halfExtents.y) &&
    Object.is(a.halfExtents.z, b.halfExtents.z)
  );
}

/** Share shadow submissions, not entity identity or cached illumination. Individual
 * cards still own visible artwork, picking and authorization. Membership and exact
 * transforms are refreshed after animation, before every shadow render.
 * docs/world-presentation.md#continuous-shadows
 */
export class SpriteShadowBatches {
  private readonly batches = new Map<string, Group>();
  private readonly bounds = new pc.BoundingBox();
  private readonly format: pc.VertexFormat;
  constructor(
    private device: pc.GraphicsDevice,
    private layer: pc.Layer,
  ) {
    this.format = new pc.VertexFormat(device, [
      ...[pc.SEMANTIC_ATTR11, pc.SEMANTIC_ATTR12, pc.SEMANTIC_ATTR14, pc.SEMANTIC_ATTR15].map(
        (semantic) => ({ semantic, components: 4, type: pc.TYPE_FLOAT32 }),
      ),
      { semantic: pc.SEMANTIC_ATTR13, components: 3, type: pc.TYPE_FLOAT32 },
      { semantic: pc.SEMANTIC_ATTR10, components: 2, type: pc.TYPE_FLOAT32 },
    ]);
  }

  sync(cards: Iterable<pc.Entity>): void {
    for (const batch of this.batches.values()) batch.members.length = 0;
    for (const card of cards) {
      if (!card.enabled) continue;
      for (const mesh of card.render?.meshInstances ?? []) {
        if (!mesh.castShadow || !mesh.visible || !(mesh.material instanceof pc.StandardMaterial))
          continue;
        const foot = (mesh.getParameter('ol_spriteFoot') as { data: number[] } | undefined)?.data;
        if (!foot) continue;
        const opacity =
          (mesh.getParameter('material_opacity') as { data: number } | undefined)?.data ??
          mesh.material.opacity;
        // Cells span one local light diameter: fewer submissions while retaining
        // spatial rejection for distant groups. Actual bounds still enclose only members.
        const cell = foot.map((value) => Math.floor(value / 16)).join(':');
        const key = `${mesh.mesh.id}:${mesh.material.id}:${mesh.mask}:${mesh.shadowCascadeMask}:${opacity}:${cell}`;
        let batch = this.batches.get(key);
        if (!batch) {
          batch = { source: mesh.material, opacity, members: [] };
          this.batches.set(key, batch);
        }
        batch.members.push(mesh);
      }
    }
    for (const [key, group] of this.batches) {
      const { members } = group;
      if (members.length < 2) {
        if (group.batch) this.release(group.batch);
        delete group.batch;
        // Restore the individual path, including a caster observed again after
        // revocation removed it from a previous batch.
        this.layer.addShadowCasters(members);
        if (!members.length) this.batches.delete(key);
        continue;
      }
      const batch = (group.batch ??= this.create(members[0]!, group.opacity));
      const { instance } = batch;
      let dataChanged = false;
      if (batch.data.length < members.length * 21) {
        batch.buffer?.destroy();
        batch.data = new Float32Array(2 ** Math.ceil(Math.log2(members.length)) * 21);
        batch.buffer = new pc.VertexBuffer(this.device, this.format, batch.data.length / 21, {
          usage: pc.BUFFER_DYNAMIC,
        });
        instance.setInstancing(batch.buffer, true);
        dataChanged = true;
      }
      for (let i = 0; i < members.length; i++) {
        const mesh = members[i]!;
        const matrix = mesh.node.getWorldTransform().data;
        const foot = (mesh.getParameter('ol_spriteFoot') as { data: number[] }).data;
        const size = (mesh.getParameter('ol_spriteSize') as { data: number[] }).data;
        // Compare actual packed values, including signed zero. A changed member
        // already requires publication, so later members keep the native copy path.
        dataChanged ||=
          changedValues(batch.data, i * 21, matrix) ||
          changedValues(batch.data, i * 21 + 16, foot) ||
          changedValues(batch.data, i * 21 + 19, size);
        batch.data.set(matrix, i * 21);
        batch.data.set(foot, i * 21 + 16);
        batch.data.set(size, i * 21 + 19);
        if (i === 0) this.bounds.copy(mesh.aabb);
        else this.bounds.add(mesh.aabb);
      }
      if (dataChanged) batch.buffer!.setData(batch.data);
      instance.instancingCount = members.length;
      if (!batch.bounds || !sameBounds(batch.bounds, this.bounds)) {
        instance.setCustomAabb(this.bounds);
        if (batch.bounds) batch.bounds.copy(this.bounds);
        else batch.bounds = this.bounds.clone();
      }
      // Components may re-add an individual caster between refreshes without a
      // final membership change. Preserve engine registration reconciliation.
      this.layer.removeShadowCasters(members);
      this.layer.addShadowCasters([instance]);
    }
  }

  private create(mesh: pc.MeshInstance, opacity: number): Batch {
    const material = (mesh.material as pc.StandardMaterial).clone();
    material.setDefine('OL_INSTANCED_SPRITE', true);
    for (const [name, semantic] of [
      ['instance_line1', pc.SEMANTIC_ATTR11],
      ['instance_line2', pc.SEMANTIC_ATTR12],
      ['instance_line3', pc.SEMANTIC_ATTR14],
      ['instance_line4', pc.SEMANTIC_ATTR15],
      ['ol_instanceFoot', pc.SEMANTIC_ATTR13],
      ['ol_instanceSize', pc.SEMANTIC_ATTR10],
    ] as const)
      material.setAttribute(name, semantic);
    material.shaderChunks.glsl.set(
      'litUserDeclarationVS',
      `${material.shaderChunks.glsl.get('litUserDeclarationVS')}
       attribute vec3 ol_instanceFoot;
       attribute vec2 ol_instanceSize;`,
    );
    material.shaderChunks.glsl.set(
      'litUserMainStartVS',
      'ol_spriteFoot = ol_instanceFoot; ol_spriteSize = ol_instanceSize;',
    );
    material.update();
    const instance = new pc.MeshInstance(mesh.mesh, material, new pc.GraphNode('Sprite shadows'));
    instance.castShadow = true;
    instance.mask = mesh.mask;
    instance.shadowCascadeMask = mesh.shadowCascadeMask;
    instance.setParameter('material_opacity', opacity);
    return { material, instance, data: new Float32Array(0) };
  }

  releaseMaterial(source: pc.StandardMaterial): void {
    for (const [key, batch] of this.batches)
      if (batch.source === source) {
        if (batch.batch) this.release(batch.batch);
        this.batches.delete(key);
      }
  }

  private release(batch: Batch): void {
    this.layer.removeShadowCasters([batch.instance]);
    batch.instance.destroy();
    batch.buffer?.destroy();
    batch.material.destroy();
  }

  destroy(): void {
    for (const group of this.batches.values()) if (group.batch) this.release(group.batch);
    this.batches.clear();
  }
}
