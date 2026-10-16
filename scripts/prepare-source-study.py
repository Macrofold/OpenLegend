"""Adapt retained source meshes for the replacement art study, offline in Blender.

Blender --background --factory-startup --disable-autoexec --offline-mode \
  --python-exit-code 1 --python scripts/prepare-source-study.py -- \
  --mercenary /path/to/original/study --libraries /path/to/acquired/environment

Source files remain read-only. The first proof uses real source topology and the
existing export helper; artistic acceptance requires the application's moving view.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from art_study_common import ROOT, export_asset, pixel_material, box_uv

PALETTE = ['202830', '30383e', '454d50', '616b69', '87928a', 'a5ac98',
           '322924', '49342b', '634431', '825738', 'a87447', 'c99a60', 'e4bd83',
           '472c29', '684032', '915738', 'b77950', 'd79b68', 'ecc28b', 'f3d8a5',
           '392832', '683c3b', '934936', 'ae5e42', '735330', 'ad7337', 'd19b4c',
           'edd09a', 'f5deb0']


def pixel_surface(image, body=False):
    """Recover the earlier viewer's one-time surface palette, not a new filter."""
    image.scale(min(256, image.size[0]), min(256, image.size[1]))
    rgba = np.array(image.pixels[:], dtype=np.float32).reshape(-1, 4)
    rgb = rgba[:, :3].copy()
    high, low = rgb.max(axis=1), rgb.min(axis=1)
    r, g, b = rgb.T
    if body:
        value = rgb @ np.array([.26, .55, .19])
        mail = (high > .18) & (high < .72) & (high-low < .16) & (b > r*.94)
        rgb[mail] = np.where((value[mail] < .35)[:, None], [.28,.34,.36], [.4,.46,.47])
        wrap = ~mail & (low > .34) & (high-low < .28) & (r > b*1.1)
        rgb[wrap] = np.array([[.46,.42,.33], [.66,.6,.47], [.83,.76,.61]])[np.digitize(value[wrap], [.51,.68])]
    palette = np.array([[int(h[i:i+2],16)/255 for i in (0,2,4)] for h in PALETTE])
    distance = ((rgb[:,None,:]-palette[None,:,:])**2 * [.26,.55,.19]).sum(axis=2)
    rgba[:,:3] = palette[distance.argmin(axis=1)]
    image.pixels.foreach_set(rgba.ravel())
    image.pack()


def clean_materials():
    for material in bpy.data.materials:
        if not material.use_nodes:
            continue
        shader = material.node_tree.nodes.get('Principled BSDF')
        if not shader:
            continue
        for link in list(material.node_tree.links):
            if link.to_socket in (shader.inputs['Emission Color'], shader.inputs['Normal'], shader.inputs['Roughness'], shader.inputs['Metallic']):
                material.node_tree.links.remove(link)
        shader.inputs['Emission Color'].default_value = (0,0,0,1)
        shader.inputs['Metallic'].default_value = 0
        shader.inputs['Roughness'].default_value = .92
        shader.inputs['Specular IOR Level'].default_value = .08
        for node in material.node_tree.nodes:
            if node.type == 'GROUP' and node.node_tree and 'glTF' in node.node_tree.name:
                for socket in node.inputs:
                    for link in list(socket.links): material.node_tree.links.remove(link)
            if node.type == 'TEX_IMAGE':
                node.interpolation = 'Linear'


def color_texture(material):
    shader = material.node_tree.nodes.get('Principled BSDF')
    return shader.inputs['Base Color'].links[0].from_node


def normalize(objects, height, max_span=None):
    graph = bpy.context.evaluated_depsgraph_get()
    points = []
    for obj in objects:
        if obj.type != 'MESH':
            continue
        evaluated = obj.evaluated_get(graph)
        mesh = evaluated.to_mesh()
        points.extend(evaluated.matrix_world @ v.co for v in mesh.vertices)
        evaluated.to_mesh_clear()
    lower = Vector([min(p[i] for p in points) for i in range(3)])
    upper = Vector([max(p[i] for p in points) for i in range(3)])
    center = Vector(((lower.x+upper.x)/2, (lower.y+upper.y)/2, lower.z))
    scale = height/(upper.z-lower.z)
    if max_span is not None:
        scale=min(scale,max_span/max(upper.x-lower.x,upper.y-lower.y))
    transform = Matrix.Scale(scale,4) @ Matrix.Translation(-center)
    for obj in objects:
        if obj.parent not in objects:
            obj.matrix_world = transform @ obj.matrix_world
    bpy.context.view_layer.update()


