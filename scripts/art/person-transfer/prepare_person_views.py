#!/usr/bin/env python3
"""Generalized 3-view panel extraction & crown/sole scale-agreement checker for ANY person reference sheet."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import sys

sys.dont_write_bytecode = True

import numpy as np
from PIL import Image, ImageDraw

from prepare_nine_grid_sources import find_three_panels, foreground_mask, measure_panel


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def prepare_views_for_subject(
    subject_id: str,
    out_crops_root: Path,
    sheet_path: Path | None = None,
    front_path: Path | None = None,
    profile_path: Path | None = None,
    back_path: Path | None = None,
) -> dict:
    subj_dir = out_crops_root / subject_id
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
    args = parser.parse_args()
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
