"""Prepare a private MetaHuman study through the existing people compiler.

Run Blender with --background --factory-startup --disable-autoexec --offline-mode
--python-exit-code 1 --python scripts/art/metahuman-study.py -- COMMAND ...:

  prepare --samples /external/samples.json --out /external/fresh-prepared
  compile --master /external/prepared/family.blend
          --descriptor /external/prepared/descriptor.json
          --reference /external/exact-descriptor-reference.json
          --out /external/fresh-compiled

--help works in ordinary Python without importing Blender or NumPy. This tool
never launches Unreal, requests a rig/provider, publishes or installs a family.
All outputs are experimental until native/compiled/browser qualification passes.
Contracts: docs/projects/metahuman-foundation-poc-tech-design.md §§5,6,10;
docs/projects/people-from-parts-authoring-contract.md; scripts/art/people.py;
apps/client/src/characters/person-family.ts. Those owners define runtime data.

The conversion manifest is JSON, with absolute, pinned source file records
{file, bytes, sha256}; paths never imply permission or quality approval:

  descriptor: record of the existing authored {family, objects} descriptor
  profile: record of its existing appearance-family profile
  source_sha256: one saved UNRIGGED neutral shared by all native result receipts
  neutral: sample ID
  samples: {ID: {result: record, sample: native_result_sample_id,
                 role: neutral|endpoint|oracle,
                 recipe: {controls: {...}, selections: {...}}}}
  lods: {head: 2, body: 1}  # explicit selection, never a fallback
  normalization: sixteen column-major values transforming imported Blender-world
                 metres to canonical Blender-world metres; identity is explicit
  meshes: {descriptor_mesh_id: {kind: head|body, material_slots: [0],
                               uv_transform: [scaleU,scaleV,offsetU,offsetV]}}
  omitted_material_slots: {head: [...], body: [...]}
  joints: {family_joint_id: {kind: body|head, bone: source_bone_name,
                            aliases: [{kind: head, bone: source_bone_name}]}}
  landmarks: {structural_landmark_id:
      {point: {kind: body|head, bone: source_bone_name, offset: [x,y,z]}
              OR {position: [x,y,z]},
       frame: sample_ID_or_null, targets: {existing_target_name: ID_or_null}}}
  textures: existing package texture table, with each entry's file replaced by
            a pinned absolute source record; references remain unchanged
  prepared_master: optional pinned .blend containing only the remaining declared
                   part/helper objects to import, already frozen and unparented in normalized
                   Blender-world metres and weighted to retained joint IDs

Native results must be current metahuman-study-export.py result.json files.
Each sample restarts from their shared pinned source. A recipe uses the existing
recipe fields; compile supplies its exact family reference. No alternate recipe
or appearance definition is interpreted here. The descriptor remains the owner
of controls, selections, parts, materials, seams, rig hierarchy and target policy.
The neutral may be an unedited duplicate of that source, or the completed saved
snapshot whose exact file/hash IS the chosen neutral (its construction input can
differ). Endpoints/oracles must reset from the pinned neutral in result.source.

Native meshes become descriptor.objects names. Basis is the neutral; every
nonneutral source sample becomes a Basis-relative key named Source_<ID>. Declare
those exact names in existing objects[].targets/frame. Null shape names already
mean zero in people.compile_family. Unreferenced Source_ keys are diagnostic
source oracles and never become runtime targets automatically.

Every nonempty native material partition must be selected once or explicitly
omitted. Matching uses the ORIGINAL partition/corner UVs before the declared
shared UV packing transform. Canonical IDs are neutral partition-local vertices,
not GLB render vertices. No nearest-position mapping or independent reduction.
Exact corner recovery can collapse extra native control-point copies only when
their positions and complete named skin weights are identical. Every source
face/corner/point must still be covered; differing points and merges are refused.
The declared body-side seam weights are copied once to the head boundary before
the compiler's influence cap; moving seams still require actual qualification.

Joint authority and aliases are explicit, including cross-head/body identities.
Removed weights walk that source skeleton to a declared retained ancestor before
the existing compiler's four-influence limit. A point selects a real bone HEAD;
offset is an authored vector in that imported bone's rigid rest axes, in metres.
Position selects an explicitly fixed Blender-world point. No importer-generated
leaf tails, native facial editing-handle IDs or skin searches define joints.
Surface landmarks retain the existing descriptor.surface contract. Structural
target keys must be explicit, including null for intentionally fixed points.
Source joint/head/tail/roll residuals are reported, never silently called parity.

prepare writes family.blend, descriptor.json, profile/maps and prepare.json.
Its descriptor.study carries private conversion/package records, ignored by the
existing compiler. compile delegates numerical compilation to people.compile_family,
writes the ordinary family.json package index, and uses people.resolve_recipe /
evaluate_body for actual source reconstruction measurements. Source-rest residuals
are report-only for this initial experiment. Endpoint reconstruction over 0.1mm
is a failed geometry check; combined-oracle errors are measurements, not that gate.
Native custom normals and reduced-rig motion still need actual visual comparison.
"""

import argparse
import copy
import hashlib
import importlib.util
import json
import math
import shutil
import sys
from collections import defaultdict, deque
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from asset_workspace import external_output  # noqa: E402


def file_record(path, *, relative_to=None):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(4 * 1024 * 1024), b''):
            digest.update(chunk)
    return {'path' if relative_to else 'file': str(path.relative_to(relative_to) if relative_to else path),
            'bytes': path.stat().st_size, 'sha256': digest.hexdigest()}


def source_file(record):
    path = external_output(record['file'])
    actual = file_record(path)
    if any(actual[key] != record[key] for key in ('bytes', 'sha256')):
        raise ValueError(f'Source bytes differ from their pinned description: {path}')
    return path


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, allow_nan=False) + '\n')


