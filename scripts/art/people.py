"""Offline evaluation of the same immutable family data used by the character preview.

The JSON schema is owned by apps/client/src/characters/person-family.ts. Human
control names and ranges are supplied by the selected world's exported profile.
No provider, world mutation, publication, executable metadata or float-key cache.
"""
import copy
import hashlib
import json
import math
import sys
import time
from pathlib import Path

import numpy as np

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from asset_workspace import external_output  # noqa: E402


class PeopleError(ValueError):
    def __init__(self, kind, subject, detail):
        super().__init__(detail)
        self.kind, self.subject = kind, subject

    def record(self):
        return {'kind': self.kind, 'subject': self.subject, 'detail': str(self)}


def required(mapping, key, kind='missing-source'):
    try:
        return mapping[key]
    except KeyError as error:
        raise PeopleError(kind, str(key), f'Missing required family data: {key}') from error


def flat(values):
    return np.asarray(values, dtype=np.float32).reshape(-1)


def points(values):
    return flat(values).reshape(-1, 3)


def excursion(value, side):
    return max(2 * value - 1 if side == 'positive' else 1 - 2 * value, 0)


def age_interval(samples, age):
    years = sorted(map(float, samples))
    if not years or age < years[0] or age > years[-1]:
        raise PeopleError('unsupported-shape', 'age', 'The requested age has no authored samples.')
    for a, b in zip(years, years[1:]):
        if age <= b:
            return a, b, (age - a) / (b - a)
    return years[0], years[0], 0


def year_key(year):
    return str(int(year)) if year == int(year) else str(year)


def add_pair(output, targets, pair, frame, amount):
    if amount:
        # Round after each authored operation, matching the browser's Float32Array.
        a, b = flat(required(targets, pair[0])), flat(required(targets, pair[1]))
        output[:] = output.astype(np.float64) + amount * ((1-frame)*a.astype(np.float64)+frame*b.astype(np.float64))


def apply_control(output, targets, binding, frame, value):
    for side in ('negative', 'positive'):
        add_pair(output, targets, binding[side], frame, excursion(value, side))


def corrections(output, targets, entries, recipe, frame, age):
    for entry in entries:
        weight = math.prod(excursion(recipe['controls'][d['control']], d['side']) for d in entry['drivers'])
        if not weight:
            continue
        if 'ageTargets' in entry:
            a, b, t = age_interval(entry['ageTargets'], age)
            add_pair(output, targets, entry['ageTargets'][year_key(a)], frame, weight*(1-t))
            add_pair(output, targets, entry['ageTargets'][year_key(b)], frame, weight*t)
        else:
            add_pair(output, targets, entry['targets'], frame, weight)


def resolve_recipe(family, recipe, profile=None):
    """Resolve once at input admission; internal evaluators consume the result."""
    if recipe.get('family') != family['reference']:
        raise PeopleError('invalid-recipe', 'family', 'Recipe and exact family reference differ.')
    result = {'family': copy.deepcopy(family['reference']), 'controls': {}, 'selections': {}}
    supplied = recipe.get('controls', {})
    percentages = recipe.get('percentages', {})
    unknown = (set(supplied)|set(percentages))-set(family['controls'])
    if unknown:
        raise PeopleError('unsupported-shape', sorted(unknown)[0], 'The family does not implement this control.')
    for key, definition in family['controls'].items():
        lo, hi = definition['bounds']
        percent = percentages.get(key)
        converted = None
        if percent is not None:
            if isinstance(percent, bool) or not isinstance(percent, (int, float)) or not math.isfinite(percent) or not 0 <= percent <= 100:
                raise PeopleError('invalid-recipe', key, 'Percentage must be finite and between zero and one hundred.')
            converted = lo+(percent/100)*(hi-lo)
        value = supplied.get(key, converted if converted is not None else definition['default'])
        if key in supplied and converted is not None and (abs(value-converted)/(hi-lo) if hi!=lo else abs(value-converted)) > 1e-6:
            raise PeopleError('invalid-recipe', key, 'Numeric and percentage inputs disagree.')
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not lo <= value <= hi:
            raise PeopleError('invalid-recipe', key, 'Control must be finite and inside its authored range.')
        result['controls'][key] = value
    selections = recipe.get('selections', {})
    if profile:
        allowed = {s['id']: s for s in profile['selections']}
        unknown = set(selections)-set(allowed)
        if unknown:
            raise PeopleError('invalid-recipe', sorted(unknown)[0], 'Unknown selection role.')
        for key, definition in allowed.items():
            value = selections.get(key, definition['defaultValue'])
            if value not in {o['id'] for o in definition['options']}:
                raise PeopleError('invalid-recipe', key, 'Unknown selection option.')
            result['selections'][key] = value
    else:
        result['selections'] = dict(selections)
    for constraint in (profile or {}).get('constraints', []):
        total = 0
        for term in constraint['terms']:
            control = required(family['controls'], term['control'], 'unsupported-shape')
            lo, hi = control['bounds']; value = result['controls'][term['control']]
            total += term['coefficient']*((value-lo)/(hi-lo) if hi!=lo else 0)
        if total > constraint['maximum']+1e-12:
            raise PeopleError('unsupported-shape', constraint['id'], 'The requested shape is outside the authored envelope.')
    face_id = required(result['selections'], family['faceSelectionRole'], 'invalid-recipe')
    required(family['facePresets'], face_id, 'unsupported-shape')
    for role, options in family['selectionParts'].items():
        selected = required(result['selections'], role, 'invalid-recipe')
        required(options, selected, 'unsupported-shape')
    return result


def surface_points(source, triangles, barycentric, offsets):
    p = points(source)[np.asarray(triangles, dtype=np.int64).reshape(-1, 3)]
    e = p[:, 1]-p[:, 0]
    n = np.cross(e, p[:, 2]-p[:, 0])
    el = np.linalg.norm(e, axis=1); nl = np.linalg.norm(n, axis=1)
    if np.any(el < 1e-9) or np.any(nl < 1e-12):
        raise PeopleError('part-fit', 'support triangle', 'The fitted support triangle collapsed.')
    e = e/el[:, None]; n = n/nl[:, None]; f = np.cross(n, e)
    off = points(offsets)
    return (np.sum(p*points(barycentric)[:, :, None], axis=1)+off[:, 0:1]*e+off[:, 1:2]*f+off[:, 2:3]*n).astype(np.float32).reshape(-1)


def evaluate_mesh(family, mesh_id, recipe, frame, age, face):
    mesh = family['meshes'][mesh_id]
    output = flat(mesh['positions']).copy()
    output[:] = output.astype(np.float64)+frame*flat(mesh['frameDelta']).astype(np.float64)
    is_face = face['meshId'] == mesh_id
    if is_face:
        add_pair(output, mesh['targets'], face['baseTarget'], frame, 1)
    for key, definition in family['controls'].items():
        if definition['kind'] not in ('bipolar', 'styleLength'):
            continue
        binding = (face.get('controls', {}).get(key) if is_face else None) or definition['targets'].get(mesh_id)
        if binding:
            apply_control(output, mesh['targets'], binding, frame, recipe['controls'][key])
    corrections(output, mesh['targets'], mesh.get('correctives', []), recipe, frame, age)
    if is_face:
        corrections(output, mesh['targets'], face.get('correctives', []), recipe, frame, age)
    if family['ageSamples']:
        a, b, t = age_interval(family['ageSamples'], age)
        for year, weight in ((a, 1-t), (b, t)):
            key = year_key(year)
            pair = (face.get('ageSamples', {}).get(key) if is_face else None) or family['ageSamples'].get(key, {}).get(mesh_id)
            if pair:
                add_pair(output, mesh['targets'], pair, frame, weight)
    return output


def mesh_normals(positions, triangles):
    p = points(positions); tri = np.asarray(triangles, dtype=np.int64).reshape(-1, 3)
    normals = np.zeros_like(p)
    cross = np.cross(p[tri[:, 1]]-p[tri[:, 0]], p[tri[:, 2]]-p[tri[:, 0]])
    for column in range(3):
        np.add.at(normals, tri[:, column], cross)
    lengths = np.linalg.norm(normals, axis=1)
    usable = lengths > 1e-12
    normals[usable] /= lengths[usable, None]
    return normals.reshape(-1)


def evaluate_body(family, recipe):
    """Shape, landmarks and seams only; surface fitting follows in fit_parts."""
    frame = recipe['controls'][family['frameControl']]
    height = recipe['controls'][family['statureControl']]
    age = recipe['controls'][family['ageControl']]
    scale = height/family['referenceStatureMetres']
    face = family['facePresets'][recipe['selections'][family['faceSelectionRole']]]
    # Parts are evaluated once, only when selected, in fit_parts. This matches
    # the live evaluator and avoids shaping an entire wardrobe before every fit.
    positions = {key: evaluate_mesh(family, key, recipe, frame, age, face)
                 for key in [*family['bodyMeshes'], *family['fitSurfaces']]}
    for seam in family['seams']:
        source = points(positions[seam['bodyMesh']]); target = points(positions[seam['headMesh']])
        target[np.asarray(seam['headVertices'])] = source[np.asarray(seam['bodyVertices'])]
    for p in positions.values():
        p *= scale
    landmarks = {}
    for key, definition in family['landmarks'].items():
        if 'surface' in definition:
            s = definition['surface']
            landmarks[key] = surface_points(positions[s['meshId']], s['triangle'], s['barycentric'], flat(s['offset'])*scale).tolist()
            continue
        value = flat(definition['position']).copy()
        value[:] = value.astype(np.float64)+frame*flat(definition['frameDelta']).astype(np.float64)
        pair = face.get('landmarkTargets', {}).get(key)
        if pair:
            add_pair(value, definition['targets'], pair, frame, 1)
        for control, binding in family['landmarkControlTargets'].get(key, {}).items():
            apply_control(value, definition['targets'], binding, frame, recipe['controls'][control])
        landmarks[key] = (value*scale).tolist()
    actual = landmarks[family['crownLandmark']][1]-landmarks[family['soleLandmark']][1]
    if abs(actual-height) > .01:
        raise PeopleError('unsupported-shape', family['statureControl'], 'Anatomical landmarks do not preserve the requested stature.')
    rest, inverse = rest_hierarchy(family, landmarks)
    return {'recipe': recipe, 'canonicalPositions': positions, 'landmarks': landmarks,
            'statureMetres': height, 'scale': scale, 'restMatrices': rest, 'inverseBindMatrices': inverse}


def direction_rotation(a, b):
    a, b = np.asarray(a, dtype=float), np.asarray(b, dtype=float)
    al, bl = np.linalg.norm(a), np.linalg.norm(b)
    if min(al, bl) < 1e-9:
        raise PeopleError('unsupported-shape', 'joint', 'The requested proportions collapse a joint.')
    a, b = a/al, b/bl
    xyz, w = np.cross(a, b), 1+np.dot(a, b)
    if w < 1e-8:
        xyz = np.array([0, -a[2], a[1]]) if abs(a[0]) < abs(a[2]) else np.array([-a[1], a[0], 0])
        w = 0
    q = np.r_[xyz, w]
    return q/np.linalg.norm(q)


