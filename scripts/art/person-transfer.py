#!/usr/bin/env python3
"""Committed end-to-end person reference-transfer, calibration, and sign-off orchestrator.

Works with ANY character or body-grid coordinate (`M000-F000`, `M100-F000`, `hero-scout`, etc.)
and separates generic transfer/audit mechanics from world-owned foundation profiles (`--profile`):
- `bootstrap`: verifies or restores all S3-pinned foundation assets (`foundation-sources.json`)
  into the external workspace (`OPEN_LEGEND_ASSET_WORKSPACE`) with SHA-256 verification.
- `run` (default):
  1) Optional `--plan` pre-flight check prints resolved foundation files, source/donor status,
     auto-discovered non-regression supports, output paths, and exact estimated provider spend;
  2) Extracts/validates 3-view turnaround crops (`prepare_person_views.py`), auto-resolving
     `grid-9` sheets (`c14`..`c22`) when `--subject-id` matches the active profile's concept grid;
  3) Reuses or optionally generates 2D horizontal T-pose references (`--generate-tpose-ref`, using
     `prompt_templates.py` when `--tpose-prompt-file` is omitted);
  4) Reuses or optionally generates a Multi-Image-to-3D Meshy donor (`--generate-donor`);
  5) Solves rest-space whole-person transfer (`--mode fast` renders `fast-1to1-iteration-sheet.png`
     in ~12-15s; `--mode pelvis` renders Board 8 + 2D-vs-3D turnaround + covered pelvis heatmap in ~45-60s; `--mode signoff`
     renders the 18-board static/heatmap/10-pose suite + exports `export/fNN-<subject>-covered.glb`);
  6) In `signoff` mode, runs `verify_donor_vs_glb_and_heatmap.py`, `novel_pose_audit.py`,
     `scripts/art/art-tool.py` character budget checks, and cumulative live `--non-regression-support`
     re-solves (`OL_BYPASS_STAGE_CACHE=1`, auto-discovered from `fits/*/receipt.json`), writing
     `review/fNN-<subject>/gate_summary.json` and `blind_critique_prompt.md`.

Design and workflow owners:
- `docs/production-workflows/art-flows/body-reference-family.md`
- `docs/projects/art-workflow-tech-design.md#47-person-transferpy-reference-led-person-sculpt-transfer-and-multi-pose-audit`
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile

# No bytecode cache in the checkout: `pnpm assets:check` refuses stray binary files.
sys.dont_write_bytecode = True

ART_SCRIPTS_DIR = Path(__file__).resolve().parent
PACKAGE_DIR = ART_SCRIPTS_DIR / "person_transfer"
if str(PACKAGE_DIR) not in sys.path:
    sys.path.insert(0, str(PACKAGE_DIR))

from prompt_templates import build_blind_critique_brief, build_tpose_prompt  # noqa: E402
from runtime_env import (  # noqa: E402
    bootstrap_foundation,
    external_output,
    load_foundation_manifest,
    resolve_blender_bin,
    resolve_blender_python,
    resolve_foundation_manifest_path,
    resolve_grid9_concept_sheet,
    resolve_repo_root,
    resolve_workspace_root,
    sha256_file,
    subprocess_env,
)


def _run_cmd(cmd: list[str], label: str, extra_env: dict[str, str] | None = None) -> str:
    print(f"\n=== [{label}] ===", flush=True)
    res = subprocess.run(cmd, text=True, capture_output=True, env=subprocess_env(extra_env))
    if res.returncode != 0:
        sys.stderr.write(res.stdout or "")
        sys.stderr.write(res.stderr or "")
        raise RuntimeError(f"Step [{label}] failed with exit code {res.returncode}")
    return res.stdout


def _extract_worst_sections(metrics: dict) -> dict:
    """Extract worst-case and `> 2.0%` named section errors across both `LOD0` and `LOD1`."""
    excluded_planes = {"headTemple", "headCheekJowl", "seat"}
    lod0_rows: list[tuple[str, float]] = []
    lod1_rows: list[tuple[str, float]] = []
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
                    entry = (f"{sname}.{k}", val)
                    all_lod0_rows.append(entry)
                    if sname not in excluded_planes:
                        lod0_rows.append(entry)
                elif k in ("lod1WidthErrorPct", "lod1DepthErrorPct", "lod1CircumferenceErrorPct", "lod1SpanErrorPct"):
                    entry = (f"{sname}.{k}", val)
                    all_lod1_rows.append(entry)
                    if sname not in excluded_planes:
                        lod1_rows.append(entry)

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


def _discover_non_regression_supports(fam_dir: Path, exclude_subject_id: str) -> list[str]:
    """Auto-discover synced prior supports (`<fam_dir>/fits/<ID>/receipt.json`) with intact donor GLBs."""
    fits_dir = fam_dir / "fits"
    if not fits_dir.is_dir():
        return []
    found: list[str] = []
    for child in sorted(fits_dir.iterdir()):
        if not child.is_dir() or child.name.startswith(("_", ".", "iter-")):
            continue
        if child.name.upper() == exclude_subject_id.upper():
            continue
        rec_p = child / "receipt.json"
        if not rec_p.is_file():
            continue
        if not all((child / fn).is_file() for fn in ("lod0.npz", "lod1.npz", "headSkin.npz")):
            continue
        try:
            rec = json.loads(rec_p.read_text())
            donor_p = Path(rec.get("donorGlb", {}).get("path", ""))
            if donor_p.is_file():
                found.append(f"{child.name}={child.resolve()}")
        except Exception:
            continue
    return found


def _discover_comparison_glbs(export_dir: Path, exclude_subject_id: str) -> list[str]:
    """Auto-discover the newest exported `fNN-<ID>-covered.glb` per prior build for `signoff-14`."""
    if not export_dir.is_dir():
        return []
    by_subject: dict[str, tuple[int, Path]] = {}
    pat = re.compile(r"^f(\d+)-(.+)-covered\.glb$", flags=re.IGNORECASE)
    for glb_p in sorted(export_dir.glob("f*-covered.glb")):
        m = pat.match(glb_p.name)
        if not m:
            continue
        rev_num = int(m.group(1))
        subj = m.group(2)
        if subj.upper() == exclude_subject_id.upper():
            continue
        prev = by_subject.get(subj)
        if prev is None or rev_num >= prev[0]:
            by_subject[subj] = (rev_num, glb_p.resolve())
    return [f"{subj}={info[1]}" for subj, info in sorted(by_subject.items())]


def _find_existing_tpose_ref(refs_dir: Path, subject_id: str, explicit: Path | None) -> Path | None:
    if explicit is not None and explicit.is_file():
        return explicit.resolve()
    for ext_s in (".png", ".jpg", ".jpeg"):
        cand = refs_dir / f"{subject_id}-raised-arms-ref{ext_s}"
        if cand.is_file():
            return cand.resolve()
    return None


def _run_bootstrap_cli(argv: list[str]) -> None:
    parser = argparse.ArgumentParser(
        prog="person-transfer.py bootstrap",
        description="Verify or restore S3-archived person-transfer foundation assets in an external workspace.",
    )
    parser.add_argument("--workspace", type=Path, default=None, help="External OpenLegend art workspace root")
    parser.add_argument("--repository", type=Path, default=None, help="OpenLegend checkout root")
    parser.add_argument("--profile", type=Path, default=None, help="Foundation profile JSON (defaults to foundation-sources.json)")
    parser.add_argument("--verify-only", action="store_true", help="Check local SHA-256 presence without S3 pulls")
    parser.add_argument("--include-grid9", action="store_true", help="Also verify/restore all 9 grid-9 concept sheets")
    args = parser.parse_args(argv)

    profile_p = resolve_foundation_manifest_path(args.profile)
    manifest = load_foundation_manifest(profile_p)
    resolved = bootstrap_foundation(
        workspace=args.workspace,
        repo=args.repository,
        verify_only=args.verify_only,
        include_grid9=args.include_grid9,
        profile_path=profile_p,
    )
    print(
        json.dumps(
            {
                "status": "ok",
                "foundationId": manifest.get("foundationId"),
                "worldId": manifest.get("worldId"),
                "profile": str(profile_p),
                "workspace": str(resolve_workspace_root(args.workspace)),
                "foundationFiles": {k: str(v) for k, v in resolved.items()},
            },
            indent=2,
        )
    )


def _run_transfer_cli(argv: list[str]) -> None:
    parser = argparse.ArgumentParser(
        prog="person-transfer.py",
        description=__doc__,
    )
    parser.add_argument("--subject-id", required=True, help="Character or grid ID (e.g. M000-F000, M100-F000, hero-scout)")
    parser.add_argument("--revision", required=True, help="Revision prefix (e.g. f01, f22)")
    parser.add_argument(
        "--mode",
        choices=("fast", "pelvis", "signoff"),
        default="signoff",
        help="`fast`: ~12-15s 1:1 sheet; `pelvis`: ~45-60s Board 8 + 2D-vs-3D turnaround + covered pelvis heatmap; `signoff`: full 18-board + .glb + 10-pose + budget + non-regression suite",
    )
    parser.add_argument("--plan", action="store_true", help="Dry-run pre-flight: resolve inputs, outputs, non-regression targets, and estimated spend without running")
    parser.add_argument("--profile", type=Path, default=None, help="Foundation profile JSON (defaults to foundation-sources.json)")
    parser.add_argument("--workspace", type=Path, default=None, help="External OpenLegend art workspace root")
    parser.add_argument(
        "--study-dir",
        type=Path,
        default=None,
        help="Study working directory (defaults to <workspace>/2026-11-12-body-reference-family/study)",
    )
    parser.add_argument("--family-subdir", default="family-20261113", help="Family workspace subfolder inside --study-dir")
    parser.add_argument("--repository", type=Path, default=None, help="OpenLegend checkout root (auto-detected if omitted)")
    parser.add_argument("--blender", type=Path, default=None, help="Blender executable path")

    parser.add_argument("--concept-sheet", type=Path, default=None, help="3-view turnaround PNG (auto-resolved for profile concept-grid IDs)")
    parser.add_argument("--front-view", type=Path, default=None)
    parser.add_argument("--profile-view", type=Path, default=None)
    parser.add_argument("--back-view", type=Path, default=None)

    parser.add_argument("--tpose-ref", type=Path, default=None, help="Existing 2D horizontal T-pose / auxiliary pose reference")
    parser.add_argument("--tpose-prompt-file", type=Path, default=None, help="Optional custom prompt file for Seedream 5.0 Pro (auto-generated from profile if omitted)")
    parser.add_argument("--tpose-physique-brief", default=None, help="Optional custom physique paragraph when auto-generating a T-pose prompt")
    parser.add_argument("--generate-tpose-ref", action="store_true", help="Dispatch Seedream 5.0 Pro (~$0.06 USD) if T-pose ref is missing")

    parser.add_argument("--donor-glb", type=Path, default=None, help="Explicit 3D donor .glb (defaults to donors/<subject-id>/model.glb)")
    parser.add_argument("--generate-donor", action="store_true", help="Dispatch Meshy Multi-Image-to-3D (30 credits / ~$0.60 USD) if donor .glb is missing")

    parser.add_argument("--pose-specs-json", type=Path, default=None, help="Optional custom novel-pose JSON specification")
    parser.add_argument("--compare-glb", action="append", default=[], help="Comparison GLBs as LABEL=PATH (auto-discovered from export/ when omitted in signoff mode)")
    parser.add_argument("--stage-a-fit-dir", type=Path, default=None, help="Optional Stage A M050-F100 fit dir for signoff-14")
    parser.add_argument("--lean-reference-support", type=Path, default=None, help="Optional same-muscle lean F=0 support NPZ for raised-arm fat thickness")
    parser.add_argument(
        "--non-regression-support",
        action="append",
        default=[],
        help="Approved support baseline(s) to re-solve live (`LABEL=FIT_DIR`; auto-discovered from fits/ when omitted in signoff mode)",
    )
    parser.add_argument("--no-auto-non-regression", action="store_true", help="Skip auto-discovering fits/*/receipt.json baselines in signoff mode")
    parser.add_argument(
        "--sex",
        choices=("auto", "male", "female"),
        default="auto",
        help="Anatomical pelvic contour sex (auto-detected from canonical foundation mesh by default)",
    )
    parser.add_argument("--rebuild-raw-cache", action="store_true")
    parser.add_argument(
        "--sync-fit-dir",
        action="store_true",
        help="Also sync sign-off outputs into <family-subdir>/fits/<subject-id>/",
    )
    args = parser.parse_args(argv)

    repo = resolve_repo_root(args.repository)
    ws = resolve_workspace_root(args.workspace)
    profile_p = resolve_foundation_manifest_path(args.profile)
    profile_doc = load_foundation_manifest(profile_p)
    extra_profile_env = {"OPEN_LEGEND_PERSON_TRANSFER_PROFILE": str(profile_p)}

    study_dir = external_output(
        args.study_dir if args.study_dir is not None else (ws / "2026-11-12-body-reference-family/study")
    )
    fam_dir = external_output(study_dir / args.family_subdir)
    blender_bin = resolve_blender_bin(args.blender)
    py_bin = resolve_blender_python(blender_bin)

    sid = args.subject_id
    rev_tag = f"{args.revision}-{sid}" if not args.revision.endswith(sid) else args.revision
    rev_dir = external_output(study_dir / "review" / rev_tag)
    export_dir = external_output(study_dir / "export")
    out_glb = export_dir / f"{rev_tag}-covered.glb"
    cache_dir = external_output(fam_dir / "fits" / "_raw_fit_cache")
    crops_root = external_output(fam_dir / "sources" / "crops")
    crop_dir = crops_root / sid
    refs_dir = external_output(fam_dir / "references")
    donor_glb = args.donor_glb.resolve() if args.donor_glb else (fam_dir / "donors" / sid / "model.glb")

    foundation = bootstrap_foundation(workspace=ws, repo=repo, verify_only=args.plan, profile_path=profile_p)

    concept_sheet = args.concept_sheet.resolve() if args.concept_sheet is not None else None
    if concept_sheet is None and not (args.front_view and args.profile_view and args.back_view):
        concept_sheet = resolve_grid9_concept_sheet(
            sid, workspace=ws, study_dir=study_dir, repo=repo, auto_pull=not args.plan, profile_path=profile_p
        )

    existing_tpose = _find_existing_tpose_ref(refs_dir, sid, args.tpose_ref)
    will_gen_tpose = bool(args.generate_tpose_ref and existing_tpose is None)
    will_gen_donor = bool(args.generate_donor and not donor_glb.is_file())

    non_reg_specs = list(args.non_regression_support)
    if args.mode == "signoff" and not non_reg_specs and not args.no_auto_non_regression:
        non_reg_specs = _discover_non_regression_supports(fam_dir, sid)

    compare_glbs = list(args.compare_glb)
    if args.mode == "signoff" and not compare_glbs:
        compare_glbs = _discover_comparison_glbs(export_dir, sid)

    est_usd = (0.06 if will_gen_tpose else 0.0) + (0.60 if will_gen_donor else 0.0)
    if args.plan:
        plan_doc = {
            "status": "plan-only",
            "foundationId": profile_doc.get("foundationId"),
            "worldId": profile_doc.get("worldId"),
            "profile": str(profile_p),
            "subjectId": sid,
            "revisionTag": rev_tag,
            "mode": args.mode,
            "sex": args.sex,
            "inputs": {
                "conceptSheet": str(concept_sheet) if concept_sheet else None,
                "threeViewCropsPresent": (crop_dir / "front.png").is_file(),
                "tposeRef": str(existing_tpose) if existing_tpose else ("WILL_GENERATE_SEEDREAM" if will_gen_tpose else None),
                "donorGlb": str(donor_glb) if donor_glb.is_file() else ("WILL_GENERATE_MESHY" if will_gen_donor else f"MISSING:{donor_glb}"),
            },
            "outputs": {
                "reviewDir": str(rev_dir),
                "exportedGlb": str(out_glb) if args.mode in ("pelvis", "signoff") else None,
            },
            "signoffComparisons": compare_glbs,
            "liveNonRegressionSupports": non_reg_specs,
            "estimatedProviderSpend": {
                "replicateSeedreamUsd": 0.06 if will_gen_tpose else 0.0,
                "meshyCredits": 30 if will_gen_donor else 0,
                "meshyUsd": 0.60 if will_gen_donor else 0.0,
                "totalEstimatedUsd": round(est_usd, 2),
                "within10UsdTaskCeiling": est_usd <= 10.0,
            },
            "foundationFiles": {k: str(v) for k, v in foundation.items()},
        }
        print(json.dumps(plan_doc, indent=2))
        return

    rev_dir.mkdir(parents=True, exist_ok=True)
    export_dir.mkdir(parents=True, exist_ok=True)
    cache_dir.mkdir(parents=True, exist_ok=True)
    refs_dir.mkdir(parents=True, exist_ok=True)

    # 1. Extract/verify 3-view crops if source sheet/views are provided and crops don't exist yet
    if not (crop_dir / "front.png").is_file():
        if concept_sheet or (args.front_view and args.profile_view and args.back_view):
            prep_cmd = [
                str(blender_bin),
                "--background",
                "--factory-startup",
                "--disable-autoexec",
                "--offline-mode",
                "--python-exit-code",
                "1",
                "--python",
                str(PACKAGE_DIR / "prepare_person_views.py"),
                "--",
                "--subject-id",
                sid,
                "--out-crops-root",
                str(crops_root),
            ]
            if concept_sheet:
                prep_cmd += ["--sheet", str(concept_sheet)]
            else:
                prep_cmd += [
                    "--front",
                    str(args.front_view.resolve()),
                    "--profile",
                    str(args.profile_view.resolve()),
                    "--back",
                    str(args.back_view.resolve()),
                ]
            _run_cmd(prep_cmd, f"1. Prepare 3-view crops ({sid})", extra_env=extra_profile_env)

    # 2. Optional 2D T-pose reference linking or Seedream 5.0 Pro generation
    resolved_tpose_ref = existing_tpose
    if args.tpose_ref and args.tpose_ref.is_file():
        dst_ext = args.tpose_ref.suffix.lower() or ".png"
        dst_ref = refs_dir / f"{sid}-raised-arms-ref{dst_ext}"
        if dst_ref.resolve() != args.tpose_ref.resolve():
            shutil.copy2(args.tpose_ref, dst_ref)
        resolved_tpose_ref = dst_ref.resolve()
    elif args.generate_tpose_ref and resolved_tpose_ref is None:
        if concept_sheet is None or not concept_sheet.is_file():
            raise ValueError("--generate-tpose-ref requires --concept-sheet (or a profile concept-grid subject ID)")
        if args.tpose_prompt_file is not None and args.tpose_prompt_file.is_file():
            prompt_path = args.tpose_prompt_file.resolve()
        else:
            prompt_path = refs_dir / f"{sid}-raised-arms-ref.prompt.txt"
            prompt_path.write_text(build_tpose_prompt(sid, profile_doc, custom_brief=args.tpose_physique_brief))
        _run_cmd(
            [
                str(py_bin),
                str(PACKAGE_DIR / "generate_tpose_ref_seedream.py"),
                "--coordinate-id",
                sid,
                "--reference-sheet",
                str(concept_sheet),
                "--prompt-file",
                str(prompt_path),
                "--output-dir",
                str(refs_dir),
                "--repository",
                str(repo),
            ],
            f"2. Generate 2D T-pose reference ({sid}, ~$0.06 USD)",
            extra_env=extra_profile_env,
        )
        resolved_tpose_ref = _find_existing_tpose_ref(refs_dir, sid, None)

    # 3. Donor .glb lookup or Meshy Multi-Image-to-3D generation
    if not donor_glb.is_file():
        if not args.generate_donor:
            raise FileNotFoundError(
                f"Donor GLB missing at {donor_glb}; pass --donor-glb or --generate-donor (after authorizing 30 Meshy credits / ~$0.60 USD)."
            )
        _run_cmd(
            [
                str(py_bin),
                str(PACKAGE_DIR / "generate_meshy_donor.py"),
                "--coordinates",
                sid,
                "--study-dir",
                str(fam_dir),
                "--repository",
                str(repo),
            ],
            f"3. Generate Meshy 3D donor ({sid}, 30 credits / ~$0.60 USD)",
            extra_env=extra_profile_env,
        )

    # 4. Rest-space whole-person transfer
    fit_cmd = [
        str(blender_bin),
        "--background",
        "--factory-startup",
        "--disable-autoexec",
        "--offline-mode",
        "--python-exit-code",
        "1",
        "--python",
        str(PACKAGE_DIR / "register_and_fit_donor.py"),
        "--",
        "--donor-glb",
        str(donor_glb),
        "--coordinate-id",
        sid,
        "--output",
        str(rev_dir),
        "--workspace",
        str(ws),
        "--profile",
        str(profile_p),
        "--cache-dir",
        str(cache_dir),
        "--sex",
        args.sex,
    ]
    if resolved_tpose_ref is not None:
        fit_cmd.extend(["--tpose-ref", str(resolved_tpose_ref)])
    if args.lean_reference_support is not None:
        fit_cmd.extend(["--lean-reference-support", str(args.lean_reference_support.resolve())])
    if args.mode == "signoff":
        fit_cmd.extend(["--full-audit", "--export-glb", str(out_glb)])
    elif args.mode == "pelvis":
        fit_cmd.extend(["--pelvis-preview-only", "--export-glb", str(out_glb)])
    if args.rebuild_raw_cache:
        fit_cmd.append("--rebuild-raw-cache")
    _run_cmd(fit_cmd, f"4. Register & fit donor ({rev_tag}, mode={args.mode})", extra_env=extra_profile_env)

    receipt = json.loads((rev_dir / "receipt.json").read_text())
    if args.mode == "fast":
        fast_summary = {
            "mode": "fast",
            "subjectId": sid,
            "revisionTag": rev_tag,
            "reviewDir": str(rev_dir),
            "fastIterationSheet": str(rev_dir / "fast-1to1-iteration-sheet.png"),
            "postPolishAndRenderSeconds": receipt.get("postPolishAndRenderSeconds"),
            "elapsedSeconds": receipt.get("elapsedSeconds"),
            "quality": receipt.get("quality"),
        }
        print("\n=== FAST ITERATION COMPLETE ===", flush=True)
        print(json.dumps(fast_summary, indent=2))
        return

    # 5. Donor vs LOD1 Clay vs Exported .glb PBR + 18-zone signed deviation heatmap
    hm_cmd = [
        str(blender_bin),
        "--background",
        "--factory-startup",
        "--disable-autoexec",
        "--offline-mode",
        "--python-exit-code",
        "1",
        "--python",
        str(PACKAGE_DIR / "verify_donor_vs_glb_and_heatmap.py"),
        "--",
        "--rev-dir",
        str(rev_dir),
        "--glb",
        str(out_glb),
        "--study-dir",
        str(study_dir),
    ]
    if concept_sheet and concept_sheet.is_file():
        hm_cmd.extend(["--concept-sheet", str(concept_sheet)])
    if args.mode == "pelvis":
        hm_cmd.append("--pelvis-preview")
    _run_cmd(hm_cmd, f"5. Donor vs Clay vs PBR + Signed Deviation Heatmap ({rev_tag})", extra_env=extra_profile_env)

    if args.mode == "pelvis":
        dev_p = rev_dir / "deviation_audit.json"
        dev_doc_p = json.loads(dev_p.read_text()) if dev_p.is_file() else {}
        pelvis_summary = {
            "mode": "pelvis",
            "subjectId": sid,
            "revisionTag": rev_tag,
            "exportedGlb": {
                "path": str(out_glb),
                "bytes": out_glb.stat().st_size,
                "sha256": sha256_file(out_glb),
            },
            "reviewDir": str(rev_dir),
            "boards": {
                "conceptVsDonorClayPbr": str(rev_dir / "concept-vs-donor-clay-pbr.png"),
                "pelvisGroinGlutesZoom": str(rev_dir / "signoff-08-pelvis-groin-glutes-zoom.png"),
                "signedDeviationHeatmap": str(rev_dir / "signed-deviation-heatmap.png"),
            },
            "quality": receipt.get("quality", {}),
            "pelvisDeviationAudit": {
                "crotchBaseDeltaZ_mm": dev_doc_p.get("crotchBaseDeltaZ_mm"),
                "coveredPelvisZones": dev_doc_p.get("coveredPelvisZones", {}),
            },
        }
        (rev_dir / "gate_summary.json").write_text(json.dumps(pelvis_summary, indent=2) + "\n")
        print("\n=== PELVIS PREVIEW COMPLETE ===", flush=True)
        print(json.dumps(pelvis_summary, indent=2))
        return

    # 6. 10-pose shipped & novel-pose deformation + garment clearance audit
    np_cmd = [
        str(blender_bin),
        "--background",
        "--factory-startup",
        "--disable-autoexec",
        "--offline-mode",
        "--python-exit-code",
        "1",
        "--python",
        str(PACKAGE_DIR / "novel_pose_audit.py"),
        "--",
        "--glb",
        str(out_glb),
        "--out-dir",
        str(rev_dir),
        "--subject-label",
        sid,
    ]
    if args.pose_specs_json:
        np_cmd += ["--pose-specs-json", str(args.pose_specs_json.resolve())]
    if args.stage_a_fit_dir:
        np_cmd += ["--stage-a-fit-dir", str(args.stage_a_fit_dir.resolve())]
    for kv in compare_glbs:
        np_cmd += ["--compare-glb", kv]
    _run_cmd(np_cmd, f"6. Shipped & Novel-Pose Deformation Audit ({rev_tag})", extra_env=extra_profile_env)

    # 7. Canonical `scripts/art/art-tool.py` runtime character budget check
    art_tool_py = repo / "scripts/art/art-tool.py"
    art_expr = (
        "import importlib.util, json; from pathlib import Path; "
        f"spec=importlib.util.spec_from_file_location('at',{str(art_tool_py)!r}); "
        "m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m); "
        f"rep=m.measure(Path({str(out_glb)!r}),'character',None); "
        "print('ART_TOOL_REPORT_JSON=' + json.dumps(rep))"
    )
    at_out = _run_cmd(
        [
            str(blender_bin),
            "--background",
            "--factory-startup",
            "--disable-autoexec",
            "--offline-mode",
            "--python-exit-code",
            "1",
            "--python-expr",
            art_expr,
        ],
        f"7. Canonical art-tool.py Character Budget Verification ({rev_tag})",
        extra_env=extra_profile_env,
    )
    art_rep = {}
    for line in at_out.splitlines():
        if line.startswith("ART_TOOL_REPORT_JSON="):
            art_rep = json.loads(line.split("=", 1)[1])

    # 8. Live solver non-regression checks on previously approved supports (`OL_BYPASS_STAGE_CACHE=1`)
    non_reg_results = []
    for raw_nr in non_reg_specs:
        if "=" not in raw_nr:
            raise ValueError(f"--non-regression-support must be LABEL=FIT_DIR, got {raw_nr!r}")
        nr_lbl, nr_dir_s = raw_nr.split("=", 1)
        nr_ref_dir = Path(nr_dir_s).resolve()
        nr_rec = json.loads((nr_ref_dir / "receipt.json").read_text())
        nr_donor = Path(nr_rec["donorGlb"]["path"])
        nr_sex = str(nr_rec.get("quality", {}).get("pelvicContourSex") or args.sex)
        if nr_sex not in ("auto", "male", "female"):
            nr_sex = args.sex
        with tempfile.TemporaryDirectory(prefix=f"ol-nonreg-{nr_lbl}-", dir=ws) as tmp_nr:
            _run_cmd(
                [
                    str(blender_bin),
                    "--background",
                    "--factory-startup",
                    "--disable-autoexec",
                    "--offline-mode",
                    "--python-exit-code",
                    "1",
                    "--python",
                    str(PACKAGE_DIR / "register_and_fit_donor.py"),
                    "--",
                    "--donor-glb",
                    str(nr_donor),
                    "--coordinate-id",
                    nr_lbl,
                    "--output",
                    tmp_nr,
                    "--workspace",
                    str(ws),
                    "--profile",
                    str(profile_p),
                    "--cache-dir",
                    str(cache_dir),
                    "--sex",
                    nr_sex,
                ],
                f"8. Live Solver Non-Regression ({nr_lbl})",
                extra_env={**extra_profile_env, "OL_BYPASS_STAGE_CACHE": "1"},
            )
            drift_py = (
                "import json, numpy as np; from pathlib import Path; "
                f"a=Path({str(nr_ref_dir)!r}); b=Path({tmp_nr!r}); "
                "res={}; "
                "for fn in ('lod0.npz','lod1.npz','headSkin.npz'): "
                "  pa=np.load(a/fn)['full'].astype(np.float64); pb=np.load(b/fn)['full'].astype(np.float64); "
                "  d=np.linalg.norm(pa-pb,axis=1)*1000.0; "
                "  res[fn]={'p50Mm':round(float(np.percentile(d,50)),5),'p95Mm':round(float(np.percentile(d,95)),5),'maxMm':round(float(d.max()),5)}; "
                "print('NONREG_JSON='+json.dumps(res))"
            )
            nr_out = _run_cmd([str(py_bin), "-c", drift_py], f"8b. Measure Non-Regression Drift ({nr_lbl})")
            for line in nr_out.splitlines():
                if line.startswith("NONREG_JSON="):
                    d_map = json.loads(line.split("=", 1)[1])
                    max_med = max(v["p50Mm"] for v in d_map.values())
                    max_all = max(v["maxMm"] for v in d_map.values())
                    non_reg_results.append(
                        {
                            "support": nr_lbl,
                            "refDir": str(nr_ref_dir),
                            "driftMmByMesh": d_map,
                            "maxMedianDriftMm": max_med,
                            "maxDriftMm": max_all,
                            "passMedianLe0p55Mm": max_med <= 0.55,
                            "passExactLe0p50Mm": max_all <= 0.50,
                        }
                    )

    dev_audit = json.loads((rev_dir / "deviation_audit.json").read_text())
    np_audit = json.loads((rev_dir / "novel_pose_audit.json").read_text())
    qual = receipt.get("quality", {})
    sec_errors = _extract_worst_sections(receipt.get("metrics", {}))

    core_presentation_boards = [
        str(p)
        for p in [
            rev_dir / "concept-vs-donor-clay-pbr.png",
            rev_dir / "clay-6angle-comparison.png",
            rev_dir / "donor-vs-glb-pbr-1to1.png",
            rev_dir / "exported-glb-pbr-turnaround.png",
            rev_dir / "signed-deviation-heatmap.png",
            rev_dir / "tpose-raised-arms-ref-comparison.png",
            rev_dir / "signoff-08-pelvis-groin-glutes-zoom.png",
            rev_dir / "signoff-12-novel-poses-pbr-gallery.png",
            rev_dir / "signoff-13-novel-poses-clay-audit.png",
        ]
        if p.is_file()
    ]
    all_review_boards = [str(p) for p in sorted(rev_dir.glob("*.png"))]

    cov_part_id = str(profile_doc.get("baselineCoverage", {}).get("partId", "linenBriefs"))
    critique_prompt_path = rev_dir / "blind_critique_prompt.md"
    critique_prompt_path.write_text(
        build_blind_critique_brief(
            subject_id=sid,
            revision_tag=rev_tag,
            boards=all_review_boards,
            concept_sheet=concept_sheet,
            tpose_ref=resolved_tpose_ref,
            sex=args.sex,
            adipose_gate=qual.get("adiposeFullnessGate"),
            coverage_part_id=cov_part_id,
        )
    )

    lod0_bad = int(qual.get("lod0UnacceptableFaces", qual.get("lod0BadFaces", 0)))
    lod1_bad = int(qual.get("lod1UnacceptableFaces", qual.get("lod1BadFaces", 0)))
    head_bad = int(qual.get("headUnacceptableFaces", qual.get("headBadFaces", 0)))
    new_self_x = int(
        qual.get("lod0NewSelfIntersectionPairs", 0)
        + qual.get("lod1NewSelfIntersectionPairs", 0)
        + qual.get("headNewSelfIntersectionPairs", 0)
    )
    collar_gap_mm = float(np_audit.get("subjectMaxCollarSeamGapMm", 0.0))
    np_inv_tris = int(np_audit.get("subjectMaxInvertedTriangles", 0))
    np_brief_ov = int(np_audit.get("subjectMaxBriefsOverlaps", 0))
    budgets_pass = bool(art_rep.get("budgets")) and all(
        b.get("status") == "pass" for b in art_rep.get("budgets", [])
    )
    briefs_clr = qual.get("linenBriefsClearance", {})
    briefs_static_tpose_pass = bool(briefs_clr) and all(
        bool(v.get("pokeThroughFree", False)) for v in briefs_clr.values() if isinstance(v, dict)
    )
    relief_map = receipt.get("metrics", {}).get("muscleReliefRetention", {})
    relief_ratios = [
        float(v["lod1ToDonorRatio"])
        for v in relief_map.values()
        if isinstance(v, dict) and "lod1ToDonorRatio" in v
    ]
    adipose_g = float(qual.get("adiposeFullnessGate") or 0.0)
    relief_pass = (adipose_g >= 0.80) or (bool(relief_ratios) and all(0.80 <= r <= 1.20 for r in relief_ratios))

    failed_gates: list[str] = []
    if lod0_bad > 0:
        failed_gates.append(f"lod0BadFaces={lod0_bad}")
    if lod1_bad > 0:
        failed_gates.append(f"lod1BadFaces={lod1_bad}")
    if head_bad > 0:
        failed_gates.append(f"headBadFaces={head_bad}")
    if new_self_x > 0:
        failed_gates.append(f"newSelfIntersections={new_self_x}")
    if collar_gap_mm > 0.05:
        failed_gates.append(f"collarSeamMaxGapMm={collar_gap_mm}")
    if not briefs_static_tpose_pass:
        failed_gates.append("linenBriefsStaticAndRaisedClearance=False")
    if not relief_pass:
        failed_gates.append("lod1MuscleReliefRetention80To120Pct=False")
    if not budgets_pass:
        failed_gates.append("artToolBudgetsAllPass=False")
    for nr in non_reg_results:
        if not nr.get("passMedianLe0p55Mm", False):
            failed_gates.append(f"liveNonRegression:{nr['support']}:p50Mm={nr['maxMedianDriftMm']}")

    p05_med_p95_l0 = dev_audit.get("overallBareBodyLod0P05MedP95Mm") or dev_audit.get(
        "overallBareBodyLod0_p02_p05_med_p95_p98_mm", [None, None, None, None, None]
    )[1:4]
    p05_med_p95_l1 = dev_audit.get("overallBareBodyLod1P05MedP95Mm") or dev_audit.get(
        "overallBareBodyLod1_p02_p05_med_p95_p98_mm", [None, None, None, None, None]
    )[1:4]

    gate_summary = {
        "mode": "signoff",
        "foundationId": profile_doc.get("foundationId"),
        "worldId": profile_doc.get("worldId"),
        "subjectId": sid,
        "revisionTag": rev_tag,
        "allNumericGatesPass": len(failed_gates) == 0,
        "failedGates": failed_gates,
        "foundationFiles": {k: str(v) for k, v in foundation.items()},
        "exportedGlb": {
            "path": str(out_glb),
            "bytes": out_glb.stat().st_size,
            "sha256": sha256_file(out_glb),
        },
        "reviewDir": str(rev_dir),
        "blindCritiquePromptPath": str(critique_prompt_path),
        "coreSignoffPresentationBoards": core_presentation_boards,
        "allSignoffBoardsForBlindCritique": all_review_boards,
        "gates": {
            "muscleMassGate": qual.get("muscleMassGate"),
            "adiposeFullnessGate": qual.get("adiposeFullnessGate"),
            "raisedArmMode": qual.get("raisedArmCorrective", {}).get("mode"),
            "lod0BadFaces": lod0_bad,
            "lod1BadFaces": lod1_bad,
            "headBadFaces": head_bad,
            "newSelfIntersections": new_self_x,
            "collarSeamMaxGapMm": collar_gap_mm,
            "novelPoseMaxInvertedTriangles": np_inv_tris,
            "novelPoseMaxBriefsOverlaps": np_brief_ov,
            "artToolBudgetsAllPass": budgets_pass,
            "artToolBudgets": art_rep.get("budgets", []),
            "sectionErrors": sec_errors,
            "muscleReliefRetention": receipt.get("metrics", {}).get("muscleReliefRetention"),
            "overallBareBodyLod0P05MedP95Mm": p05_med_p95_l0,
            "overallBareBodyLod1P05MedP95Mm": p05_med_p95_l1,
            "pelvisDeviationAudit": {
                "crotchBaseDeltaZ_mm": dev_audit.get("crotchBaseDeltaZ_mm"),
                "coveredPelvisZones": dev_audit.get("coveredPelvisZones", {}),
            },
            "liveNonRegression": non_reg_results,
        },
    }
    (rev_dir / "gate_summary.json").write_text(json.dumps(gate_summary, indent=2) + "\n")

    if args.sync_fit_dir:
        fit_sync = external_output(fam_dir / "fits" / sid)
        fit_sync.mkdir(parents=True, exist_ok=True)
        for item in rev_dir.iterdir():
            if item.is_file():
                shutil.copy2(item, fit_sync / item.name)

    print("\n=== PERSON TRANSFER GATE SUMMARY ===", flush=True)
    print(json.dumps(gate_summary, indent=2))


def main() -> None:
    if len(sys.argv) > 1 and sys.argv[1] == "bootstrap":
        _run_bootstrap_cli(sys.argv[2:])
        return
    if len(sys.argv) > 1 and sys.argv[1] == "run":
        _run_transfer_cli(sys.argv[2:])
        return
    _run_transfer_cli(sys.argv[1:])


if __name__ == "__main__":
    main()