def modules():
    import bpy
    import numpy as np
    from mathutils import Matrix, Vector
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import people
    spec = importlib.util.spec_from_file_location('art_tool', Path(__file__).with_name('art-tool.py'))
    art = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(art)
    return bpy, np, Matrix, Vector, people, art


def matrix(values, Matrix):
    if len(values) != 16 or not all(math.isfinite(v) for v in values):
        raise ValueError('Normalization requires sixteen finite column-major values')
    return Matrix([values[i::4] for i in range(4)])


def point(values, Vector):
    if len(values) != 3 or not all(math.isfinite(v) for v in values):
        raise ValueError('An authored point/offset requires three finite metre values')
    return Vector(values)


def rigid_source(world, unit_scale, np, Matrix):
    """Remove the known FBX object-unit scale, retaining the actual bone roll."""
    basis = np.asarray(world.to_3x3(), dtype=float) / unit_scale
    # Same rigid-basis tolerance as assertPersonRestMatrices; no per-bone scaling.
    if (not np.isfinite(basis).all() or np.linalg.det(basis) <= 0
            or np.max(np.abs(basis.T @ basis - np.eye(3))) > 1e-4
            or not np.allclose(list(world[3]), [0, 0, 0, 1], atol=1e-6)):
        raise ValueError('Source rest frame has unexpected nonuniform scale/shear; it is not the family rigid contract')
    result = Matrix.Identity(4)
    for row in range(3):
        for column in range(3):
            result[row][column] = float(basis[row, column])
    result.translation = world.translation
    return result


def correspondence(neutral, sample, np):
    """Exact corners recover canonical IDs, including identical native splits."""
    count = len(neutral['positions'])
    if len(sample['positions']) < count or len(neutral['triangles']) != len(sample['triangles']):
        raise ValueError('Selected source topology lost canonical vertices or changed triangle count')
    if count == len(sample['positions']) and all(
            np.array_equal(neutral[key], sample[key]) for key in ('triangles', 'uvs', 'materials')):
        return np.arange(count), 'identical-layout'
    def face_key(data, face):
        return (int(data['materials'][face]), tuple(sorted(map(tuple, data['uvs'][face]))))
    buckets = defaultdict(list)
    adjacency = defaultdict(set)
    for face, vertices in enumerate(neutral['triangles']):
        buckets[face_key(neutral, face)].append(face)
        for vertex in vertices:
            adjacency[int(vertex)].add(face)
    forward = {}; reverse = {}; used = set(); unresolved = set(range(len(sample['triangles'])))
    incident = defaultdict(set)
    for face, vertices in enumerate(sample['triangles']):
        for vertex in vertices:
            incident[int(vertex)].add(face)
    queue = deque(unresolved); queued = set(unresolved)
    while unresolved:
        progress = False
        while queue:
            face = queue.popleft(); queued.discard(face)
            if face not in unresolved:
                continue
            vertices = sample['triangles'][face]
            candidates = set(buckets.get(face_key(sample, face), ())) - used
            if not candidates:
                raise ValueError(f'No exact material/UV face match for source triangle {face}')
            anchored = False
            for vertex in vertices:
                if int(vertex) in forward:
                    candidates.intersection_update(adjacency[forward[int(vertex)]])
                    anchored = True
            # Do not expand a whole overlapping-UV island into a quadratic search.
            if len(candidates) > 1 and not anchored:
                continue
            matches = []
            for target in candidates:
                # Recover ordering, never repair reversed source face winding.
                for order in ((0, 1, 2), (1, 2, 0), (2, 0, 1)):
                    if not np.array_equal(sample['uvs'][face], neutral['uvs'][target][list(order)]):
                        continue
                    pairs = [(int(a), int(b)) for a, b in zip(vertices, neutral['triangles'][target][list(order)])]
                    if all((a not in forward or forward[a] == b) and
                           (b not in reverse or reverse[b] == a or
                            (np.array_equal(sample['positions'][a], sample['positions'][reverse[b]]) and
                             sample['weights'][a] == sample['weights'][reverse[b]])) for a, b in pairs):
                        matches.append((target, pairs))
                        if len(matches) > 1:
                            break
                if len(matches) > 1:
                    break
            if len(matches) != 1:
                continue
            target, pairs = matches[0]
            used.add(target); unresolved.remove(face); progress = True
            for a, b in pairs:
                forward[a] = b; reverse.setdefault(b, a)
                for other in incident[a]:
                    if other in unresolved and other not in queued:
                        queue.append(other); queued.add(other)
        if not progress:
            raise ValueError(f'Ambiguous/conflicting exact UV correspondence: {len(unresolved)} source faces')
        queue.extend(unresolved); queued.update(unresolved)
    if len(forward) != len(sample['positions']) or len(reverse) != count:
        raise ValueError('Exact corner correspondence does not cover every canonical vertex')
    # Native source models can split a CP into identical copies (observed at a
    # lip vertex). Collapse only exact position AND named-weight equality after
    # unique face/corner recovery; no nearby point or differing corner is merged.
    # Output is indexed in neutral order, irrespective of native serialization.
    method = ('exact-material-uv-corners-with-identical-source-splits'
              if len(sample['positions']) > count else 'exact-material-uv-corner-bijection')
    return np.asarray([reverse[i] for i in range(count)]), method


