"""CC0 anatomical source study, using MPFB only in an isolated offline Blender run.

The source directory contains mpfb2-master, makehuman_system_assets and suits02.
No add-on is installed in the user's Blender profile. Saved source retains the rig.
"""
import argparse
import importlib.util
import sys
import types
from pathlib import Path

import bpy
import numpy as np
from mathutils import Quaternion

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from art_study_common import ROOT, export_asset, solid_material, facial_features
from study_human_motion import export_motion


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def source_services(root):
    """Import the official add-on in this process; preferences are temporary."""
    source = root/'mpfb2-master/src/mpfb'
    package = 'bl_ext.openlegend_study.mpfb'
    parent = types.ModuleType('bl_ext.openlegend_study')
    parent.__path__ = [str(source.parent)]
    sys.modules['bl_ext.openlegend_study'] = parent
    spec = importlib.util.spec_from_file_location(package, source/'__init__.py', submodule_search_locations=[str(source)])
    module = importlib.util.module_from_spec(spec)
    sys.modules[package] = module
    spec.loader.exec_module(module)
    bpy.context.preferences.addons.new().module = package
    module.register()
    return module.MPFB_CONTEXTUAL_INFORMATION['SERVICES']['HumanService']


def image_material(obj, image, alpha=False):
    material = bpy.data.materials.new(obj.name+' painted')
    material.use_nodes = True
    shader = material.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Roughness'].default_value = .96
    shader.inputs['Specular IOR Level'].default_value = .08
    node = material.node_tree.nodes.new('ShaderNodeTexImage')
    node.image = image
    node.interpolation = 'Linear'
    material.node_tree.links.new(node.outputs['Color'], shader.inputs['Base Color'])
    if alpha:
        # Binary coverage avoids transparent-layer sorting through hair/eyebrows.
        clip = material.node_tree.nodes.new('ShaderNodeMath')
        clip.operation = 'GREATER_THAN'
        clip.inputs[1].default_value = .45
        material.node_tree.links.new(node.outputs['Alpha'], clip.inputs[0])
        material.node_tree.links.new(clip.outputs[0], shader.inputs['Alpha'])
    obj.data.materials.clear()
    obj.data.materials.append(material)


def source_image(obj):
    return next(node.image for material in obj.data.materials for node in material.node_tree.nodes
                if node.type=='TEX_IMAGE' and node.image and 'normal' not in node.image.name.lower())


def cloth_image(obj, paint, output, variant):
    """Design garment panels on the fitted source, with no photographic mail."""
    size = 256
    position, covered = paint.rasterize_surface(obj, size)
    x,y,z = [position[:,:,i] for i in range(3)]
    palettes = {
        'field-tunic':['354749','465c59','62756a','8b9780'],
        'work-vest':['756c53','95876b','b3a482','d2c39c'],
        'travel-coat':['4a434b','62545a','81666b','9e8280'],
    }
    palette = np.array([[int(h[i:i+2],16)/255 for i in (0,2,4)] for h in palettes[variant]])
    # Calm front panels, side seams, lighter raised folds and designed hems.
    fold = np.cos(x*24) + .35*np.cos(z*15)
    shade = np.where(fold > .7, 2, 1)
    shade[(np.abs(x)>.24)&(z<1.33)] = 0
    color = palette[shade]
    hem = (z<.79)|((z>1.43)&(np.abs(x)<.19))
    color[hem] = palette[0]
    piping = ((z>.79)&(z<.805))|((z>1.43)&(z<1.444)&(np.abs(x)<.19))
    color[piping] = palette[3]
    seam = (np.abs(x)<.008)&(y<0)&(z>1.20)
    color[seam] = palette[0]
    # Small useful fastening, not a large decorative emblem.
    color[(np.abs(x)<.018)&(y<0)&(z>1.31)&(z<1.34)] = [.60,.43,.23]
    color[~covered] = palette[1]
    return paint.save_image('Ada '+variant+' cloth',color,output/('ada-'+variant+'-cloth.png'))


