#!/usr/bin/env python3
"""Generalized 3-view panel extraction & crown/sole scale-agreement checker for person reference sheets.

Follows `docs/production-workflows/art-flows/body-reference-family.md#make-each-source-visually-determinate`:
extracts unscaled equal-canvas front, profile, and back crops (`pixelScalePreserved = true`) and checks
sole/crown/stature consistency before 3D donor dispatch.
"""
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
from runtime_env import external_output  # noqa: E402


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def foreground_mask(rgb: np.ndarray) -> np.ndarray:
    """Detect figure + linen foreground relative to neutral studio backdrop."""
    h, _, _ = rgb.shape
    bg_rows = np.concatenate([rgb[4:24, :, :], rgb[h - 14 : h - 2, :, :]], axis=0).astype(np.float32)
    bg_col = np.median(bg_rows, axis=0)
    diff = np.linalg.norm(rgb.astype(np.float32) - bg_col[None, :, :], axis=2)
    r, g, b = rgb[:, :, 0].astype(np.int16), rgb[:, :, 1].astype(np.int16), rgb[:, :, 2].astype(np.int16)
    skin = (r - g >= 8) & (r - b >= 16) & (r > 45)
    fg = skin | (diff > 22.0)
    neutral_gray = (np.abs(r - g) <= 7) & (np.abs(g - b) <= 10)
    faint_shadow = neutral_gray & (rgb.mean(axis=2) < bg_col[:, :].mean(axis=1)[None, :]) & (diff < 52.0)
    return fg & (~faint_shadow)