def native_sample(definition, source_sha):
    path = source_file(definition['result'])
    result = json.loads(path.read_text())
    if result['status'] != 'geometry-exported':
        raise ValueError(f'Native result is incomplete: {path}')
    rows = [s for s in result['samples'] if s['id'] == definition['sample']]
    if len(rows) != 1 or rows[0]['stage'] != 'exported':
        raise ValueError(f'Native sample is absent/incomplete: {definition["sample"]}')
    row = rows[0]
    if definition['role'] == 'neutral' and row['saved_source']['sha256'] == source_sha:
        source_file(row['saved_source'])
        origin = 'exact-saved-neutral-snapshot'
    elif result['source']['sha256'] == source_sha:
        if definition['role'] == 'neutral' and (row['source_constraints'] != row['committed_constraints'] or row['landmark_changes']):
            raise ValueError('A newly duplicated neutral must not contain additional body/face edits')
        origin = 'reset-from-pinned-neutral'
    else:
        raise ValueError(f'Native sample does not use the selected saved neutral: {path}')
    return row, result['engine'], {'origin': origin, 'construction_input': result['source'],
                                  'saved_snapshot': row['saved_source'], 'result': file_record(path)}


def import_kind(path, kind, lod, selections, needed_bones, normalization, context):
    bpy, np, Matrix, Vector, people, art = context
    collections = ('objects', 'meshes', 'armatures', 'materials', 'images', 'actions', 'collections')
    before = {name: {v.as_pointer() for v in getattr(bpy.data, name)} for name in collections}
    try:
        art.import_model(path)
        suffix = f'_{kind.title()}_LOD{lod}'
        candidates = [o for o in art.content('MESH')
                      if o.as_pointer() not in before['objects'] and o.name.endswith(suffix)]
        if len(candidates) != 1:
            raise ValueError(f'Expected exactly one selected native {suffix} mesh in {path}')
        obj = candidates[0]; mesh = obj.data
        if obj.constraints or any(m.type != 'ARMATURE' for m in obj.modifiers):
            raise ValueError('Freeze non-skin modifiers/constraints before source intake')
        armatures = {m.object for m in obj.modifiers if m.type == 'ARMATURE' and m.object}
        if len(armatures) != 1:
            raise ValueError('Selected native mesh must name one actual source armature')
        armature = armatures.pop()
        for other in list(art.content('MESH')):
            if other != obj and other.as_pointer() not in before['objects']:
                bpy.data.objects.remove(other, do_unlink=True)
        for unused in list(bpy.data.meshes):
            if unused.as_pointer() not in before['meshes'] and unused.users == 0:
                bpy.data.meshes.remove(unused)
        bones = {}
        armature_world = normalization @ armature.matrix_world
        unit_scale = sum(armature_world.to_scale()) / 3
        if unit_scale <= 0:
            raise ValueError('Source armature has an invalid object-unit scale')
        rigid_source(armature_world, unit_scale, np, Matrix)
        for bone in armature.data.bones:
            entry = {'parent': bone.parent.name if bone.parent else None}
            if bone.name in needed_bones:
                world = armature_world @ bone.matrix_local
                entry.update(matrix=rigid_source(world, unit_scale, np, Matrix), raw=world,
                             scale=list(world.to_scale()), import_unit_scale=unit_scale)
            bones[bone.name] = entry
        if not needed_bones.issubset(bones):
            raise ValueError(f'Declared source bones are absent: {sorted(needed_bones - set(bones))}')
        mesh.calc_loop_triangles()
        uv = mesh.uv_layers.active
        if uv is None:
            raise ValueError('Selected native mesh has no corner UV layer')
        active_slots = {t.material_index for t in mesh.loop_triangles}
        selected_slots = [slot for selection in selections.values() for slot in selection['material_slots']]
        if len(set(selected_slots)) != len(selected_slots):
            raise ValueError('One native material partition was selected more than once')
        transform = normalization @ obj.matrix_world
        positions = np.asarray([transform @ v.co for v in mesh.vertices], dtype=float)
        if not np.isfinite(positions).all():
            raise ValueError('Native positions contain nonfinite values')
        parts = {}
        for mesh_id, selection in selections.items():
            faces = [t for t in mesh.loop_triangles if t.material_index in selection['material_slots']]
            if not faces:
                raise ValueError(f'Empty selected native material partition: {mesh_id}')
            vertices = sorted({int(v) for t in faces for v in t.vertices})
            local = {v: i for i, v in enumerate(vertices)}
            weights = [{obj.vertex_groups[g.group].name: g.weight for g in mesh.vertices[v].groups if g.weight > 0}
                       for v in vertices]
            corners = np.asarray([[list(uv.data[loop].uv) for loop in t.loops] for t in faces])
            if not np.isfinite(corners).all():
                raise ValueError('Native corner UVs contain nonfinite values')
            parts[mesh_id] = {'positions': positions[vertices],
                              'triangles': np.asarray([[local[int(v)] for v in t.vertices] for t in faces]),
                              'uvs': corners, 'materials': np.asarray([t.material_index for t in faces]),
                              'weights': weights, 'source_vertices': vertices,
                              'source_faces': [t.polygon_index for t in faces]}
        return parts, bones, active_slots, {'object': obj.name, 'lod': lod,
                                         'native_bones': len(bones), 'retained_or_landmark_bones': sorted(needed_bones),
                                         'active_material_slots': sorted(active_slots),
                                         'material_names': [m.name if m else None for m in mesh.materials]}
    finally:
        # Keep canonical outputs, never fourteen imported all-LOD scenes/rigs.
        for name in collections:
            data = getattr(bpy.data, name)
            for value in list(data):
                if value.as_pointer() not in before[name] and (name == 'objects' or value.users == 0):
                    data.remove(value, do_unlink=True) if name == 'objects' else data.remove(value)


