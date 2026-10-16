"""Retain normalized source controls beside the finite finished study options.

Read downloaded files with embedded scripts disabled. These are diagnostic
exports with source topology/materials, not additional recommended game art.
Run after the corresponding preparation recipes, which replace their catalogs.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import bpy

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from art_study_common import ROOT, export_asset


def module(name):
    spec = importlib.util.spec_from_file_location(name, ROOT/'scripts'/name)
    loaded = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(loaded)
    return loaded


def load(path):
    before = set(bpy.data.objects)
    if path.suffix == '.blend':
        with bpy.data.libraries.load(str(path), link=False) as (available, loaded):
            loaded.objects = available.objects
        for obj in loaded.objects:
            if obj and obj.type in ('MESH', 'ARMATURE'):
                bpy.context.collection.objects.link(obj)
    else:
        bpy.ops.import_scene.gltf(filepath=str(path))
    return [obj for obj in set(bpy.data.objects)-before
            if obj.type in ('MESH', 'ARMATURE') and not obj.name.startswith('Icosphere')]


def main(args):
    helper = module('prepare-source-study.py')
    nature = module('prepare-nature-study.py')
    gear = module('prepare-equipment-study.py')
    resources = module('prepare-resource-study.py')
    human = module('prepare-human-study.py')
    sources = {}
    for family, (label, height, files, variants) in nature.FAMILIES.items():
        sources[family] = args.libraries/'quaternius-standard/glTF'/(files[0]+'.gltf')
    sources['library-broadleaf'] = args.libraries/'quaternius-standard/glTF/CommonTree_5.gltf'
    for family, (label, variants) in gear.FAMILIES.items():
        sources[family] = args.sources/'weapons/Blends'/(variants[0][0]+'.blend')
    for family, (label, height, library, files, variants) in resources.FAMILIES.items():
        sources['library-'+family] = (args.sources/'backpack.glb' if library=='pack' else
            args.libraries/('quaternius-standard/glTF' if library=='nature' else 'kenney_survival-kit/Models/GLB format')/(files[0]+('.gltf' if library=='nature' else '.glb')))
    sources['mercenary'] = args.mercenary/'assets/mercenary.glb'
    sources['library-bear'] = args.sources/'animals/bear.glb'
    sources['library-bird'] = args.sources/'animals/shrike/bird_yellow_billed_shrike/bird_shrike1.blend'
    for species in ['deer','stag','wolf']:
        sources['library-'+species] = args.sources/'animals/Blends'/(species.title()+'.blend')
    sources['library-chest'] = args.libraries/'kenney_survival-kit/Models/GLB format/chest.glb'
    service = None
    for path in sorted((ROOT/'apps/client/src/props/art-study').glob('source-*/catalog.json')):
        catalog = json.loads(path.read_text())
        controls = []
        families = {asset['family']: asset for asset in reversed(catalog['assets'])}
        for family, asset in families.items():
            if args.families and family not in args.families: continue
            if family not in sources and family not in human.PEOPLE:
                continue
            bpy.ops.wm.read_factory_settings(use_empty=True)
            if family in human.PEOPLE:
                if service is None: service = human.source_services(args.sources)
                label, gender, age, muscle, weight, skin, hairs, palette, recommendation = human.PEOPLE[family]
                before = set(bpy.data.objects)
                body = service.create_human(macro_detail_dict={
                    'age':age,'cupsize':.4,'firmness':.5,'gender':gender,'height':.55,'muscle':muscle,
                    'proportions':.5,'race':{'african':int('african' in skin),'asian':int('asian' in skin),'caucasian':int('caucasian' in skin)},'weight':weight})
                service.add_builtin_rig(body,'default')
                system=args.sources/'makehuman_system_assets'
                service.set_character_skin(str(system/'skins'/skin/(skin+'.mhmat')),body,skin_type='GAMEENGINE')
                for category,name in [('Eyes','eyes/low-poly/low-poly'),('Hair',f'hair/{hairs[0]}/{hairs[0]}')]:
                    service.add_mhclo_asset(str(system/(name+'.mhclo')),body,asset_type=category,subdiv_levels=0,material_type='GAMEENGINE')
                for piece in ['boots','pants','tunic']:
                    name='rehmanpolanski_viking_'+piece
                    service.add_mhclo_asset(str(args.sources/'suits02/clothes'/name/(name+'.mhclo')),body,subdiv_levels=0,material_type='GAMEENGINE')
                objects=list(set(bpy.data.objects)-before)
                source='MakeHuman CC0 anatomical base and Rehman Polanski source outfit; unpainted source control.'
            else:
                source_path=sources[family]
                if not source_path.exists(): raise FileNotFoundError(source_path)
                objects=load(source_path)
                if family in ('library-bird','library-deer','library-stag','library-wolf'):
                    objects=[o for o in objects if o.type=='ARMATURE' or o.name.startswith(('Bird_YBShrike','Deer','Stag','Wolf'))]
                source=str(source_path)+' · SHA256 '+hashlib.sha256(source_path.read_bytes()).hexdigest()
            helper.normalize(objects,asset['bounds']['max'][1]-asset['bounds']['min'][1])
            control,_=export_asset(objects,path.parent,'control-'+family,family,asset['label'],'source-control',
                'Original source form and material at the comparison scale. Normalized for inspection; not the selected pixel-art finish.',False,source)
            controls.append(control)
        if args.families:
            controls=[c for c in catalog.get('controls',[]) if c['family'] not in args.families]+controls
        catalog['controls']=controls
        catalog['controlRecipe']={'path':str(Path(__file__).resolve().relative_to(ROOT)), 'sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
        path.write_text(json.dumps(catalog,indent=2)+'\n')


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    for name in ['sources','libraries','mercenary']:parser.add_argument('--'+name,type=Path,required=True)
    parser.add_argument('--families',nargs='*')
    main(parser.parse_args(sys.argv[sys.argv.index('--')+1:]))
