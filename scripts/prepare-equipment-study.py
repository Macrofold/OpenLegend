"""Adapt the official Quaternius CC0 weapon sources for the finite art study."""
import argparse
import hashlib
import importlib.util
from pathlib import Path
import sys

import bpy
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parent))
from art_study_common import ROOT, export_asset, solid_material

PALETTE={'Steel':'788787','LightSteel':'bac1ad','DarkSteel':'414d50','Gold':'a47b42',
         'LightWood':'805d3e','DarkWood':'503d30','DarkBrown':'3d302b','Black':'282c2b',
         'LightRed':'965b47','Red':'784438','White':'b6ad85'}
FAMILIES={
    'library-sword':('Sword',[
        ('Sword','straight-crossguard',1.10,'Straight blade, distinct guard and wrapped grip; restrained steel facets.',False),
        ('Sword_2','broad-tip',1.10,'Broader shaped tip and changed guard; compare the blade silhouette at the same length.',True),
        ('Claymore','long-grip',1.35,'Longer two-handed source with a longer grip and darker fittings. An equipment study, not newly granted gear.',False),
    ]),
    'library-shield':('Shield',[
        ('Shield_Round','round-boards',.76,'Round timber shield with a clear central boss, rim and board seams.',True),
        ('Shield_Round_2','reinforced-round',.76,'Different rim and reinforcement layout on a round timber form.',False),
        ('Shield_Heater','heater',.84,'Tapered shield form with a clear point, framed timber and restrained metal edging.',False),
    ]),
    'library-knife':('Knife',[
        ('Dagger','utility',.32,'Short practical blade, restrained guard and a clear wooden grip.',True),
        ('Dagger_2','leaf-point',.32,'Different leaf-shaped blade and handle layout at the same useful length.',False),
        ('Sword','long-knife',.42,'Shortened straight source with a narrow blade; compare grip-to-blade balance.',False),
    ]),
    'library-bow':('Bow',[
        ('Bow_Wooden','field-bow',1.25,'Bent timber limbs, quiet grip and a visible string; follows the existing field-bow idea.',True),
        ('Bow_Wooden2','curved-limbs',1.25,'Different limb curve and reinforcement, compared at equal height.',False),
        ('Bow_Golden','bound-grip',1.25,'Restrained timber adaptation of the shaped source with distinct grip fittings.',False),
    ]),
    'library-arrow':('Arrow',[
        ('Arrow','bone-point',.72,'Pale point and paired fiber fletching on a straight shaft.',True),
        ('Arrow','broad-fletching',.72,'Wider source feather geometry for readability at distance.',False),
        ('Arrow','slender-shaft',.72,'Slimmer shaft and quieter fletching for a lighter outline.',False),
    ]),
}


def prepare(source):
    spec=importlib.util.spec_from_file_location('sources',ROOT/'scripts/prepare-source-study.py')
    helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    group='source-equipment';output=ROOT/'apps/client/src/props/art-study'/group
    output.mkdir(parents=True,exist_ok=True)
    materials={name:solid_material('Study '+name,color,roughness=.9 if 'Steel' in name else .97) for name,color in PALETTE.items()}
    assets=[];sources=[]
    for row,(family,(label,variants)) in enumerate(FAMILIES.items()):
        for index,(file,variant,height,description,recommended) in enumerate(variants):
            path=source/(file+'.blend')
            with bpy.data.libraries.load(str(path),link=False) as (original,loaded):loaded.objects=original.objects
            objects=[]
            for obj in loaded.objects:
                if obj and obj.type=='MESH':
                    bpy.context.collection.objects.link(obj);objects.append(obj)
                    for slot in obj.material_slots:
                        name=slot.material.name.split('.')[0]
                        # The Claymore uses red material slots on its blade.
                        # Preserve material regions but author steel, not red iron.
                        slot.material=materials['LightSteel' if name=='LightRed' else 'Steel' if name=='Red' else name]
                    if family=='library-arrow' and index:
                        obj.scale.x*=1.28 if index==1 else .78
                        obj.scale.y*=1.28 if index==1 else .78
                    # Source facets are intentional bevels; preserve their normals.
            helper.normalize(objects,height)
            asset,placement=export_asset(objects,output,label.lower()+'-'+variant,family,label,variant,description,recommended,
                'Quaternius Modular Weapons Pack, CC0. OpenLegend normalizes scale and authors restrained steel, timber and leather colors; source topology retained.')
            placement.location.x=index*1.5;placement.location.y=row*2
            assets.append(asset);sources.append({'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
    helper.retain(group,assets,[{'url':'https://quaternius.com/packs/medievalweapons.html','downloadFolder':'https://drive.google.com/drive/folders/17VIeQr9R2d6lCO6Q7NVjzxdL55dnBeh6','license':'CC0','downloadArchiveSha256':'248df142c92822ee873b8178e690e3b88bbfba42e2ce74807b24ed0d73e6d65e','files':sources}],recipe=__file__)


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--sources',type=Path,required=True)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:]);prepare(args.sources)