def aggregate_weights(weights, bones, owners):
    output = []
    for vertex in weights:
        result = defaultdict(float)
        for name, weight in vertex.items():
            ancestor = name; chain = []
            while ancestor not in owners:
                if ancestor not in bones:
                    raise ValueError(f'Weighted source joint has no declared retained ancestor: {name}')
                chain.append(ancestor)
                ancestor = bones[ancestor]['parent']
            owner = owners[ancestor]
            for removed in chain:
                owners[removed] = owner
            result[owner] += weight
        output.append(dict(result))
    return output


def source_point(definition, bones, normalization, context):
    bpy, np, Matrix, Vector, people, art = context
    if 'position' in definition:
        return normalization @ point(definition['position'], Vector)
    source = bones[definition['kind']][definition['bone']]['matrix']
    # Offset is explicitly authored in rigid imported-bone axes, never its display tail.
    scale = normalization.to_scale()[0]
    return source @ (point(definition.get('offset', [0, 0, 0]), Vector) * scale)


def rotation_error(a, b):
    angle = abs(a.to_quaternion().rotation_difference(b.to_quaternion()).angle)
    return min(angle, 2 * math.pi - angle)


def share_seam_weights(descriptor, bpy):
    """Keep the declared position authority during skinning, not just at rest."""
    objects = descriptor['objects']; planned = {}; maximum = 0
    def weights(obj, vertex):
        return {obj.vertex_groups[g.group].name: g.weight
                for g in obj.data.vertices[vertex].groups if g.weight > 0}
    for seam in descriptor['family']['seams']:
        body = bpy.data.objects[objects[seam['bodyMesh']]['object']]
        head = bpy.data.objects[objects[seam['headMesh']]['object']]
        if len(seam['bodyVertices']) != len(seam['headVertices']):
            raise ValueError('Shared seam requires a body authority for every head vertex')
        for source, target in zip(seam['bodyVertices'], seam['headVertices']):
            if any(type(index) is not int or not 0 <= index < len(obj.data.vertices)
                   for index, obj in ((source, body), (target, head))):
                raise ValueError('Shared seam has invalid canonical vertices')
            value = weights(body, source); key = (head.name, target)
            if key in planned and planned[key] != value:
                raise ValueError('One head seam vertex has conflicting body weight authorities')
            planned[key] = value
            before = weights(head, target)
            maximum = max(maximum, sum(abs(value.get(j, 0) - before.get(j, 0))
                                       for j in set(value) | set(before)))
    for (name, vertex), value in planned.items():
        obj = bpy.data.objects[name]
        for group in [g.group for g in obj.data.vertices[vertex].groups]:
            obj.vertex_groups[group].remove([vertex])
        for joint, weight in value.items():
            obj.vertex_groups[joint].add([vertex], weight, 'REPLACE')
    return {'authority': 'Declared body-side weights, matching the existing position seam.',
            'headVertices': len(planned), 'maximumStoredWeightL1DifferenceBefore': maximum,
            'bodyWeightsChanged': False,
            'limits': 'Setup correction only; posed seams and reduction fidelity remain unqualified.'}


def validate_textures(family, textures):
    """Offline bytes must be the same artifact the browser will request."""
    for key, texture in textures.items():
        if any(texture['reference'][field] != texture['file'][field] for field in ('sha256', 'bytes')):
            raise ValueError(f'Texture artifact reference differs from the prepared bytes: {key}')
    for material in family['materials'].values():
        references = [material[key] for key in ('colorTexture', 'normalTexture', 'tintMask') if key in material]
        references.extend(value for row in material.get('ageMaps', {}).values() for value in row.values())
        for reference in references:
            if reference['path'] not in textures or textures[reference['path']]['reference'] != reference['reference']:
                raise ValueError(f'Material references an absent/different texture artifact: {reference["path"]}')