def rotate_vector(q, v):
    v = np.asarray(v, dtype=float)
    t = 2*np.cross(q[:3], v)
    return v+q[3]*t+np.cross(q[:3], t)


def rest_hierarchy(family, landmarks):
    source = np.asarray(family['rig']['sourceRestMatrices'], dtype=float).reshape(-1, 4, 4).transpose(0, 2, 1)
    rest = np.tile(np.eye(4), (len(source), 1, 1)); inverse = rest.copy()
    for i, joint in enumerate(family['rig']['joints']):
        head, tail = (np.asarray(landmarks[joint[k]], dtype=float) for k in ['headLandmark', 'tailLandmark'])
        old_head, old_tail = (np.asarray(family['landmarks'][joint[k]]['position'], dtype=float) for k in ['headLandmark', 'tailLandmark'])
        q = direction_rotation(old_tail-old_head, tail-head)
        rotation = np.column_stack([rotate_vector(q, source[i, :3, axis]) for axis in range(3)])
        rest[i, :3, :3] = rotation; rest[i, :3, 3] = head
        inverse[i, :3, :3] = rotation.T; inverse[i, :3, 3] = -rotation.T@head
    return rest.transpose(0, 2, 1).astype(np.float32).reshape(-1), inverse.transpose(0, 2, 1).astype(np.float32).reshape(-1)


def triangle_basis(source, triangles):
    p = np.asarray(source, dtype=float).reshape(-1, 3)[np.asarray(triangles, dtype=np.int64).reshape(-1, 3)]
    ex = p[:, 1]-p[:, 0]; ez = np.cross(ex, p[:, 2]-p[:, 0])
    xl, zl = np.linalg.norm(ex, axis=1), np.linalg.norm(ez, axis=1)
    if np.any(xl < 1e-9) or np.any(zl < 1e-12):
        raise PeopleError('part-fit', 'attachment', 'The attachment frame collapsed.')
    ex, ez = ex/xl[:, None], ez/zl[:, None]
    return ex, np.cross(ez, ex), ez


def bind_surface(source, support_id, positions):
    """Author a surface fit once, using eligible canonical support triangles.

    This nearest-surface lookup is for clothing/hair authoring, never source
    vertex correspondence or runtime fitting. Region/side selection belongs to
    the caller; eligible subsets retain canonical vertex IDs and the full
    support topology pin.
    """
    from mathutils import Vector, interpolate
    from mathutils.bvhtree import BVHTree
    support = points(source['positions']).astype(float)
    queries = np.asarray(positions, dtype=float).reshape(-1, 3)
    triangles = np.asarray(source['triangles'], dtype=np.int64).reshape(-1, 3)
    if (not len(triangles) or not np.isfinite(support).all() or not np.isfinite(queries).all()
            or np.any(triangles < 0) or np.any(triangles >= len(support))):
        raise PeopleError('part-fit', support_id, 'Binding requires finite points and valid support triangles.')
    tree = BVHTree.FromPolygons(support.tolist(), triangles.tolist(), all_triangles=True)
    faces, locations = [], []
    for query in queries:
        location, _, face, _ = tree.find_nearest(Vector(query))
        if face is None:
            raise PeopleError('part-fit', support_id, 'No eligible support surface was found.')
        faces.append(face); locations.append(location)
    selected = triangles[np.asarray(faces, dtype=np.int64)]
    basis = triangle_basis(support, selected)
    barycentric = []
    for vertices, location in zip(selected, locations):
        shares = np.maximum(interpolate.poly_3d_calc([Vector(support[i]) for i in vertices], location), 0)
        total = float(np.sum(shares))
        if not math.isfinite(total) or total <= 0:
            raise PeopleError('part-fit', support_id, 'Support triangle could not produce finite barycentric weights.')
        # Closest-point roundoff must not create negative skin influences. The
        # complete residual below retains the authored point after this clamp.
        barycentric.append(shares / total)
    barycentric = flat(barycentric)
    origin = points(surface_points(support, selected, barycentric, np.zeros_like(queries))).astype(float)
    residual = queries - origin
    offsets = np.column_stack([np.sum(residual * axis, axis=1) for axis in basis])
    return {'kind': 'surface', 'support': support_id, 'topology': source['topology'],
            'triangles': selected.reshape(-1).tolist(), 'barycentric': barycentric.tolist(),
            'offsets': flat(offsets).tolist()}


def surface_skin_weights(binding, source_vertex_weights):
    """Interpolate named weights in canonical order; compiler owns cap/normalization."""
    triangles = np.asarray(binding['triangles'], dtype=np.int64).reshape(-1, 3)
    barycentric = points(binding['barycentric'])
    if len(triangles) != len(barycentric):
        raise PeopleError('part-fit', binding['support'], 'Binding triangle and weight counts differ.')
    output = []
    for vertices, shares in zip(triangles, barycentric):
        weights = {}
        for vertex, share in zip(vertices, shares):
            if share == 0:
                continue
            for joint, weight in source_vertex_weights[int(vertex)].items():
                weights[joint] = weights.get(joint, 0) + float(share) * weight
        output.append(weights)
    return output


def fit_parts(family, evaluated, parts=(), variants=None):
    """Fit declared parts in dependency order; matching masks only affect drawing."""
    selected = set(parts)
    for role, options in family['selectionParts'].items():
        selected.update(options[evaluated['recipe']['selections'][role]])
    selected = sorted(selected, key=lambda p: (required(family['parts'], p, 'part-fit')['stage'], p))
    positions = evaluated['canonicalPositions']; landmarks = evaluated['landmarks']; scale = evaluated['scale']
    recipe = evaluated['recipe']; frame = recipe['controls'][family['frameControl']]; age = recipe['controls'][family['ageControl']]
    face = family['facePresets'][recipe['selections'][family['faceSelectionRole']]]
    hidden = {}; active_meshes = list(family['bodyMeshes']); fitted = []; variants = variants or {}; part_meshes = set(); part_variants = {}
    unselected = set(variants)-set(selected)
    if unselected:
        raise PeopleError('part-fit', sorted(unselected)[0], 'An explicit cut names a part that is not selected.')
    for part_id in selected:
        part = family['parts'][part_id]; explicit = variants.get(part_id)
        support = part.get('requiredSupportPart')
        if support and not any(pid == support and prior['stage'] < part['stage'] for pid, prior in fitted):
            raise PeopleError('part-fit', part_id, 'The required inner garment is missing.')
        def compatible(candidate):
            return all(bounds[0] <= recipe['controls'][control] <= bounds[1] for control, bounds in candidate.get('bounds', {}).items()) and all(prior['region'] != part['region'] or prior['layerClass'] in candidate['compatibleInnerLayers'] for _, prior in fitted)
        cuts = [required(part['variants'], key, 'part-fit') for key in ([explicit] if explicit is not None else part['variantOrder'])] if 'variants' in part else ([part] if explicit is None else [])
        variant = next((v for v in cuts if compatible(v)), None)
        if variant is None:
            raise PeopleError('part-fit', part_id, 'No garment cut fits these proportions and inner layers.')
        part_variants[part_id] = variant
        for piece in variant['pieces']:
            mesh_id, binding = piece['meshId'], piece['fit']
            if mesh_id in part_meshes:
                raise PeopleError('part-fit', part_id, 'Two parts request the same component mesh.')
            part_meshes.add(mesh_id)
            if binding['kind'] == 'rigid':
                anchors = np.asarray([landmarks[k] for k in binding['anchors']], dtype=float)
                ex, ey, ez = triangle_basis(anchors, [0, 1, 2])
                positions[mesh_id] = (anchors[0]+(points(binding['localPositions'])*scale)@np.stack([ex[0], ey[0], ez[0]])).astype(np.float32).reshape(-1)
            else:
                support_id = binding['support']; source = family['meshes'][support_id]
                if source['topology'] != binding['topology']:
                    raise PeopleError('part-fit', part_id, 'Binding support topology differs.')
                shaped = evaluate_mesh(family, mesh_id, recipe, frame, age, face)
                delta = points(shaped).astype(float)-points(family['meshes'][mesh_id]['positions']).astype(float)
                basis = triangle_basis(source['positions'], binding['triangles'])
                offsets = points(binding['offsets']).astype(float)+np.column_stack([np.sum(delta*axis, axis=1) for axis in basis])
                positions[mesh_id] = surface_points(positions[support_id], binding['triangles'], binding['barycentric'], offsets*scale)
            active_meshes.append(mesh_id)
        for mask in variant['hiddenRegions']:
            mesh = family['meshes'].get(mask['meshId'])
            if mesh is None or mesh['topology'] != mask['topology']:
                continue  # An inapplicable mask must never erase unrelated anatomy.
            faces = hidden.setdefault(mask['meshId'], set())
            for region in mask['regions']:
                faces.update(required(mesh['regions'], region, 'part-fit'))
        fitted.append((part_id, part))
    normals = {key: mesh_normals(p, family['meshes'][key]['triangles']) for key, p in positions.items()}
    seam_groups = {}
    for seam in family['seams']:
        for i, j in zip(seam['bodyVertices'], seam['headVertices']):
            left, right = (seam['bodyMesh'], i), (seam['headMesh'], j)
            group = seam_groups.setdefault(left, {left: None})
            other = seam_groups.setdefault(right, {right: None})
            if group is other: continue
            if len(group) < len(other): group, other = other, group
            for member in other:
                group[member] = None
                seam_groups[member] = group
    # Shared pair vertices must contribute their original normal only once;
    # sequential pair writes can break an earlier declared seam agreement.
    seen_groups = set()
    for group in seam_groups.values():
        if id(group) in seen_groups: continue
        seen_groups.add(id(group))
        value = sum((points(normals[mesh])[vertex].astype(float) for mesh, vertex in group), np.zeros(3))
        length = np.linalg.norm(value)
        if length > 1e-12:
            for mesh, vertex in group: points(normals[mesh])[vertex] = value/length
    evaluated.update(selectedParts=selected, partVariants=part_variants, activeMeshes=list(dict.fromkeys(active_meshes)), hiddenFaces=hidden, canonicalNormals=normals)
    return evaluated


def source_file(root, entry):
    relative = Path(entry['path'])
    if relative.is_absolute() or '..' in relative.parts:
        raise PeopleError('missing-source', str(relative), 'Source path must stay inside its admitted workspace.')
    path = (root/relative).resolve()
    if root != path and root not in path.parents:
        raise PeopleError('missing-source', str(relative), 'Source escaped its admitted workspace.')
    if not path.is_file():
        raise PeopleError('missing-source', str(relative), 'Source file is unavailable.')
    if entry.get('bytes') != path.stat().st_size or hashlib.sha256(path.read_bytes()).hexdigest() != entry.get('sha256'):
        raise PeopleError('missing-source', str(relative), 'Source bytes differ from their exact input description.')
    return path


