"""Import the released models and map using the stock Unreal editor commandlet."""

import json
from pathlib import Path

import unreal


def import_assets(source, destination):
    task = unreal.AssetImportTask()
    task.filename = str(source)
    task.destination_path = destination
    task.automated = True
    task.save = True
    unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([task])
    return task.get_objects()


def import_model(source, destination):
    assets = import_assets(source, destination)
    meshes = [
        asset
        for asset in assets
        if isinstance(asset, (unreal.StaticMesh, unreal.SkeletalMesh))
    ]
    if not meshes:
        raise RuntimeError(f"No renderable mesh was imported from {source.name}.")

    clips = {}
    for name in ("Idle", "Run"):
        matches = [
            asset
            for asset in assets
            if isinstance(asset, unreal.AnimSequence)
            and asset.get_name().endswith(name)
        ]
        if len(matches) != 1:
            raise RuntimeError(f"Expected one {name} clip from {source.name}.")
        clip = matches[0]
        skeleton = clip.get_editor_property("skeleton")
        if not skeleton or any(
            mesh.get_editor_property("skeleton") != skeleton
            for mesh in meshes
            if isinstance(mesh, unreal.SkeletalMesh)
        ):
            raise RuntimeError(
                f"The {name} clip from {source.name} does not fit its imported parts."
            )
        clips[name] = clip.get_path_name()
    return [
        clips["Idle"],
        clips["Run"],
        *sorted(mesh.get_path_name() for mesh in meshes),
    ]


def run(request):
    plan = json.loads(request.read_text(encoding="utf-8"))
    bindings = {}
    for number, (appearance, source) in enumerate(plan["models"].items()):
        bindings[appearance] = import_model(
            Path(source), f"/Game/CurrentArt/Model{number}"
        )
    map_textures = [
        asset
        for asset in import_assets(Path(plan["map"]), "/Game/CurrentArt/Map")
        if isinstance(asset, unreal.Texture2D)
    ]
    if len(map_textures) != 1:
        raise RuntimeError("Expected one texture from the released map.")
    request.with_name("art-bindings.json").write_text(
        json.dumps({"models": bindings, "map": map_textures[0].get_path_name()}),
        encoding="utf-8",
    )


run(Path(__file__).with_name("art-request.json"))
