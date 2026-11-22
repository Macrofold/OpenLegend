#!/usr/bin/env python3
"""Confirm the selected 9-sheet body reference set, measure 2D silhouettes, and emit unscaled equal-canvas 3-view crops."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import sys

sys.dont_write_bytecode = True

PACKAGE_DIR = Path(__file__).resolve().parent
if str(PACKAGE_DIR) not in sys.path:
    sys.path.insert(0, str(PACKAGE_DIR))

import numpy as np  # noqa: E402
from pil_compat import Image, ImageDraw  # noqa: E402
from runtime_env import external_output, resolve_workspace_root  # noqa: E402

EXPECTED_SHEETS = [
    ("M000-F000", [0.0, 0.0], "c14", "stage-b-support", "d8841a32d1e0cf08540d4a5d775213109cdbb7f525f5fd1a5d6af16e47248d50", 6023511),
    ("M050-F000", [0.5, 0.0], "c15", "stage-a-pinned-canonical-anchor", "b7820ec720c0ab269c48efb92ecce569ca155410934949992519a53b5f4219cc", 5339350),
    ("M100-F000", [1.0, 0.0], "c16", "stage-b-support", "c3e1956b2a4d68497848b36cd3d21105e615bd3f133f23cc4bd1026d0b8377ad", 5879694),
    ("M000-F050", [0.0, 0.5], "c17", "stage-b-validation-or-stage-c-support", "5b5401fa2e6c3bec9506d8ac8190f38d3080d1c9799f075d4c61a4014d67eb41", 4698208),
    ("M050-F050", [0.5, 0.5], "c18", "stage-b-validation-or-stage-c-support", "7af3c89050c630791674fb3a4fa9ce0ae8d38f033dc139696337802904b9ea21", 5810915),
    ("M100-F050", [1.0, 0.5], "c19", "stage-b-validation-or-stage-c-support", "655ee7d1c852c221871d3c88c86d137f6dff89b4ee4c0877f8676f6713382f72", 5736452),
    ("M000-F100", [0.0, 1.0], "c20", "stage-b-support", "2c1dd723c1d48cf52f810b42d4e4e105fc3b2e2fc08faee2d5fd78451d90e4a0", 5208444),
    ("M050-F100", [0.5, 1.0], "c21", "stage-a-donor", "f38d7cfe285df78b81f284d7490d52775a9b4ab3366b36ab221f4d734153bf5d", 6102333),
    ("M100-F100", [1.0, 1.0], "c22", "stage-b-support", "ad915a82c698afbce0c08594d68fa5970e597e712543ef961850622886ddf696", 5610562),
]


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def foreground_mask(rgb: np.ndarray) -> np.ndarray:
    """Detect figure + linen foreground relative to neutral studio backdrop."""
    # Sample top/bottom corners and edges for studio background color profile per column
    h, w, _ = rgb.shape
    bg_rows = np.concatenate([rgb[4:24, :, :], rgb[h - 14 : h - 2, :, :]], axis=0).astype(np.float32)
    bg_col = np.median(bg_rows, axis=0)  # (W, 3)
    diff = np.linalg.norm(rgb.astype(np.float32) - bg_col[None, :, :], axis=2)
    # Skin chroma OR strong luminance/color delta from local column background (for off-white linen & shadow-free silhouette)
    r, g, b = rgb[:, :, 0].astype(np.int16), rgb[:, :, 1].astype(np.int16), rgb[:, :, 2].astype(np.int16)
    skin = (r - g >= 8) & (r - b >= 16) & (r > 45)
    # Exclude subtle floor contact shadow near soles by requiring stronger chroma or contrast near floor
    fg = skin | (diff > 22.0)
    # Suppress faint horizontal floor cast shadow below soles where chroma is neutral gray
    neutral_gray = (np.abs(r - g) <= 7) & (np.abs(g - b) <= 10)
    faint_shadow = neutral_gray & (rgb.mean(axis=2) < bg_col[:, :].mean(axis=1)[None, :]) & (diff < 52.0)
    fg = fg & (~faint_shadow)
    return fg


def find_three_panels(fg: np.ndarray) -> list[tuple[int, int, int, int]]:
    """Find [x0, x1] clear-air split bounds and [fg_left, fg_right] for front, profile, back."""
    h, w = fg.shape
    # Ignore top/bottom 18 px margin noise
    col_counts = fg[20 : h - 18, :].sum(axis=0)
    occupied = col_counts >= 4
    # Find contiguous occupied column intervals (merge tiny <8px gaps inside a figure)
    runs: list[list[int]] = []
    in_run = False
    start = 0
    for x in range(w):
        if occupied[x] and not in_run:
            start = x
            in_run = True
        elif not occupied[x] and in_run:
            if runs and start - runs[-1][1] < 14:
                runs[-1][1] = x
            else:
                runs.append([start, x])
            in_run = False
    if in_run:
        if runs and start - runs[-1][1] < 14:
            runs[-1][1] = w
        else:
            runs.append([start, w])
    # Keep significant figure runs (>120 px wide)
    runs = [r for r in runs if (r[1] - r[0]) >= 100]
    if len(runs) != 3:
        raise ValueError(f"Expected exactly 3 figure runs, found {len(runs)}: {runs}")
    # Split midpoints in the clear studio gap between figures
    gap01 = (runs[0][1] + runs[1][0]) // 2
    gap12 = (runs[1][1] + runs[2][0]) // 2
    left_margin = max(0, runs[0][0] - 48)
    right_margin = min(w, runs[2][1] + 48)
    splits = [
        (left_margin, gap01, runs[0][0], runs[0][1]),
        (gap01, gap12, runs[1][0], runs[1][1]),
        (gap12, right_margin, runs[2][0], runs[2][1]),
    ]
    for idx in range(2):
        gap_width = runs[idx + 1][0] - runs[idx][1]
        if gap_width < 24:
            raise ValueError(f"Insufficient clear gap ({gap_width}px) between panel {idx} and {idx+1}: {runs}")
    return splits


def measure_panel(fg: np.ndarray, x0: int, x1: int, view: str) -> dict:
    sub = fg[:, x0:x1]
    ys = np.flatnonzero(sub.sum(axis=1) >= 3)
    if len(ys) == 0:
        raise ValueError(f"Empty foreground in {view} [{x0}:{x1}]")
    crown_y = int(ys[0])
    sole_y = int(ys[-1])
    height_px = sole_y - crown_y
    xs = np.flatnonzero(sub[crown_y : sole_y + 1, :].sum(axis=0) >= 3)
    fg_x0, fg_x1 = int(xs[0] + x0), int(xs[-1] + x0 + 1)
    # Head centerline from top 3%..11% of stature
    head_y0 = crown_y + int(0.03 * height_px)
    head_y1 = crown_y + int(0.11 * height_px)
    head_xs = np.flatnonzero(sub[head_y0:head_y1, :].sum(axis=0) >= 2)
    center_x = int(round(float(head_xs.mean()) + x0)) if len(head_xs) else (fg_x0 + fg_x1) // 2

    def span_at(frac_from_sole: float, central_only: bool = False) -> float | None:
        y = int(round(sole_y - frac_from_sole * height_px))
        row = sub[max(0, y - 2) : min(sub.shape[0], y + 3), :].any(axis=0)
        if not row.any():
            return None
        changes = np.flatnonzero(np.diff(np.r_[False, row, False]))
        segs = list(zip(changes[::2], changes[1::2]))
        if central_only:
            rel_c = center_x - x0
            chosen = next(((a, b) for a, b in segs if a <= rel_c <= b), None)
            if chosen is None:
                chosen = max(segs, key=lambda ab: ab[1] - ab[0])
            return round(100.0 * (chosen[1] - chosen[0]) / height_px, 3)
        return round(100.0 * (segs[-1][1] - segs[0][0]) / height_px, 3)

    metrics = {
        "panelCropX": [x0, x1],
        "foregroundBoundsPx": [fg_x0, crown_y, fg_x1, sole_y],
        "centerX": center_x,
        "crownY": crown_y,
        "soleY": sole_y,
        "staturePx": height_px,
        "statureHeightFraction": round(height_px / fg.shape[0], 5),
    }
    if view in ("front", "back"):
        metrics.update(
            outerShoulderPct=span_at(0.815, central_only=False),
            chestTrunkPct=span_at(0.735, central_only=True),
            waistTrunkPct=span_at(0.625, central_only=True),
            hipSeatPct=span_at(0.535, central_only=True),
            midThighSinglePct=None,
        )
        # Measure left/right thigh width at 0.39 of stature
        y_th = int(round(sole_y - 0.39 * height_px))
        row_th = sub[max(0, y_th - 2) : min(sub.shape[0], y_th + 3), :].any(axis=0)
        ch = np.flatnonzero(np.diff(np.r_[False, row_th, False]))
        segs = [b - a for a, b in zip(ch[::2], ch[1::2]) if (b - a) > 12]
        if len(segs) == 2:
            metrics["midThighSinglePct"] = round(100.0 * (sum(segs) / 2.0) / height_px, 3)
        elif len(segs) == 1:
            # Touching inner thighs on very full/muscular builds: half of combined span
            metrics["midThighSinglePct"] = round(100.0 * (segs[0] / 2.0) / height_px, 3)
            metrics["innerThighContactAt39Pct"] = True
    else:
        metrics.update(
            profileChestDepthPct=span_at(0.735, central_only=False),
            profileBellySeatMaxPct=max(
                v for v in (span_at(f, central_only=False) for f in np.linspace(0.52, 0.68, 17)) if v is not None
            ),
            profileThighDepthPct=span_at(0.39, central_only=False),
            profileCalfDepthPct=span_at(0.21, central_only=False),
        )
    return metrics


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workspace", type=Path, default=None, help="External OpenLegend art workspace root")
    parser.add_argument("--study-dir", type=Path, default=None)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else None)

    ws = resolve_workspace_root(args.workspace)
    study_root = external_output(args.study_dir if args.study_dir is not None else (ws / "2026-11-12-body-reference-family/study"))
    grid_dir = study_root / "grid-9-20261112"
    family_dir = study_root / "family-20261113"
    peacock_anchor = ws / "2026-11-11-peacock-meshy-conform/study/references/body/sheet.png"
    peacock_v3_compiled = ws / "2026-11-11-peacock-full-transfer/study/continuation/finish/root/body-audit/body-v3-kit/compiled.json"
    shirt_lane_compiled = ws / "2026-11-11-peacock-full-transfer/study/continuation/finish/root/lane-orientation-kit/compiled.json"
    shorts_r4_npz = study_root / "execution-20261112/retry/retry-coverage/torso-exact-r4-kit/shorts-panel-correction.npz"
    shorts_r4_witness_blend = study_root / "execution-20261112/retry/retry-coverage/t-pose-continuous-covered/kit/family.blend"

    sources_dir = external_output(family_dir / "sources")
    crops_root = external_output(sources_dir / "crops")
    sources_dir.mkdir(parents=True, exist_ok=True)
    crops_root.mkdir(parents=True, exist_ok=True)

    # Verify canonical pinned inputs first
    peacock_anchor_sha = sha256_file(peacock_anchor)
    if peacock_anchor_sha != "003a013911bc90ed768396432ee64fc9199c9c7a3efd9812d9a461af7ebd5cc1":
        raise ValueError(f"Approved Peacock anchor hash mismatch: {peacock_anchor_sha}")
    v3_sha = sha256_file(peacock_v3_compiled)
    if v3_sha != "99061449c8f83a60b9d28ef6d6127c27e69132e8c71d95af65302b1b85ed7519":
        raise ValueError(f"Pinned Peacock V3 compiled.json hash mismatch: {v3_sha}")
    lane_sha = sha256_file(shirt_lane_compiled)
    if lane_sha != "8f673f1d2c53ff6f5766b9d58887073242813df57cd78071bd3de36d275f563e":
        raise ValueError(f"Pinned lane-orientation-kit compiled.json hash mismatch: {lane_sha}")
    r4_npz_sha = sha256_file(shorts_r4_npz)
    r4_witness_sha = sha256_file(shorts_r4_witness_blend)

    selected_grid = json.loads((grid_dir / "selected-grid.json").read_text())
    v3_doc = json.loads(peacock_v3_compiled.read_text())

    # First pass: inspect all 9 sheets, verify hashes/sizes, find panel bounds and max width
    inspected = []
    max_panel_width = 0
    for coord_id, coord_vals, cid, stage_role, expected_sha, expected_bytes in EXPECTED_SHEETS:
        rec = selected_grid[coord_id]
        sheet_path = Path(rec["path"])
        actual_bytes = sheet_path.stat().st_size
        actual_sha = sha256_file(sheet_path)
        if rec["cid"] != cid or actual_sha != expected_sha or actual_bytes != expected_bytes:
            raise ValueError(f"Source mismatch on {coord_id}: {rec}, sha={actual_sha}, bytes={actual_bytes}")
        im = Image.open(sheet_path).convert("RGB")
        if im.size != (2528, 1696):
            raise ValueError(f"Unexpected dimensions on {coord_id}: {im.size}")
        rgb = np.asarray(im, dtype=np.uint8)
        fg = foreground_mask(rgb)
        splits = find_three_panels(fg)
        for x0, x1, _, _ in splits:
            max_panel_width = max(max_panel_width, x1 - x0)
        inspected.append((coord_id, coord_vals, cid, stage_role, sheet_path, actual_sha, actual_bytes, im, rgb, fg, splits))

    # Round canvas width up to a clean multiple of 16 for Meshy unscaled equal-scale crops
    canvas_width = int(((max_panel_width + 32 + 15) // 16) * 16)
    canvas_height = 1696

    rows_manifest = []
    audit_tiles: list[tuple[str, list[Image.Image], dict]] = []

    for coord_id, coord_vals, cid, stage_role, sheet_path, actual_sha, actual_bytes, im, rgb, fg, splits in inspected:
        coord_crop_dir = crops_root / coord_id
        coord_crop_dir.mkdir(parents=True, exist_ok=True)
        views_meta = {}
        view_thumbs = []
        for view_name, (x0, x1, fg_x0, fg_x1) in zip(("front", "profile", "back"), splits):
            m = measure_panel(fg, x0, x1, view_name)
            # Extract unscaled crop [x0:x1, 0:1696] and center figure on canvas_width x 1696
            raw_crop = im.crop((x0, 0, x1, canvas_height))
            bg_sample = np.median(
                np.concatenate([rgb[6:22, x0:x1, :], rgb[canvas_height - 16 : canvas_height - 4, x0:x1, :]], axis=0),
                axis=(0, 1),
            )
            bg_rgb = tuple(int(round(v)) for v in bg_sample)
            canvas = Image.new("RGB", (canvas_width, canvas_height), bg_rgb)
            # Center figure's centerX at canvas_width // 2 without rescaling; clamp if needed so no pixels clip
            desired_paste_x = (canvas_width // 2) - (m["centerX"] - x0)
            paste_x = max(0, min(canvas_width - raw_crop.width, desired_paste_x))
            canvas.paste(raw_crop, (paste_x, 0))
            out_png = coord_crop_dir / f"{view_name}.png"
            canvas.save(out_png, format="PNG", compress_level=6)
            m["cropFile"] = str(out_png)
            m["cropSha256"] = sha256_file(out_png)
            m["cropBytes"] = out_png.stat().st_size
            m["cropCanvasPx"] = [canvas_width, canvas_height]
            m["pasteOffsetX"] = paste_x
            m["pixelScalePreserved"] = True
            views_meta[view_name] = m

            # Build annotated audit thumbnail
            thumb = canvas.copy()
            draw = ImageDraw.Draw(thumb)
            draw.line([(0, m["crownY"]), (canvas_width, m["crownY"])], fill=(40, 180, 90), width=3)
            draw.line([(0, m["soleY"]), (canvas_width, m["soleY"])], fill=(210, 70, 50), width=3)
            cx_canvas = paste_x + (m["centerX"] - x0)
            draw.line([(cx_canvas, m["crownY"]), (cx_canvas, m["soleY"])], fill=(70, 130, 230), width=2)
            view_thumbs.append(thumb.resize((canvas_width // 5, canvas_height // 5), Image.Resampling.LANCZOS))

        statures = [views_meta[v]["staturePx"] for v in ("front", "profile", "back")]
        sole_ys = [views_meta[v]["soleY"] for v in ("front", "profile", "back")]
        crown_ys = [views_meta[v]["crownY"] for v in ("front", "profile", "back")]
        consistency = {
            "maxStatureSpreadPx": max(statures) - min(statures),
            "maxStatureSpreadPct": round(100.0 * (max(statures) - min(statures)) / np.mean(statures), 3),
            "maxSoleLineSpreadPx": max(sole_ys) - min(sole_ys),
            "maxCrownLineSpreadPx": max(crown_ys) - min(crown_ys),
        }
        rows_manifest.append(
            {
                "id": coord_id,
                "coordinate": {"muscleMass": coord_vals[0], "fullness": coord_vals[1]},
                "candidateId": cid,
                "stageRole": stage_role,
                "sheetPath": str(sheet_path),
                "sheetSha256": actual_sha,
                "sheetBytes": actual_bytes,
                "sheetPx": [2528, 1696],
                "coverageNote": "Minimal inguinal-cut opaque medieval linen brief; pelvic skin under cloth is marked inferred during 3D fitting.",
                "viewConsistency": consistency,
                "views": views_meta,
            }
        )
        audit_tiles.append((f"{coord_id} ({cid})", view_thumbs, consistency))

    # Build visual audit contact sheet (3x3 coordinates, each showing front|profile|back with crown/sole/center lines)
    tw, th = audit_tiles[0][1][0].size
    cell_w = tw * 3 + 16
    cell_h = th + 34
    board = Image.new("RGB", (cell_w * 3 + 24, cell_h * 3 + 24), (24, 26, 30))
    bdraw = ImageDraw.Draw(board)
    for idx, (label, thumbs, cons) in enumerate(audit_tiles):
        gx, gy = idx % 3, idx // 3
        ox = 12 + gx * cell_w
        oy = 12 + gy * cell_h
        bdraw.text(
            (ox + 4, oy + 6),
            f"{label}  dH={cons['maxStatureSpreadPct']:.2f}% dSole={cons['maxSoleLineSpreadPx']}px",
            fill=(235, 238, 242),
        )
        for v_i, t_im in enumerate(thumbs):
            board.paste(t_im, (ox + v_i * (tw + 4), oy + 26))
    audit_path = sources_dir / "panel-crops-audit.png"
    board.save(audit_path, format="PNG")

    manifest = {
        "kind": "body-reference-family-source-plan",
        "workflowAuthority": "docs/production-workflows/art-flows/body-reference-family.md",
        "milestoneOwner": "MHP10 (docs/maintainers/art/metahuman-poc.md#peacock-anatomy-controls)",
        "scope": {
            "familyBase": "masculine-adult-peacock-foundation",
            "sliders": ["muscleMass", "fullness"],
            "retiredControls": ["definition"],
            "fixedApparentAgeYears": 30,
            "fixedFrame": 0,
            "referenceStatureMetres": v3_doc["referenceStatureMetres"],
            "headPolicy": "Single replaceable bald canonical head (92 paired seam rows, shared normals and skin weights)",
            "coveragePolicy": "Complete underlying canonical anatomy + separate fitted baseline coverage (studioShorts R4) + premade Peacock shirt (proofShirt) checked unmasked",
            "stagedDonorPlan": {
                "stageA": {
                    "supports": ["M050-F000 (existing accepted V3 lean body)", "M050-F100 (new Meshy donor from c21)"],
                    "newMeshyJobs": 1,
                },
                "stageB": {
                    "supports": ["M000-F000 (c14)", "M100-F000 (c16)", "M000-F100 (c20)", "M100-F100 (c22)"],
                    "synthesizedValidationRows": ["M000-F050 (vs c17)", "M050-F050 (vs c18)", "M100-F050 (vs c19)"],
                    "newMeshyJobs": 4,
                },
                "stageCConditional": {
                    "trigger": "Only if Stage B synthesized F=0.5 row fails visually/anatomically against c17/c18/c19 and budget permits",
                    "supports": ["M000-F050 (c17)", "M050-F050 (c18)", "M100-F050 (c19)"],
                    "newMeshyJobs": 3,
                },
            },
        },
        "pinnedInputs": {
            "approvedPeacockLeanSheet": {"path": str(peacock_anchor), "sha256": peacock_anchor_sha},
            "canonicalLeanV3Compiled": {"path": str(peacock_v3_compiled), "sha256": v3_sha},
            "shirtAndMotionLaneCompiled": {"path": str(shirt_lane_compiled), "sha256": lane_sha},
            "baselineCoverageR4CorrectionNpz": {"path": str(shorts_r4_npz), "sha256": r4_npz_sha},
            "baselineCoverageR4WitnessBlend": {"path": str(shorts_r4_witness_blend), "sha256": r4_witness_sha},
            "grid9PrivateArchiveIndex": "art-direction/studies/2026-11-12-body-reference-family/grid-9.index.json",
        },
        "cropCanvasPx": [canvas_width, canvas_height],
        "auditSheet": {"path": str(audit_path), "sha256": sha256_file(audit_path)},
        "coordinates": rows_manifest,
    }
    manifest_path = sources_dir / "nine-grid-manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(
        json.dumps(
            {
                "manifest": str(manifest_path),
                "auditSheet": str(audit_path),
                "cropCanvasPx": [canvas_width, canvas_height],
                "summary": [
                    {
                        "id": r["id"],
                        "cid": r["candidateId"],
                        "role": r["stageRole"],
                        "frontWaistPct": r["views"]["front"]["waistTrunkPct"],
                        "frontShoulderPct": r["views"]["front"]["outerShoulderPct"],
                        "frontThighPct": r["views"]["front"]["midThighSinglePct"],
                        "profileBellySeatPct": r["views"]["profile"]["profileBellySeatMaxPct"],
                        "dStaturePct": r["viewConsistency"]["maxStatureSpreadPct"],
                        "dSolePx": r["viewConsistency"]["maxSoleLineSpreadPx"],
                    }
                    for r in rows_manifest
                ],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
