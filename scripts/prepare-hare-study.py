"""Package the existing CC0 hare preparation into the shared finite study.

Run prepare-library-animals.py first. This recipe retains its exact rigged GLBs,
measures their evaluated neutral pose and saves all three adapted, editable rigs.
It does not implement a second coat, anatomy or animation preparation algorithm.
"""
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import sys
import bpy

sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
from art_study_common import ROOT, export_asset


def main():
    spec=importlib.util.spec_from_file_location('study_sources',ROOT/'scripts/prepare-source-study.py')
    helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
    prepared=ROOT/'apps/client/src/props/library-animals'
    output=ROOT/'apps/client/src/props/art-study/source-hare';output.mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    assets=[]
    descriptions={
        'field':'Lean field hare, long ears, quiet belly and dark ear tips.',
        'russet':'Broader shoulders and outward ears with russet haunch grouping.',
        'winter':'Fuller body and shorter ears with restrained winter coat fields.',
    }
    for index,(variant,description) in enumerate(descriptions.items()):
        path=prepared/('hare-'+variant+'.glb')
        before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(path))
        # Blender creates an unlinked unit Icosphere as the imported rig's
        # display handle. It is not part of the animal or its export envelope.
        objects=[obj for obj in set(bpy.data.objects)-before if not obj.name.startswith('Icosphere')]
        # glTF importer exposes each clip as an NLA strip. Keep the neutral
        # Idle clip active for measurement and the static comparison.
        for obj in objects:
            if obj.animation_data:
                for track in obj.animation_data.nla_tracks:
                    track.mute=not any('Idle' in strip.name for strip in track.strips)
        bpy.context.scene.frame_set(0)
        asset,root=export_asset(objects,output,'hare-'+variant,'library-hare','Hare',variant,
            description+' Original source Idle/Run clips retained.',index==0,
            'Rabbit by CDmir/TinyWorlds, CC0; OpenLegend proportions and fixed coat design.')
        motion=output/('hare-'+variant+'-motion.glb');shutil.copyfile(path,motion)
        asset['animatedFile']=motion.name;asset['animatedSha256']=hashlib.sha256(motion.read_bytes()).hexdigest()
        asset['preparedInputSha256']=hashlib.sha256(path.read_bytes()).hexdigest()
        root.location.x=index*1.1;assets.append(asset)
    source=prepared/'cdmir-rabbit-source.blend'
    helper.retain('source-hare',assets,[{'url':'https://opengameart.org/content/rabbit-0',
        'creator':'CDmir / TinyWorlds','license':'CC0','file':source.name,
        'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
        'preparationRecipe':'scripts/prepare-library-animals.py',
        'preparationRecipeSha256':hashlib.sha256((ROOT/'scripts/prepare-library-animals.py').read_bytes()).hexdigest()}],recipe=__file__)


if __name__=='__main__':main()