def find_three_panels(fg: np.ndarray) -> list[tuple[int, int, int, int]]:
    """Find `[x0, x1]` clear-air split bounds and `[fg_left, fg_right]` for front, profile, back."""
    h, w = fg.shape
    col_counts = fg[20 : h - 18, :].sum(axis=0)
    occupied = col_counts >= 4
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
    runs = [r for r in runs if (r[1] - r[0]) >= 100]
    if len(runs) != 3:
        raise ValueError(f"Expected exactly 3 figure runs, found {len(runs)}: {runs}")
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
            raise ValueError(f"Insufficient clear gap ({gap_width}px) between panel {idx} and {idx + 1}: {runs}")
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

    metrics: dict = {
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
        y_th = int(round(sole_y - 0.39 * height_px))
        row_th = sub[max(0, y_th - 2) : min(sub.shape[0], y_th + 3), :].any(axis=0)
        ch = np.flatnonzero(np.diff(np.r_[False, row_th, False]))
        segs = [b - a for a, b in zip(ch[::2], ch[1::2]) if (b - a) > 12]
        if len(segs) == 2:
            metrics["midThighSinglePct"] = round(100.0 * (sum(segs) / 2.0) / height_px, 3)
        elif len(segs) == 1:
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


def prepare_views_for_subject(
    subject_id: str,
    out_crops_root: Path,
    sheet_path: Path | None = None,
    front_path: Path | None = None,
    profile_path: Path | None = None,
    back_path: Path | None = None,
) -> dict:
    subj_dir = external_output(out_crops_root / subject_id)
    subj_dir.mkdir(parents=True, exist_ok=True)

    if sheet_path is not None:
        im = Image.open(sheet_path).convert("RGB")
        rgb = np.asarray(im, dtype=np.uint8)
        fg = foreground_mask(rgb)
        splits = find_three_panels(fg)
        max_pw = max(x1 - x0 for x0, x1, _, _ in splits)
        canvas_w = int(((max_pw + 32 + 15) // 16) * 16)
        canvas_h = im.height

        views_meta = {}
        thumbs = []
        for vname, (x0, x1, _, _) in zip(("front", "profile", "back"), splits):
            m = measure_panel(fg, x0, x1, vname)
            raw_crop = im.crop((x0, 0, x1, canvas_h))
            bg_sample = np.median(
                np.concatenate([rgb[6:22, x0:x1, :], rgb[canvas_h - 16 : canvas_h - 4, x0:x1, :]], axis=0),
                axis=(0, 1),
            )
            bg_rgb = tuple(int(round(v)) for v in bg_sample)
            canvas = Image.new("RGB", (canvas_w, canvas_h), bg_rgb)
            desired_px = (canvas_w // 2) - (m["centerX"] - x0)
            paste_x = max(0, min(canvas_w - raw_crop.width, desired_px))
            canvas.paste(raw_crop, (paste_x, 0))
            out_png = subj_dir / f"{vname}.png"
            canvas.save(out_png, format="PNG", compress_level=6)
            m["cropFile"] = str(out_png)
            m["cropSha256"] = sha256_file(out_png)
            m["cropBytes"] = out_png.stat().st_size
            m["cropCanvasPx"] = [canvas_w, canvas_h]
            m["pixelScalePreserved"] = True
            views_meta[vname] = m

            th = canvas.copy()
            dr = ImageDraw.Draw(th)
            dr.line([(0, m["crownY"]), (canvas_w, m["crownY"])], fill=(40, 180, 90), width=3)
            dr.line([(0, m["soleY"]), (canvas_w, m["soleY"])], fill=(210, 70, 50), width=3)
            cx_c = paste_x + (m["centerX"] - x0)
            dr.line([(cx_c, m["crownY"]), (cx_c, m["soleY"])], fill=(70, 130, 230), width=2)
            thumbs.append(th.resize((max(1, canvas_w // 4), max(1, canvas_h // 4)), Image.Resampling.LANCZOS))
    else:
        if not (front_path and profile_path and back_path):
            raise ValueError("Provide either --sheet or all three of --front, --profile, --back")
        src_map = {"front": front_path, "profile": profile_path, "back": back_path}
        ims = {k: Image.open(p).convert("RGB") for k, p in src_map.items()}
        canvas_w = int(((max(i.width for i in ims.values()) + 32 + 15) // 16) * 16)
        canvas_h = max(i.height for i in ims.values())
        views_meta = {}
        thumbs = []
        for vname, v_im in ims.items():
            rgb = np.asarray(v_im, dtype=np.uint8)
            fg = foreground_mask(rgb)
            m = measure_panel(fg, 0, v_im.width, vname)
            bg_rgb = tuple(int(round(v)) for v in np.median(rgb[4:18, :, :], axis=(0, 1)))
            canvas = Image.new("RGB", (canvas_w, canvas_h), bg_rgb)
            paste_x = max(0, min(canvas_w - v_im.width, (canvas_w // 2) - m["centerX"]))
            paste_y = canvas_h - v_im.height
            canvas.paste(v_im, (paste_x, paste_y))
            out_png = subj_dir / f"{vname}.png"
            canvas.save(out_png, format="PNG", compress_level=6)
            m["cropFile"] = str(out_png)
            m["cropSha256"] = sha256_file(out_png)
            m["cropBytes"] = out_png.stat().st_size
            m["cropCanvasPx"] = [canvas_w, canvas_h]
            views_meta[vname] = m
            thumbs.append(canvas.resize((max(1, canvas_w // 4), max(1, canvas_h // 4)), Image.Resampling.LANCZOS))

    statures = [views_meta[v]["staturePx"] for v in ("front", "profile", "back")]
    sole_ys = [views_meta[v]["soleY"] for v in ("front", "profile", "back")]
    crown_ys = [views_meta[v]["crownY"] for v in ("front", "profile", "back")]
    consistency = {
        "maxStatureSpreadPx": int(max(statures) - min(statures)),
        "maxStatureSpreadPct": round(100.0 * (max(statures) - min(statures)) / np.mean(statures), 3),
        "maxSoleLineSpreadPx": int(max(sole_ys) - min(sole_ys)),
        "maxCrownLineSpreadPx": int(max(crown_ys) - min(crown_ys)),
    }

    tw, th = thumbs[0].size
    audit = Image.new("RGB", (tw * 3 + 32, th + 44), (22, 24, 28))
    adr = ImageDraw.Draw(audit)
    adr.text(
        (12, 8),
        f"{subject_id} · 3-View Equal-Scale Crop Audit (dH={consistency['maxStatureSpreadPct']:.2f}% dSole={consistency['maxSoleLineSpreadPx']}px)",
        fill=(240, 242, 246),
    )
    for idx, t_im in enumerate(thumbs):
        audit.paste(t_im, (12 + idx * (tw + 4), 32))
    audit_path = subj_dir / "crop-audit.png"
    audit.save(audit_path, format="PNG")

    summary = {
        "subjectId": subject_id,
        "sourceSheet": str(sheet_path.resolve()) if sheet_path else None,
        "sourceSheetSha256": sha256_file(sheet_path) if sheet_path else None,
        "auditSheet": str(audit_path),
        "viewConsistency": consistency,
        "views": views_meta,
    }
    (subj_dir / "views-manifest.json").write_text(json.dumps(summary, indent=2) + "\n")
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--subject-id", required=True)
    parser.add_argument("--out-crops-root", required=True, type=Path)
    parser.add_argument("--sheet", type=Path, default=None)
    parser.add_argument("--front", type=Path, default=None)
    parser.add_argument("--profile", type=Path, default=None)
    parser.add_argument("--back", type=Path, default=None)
    raw_argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else None
    args = parser.parse_args(raw_argv)
    res = prepare_views_for_subject(
        args.subject_id,
        args.out_crops_root.resolve(),
        sheet_path=args.sheet.resolve() if args.sheet else None,
        front_path=args.front.resolve() if args.front else None,
        profile_path=args.profile.resolve() if args.profile else None,
        back_path=args.back.resolve() if args.back else None,
    )
    print(json.dumps(res["viewConsistency"], indent=2))


if __name__ == "__main__":
    main()
