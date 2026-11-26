#!/usr/bin/env python3
"""Compile 2/6/9-support body grid, assemble Blender kit, build compiled.json, verify TS/Python parity, and stage local delivery."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys

sys.dont_write_bytecode = True

PACKAGE_DIR = Path(__file__).resolve().parent
if str(PACKAGE_DIR) not in sys.path:
    sys.path.insert(0, str(PACKAGE_DIR))

from runtime_env import (  # noqa: E402
    external_output,
    resolve_blender_bin,
    resolve_blender_python,
    resolve_repo_root,
    resolve_workspace_root,
    subprocess_env,
)

EVIDENCE = "metahuman-poc-private-evaluation-owner-attestation-20261107"


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def artifact(path: Path, media: str) -> dict:
    return {
        "boundary": "art-library",
        "accessDomain": "curated-private",
        "sha256": sha256_file(path),
        "bytes": path.stat().st_size,
        "mediaType": media,
    }


def save_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, allow_nan=False) + "\n")


def run_logged(cmd: list[str], cwd: Path, log_base: Path, timeout: int = 180) -> Path:
    log_base.parent.mkdir(parents=True, exist_ok=True)
    out_p, err_p = log_base.with_suffix(".stdout"), log_base.with_suffix(".stderr")
    with out_p.open("wb") as stdout, err_p.open("wb") as stderr:
        res = subprocess.run(cmd, cwd=cwd, timeout=timeout, stdout=stdout, stderr=stderr, env=subprocess_env())
    if res.returncode != 0:
        raise RuntimeError(f"Command failed ({res.returncode}): {' '.join(cmd)}\nstderr:\n{err_p.read_text()[-2500:]}")
    return out_p


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", required=True, type=Path, help="body-support-grid-input manifest.json")
    parser.add_argument("--output", required=True, type=Path, help="Fresh stage package directory")
    parser.add_argument("--repository", type=Path, default=None)
    parser.add_argument("--art-root", type=Path, default=None, help="External OpenLegend art workspace root")
    parser.add_argument("--blender", type=Path, default=None)
    args = parser.parse_args()

    repo = resolve_repo_root(args.repository)
    art_root = resolve_workspace_root(args.art_root)
    out = external_output(args.output)
    blender_bin = str(resolve_blender_bin(args.blender))
    py_bin = str(resolve_blender_python(Path(blender_bin)))
    if out.exists():
        raise ValueError(f"Output directory already exists: {out}")
    out.mkdir(parents=True)
    logs = out / "logs"

    body_grid = repo / "scripts/art/body-grid.py"
    source_kit = art_root / "2026-11-11-peacock-full-transfer/study/continuation/finish/root/lane-orientation-kit"
    lean_kit = art_root / "2026-11-11-peacock-full-transfer/study/continuation/finish/root/body-audit/body-v3-kit"
    coverage_kit = art_root / "2026-11-12-body-reference-family/study/execution-20261112/retry/retry-coverage/t-pose-continuous-covered/kit"
    compile_only = art_root / "2026-11-11-peacock-full-transfer/study/continuation/runtime/compile-only.py"
    project_def = (
        art_root
        / "2026-11-07-metahuman-foundation-poc/study/evidence/current-hair-integration01/project-definition-ready.ts"
    )
    parity_mts = Path(__file__).resolve().parent / "verify_evaluator_parity.mts"
    prepared_textures = art_root / "2026-11-11-peacock-muscle-definition/study/runtime/native-prepared"

    # 1. Offline two-slider decomposition & reconstruction proof
    grid_dir = out / "grid-compile"
    run_logged(
        [py_bin, str(body_grid), "compile", "--manifest", str(args.manifest.resolve()), "--output", str(grid_dir), "--repository", str(repo)],
        cwd=repo,
        log_base=logs / "01-grid-compile",
    )

    # 2. Assemble rebased Blender family kit (bodySkin, shirt support, R4 studioShorts, unmasked proofShirt)
    kit_dir = out / "kit"
    run_logged(
        [
            blender_bin,
            "--background",
            "--factory-startup",
            "--offline-mode",
            "--python-exit-code",
            "1",
            "--python",
            str(body_grid),
            "--",
            "assemble-kit",
            "--mesh-patch",
            str(grid_dir / "mesh-patch.json"),
            "--source-kit",
            str(source_kit),
            "--lean-kit",
            str(lean_kit),
            "--coverage-kit",
            str(coverage_kit),
            "--output",
            str(kit_dir),
            "--repository",
            str(repo),
        ],
        cwd=repo,
        log_base=logs / "02-assemble-kit",
    )

    # 3. Prepare asset descriptor reference & compile family.blend -> compiled.json via scripts/art/people.py
    delivery_dir = out / "delivery"
    desc_dir = delivery_dir / "descriptor"
    study_dir = delivery_dir / "study"
    files_root = study_dir / "files"
    files_root.mkdir(parents=True)

    tsx_cli = ["node", str(repo / "node_modules/tsx/dist/cli.mjs")]
    assets_cli = [*tsx_cli, str(repo / "scripts/assets.ts")]
    domain_flags = ["--boundary", "art-library", "--domain", "curated-private"]

    profile = json.loads((kit_dir / "profile.json").read_text())
    blend_hash = sha256_file(kit_dir / "family.blend")
    rev = f"body-family-20261113-{blend_hash[:12]}"

    def make_manifest(kind: str, asset_id: str, meta: dict, files: dict | None = None, deps: list | None = None) -> dict:
        return {
            "kind": kind,
            "identity": {"owner": {"kind": "collection", "id": "art-studies"}, "assetId": asset_id, "revisionId": rev},
            "rightsEvidence": [EVIDENCE, "body-reference-family-20261113"],
            "metadata": meta,
            "files": files or {},
            "dependencies": deps or [],
        }

    save_json(
        desc_dir / "manifest.json",
        make_manifest("asset", "peacock-body-family-descriptor", {"appearanceFamily": profile}),
    )
    ref_out = run_logged(
        [*assets_cli, "prepare", "--manifest", str(desc_dir / "manifest.json"), *domain_flags],
        cwd=repo,
        log_base=logs / "03-prepare-descriptor",
    )
    reference = json.loads(ref_out.read_text())["reference"]
    save_json(delivery_dir / "reference.json", reference)

    run_logged(
        [
            blender_bin,
            "-b",
            "-t",
            "2",
            "--factory-startup",
            "--disable-autoexec",
            "--offline-mode",
            "--python-exit-code",
            "1",
            "--python",
            str(compile_only),
            "--",
            str(repo),
            str(kit_dir),
            str(delivery_dir / "reference.json"),
        ],
        cwd=repo,
        log_base=logs / "04-compile-family",
        timeout=240,
    )

    # 4. Project runtime definition.json & stage delivery files (including PBR skin/shirt/shorts textures)
    prefix = f"studies/peacock-body-family/{rev}"
    compiled_logical = f"{prefix}/compiled.json"
    definition_logical = f"{prefix}/definition.json"
    compiled_art = artifact(kit_dir / "compiled.json", "application/json")
    save_json(delivery_dir / "compiled-artifact.json", compiled_art)

    run_logged(
        [
            *tsx_cli,
            str(project_def),
            str(repo),
            str(kit_dir / "profile.json"),
            str(delivery_dir / "reference.json"),
            str(delivery_dir / "compiled-artifact.json"),
            compiled_logical,
            str(delivery_dir / "definition.json"),
        ],
        cwd=repo,
        log_base=logs / "05-project-definition",
    )

    files: dict[str, dict] = {}

    def stage_file(logical: str, src: Path, media: str, expected: dict | None = None) -> None:
        dst = files_root / logical
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, dst)
        files[logical] = artifact(dst, media)
        if expected is not None and files[logical] != expected:
            raise ValueError(f"Copied texture/artifact hash mismatch: {logical}")

    stage_file(compiled_logical, kit_dir / "compiled.json", "application/json", compiled_art)
    stage_file(definition_logical, delivery_dir / "definition.json", "application/json")

    textures = json.loads((prepared_textures / "descriptor.json").read_text())["study"]["package"]["textures"]
    for tex_logical, entry in textures.items():
        stage_file(tex_logical, prepared_textures / entry["file"]["path"], entry["reference"]["mediaType"], entry["reference"])

    save_json(
        study_dir / "manifest.json",
        make_manifest(
            "asset",
            "peacock-body-family-study",
            {"title": f"Adult masculine body family ({profile['label']}) · private proof", "privateOnly": True},
            files,
            [reference],
        ),
    )
    study_prep = run_logged(
        [*assets_cli, "prepare", "--manifest", str(study_dir / "manifest.json"), *domain_flags],
        cwd=repo,
        log_base=logs / "06-prepare-study",
    )
    save_json(delivery_dir / "study-index.json", {"release": json.loads(study_prep.read_text())["reference"], "files": files})
    save_json(
        delivery_dir / "selection.json",
        {
            "definitionPath": definition_logical,
            "part": "proofShirt",
            "presets": [p["id"] for p in profile["presets"]],
            "profile": "profile.json",
        },
    )

    # 5. Cross-evaluator parity (Python people.py reference -> TypeScript person-family.ts parity, seam closure, lean V3/lane witnesses, edit order)
    py_ref_json = out / "python-evaluator-reference.json"
    py_parity_code = (
        "import json, sys, numpy as np\n"
        "from pathlib import Path\n"
        "repo, kit, patch_p, v3_p, lane_p, out_p = sys.argv[1:]\n"
        "sys.path.insert(0, str(Path(repo) / 'scripts/art'))\n"
        "import people\n"
        "comp = json.loads((Path(kit) / 'compiled.json').read_text())\n"
        "prof = json.loads((Path(kit) / 'profile.json').read_text())\n"
        "patch = json.loads(Path(patch_p).read_text())\n"
        "m_key, f_key, mode = patch['axisControls']['mass'], patch['axisControls']['fullness'], patch['supportMode']\n"
        "coords = [[0.5, 0.0], [0.5, 0.5], [0.5, 1.0], [0.5, 0.25], [0.5, 0.75]] if mode == 2 else (\n"
        "    [[m, f] for f in (0.0, 0.5, 1.0) for m in (0.0, 0.5, 1.0)] + [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]\n"
        ")\n"
        "sel = {r['id']: r['defaultValue'] for r in prof['selections']}\n"
        "out = {'recipes': {}}\n"
        "for m, f in coords:\n"
        "    rec = people.resolve_recipe(comp, {'family': comp['reference'], 'controls': {m_key: m, f_key: f}, 'selections': sel}, prof)\n"
        "    st = people.evaluate_body(comp, rec)\n"
        "    people.fit_parts(comp, st, ['proofShirt'])\n"
        "    out['recipes'][f'{m:.2f},{f:.2f}'] = {\n"
        "        k: np.asarray(st['canonicalPositions'][k], dtype=np.float32).tolist()\n"
        "        for k in ('bodySkin', 'headSkin', 'studioShorts', 'proofShirt')\n"
        "    }\n"
        "v3 = json.loads(Path(v3_p).read_text())\n"
        "v3_prof = json.loads((Path(v3_p).parent / 'profile.json').read_text())\n"
        "v3_sel = {r['id']: r['defaultValue'] for r in v3_prof['selections']}\n"
        "v3_ctrl = {m_key: 0.5, f_key: 0.0, **({'definition': 1.0} if 'definition' in v3['controls'] else {})}\n"
        "v3_rec = people.resolve_recipe(v3, {'family': v3['reference'], 'controls': v3_ctrl, 'selections': v3_sel}, v3_prof)\n"
        "out['leanV3Body'] = np.asarray(people.evaluate_body(v3, v3_rec)['canonicalPositions']['bodySkin'], dtype=np.float32).tolist()\n"
        "lane = json.loads(Path(lane_p).read_text())\n"
        "lane_prof = json.loads((Path(lane_p).parent / 'profile.json').read_text())\n"
        "lane_sel = {r['id']: r['defaultValue'] for r in lane_prof['selections']}\n"
        "lane_ctrl = {m_key: 0.5, f_key: 0.0, **({'definition': 1.0} if 'definition' in lane['controls'] else {})}\n"
        "lane_rec = people.resolve_recipe(lane, {'family': lane['reference'], 'controls': lane_ctrl, 'selections': lane_sel}, lane_prof)\n"
        "lane_st = people.evaluate_body(lane, lane_rec)\n"
        "people.fit_parts(lane, lane_st, ['proofShirt'])\n"
        "out['leanLaneShirt'] = np.asarray(lane_st['canonicalPositions']['proofShirt'], dtype=np.float32).tolist()\n"
        "Path(out_p).write_text(json.dumps(out))\n"
    )
    run_logged(
        [
            py_bin,
            "-c",
            py_parity_code,
            str(repo),
            str(kit_dir),
            str(grid_dir / "mesh-patch.json"),
            str(lean_kit / "compiled.json"),
            str(source_kit / "compiled.json"),
            str(py_ref_json),
        ],
        cwd=repo,
        log_base=logs / "07a-python-evaluator-ref",
    )
    parity_json = out / "evaluator-parity.json"
    run_logged(
        [
            *tsx_cli,
            str(parity_mts),
            str(kit_dir),
            str(delivery_dir / "definition.json"),
            str(grid_dir / "mesh-patch.json"),
            str(py_ref_json),
            str(parity_json),
        ],
        cwd=repo,
        log_base=logs / "07-evaluator-parity",
    )

    parity = json.loads(parity_json.read_text())
    print(
        json.dumps(
            {
                "output": str(out),
                "supportMode": parity["supportMode"],
                "controls": parity["controls"],
                "compiledBytes": (kit_dir / "compiled.json").stat().st_size,
                "deliveryTotalBytes": sum(v["bytes"] for v in files.values()),
                "parityAllPassed": parity["allPassed"],
                "maxPythonVsTsDiffM": parity["maxPythonVsTypeScriptDiffMetres"],
                "leanBodyVsV3DiffM": parity["leanBodyVsPinnedV3MaxDiffMetres"],
                "leanShirtVsLaneDiffM": parity["leanShirtVsPinnedLaneMaxDiffMetres"],
                "maxSeamGapM": parity["maxNeckAndTorsoSeamPositionGapMetres"],
                "maxEditOrderDiffM": parity["maxIncrementalAndEditOrderDiffMetres"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
