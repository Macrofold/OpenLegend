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

BLENDER = "/Applications/Blender.app/Contents/MacOS/Blender"
PYTHON = "/Users/mike/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python"
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
        res = subprocess.run(cmd, cwd=cwd, timeout=timeout, stdout=stdout, stderr=stderr)
    if res.returncode != 0:
        raise RuntimeError(f"Command failed ({res.returncode}): {' '.join(cmd)}\nstderr:\n{err_p.read_text()[-2500:]}")
    return out_p


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", required=True, type=Path, help="body-support-grid-input manifest.json")
    parser.add_argument("--output", required=True, type=Path, help="Fresh stage package directory")
    parser.add_argument("--repository", required=True, type=Path)
    parser.add_argument("--art-root", type=Path, default=Path("/Users/mike/Documents/ChatGPT/OpenLegend-art"))
    args = parser.parse_args()

    repo = args.repository.resolve()
    art_root = args.art_root.resolve()
    out = args.output.resolve()
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
        [PYTHON, str(body_grid), "compile", "--manifest", str(args.manifest.resolve()), "--output", str(grid_dir), "--repository", str(repo)],
        cwd=repo,
        log_base=logs / "01-grid-compile",
    )

    # 2. Assemble rebased Blender family kit (bodySkin, shirt support, R4 studioShorts, unmasked proofShirt)
    kit_dir = out / "kit"
    run_logged(
        [
            BLENDER,
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
            BLENDER,
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

    # 5. Cross-evaluator parity (TypeScript person-family.ts vs Python people.py, seam closure, lean V3/lane witnesses, edit order)
    parity_json = out / "evaluator-parity.json"
    run_logged(
        [
            *tsx_cli,
            str(parity_mts),
            str(repo),
            str(kit_dir),
            str(delivery_dir / "definition.json"),
            str(grid_dir / "mesh-patch.json"),
            str(lean_kit / "compiled.json"),
            str(source_kit / "compiled.json"),
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
