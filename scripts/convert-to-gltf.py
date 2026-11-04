"""Convert downloaded packs' Blender and FBX files to GLB for the asset library; run with Blender Python.

    /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
      --disable-autoexec --offline-mode --python-exit-code 1 \
      --python scripts/convert-to-gltf.py -- PACK_DIRECTORY [PACK_DIRECTORY ...]

Each pack directory holds a download and its `extracted` copy (see
scripts/prepare-asset-library.ts). Every `.blend` and `.fbx` there becomes a GLB at the same
relative path under the pack's `converted` folder, which the library plan then includes. The files
are downloaded data: their embedded scripts never run, and no image outside the pack is read, since
a file can name any path on the disk as a texture.

Geometry, UVs and materials convert as Blender reads them. Blender 2.8 and later drop the image
textures of files saved by Blender 2.7x, whose materials kept them in texture slots, so a material
left without an image gets the file's colour map when the file names exactly one in its folder,
plus its normal map when it names exactly one. Other files keep their own image nodes unchanged.
docs/asset-workflow.md#edit-or-generate-art
"""

import re
import sys
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from asset_workspace import external_output

import bpy

SOURCES = (".blend", ".fbx")
NORMAL = re.compile(r"(^|[_ -])(normal|nor|nrm)([_ .-]|$)", re.I)
# Other maps a 2.7x file names (specular, bump, masks) have no place on a glTF base colour.
OTHER = re.compile(
    r"(^|[_ -])(spec|specular|gloss|height|bump|disp|ao|occlusion|alpha|mask)([_ .-]|$)", re.I
)


def inside(path, folder):
    return folder == path or folder in path.parents


def find(name, folder):
    """A file of exactly this name (not a glob pattern) in the folder, and not through a link
    that points out of it."""
    found = (candidate.resolve() for candidate in folder.rglob("*") if candidate.name == name)
    return next((item for item in found if item.is_file() and inside(item, folder)), None)


def contain_images(root):
    """Keep every file image inside the pack: an image named by a path elsewhere (often the
    author's own disk) is looked up by name in the pack, and dropped when the pack lacks it."""
    for image in list(bpy.data.images):
        if image.source != "FILE" or image.packed_file or not image.filepath:
            continue
        path = Path(bpy.path.abspath(image.filepath)).resolve()
        if path.is_file() and inside(path, root):
            continue
        path = find(Path(image.filepath.replace("\\", "/")).name, root)
        if path is None:
            bpy.data.images.remove(image)
        else:
            image.filepath = str(path)


def shipped_images(folder):
    """The file images the scene names that exist in the file's own folder; packed brushes and
    generated paint buffers are not textures of the model."""
    shipped = {}
    for image in bpy.data.images:
        if image.source != "FILE" or image.packed_file or not image.filepath:
            continue
        path = Path(bpy.path.abspath(image.filepath)).resolve()
        if not (path.is_file() and inside(path, folder)):
            path = find(Path(image.filepath.replace("\\", "/")).name, folder)
            if path is None:
                continue
            image.filepath = str(path)
        shipped[path] = image
    return list(shipped.items())


def paint(material, colour, normal):
    """Base colour from the shipped colour map, through the material's own principled shader."""
    if material.node_tree is None:
        return False
    nodes, links = material.node_tree.nodes, material.node_tree.links
    shader = next((node for node in nodes if node.type == "BSDF_PRINCIPLED"), None)
    if shader is None:
        return False
    # Blender's conversion of a 2.7x material renders it through an EEVEE-only output, which the
    # glTF exporter does not read; the shader's output serves every renderer instead.
    for link in shader.outputs["BSDF"].links:
        if link.to_node.type == "OUTPUT_MATERIAL":
            link.to_node.target = "ALL"
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = colour
    links.new(texture.outputs["Color"], shader.inputs["Base Color"])
    if normal is not None:
        normal.colorspace_settings.name = "Non-Color"
        map_node = nodes.new("ShaderNodeTexImage")
        map_node.image = normal
        strength = nodes.new("ShaderNodeNormalMap")
        links.new(map_node.outputs["Color"], strength.inputs["Color"])
        links.new(strength.outputs["Normal"], shader.inputs["Normal"])
    return True


def load(source):
    if source.suffix.lower() == ".blend":
        bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False, use_scripts=False)
    else:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.fbx(filepath=str(source))


def convert(source, output, root):
    load(source)
    contain_images(root)
    images = shipped_images(source.parent.resolve())
    normals = [image for path, image in images if NORMAL.search(path.stem)]
    colours = [
        image for path, image in images if not NORMAL.search(path.stem) and not OTHER.search(path.stem)
    ]
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH" and obj.visible_get()]
    if not meshes:
        raise ValueError(f"{source}: no visible mesh")
    painted = []
    # Only UV-mapped surfaces can carry the map (a photo backdrop in the file has none).
    mapped = [obj for obj in meshes if obj.data.uv_layers]
    for material in {slot.material for obj in mapped for slot in obj.material_slots if slot.material}:
        has_image = material.node_tree is not None and any(
            node.type == "TEX_IMAGE" and node.image for node in material.node_tree.nodes
        )
        if not has_image and len(colours) == 1:
            if paint(material, colours[0], normals[0] if len(normals) == 1 else None):
                painted.append(material.name)
    # A file saved in edit mode reopens in it; applying transforms needs object mode.
    active = bpy.context.view_layer.objects.active
    if active is not None and active.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    for obj in bpy.context.view_layer.objects:
        obj.select_set(obj in meshes)
    bpy.context.view_layer.objects.active = meshes[0]
    # Applied rotation and scale (negative scales included) give the GLB plain node transforms.
    bpy.ops.object.make_single_user(object=True, obdata=True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(output), export_format="GLB", use_selection=True, export_yup=True,
        export_apply=True, export_texcoords=True, export_normals=True, export_animations=False,
        export_image_format="AUTO",
    )
    names = ", ".join(sorted(path.name for path, _ in images)) or "none"
    print(f"{source.name}: {len(meshes)} meshes; images {names}; painted {painted or 'none'}")


def main():
    packs = [Path(value).resolve() for value in sys.argv[sys.argv.index("--") + 1:]]
    if not packs:
        raise SystemExit("Usage: ... --python scripts/convert-to-gltf.py -- PACK_DIRECTORY ...")
    for pack in packs:
        extracted = pack / "extracted"
        for source in sorted(path for path in extracted.rglob("*") if path.suffix.lower() in SOURCES):
            if "__MACOSX" in source.parts:
                continue
            relative = source.relative_to(extracted).with_suffix(".glb")
            convert(source, external_output(pack / "converted" / relative), extracted.resolve())


main()