def load_family(path):
    """An explicit local package is admitted once; never download or execute metadata."""
    path = Path(path).expanduser().resolve()
    try:
        document = json.loads(path.read_text())
        root = path.parent
        compiled_path = source_file(root, document['compiled'])
        family = json.loads(compiled_path.read_text())
        profile = json.loads(source_file(root, document['profile']).read_text())
        master = source_file(root, document['master'])
        if family['reference'] != document['reference']:
            raise PeopleError('missing-source', 'family', 'Compiled family and manifest references differ.')
        for material_id, material in family['materials'].items():
            if 'alphaCutoff' in material:
                cutoff = material['alphaCutoff']
                if isinstance(cutoff, bool) or not isinstance(cutoff, (int, float)) or not math.isfinite(cutoff) or not 0 <= cutoff <= 1:
                    raise PeopleError('missing-source', material_id, 'Alpha cutoff must be between zero and one.')
            if 'doubleSided' in material and type(material['doubleSided']) is not bool:
                raise PeopleError('missing-source', material_id, 'Double-sided material must be true or false.')
        meshes = family['meshes']
        if not isinstance(meshes, dict):
            raise PeopleError('missing-source', 'meshes', 'Expected a canonical mesh table.')
        for key, mesh in meshes.items():
            p = flat(mesh['positions']); indices = np.asarray(mesh['triangles'], dtype=np.int64)
            if len(p) % 3 or not np.isfinite(p).all() or len(indices) % 3 or np.any(indices < 0) or np.any(indices >= len(p)//3):
                raise PeopleError('missing-source', key, 'Canonical geometry is malformed.')
            if not isinstance(mesh['targets'], dict) or len(mesh['frameDelta']) != len(p) or any(len(t) != len(p) for t in mesh['targets'].values()):
                raise PeopleError('missing-source', key, 'Shape target correspondence differs.')
        # Python negative indexing would silently choose a different sole point.
        # Admit this new execution data once, before fitting trusted local arrays.
        joints = family['rig']['joints']
        for part_id, part in family['parts'].items():
            for variant in [part, *part.get('variants', {}).values()]:
                for piece in variant['pieces']:
                    if 'groundSupport' not in piece:continue
                    support = piece['groundSupport']; mesh = meshes[piece['meshId']]
                    foot = support['foot']; vertices = support['vertices']; count = len(mesh['positions'])//3
                    if (type(foot) is not int or not 0 <= foot < len(joints) or 'secondaryPart' in joints[foot] or
                        ('motion' in family and not any(leg['foot'] == foot for leg in family['motion']['legs']))):
                        raise PeopleError('missing-source', part_id, 'Ground support requires an anatomical foot.')
                    if not isinstance(vertices,list) or not vertices or any(type(v) is not int or not 0 <= v < count for v in vertices):
                        raise PeopleError('missing-source', part_id, 'Ground support requires canonical sole vertices.')
                    mapping = mesh.get('sourceVertexIndices', range(count)); wanted = set(vertices)
                    rows = [row for row, vertex in enumerate(mapping) if vertex in wanted]
                    if not wanted.issubset(mapping):
                        raise PeopleError('missing-source', part_id, 'Ground support requires rendered sole vertices.')
                    indices, weights = mesh.get('jointIndices',[]), mesh.get('jointWeights',[])
                    if len(indices) != len(mapping)*4 or len(weights) != len(mapping)*4:
                        raise PeopleError('missing-source', part_id, 'Ground support requires complete skin data.')
                    for row in rows:
                        if not any(weight > 0 for weight in weights[row*4:row*4+4]):
                            raise PeopleError('missing-source', part_id, 'Ground support requires skinned sole vertices.')
                        for joint,weight in zip(indices[row*4:row*4+4],weights[row*4:row*4+4]):
                            if (type(joint) is not int or not 0 <= joint < len(joints) or not isinstance(weight,(int,float)) or
                                not math.isfinite(weight) or weight < 0 or (weight > 0 and 'secondaryPart' in joints[joint])):
                                raise PeopleError('missing-source', part_id, 'Ground support skin must use anatomical joints.')
        return {'manifest': document, 'root': root, 'compiled': family, 'profile': profile, 'master': master}
    except PeopleError:
        raise
    except (OSError, ValueError, KeyError, TypeError) as error:
        raise PeopleError('missing-source', str(path), f'Cannot read the selected family package: {error}') from error


def compile_family(master, descriptor, output, reference):
    """Compile canonical Blender meshes once; all people use these same arrays."""
    import bpy
    from mathutils import Matrix, Vector
    bpy.ops.wm.open_mainfile(filepath=str(master), load_ui=False)
    result = copy.deepcopy(descriptor['family'])
    if 'reference' in result:
        raise PeopleError('missing-source', 'descriptor', 'Authored descriptors omit their own source release identity.')
    result['reference'] = copy.deepcopy(reference)
    result['meshes'] = {}
    joints = [j['id'] for j in result['rig']['joints']]
    # The pinned engine linearly samples components before normalizing a quaternion.
    # Continuous signs preserve the source bend plane between physically equivalent keys.
    # docs/projects/people-from-parts-authoring-contract.md#geometry-evaluation
    if 'motion' in result:
        for clip in result['motion']['clips']:
            rotations = np.asarray(clip['localRotations'], dtype=float).reshape(-1, len(joints), 4)
            for frame in range(1, len(rotations)):
                reverse = np.sum(rotations[frame-1] * rotations[frame], axis=1) < 0
                rotations[frame, reverse] *= -1
            clip['localRotations'] = rotations.reshape(-1).tolist()
    drawable = set(result['bodyMeshes'])
    for part in result['parts'].values():
        for variant in [part, *part.get('variants', {}).values()]:
            drawable.update(piece['meshId'] for piece in variant['pieces'])
    c = Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, -1, 0, 0), (0, 0, 0, 1)))
    for mesh_id, source in descriptor['objects'].items():
        obj = bpy.data.objects.get(source['object'])
        if not obj or obj.type != 'MESH':
            raise PeopleError('missing-source', mesh_id, 'The declared master mesh is absent.')
        transform = c @ obj.matrix_world
        mesh = obj.data
        # Exporter's silent geometry repair would invalidate canonical face/UV
        # correspondence. Abort this in-memory load; never save repaired indices.
        if mesh.validate(clean_customdata=False):
            raise PeopleError('missing-source', mesh_id, 'Canonical mesh geometry is invalid; repair and qualify the source before compiling.')
        keys = mesh.shape_keys.key_blocks if mesh.shape_keys else None
        basis = keys[0].data if keys else mesh.vertices
        positions = np.asarray([transform @ v.co for v in basis], dtype=np.float32)
        mesh.calc_loop_triangles()
        triangles = [i for tri in mesh.loop_triangles for i in tri.vertices]
        entry = copy.deepcopy(source.get('metadata', {}))
        entry.update(positions=positions.reshape(-1).tolist(), triangles=triangles,
                     topology=hashlib.sha256(np.asarray(triangles, dtype='<u4').tobytes()).hexdigest())
        anchors = {keys[0].name: positions} if keys else {}
        def delta(name, *, relative=True):
            if name is None:
                return np.zeros_like(positions).reshape(-1).tolist()
            if not keys or name not in keys:
                raise PeopleError('missing-source', name, 'The declared shape key is absent.')
            key = keys[name]
            values = np.asarray([transform @ v.co for v in key.data], dtype=np.float32)
            # Sculpt/face/age targets are offsets from their authored neutral
            # anchor. Subtracting Basis adds the frame twice for a frame-relative
            # target. The frame itself is the complete endpoint from Basis.
            anchor = key.relative_key if relative else None
            if anchor is not None and anchor.name not in anchors:
                anchors[anchor.name] = np.asarray([transform @ v.co for v in anchor.data], dtype=np.float32)
            base = anchors[anchor.name] if anchor is not None else positions
            if not relative:anchors[key.name] = values
            return (values-base).reshape(-1).tolist()
        entry['frameDelta'] = delta(source.get('frame'), relative=False)
        entry['targets'] = {target: delta(shape) for target, shape in source.get('targets', {}).items()}
        entry.setdefault('regions', {})
        weights_obj = bpy.data.objects.get(source.get('weightsObject', obj.name))
        if mesh_id in drawable and (not weights_obj or len(weights_obj.data.vertices) != len(mesh.vertices)):
            raise PeopleError('missing-source', mesh_id, 'Skin-weight source correspondence differs.')
        uv = mesh.uv_layers.active
        render = {}; source_indices = []; coords = []; indices = []; joint_indices = []; joint_weights = []
        for tri in mesh.loop_triangles:
            for loop in tri.loops:
                vertex = mesh.loops[loop].vertex_index
                # Preserve native Blender UVs (bottom origin); the browser's
                # ImageBitmap decoder flips pixels, while glTF export flips V.
                tex = tuple(uv.data[loop].uv) if uv else (0, 0)
                key = (vertex, *tex)
                if key not in render:
                    render[key] = len(source_indices); source_indices.append(vertex); coords.extend(tex)
                    weighted = [(joints.index(weights_obj.vertex_groups[g.group].name), g.weight)
                                for g in weights_obj.data.vertices[vertex].groups
                                if weights_obj.vertex_groups[g.group].name in joints and g.weight > 0] if mesh_id in drawable else []
                    weighted.sort(key=lambda v: -v[1]); weighted = weighted[:4]
                    total = sum(w for _, w in weighted)
                    if mesh_id in drawable and total <= 0:
                        raise PeopleError('missing-source', mesh_id, 'A render vertex lacks usable skin weights.')
                    weighted += [(0, 0)]*(4-len(weighted))
                    joint_indices.extend(j for j, _ in weighted)
                    joint_weights.extend(w/total if total else 0 for _, w in weighted)
                indices.append(render[key])
        entry.update(sourceVertexIndices=source_indices, renderTriangles=indices)
        if mesh_id in drawable:
            entry.update(jointIndices=joint_indices, jointWeights=joint_weights)
        if uv:
            entry['uvs'] = coords
        result['meshes'][mesh_id] = entry
    out = external_output(output)
    if out.exists():
        raise PeopleError('export-check', str(out), 'Refusing to overwrite an earlier compiled family.')
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, separators=(',', ':'), allow_nan=False)+'\n')
    return result


