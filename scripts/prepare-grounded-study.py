"""Offline Poly Haven comparison; preserve sources and earlier study families.

Blender --background --factory-startup --disable-autoexec --offline-mode
  --python-exit-code 1 --python scripts/prepare-grounded-study.py -- --sources PATH
The directory contains the recorded 1K glTF downloads and download-manifest.json.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

import bpy
import bmesh
import numpy as np
from mathutils import Vector

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from art_study_common import ROOT, export_asset

spec = importlib.util.spec_from_file_location('source_study', ROOT/'scripts/prepare-source-study.py')
source_study = importlib.util.module_from_spec(spec)
spec.loader.exec_module(source_study)

SUBJECTS = {
    'treasure_chest': ('chest', 'Poly Haven chest', .72, 1.1, 14000),
    'boulder_01': ('boulder', 'Poly Haven boulder', 1.05, 1.8, 9000),
    'fern_02': ('fern', 'Poly Haven fern', .65, 1.1, 7000),
    'dead_tree_trunk': ('deadwood', 'Poly Haven dead trunk', 2.0, 2.1, 12000),
    'fir_sapling_medium': ('conifer', 'Poly Haven woodland fir', 5.6, 4.2, 30000),
}


def group_needles(mesh):
    """Preserve source branch structure and whole needles at a coarser art scale.

    Blind decimation erases the crown. Retain a distributed subset of complete
    needle components and broaden their cross-section before final simplification.
    Everything is baked once; neither placement nor coverage follows the camera.
    """
    remaining=set(mesh.verts)
    remove=[]
    index=0
    for start in mesh.verts:
        if start not in remaining:continue
        stack=[start];remaining.remove(start);component=[]
        while stack:
            vertex=stack.pop();component.append(vertex)
            for edge in vertex.link_edges:
                other=edge.other_vert(vertex)
                if other in remaining:remaining.remove(other);stack.append(other)
        if len(component)>16:continue
        index+=1
        if index%12:
            remove.extend(component);continue
        points=np.array([v.co[:] for v in component]);center=points.mean(axis=0)
        relative=points-center
        _,axes=np.linalg.eigh(relative.T@relative)
        axis=axes[:,-1]
        along=np.outer(relative@axis,axis)
        shaped=center+along*1.25+(relative-along)*8
        for vertex,point in zip(component,shaped):vertex.co=point
    bmesh.ops.delete(mesh,geom=remove,context='VERTS')


def paint_needles(obj, variant):
    """Broad source-attached green groups, avoiding black atlas bleed on needles."""
    mesh=obj.data
    colors=mesh.color_attributes.new(name='Needle groups',type='FLOAT_COLOR',domain='CORNER')
    normals=[n.vector.copy() for n in mesh.corner_normals]
    palette=np.array([[int(h[i:i+2],16)/255 for i in (0,2,4)] for h in ['405c43','577347','708854','84945f']])
    if variant=='weathered':palette=palette*.84+np.array([.045,.035,.02])
    if variant=='clear':palette=np.clip(palette*1.07,0,1)
    palette=np.where(palette<=.04045,palette/12.92,((palette+.055)/1.055)**2.4)
    inverse_normal=obj.matrix_world.to_3x3().transposed()
    for polygon in mesh.polygons:
        foliage='twigs' in mesh.materials[polygon.material_index].name
        for loop in polygon.loop_indices:
            vertex=mesh.loops[loop].vertex_index
            p=obj.matrix_world@mesh.vertices[vertex].co
            if foliage:
                group=min(3,max(0,int((np.sin(p.x*3+p.y*2)+np.sin(p.z*4-p.y*3)+2)*.95)))
                colors.data[loop].color=(*palette[group],1)
                crown=Vector((p.x*.32,p.y*.32,.85)).normalized()
                normals[loop]=(inverse_normal@crown).normalized()
            else:colors.data[loop].color=(1,1,1,1)
    mesh.normals_split_custom_set(normals)
    for material in mesh.materials:
        if 'twigs' not in material.name:continue
        shader=material.node_tree.nodes.get('Principled BSDF')
        for link in list(shader.inputs['Base Color'].links):material.node_tree.links.remove(link)
        node=material.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name=colors.name
        material.node_tree.links.new(node.outputs['Color'],shader.inputs['Base Color'])


def prepare(sources, subject):
    family, label, height, span, target = SUBJECTS[subject]
    group = 'source-grounded-' + family
    output = ROOT/'apps/client/src/props/art-study'/group
    output.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    assets, controls = [], []
    path = sources/subject/(subject+'_1k.gltf')
    for index, variant in enumerate(['source', 'clear', 'quiet', 'weathered']):
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=str(path))
        objects = list(set(bpy.data.objects)-before)
        if family in ('fern', 'conifer'):
            # The source download contains four arranged specimens. Compare one
            # complete plant at honest scale rather than miniaturize the set.
            for obj in objects[:]:
                if obj.type == 'MESH' and not obj.name.startswith('fern_02_b' if family == 'fern' else 'fir_sapling_medium_b'):
                    objects.remove(obj)
                    bpy.data.objects.remove(obj, do_unlink=True)
        source_study.normalize(objects, height, span)
        if variant != 'source':
            meshes = [o for o in objects if o.type == 'MESH']
            if family in ('boulder', 'deadwood', 'conifer'):
                # Imported seams can duplicate coincident vertices and prevent
                # useful simplification. UVs remain per corner; this tiny weld
                # joins the source surface without shrinking its silhouette.
                for obj in meshes:
                    mesh = bmesh.new()
                    mesh.from_mesh(obj.data)
                    bmesh.ops.remove_doubles(mesh, verts=list(mesh.verts), dist=0.00001)
                    if family == 'conifer':
                        mesh.verts.index_update()
                        group_needles(mesh)
                    mesh.to_mesh(obj.data)
                    mesh.free()
            for obj in meshes:
                obj.data.calc_loop_triangles()
            total = sum(len(o.data.loop_triangles) for o in meshes)
            for obj in meshes:
                if total > target:
                    modifier = obj.modifiers.new('Preserve silhouette within study geometry budget', 'DECIMATE')
                    modifier.ratio = target/total
                    bpy.context.view_layer.objects.active = obj
                    bpy.ops.object.modifier_apply(modifier=modifier.name)
                if family in ('boulder', 'deadwood', 'conifer'):
                    for polygon in obj.data.polygons:
                        polygon.use_smooth = True
            for obj in meshes:
                obj.data.calc_loop_triangles()
            assert sum(len(o.data.loop_triangles) for o in meshes) <= target, 'Study triangle budget exceeded'
            if family == 'conifer':
                for obj in meshes:paint_needles(obj,variant)
            materials = {m for o in meshes for m in o.data.materials if m}
            images = {}
            for material in materials:
                if not material.use_nodes:
                    continue
                shader = material.node_tree.nodes.get('Principled BSDF')
                if not shader:
                    continue
                # Keep real albedo/UV boundaries and cutouts. Fine normal noise
                # does not belong in this fixed-density pixel comparison.
                for socket in ('Normal', 'Roughness', 'Metallic'):
                    for link in list(shader.inputs[socket].links):
                        material.node_tree.links.remove(link)
                shader.inputs['Roughness'].default_value = .9
                shader.inputs['Metallic'].default_value = .06 if family == 'chest' else 0
                shader.inputs['Specular IOR Level'].default_value = .12
                if family == 'conifer':
                    # This source models needles as geometry; its BLEND flag
                    # has no alpha artwork. Export solid needles and real gaps,
                    # avoiding transparent sorting and view-dependent coverage.
                    for link in list(shader.inputs['Alpha'].links):
                        material.node_tree.links.remove(link)
                    shader.inputs['Alpha'].default_value = 1
                for node in material.node_tree.nodes:
                    if node.type != 'TEX_IMAGE' or not node.image or not node.outputs['Color'].is_linked:
                        continue
                    if not any(link.to_socket == shader.inputs['Base Color'] for link in node.outputs['Color'].links):
                        continue
                    original = node.image
                    if original not in images:
                        image = original.copy()
                        image.name = family + '-' + variant + '-paint'
                        resolution = 512 if variant == 'clear' else 256
                        image.scale(min(resolution,image.size[0]),min(resolution,image.size[1]))
                        pixels = np.array(image.pixels[:],dtype=np.float32).reshape(-1,4)
                        rgb = pixels[:,:3]
                        value = rgb @ np.array([.2126,.7152,.0722])
                        saturation = .92 if variant == 'clear' else .80 if variant == 'quiet' else .65
                        rgb[:] = value[:,None] + (rgb-value[:,None])*saturation
                        if variant == 'weathered':
                            rgb[:] = rgb*.93 + np.array([.025,.023,.018])
                        if variant != 'clear':
                            rgb[:] = np.round(rgb*31)/31
                        pixels[:,:3] = np.clip(rgb,0,1)
                        image.pixels.foreach_set(pixels.ravel())
                        image.pack()
                        images[original] = image
                    node.image = images[original]
                    node.interpolation = 'Linear'
                # Omit abandoned normal/ORM branches from the editable variant
                # too, so catalog texture accounting matches the exported GLB.
                for node in list(material.node_tree.nodes):
                    if node.type == 'TEX_IMAGE' and not any(
                        link.to_node == shader and link.to_socket.name in ('Base Color', 'Alpha')
                        for socket in node.outputs for link in socket.links
                    ):
                        material.node_tree.nodes.remove(node)
        descriptions = {
            'source': 'Normalized original Poly Haven geometry and materials; source control, not pixel-finished art.',
            'clear': 'Natural source form with retained albedo detail and quiet highlights; fixed-density pixel rendering.',
            'quiet': 'Natural source form with grouped earth colors and restrained fine texture.',
            'weathered': 'Weathered material study with muted color and softer worn highlights.',
        }
        asset, placement = export_asset(objects, output, 'grounded-'+family+'-'+variant,
            'grounded-'+family, label, variant, descriptions[variant],
            variant == ('quiet' if family in ('boulder', 'conifer') else 'clear'),
            'Poly Haven, CC0, https://polyhaven.com/a/'+subject+'; normalized and adapted by OpenLegend.')
        placement.location.x = index*3
        (controls if variant=='source' else assets).append(asset)
    manifest = json.loads((sources/'download-manifest.json').read_text())
    records = [entry for entry in manifest if entry['asset']==subject]
    for entry in records:
        assert hashlib.sha256((sources/subject/entry['file']).read_bytes()).hexdigest()==entry['sha256']
    source_study.retain(group,assets,[{'url':'https://polyhaven.com/a/'+subject,
        'license':'CC0','files':records}],recipe=__file__)
    catalog = output/'catalog.json'
    data = json.loads(catalog.read_text())
    data['controls'] = controls
    catalog.write_text(json.dumps(data,indent=2)+'\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--sources',type=Path,required=True)
    parser.add_argument('--subjects',nargs='+',choices=SUBJECTS,default=list(SUBJECTS))
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    for subject in args.subjects:
        prepare(args.sources,subject)