def retain(group, assets, sources, recipe=None):
    output = ROOT/'apps/client/src/props/art-study'/group
    editable = ROOT/'art-direction/assets/source-study'
    editable.mkdir(parents=True, exist_ok=True)
    source = editable/(group+'.blend')
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(source))
    recipe=Path(recipe or __file__)
    data = {'group':group, 'sourceFile':str(source.relative_to(ROOT)),
            'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
            'recipe': {'path':str(recipe.relative_to(ROOT)), 'sha256':hashlib.sha256(recipe.read_bytes()).hexdigest()},
            'helpers': {name:hashlib.sha256((ROOT/'scripts'/name).read_bytes()).hexdigest() for name in ['art_study_common.py','prepare-source-study.py','prepare-mercenary-variants.py']},
            'sources':sources, 'assets':assets}
    (output/'catalog.json').write_text(json.dumps(data,indent=2)+'\n')


def mercenaries(source):
    group = 'source-mercenary'
    output = ROOT/'apps/client/src/props/art-study'/group
    output.mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    assets = []
    variant_module = importlib.util.spec_from_file_location('mercenary_paint', ROOT/'scripts/prepare-mercenary-variants.py')
    paint = importlib.util.module_from_spec(variant_module)
    variant_module.loader.exec_module(paint)
    for index, variant in enumerate(('restored', 'tailored', 'embroidered')):
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=str(source/'assets/mercenary.glb'))
        objects = list(set(bpy.data.objects)-before)
        for obj in objects[:]:
            if obj.name.startswith('Icosphere'):
                objects.remove(obj)
                bpy.data.objects.remove(obj,do_unlink=True)
        rig = next(o for o in objects if o.type == 'ARMATURE')
        bpy.context.scene.frame_set(1)
        body = next(o for o in objects if o.name.startswith('Mercenary · worn'))
        body_node = color_texture(body.data.materials[0])
        # Preserve the concept artist's actual facial features at sufficient
        # atlas resolution. Broad world-space eye boxes fragmented across UV
        # islands and damaged the source face; that experiment is rejected.
        identity_image=body_node.image.copy();identity_image.scale(1024,1024)
        original=paint.image_array(identity_image)
        position,covered=paint.rasterize_surface(body,1024)
        if variant == 'restored':
            pixel_surface(body_node.image,body=True)
            body_node.image.scale(1024,1024)
            designed=paint.image_array(body_node.image)
        else:
            guides=paint.surface_materials(original,position,covered)
            designed=paint.body_paint('graphic' if variant=='tailored' else 'painted',position,covered,guides)
        identity=(position[:,:,2]>1.59)|((np.abs(position[:,:,0])>.255)&(position[:,:,2]>.73)&(position[:,:,2]<1.035))
        designed[identity]=original[identity]
        body_node.image = paint.save_image('Mercenary '+variant,designed,output/('body-'+variant+'.png'))
        evaluated=body.evaluated_get(bpy.context.evaluated_depsgraph_get())
        face_mesh=evaluated.to_mesh()
        surface=BVHTree.FromPolygons([evaluated.matrix_world@v.co for v in face_mesh.vertices],
            [tuple(p.vertices) for p in face_mesh.polygons])
        face=paint.face_details('faithful',surface,rig.matrix_world@rig.pose.bones['Head'].matrix,eye_width=.021,eye_detail_scale=1.7)
        evaluated.to_mesh_clear()
        # Preserve the concept face; only strengthen eyes on that exact curved
        # surface. The same retained geometry is consumed by the live head rig.
        face['regions']=[r for r in face['regions'] if r['name'] in ('ivory','iris','charcoal')]
        face['sourceSha256']=hashlib.sha256((source/'assets/mercenary.glb').read_bytes()).hexdigest()
        face['authoringScript']='scripts/prepare-source-study.py'
        (output/'face-study.json').write_text(json.dumps(face,indent=2)+'\n')
        objects+=paint.editable_face(rig,face,prefix='Study eyes '+variant+' ')
        prepared_cape = set()
        for obj in objects:
            if obj.type!='MESH':
                continue
            for material in obj.data.materials:
                if material.name.startswith('Madder'):
                    if material in prepared_cape:
                        continue
                    prepared_cape.add(material)
                    texture = color_texture(material)
                    if variant=='embroidered':
                        texture.image = paint.save_image('Peacock paired embroidery',paint.cape_paint('painted',paint.image_array(texture.image)),output/'cape-embroidered.png')
                    elif variant=='restored':
                        pixel_surface(texture.image)
                    if variant != 'embroidered':
                        texture.image.filepath_raw=str(output/('cape-'+variant+'.png'))
                        texture.image.file_format='PNG'
                        texture.image.save()
        clean_materials()
        normalize(objects,2.035)
        descriptions = [
            'Earlier concept-derived model and 29-color surface preparation, with original face detail, fitted eye accents and gold mantle preserved.',
            'Original face anatomy with fitted eye accents, quiet mail, broader quilt seams and wrapped linen. Original cape retained.',
            'Original face with fitted eye accents, open mail groups, seams and paired peacock embroidery. Cloth remains a continuous lined surface.',
        ]
        asset, placement = export_asset(objects,output,'mercenary-'+variant,'mercenary','Peacock Mercenary',variant,descriptions[index],variant=='restored',
            'Owner-supplied concept → Meshy body/rig; original OpenLegend cape. Study use; production rights remain unqualified.')
        placement.location.x = index*1.5
        assets.append(asset)
    retain(group,assets,[{'path':str(source/'assets/mercenary.glb'),'sha256':hashlib.sha256((source/'assets/mercenary.glb').read_bytes()).hexdigest()}])