def compile_motion(path, joint_ids, root_joint, legs, clip_options, secondary_joints=None):
    """Sample an exact prepared GLB without applying posture or retargeting again.

    Node transforms, including non-joint ancestors of the root, are consumed in
    glTF coordinates. This preserves source rest-local orientation rather than
    confusing Blender's pose-channel delta with a complete local quaternion.
    """
    import struct
    from mathutils import Matrix, Quaternion, Vector
    if any(not leg.get('soleProbes') for leg in legs):
        raise PeopleError('motion-fit', 'sole probes', 'Each planted leg requires anatomical skin probes.')
    raw = Path(path).read_bytes()
    if raw[:4] != b'glTF':
        raise PeopleError('missing-source', str(path), 'Prepared motion must be GLB.')
    offset = 12; doc = None; binary = None
    while offset < len(raw):
        size, kind = struct.unpack_from('<II', raw, offset); block = raw[offset+8:offset+8+size]; offset += 8+size
        if kind == 0x4E4F534A:
            doc = json.loads(block)
        elif kind == 0x004E4942:
            binary = block
    if doc is None or binary is None:
        raise PeopleError('missing-source', str(path), 'Motion GLB lacks its JSON or binary chunk.')
    def accessor(index):
        a = doc['accessors'][index]; view = doc['bufferViews'][a['bufferView']]
        width = {'SCALAR': 1, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[a['type']]
        if a['componentType'] != 5126 or 'sparse' in a:
            raise PeopleError('missing-source', str(index), 'Prepared animation accessors must be dense floats.')
        start = view.get('byteOffset', 0)+a.get('byteOffset', 0)
        stride = view.get('byteStride', width*4)
        return np.ndarray((a['count'], width), dtype='<f4', buffer=binary, offset=start, strides=(stride, 4)).copy()
    node_ids = {n.get('name'): i for i, n in enumerate(doc['nodes'])}
    # Extra attachment joints are an explicit authored declaration, not an
    # automatic repair for a misspelt source bone. Never mutate the source GLB.
    additions = secondary_joints or {}
    if set(additions)-set(joint_ids):
        raise PeopleError('motion-fit', 'secondary joints', 'A declared secondary joint is not in the target hierarchy.')
    for name in (name for name in joint_ids if name in additions):
        if name in node_ids:
            raise PeopleError('motion-fit', name, 'A secondary declaration cannot replace an existing source joint.')
        definition = additions[name]
        parent = required(definition, 'parent', 'motion-fit')
        if parent not in joint_ids or parent not in node_ids:
            raise PeopleError('motion-fit', name, 'The secondary parent must be an earlier declared or source joint.')
        values = np.asarray(required(definition, 'localMatrix', 'motion-fit'), dtype=float)
        if values.shape != (16,) or not np.isfinite(values).all():
            raise PeopleError('motion-fit', name, 'The secondary rest matrix must contain sixteen finite values.')
        local = Matrix(values.reshape(4, 4).T.tolist())
        rotation = values.reshape(4, 4).T[:3, :3]
        if (np.max(np.abs(rotation.T@rotation-np.eye(3))) > 1e-4 or local.to_3x3().determinant() <= 0
                or max(abs(local[3][i]-(1 if i == 3 else 0)) for i in range(4)) > 1e-6):
            raise PeopleError('motion-fit', name, 'The secondary rest matrix must be a proper unit-scale transform.')
        node_ids[name] = len(doc['nodes'])
        doc['nodes'][node_ids[parent]].setdefault('children', []).append(node_ids[name])
        doc['nodes'].append({'name': name, 'matrix': values.tolist()})
    ids = [required(node_ids, name, 'motion-fit') for name in joint_ids]
    parents = {child: parent for parent, node in enumerate(doc['nodes']) for child in node.get('children', [])}
    motion_nodes = set(ids)
    for node in ids:
        parent = parents.get(node)
        while parent is not None and parent not in motion_nodes:
            motion_nodes.add(parent)
            parent = parents.get(parent)
    def trs(node, values=None):
        if values is None and 'matrix' in node:
            return Matrix(np.asarray(node['matrix']).reshape(4, 4).T.tolist())
        values = values or {}
        t = values.get('translation', node.get('translation', [0, 0, 0]))
        r = values.get('rotation', node.get('rotation', [0, 0, 0, 1]))
        s = values.get('scale', node.get('scale', [1, 1, 1]))
        return Matrix.LocRotScale(Vector(t), Quaternion((r[3], r[0], r[1], r[2])), Vector(s))
    def world_matrices(overrides=None):
        overrides = overrides or {}; result = {}
        def get(index):
            if index not in result:
                local = trs(doc['nodes'][index], overrides.get(index))
                result[index] = get(parents[index]) @ local if index in parents else local
            return result[index]
        return [get(index) for index in ids]
    source_rest = world_matrices()
    parent_joints = [ids.index(parents[node]) if parents.get(node) in ids else -1 for node in ids]
    rest_locals = [source_rest[parent].inverted()@matrix if parent >= 0 else matrix
                   for parent, matrix in zip(parent_joints, source_rest)]
    for name, local in zip(joint_ids, rest_locals):
        if max(abs(value-1) for value in local.to_scale()) > 1e-4:
            raise PeopleError('motion-fit', name, 'Normalize source joint scales before motion compilation.')
    clips = []; reference = {}
    for animation in doc.get('animations', []):
        name = animation.get('name')
        if name not in clip_options:
            continue
        channels = []; times = set()
        for channel in animation['channels']:
            sampler = animation['samplers'][channel['sampler']]
            if sampler.get('interpolation', 'LINEAR') not in ('LINEAR', 'STEP'):
                raise PeopleError('motion-fit', name, 'Prepared motion must be linearly sampled before compilation.')
            ts = accessor(sampler['input']).reshape(-1); values = accessor(sampler['output'])
            if (sampler.get('interpolation') == 'STEP' and channel['target']['node'] in motion_nodes
                    and channel['target']['path'] in ('translation', 'rotation', 'scale')):
                same = np.all(values == values[0], axis=1)
                if channel['target']['path'] == 'rotation':
                    same |= np.all(values == -values[0], axis=1)
                if not np.all(same):
                    raise PeopleError('motion-fit', name, 'Changing STEP transforms require a linearly sampled source.')
            channels.append((channel['target']['node'], channel['target']['path'], ts, values, sampler.get('interpolation', 'LINEAR')))
            times.update(map(float, ts))
        times = sorted(times)
        if len(times) < 2:
            raise PeopleError('motion-fit', name, 'Prepared motion needs at least two timed samples.')
        rotations = []; roots = []; source_positions = []; source_rotations = []
        for t in times:
            overrides = {}
            for node, prop, ts, values, interpolation in channels:
                index = min(int(np.searchsorted(ts, t, side='right'))-1, len(ts)-1); index = max(index, 0)
                value = values[index]
                if index+1 < len(ts) and interpolation != 'STEP':
                    # Another channel can start earlier. glTF holds the first
                    # sample outside this channel's range; it never extrapolates.
                    weight = max(0, min(1, (t-ts[index])/(ts[index+1]-ts[index])))
                    if prop == 'rotation':
                        a, b = values[index], values[index+1]
                        q = Quaternion((a[3], *a[:3])).slerp(Quaternion((b[3], *b[:3])), float(weight))
                        value = np.array([q.x, q.y, q.z, q.w])
                    else:
                        value = (1-weight)*value+weight*values[index+1]
                overrides.setdefault(node, {})[prop] = value
            world = world_matrices(overrides)
            for j, (node, matrix) in enumerate(zip(ids, world)):
                parent_joint = parent_joints[j]
                local = world[parent_joint].inverted() @ matrix if parent_joint >= 0 else matrix
                # Runtime reconstructs children from fixed rest offsets and unit
                # rotations. Refuse channels it cannot represent instead of
                # silently dropping translations or animated scale at export.
                if j != root_joint and (local.translation-rest_locals[j].translation).length > 1e-5:
                    raise PeopleError('motion-fit', name, f'Non-root translation animates on {joint_ids[j]}.')
                if max(abs(value-1) for value in local.to_scale()) > 1e-4:
                    raise PeopleError('motion-fit', name, f'Unsupported scale animates on {joint_ids[j]}.')
                q = local.to_quaternion().normalized(); rotations.extend([q.x, q.y, q.z, q.w])
                qw = matrix.to_quaternion().normalized();source_rotations.extend([qw.x, qw.y, qw.z, qw.w]);source_positions.extend(matrix.translation)
            roots.extend(world[root_joint].translation)
        options = clip_options[name]
        # Prepared files may begin at Blender frame one. Keep their sample
        # instants during decoding, then publish the same keys from time zero.
        timeline = [t-times[0] for t in times]
        support = list(options.get('supportTimes',timeline))
        if (len(support) < 2 or not all(isinstance(t,(int,float)) and not isinstance(t,bool) and math.isfinite(t) for t in support)
                or support[0] != 0 or support[-1] != timeline[-1]
                or any(b <= a for a,b in zip(support,support[1:])) or not set(timeline).issubset(support)):
            raise PeopleError('motion-fit', name, 'Support keys must retain the complete source timeline and duration.')
        clips.append({'name': name, 'times': timeline, 'supportTimes': support, 'loop': options['loop'], 'stride': options['stride'],
                      'localRotations': rotations, 'rootPositions': roots,
                      **({'groundSpeed': options['groundSpeed']} if 'groundSpeed' in options else {})})
        reference[name] = {'times': timeline, 'worldPositions': source_positions, 'worldRotations': source_rotations}
    missing = set(clip_options)-{c['name'] for c in clips}
    if missing:
        raise PeopleError('motion-fit', sorted(missing)[0], 'A requested prepared source clip is absent.')
    rigid_rest = [Matrix.LocRotScale(m.translation, m.to_quaternion().normalized(), Vector((1, 1, 1))) for m in source_rest]
    motion = {'sourceRestMatrices': [v for m in rigid_rest for col in m.transposed() for v in col],
              'rootJoint': root_joint, 'legs': legs, 'clips': clips}
    return motion, reference


def _motion_multiply(a, b):
    return (a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],
            a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],
            a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],
            a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2])


def _motion_inverse(q):
    return (-q[0], -q[1], -q[2], q[3])


def _motion_normalize(q):
    size = math.sqrt(sum(value*value for value in q))
    return tuple(value/size for value in q)


def _motion_slerp(first, second, amount):
    a, b = _motion_normalize(first), _motion_normalize(second)
    cosine = sum(x*y for x, y in zip(a, b))
    if cosine < 0:
        b, cosine = tuple(-value for value in b), -cosine
    cosine = min(1, cosine)
    if cosine > .9995:
        return _motion_normalize(tuple(x+amount*(y-x) for x, y in zip(a, b)))
    angle = math.acos(cosine); divisor = math.sin(angle)
    x, y = math.sin((1-amount)*angle)/divisor, math.sin(amount*angle)/divisor
    return _motion_normalize(tuple(x*av+y*bv for av, bv in zip(a, b)))


def _secondary_rules(family, evaluated):
    selected = set(evaluated.get('selectedParts', []))
    return [rule for rule in family.get('secondaryMotion', []) if rule['part'] in selected]


