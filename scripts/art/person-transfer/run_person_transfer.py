#!/usr/bin/env python3
"""Unified end-to-end 3D person reference transfer, pose calibration, export & 18-board verification runner.

Given a character/coordinate ID, a 2D turnaround sheet (or 3-view crops / existing Meshy donor),
and optional auxiliary pose references (such as a horizontal T-pose sheet and/or custom dynamic pose specs),
executes the complete non-destructive pipeline:
  1) Verifies or extracts equal-scale 3-view panels (`prepare_person_views.py`),
  2) Optionally generates/recovers 2D auxiliary pose reference (`generate_tpose_ref_seedream.py`) and 3D Meshy donor (`generate_meshy_donor.py`),
  3) Runs rest-space CG registration + `(M, F)`-parameterized anatomical polish + `LOD1` landmark snapping + raised-arm corrective + covered `.glb` export (`register_and_fit_donor.py`),
  4) Renders `Donor vs LOD1 Clay vs .glb PBR`, matched-stature `2D Concept vs 3D` turnaround, and un-blinded bare + covered-pelvis signed millimeter deviation heatmap (`verify_donor_vs_glb_and_heatmap.py`; `--pelvis-preview-only` renders the fast 3-board preview gate first),
  5) Evaluates shipped clips (`Idle`, `Walk`, `Run`) + heldout novel articulation poses (plus any `--pose-specs-json` custom poses & `--compare-glb` builds) in PBR & welded-normal Clay (`novel_pose_audit.py`),
  6) Measures exported `.glb` consumer budgets (`scripts/art/art-tool.py`),
  7) Optionally verifies live-solver non-regression (`<= 0.50 mm` max drift) against previously approved supports (`--non-regression-support LABEL=FIT_DIR`),
  8) Writes `gate_summary.json` reporting true worst-case `LOD0` & `LOD1` section errors, triangle health, pose inversions, garment overlaps, and budget status.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

sys.dont_write_bytecode = True
import numpy as np

BLENDER_BIN = Path("/Applications/Blender.app/Contents/MacOS/Blender")
TOOLS_DIR = Path(__file__).resolve().parent
DEFAULT_STUDY_DIR = Path(
    os.environ.get(
        "OPEN_LEGEND_ART_STUDY_DIR",
        str(Path.home() / "Documents/ChatGPT/OpenLegend-art/2026-11-12-body-reference-family/study"),
    )
)


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def _run_blender_py(script: Path, extra_args: list[str], repo_root: Path) -> str:
    env = dict(os.environ)
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    cmd = [
        str(BLENDER_BIN),
        "--background",
        "--factory-startup",
        "--disable-autoexec",
        "--offline-mode",
        "--python-exit-code",
        "1",
        "--python",
        str(script),
        "--",
        *extra_args,
    ]
    res = subprocess.run(cmd, cwd=str(repo_root), env=env, text=True, capture_output=True)
    if res.returncode != 0:
        sys.stderr.write(res.stdout[-4000:] + "\n" + res.stderr[-4000:] + "\n")
        raise RuntimeError(f"Blender script {script.name} failed with exit code {res.returncode}")
    return res.stdout


def _extract_worst_sections(metrics: dict) -> dict:
    lod0_rows: list[tuple[str, float]] = []
    lod1_rows: list[tuple[str, float]] = []
    excluded_planes = {"headTemple", "headCheekJowl", "seat"}
    all_lod0_rows: list[tuple[str, float]] = []
    all_lod1_rows: list[tuple[str, float]] = []
    for bucket_key in ("trunkAndNeckSections", "limbSections", "sections"):
        secs = metrics.get(bucket_key, {})
        if not isinstance(secs, dict):
            continue
        for sname, svals in secs.items():
            if not isinstance(svals, dict):
                continue
            for k, v in svals.items():
                if not isinstance(v, (int, float)):
                    continue
                val = round(abs(float(v)), 3)
                if k in ("widthErrorPct", "depthErrorPct", "circumferenceErrorPct", "spanErrorPct"):
                    all_lod0_rows.append((f"{sname}.{k}", val))
                    if sname not in excluded_planes:
                        lod0_rows.append((f"{sname}.{k}", val))
                elif k in ("lod1WidthErrorPct", "lod1DepthErrorPct", "lod1CircumferenceErrorPct", "lod1SpanErrorPct"):
                    all_lod1_rows.append((f"{sname}.{k}", val))
                    if sname not in excluded_planes:
                        lod1_rows.append((f"{sname}.{k}", val))
    lod0_rows.sort(key=lambda x: -x[1])
    lod1_rows.sort(key=lambda x: -x[1])
    all_lod0_rows.sort(key=lambda x: -x[1])
    all_lod1_rows.sort(key=lambda x: -x[1])
    return {
        "worstBareBodyLod0": lod0_rows[0] if lod0_rows else None,
        "worstBareBodyLod1": lod1_rows[0] if lod1_rows else None,
        "bareBodyLod0Over2Pct": [r for r in lod0_rows if r[1] > 2.0],
        "bareBodyLod1Over2Pct": [r for r in lod1_rows if r[1] > 2.0],
        "allIncludingIdentityAndGarmentPlanesOver2PctLod0": [r for r in all_lod0_rows if r[1] > 2.0],
        "allIncludingIdentityAndGarmentPlanesOver2PctLod1": [r for r in all_lod1_rows if r[1] > 2.0],
    }


def _check_live_non_regression(label_and_dir: str, repo_root: Path, family_dir: Path, sex: str = "auto") -> dict:
    if "=" not in label_and_dir:
        raise ValueError(f"--non-regression-support must be LABEL=FIT_DIR, got {label_and_dir!r}")
    lbl, fdir_s = label_and_dir.split("=", 1)
    ref_dir = Path(fdir_s).resolve()
    ref_rec = json.loads((ref_dir / "receipt.json").read_text())
    donor_glb = Path(ref_rec["donorGlb"]["path"])
    tmp_chk = Path(tempfile.mkdtemp(prefix=f".nonreg-{lbl}-", dir=family_dir / "fits"))
    try:
        prev_bypass = os.environ.get("OL_BYPASS_STAGE_CACHE")
        os.environ["OL_BYPASS_STAGE_CACHE"] = "1"
        try:
            _run_blender_py(
                TOOLS_DIR / "register_and_fit_donor.py",
                [
                    "--donor-glb",
                    str(donor_glb),
                    "--coordinate-id",
                    lbl,
                    "--output",
                    str(tmp_chk),
                    "--sex",
                    sex,
                ],
                repo_root,
            )
        finally:
            if prev_bypass is None:
                os.environ.pop("OL_BYPASS_STAGE_CACHE", None)
            else:
                os.environ["OL_BYPASS_STAGE_CACHE"] = prev_bypass
        drifts = {}
        for arr_name in ("lod0.npz", "lod1.npz", "headSkin.npz"):
            a_old = np.load(ref_dir / arr_name)["full"].astype(np.float64)
            a_new = np.load(tmp_chk / arr_name)["full"].astype(np.float64)
            d_mm = np.linalg.norm(a_new - a_old, axis=1) * 1000.0
            drifts[arr_name] = {
                "p50Mm": round(float(np.percentile(d_mm, 50)), 5),
                "p95Mm": round(float(np.percentile(d_mm, 95)), 5),
                "maxMm": round(float(d_mm.max()), 5),
            }
        max_p50 = max(v["p50Mm"] for v in drifts.values())
        max_mm = max(v["maxMm"] for v in drifts.values())
        return {
            "support": lbl,
            "refDir": str(ref_dir),
            "driftMmByMesh": drifts,
            "maxMedianDriftMm": max_p50,
            "maxDriftMm": max_mm,
            "passMedianLe0p55Mm": max_p50 <= 0.55,
            "passExactLe0p50Mm": max_mm <= 0.50,
        }
    finally:
        shutil.rmtree(tmp_chk, ignore_errors=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--subject-id", required=True, help="Coordinate or character ID, e.g. M000-F000")
    parser.add_argument("--revision", required=True, help="Revision prefix, e.g. f01")
    parser.add_argument("--repository", required=True, type=Path)
    parser.add_argument(
        "--study-dir",
        type=Path,
        default=DEFAULT_STUDY_DIR,
        help="External art study working directory outside Git (default: $OPEN_LEGEND_ART_STUDY_DIR or ~/Documents/ChatGPT/OpenLegend-art/2026-11-12-body-reference-family/study)",
    )
    parser.add_argument(
        "--family-subdir",
        default="family-20261113",
        help="Subdirectory under --study-dir holding donors/, references/, sources/ and fits/",
    )
    parser.add_argument("--concept-sheet", type=Path, default=None, help="2D 3-view reference sheet PNG")
    parser.add_argument("--donor-glb", type=Path, default=None, help="Existing Meshy donor GLB (defaults to donors/<subject-id>/model.glb)")
    parser.add_argument("--generate-meshy", action="store_true", help="Generate/recover Meshy multiview donor if missing")
    parser.add_argument("--tpose-prompt-file", type=Path, default=None, help="Generate/recover Seedream 2D T-pose reference from prompt file if missing")
    parser.add_argument("--pose-specs-json", type=Path, default=None, help="Optional custom novel-pose JSON spec")
    parser.add_argument("--compare-glb", action="append", default=[], help="Optional LABEL=GLB comparison builds for signoff-14")
    parser.add_argument("--stage-a-fit-dir", type=Path, default=None, help="Optional Stage A M050-F100 fit dir for signoff-14")
    parser.add_argument("--lean-reference-support", type=Path, default=None, help="Optional same-muscle lean F=0 support NPZ for raised-arm fat thickness")
    parser.add_argument("--non-regression-support", action="append", default=[], help="Optional LABEL=FIT_DIR live solver non-regression checks")
    parser.add_argument("--sync-fit-dir", action="store_true", help="Sync finished outputs to family-20261113/fits/<subject-id>/")
    parser.add_argument("--sex", choices=("auto", "male", "female"), default="auto", help="Anatomical pelvic contour sex (auto-detected by default)")
    parser.add_argument("--pelvis-preview-only", action="store_true", help="Fast ~1 min 3-board preview: render signoff-08, concept-vs-donor-clay-pbr and covered-pelvis signed-deviation-heatmap before full 18-board suite")
    args = parser.parse_args()

    repo = args.repository.resolve()
    study_dir = args.study_dir.resolve()
    if study_dir == repo or repo in study_dir.parents:
        raise ValueError(f"--study-dir must be outside the Git repository checkout: {study_dir}")
    family_dir = study_dir / args.family_subdir
    sid = args.subject_id
    rev_tag = f"{args.revision}-{sid}"
    rev_dir = study_dir / "review" / rev_tag
    exp_dir = study_dir / "export"
    exp_dir.mkdir(parents=True, exist_ok=True)
    rev_dir.mkdir(parents=True, exist_ok=True)
    out_glb = exp_dir / f"{rev_tag}-covered.glb"

    # 1) Prepare 3-view crops if needed:
    crops_dir = family_dir / "sources" / "crops" / sid
    if not (crops_dir / "front.png").is_file():
        if args.concept_sheet is None or not args.concept_sheet.is_file():
            raise FileNotFoundError(f"Missing 3-view crops in {crops_dir} and no --concept-sheet supplied")
        from prepare_person_views import prepare_views_for_subject
        prepare_views_for_subject(sid, family_dir / "sources" / "crops", sheet_path=args.concept_sheet.resolve())

    # 2) Optional 2D T-pose / auxiliary pose reference generation:
    if args.tpose_prompt_file is not None and args.tpose_prompt_file.is_file():
        if args.concept_sheet is None or not args.concept_sheet.is_file():
            raise FileNotFoundError("--tpose-prompt-file requires --concept-sheet")
        subprocess.run(
            [
                sys.executable,
                str(TOOLS_DIR / "generate_tpose_ref_seedream.py"),
                "--coordinate-id",
                sid,
                "--reference-sheet",
                str(args.concept_sheet.resolve()),
                "--prompt-file",
                str(args.tpose_prompt_file.resolve()),
                "--output-dir",
                str(family_dir / "references"),
                "--repository",
                str(repo),
            ],
            check=True,
            env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"},
        )

    # 3) Resolve or generate 3D Meshy donor:
    donor_glb = args.donor_glb.resolve() if args.donor_glb else (family_dir / "donors" / sid / "model.glb")
    if not donor_glb.is_file():
        if not args.generate_meshy:
            raise FileNotFoundError(f"Donor GLB not found at {donor_glb}; pass --generate-meshy to create it")
        subprocess.run(
            [
                sys.executable,
                str(TOOLS_DIR / "generate_meshy_donor.py"),
                "--coordinates",
                sid,
                "--study-dir",
                str(family_dir),
                "--repository",
                str(repo),
            ],
            check=True,
            env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"},
        )

    # 4) Run registration, `(M, F)` polish, raised-arm corrective, Boards 1-11 (or Board 8 preview), and covered `.glb` export:
    fit_flags = ["--pelvis-preview-only"] if args.pelvis_preview_only else ["--full-audit"]
    if args.lean_reference_support is not None:
        fit_flags.extend(["--lean-reference-support", str(args.lean_reference_support.resolve())])
    _run_blender_py(
        TOOLS_DIR / "register_and_fit_donor.py",
        [
            "--donor-glb",
            str(donor_glb),
            "--coordinate-id",
            sid,
            "--output",
            str(rev_dir),
            *fit_flags,
            "--export-glb",
            str(out_glb),
            "--sex",
            args.sex,
        ],
        repo,
    )

    # 5) Render Donor-vs-Clay-vs-PBR, 2D Concept matched-stature comparison, and bare + covered-pelvis signed deviation heatmap:
    v_args = [str(rev_dir), str(out_glb)]
    if args.concept_sheet is not None and args.concept_sheet.is_file():
        v_args.append(str(args.concept_sheet.resolve()))
    if args.pelvis_preview_only:
        v_args.append("--pelvis-preview")
    _run_blender_py(TOOLS_DIR / "verify_donor_vs_glb_and_heatmap.py", v_args, repo)

    if args.pelvis_preview_only:
        rec_doc = json.loads((rev_dir / "receipt.json").read_text())
        dev_path = rev_dir / "deviation_audit.json"
        dev_doc = json.loads(dev_path.read_text()) if dev_path.is_file() else {}
        preview_summary = {
            "mode": "pelvis-preview-only",
            "subjectId": sid,
            "revisionTag": rev_tag,
            "exportedGlb": {
                "path": str(out_glb),
                "bytes": out_glb.stat().st_size,
                "sha256": _sha256(out_glb),
            },
            "reviewDir": str(rev_dir),
            "boards": {
                "conceptVsDonorClayPbr": str(rev_dir / "concept-vs-donor-clay-pbr.png"),
                "pelvisGroinGlutesZoom": str(rev_dir / "signoff-08-pelvis-groin-glutes-zoom.png"),
                "signedDeviationHeatmap": str(rev_dir / "signed-deviation-heatmap.png"),
            },
            "quality": rec_doc.get("quality", {}),
            "pelvisDeviationAudit": {
                "crotchBaseDeltaZ_mm": dev_doc.get("crotchBaseDeltaZ_mm", {}),
                "coveredPelvisZones": dev_doc.get("coveredPelvisZones", {}),
            },
        }
        (rev_dir / "gate_summary.json").write_text(json.dumps(preview_summary, indent=2) + "\n")
        print(json.dumps(preview_summary, indent=2))
        return

    # 6) Run 10-pose + custom novel-pose PBR & welded-normal Clay audit:
    np_args = ["--glb", str(out_glb), "--out-dir", str(rev_dir), "--subject-label", sid]
    if args.pose_specs_json is not None:
        np_args.extend(["--pose-specs-json", str(args.pose_specs_json.resolve())])
    for cg in args.compare_glb:
        np_args.extend(["--compare-glb", cg])
    if args.stage_a_fit_dir is not None:
        np_args.extend(["--stage-a-fit-dir", str(args.stage_a_fit_dir.resolve())])
    _run_blender_py(TOOLS_DIR / "novel_pose_audit.py", np_args, repo)

    # 7) Measure exported `.glb` consumer budgets via `scripts/art/art-tool.py`:
    meas_code = (
        "import importlib.util, json, pathlib, sys; sys.dont_write_bytecode = True; "
        f"spec = importlib.util.spec_from_file_location('art_tool', {str(repo / 'scripts/art/art-tool.py')!r}); "
        "mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod); "
        f"r = mod.measure(pathlib.Path({str(out_glb)!r}), 'character', None); "
        "print('ART_TOOL_MEASURE_JSON:' + json.dumps(r))"
    )
    env = {**os.environ, "PYTHONDONTWRITEBYTECODE": "1"}
    m_res = subprocess.run(
        [str(BLENDER_BIN), "--background", "--factory-startup", "--python-expr", meas_code],
        cwd=str(repo),
        env=env,
        text=True,
        capture_output=True,
        check=True,
    )
    measure_doc = {}
    for ln in m_res.stdout.splitlines():
        if ln.startswith("ART_TOOL_MEASURE_JSON:"):
            measure_doc = json.loads(ln.split("ART_TOOL_MEASURE_JSON:", 1)[1])

    # 8) Optional live-solver non-regression checks:
    non_reg_results = [_check_live_non_regression(spec_s, repo, family_dir, sex=args.sex) for spec_s in args.non_regression_support]

    # 9) Sync to `fits/<subject-id>/` if requested:
    if args.sync_fit_dir:
        fit_dst = family_dir / "fits" / sid
        fit_dst.mkdir(parents=True, exist_ok=True)
        for item in rev_dir.iterdir():
            if item.is_file():
                shutil.copy2(item, fit_dst / item.name)

    rec_doc = json.loads((rev_dir / "receipt.json").read_text())
    dev_doc = json.loads((rev_dir / "deviation_audit.json").read_text())
    nov_doc = json.loads((rev_dir / "novel_pose_audit.json").read_text())
    sec_summary = _extract_worst_sections(rec_doc.get("metrics", {}))
    budgets_all_pass = all(b.get("status") == "pass" for b in measure_doc.get("budgets", []))

    gate_summary = {
        "subjectId": sid,
        "revisionTag": rev_tag,
        "exportedGlb": {
            "path": str(out_glb),
            "bytes": out_glb.stat().st_size,
            "sha256": _sha256(out_glb),
        },
        "reviewDir": str(rev_dir),
        "gates": {
            "muscleMassGate": rec_doc["quality"].get("muscleMassGate"),
            "adiposeFullnessGate": rec_doc["quality"].get("adiposeFullnessGate"),
            "raisedArmMode": rec_doc["quality"].get("raisedArmCorrective", {}).get("mode"),
            "lod0BadFaces": rec_doc["quality"].get("lod0UnacceptableFaces"),
            "lod1BadFaces": rec_doc["quality"].get("lod1UnacceptableFaces"),
            "headBadFaces": rec_doc["quality"].get("headUnacceptableFaces"),
            "newSelfIntersections": (
                rec_doc["quality"].get("lod0NewSelfIntersectionPairs", 0)
                + rec_doc["quality"].get("lod1NewSelfIntersectionPairs", 0)
                + rec_doc["quality"].get("headNewSelfIntersectionPairs", 0)
            ),
            "collarSeamMaxGapMm": nov_doc["subjectMaxCollarSeamGapMm"],
            "novelPoseMaxInvertedTriangles": nov_doc["subjectMaxInvertedTriangles"],
            "novelPoseMaxBriefsOverlaps": nov_doc["subjectMaxBriefsOverlaps"],
            "artToolBudgetsAllPass": budgets_all_pass,
            "artToolBudgets": measure_doc.get("budgets", []),
            "sectionErrors": sec_summary,
            "muscleReliefRetention": rec_doc.get("metrics", {}).get("muscleReliefRetention"),
            "overallBareBodyLod0P05MedP95Mm": dev_doc["overallBareBodyLod0_p02_p05_med_p95_p98_mm"][1:4],
            "overallBareBodyLod1P05MedP95Mm": dev_doc["overallBareBodyLod1_p02_p05_med_p95_p98_mm"][1:4],
            "pelvisDeviationAudit": {
                "crotchBaseDeltaZ_mm": dev_doc.get("crotchBaseDeltaZ_mm"),
                "coveredPelvisZones": dev_doc.get("coveredPelvisZones", {}),
            },
            "liveNonRegression": non_reg_results,
        },
    }
    (rev_dir / "gate_summary.json").write_text(json.dumps(gate_summary, indent=2) + "\n")
    print(json.dumps(gate_summary, indent=2))


if __name__ == "__main__":
    main()
