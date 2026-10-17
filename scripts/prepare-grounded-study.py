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
import numpy as np

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
}


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
        if family == 'fern':
            # The source download contains four arranged specimens. Compare one
            # complete plant at honest scale rather than miniaturize the set.
            for obj in objects[:]:
                if obj.type == 'MESH' and not obj.name.startswith('fern_02_b'):
                    objects.remove(obj)
                    bpy.data.objects.remove(obj, do_unlink=True)
        source_study.normalize(objects, height, span)
        if variant != 'source':
            meshes = [o for o in objects if o.type == 'MESH']
            total = sum(len(o.data.polygons) for o in meshes)
            for obj in meshes:
                if total > target:
                    modifier = obj.modifiers.new('Preserve silhouette within study geometry budget', 'DECIMATE')
                    modifier.ratio = target/total
                    bpy.context.view_layer.objects.active = obj
                    bpy.ops.object.modifier_apply(modifier=modifier.name)
                if family in ('boulder', 'deadwood'):
                    for polygon in obj.data.polygons:
                        polygon.use_smooth = True
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
        descriptions = {
            'source': 'Normalized original Poly Haven geometry and materials; source control, not pixel-finished art.',
            'clear': 'Natural source form with retained material details, quiet highlights and fine fixed paint.',
            'quiet': 'Natural source form with grouped earth colors and restrained fine texture.',
            'weathered': 'Weathered material study with muted color and softer worn highlights.',
        }
        asset, placement = export_asset(objects, output, 'grounded-'+family+'-'+variant,
            'grounded-'+family, label, variant, descriptions[variant], variant=='clear',
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