def bake_secondary_motion(family, evaluated, clips):
    """Bake a fixed authored rotation response after final body/contact fitting.

    Eight bounded warm-up cycles settle loops. Unmodified fitted locals drive
    every pass, so this never compounds a previous bake or simulates at runtime.
    """
    from mathutils import Matrix
    rules = _secondary_rules(family, evaluated)
    if not rules:
        return clips
    joints = family['rig']['joints']; count = len(joints)
    rest = [Matrix(row.T.tolist()).to_quaternion().normalized()
            for row in np.asarray(evaluated['restMatrices']).reshape(-1, 4, 4)]
    rest = [(q.x, q.y, q.z, q.w) for q in rest]
    by_joint = {rule['joint']: dict(rule, restOffset=_motion_multiply(_motion_inverse(rest[rule['driver']]), rest[rule['joint']])) for rule in rules}
    influenced = []; affected = []
    for joint, definition in enumerate(joints):
        parent = definition['parent']
        influenced.append(joint in by_joint or parent >= 0 and influenced[parent])
        if influenced[-1]:affected.append(joint)
    external_ids = set()
    for joint in affected:
        parent = joints[joint]['parent']; rule = by_joint.get(joint)
        if parent >= 0 and not influenced[parent]:external_ids.add(parent)
        if rule and not influenced[rule['driver']]:external_ids.add(rule['driver'])
    ancestors = set()
    for joint in external_ids:
        while joint >= 0 and joint not in ancestors:
            ancestors.add(joint); joint = joints[joint]['parent']
    prepared_joints = sorted(ancestors)
    for clip in clips:
        baseline = np.asarray(clip['localRotations'], dtype=np.float32).reshape(-1, count, 4)
        output = baseline.copy(); times = clip['times']
        frames = len(times)-1 if clip['loop'] else len(times)
        cycles = 8 if clip['loop'] else 1; states = {}
        # Prepare only external drivers/parents and their ancestors once.
        # Core forward kinematics does not change between warm-up passes.
        external = {joint: [] for joint in external_ids}
        for frame in range(frames):
            worlds = [None]*count
            for joint in prepared_joints:
                parent = joints[joint]['parent']; local = tuple(map(float, baseline[frame, joint]))
                worlds[joint] = local if parent < 0 else _motion_multiply(worlds[parent], local)
            for joint in external:external[joint].append(worlds[joint])
        worlds = [None]*count
        for cycle in range(cycles):
            for frame in range(frames):
                dt = times[frame]-times[frame-1] if frame else clip['duration']-times[frames-1] if clip['loop'] else 0
                for joint, values in external.items():worlds[joint] = values[frame]
                for joint in affected:
                    definition = joints[joint]
                    parent = definition['parent']; rule = by_joint.get(joint)
                    if rule is None:
                        local = tuple(map(float, baseline[frame, joint]))
                        worlds[joint] = local if parent < 0 else _motion_multiply(worlds[parent], local)
                        continue
                    desired = _motion_normalize(_motion_multiply(worlds[rule['driver']], rule['restOffset']))
                    previous = states.get(joint, desired)
                    filtered = _motion_slerp(previous, desired, 1-math.exp(-dt/rule['lagSeconds']))
                    distance = 2*math.acos(min(1, abs(sum(x*y for x, y in zip(filtered, desired)))))
                    if distance > rule['maxAngleRadians']:
                        filtered = _motion_slerp(desired, filtered, rule['maxAngleRadians']/distance)
                    states[joint] = filtered; worlds[joint] = filtered
                    if cycle == cycles-1:
                        local = _motion_normalize(_motion_multiply(_motion_inverse(worlds[parent]), filtered))
                        if frame and sum(float(x)*y for x, y in zip(output[frame-1, joint], local)) < 0:
                            local = tuple(-value for value in local)
                        output[frame, joint] = local
        if clip['loop']:
            for rule in rules:
                first = output[0, rule['joint']]
                sign = -1 if np.dot(output[-2, rule['joint']], first) < 0 else 1
                output[-1, rule['joint']] = first*sign
        clip['localRotations'] = output.reshape(-1).tolist()
    return clips


def _ground_supports(evaluated):
    """Only fitted, selected cuts own support; anatomy and stature stay barefoot."""
    return [dict(piece['groundSupport'], meshId=piece['meshId'])
            for variant in evaluated.get('partVariants', {}).values()
            for piece in variant['pieces'] if 'groundSupport' in piece]


def person_support_offset(evaluated):
    minimum = min((evaluated['canonicalPositions'][support['meshId']][vertex*3+1]
                   for support in _ground_supports(evaluated) for vertex in support['vertices']), default=0)
    return max(0, -float(minimum))


def _ground_support_key(evaluated):
    return tuple((support['foot'], support['meshId'], tuple((vertex, *evaluated['canonicalPositions'][support['meshId']][vertex*3:vertex*3+3])
                                                          for vertex in support['vertices']))
                 for support in _ground_supports(evaluated))


def _prepare_skin_probes(family, evaluated, target_rest, refs):
    """Resolve canonical refs through existing render splits once per whole fit."""
    from mathutils import Vector
    canonical = required(evaluated, 'canonicalPositions', 'motion-fit')
    wanted = {}
    for probe in refs:wanted.setdefault(probe['meshId'], set()).add(probe['vertex'])
    rows = {}
    for mesh_id, vertices in wanted.items():
        mesh = family['meshes'][mesh_id]; mapped = {}
        if 'sourceVertexIndices' in mesh:
            for row, vertex in enumerate(mesh['sourceVertexIndices']):
                if vertex in vertices:mapped.setdefault(vertex, []).append(row)
        else:mapped = {vertex: [vertex] for vertex in vertices}
        rows[mesh_id] = mapped
    result = []
    for probe in refs:
        mesh_id, vertex = probe['meshId'], probe['vertex']; mesh = family['meshes'][mesh_id]
        x,y,z = canonical[mesh_id][vertex*3:vertex*3+3]; point = Vector((x,-z,y)); variants = {}
        for row in rows[mesh_id][vertex]:
            influences = []; key = []
            for joint, weight in zip(mesh['jointIndices'][row*4:row*4+4], mesh['jointWeights'][row*4:row*4+4]):
                if weight:
                    # The renderer's existing skin buffer stores float32 weights.
                    weight = float(np.float32(weight))
                    offset = target_rest[joint].to_quaternion().inverted()@(point-target_rest[joint].translation)
                    influences.append((joint, weight, offset)); key.append((joint,weight))
            variants.setdefault(tuple(key), influences)
        result.append(list(variants.values()))
    return result


def _prepare_sole_probes(family, evaluated, target_rest):
    counts = []; refs = []
    for leg in family['motion']['legs']:
        probes = required(leg, 'soleProbes', 'motion-fit')
        if not probes:
            raise PeopleError('motion-fit', 'sole probes', 'Each planted leg requires anatomical skin probes.')
        counts.append(len(probes)); refs.extend(probes)
    bindings = _prepare_skin_probes(family, evaluated, target_rest, refs) if refs else []
    result = []; offset = 0
    for count in counts:
        result.append([variant for probe in bindings[offset:offset+count] for variant in probe]); offset += count
    return result


class _SoleSupport:
    """One setup-only numerical owner; source planting stays on its uniform grid."""
    def __init__(self, family, evaluated, source_rest, target_rest, art_helpers):
        self.family = family
        self.library = family['motion']; self.joints = family['rig']['joints']
        self.ids = [j['id'] for j in self.joints]; self.parents = [j['parent'] for j in self.joints]
        self.root = self.library['rootJoint']; self.legs = self.library['legs']; self.art = art_helpers
        self.rest = target_rest; self.source_heads = self._local_heads(source_rest)
        self.local_heads = self._local_heads(target_rest)
        self.probes = _prepare_sole_probes(family, evaluated, target_rest)
        changed = {i for leg in self.legs for i in [leg['thigh'], leg['shin']]}
        self.affected = {i for i,p in enumerate(self.parents) if i in changed or p in changed}

    def _local_heads(self, rest):
        return [matrix.translation.copy() if parent < 0 else rest[parent].to_quaternion().inverted()@
                (matrix.translation-rest[parent].translation) for matrix,parent in zip(rest,self.parents)]

    def _heads(self, rotations, root, local_heads):
        return_values = []
        for joint,parent in enumerate(self.parents):
            return_values.append(root if joint == self.root else local_heads[joint] if parent < 0 else
                                 return_values[parent]+rotations[parent]@local_heads[joint])
        return return_values

    def _pose(self, local, root, local_heads):
        from mathutils import Quaternion, Vector
        rotations = []
        for q,parent in zip(local,self.parents):
            rotation = Quaternion((q[3],q[0],-q[2],q[1]))
            rotations.append(rotation if parent < 0 else rotations[parent]@rotation)
        point = Vector((root[0],-root[2],root[1]))
        return rotations,self._heads(rotations,point,local_heads),point

    @staticmethod
    def _keys(clip, root):
        frames = len(clip['times']); rotations = np.asarray(clip['localRotations']).reshape(frames,-1,4)
        roots = (np.asarray(clip['rootPositions']).reshape(-1,3) if 'rootPositions' in clip else
                 np.asarray(clip['localTranslations']).reshape(frames,-1,3)[:,root])
        return np.asarray(clip['times']),rotations,roots

    @staticmethod
    def _sample(keys, time):
        times,rotations,roots = keys
        before = max(0,min(int(np.searchsorted(times,time,side='right'))-1,len(times)-1))
        if before == len(times)-1 or time == times[before]:return rotations[before].copy(),roots[before].copy()
        amount = float((time-times[before])/(times[before+1]-times[before]))
        local = np.asarray([_motion_slerp(a,b,amount) for a,b in zip(rotations[before],rotations[before+1])])
        return local,roots[before]+amount*(roots[before+1]-roots[before])

    @staticmethod
    def _height(probes, rotations, heads):
        return min(sum((heads[joint]+rotations[joint]@offset).z*weight
                       for joint,weight,offset in influences) for influences in probes)

    def _correct(self, local, root, source_keys, time, probes, support_offset):
        from mathutils import Vector, Quaternion
        rotations,heads,root_point = self._pose(local,root,self.local_heads)
        source_local,source_root = self._sample(source_keys,time)
        _,source_heads,_ = self._pose(source_local,source_root,self.source_heads)
        sides = []
        for leg in self.legs:
            axis = source_heads[leg['foot']]-source_heads[leg['thigh']]
            sides.append(self.art.perpendicular_component(source_heads[leg['shin']]-source_heads[leg['thigh']],axis.normalized())
                         if axis.length > 1e-9 else Vector())
        changed = False
        for iteration in range(4):
            corrected = False
            for index,(leg,side) in enumerate(zip(self.legs,sides)):
                minimum = self._height(probes[index],rotations,heads)+support_offset
                if minimum >= -1e-6:continue
                thigh,shin,foot = (leg[key] for key in ['thigh','shin','foot'])
                goal = heads[foot]+Vector((0,0,-minimum)); posed = dict(zip(self.ids,rotations))
                limit = (self.rest[foot].translation-self.rest[thigh].translation).length
                self.art.bend_leg(posed,self.ids[thigh],self.ids[shin],heads[thigh],heads[shin],heads[foot],goal,limit,side)
                rotations[thigh],rotations[shin] = posed[self.ids[thigh]],posed[self.ids[shin]]
                heads = self._heads(rotations,root_point,self.local_heads); corrected = changed = True
            if not corrected:break
        # Zero is still the target; this is float32 rounding allowance, not padding.
        if changed and any(self._height(leg,rotations,heads)+support_offset < -1e-5 for leg in probes):
            raise PeopleError('motion-fit','sole support','Sole guides remain below ground after fitting.')
        result = local.copy()
        if changed:
            for joint in self.affected:
                parent = self.parents[joint]
                q = rotations[parent].inverted()@rotations[joint] if parent >= 0 else rotations[joint]
                q = Quaternion((q.w,q.x,q.z,-q.y)).normalized(); result[joint] = [q.x,q.y,q.z,q.w]
        return result

    def fit(self, clips, evaluated):
        probes = [list(leg) for leg in self.probes]
        for support in _ground_supports(evaluated):
            leg = next((i for i, leg in enumerate(self.legs) if leg['foot'] == support['foot']), None)
            if leg is None:raise PeopleError('motion-fit', 'ground support foot', 'The fitted sole has no planted leg.')
            refs = [dict(meshId=support['meshId'], vertex=vertex) for vertex in support['vertices']]
            probes[leg].extend(variant for probe in _prepare_skin_probes(self.family, evaluated, self.rest, refs) for variant in probe)
        support_offset = person_support_offset(evaluated)
        result = []
        for clip in clips:
            source = next(c for c in self.library['clips'] if c['name'] == clip['name'])
            support_times = required(source,'supportTimes','motion-fit')
            fitted_keys = self._keys(clip,self.root); source_keys = self._keys(source,self.root)
            baseline = np.asarray(clip['localTranslations']).reshape(len(clip['times']),-1,3)
            rotations = []; translations = []
            for time in support_times:
                local,root = self._sample(fitted_keys,time)
                rotations.append(self._correct(local,root,source_keys,time,probes,support_offset))
                values = baseline[0].copy(); values[self.root] = root; translations.append(values)
            rotations = np.asarray(rotations,dtype=np.float32)
            for frame in range(1,len(rotations)):
                for joint in range(len(self.ids)):
                    if np.dot(rotations[frame-1,joint],rotations[frame,joint]) < 0:rotations[frame,joint] *= -1
            result.append(dict(clip,times=list(support_times),localRotations=rotations.reshape(-1).tolist(),
                               localTranslations=np.asarray(translations,dtype=np.float32).reshape(-1).tolist()))
        return result