def nature(libraries):
    group='source-nature'
    output=ROOT/'apps/client/src/props/art-study'/group
    output.mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    assets=[]
    sources=[]
    for index, (name,variant) in enumerate((('CommonTree_1','open-boughs'),('CommonTree_4','layered-crown'),('CommonTree_5','sheltered-crown'))):
        source=libraries/'quaternius-standard/glTF'/(name+'.gltf')
        before=set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=str(source))
        objects=list(set(bpy.data.objects)-before)
        clean_materials()
        normalize(objects,4.8)
        palette=np.array([[int(h[i:i+2],16)/255 for i in (0,2,4)] for h in ['293e35','405741','5b7049','809056','a5ac6c']])
        palette=np.where(palette<=.04045,palette/12.92,((palette+.055)/1.055)**2.4)
        for obj in objects:
            if obj.type!='MESH': continue
            attribute=obj.data.color_attributes.active_color
            normals=[normal.vector.copy() for normal in obj.data.corner_normals]
            inverse_normal=obj.matrix_world.to_3x3().transposed()
            for polygon in obj.data.polygons:
                if 'Leaves' not in obj.data.materials[polygon.material_index].name: continue
                center=sum((obj.matrix_world@obj.data.vertices[i].co for i in polygon.vertices),Vector())/len(polygon.vertices)
                color=palette[min(4,max(1,int(center.z/4.8*4))) ]
                for loop in polygon.loop_indices:
                    vertex=obj.data.loops[loop].vertex_index
                    if attribute:
                        attribute.data[loop if attribute.domain=='CORNER' else vertex].color=(*color,1)
                    point=obj.matrix_world@obj.data.vertices[vertex].co
                    normal=Vector((point.x*.7,point.y*.7,(point.z-3.1)*.5+.8)).normalized()
                    normals[loop]=(inverse_normal@normal).normalized()
            obj.data.normals_split_custom_set(normals)
            for material in obj.data.materials:
                for node in material.node_tree.nodes:
                    if node.type=='TEX_IMAGE' and node.image and any(socket.is_linked for socket in node.outputs):
                        node.image.scale(256,256)
                        if 'Leaves' in material.name:
                            pixels=np.array(node.image.pixels[:],dtype=np.float32).reshape(-1,4)
                            pixels[:,:3]=1
                            node.image.pixels.foreach_set(pixels.ravel())
                        node.image.pack()
        asset,placement=export_asset(objects,output,'broadleaf-'+variant,'library-broadleaf','Library broadleaf',variant,
            'Actual Quaternius branch structure with preserved leaf groups, olive/moss color relationships and quieter bark. Crown arrangement comparison.',index==2,
            'Quaternius Stylized Nature MegaKit Standard, CC0; normalized and source normal maps removed for controlled light.')
        placement.location.x=index*5.5
        assets.append(asset)
        sources.append({'path':str(source),'sha256':hashlib.sha256(source.read_bytes()).hexdigest()})
    retain(group,assets,sources)


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--mercenary',type=Path,required=True)
    parser.add_argument('--libraries',type=Path,required=True)
    parser.add_argument('--families',nargs='*',choices=['mercenary','broadleaf'])
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    if not args.families or 'mercenary' in args.families:mercenaries(args.mercenary)
    if not args.families or 'broadleaf' in args.families:nature(args.libraries)
