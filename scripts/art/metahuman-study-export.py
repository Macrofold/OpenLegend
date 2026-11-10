r"""Export explicit MetaHuman study samples in the full Unreal Editor (UE 5.8.4).

Run in an isolated external project with MetaHumanCharacter, PythonScriptPlugin
and EditorScriptingUtilities enabled. The full editor is required: geometry
export uses Slate/Content Browser. Do not use -run=pythonscript or -NullRHI.
The installed Python plugin passes arguments inside ExecutePythonScript to
sys.argv. On macOS, pass the entire script/argument string as ONE shell argument:

  UnrealEditor-Cmd '/external project/Proof.uproject' \
    '-ExecutePythonScript=/checkout with spaces/scripts/art/metahuman-study-export.py --plan \"/external workspace/plan.json\"' \
    -unattended -nosplash -nosound

The macOS launcher wraps argument values containing spaces; do not add another
pair of outer double quotes inside the shell argument. Escaped inner quotes
preserve a plan pathname containing spaces. The plugin identifies the script
pathname through its .py extension, then constructs sys.argv for argparse.
Require result.json status geometry-exported and verified outputs; exit 0 alone
does not prove success. Leave ScriptErrorsAreFatal off: an ordinary recorded
Python failure must not become a native fatal shutdown during this study.

The external JSON plan has these fields:
  source: {asset: "/Game/Proof/Neutral.Neutral", file: "/external/.../Neutral.uasset",
           sha256: "<saved source digest>"}
  output: "/external/fresh-export-directory"
  project_path: "/Game/Proof/Export01"  (a fresh project namespace)
  native_lods: {head: 2, body: 1}      (selection for later Blender preparation)
  samples: [{id: "neutral", body_targets: {}, face_landmark_pairs: []}]

body_targets maps exact native constraint names to targets. Unmentioned source
constraints stay unchanged. A face_landmark_pairs entry is
{indices: [left_index, right_index], deltas: [[x,y,z], [x,y,z]]}; both deltas
are explicit native-editor-space vectors. The source sculpt solver applies
them; this script does not infer anatomy, mirror indices or interpret PCA axes.

Each sample duplicates the same hash-pinned saved source, preserving its own
source asset and separate head/body FBXs with ALL native LODs. native_lods does
not select a UE export LOD or reduce bones. Outputs are intake evidence, not a
qualified portable kit. No cloud rig/texture requests, publication or runtime
installation occur. See docs/projects/metahuman-foundation-poc-tech-design.md.
"""

import argparse
import hashlib
import json
import math
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from asset_workspace import external_output  # noqa: E402


def file_record(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return {'file': str(path), 'bytes': path.stat().st_size, 'sha256': digest.hexdigest()}


def constraint_records(constraints):
    return [
        {key: str(c.name) if key == 'name' else getattr(c, key)
         for key in ('name', 'is_active', 'target_measurement', 'min_measurement', 'max_measurement')}
        for c in constraints
    ]


def verify_targets(constraints, targets):
    by_name = {str(c.name): c for c in constraints}
    for name, target in targets.items():
        c = by_name[name]
        if not c.is_active or abs(c.target_measurement - target) > 0.0001:
            raise RuntimeError(f'Body target was not retained: {name}={target}')


def validate_plan(plan):
    def identifier(value):
        return isinstance(value, str) and re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*', value)

    def number(value):
        return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)

    project_path = plan['project_path']
    if not isinstance(project_path, str) or not project_path.startswith('/Game/') or not all(
        identifier(part) for part in project_path[6:].split('/')
    ):
        raise ValueError('project_path must be a fresh /Game package directory with identifier names')
    if not re.fullmatch(r'[0-9a-f]{64}', plan['source']['sha256']):
        raise ValueError('source.sha256 must pin the saved source bytes')
    if set(plan['native_lods']) != {'head', 'body'} or any(
        type(lod) is not int or lod < 0 for lod in plan['native_lods'].values()
    ):
        raise ValueError('native_lods must name nonnegative head and body LOD indices')
    samples = plan['samples']
    if not isinstance(samples, list) or not samples:
        raise ValueError('samples must be a nonempty explicit list')
    seen = set()
    for sample in samples:
        if set(sample) - {'id', 'body_targets', 'face_landmark_pairs'}:
            raise ValueError('Unknown sample field; use id, body_targets and face_landmark_pairs')
        sample_id = sample['id']
        if not identifier(sample_id) or sample_id in seen:
            raise ValueError('Sample ids must be unique identifiers')
        seen.add(sample_id)
        targets = sample.get('body_targets', {})
        if not isinstance(targets, dict) or any(not isinstance(k, str) or not number(v) for k, v in targets.items()):
            raise ValueError(f'{sample_id}: body_targets must map native names to finite numbers')
        used_indices = set()
        for pair in sample.get('face_landmark_pairs', []):
            indices, deltas = pair['indices'], pair['deltas']
            if len(indices) != 2 or len(deltas) != 2:
                raise ValueError(f'{sample_id}: supply both landmark indices and deltas')
            for index, delta in zip(indices, deltas):
                if type(index) is not int or index < 0 or index in used_indices:
                    raise ValueError(f'{sample_id}: landmark indices must be distinct nonnegative integers')
                used_indices.add(index)
                if len(delta) != 3 or not all(number(v) for v in delta):
                    raise ValueError(f'{sample_id}: landmark deltas must be finite XYZ vectors')