def _fit_motion_base(family, evaluated, art_helpers, clip_names=None):
    """Reuse maintained native leg/plant solvers on compiled, already-corrected clips.

    glTF matrices are converted once to Blender's Z-up basis. Posture repair is
    deliberately absent: it belongs to source preparation, not each new wearer.
    """
    from types import SimpleNamespace
    from mathutils import Matrix, Quaternion, Vector
    library = required(family, 'motion', 'motion-fit')
    joints = family['rig']['joints']; ids = [j['id'] for j in joints]; count = len(ids)
    root_index = library['rootJoint']; root = ids[root_index]
    c = Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, -1, 0, 0), (0, 0, 0, 1))); inv = c.inverted()
    def make_rig(values):
        matrices = [inv@Matrix(row.T.tolist())@c for row in np.asarray(values).reshape(-1, 4, 4)]
        bones = []
        for i, (joint, matrix) in enumerate(zip(joints, matrices)):
            bones.append(SimpleNamespace(name=joint['id'], matrix_local=matrix, head_local=matrix.translation,
                                         parent=bones[joint['parent']] if joint['parent'] >= 0 else None))
        return bones, matrices
    source, sr = make_rig(library['sourceRestMatrices']); target, tr = make_rig(evaluated['restMatrices'])
    ratio = tr[root_index].translation.z/sr[root_index].translation.z
    leg_info = [(ids[l['thigh']], ids[l['shin']], ids[l['foot']], [ids[t] for t in l['toes']], l) for l in library['legs']]
    expected = set(clip_names) if clip_names else {clip['name'] for clip in library['clips']}
    if expected-{clip['name'] for clip in library['clips']}:
        raise PeopleError('motion-fit', 'clips', 'A requested motion clip is absent.')
    result = []
    for clip in library['clips']:
        if clip['name'] not in expected:
            continue
        times = np.asarray(clip['times'], dtype=float); steps = []
        for frame in range(len(times)):
            world = []
            for j, joint in enumerate(joints):
                q = clip['localRotations'][(frame*count+j)*4:(frame*count+j+1)*4]
                local = Quaternion((q[3], *q[:3])).to_matrix().to_4x4()
                local = inv@local@c
                rotation = local.to_quaternion()
                world.append(world[joint['parent']]@rotation if joint['parent'] >= 0 else rotation)
            source_head = inv@Vector(clip['rootPositions'][frame*3:frame*3+3])
            source_heads = art_helpers.joint_heads(source, dict(zip(ids, world)), {}, root, source_head)
            posed = {name: q@sm.to_quaternion().inverted()@tm.to_quaternion() for name, q, sm, tm in zip(ids, world, sr, tr)}
            head = tr[root_index].translation+(source_head-sr[root_index].translation)*ratio
            heads = art_helpers.joint_heads(target, posed, {}, root, head); goals = []; sides = []
            for thigh, shin, foot, toes, leg in leg_info:
                now = source_heads[foot]-source_heads[thigh]
                reach = sr[leg['foot']].translation-sr[leg['thigh']].translation
                rest_reach = tr[leg['foot']].translation-tr[leg['thigh']].translation
                goal = heads[thigh]+rest_reach+(now-reach)*ratio
                goal.z = max(goal.z, tr[leg['foot']].translation.z); goals.append(goal)
                sides.append(art_helpers.perpendicular_component(source_heads[shin]-source_heads[thigh], now.normalized()) if now.length > 1e-9 else Vector())
            steps.append((frame, posed, head, goals, sides))
        def solve(step):
            _, source_posed, head, goals, sides = step; posed = dict(source_posed)
            heads = art_helpers.joint_heads(target, posed, {}, root, head)
            for (thigh, shin, foot, toes, leg), goal, side in zip(leg_info, goals, sides):
                limit = (tr[leg['foot']].translation-tr[leg['thigh']].translation).length
                art_helpers.bend_leg(posed, thigh, shin, heads[thigh], heads[shin], heads[foot], goal, limit, side)
            heads = art_helpers.joint_heads(target, posed, {}, root, head)
            return posed, heads
        def toe_points(step):
            _, heads = solve(step)
            return [sum((heads[n] for n in toes), Vector())/len(toes) if toes else None for _, _, _, toes, _ in leg_info]
        planted = art_helpers.plant_feet(steps, Matrix.Identity(4), toe_points) if clip['stride'] and leg_info else None
        rotations = np.empty((len(times), count, 4), dtype=np.float32); translations = np.empty((len(times), count, 3), dtype=np.float32)
        for frame, step in enumerate(steps):
            posed, _ = solve(step)
            for j, joint in enumerate(joints):
                parent = joint['parent']; rotation = posed[ids[parent]].inverted()@posed[joint['id']] if parent >= 0 else posed[joint['id']]
                q = (c@rotation.to_matrix().to_4x4()@inv).to_quaternion().normalized()
                value = np.array([q.x, q.y, q.z, q.w])
                if frame and np.dot(value, rotations[frame-1, j]) < 0:value = -value
                rotations[frame, j] = value
                translation = step[2] if j == root_index else tr[parent].to_quaternion().inverted()@(tr[j].translation-tr[parent].translation) if parent >= 0 else tr[j].translation
                translations[frame, j] = c.to_3x3()@translation
        speed = clip.get('groundSpeed')
        if speed is not None:speed *= ratio
        # Existing prepared clips are uniformly sampled. Geometry fitting remains
        # correct for non-uniform keys; their authored travel speed is retained.
        if planted and len(times)>1 and np.allclose(np.diff(times), np.diff(times)[0], atol=1e-6):
            speed = planted[0]/(planted[1]*float(np.mean(np.diff(times))))
        result.append({'name':clip['name'], 'times':times.tolist(), 'duration':float(times[-1]), 'loop':clip['loop'],
                       'localRotations':rotations.reshape(-1).tolist(), 'localTranslations':translations.reshape(-1).tolist(),
                       **({'groundSpeed':speed} if speed is not None else {})})
    return result, _SoleSupport(family,evaluated,sr,tr,art_helpers)


def _fit_motion_core(family, evaluated, art_helpers, clip_names=None):
    baseline, support = _fit_motion_base(family,evaluated,art_helpers,clip_names)
    # Fixed support times sample the planted curve once, before secondary response.
    return support.fit(baseline,evaluated)


def fit_motion(family, evaluated, art_helpers, clip_names=None):
    """Fit one wearer's core clips, then bake its selected secondary response."""
    return bake_secondary_motion(family, evaluated,
                                 _fit_motion_core(family, evaluated, art_helpers, clip_names))


def _fit_motion_states(family, evaluated, art_helpers, states):
    """Fit one shared body/rest once, with private support/secondary keys per state.

    These states differ only by fitted part selection. Another part's active
    rule may drive visible hair, so covered companions need their own response.
    """
    baseline, support = _fit_motion_base(family, evaluated, art_helpers)
    by_support = {}; by_rules = {}; result = {}; shared_keys = None
    for name, state in states.items():
        support_key = _ground_support_key(state)
        if support_key not in by_support:
            supported = support.fit(baseline,state)
            if shared_keys is None:shared_keys = supported
            else:
                # Support changes only turns. Preserve one immutable sampled
                # clock/root/rest translation set across distinct sole responses.
                for clip, common in zip(supported,shared_keys):
                    clip['times'] = common['times']; clip['localTranslations'] = common['localTranslations']
            by_support[support_key] = supported
        supported = by_support[support_key]
        rules = tuple(rule['joint'] for rule in _secondary_rules(family, state))
        key = (support_key, rules)
        if key not in by_rules:
            # The bake replaces localRotations on private clip records. Times
            # and core translations remain immutable and shared across states.
            clips = [dict(clip) for clip in supported] if rules else supported
            by_rules[key] = bake_secondary_motion(family, state, clips)
        result[name] = by_rules[key]
    return result