def prepare(manifest_path, out, report):
    context = modules(); bpy, np, Matrix, Vector, people, art = context
    manifest = json.loads(manifest_path.read_text())
    report['inputs'] = {'manifest': file_record(manifest_path), 'descriptor': manifest['descriptor'],
                        'profile': manifest['profile'], 'source_sha256': manifest['source_sha256']}
    report['structuralTargetPolicy'] = manifest['landmarks']
    report['retainedJointSelection'] = manifest['joints']
    report['normalization'] = manifest['normalization']
    descriptor = json.loads(source_file(manifest['descriptor']).read_text())
    family = descriptor['family']; objects = descriptor['objects']
    names = [source['object'] for source in objects.values()]
    if len(set(names)) != len(names):
        raise ValueError('Each canonical mesh requires its own unique Blender object name')
    if 'reference' in family:
        raise ValueError('Authored descriptor must omit its own exact reference')
    normalization = matrix(manifest['normalization'], Matrix)
    scale = normalization.to_scale()
    basis = np.asarray(normalization.to_3x3())
    if (min(scale) <= 0 or max(scale) - min(scale) > 1e-6 or normalization.determinant() <= 0
            or not np.allclose(basis.T @ basis, np.eye(3) * scale[0] ** 2, atol=1e-6)
            or not np.allclose(list(normalization[3]), [0, 0, 0, 1], atol=1e-8)):
        raise ValueError('Normalization must preserve handedness and use one uniform scale')
    if set(manifest['lods']) != {'head', 'body'} or any(type(v) is not int or v < 0 for v in manifest['lods'].values()):
        raise ValueError('Declare an explicit nonnegative head/body source LOD')
    selected = manifest['meshes']
    if not set(family['bodyMeshes']).issubset(selected):
        raise ValueError('Every anatomical body/head mesh must come from selected native geometry')
    if not set(selected).issubset(objects):
        raise ValueError('A native mesh has no existing descriptor object declaration')
    for mesh_id, selection in selected.items():
        source = objects[mesh_id]
        if source.get('weightsObject', source['object']) != source['object']:
            raise ValueError('Native canonical meshes must use their own transferred weight ordering')
        if source['metadata']['materialId'] not in family['materials']:
            raise ValueError(f'Declare a prepared family material for native mesh {mesh_id}')
        if len(selection['uv_transform']) != 4 or not all(math.isfinite(v) for v in selection['uv_transform']):
            raise ValueError('Each native mesh requires one explicit finite UV packing transform')
    joints = family['rig']['joints']
    if not 0 < len(joints) <= art.BUDGETS['joints']:
        raise ValueError('Retained joints exceed the existing character profile or are empty')
    if len({joint['id'] for joint in joints}) != len(joints):
        raise ValueError('Retained joint IDs must be unique')
    if set(manifest['joints']) != {j['id'] for j in joints}:
        raise ValueError('Declare the source authority of every retained joint')
    retained = {'head': {}, 'body': {}}
    for index, joint in enumerate(joints):
        if not -1 <= joint['parent'] < index:
            raise ValueError('Retained rig must be parent-first')
        authority = manifest['joints'][joint['id']]
        for source in [authority, *authority.get('aliases', [])]:
            mapping = retained[source['kind']]
            if source['bone'] in mapping:
                raise ValueError('A source bone was assigned to multiple retained joints')
            mapping[source['bone']] = joint['id']
    structural = {key for key, value in family['landmarks'].items() if 'surface' not in value}
    if any(joint[key] not in structural for joint in joints for key in ('headLandmark', 'tailLandmark')):
        raise ValueError('Retained joints require declared internal structural head/tail landmarks')
    if set(manifest['landmarks']) != structural:
        raise ValueError('Declare point and target policy for every structural landmark')
    for key in structural:
        policy = manifest['landmarks'][key]
        if set(policy['targets']) != set(family['landmarks'][key]['targets']):
            raise ValueError(f'Structural target policy differs from the descriptor: {key}')
    neutral_id = manifest['neutral']
    for key, sample in manifest['samples'].items():
        if sample['role'] not in ('neutral', 'endpoint', 'oracle') or (sample['role'] == 'neutral') != (key == neutral_id):
            raise ValueError('Declare one neutral and each source sample as endpoint or validation oracle')
    sample_ids = [neutral_id, *(key for key in manifest['samples'] if key != neutral_id)]
    sample_points = {}; sample_bones = {}; canonical = {}; output_objects = {}; engine = None
    art.clear_scene()
    for sample_id in sample_ids:
        report['stage'] = f'importing:{sample_id}'; write_json(out / 'prepare.json', report)
        row, native_engine, provenance = native_sample(manifest['samples'][sample_id], manifest['source_sha256'])
        if engine is not None and native_engine != engine:
            raise ValueError('Source samples were evaluated by different engine builds')
        engine = native_engine; bones_by_kind = {}
        sample_report = {'id': sample_id, 'provenance': provenance, 'parts': {}, 'imports': {}}
        for kind, lod in manifest['lods'].items():
            exports = [e for e in row['exports'] if e['kind'] == kind]
            if len(exports) != 1 or exports[0]['errors']:
                raise ValueError(f'Native {kind} export is missing or has errors')
            path = source_file(exports[0])
            selections = {key: value for key, value in selected.items() if value['kind'] == kind}
            needed = set(retained[kind])
            needed.update(policy['point']['bone'] for policy in manifest['landmarks'].values()
                          if policy['point'].get('kind') == kind)
            parts, bones, active, imported = import_kind(path, kind, lod, selections, needed, normalization, context)
            bones_by_kind[kind] = bones; sample_report['imports'][kind] = {**imported, **file_record(path)}
            chosen = {v for selection in selections.values() for v in selection['material_slots']}
            omitted = set(manifest['omitted_material_slots'][kind])
            if chosen & omitted or chosen | omitted != active:
                raise ValueError(f'Every nonempty {kind} material partition must be selected or explicitly omitted')
            weight_owners = dict(retained[kind])
            for mesh_id, data in parts.items():
                weights = aggregate_weights(data['weights'], bones, weight_owners)
                if sample_id == neutral_id:
                    canonical[mesh_id] = data
                    mesh = bpy.data.meshes.new(objects[mesh_id]['object'])
                    mesh.from_pydata(data['positions'].tolist(), [], data['triangles'].tolist()); mesh.update()
                    uv = mesh.uv_layers.new(name='CanonicalUV')
                    su, sv, ou, ov = selected[mesh_id]['uv_transform']
                    for loop, value in zip(uv.data, data['uvs'].reshape(-1, 2)):
                        loop.uv = (value[0] * su + ou, value[1] * sv + ov)
                    obj = bpy.data.objects.new(objects[mesh_id]['object'], mesh)
                    if obj.name != objects[mesh_id]['object']:
                        raise ValueError('Canonical object name was truncated or collided')
                    bpy.context.collection.objects.link(obj); obj.shape_key_add(name='Basis')
                    for joint in joints:
                        if obj.vertex_groups.new(name=joint['id']).name != joint['id']:
                            raise ValueError('Retained weight-group name was truncated or collided')
                    for vertex, influences in enumerate(weights):
                        # Blender stores each group in [0,1]. Preserve ratios if
                        # ancestor aggregation exceeds that; compiler normalizes.
                        storage_scale = max(1, max(influences.values(), default=0))
                        for joint, weight in influences.items():
                            obj.vertex_groups[joint].add([vertex], weight / storage_scale, 'REPLACE')
                    data['retained_weights'] = weights; output_objects[mesh_id] = obj
                    mapping = np.arange(len(data['positions'])); method = 'neutral-source-order'
                else:
                    try:
                        mapping, method = correspondence(canonical[mesh_id], data, np)
                    except ValueError as error:
                        raise ValueError(f'{sample_id}/{mesh_id}: {error}') from error
                    key = output_objects[mesh_id].shape_key_add(name=f'Source_{sample_id}')
                    if key.name != f'Source_{sample_id}':
                        raise ValueError('Sample shape name was truncated or collided')
                    key.relative_key = output_objects[mesh_id].data.shape_keys.key_blocks[0]
                    key.data.foreach_set('co', data['positions'][mapping].reshape(-1))
                source_weights = [weights[int(i)] for i in mapping]
                previous = canonical[mesh_id]['retained_weights']
                weight_change = max((abs(v.get(joint, 0) - old.get(joint, 0))
                                     for v, old in zip(source_weights, previous)
                                     for joint in set(v) | set(old)), default=0)
                discarded = max((sum(sorted(v.values(), reverse=True)[4:]) / sum(v.values())
                                 for v in source_weights if sum(v.values()) > 0), default=0)
                sample_report['parts'][mesh_id] = {'vertices': len(data['positions']), 'triangles': len(data['triangles']),
                    'canonicalVertices': len(mapping), 'identicalSourceSplits': len(data['positions']) - len(mapping),
                    'correspondence': method, 'weightChangeMax': weight_change, 'fourInfluenceDiscardedFractionMax': discarded,
                    'zeroWeightVertices': sum(not value for value in source_weights)}
                if sample_id == neutral_id:
                    sample_report['parts'][mesh_id].update(sourceVertices=data['source_vertices'], sourceFaces=data['source_faces'],
                        canonicalTrianglesSha256=hashlib.sha256(np.asarray(data['triangles'], dtype='<u4').tobytes()).hexdigest(),
                        cornerUvSha256=hashlib.sha256(np.asarray(data['uvs'], dtype='<f4').tobytes()).hexdigest())
        sample_points[sample_id] = {key: list(source_point(value['point'], bones_by_kind, normalization, context))
                                    for key, value in manifest['landmarks'].items()}
        # Retain only declared frames, not all native head/body rigs for every sample.
        sample_bones[sample_id] = {joint['id']: bones_by_kind[manifest['joints'][joint['id']]['kind']]
                                  [manifest['joints'][joint['id']]['bone']] for joint in joints}
        sample_report['aliases'] = []
        for joint in joints:
            primary = sample_bones[sample_id][joint['id']]['matrix']
            for alias in manifest['joints'][joint['id']].get('aliases', []):
                other = bones_by_kind[alias['kind']][alias['bone']]['matrix']
                sample_report['aliases'].append({'joint': joint['id'], **alias,
                    'positionDifferenceMetres': (primary.translation - other.translation).length,
                    'rotationDifferenceRadians': rotation_error(primary, other)})
        report['samples'].append(sample_report)
    conversion = Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, -1, 0, 0), (0, 0, 0, 1)))
    inverse_conversion = conversion.inverted()
    # build_scene/motion convert R back with C^-1 R C. Points need only C p;
    # complete bone frames need conjugation to preserve their local axes/roll.
    def family_matrix(value):
        return conversion @ value @ inverse_conversion
    def family_point(value):
        return conversion @ Vector(value)
    for key, policy in manifest['landmarks'].items():
        definition = family['landmarks'][key]; base = family_point(sample_points[neutral_id][key])
        definition['position'] = list(base)
        definition['frameDelta'] = list(family_point(sample_points[policy['frame']][key]) - base) if policy['frame'] else [0, 0, 0]
        definition['targets'] = {name: list(family_point(sample_points[sample][key]) - base) if sample else [0, 0, 0]
                                 for name, sample in policy['targets'].items()}
    remaining = set(objects) - set(selected)
    if remaining:
        path = source_file(manifest['prepared_master'])
        names = [objects[key]['object'] for key in remaining]
        with bpy.data.libraries.load(str(path), link=False) as (available, loaded):
            if not set(names).issubset(available.objects):
                raise ValueError('A declared prepared part/helper mesh is missing')
            loaded.objects = names
        for obj in loaded.objects:
            if obj.type != 'MESH' or obj.modifiers or obj.constraints or obj.parent:
                raise ValueError('Prepared part/helper objects must be frozen unparented meshes')
            bpy.context.collection.objects.link(obj)
        if {obj.name for obj in loaded.objects} != set(names):
            raise ValueError('Prepared object names were truncated or collided')
    # Native head/body partitions can coincide yet use different blend weights.
    # The existing seam already makes body positions authoritative; share those
    # weights once in the master before the compiler applies its influence cap.
    # docs/projects/people-from-parts-authoring-contract.md#geometry-evaluation
    report['seamWeights'] = share_seam_weights(descriptor, bpy)
    for key, definition in family['landmarks'].items():
        if 'surface' in definition:
            # Surface landmarks can address native anatomy or a prepared fit helper.
            # Both are frozen objects in the same canonical Blender-world metres.
            s = definition['surface']; obj = bpy.data.objects[objects[s['meshId']]['object']]
            keys = obj.data.shape_keys.key_blocks if obj.data.shape_keys else None
            neutral = keys[0].data if keys else obj.data.vertices
            if any(type(v) is not int or not 0 <= v < len(neutral) for v in s['triangle']):
                raise ValueError(f'Surface landmark has invalid canonical vertices: {key}')
            positions = np.asarray([conversion @ obj.matrix_world @ v.co for v in neutral]).reshape(-1)
            definition['position'] = people.surface_points(positions, s['triangle'], s['barycentric'], s['offset']).tolist()
    family['rig']['sourceRestMatrices'] = [v for joint in joints
        for column in family_matrix(sample_bones[neutral_id][joint['id']]['matrix']).transposed() for v in column]
    report['anatomicalReference'] = {
        'declaredStatureMetres': family['referenceStatureMetres'],
        'crown': family['landmarks'][family['crownLandmark']]['position'],
        'sole': family['landmarks'][family['soleLandmark']]['position']}
    report['anatomicalReference']['crownSoleHeightMetres'] = (
        report['anatomicalReference']['crown'][1] - report['anatomicalReference']['sole'][1])
    for sample_report in report['samples']:
        sample_id = sample_report['id']; declared = {}
        for key, definition in family['landmarks'].items():
            value = Vector(definition['position'])
            if key in structural:
                policy = manifest['landmarks'][key]
                # Frame-anchor aliases may name the same sample twice: one displacement.
                names = [name for name, sample in policy['targets'].items() if sample == sample_id]
                if names:
                    value += Vector(definition['targets'][names[0]])
                elif policy['frame'] == sample_id:
                    value += Vector(definition['frameDelta'])
            declared[key] = list(value)
        reconstructed, _ = people.rest_hierarchy(family, declared)
        sample_report['sourceRestResiduals'] = []
        for index, joint in enumerate(joints):
            actual = family_matrix(sample_bones[sample_id][joint['id']]['matrix'])
            original = sample_bones[sample_id][joint['id']]['matrix']
            round_trip = inverse_conversion @ actual @ conversion
            fitted = matrix(reconstructed[index * 16:(index + 1) * 16].tolist(), Matrix)
            actual_tail = family_point(sample_points[sample_id][joint['tailLandmark']])
            sample_report['sourceRestResiduals'].append({'joint': joint['id'],
                'actualHead': list(actual.translation), 'actualTail': list(actual_tail),
                'declaredHead': declared[joint['headLandmark']], 'declaredTail': declared[joint['tailLandmark']],
                'headDifferenceMetres': (actual.translation - Vector(declared[joint['headLandmark']])).length,
                'tailDifferenceMetres': (actual_tail - Vector(declared[joint['tailLandmark']])).length,
                'rotationDifferenceRadians': rotation_error(actual, fitted),
                'actualRestMatrix': [v for column in actual.transposed() for v in column],
                'rawSourceMatrix': [v for column in family_matrix(sample_bones[sample_id][joint['id']]['raw']).transposed() for v in column],
                'matrixRoundTripMaximum': max(abs(round_trip[row][column] - original[row][column])
                                               for row in range(4) for column in range(4)),
                'importUnitScale': sample_bones[sample_id][joint['id']]['import_unit_scale'],
                'sourceScale': sample_bones[sample_id][joint['id']]['scale']})
        sample_report['structuralPolicyProjection'] = 'Declared single-sample targets; actual recipe reconstruction is measured during compile.'
    for mesh_id, source in objects.items():
        obj = bpy.data.objects.get(source['object'])
        if not obj or obj.type != 'MESH':
            raise ValueError(f'Declared canonical mesh is absent: {mesh_id}')
        keys = obj.data.shape_keys.key_blocks if obj.data.shape_keys else {}
        for name in [source.get('frame'), *source.get('targets', {}).values()]:
            if name is not None and name not in keys:
                raise ValueError(f'Missing declared canonical shape key: {mesh_id}/{name}')
    package = {'profile': copy_package_file(source_file(manifest['profile']), out / 'profile.json', out), 'textures': {}}
    for index, (key, texture) in enumerate(manifest['textures'].items()):
        path = source_file(texture['file']); target = out / 'textures' / f'{index}{path.suffix.lower()}'
        package['textures'][key] = {'reference': texture['reference'], 'file': copy_package_file(path, target, out)}
    validate_textures(family, package['textures'])
    descriptor['study'] = {'package': package, 'neutral': neutral_id,
        'samples': {key: {'recipe': value['recipe'], 'role': value['role'],
                         'shape': None if key == neutral_id else f'Source_{key}'}
                    for key, value in manifest['samples'].items()}, 'source_manifest': file_record(manifest_path)}
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(out / 'family.blend'))
    report.update(status='prepared-experimental-unqualified', engine=engine, stage='complete',
                  master=file_record(out / 'family.blend'))
    write_json(out / 'prepare.json', report)
    descriptor['study']['preparation'] = file_record(out / 'prepare.json', relative_to=out)
    write_json(out / 'descriptor.json', descriptor)