def export_sample(unreal, assets, subsystem, source, plan, sample, out, record, write):
    sample_id = sample['id']
    root = f"{plan['project_path']}/{sample_id}"
    destination = f'{root}/{sample_id}'
    geometry_path = f'{root}/Geometry'
    sample_dir = out / sample_id
    sample_dir.mkdir()
    record.update({'id': sample_id, 'destination': destination, 'stage': 'duplicating', 'exports': []})
    write()
    character = assets.duplicate_asset(source.get_path_name(), destination)
    if not isinstance(character, unreal.MetaHumanCharacter):
        raise RuntimeError(f'{sample_id}: source duplication failed')
    owns_registration = False
    try:
        if subsystem.is_object_added_for_editing(character):
            raise RuntimeError(f'{sample_id}: duplicate was already open for editing')
        owns_registration = subsystem.try_add_object_to_edit(character)
        if not owns_registration:
            raise RuntimeError(f'{sample_id}: could not open duplicate for editing')
        record['stage'] = 'authoring'
        # Unreal Array iteration copies structs. A Python list retains the actual
        # wrappers we mutate and pass back in the original native index order.
        constraints = list(subsystem.get_body_constraints(character))
        record['source_constraints'] = constraint_records(constraints)
        targets = sample.get('body_targets', {})
        by_name = {str(c.name): c for c in constraints}
        for name, target in targets.items():
            if name not in by_name:
                raise ValueError(f'{sample_id}: unknown native body constraint {name}')
            c = by_name[name]
            if not c.min_measurement <= target <= c.max_measurement:
                raise ValueError(f'{sample_id}: target outside native range: {name}={target}')
            c.is_active = True
            c.target_measurement = target
        if targets:
            verify_targets(constraints, targets)
            subsystem.set_body_constraints(character, constraints)
            verify_targets(subsystem.get_body_constraints(character), targets)
            subsystem.commit_body_state(character)
        final_constraints = subsystem.get_body_constraints(character)
        verify_targets(final_constraints, targets)
        # Active constraints expose requested targets, not measured circumferences.
        record['committed_constraints'] = constraint_records(final_constraints)
        before = list(subsystem.get_face_landmarks(character))
        pairs = sample.get('face_landmark_pairs', [])
        indices = [index for pair in pairs for index in pair['indices']]
        deltas = [delta for pair in pairs for delta in pair['deltas']]
        if indices:
            if max(indices) >= len(before):
                raise ValueError(f'{sample_id}: landmark index outside this source state')
            subsystem.translate_face_landmarks(character, indices, [unreal.Vector(*d) for d in deltas])
            subsystem.commit_face_state(character)
        after = list(subsystem.get_face_landmarks(character))
        if len(after) != len(before):
            raise RuntimeError(f'{sample_id}: source landmark count changed')
        record['landmark_changes'] = [
            {'index': i, 'before': [before[i].x, before[i].y, before[i].z],
             'after': [after[i].x, after[i].y, after[i].z]}
            for i in indices
        ]
        if any(any(delta) for delta in deltas) and all(
            change['before'] == change['after'] for change in record['landmark_changes']
        ):
            raise RuntimeError(f'{sample_id}: requested face sculpt left all selected landmarks unchanged')
        record['face_landmarks'] = [[v.x, v.y, v.z] for v in after]
        record['stage'] = 'saving-source'
        write()
        if not assets.save_loaded_asset(character, only_if_is_dirty=False):
            raise RuntimeError(f'{sample_id}: source save failed')
        content = Path(unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_content_dir())).resolve()
        record['saved_source'] = file_record(content / (destination[6:] + '.uasset'))
        record['stage'] = 'exporting-geometry'
        write()
        params = unreal.MetaHumanGeometryExportParams()
        params.project_path = geometry_path
        params.head_skeletal_mesh = True
        params.body_skeletal_mesh = True
        params.full_body_skeletal_mesh = False
        params.overwrite_existing_assets = False
        unreal.MetaHumanCharacterExportBlueprintLibrary.export_geometry(character, params)
        for kind in ('head', 'body'):
            mesh = unreal.load_asset(f'{geometry_path}/{sample_id}_{kind.title()}')
            if not isinstance(mesh, unreal.SkeletalMesh):
                raise RuntimeError(f'{sample_id}: fresh {kind} mesh missing after geometry export')
            lod_count = unreal.SkeletalMeshEditorSubsystem.get_lod_count(mesh)
            if plan['native_lods'][kind] >= lod_count:
                raise ValueError(f'{sample_id}: selected {kind} LOD is unavailable ({lod_count} LODs)')
            if not assets.save_loaded_asset(mesh, only_if_is_dirty=False):
                raise RuntimeError(f'{sample_id}: {kind} mesh save failed')
            path = sample_dir / f'{kind}-all-lods.fbx'
            options = unreal.FbxExportOption()
            options.ascii = False
            options.force_front_x_axis = False
            options.level_of_detail = True
            options.vertex_color = True
            options.export_morph_targets = True
            options.fbx_export_compatibility = unreal.FbxExportCompatibility.FBX_2020
            task = unreal.AssetExportTask()
            task.object = mesh
            task.filename = str(path)
            task.automated = True
            task.prompt = False
            task.replace_identical = False
            task.exporter = unreal.SkeletalMeshExporterFBX()
            task.options = options
            ok = unreal.Exporter.run_asset_export_task(task)
            errors = [str(error) for error in task.errors]
            if not ok or errors or not path.is_file() or not path.stat().st_size:
                raise RuntimeError(f'{sample_id}: {kind} FBX export failed: {errors}')
            record['exports'].append({**file_record(path), 'kind': kind, 'asset': mesh.get_path_name(),
                                      'native_lod_count': lod_count, 'selected_native_lod': plan['native_lods'][kind],
                                      'errors': errors})
            write()
        record['stage'] = 'exported'
    finally:
        if owns_registration and subsystem.is_object_added_for_editing(character):
            subsystem.remove_object_to_edit(character)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--plan', required=True, help='Explicit external source/sample JSON plan')
    args = parser.parse_args()
    plan_path = external_output(args.plan)
    plan_bytes = plan_path.read_bytes()
    plan = json.loads(plan_bytes)
    out = external_output(plan['output'])
    out.mkdir(parents=True, exist_ok=False)
    (out / 'plan.json').write_bytes(plan_bytes)
    result = {'status': 'running', 'started': datetime.now(timezone.utc).isoformat(),
              'plan_sha256': hashlib.sha256(plan_bytes).hexdigest(), 'exporter': file_record(Path(__file__)),
              'cloud_rig_or_texture_requests': 0, 'samples': []}

    def write():
        temporary = out / 'result.json.tmp'
        temporary.write_text(json.dumps(result, indent=2, allow_nan=False) + '\n')
        temporary.replace(out / 'result.json')

    try:
        write()
        validate_plan(plan)
        import unreal
        result['engine'] = unreal.SystemLibrary.get_engine_version()
        assets = unreal.get_editor_subsystem(unreal.EditorAssetSubsystem)
        subsystem = unreal.get_editor_subsystem(unreal.MetaHumanCharacterEditorSubsystem)
        content = external_output(unreal.Paths.convert_relative_path_to_full(unreal.Paths.project_content_dir()))
        source_package = plan['source']['asset'].split('.')[0]
        if not source_package.startswith('/Game/') or '..' in source_package.split('/'):
            raise ValueError('source.asset must name a saved character in this external project under /Game')
        source_file = external_output(plan['source']['file'])
        if source_file != (content / (source_package[6:] + '.uasset')).resolve():
            raise ValueError('source.file does not match source.asset in this project')
        result['source'] = {**file_record(source_file), 'asset': plan['source']['asset']}
        if result['source']['sha256'] != plan['source']['sha256']:
            raise ValueError('Saved source SHA-256 differs from the plan')
        if assets.does_directory_exist(plan['project_path']):
            raise ValueError('project_path already exists; choose a fresh export namespace')
        source = unreal.load_asset(plan['source']['asset'])
        if not isinstance(source, unreal.MetaHumanCharacter):
            raise ValueError('source.asset is not a loadable MetaHumanCharacter')
        if subsystem.is_object_added_for_editing(source):
            raise ValueError('Close the source editor before exporting its pinned saved state')
        for sample in plan['samples']:
            record = {}
            result['samples'].append(record)
            export_sample(unreal, assets, subsystem, source, plan, sample, out, record, write)
            write()
        result['status'] = 'geometry-exported'
    except Exception as error:
        result['status'] = 'failed'
        result['error'] = f'{type(error).__name__}: {error}'
        raise
    finally:
        result['ended'] = datetime.now(timezone.utc).isoformat()
        write()


if __name__ == '__main__':
    main()
