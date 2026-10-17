"""Shared offline Blender export and fixed-pixel paint for the finite art study.

Run only from Blender --background --factory-startup --disable-autoexec. This
module creates new local art; it never opens a world/save or calls a provider.
"""
from pathlib import Path
import hashlib
import json
import struct

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[1]


def unique_skin_names(objects, rig):
    """Keep mesh names distinct from joints resolved by PlayCanvas by name.

    A valid glTF can contain a mesh and bone both named Head. PlayCanvas's skin
    lookup then finds the mesh first and deforms the face with its transform.
    Preserve bone names used by weights/actions; rename only colliding objects.
    """
    bone_names = {bone.name for bone in rig.data.bones}
    for obj in objects:
        if obj.name in bone_names:
            obj.name = 'Render mesh · ' + obj.name


def eye_accents(objects, rig, head, eyes, name):
    """Fit restrained eye whites/irises to the source head and attach to its rig.

    These are authored surface features, not camera-facing cards. Projecting
    against the eye meshes as well as skin keeps details over eye sockets.
    """
    graph = bpy.context.evaluated_depsgraph_get()
    vertices, faces = [], []
    for obj in objects:
        evaluated = obj.evaluated_get(graph)
        mesh = evaluated.to_mesh()
        start = len(vertices)
        vertices.extend(evaluated.matrix_world @ vertex.co for vertex in mesh.vertices)
        faces.extend(tuple(start+i for i in polygon.vertices) for polygon in mesh.polygons)
        evaluated.to_mesh_clear()
    surface = BVHTree.FromPolygons(vertices, faces)
    inverse = rig.matrix_world.inverted()
    positions, triangles, colors = [], [], []
    def patch(polygon, color, offset=.0018):
        if sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(polygon,polygon[1:]+polygon[:1]))<0:
            polygon=list(reversed(polygon))
        start = len(positions)
        center = tuple(sum(p[i] for p in polygon)/len(polygon) for i in range(2))
        for x,z in [center]+polygon:
            location,_,_,_=surface.ray_cast(Vector((x,-2,z)),Vector((0,1,0)),4)
            if location is None: raise ValueError('Facial feature missed its source surface')
            location.y-=offset
            positions.append(inverse@location)
        for i in range(len(polygon)):
            triangles.append((start,start+i+1,start+(i+1)%len(polygon)+1))
            colors.append(color)
    for eye in eyes:
        x,z=eye.x,eye.z
        patch([(x-.017,z),(x-.011,z+.007),(x+.011,z+.007),(x+.017,z),
               (x+.010,z-.005),(x-.011,z-.005)],'b8b7a3')
        patch([(x-.005,z+.007),(x+.005,z+.007),(x+.005,z-.005),(x-.005,z-.005)],'293331',.0027)
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(positions,[],triangles)
    mesh.update()
    attribute=mesh.color_attributes.new(name='Feature colors',type='FLOAT_COLOR',domain='CORNER')
    for polygon,color in zip(mesh.polygons,colors):
        rgb=[int(color[i:i+2],16)/255 for i in (0,2,4)]
        linear=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
        for loop in polygon.loop_indices: attribute.data[loop].color=(*linear,1)
    obj=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(obj)
    # All meshes sharing this skin must share the rig's transform origin. A
    # sibling outside it makes PlayCanvas apply the normalized rig scale twice.
    obj.parent=rig
    obj.matrix_world=rig.matrix_world.copy()
    weights=obj.vertex_groups.new(name=head)
    weights.add(list(range(len(positions))),1,'REPLACE')
    modifier=obj.modifiers.new('Follow the source head','ARMATURE');modifier.object=rig
    material=solid_material(name+' palette','ffffff')
    node=material.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name=attribute.name
    material.node_tree.links.new(node.outputs['Color'],material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    mesh.materials.append(material)
    return obj


def begin(group):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    output = ROOT / 'apps/client/src/props/art-study' / group
    source = ROOT / 'art-direction/assets/representative-study'
    output.mkdir(parents=True, exist_ok=True)
    source.mkdir(parents=True, exist_ok=True)
    return output, source


def pixel_material(name, palette, cells, output, roughness=.92, metallic=0):
    """Paint explicit palette cells; source RGB bytes stay sRGB, alpha is solid."""
    height, width = len(cells), len(cells[0])
    rgba = np.array([[tuple(int(color.lstrip('#')[i:i + 2], 16) / 255 for i in (0, 2, 4)) + (1,) for color in palette]], dtype=np.float32)[0]
    pixels = rgba[np.array(cells, dtype=np.int32)]
    image = bpy.data.images.new(name, width=width, height=height, alpha=True)
    image.colorspace_settings.name = 'sRGB'
    image.pixels.foreach_set(pixels.reshape(-1))
    image.filepath_raw = str(output / (name + '.png'))
    image.file_format = 'PNG'
    image.save()
    image.pack()
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    shader = material.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metallic
    texture = material.node_tree.nodes.new('ShaderNodeTexImage')
    texture.image = image
    texture.interpolation = 'Closest'
    texture.extension = 'REPEAT'
    material.node_tree.links.new(texture.outputs['Color'], shader.inputs['Base Color'])
    material['fixedPixelArtwork'] = True
    return material


def solid_material(name, color, roughness=.9, metallic=0):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    shader = material.node_tree.nodes.get('Principled BSDF')
    rgb = [int(color.lstrip('#')[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    linear = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in rgb]
    shader.inputs['Base Color'].default_value = (*linear, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metallic
    return material


def box_uv(obj, density=32, size=64):
    """Fixed metre-scale box projection, authored once; no camera dependency."""
    mesh = obj.data
    layer = mesh.uv_layers.active or mesh.uv_layers.new(name='Fixed painted pixels')
    matrix = obj.matrix_world
    normal_matrix = matrix.to_3x3().inverted().transposed()
    for polygon in mesh.polygons:
        normal = normal_matrix @ polygon.normal
        axis = max(range(3), key=lambda i: abs(normal[i]))
        axes = ((1, 2), (0, 2), (0, 1))[axis]
        for index in polygon.loop_indices:
            point = matrix @ mesh.vertices[mesh.loops[index].vertex_index].co
            layer.data[index].uv = (point[axes[0]] * density / size, point[axes[1]] * density / size)


def export_asset(objects, output, identity, family, label, variant, description,
                 recommended=False, source='Original OpenLegend Blender study; AGPL-3.0-only.'):
    objects = list(objects)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.hide_set(False)
        obj.hide_render = False
        obj.select_set(True)
    bpy.context.view_layer.objects.active = next(obj for obj in objects if obj.type == 'MESH')
    bpy.context.view_layer.update()
    graph = bpy.context.evaluated_depsgraph_get()
    points, vertices, triangles = [], 0, 0
    images = set()
    for obj in objects:
        if obj.type != 'MESH':
            continue
        evaluated = obj.evaluated_get(graph)
        mesh = evaluated.to_mesh()
        mesh.calc_loop_triangles()
        vertices += len(mesh.vertices)
        triangles += len(mesh.loop_triangles)
        for vertex in mesh.vertices:
            p = evaluated.matrix_world @ vertex.co
            points.append((p.x, p.z, -p.y))
        evaluated.to_mesh_clear()
        for material in obj.data.materials:
            if material and material.use_nodes:
                images.update(node.image for node in material.node_tree.nodes if node.type == 'TEX_IMAGE' and node.image and any(socket.is_linked for socket in node.outputs))
    # Export evaluated temporary copies joined by their shared materials. Keep
    # separately editable source parts; dozens of tailoring pieces need not
    # become dozens of runtime draws for a static study figure.
    bpy.ops.object.select_all(action='DESELECT')
    copies, copy_meshes = [], []
    for obj in objects:
        if obj.type != 'MESH':
            continue
        evaluated = obj.evaluated_get(graph)
        mesh = bpy.data.meshes.new_from_object(evaluated, preserve_all_data_layers=True, depsgraph=graph)
        copy = bpy.data.objects.new(identity + ' export part', mesh)
        bpy.context.collection.objects.link(copy)
        copy.matrix_world = evaluated.matrix_world.copy()
        copy.select_set(True)
        copies.append(copy)
        copy_meshes.append(mesh)
    bpy.context.view_layer.objects.active = copies[0]
    bpy.ops.object.join()
    merged = bpy.context.view_layer.objects.active
    merged.name = identity + ' runtime mesh'
    path = output / (identity + '.glb')
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True,
        export_apply=True, export_animations=False, export_yup=True,
        export_image_format='AUTO', export_texcoords=True, export_normals=True,
        export_materials='EXPORT', export_extras=True)
    bpy.data.objects.remove(merged, do_unlink=True)
    for mesh in copy_meshes:
        if mesh.users == 0:
            bpy.data.meshes.remove(mesh)
    # Closest magnification preserves authored cells; trilinear minification
    # filters their coverage at distance rather than adding finer artwork.
    raw = path.read_bytes()
    json_size = struct.unpack_from('<I', raw, 12)[0]
    document = json.loads(raw[20:20 + json_size])
    for sampler in document.get('samplers', []):
        sampler['magFilter'] = 9728
        sampler['minFilter'] = 9987
    encoded = json.dumps(document, separators=(',', ':')).encode()
    encoded += b' ' * (-len(encoded) % 4)
    tail = raw[20 + json_size:]
    path.write_bytes(struct.pack('<4sII', b'glTF', 2, 20 + len(encoded) + len(tail)) + struct.pack('<I4s', len(encoded), b'JSON') + encoded + tail)
    # Group an editable, spaced source display only after exporting metre-scale art.
    root = bpy.data.objects.new(identity, None)
    bpy.context.collection.objects.link(root)
    for obj in objects:
        if obj.parent not in objects:
            world = obj.matrix_world.copy()
            obj.parent = root
            obj.matrix_world = world
    return {'id': identity, 'family': family, 'label': label, 'variant': variant,
        'description': description, 'recommended': recommended, 'file': path.name,
        'bounds': {'min': [round(min(p[i] for p in points), 6) for i in range(3)],
                   'max': [round(max(p[i] for p in points), 6) for i in range(3)]},
        'triangles': triangles, 'vertices': vertices,
        'textureSizes': sorted([list(image.size) for image in images]),
        'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'source': source}, root


def finish(group, assets, output, source, notes):
    path = source / (group + '.blend')
    bpy.ops.wm.save_as_mainfile(filepath=str(path))
    catalog = {'group': group, 'notes': notes, 'sourceFile': str(path.relative_to(ROOT)),
               'sourceSha256': hashlib.sha256(path.read_bytes()).hexdigest(),
               'authoring': {name: hashlib.sha256((ROOT / 'scripts' / name).read_bytes()).hexdigest() for name in ['art_study_common.py', 'prepare-study-' + group + '.py']},
               'assets': assets}
    (output / 'catalog.json').write_text(json.dumps(catalog, indent=2) + '\n')
    return catalog