def copy_package_file(source, target, root):
    target.parent.mkdir(parents=True, exist_ok=True)
    with source.open('rb') as read, target.open('xb') as write:
        shutil.copyfileobj(read, write)
    return file_record(target, relative_to=root)


def compile_study(master, descriptor_path, reference_path, out, report):
    bpy, np, Matrix, Vector, people, art = modules()
    descriptor = json.loads(descriptor_path.read_text()); reference = json.loads(reference_path.read_text())
    report['inputs'] = {'master': file_record(master), 'descriptor': file_record(descriptor_path),
                        'reference': file_record(reference_path)}
    study = descriptor['study']; package = study['package']
    preparation_path = people.source_file(descriptor_path.parent, study['preparation'])
    preparation = json.loads(preparation_path.read_text())
    if preparation['status'] != 'prepared-experimental-unqualified':
        raise ValueError('Preparation did not complete')
    current_master = file_record(master)
    if any(current_master[key] != preparation['master'][key] for key in ('sha256', 'bytes')):
        raise ValueError('Master differs from its pinned preparation')
    # Snapshot the admitted master/descriptor first; the shared compiler owns arrays.
    master_record = copy_package_file(master, out / 'family.blend', out)
    if any(master_record[key] != preparation['master'][key] for key in ('sha256', 'bytes')):
        raise ValueError('Master changed while its compilation copy was prepared')
    copy_package_file(descriptor_path, out / 'descriptor.json', out)
    copy_package_file(preparation_path, out / 'prepare.json', out)
    profile_source = people.source_file(descriptor_path.parent, package['profile'])
    profile_record = copy_package_file(profile_source, out / 'profile.json', out)
    profile = json.loads(profile_source.read_text()); textures = {}
    for key, texture in package['textures'].items():
        source = people.source_file(descriptor_path.parent, texture['file'])
        target = out / texture['file']['path']
        textures[key] = {'reference': texture['reference'], 'file': copy_package_file(source, target, out)}
    validate_textures(descriptor['family'], textures)
    family = people.compile_family(out / 'family.blend', descriptor, out / 'compiled.json', reference)
    report['reconstruction'] = []
    source_samples = {sample['id']: sample for sample in preparation['samples']}
    for sample_id, sample in study['samples'].items():
        recipe = {**sample['recipe'], 'family': reference}
        resolved = people.resolve_recipe(family, recipe, profile)
        evaluated = people.evaluate_body(family, resolved)
        errors = {}; missing_oracles = []
        for mesh_id in [*family['bodyMeshes'], *family['fitSurfaces']]:
            source = descriptor['objects'][mesh_id]; obj = bpy.data.objects[source['object']]
            keys = obj.data.shape_keys.key_blocks if obj.data.shape_keys else None
            if sample['shape'] and (keys is None or sample['shape'] not in keys):
                if mesh_id in family['bodyMeshes']:
                    raise ValueError(f'Missing anatomical source oracle: {sample_id}/{mesh_id}')
                missing_oracles.append(mesh_id)
                continue
            data = keys[sample['shape']].data if sample['shape'] else keys[0].data if keys else obj.data.vertices
            conversion = Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, -1, 0, 0), (0, 0, 0, 1)))
            expected = np.asarray([conversion @ obj.matrix_world @ v.co for v in data])
            actual = np.asarray(evaluated['canonicalPositions'][mesh_id]).reshape(-1, 3) / evaluated['scale']
            errors[mesh_id] = float(np.linalg.norm(expected - actual, axis=1).max(initial=0))
        rest_errors = []
        for index, source in enumerate(source_samples[sample_id]['sourceRestResiduals']):
            fitted = matrix(evaluated['restMatrices'][index * 16:(index + 1) * 16].tolist(), Matrix)
            actual = matrix(source['actualRestMatrix'], Matrix)
            rest_errors.append({'joint': source['joint'],
                'headDifferenceMetres': (actual.translation - fitted.translation / evaluated['scale']).length,
                'tailDifferenceMetres': (Vector(source['actualTail']) - Vector(evaluated['landmarks'][family['rig']['joints'][index]['tailLandmark']]) / evaluated['scale']).length,
                'rotationDifferenceRadians': rotation_error(actual, fitted)})
        report['reconstruction'].append({'sample': sample_id, 'role': sample['role'],
            'maximumPositionErrorMetresBeforeStature': errors, 'helpersWithoutSourceOracle': missing_oracles,
            'sourceRestResiduals': rest_errors})
    if any(value > 0.0001 for row in report['reconstruction'] if row['role'] != 'oracle'
           for value in row['maximumPositionErrorMetresBeforeStature'].values()):
        raise ValueError('Neutral/endpoint reconstruction exceeds the required 0.1mm; inspect compile.json')
    index = {'reference': reference, 'master': master_record, 'profile': profile_record,
             'compiled': file_record(out / 'compiled.json', relative_to=out), 'textures': textures}
    write_json(out / 'family.json', index)
    people.load_family(out / 'family.json')
    report.update(status='compiled-experimental-unqualified', package=file_record(out / 'family.json'),
        geometry={'retainedJoints': len(family['rig']['joints']), 'meshes': {
            key: {'vertices': len(value['positions']) // 3, 'triangles': len(value['triangles']) // 3,
                  'renderVertices': len(value['sourceVertexIndices']), 'topology': value['topology']}
            for key, value in family['meshes'].items()}})


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    commands = parser.add_subparsers(dest='command', required=True)
    prepare_parser = commands.add_parser('prepare', help='Prepare the existing master/descriptor format')
    prepare_parser.add_argument('--samples', required=True)
    compile_parser = commands.add_parser('compile', help='Delegate to the existing people compiler')
    for name in ('master', 'descriptor', 'reference'):
        compile_parser.add_argument('--' + name, required=True)
    for command in (prepare_parser, compile_parser):
        command.add_argument('--out', required=True)
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
    args = parser.parse_args(argv)
    out = external_output(args.out); out.mkdir(parents=True, exist_ok=False)
    report = {'status': 'running', 'stage': args.command, 'samples': [], 'tool': file_record(Path(__file__)),
              'helpers': [file_record(Path(__file__).with_name(name)) for name in ('people.py', 'art-tool.py')],
              'limits': ['Experimental source intake, not accepted visual/rig/motion/runtime parity.',
                         'Custom normals are not retained by the existing compiler; inspect the actual compiled neutral.']}
    report_path = out / ('prepare.json' if args.command == 'prepare' else 'compile.json')
    try:
        if args.command == 'prepare':
            prepare(external_output(args.samples), out, report)
        else:
            compile_study(*(external_output(getattr(args, name)) for name in ('master', 'descriptor', 'reference')), out, report)
    except Exception as error:
        report.update(status='failed', error=f'{type(error).__name__}: {error}')
        raise
    finally:
        write_json(report_path, report)


if __name__ == '__main__':
    main()