def main(source):
    human_service = source_services(source)
    helper = load_module('source_study',ROOT/'scripts/prepare-source-study.py')
    paint = load_module('paint_helpers',ROOT/'scripts/prepare-mercenary-variants.py')
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.context.preferences.filepaths.save_version = 0
    group='source-people'
    output=ROOT/'apps/client/src/props/art-study'/group
    output.mkdir(parents=True,exist_ok=True)
    system=source/'makehuman_system_assets'
    clothing=source/'suits02/clothes'
    assets=[]
    for index,variant in enumerate(('field-tunic','work-vest','travel-coat')):
        before=set(bpy.data.objects)
        human=human_service.create_human(macro_detail_dict={
            'age':.3,'cupsize':.4,'firmness':.5,'gender':0,'height':.55,'muscle':.45,
            'proportions':.5,'race':{'african':0,'asian':0,'caucasian':1},'weight':.46})
        human.name='Ada '+variant
        rig=human_service.add_builtin_rig(human,'default')
        human_service.set_character_skin(str(system/'skins/young_caucasian_female/young_caucasian_female.mhmat'),human,skin_type='GAMEENGINE')
        hair=('ponytail01','bob02','braid01')[index]
        for category,name in [('Eyes','eyes/low-poly/low-poly'),('Hair',f'hair/{hair}/{hair}'),('Eyebrows','eyebrows/eyebrow001/eyebrow001')]:
            human_service.add_mhclo_asset(str(system/(name+'.mhclo')),human,asset_type=category,subdiv_levels=0,material_type='GAMEENGINE')
        clothes=[]
        for piece in ['boots','pants','tunic']:
            name='rehmanpolanski_viking_'+piece
            clothes.append(human_service.add_mhclo_asset(str(clothing/name/(name+'.mhclo')),human,subdiv_levels=0,material_type='GAMEENGINE'))
        objects=list(set(bpy.data.objects)-before)
        # Outfit-specific coverage: keep head, neck and hands, remove skin
        # concealed by this complete tunic/trouser/boot set. This is not a
        # collision rule and does not affect the unclothed source anatomy.
        group_names={group.index:group.name for group in human.vertex_groups}
        visible=human.vertex_groups.new(name='Visible skin for this outfit')
        indices=[]
        for vertex in human.data.vertices:
            body=any(group_names.get(g.group)=='body' and g.weight>.5 for g in vertex.groups)
            exposed=any(g.weight>.03 and group_names.get(g.group,'').startswith(('head','neck','hand','finger')) for g in vertex.groups)
            if body and exposed: indices.append(vertex.index)
        visible.add(indices,1,'REPLACE')
        mask=human.modifiers.new('Covered body follows this outfit','MASK');mask.vertex_group=visible.name
        for obj in objects:
            if obj.type!='MESH': continue
            if obj==clothes[-1]:
                image=cloth_image(obj,paint,output,variant)
            else:
                image=source_image(obj).copy()
                size=512 if obj==human else 256
                image.scale(size,size)
                if hair in obj.name or 'eyebrow' in obj.name.lower():
                    pixels=np.array(image.pixels[:],dtype=np.float32).reshape(-1,4)
                    value=pixels[:,:3]@np.array([.26,.55,.19])
                    pixels[:,:3]=np.array([.21,.14,.10])+value[:,None]*np.array([.22,.16,.10])
                    image.pixels.foreach_set(pixels.ravel())
                image.pack()
            image_material(obj,image,'hair' in obj.name.lower() or hair in obj.name or 'eyebrow' in obj.name)
        # The anatomical source already has fitted eyes, brows and lips. A
        # second projected feature layer made doubled brows and dark eye masks;
        # preserve one facial design and assess it at the final sample density.
        if index==1:
            # Reuse the fitted tunic as a sleeveless short over-vest. The complete
            # linen layer remains beneath it, so the cut cannot expose the torso.
            vest=clothes[-1].copy();vest.data=clothes[-1].data.copy()
            bpy.context.collection.objects.link(vest);objects.append(vest)
            import bmesh
            mesh=bmesh.new();mesh.from_mesh(vest.data)
            remove=[v for v in mesh.verts if v.co.z<.90 or abs(v.co.x)>.26]
            bmesh.ops.delete(mesh,geom=remove,context='VERTS');mesh.to_mesh(vest.data);mesh.free()
            for vertex in vest.data.vertices:
                vertex.co.x*=1.035;vertex.co.y*=1.07
            vest.data.materials.clear();vest.data.materials.append(solid_material('Ada moss work vest','59634d'))
        if index==2:
            # A longer travelling hem changes the silhouette; source weights
            # and the clothed legs remain intact for the later walking check.
            for vertex in clothes[-1].data.vertices:
                if vertex.co.z<1.04: vertex.co.z-=min(.15,(1.04-vertex.co.z)*.6)
        for side,angle in [('L',.5),('R',-.5)]:
            bone=rig.pose.bones['upperarm01.'+side]
            rest=bone.bone.matrix_local.to_quaternion()
            bone.rotation_mode='QUATERNION'
            bone.rotation_quaternion=rest.inverted()@Quaternion((0,1,0),angle)@rest
        helper.normalize(objects,1.85)
        description=[
            'Fitted field tunic, restrained collar and hem, tied-back hair. Real anatomical eyes and hands; plain wool replaces the source mail print.',
            'Short moss vest over linen, cropped hair and a clear waist. The underlayer remains complete beneath the tailored vest.',
            'Longer muted travel coat and braid, with broad cloth panels and a small collar fastening.',
        ][index]
        asset,placement=export_asset(objects,output,'ada-'+variant,'ada','Ada',variant,description,index==0,
            'MakeHuman/MPFB core anatomy, eyes, hair and Rehman Polanski Viking garments: CC0. OpenLegend tailoring and painting: AGPL-3.0-only. Appearance is a study proposal.')
        motion_path=output/('ada-'+variant+'-motion.glb')
        export_motion(objects,rig,placement,motion_path)
        asset['animatedFile']=motion_path.name
        placement.location.x=index*1.25
        assets.append(asset)
    helper.retain(group,assets,[
        {'url':'https://github.com/makehumancommunity/mpfb2','license':'GPL-3.0-or-later code; CC0 core mesh'},
        {'url':'https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html','license':'CC0','archiveSha256':'b542127a8e25547c7c29c19f2d1d2adb9a664c80396ecd694095dbc8028a0107'},
        {'url':'https://static.makehumancommunity.org/assets/assetpacks/suits02.html','license':'CC0','archiveSha256':'437f4d7ab92b698c1fb1047e7d62b22c11f195b2473e936118661dc8e6b7eb7a'},
    ],recipe=__file__)


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--sources',type=Path,required=True)
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    main(args.sources)