def bake_materials(package, recipe, output, material_ids):
    """Bake selected age/pigment once through the shared opaque/cutout PBR contract."""
    import bpy
    output = external_output(output); output.mkdir(parents=True, exist_ok=True)
    family = package['compiled']; textures = package['manifest'].get('textures', {})
    loaded = {}; result = {}; age = recipe['controls'][family['ageControl']]
    def read_texture(texture):
        key = texture['path']
        if key not in loaded:
            entry = required(textures, key)
            if entry['reference'] != texture['reference']:
                raise PeopleError('missing-source', key, 'Texture reference differs from the admitted source.')
            image = bpy.data.images.load(str(source_file(package['root'], entry['file'])), check_existing=False)
            image.colorspace_settings.name = 'Non-Color'
            array = np.empty(image.size[0]*image.size[1]*4, dtype=np.float32); image.pixels.foreach_get(array)
            loaded[key] = (tuple(image.size), array.reshape(-1, 4))
            bpy.data.images.remove(image)
        return loaded[key]
    def linear(value):
        return np.where(value <= .04045, value/12.92, ((value+.055)/1.055)**2.4)
    def srgb(value):
        value = np.maximum(value, 0)
        return np.where(value <= .0031308, value*12.92, 1.055*value**(1/2.4)-.055)
    def mix_texture(a, b, weight, normal=False):
        size, pa = read_texture(a); other, pb = read_texture(b)
        if size != other:raise PeopleError('missing-source', a['path'], 'Age maps have different pixel dimensions.')
        data = pa.copy()
        if normal:
            value = (1-weight)*(pa[:, :3]*2-1)+weight*(pb[:, :3]*2-1)
            lengths = np.linalg.norm(value, axis=1); value /= np.maximum(lengths[:, None], 1e-8)
            data[:, :3] = (value+1)*.5
        else:data[:, :3] = srgb((1-weight)*linear(pa[:, :3])+weight*linear(pb[:, :3]))
        return size, data
    def save_image(material_id, role, size, values, normal=False):
        image = bpy.data.images.new(f'{material_id}-{role}', width=size[0], height=size[1], alpha=True)
        image.colorspace_settings.name = 'Non-Color' if normal else 'sRGB'
        image.pixels.foreach_set(np.asarray(values, dtype=np.float32).reshape(-1));image.update()
        image.filepath_raw = str(output/f'{material_id}-{role}.png'); image.file_format = 'PNG'; image.save(); image.pack()
        return image
    def resized_pixels(texture, size, color=False):
        original_size, values = texture
        if original_size == size:return values
        # Filter colour in linear space and keep alpha independent, like the
        # runtime's separate colour/coverage texture samples.
        if color:
            values = values.copy();values[:, :3] = linear(values[:, :3])
        image = bpy.data.images.new('Person coverage resample', width=original_size[0], height=original_size[1], alpha=True, float_buffer=True)
        try:
            image.colorspace_settings.name = 'Non-Color'
            image.alpha_mode = 'CHANNEL_PACKED'
            image.pixels.foreach_set(values.reshape(-1));image.update();image.scale(*size)
            scaled = np.empty(size[0]*size[1]*4, dtype=np.float32);image.pixels.foreach_get(scaled)
            scaled = scaled.reshape(-1, 4)
            if color:scaled[:, :3] = srgb(scaled[:, :3])
            return scaled
        finally:bpy.data.images.remove(image)
    for material_id in dict.fromkeys(material_ids):
        definition = family['materials'][material_id]
        tint = np.asarray(definition['baseColor'], dtype=float)
        role = definition.get('paletteSelectionRole')
        if role:tint = np.asarray(required(definition.get('palettes', {}), recipe['selections'][role], 'invalid-recipe'), dtype=float)
        blend = definition.get('colorBlend')
        if blend:
            control = family['controls'][blend['control']]; low, high = control['bounds']
            value = (recipe['controls'][blend['control']]-low)/(high-low) if high > low else 0
            tint = (1-value)*tint+value*np.asarray(blend['color'])
        color = read_texture(definition['colorTexture']) if definition.get('colorTexture') else None
        coverage = color if 'alphaCutoff' in definition else None
        normal = read_texture(definition['normalTexture']) if definition.get('normalTexture') else None
        if definition.get('ageMaps'):
            a,b,t = age_interval(definition['ageMaps'], age); first, second = (definition['ageMaps'][year_key(year)] for year in [a,b])
            color = mix_texture(first['color'], second['color'], t)
            first_normal = first.get('normal') or definition.get('normalTexture')
            second_normal = second.get('normal') or definition.get('normalTexture')
            if first_normal and second_normal:normal = mix_texture(first_normal, second_normal, t, True)
            elif first_normal or second_normal:
                raise PeopleError('missing-source', material_id, 'Both age endpoints require the same normal-map role.')
        mat = bpy.data.materials.new(material_id); mat.use_nodes = True; nodes = mat.node_tree.nodes; links = mat.node_tree.links
        mat.use_backface_culling = not definition.get('doubleSided', False)
        bs = nodes.get('Principled BSDF'); bs.inputs['Roughness'].default_value = definition['roughness']; bs.inputs['Metallic'].default_value = definition['metallic']
        color_node = None
        if color:
            size, data = color; pigment = None
            if definition.get('tintMask'):
                mask_size, mask_data = read_texture(definition['tintMask'])
                if mask_size != size:raise PeopleError('missing-source', material_id, 'The pigment mask must match its colour atlas.')
                pigment = (mask_size, mask_data)
            if coverage:
                # Preserve thin cutouts: lowering coverage resolution to an age
                # paint's size can erase lashes before the cutoff is applied.
                size = tuple(max(a, b) for a, b in zip(size, coverage[0]))
                data = resized_pixels(color, size, color=True)
            data = data.copy()
            mask = resized_pixels(pigment, size)[:, :1] if pigment else np.ones((len(data), 1))
            factor = np.asarray(definition['baseColor'][:3])*(1-mask)+mask*tint[:3]
            data[:, :3] = srgb(linear(data[:, :3])*factor)
            if 'alphaCutoff' in definition:
                # Age and palette choices repaint RGB; coverage always comes from
                # the base atlas, matching the live material's opacity map.
                data[:, 3] = resized_pixels(coverage, size)[:, 3] if coverage else 1
            color_node = nodes.new('ShaderNodeTexImage');color_node.image = save_image(material_id, 'color', size, data);links.new(color_node.outputs['Color'], bs.inputs['Base Color'])
        else:bs.inputs['Base Color'].default_value = tint
        if 'alphaCutoff' in definition:
            alpha = nodes.new('ShaderNodeMath');alpha.operation = 'MULTIPLY'
            alpha.inputs[0].default_value = definition['baseColor'][3];alpha.inputs[1].default_value = 1
            if color_node:links.new(color_node.outputs['Alpha'], alpha.inputs[1])
            # Blender 5.2's glTF exporter recognizes 1 - (alpha < cutoff) as
            # MASK, retaining equality and the factor/texture alpha underneath.
            # docs/projects/people-from-parts-authoring-contract.md#skin-age-and-material-production
            below = nodes.new('ShaderNodeMath');below.operation = 'LESS_THAN';below.inputs[1].default_value = definition['alphaCutoff']
            links.new(alpha.outputs[0], below.inputs[0])
            keep = nodes.new('ShaderNodeMath');keep.operation = 'SUBTRACT';keep.inputs[0].default_value = 1
            links.new(below.outputs[0], keep.inputs[1]);links.new(keep.outputs[0], bs.inputs['Alpha'])
        if normal:
            size,data = normal;tex=nodes.new('ShaderNodeTexImage');tex.image=save_image(material_id,'normal',size,data,True)
            node=nodes.new('ShaderNodeNormalMap');links.new(tex.outputs['Color'],node.inputs['Color']);links.new(node.outputs['Normal'],bs.inputs['Normal'])
        result[material_id] = mat
    return result


def build_scene(family, evaluated, materials, motion, art_helpers):
    """Construct one private fixed wearer from admitted canonical render mappings."""
    import bpy
    from mathutils import Matrix, Vector, Quaternion
    for obj in list(bpy.data.objects):bpy.data.objects.remove(obj, do_unlink=True)
    # ACTIONS export must not reuse the previous companion's compatible orphan clips.
    for action in list(bpy.data.actions):
        if action.users == 0:bpy.data.actions.remove(action)
    c = Matrix(((1,0,0,0),(0,0,1,0),(0,-1,0,0),(0,0,0,1))); inv = c.inverted()
    arm = bpy.data.armatures.new('Person rig');rig=bpy.data.objects.new('Person rig',arm);bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    joints=family['rig']['joints'];world=[]
    for index,joint in enumerate(joints):
        matrix=inv@Matrix(np.asarray(evaluated['restMatrices'][index*16:index*16+16]).reshape(4,4).T.tolist())@c;world.append(matrix)
        bone=arm.edit_bones.new(joint['id'])
        # Blender cannot preserve orientation when assigning a matrix to a zero-length edit bone.
        bone.length=.1;bone.matrix=matrix
        bone.length=max((Vector(evaluated['landmarks'][joint['tailLandmark']])-Vector(evaluated['landmarks'][joint['headLandmark']])).length,.0001)
        if joint['parent']>=0:bone.parent=arm.edit_bones[joints[joint['parent']]['id']]
    bpy.ops.object.mode_set(mode='OBJECT')
    # One visual support datum for Rest and all clips; bind/rest anatomy and
    # fitted root keys remain barefoot, so the offset must not be baked twice.
    rig.location.z = person_support_offset(evaluated)
    for mesh_id in evaluated['activeMeshes']:
        source=family['meshes'][mesh_id];positions=points(evaluated['canonicalPositions'][mesh_id]);normals=points(evaluated['canonicalNormals'][mesh_id])
        render_indices=np.asarray(source.get('sourceVertexIndices',list(range(len(positions)))),dtype=np.int64)
        triangles=np.asarray(source.get('renderTriangles',source['triangles']),dtype=np.int64).reshape(-1,3)
        hidden=evaluated['hiddenFaces'].get(mesh_id,set());triangles=np.asarray([tri for index,tri in enumerate(triangles) if index not in hidden])
        coords=np.asarray([inv.to_3x3()@Vector(p) for p in positions[render_indices]])
        mesh=bpy.data.meshes.new(mesh_id);mesh.from_pydata(coords.tolist(),[],triangles.tolist());mesh.update()
        obj=bpy.data.objects.new(mesh_id,mesh);bpy.context.collection.objects.link(obj);obj.select_set(True)
        if source.get('uvs'):
            uv=mesh.uv_layers.new(name='UVMap');values=np.asarray(source['uvs']).reshape(-1,2)
            for loop in mesh.loops:uv.data[loop.index].uv=values[loop.vertex_index]
        mesh.materials.append(materials[source['materialId']])
        for polygon in mesh.polygons:polygon.use_smooth=True
        mesh.normals_split_custom_set_from_vertices([inv.to_3x3()@Vector(n) for n in normals[render_indices]])
        indices=np.asarray(source['jointIndices'],dtype=int).reshape(-1,4);weights=np.asarray(source['jointWeights']).reshape(-1,4)
        groups=[obj.vertex_groups.new(name=j['id']) for j in joints]
        for vertex,(js,ws) in enumerate(zip(indices,weights)):
            for j,w in zip(js,ws):
                if w>0:groups[int(j)].add([vertex],float(w),'REPLACE')
        obj.parent=rig
        modifier=obj.modifiers.new('Skin','ARMATURE');modifier.object=rig
    scene=bpy.context.scene;scene.render.fps=30;scene.render.fps_base=1
    rig.animation_data_create()
    for clip in motion:
        action=bpy.data.actions.new(clip['name']);rig.animation_data.action=action
        for frame,t in enumerate(clip['times']):
            for index,joint in enumerate(joints):
                q=clip['localRotations'][(frame*len(joints)+index)*4:(frame*len(joints)+index+1)*4]
                local=c.inverted()@Quaternion((q[3],*q[:3])).to_matrix().to_4x4()@c
                p=clip['localTranslations'][(frame*len(joints)+index)*3:(frame*len(joints)+index+1)*3];local.translation=inv.to_3x3()@Vector(p)
                rest_local=world[joint['parent']].inverted()@world[index] if joint['parent']>=0 else world[index]
                bone=rig.pose.bones[joint['id']];bone.rotation_mode='QUATERNION';bone.matrix_basis=rest_local.inverted()@local
                bone.keyframe_insert('rotation_quaternion',frame=float(t)*30,group=joint['id']);bone.keyframe_insert('location',frame=float(t)*30,group=joint['id'])
        for curve in art_helpers.action_curves(action):
            for point in curve.keyframe_points:point.interpolation='LINEAR'
        track=rig.animation_data.nla_tracks.new();track.name=clip['name'];strip=track.strips.new(clip['name'],0,action);strip.action_frame_start=0;strip.action_frame_end=clip['duration']*30
        track.mute=True
    rig.animation_data.action=None
    for bone in rig.pose.bones:bone.matrix_basis.identity()
    return rig


def file_record(path):
    path=Path(path)
    return {'path':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size}


def check_export_motion(path, family, evaluated, clips):
    """Check the exported consumer, not merely the pre-export pose arrays.

    Blender bone construction can preserve heads but lose rest orientation. The
    export then has valid skin/clip counts yet moves very differently. Compare
    heads and rest-relative turns, allowing the exporter's constant joint basis.
    """
    from mathutils import Matrix, Quaternion, Vector
    joints = family['rig']['joints']; count = len(joints)
    support_offset = Vector((0,person_support_offset(evaluated),0))
    options = {c['name']: {'loop': c['loop'], 'stride': False} for c in clips}
    motion_source = family['motion']
    actual, samples = compile_motion(path, [j['id'] for j in joints],
                                     motion_source['rootJoint'], motion_source['legs'], options)
    actual_rest = [Matrix(np.asarray(actual['sourceRestMatrices'][i*16:(i+1)*16]).reshape(4, 4).T.tolist()).to_quaternion()
                   for i in range(count)]
    target_rest = [Matrix(np.asarray(evaluated['restMatrices'][i*16:(i+1)*16]).reshape(4, 4).T.tolist()).to_quaternion()
                   for i in range(count)]
    reports = []
    for clip in clips:
        sample = samples[clip['name']]
        if len(sample['times']) != len(clip['times']) or max(abs(a-b) for a, b in zip(sample['times'], clip['times'])) > 1e-5:
            raise PeopleError('export-check', clip['name'], 'Export changed sampled clip timing.')
        position_error = turn_error = 0.0
        for frame in range(len(clip['times'])):
            positions = []; rotations = []
            for index, joint in enumerate(joints):
                offset = frame*count+index
                values = clip['localRotations'][offset*4:(offset+1)*4]
                rotation = Quaternion((values[3], *values[:3]))
                position = Vector(clip['localTranslations'][offset*3:(offset+1)*3])
                parent = joint['parent']
                if parent >= 0:
                    position = positions[parent]+rotations[parent]@position
                    rotation = rotations[parent]@rotation
                positions.append(position); rotations.append(rotation)
                exported = Vector(sample['worldPositions'][offset*3:(offset+1)*3])
                position_error = max(position_error, (position+support_offset-exported).length)
                values = sample['worldRotations'][offset*4:(offset+1)*4]
                exported_turn = Quaternion((values[3], *values[:3]))@actual_rest[index].inverted()
                expected_turn = rotation@target_rest[index].inverted()
                # q and -q represent the same rotation; compare components in one hemisphere.
                difference = min(sum((a-b)**2 for a, b in zip(exported_turn, expected_turn)),
                                 sum((a+b)**2 for a, b in zip(exported_turn, expected_turn)))**.5
                turn_error = max(turn_error, difference)
        reports.append({'clip': clip['name'], 'frames': len(clip['times']),
                        'maxJointDistanceMetres': position_error,
                        'maxRelativeQuaternionDistance': turn_error})
        # Sub-millimetre export precision is well below the family landmark envelope.
        if position_error > 1e-4 or turn_error > 1e-4:
            raise PeopleError('export-check', clip['name'],
                              f'Export changed motion: joint error {position_error:.6g} m, turn error {turn_error:.6g}.')
    return reports


def assemble_person(package, request, destination, art_helpers, parts=(), variants=None, inspection_candidate=False):
    """One fixed wearer, staged atomically; the same operation is used by every batch entry."""
    import bpy
    import tempfile
    destination=external_output(destination)
    if destination.exists():raise PeopleError('export-check',str(destination),'Output directory already exists.')
    destination.parent.mkdir(parents=True,exist_ok=True)
    staging=Path(tempfile.mkdtemp(prefix=f'.{destination.name}-staging-',dir=destination.parent))
    timings={};start=time.monotonic();family=package['compiled'];receipt={'status':'building','family':family['reference'],'inputs':package['manifest'],'tool':{'blender':bpy.app.version_string,'peopleSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'artToolSha256':hashlib.sha256(Path(art_helpers.__file__).read_bytes()).hexdigest()},'newPaidCostUsd':0}
    def write(name,value):
        (staging/name).write_text(json.dumps(value,indent=2,allow_nan=False)+'\n')
    try:
        qualified=package['manifest'].get('qualification',{}).get('status')=='qualified'
        if not qualified and not inspection_candidate:
            raise PeopleError('unsupported-shape','qualification','Family is not qualified; explicit inspection-candidate output is required.')
        coverage_role=family.get('coverageSelectionRole')
        if not coverage_role or not family['selectionParts'].get(coverage_role):
            raise PeopleError('missing-source','coverage','The family lacks its required separate coverage selection.')
        resolved=resolve_recipe(family,request,package['profile'])
        if not family['selectionParts'][coverage_role].get(resolved['selections'][coverage_role]):
            raise PeopleError('missing-source','coverage','The selected presentation requires separate coverage parts.')
        write('input-recipe.json',request);write('resolved-recipe.json',resolved)
        evaluated=evaluate_body(family,resolved);timings['resolveAndBodyMs']=(time.monotonic()-start)*1000
        states={}
        # Admit the complete request first. The covered companion retains cuts
        # of automatic hair/coverage parts, without trying to fit absent armour.
        automatic={part for role,choices in family['selectionParts'].items()
                   for part in choices[resolved['selections'][role]]}
        for name,outfit in [('dressed',parts),('covered',())]:
            stage=time.monotonic()
            state=dict(evaluated,canonicalPositions={k:v.copy() for k,v in evaluated['canonicalPositions'].items()})
            cuts=variants if name=='dressed' else {key:value for key,value in (variants or {}).items() if key in automatic}
            fit_parts(family,state,outfit,cuts);states[name]=state
            timings[name+'FitMs']=(time.monotonic()-stage)*1000
        # Parts share original body/source planting; soles and visible secondary
        # drivers reuse only identical active geometry/rule sets.
        stage=time.monotonic();motion_by_state=_fit_motion_states(family,evaluated,art_helpers,states);timings['motionMs']=(time.monotonic()-stage)*1000
        material_ids=[family['meshes'][mesh]['materialId'] for state in states.values() for mesh in state['activeMeshes']]
        stage=time.monotonic();materials=bake_materials(package,resolved,staging/'textures',material_ids);timings['materialsMs']=(time.monotonic()-stage)*1000
        for name in ['covered','dressed']:
            state=states[name]
            stage=time.monotonic();build_scene(family,state,materials,motion_by_state[name],art_helpers)
            bpy.ops.object.select_all(action='SELECT');art_helpers.export_glb(staging/f'{name}.glb',force_sampling=False)
            timings[name+'ExportMs']=(time.monotonic()-stage)*1000
        measurements={'statureMetres':evaluated['statureMetres'],'anatomicalHeightMetres':evaluated['landmarks'][family['crownLandmark']][1]-evaluated['landmarks'][family['soleLandmark']][1],
                      'supportOffsetsMetres':{name:person_support_offset(state) for name,state in states.items()},
                      'landmarks':evaluated['landmarks'],'selectedParts':states['dressed']['selectedParts'],'clips':[{'name':c['name'],'duration':c['duration'],'groundSpeed':c.get('groundSpeed')} for c in motion_by_state['dressed']]}
        write('measurements.json',measurements)
        stage=time.monotonic();reports={name:art_helpers.measure(staging/f'{name}.glb','character',None) for name in states};timings['reimportReportMs']=(time.monotonic()-stage)*1000
        write('report.json',reports)
        stage=time.monotonic()
        export_motion={name:check_export_motion(staging/f'{name}.glb',family,states[name],motion_by_state[name]) for name in states}
        write('export-motion.json',export_motion);timings['exportMotionCheckMs']=(time.monotonic()-stage)*1000
        failed={name:{'budgets':[b for b in report['budgets'] if b['status']!='pass'],'missingRequiredClips':report['motion']['missingRequired'],'zeroAreaFaces':report['geometry']['zeroAreaFaces']} for name,report in reports.items() if any(b['status']!='pass' for b in report['budgets']) or report['motion']['missingRequired'] or report['geometry']['zeroAreaFaces']}
        if failed:
            receipt['exportChecks']=failed
            raise PeopleError('export-check','assembled outputs','Reimported output failed required budgets, geometry or clips.')
        receipt.update(status='inspection-candidate' if inspection_candidate else 'success',qualification=package['manifest'].get('qualification',{}),parts=list(parts),variants=variants or {},timingsMs=timings,exportMotion=export_motion,outputs=[file_record(staging/f'{name}.glb') for name in states])
        write('receipt.json',receipt)
        staging.rename(destination)
        return receipt
    except Exception as error:
        failure=error if isinstance(error,PeopleError) else PeopleError('export-check','native build',str(error))
        receipt.update(status='failed',failure=failure.record(),timingsMs=timings);write('receipt.json',receipt)
        failed_path=destination.with_name(destination.name+'-failed')
        if not failed_path.exists():staging.rename(failed_path)
        else:failed_path=staging
        # Preserved staging path is concrete inspection evidence, never a successful release.
        failure.candidate_path=str(failed_path)
        raise failure from error
    finally:
        for obj in list(bpy.data.objects):bpy.data.objects.remove(obj,do_unlink=True)
        for collection in [bpy.data.meshes,bpy.data.armatures,bpy.data.actions,bpy.data.materials,bpy.data.images]:
            for block in list(collection):
                if block.users==0:collection.remove(block)


def run_assemble(args, art_helpers):
    """CLI admission and ordered batching; no publication or provider operation."""
    destination=external_output(args.out)
    if destination.exists():raise PeopleError('export-check',str(destination),'Use a fresh output directory.')
    package=load_family(args.family)
    variants={}
    for item in args.variant or []:
        if '=' not in item:raise PeopleError('invalid-recipe','variant','Use PART=CUT for an explicit variant.')
        key,value=item.split('=',1)
        if key in variants:raise PeopleError('invalid-recipe',key,'Variant was supplied more than once.')
        variants[key]=value
    results=[];batch=len(args.recipe)>1
    if batch:destination.mkdir(parents=True)
    for index,path in enumerate(args.recipe):
        target=destination/f'{index+1:04d}' if batch else destination
        try:
            request=json.loads(Path(path).expanduser().read_text())
            receipt=assemble_person(package,request,target,art_helpers,args.part or [],variants,args.inspection_candidate)
            results.append({'input':str(Path(path).expanduser().resolve()),'output':str(target),'status':receipt['status']})
        except (PeopleError,OSError,ValueError) as error:
            failure=error if isinstance(error,PeopleError) else PeopleError('invalid-recipe',str(path),str(error))
            results.append({'input':str(Path(path).expanduser().resolve()),'status':'failed','failure':failure.record(),'inspectionCandidate':getattr(error,'candidate_path',None)})
    if batch:(destination/'batch-report.json').write_text(json.dumps(results,indent=2)+'\n')
    print(json.dumps(results,indent=2))
    return 2 if any(entry['status']=='failed' for entry in results) else 0
