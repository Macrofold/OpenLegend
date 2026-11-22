#!/usr/bin/env python3
"""Fast single-scene Blender Workbench visual audit renderer.

- Default inner-iteration mode (`full_audit=False`): renders ONE consolidated 1:1 close-up
  comparison sheet (`fast-1to1-iteration-sheet.png`) in ~2.2 seconds by loading all meshes
  once into a single Blender scene and switching camera/visibility per tile.
- Sign-off mode (`full_audit=True`, `--full-audit`): renders both the consolidated 1:1 sheet
  and the complete 11-board sign-off suite inside `out_dir`.
"""
from __future__ import annotations

import sys
sys.dont_write_bytecode = True

from collections import defaultdict, deque
from pathlib import Path
import shutil

import bpy
import numpy as np

PACKAGE_DIR = Path(__file__).resolve().parent
if str(PACKAGE_DIR) not in sys.path:
    sys.path.insert(0, str(PACKAGE_DIR))

from pil_compat import Image, ImageDraw  # noqa: E402


def _strip_arms_for_pelvis_profile(
    pts: np.ndarray, tri: np.ndarray, g_start: int | None
) -> tuple[np.ndarray, np.ndarray, int | None]:
    """Isolate the sagittal-midline trunk/pelvis/leg component (plus any garment faces `>= g_start`)
    so forearms, wrists, hands, and fingers never occlude `1:1` Right Profile pelvis contour overlays.
    """
    has_g = g_start is not None and g_start < len(pts)
    is_g_f = np.any(tri >= int(g_start), axis=1) if has_g else np.zeros(len(tri), dtype=bool)
    body_idx = np.nonzero(~is_g_f)[0]
    body_tri = tri[body_idx]
    fc = pts[body_tri].mean(axis=1)

    r_pts = np.round(pts, 5)
    _, inv = np.unique(r_pts, axis=0, return_inverse=True)
    w_tri = inv[body_tri]

    # 1) Connected trunk/pelvis/thighs inside Z in [0.55, 1.27] (safely below every armpit across all builds):
    in_low = np.nonzero((fc[:, 2] >= 0.55) & (fc[:, 2] <= 1.27))[0]
    v2f_low: dict[int, list[int]] = defaultdict(list)
    for li, f in enumerate(w_tri[in_low]):
        v2f_low[int(f[0])].append(li)
        v2f_low[int(f[1])].append(li)
        v2f_low[int(f[2])].append(li)
    keep_low = np.zeros(len(in_low), dtype=bool)
    seeds = np.nonzero(np.abs(fc[in_low, 0]) < 0.045)[0]
    keep_low[seeds] = True
    q = deque(seeds.tolist())
    while q:
        u = q.popleft()
        for v in w_tri[in_low[u]]:
            for nb in v2f_low[int(v)]:
                if not keep_low[nb]:
                    keep_low[nb] = True
                    q.append(nb)

    kept_low_global = in_low[keep_low]
    if len(kept_low_global) == 0:
        return pts, tri, g_start
    max_trunk_x = float(np.max(np.abs(fc[kept_low_global, 0])))
    trunk_verts = set(w_tri[kept_low_global].reshape(-1).tolist())

    # 2) Extend seamlessly into Z in (1.27, 1.44] strictly within trunk width so top of camera frame has no cut line:
    in_up = np.nonzero((fc[:, 2] > 1.27) & (fc[:, 2] <= 1.44) & (np.abs(fc[:, 0]) <= max_trunk_x + 0.015))[0]
    v2f_up: dict[int, list[int]] = defaultdict(list)
    for ui, f in enumerate(w_tri[in_up]):
        v2f_up[int(f[0])].append(ui)
        v2f_up[int(f[1])].append(ui)
        v2f_up[int(f[2])].append(ui)
    keep_up = np.zeros(len(in_up), dtype=bool)
    q_up = deque()
    for ui, f in enumerate(w_tri[in_up]):
        if int(f[0]) in trunk_verts or int(f[1]) in trunk_verts or int(f[2]) in trunk_verts:
            keep_up[ui] = True
            q_up.append(ui)
    while q_up:
        u = q_up.popleft()
        for v in w_tri[in_up[u]]:
            for nb in v2f_up[int(v)]:
                if not keep_up[nb]:
                    keep_up[nb] = True
                    q_up.append(nb)

    kept_body = body_idx[np.concatenate([kept_low_global, in_up[keep_up]])]
    out_tri = np.vstack([tri[kept_body], tri[is_g_f]]) if np.any(is_g_f) else tri[kept_body]
    return pts, out_tri, g_start


def _build_single_workbench_scene(mesh_specs: dict[str, tuple[np.ndarray, np.ndarray]]):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.film_transparent = False
    world = bpy.data.worlds.new("ClayWorld")
    world.color = (0.16, 0.17, 0.19)
    scene.world = world
    shading = scene.display.shading
    shading.background_type = "WORLD"
    shading.light = "STUDIO"
    shading.color_type = "VERTEX"
    shading.show_cavity = True
    shading.cavity_type = "WORLD"
    shading.cavity_ridge_factor = 0.72
    shading.cavity_valley_factor = 0.78

    objs: dict[str, bpy.types.Object] = {}
    for key, spec_item in mesh_specs.items():
        pts, tri = spec_item[0], spec_item[1]
        garment_v_start = int(spec_item[2]) if len(spec_item) > 2 and spec_item[2] is not None else len(pts)
        is_garment_v = np.arange(len(pts)) >= garment_v_start
        # Group by (rounded xyz, is_garment) so skin and linenBriefs keep distinct clean shading without merging across the 3mm gap:
        r_pts = np.round(pts, 6)
        tag_col = np.where(is_garment_v, 1.0, 0.0)[:, None]
        _, inv = np.unique(np.hstack([r_pts, tag_col]), axis=0, return_inverse=True)
        n_u_m = int(inv.max()) + 1
        u_pts = np.zeros((n_u_m, 3), dtype=np.float64)
        u_is_g = np.zeros(n_u_m, dtype=bool)
        u_pts[inv] = pts
        u_is_g[inv] = is_garment_v
        w_tri = inv[tri]
        keep_f = (w_tri[:, 0] != w_tri[:, 1]) & (w_tri[:, 1] != w_tri[:, 2]) & (w_tri[:, 0] != w_tri[:, 2])
        mesh = bpy.data.meshes.new(f"Mesh_{key}")
        mesh.from_pydata(u_pts.tolist(), [], w_tri[keep_f].tolist())
        for poly in mesh.polygons:
            poly.use_smooth = True
        vcol = mesh.color_attributes.new(name="Col", type="BYTE_COLOR", domain="POINT")
        # Neutral studio clay `(0.74, 0.73, 0.71)` for skin vs warm oatmeal linen `(0.90, 0.86, 0.76)` for close-fitting linen briefs:
        rgba = np.where(
            u_is_g[:, None],
            np.array([0.90, 0.86, 0.76, 1.0], dtype=np.float32),
            np.array([0.74, 0.73, 0.71, 1.0], dtype=np.float32),
        )
        vcol.data.foreach_set("color", rgba.reshape(-1))
        mesh.color_attributes.render_color_index = 0
        mesh.color_attributes.active_color_index = 0
        obj = bpy.data.objects.new(f"Obj_{key}", mesh)
        obj.hide_render = True
        scene.collection.objects.link(obj)
        objs[key] = obj

    cam_data = bpy.data.cameras.new("OrthoCam")
    cam_data.type = "ORTHO"
    cam_obj = bpy.data.objects.new("OrthoCam", cam_data)
    scene.collection.objects.link(cam_obj)
    scene.camera = cam_obj

    pivot = bpy.data.objects.new("Pivot", None)
    scene.collection.objects.link(pivot)
    cam_obj.parent = pivot
    cam_obj.location = (0.0, -3.5, 0.0)
    cam_obj.rotation_euler = (np.deg2rad(90.0), 0.0, 0.0)
    return scene, objs, cam_data, pivot


def _render_tile(
    scene,
    objs: dict[str, bpy.types.Object],
    cam_data,
    pivot,
    active_key: str,
    out_path: Path,
    res_x: int,
    res_y: int,
    pivot_xyz: tuple[float, float, float],
    ortho_scale: float,
    yaw_deg: float,
    pitch_deg: float = 0.0,
) -> None:
    for k, o in objs.items():
        o.hide_render = k != active_key
    scene.render.resolution_x = res_x
    scene.render.resolution_y = res_y
    cam_data.ortho_scale = ortho_scale
    pivot.location = pivot_xyz
    pivot.rotation_euler = (np.deg2rad(pitch_deg), 0.0, np.deg2rad(yaw_deg))
    scene.render.filepath = str(out_path)
    bpy.ops.render.render(write_still=True)


def _stitch_audit_boards(cfg: dict) -> None:
    def fg_bounds(im):
        arr = np.asarray(im, dtype=np.float32)
        bg = np.median(np.stack([arr[4, 4], arr[4, -5], arr[-5, 4], arr[-5, -5]], axis=0), axis=0)
        fg = np.linalg.norm(arr - bg[None, None, :], axis=2) > 26.0
        if not np.any(fg):
            return 0, im.height - 1, 0.5 * im.width
        ys, xs = np.nonzero(fg)
        y0, y1 = int(ys.min()), int(ys.max())
        head_xs = xs[ys < y0 + max(16, int(0.10 * (y1 - y0)))]
        xm = float(np.median(head_xs)) if len(head_xs) else 0.5 * im.width
        return y0, y1, xm

    def fit_ref_to_render(ref_im, ren_im, w, h, crop_upper_frac=None):
        ry0, ry1, rxm = fg_bounds(ref_im)
        ty0, ty1, txm = fg_bounds(ren_im)
        sc = (ty1 - ty0) / max(ry1 - ry0, 1)
        nw, nh = max(1, int(round(ref_im.width * sc))), max(1, int(round(ref_im.height * sc)))
        resized = ref_im.resize((nw, nh), Image.Resampling.LANCZOS)
        bg = ref_im.getpixel((4, 4))
        full_w, full_h = ren_im.width, ren_im.height
        aligned = Image.new("RGB", (full_w, full_h), bg)
        ox = int(round(txm - rxm * sc))
        oy = int(round(ty0 - ry0 * sc))
        aligned.paste(resized, (ox, oy))
        if crop_upper_frac is not None:
            ch = int(round(full_h * crop_upper_frac))
            y_top = max(0, ty0 - 14)
            aligned = aligned.crop((0, y_top, full_w, min(full_h, y_top + ch)))
        return aligned.resize((w, h), Image.Resampling.LANCZOS)

    def make_grid_board(rows, tw, th, out_path, title=None):
        ncols = max(len(r[1]) for r in rows)
        top_pad = 36 if title else 10
        bw = ncols * (tw + 8) + 16
        bh = top_pad + len(rows) * (th + 30) + 12
        board = Image.new("RGB", (bw, bh), (20, 22, 26))
        draw = ImageDraw.Draw(board)
        if title:
            draw.text((14, 10), title, fill=(255, 225, 150))
        for ri, (row_lbl, tiles) in enumerate(rows):
            oy = top_pad + ri * (th + 30)
            for ci, (lbl, p_str) in enumerate(tiles):
                ox = 12 + ci * (tw + 8)
                draw.text((ox + 4, oy + 4), lbl, fill=(230, 236, 244))
                with Image.open(p_str) as im:
                    if im.size != (tw, th):
                        im = im.convert("RGB").resize((tw, th), Image.Resampling.LANCZOS)
                    else:
                        im = im.convert("RGB")
                    board.paste(im, (ox, oy + 22))
        board.save(out_path, format="PNG")

    # Prepare 2D T-pose reference full-body + 1:1 full-arm & flank crops if available
    ref_jpg = cfg.get("refRaisedJpg")
    if ref_jpg and Path(ref_jpg).is_file() and "tposeCorFrontFull" in cfg:
        ref = Image.open(ref_jpg).convert("RGB")
        rw, rh = ref.size
        ref_f, ref_b = ref.crop((0, 0, rw // 2, rh)), ref.crop((rw // 2, 0, rw, rh))
        cor_f_full = Image.open(cfg["tposeCorFrontFull"]).convert("RGB")
        cor_b_full = Image.open(cfg["tposeCorBackFull"]).convert("RGB")
        rf_align = fit_ref_to_render(ref_f, cor_f_full, cor_f_full.width, cor_f_full.height)
        rb_align = fit_ref_to_render(ref_b, cor_b_full, cor_b_full.width, cor_b_full.height)
        rf_align.save(cfg["refFrontAlignedOut"])
        rb_align.save(cfg["refBackAlignedOut"])

        ty0, ty1, txm = fg_bounds(cor_f_full)
        h_fig = max(ty1 - ty0, 64)

        def save_uniform_crop(src_im, out_p, cy0_c, cy1_c, cx0_c, dst_w, dst_h):
            box_h_c = max(1, cy1_c - cy0_c)
            box_w_c = max(1, int(round(box_h_c * (dst_w / max(dst_h, 1)))))
            cx1_c = cx0_c + box_w_c
            bg_c = src_im.getpixel((4, 4))
            pad_x = max(0, -cx0_c, cx1_c - src_im.width) + 8
            pad_y = max(0, -cy0_c, cy1_c - src_im.height) + 8
            canvas = Image.new("RGB", (src_im.width + 2 * pad_x, src_im.height + 2 * pad_y), bg_c)
            canvas.paste(src_im, (pad_x, pad_y))
            crop = canvas.crop((cx0_c + pad_x, cy0_c + pad_y, cx1_c + pad_x, cy1_c + pad_y))
            crop.resize((dst_w, dst_h), Image.Resampling.LANCZOS).save(out_p)

        # Fast iteration sheet Row 4: 1:1 half-span (head/midline-to-wrist x head-to-waistband)
        tw_f, th_f = cfg["fastTileW"], cfg["fastTileH"]
        cy0_fast = int(round(ty0 - 0.016 * h_fig))
        cy1_fast = int(round(ty0 + 0.504 * h_fig))
        cx0_fast = int(round(txm - 0.052 * h_fig))
        for src_im, fast_dst in [
            (rf_align, cfg["fastRefFrontCrop"]),
            (cor_f_full, cfg["fastCorFrontCrop"]),
            (rb_align, cfg["fastRefBackCrop"]),
            (cor_b_full, cfg["fastCorBackCrop"]),
        ]:
            save_uniform_crop(src_im, fast_dst, cy0_fast, cy1_fast, cx0_fast, tw_f, th_f)

        # Sign-off Board 4 crops: Head-to-Waistband (`cy0..cy1`) for BOTH:
        #  a) Side-by-side 1:1 half-span (`midline-to-wrist x head-to-waistband`, 680x600, 0 intervening columns)
        #  b) Stacked 1:1 wide (`wrist-to-wrist x head-to-waistband`, 1584x720, 2D Reference directly above Pose Corrective)
        if "halfRefFrontOut" in cfg:
            cy0_b4 = int(round(ty0 - 0.018 * h_fig))
            cy1_b4 = int(round(ty0 + 0.502 * h_fig))
            half_w, half_h = 680, 600
            cx0_half = int(round(txm - 0.055 * h_fig))
            for src_im, half_dst in [
                (rf_align, cfg["halfRefFrontOut"]),
                (cor_f_full, cfg["halfCorFrontOut"]),
                (rb_align, cfg["halfRefBackOut"]),
                (cor_b_full, cfg["halfCorBackOut"]),
            ]:
                save_uniform_crop(src_im, half_dst, cy0_b4, cy1_b4, cx0_half, half_w, half_h)

            wide_w, wide_h = 1584, 768
            box_w_wide = int(round((cy1_b4 - cy0_b4) * (wide_w / wide_h)))
            cx0_wide = int(round(txm - 0.5 * box_w_wide))
            for src_im, wide_dst in [
                (rf_align, cfg["wideRefFrontOut"]),
                (cor_f_full, cfg["wideCorFrontOut"]),
                (rb_align, cfg["wideRefBackOut"]),
                (cor_b_full, cfg["wideCorBackOut"]),
            ]:
                save_uniform_crop(src_im, wide_dst, cy0_b4, cy1_b4, cx0_wide, wide_w, wide_h)

    # 0. Pre-build any 1:1 arms-hidden pelvis silhouette/contour overlays (`ORANGE=Donor | CYAN=Fit + Briefs`)
    for ov in cfg.get("pelvisOverlays", []):
        arr_d = np.asarray(Image.open(ov["donor"]).convert("RGB"), dtype=np.float32)
        arr_f = np.asarray(Image.open(ov["fit"]).convert("RGB"), dtype=np.float32)
        bg_ov = arr_d[4, 4]
        fg_d = np.linalg.norm(arr_d - bg_ov[None, None, :], axis=2) > 12.0
        fg_f = np.linalg.norm(arr_f - bg_ov[None, None, :], axis=2) > 12.0
        lum_d = arr_d.mean(axis=2)
        lum_f = arr_f.mean(axis=2)
        out_ov = np.zeros_like(arr_d)
        out_ov[:, :] = [28, 30, 35]
        both_ov = fg_d & fg_f
        only_d_ov = fg_d & (~fg_f)
        only_f_ov = fg_f & (~fg_d)
        avg_l_ov = 0.5 * (lum_d + lum_f)
        out_ov[both_ov, 0] = np.clip(avg_l_ov[both_ov] + 0.7 * (lum_d[both_ov] - lum_f[both_ov]), 0, 255)
        out_ov[both_ov, 1] = np.clip(avg_l_ov[both_ov], 0, 255)
        out_ov[both_ov, 2] = np.clip(avg_l_ov[both_ov] + 0.7 * (lum_f[both_ov] - lum_d[both_ov]), 0, 255)
        out_ov[only_d_ov] = [255, 110, 30]
        out_ov[only_f_ov] = [30, 220, 255]
        # Crisp 1-px outer boundary traces so even sub-millimeter profile contour alignment reads immediately:
        ed_d = fg_d & (
            (~np.roll(fg_d, 1, axis=0))
            | (~np.roll(fg_d, -1, axis=0))
            | (~np.roll(fg_d, 1, axis=1))
            | (~np.roll(fg_d, -1, axis=1))
        )
        ed_f = fg_f & (
            (~np.roll(fg_f, 1, axis=0))
            | (~np.roll(fg_f, -1, axis=0))
            | (~np.roll(fg_f, 1, axis=1))
            | (~np.roll(fg_f, -1, axis=1))
        )
        ed_both = ed_d & ed_f
        out_ov[ed_d & (~ed_both)] = [255, 155, 50]
        out_ov[ed_f & (~ed_both)] = [40, 235, 255]
        out_ov[ed_both] = [245, 250, 245]
        Image.fromarray(out_ov.astype(np.uint8)).save(ov["out"], format="PNG")

    # 1. Save the consolidated 1:1 inner-iteration close-up sheet (unless pelvisPreviewOnly)
    if cfg.get("pelvisPreviewOnly"):
        for b in cfg.get("extraBoards", []):
            make_grid_board(b["rows"], b["tw"], b["th"], b["out"], title=b.get("title"))
    else:
        make_grid_board(
            cfg["fastRows"],
            cfg["fastTileW"],
            cfg["fastTileH"],
            cfg["fastSheetOut"],
            title=cfg["fastTitle"],
        )

    # 2. Optional full 11-board sign-off suite
    if cfg.get("fullAudit"):
        for b in cfg["extraBoards"]:
            make_grid_board(b["rows"], b["tw"], b["th"], b["out"], title=b.get("title"))

        if "tposeRefBoard" in cfg:
            tb = cfg["tposeRefBoard"]
            if tb.get("hasRef"):
                bw_t = 3216
                top_pad_t = 36
                row_h_t = 600 + 30
                stack_y0 = top_pad_t + 2 * row_h_t + 10
                wide_w, wide_h = 1584, 768
                bh_t = stack_y0 + 2 * (wide_h + 26) + 14
                tboard = Image.new("RGB", (bw_t, bh_t), (20, 22, 26))
                tdraw = ImageDraw.Draw(tboard)
                tdraw.text((14, 10), tb["title"], fill=(255, 225, 150))
                for ri_t, r_tiles in enumerate(tb["topRows"]):
                    oy_t = top_pad_t + ri_t * row_h_t
                    ox_t = 12
                    for lbl_t, p_t, tw_t, th_t in r_tiles:
                        tdraw.text((ox_t + 4, oy_t + 4), lbl_t, fill=(230, 236, 244))
                        with Image.open(p_t) as im_t:
                            im_rgb = im_t.convert("RGB")
                            if im_rgb.size != (tw_t, th_t):
                                im_rgb = im_rgb.resize((tw_t, th_t), Image.Resampling.LANCZOS)
                            tboard.paste(im_rgb, (ox_t, oy_t + 22))
                        ox_t += tw_t + 8
                for si_t, stack_pair in enumerate(tb["wideStacks"]):
                    ox_s = 12 + si_t * (wide_w + 20)
                    for pi_t, (lbl_w, p_w) in enumerate(stack_pair):
                        oy_s = stack_y0 + pi_t * (wide_h + 26)
                        tdraw.text((ox_s + 4, oy_s + 4), lbl_w, fill=(255, 232, 175) if pi_t == 0 else (230, 236, 244))
                        with Image.open(p_w) as im_w:
                            im_w_rgb = im_w.convert("RGB")
                            if im_w_rgb.size != (wide_w, wide_h):
                                im_w_rgb = im_w_rgb.resize((wide_w, wide_h), Image.Resampling.LANCZOS)
                            tboard.paste(im_w_rgb, (ox_s, oy_s + 22))
                tboard.save(tb["out"], format="PNG")
            else:
                make_grid_board(tb["fallbackRows"], 600, 600, tb["out"], title=tb["title"])

        # Silhouette overlay detail board (clay-detail-audit.png)
        spec_main = cfg["main6AngleRows"]
        upper_tiles = cfg["detailUpperTiles"]
        lower_tiles = cfg["detailLowerTiles"]
        tw, th = 360, 620
        cw, ch = 360, 440
        det_h = (th + 38) + 2 * (ch + 38) + 20
        det = Image.new("RGB", (6 * (tw + 8) + 16, det_h), (22, 24, 28))
        dd = ImageDraw.Draw(det)
        dd.text((14, 14), "Silhouette Overlay (Grey/White = Exact Match | ORANGE = Uncaptured Donor | CYAN = Excess Fit)", fill=(255, 220, 140))
        bg_ref = None
        for c_i in range(6):
            a_name, don_p = spec_main[0][1][c_i]
            _, fit_p = spec_main[1][1][c_i]
            arr_d = np.asarray(Image.open(don_p).convert("RGB"), dtype=np.float32)
            arr_f = np.asarray(Image.open(fit_p).convert("RGB"), dtype=np.float32)
            if bg_ref is None:
                bg_ref = arr_d[2, 2]
            fg_d = np.linalg.norm(arr_d - bg_ref[None, None, :], axis=2) > 12.0
            fg_f = np.linalg.norm(arr_f - bg_ref[None, None, :], axis=2) > 12.0
            lum_d = arr_d.mean(axis=2)
            lum_f = arr_f.mean(axis=2)
            out = np.zeros_like(arr_d)
            out[:, :] = [28, 30, 35]
            both = fg_d & fg_f
            only_d = fg_d & (~fg_f)
            only_f = fg_f & (~fg_d)
            avg_l = 0.5 * (lum_d + lum_f)
            out[both, 0] = np.clip(avg_l[both] + 0.6 * (lum_d[both] - lum_f[both]), 0, 255)
            out[both, 1] = np.clip(avg_l[both], 0, 255)
            out[both, 2] = np.clip(avg_l[both] + 0.6 * (lum_f[both] - lum_d[both]), 0, 255)
            out[only_d] = [255, 110, 30]
            out[only_f] = [30, 220, 255]
            ox = 12 + c_i * (tw + 8)
            dd.text((ox + tw - 98, 14), f"[{a_name}]", fill=(175, 195, 225))
            det.paste(Image.fromarray(out.astype(np.uint8)), (ox, 34))
        oy1 = 10 + (th + 38)
        for c_i, (lbl, p_str) in enumerate(upper_tiles):
            ox = 12 + c_i * (cw + 8)
            dd.text((ox + 4, oy1 + 6), lbl, fill=(220, 235, 250))
            with Image.open(p_str) as im:
                det.paste(im.convert("RGB"), (ox, oy1 + 26))
        oy2 = oy1 + (ch + 38)
        for c_i, (lbl, p_str) in enumerate(lower_tiles):
            ox = 12 + c_i * (cw + 8)
            dd.text((ox + 4, oy2 + 6), lbl, fill=(220, 235, 250))
            with Image.open(p_str) as im:
                det.paste(im.convert("RGB"), (ox, oy2 + 26))
        det.save(cfg["detailAuditOut"], format="PNG")


def render_iteration_and_signoff_boards(
    out_dir: Path,
    coord_id: str,
    donor_pts: np.ndarray,
    donor_tri: np.ndarray,
    posed_lod0_head_pts: np.ndarray,
    posed_lod0_head_tri: np.ndarray,
    rest_lod0_head_pts: np.ndarray,
    rest_lod0_head_tri: np.ndarray,
    rest_lod1_head_pts: np.ndarray,
    rest_lod1_head_tri: np.ndarray,
    tpose_lbs_pts: np.ndarray,
    tpose_cor_pts: np.ndarray,
    raised68_lbs_pts: np.ndarray,
    raised68_cor_pts: np.ndarray,
    lod1_head_tri: np.ndarray,
    pose_info: dict,
    ref_raised_jpg: Path | None = None,
    full_audit: bool = False,
    posed_lod1_head_pts: np.ndarray | None = None,
    posed_lod1_head_tri: np.ndarray | None = None,
    posed_lod1_bare_pts: np.ndarray | None = None,
    posed_lod1_bare_tri: np.ndarray | None = None,
    rest_lod1_bare_pts: np.ndarray | None = None,
    rest_lod1_bare_tri: np.ndarray | None = None,
    pelvis_preview_only: bool = False,
) -> dict[str, str]:
    """Render ONE consolidated 1:1 close-up comparison sheet (`fast-1to1-iteration-sheet.png`) featuring
    welded-normal Runtime `LOD1` + `headSkin` + fitted `linenBriefs` as the primary visual gate alongside
    an explicit unmasked bare-pelvis saddle check, plus the full 11-board sign-off suite when `full_audit=True`
    (or `signoff-08-pelvis-groin-glutes-zoom.png` ONLY when `pelvis_preview_only=True`).
    """
    tmp_dir = out_dir / "_tmp_audit_render"
    tmp_dir.mkdir(parents=True, exist_ok=True)

    p1_pts = posed_lod1_head_pts if posed_lod1_head_pts is not None else posed_lod0_head_pts
    p1_tri = posed_lod1_head_tri if posed_lod1_head_tri is not None else posed_lod0_head_tri
    p1_bare_pts = posed_lod1_bare_pts if posed_lod1_bare_pts is not None else p1_pts
    p1_bare_tri = posed_lod1_bare_tri if posed_lod1_bare_tri is not None else p1_tri
    r1_bare_pts = rest_lod1_bare_pts if rest_lod1_bare_pts is not None else rest_lod1_head_pts
    r1_bare_tri = rest_lod1_bare_tri if rest_lod1_bare_tri is not None else rest_lod1_head_tri

    n_garment_l1 = max(0, len(rest_lod1_head_pts) - len(r1_bare_pts))
    g_start_l1 = len(r1_bare_pts) if n_garment_l1 > 0 else len(rest_lod1_head_pts)
    g_start_p1 = len(p1_bare_pts) if len(p1_pts) > len(p1_bare_pts) else len(p1_pts)
    g_start_l0 = (len(posed_lod0_head_pts) - n_garment_l1) if n_garment_l1 > 0 else len(posed_lod0_head_pts)

    donor_noarm_spec = _strip_arms_for_pelvis_profile(donor_pts, donor_tri, None)
    posed1_noarm_spec = _strip_arms_for_pelvis_profile(p1_pts, p1_tri, g_start_p1)

    def _render_pelvis_noarm_overlay_row(scn_u, objs_u, cam_u, piv_u) -> tuple[tuple[str, list[tuple[str, str]]], list[dict[str, str]]]:
        p_dn_prof = tmp_dir / "pg_noarm_donor_prof.png"
        p_ft_prof = tmp_dir / "pg_noarm_posed1_prof.png"
        p_dn_frnt = tmp_dir / "pg_noarm_donor_frnt.png"
        p_ft_frnt = tmp_dir / "pg_noarm_posed1_frnt.png"
        p_dn_tilt = tmp_dir / "pg_noarm_donor_tilt.png"
        p_ft_tilt = tmp_dir / "pg_noarm_posed1_tilt.png"
        _render_tile(scn_u, objs_u, cam_u, piv_u, "donor_noarm", p_dn_prof, 400, 440, (0.0, 0.0, 1.00), 0.58, -90.0, 0.0)
        _render_tile(scn_u, objs_u, cam_u, piv_u, "posed1_noarm", p_ft_prof, 400, 440, (0.0, 0.0, 1.00), 0.58, -90.0, 0.0)
        _render_tile(scn_u, objs_u, cam_u, piv_u, "donor_noarm", p_dn_frnt, 400, 440, (0.0, 0.0, 1.00), 0.58, 0.0, 0.0)
        _render_tile(scn_u, objs_u, cam_u, piv_u, "posed1_noarm", p_ft_frnt, 400, 440, (0.0, 0.0, 1.00), 0.58, 0.0, 0.0)
        _render_tile(scn_u, objs_u, cam_u, piv_u, "donor_noarm", p_dn_tilt, 400, 440, (0.0, 0.0, 1.00), 0.58, 0.0, -22.0)
        _render_tile(scn_u, objs_u, cam_u, piv_u, "posed1_noarm", p_ft_tilt, 400, 440, (0.0, 0.0, 1.00), 0.58, 0.0, -22.0)
        p_ov_prof = tmp_dir / "pg_ov_prof.png"
        p_ov_frnt = tmp_dir / "pg_ov_frnt.png"
        p_ov_tilt = tmp_dir / "pg_ov_tilt.png"
        ov_jobs = [
            {"donor": str(p_dn_prof), "fit": str(p_ft_prof), "out": str(p_ov_prof)},
            {"donor": str(p_dn_frnt), "fit": str(p_ft_frnt), "out": str(p_ov_frnt)},
            {"donor": str(p_dn_tilt), "fit": str(p_ft_tilt), "out": str(p_ov_tilt)},
        ]
        ov_row = (
            "1:1 Arms-Hidden Contour Overlay",
            [
                ("Donor (Arms Hidden) · Right Profile", str(p_dn_prof)),
                ("Fit + Briefs (Arms Hidden) · Right Profile", str(p_ft_prof)),
                ("Overlay · Right Profile (ORANGE=Donor, CYAN=Fit)", str(p_ov_prof)),
                ("Overlay · Front Crotch Arch (Arms Hidden)", str(p_ov_frnt)),
                ("Overlay · Sub-Apron Tilt (Arms Hidden)", str(p_ov_tilt)),
            ],
        )
        return ov_row, ov_jobs

    if pelvis_preview_only:
        mesh_specs_p = {
            "donor": (donor_pts, donor_tri, None),
            "posed1": (p1_pts, p1_tri, g_start_p1),
            "rest1": (rest_lod1_head_pts, rest_lod1_head_tri, g_start_l1),
            "posed1_bare": (p1_bare_pts, p1_bare_tri, None),
            "rest1_bare": (r1_bare_pts, r1_bare_tri, None),
            "donor_noarm": donor_noarm_spec,
            "posed1_noarm": posed1_noarm_spec,
        }
        scene_p, objs_p, cam_data_p, pivot_p = _build_single_workbench_scene(mesh_specs_p)
        pg_rows_p = []
        for mk, mlbl in [
            ("donor", "Donor (Sculpted Briefs)"),
            ("posed1", "Fit Posed LOD1 + linenBriefs"),
            ("rest1", "Fit Rest LOD1 + linenBriefs"),
            ("posed1_bare", "Unmasked Bare Saddle (LOD1 Posed)"),
            ("rest1_bare", "Unmasked Bare Saddle (LOD1 Rest)"),
        ]:
            rtiles = []
            for anm, deg, ptch in [("Front", 0.0, 0.0), ("3/4 Front", -35.0, 0.0), ("Sub-Apron Tilt", 0.0, -22.0), ("Profile", -90.0, 0.0), ("Back Glutes", 180.0, 0.0)]:
                p = tmp_dir / f"pg_{mk}_{int(deg)}_{int(ptch)}.png"
                _render_tile(scene_p, objs_p, cam_data_p, pivot_p, mk, p, 400, 440, (0.0, 0.0, 1.00), 0.58, deg, ptch)
                rtiles.append((f"{mlbl} · {anm}", str(p)))
            pg_rows_p.append((mlbl, rtiles))
        ov_row_p, ov_jobs_p = _render_pelvis_noarm_overlay_row(scene_p, objs_p, cam_data_p, pivot_p)
        pg_rows_p.append(ov_row_p)
        b8_p = out_dir / "signoff-08-pelvis-groin-glutes-zoom.png"
        cfg_p = {
            "pelvisPreviewOnly": True,
            "fullAudit": False,
            "pelvisOverlays": ov_jobs_p,
            "extraBoards": [
                {
                    "title": f"{coord_id} · Pelvis, linenBriefs Fit, Bare-Saddle & 1:1 Arms-Hidden Profile Contour Overlay",
                    "tw": 400,
                    "th": 440,
                    "out": str(b8_p),
                    "rows": pg_rows_p,
                }
            ],
        }
        cfg_path_p = tmp_dir / "stitch_cfg.json"
        cfg_path_p.write_text(json.dumps(cfg_p))
        subprocess.run([PYTHON_PIL, "-c", _STITCH_HELPER_CODE, str(cfg_path_p)], check=True)
        shutil.rmtree(tmp_dir, ignore_errors=True)
        return {"pelvisGroinGlutesZoom": str(b8_p)}

    mesh_specs = {
        "donor": (donor_pts, donor_tri, None),
        "posed1": (p1_pts, p1_tri, g_start_p1),
        "posed0": (posed_lod0_head_pts, posed_lod0_head_tri, g_start_l0),
        "posed1_bare": (p1_bare_pts, p1_bare_tri, None),
        "rest0": (rest_lod0_head_pts, rest_lod0_head_tri, g_start_l0),
        "rest1": (rest_lod1_head_pts, rest_lod1_head_tri, g_start_l1),
        "rest1_bare": (r1_bare_pts, r1_bare_tri, None),
        "donor_noarm": donor_noarm_spec,
        "posed1_noarm": posed1_noarm_spec,
        "tp_lbs": (tpose_lbs_pts, lod1_head_tri, g_start_l1),
        "tp_cor": (tpose_cor_pts, lod1_head_tri, g_start_l1),
        "ra68_lbs": (raised68_lbs_pts, lod1_head_tri, g_start_l1),
        "ra68_cor": (raised68_cor_pts, lod1_head_tri, g_start_l1),
    }
    scene, objs, cam_data, pivot = _build_single_workbench_scene(mesh_specs)

    # Compute exact 1:1 hand centers on posed (+X) and rest (+X) so hand/finger crops match 1:1!
    wr_p = np.array(pose_info["sides"]["plusX"]["arm"]["posed"][2], dtype=np.float64)
    ha_p = np.array(pose_info["sides"]["plusX"]["arm"]["posed"][3], dtype=np.float64)
    hand_ctr_posed = tuple((0.35 * wr_p + 0.65 * ha_p + np.array([0.0, 0.0, -0.025])).tolist())

    wr_r = np.array(pose_info["sides"]["plusX"]["arm"]["rest"][2], dtype=np.float64)
    ha_r = np.array(pose_info["sides"]["plusX"]["arm"]["rest"][3], dtype=np.float64)
    hand_ctr_rest = tuple((0.20 * wr_r + 0.80 * ha_r + np.array([0.015, -0.015, -0.025])).tolist())

    fw, fh = 380, 430
    fast_jobs = [
        # Row 0: Head, Canonical Face / Fullness, Neck, Clavicles & Upper Traps (Runtime LOD1 vs Donor 1:1)
        ("f_r0_0", "donor", fw, fh, (0.0, 0.0, 1.81), 0.44, 0.0, 0.0),
        ("f_r0_1", "posed1", fw, fh, (0.0, 0.0, 1.81), 0.44, 0.0, 0.0),
        ("f_r0_2", "donor", fw, fh, (0.0, 0.0, 1.81), 0.44, -38.0, 0.0),
        ("f_r0_3", "posed1", fw, fh, (0.0, 0.0, 1.81), 0.44, -38.0, 0.0),
        ("f_r0_4", "donor", fw, fh, (0.0, 0.0, 1.81), 0.44, -90.0, 0.0),
        ("f_r0_5", "posed1", fw, fh, (0.0, 0.0, 1.81), 0.44, -90.0, 0.0),
        # Row 1: Pecs, Abs, Deltoids, Armpits & Back Relief (Runtime LOD1 vs Donor 1:1)
        ("f_r1_0", "donor", fw, fh, (0.0, 0.0, 1.44), 0.68, 0.0, 0.0),
        ("f_r1_1", "posed1", fw, fh, (0.0, 0.0, 1.44), 0.68, 0.0, 0.0),
        ("f_r1_2", "rest1", fw, fh, (0.0, 0.0, 1.45), 0.68, -35.0, 0.0),
        ("f_r1_3", "posed1", fw, fh, (0.0, 0.0, 1.45), 0.68, -90.0, 0.0),
        ("f_r1_4", "donor", fw, fh, (0.0, 0.0, 1.46), 0.68, 180.0, 0.0),
        ("f_r1_5", "posed1", fw, fh, (0.0, 0.0, 1.46), 0.68, 180.0, 0.0),
        # Row 2: Wrists/Hands, Covered Pelvis/Glutes (`linenBriefs` ON) + Unmasked Bare-Saddle Check (Runtime LOD1)
        ("f_r2_0", "donor", fw, fh, hand_ctr_posed, 0.30, -65.0, 0.0),
        ("f_r2_1", "posed1", fw, fh, hand_ctr_posed, 0.30, -65.0, 0.0),
        ("f_r2_2", "posed1", fw, fh, (0.0, 0.0, 1.00), 0.56, 0.0, 0.0),
        ("f_r2_3", "posed1_bare", fw, fh, (0.0, 0.0, 1.00), 0.56, -20.0, -14.0),
        ("f_r2_4", "posed1", fw, fh, (0.0, 0.0, 1.01), 0.64, -90.0, 0.0),
        ("f_r2_5", "posed1_bare", fw, fh, (0.0, 0.0, 0.99), 0.56, 180.0, 0.0),
        # Row 3: Raised Arms T-pose (0.705) & Game +68 deg (1.000) on Runtime LOD1 + linenBriefs
        ("f_r3_4", "ra68_cor", fw, fh, (0.0, 0.0, 1.56), 1.18, 0.0, 0.0),
        ("f_r3_5", "ra68_cor", fw, fh, (0.0, 0.0, 1.56), 1.18, 180.0, 0.0),
    ]
    for tid, mkey, rx, ry, pxyz, osc, yaw, pitch in fast_jobs:
        _render_tile(scene, objs, cam_data, pivot, mkey, tmp_dir / f"{tid}.png", rx, ry, pxyz, osc, yaw, pitch)

    has_ref = ref_raised_jpg is not None and ref_raised_jpg.is_file()
    if has_ref:
        _render_tile(scene, objs, cam_data, pivot, "tp_cor", tmp_dir / "tp_cor_f_full.png", 1600, 1600, (0.0, 0.0, 1.03), 2.28, 0.0)
        _render_tile(scene, objs, cam_data, pivot, "tp_cor", tmp_dir / "tp_cor_b_full.png", 1600, 1600, (0.0, 0.0, 1.03), 2.28, 180.0)
        r3_0_p = str(tmp_dir / "fast_ref_f.png")
        r3_1_p = str(tmp_dir / "fast_cor_f.png")
        r3_2_p = str(tmp_dir / "fast_ref_b.png")
        r3_3_p = str(tmp_dir / "fast_cor_b.png")
    else:
        _render_tile(scene, objs, cam_data, pivot, "tp_lbs", tmp_dir / "f_r3_0.png", fw, fh, (0.0, 0.0, 1.52), 1.24, 0.0)
        _render_tile(scene, objs, cam_data, pivot, "tp_cor", tmp_dir / "f_r3_1.png", fw, fh, (0.0, 0.0, 1.52), 1.24, 0.0)
        _render_tile(scene, objs, cam_data, pivot, "tp_lbs", tmp_dir / "f_r3_2.png", fw, fh, (0.0, 0.0, 1.52), 1.24, 180.0)
        _render_tile(scene, objs, cam_data, pivot, "tp_cor", tmp_dir / "f_r3_3.png", fw, fh, (0.0, 0.0, 1.52), 1.24, 180.0)
        r3_0_p = str(tmp_dir / "f_r3_0.png")
        r3_1_p = str(tmp_dir / "f_r3_1.png")
        r3_2_p = str(tmp_dir / "f_r3_2.png")
        r3_3_p = str(tmp_dir / "f_r3_3.png")

    fast_sheet_out = out_dir / "fast-1to1-iteration-sheet.png"
    cfg: dict = {
        "fastTitle": f"{coord_id} · Runtime LOD1 + linenBriefs Primary 1:1 Gate (+ Bare-Saddle & Bare-Glute Diagnostics)",
        "fastTileW": fw,
        "fastTileH": fh,
        "fastSheetOut": str(fast_sheet_out),
        "fastRows": [
            (
                "Row 1: Head & Neck",
                [
                    ("Donor · Head/Neck Front", str(tmp_dir / "f_r0_0.png")),
                    ("Fit LOD1 Posed · Head/Neck Front", str(tmp_dir / "f_r0_1.png")),
                    ("Donor · Face/Neck 3/4", str(tmp_dir / "f_r0_2.png")),
                    ("Fit LOD1 Posed · Face/Neck 3/4", str(tmp_dir / "f_r0_3.png")),
                    ("Donor · Neck/Nape Profile", str(tmp_dir / "f_r0_4.png")),
                    ("Fit LOD1 Posed · Neck/Nape Profile", str(tmp_dir / "f_r0_5.png")),
                ],
            ),
            (
                "Row 2: Torso & Armpits (Runtime LOD1)",
                [
                    ("Donor · Pecs/Abs/Delts Front", str(tmp_dir / "f_r1_0.png")),
                    ("Fit LOD1 Posed · Pecs/Abs/Delts", str(tmp_dir / "f_r1_1.png")),
                    ("Fit LOD1 Rest · Delts/Pecs/Abs 3/4", str(tmp_dir / "f_r1_2.png")),
                    ("Fit LOD1 Posed · Delt/Tricep Profile", str(tmp_dir / "f_r1_3.png")),
                    ("Donor · Back & Rear Armpit", str(tmp_dir / "f_r1_4.png")),
                    ("Fit LOD1 Posed · Back & Rear Armpit", str(tmp_dir / "f_r1_5.png")),
                ],
            ),
            (
                "Row 3: Hands, Covered Pelvis & Bare Saddle",
                [
                    ("Donor · Wrist/Palm/Hand", str(tmp_dir / "f_r2_0.png")),
                    ("Fit LOD1 Posed · Wrist/5-Fingers", str(tmp_dir / "f_r2_1.png")),
                    ("Fit LOD1+Briefs · Pelvis Front", str(tmp_dir / "f_r2_2.png")),
                    ("Bare Saddle Check · LOD1 3/4 Tilt", str(tmp_dir / "f_r2_3.png")),
                    ("Fit LOD1+Briefs · Glute Profile", str(tmp_dir / "f_r2_4.png")),
                    ("Bare Glute/Cleft Check · LOD1 Back", str(tmp_dir / "f_r2_5.png")),
                ],
            ),
            (
                "Row 4: Raised Arms (Runtime LOD1 + Briefs)",
                [
                    ("Ref Target · T-Pose Front" if has_ref else "Rigid LBS · T-Pose Front", r3_0_p),
                    ("Fit LOD1+Briefs · T-Pose Front", r3_1_p),
                    ("Ref Target · T-Pose Back" if has_ref else "Rigid LBS · T-Pose Back", r3_2_p),
                    ("Fit LOD1+Briefs · T-Pose Back", r3_3_p),
                    ("Fit LOD1+Briefs · +68° Front", str(tmp_dir / "f_r3_4.png")),
                    ("Fit LOD1+Briefs · +68° Back", str(tmp_dir / "f_r3_5.png")),
                ],
            ),
        ],
        "fullAudit": full_audit,
    }
    if has_ref:
        cfg.update(
            {
                "refRaisedJpg": str(ref_raised_jpg),
                "tposeCorFrontFull": str(tmp_dir / "tp_cor_f_full.png"),
                "tposeCorBackFull": str(tmp_dir / "tp_cor_b_full.png"),
                "refFrontAlignedOut": str(tmp_dir / "ref_f_aligned.png"),
                "refBackAlignedOut": str(tmp_dir / "ref_b_aligned.png"),
                "fastRefFrontCrop": r3_0_p,
                "fastCorFrontCrop": r3_1_p,
                "fastRefBackCrop": r3_2_p,
                "fastCorBackCrop": r3_3_p,
                "halfRefFrontOut": str(tmp_dir / "half_ref_f_1to1.png"),
                "halfCorFrontOut": str(tmp_dir / "half_cor_f_1to1.png"),
                "halfRefBackOut": str(tmp_dir / "half_ref_b_1to1.png"),
                "halfCorBackOut": str(tmp_dir / "half_cor_b_1to1.png"),
                "wideRefFrontOut": str(tmp_dir / "wide_ref_f_1to1.png"),
                "wideCorFrontOut": str(tmp_dir / "wide_cor_f_1to1.png"),
                "wideRefBackOut": str(tmp_dir / "wide_ref_b_1to1.png"),
                "wideCorBackOut": str(tmp_dir / "wide_cor_b_1to1.png"),
            }
        )

    outputs = {"fastIterationSheet": str(fast_sheet_out)}

    if full_audit:
        angles = [
            ("front", 0.0),
            ("quarter", -35.0),
            ("rightProfile", -90.0),
            ("leftProfile", 90.0),
            ("rearQuarter", -145.0),
            ("back", 180.0),
        ]
        main_rows_cfg = []
        for r_i, (r_lbl, mkey) in enumerate(
            [
                (f"{coord_id} · Raw unmodified Meshy donor (rigidly aligned)", "donor"),
                (f"{coord_id} · Fitted runtime LOD1 + headSkin + linenBriefs posed to donor", "posed1"),
                (f"{coord_id} · Fitted authoring LOD0 + headSkin + linenBriefs posed to donor", "posed0"),
                (f"{coord_id} · Fitted runtime LOD1 + headSkin + linenBriefs in rest A-pose", "rest1"),
            ]
        ):
            t_list = []
            for a_name, deg in angles:
                p = tmp_dir / f"m{r_i}_{a_name}.png"
                _render_tile(scene, objs, cam_data, pivot, mkey, p, 360, 620, (0.0, 0.0, 1.015), 2.16, deg)
                t_list.append((f"{a_name}" if r_i == 0 else "", str(p)))
            main_rows_cfg.append((r_lbl, t_list))

        cw, ch = 360, 440
        up_specs = [
            ("Donor · Head/Neck/Chest Front", "donor", (0.0, 0.0, 1.66), 0.78, 0.0),
            ("Fit LOD1 Posed · Head/Neck/Chest Front", "posed1", (0.0, 0.0, 1.66), 0.78, 0.0),
            ("Donor · Head/Neck/Chest Profile", "donor", (0.0, 0.0, 1.66), 0.78, -90.0),
            ("Fit LOD1 Posed · Head/Neck/Chest Profile", "posed1", (0.0, 0.0, 1.66), 0.78, -90.0),
            ("Fit LOD1 Rest · Collar/Chest/Underarm 3/4", "rest1", (0.0, 0.0, 1.60), 0.84, -35.0),
            ("Fit Runtime LOD1 · Raised Arms (+68°)", "ra68_cor", (0.0, 0.0, 1.66), 1.05, -25.0),
        ]
        lo_specs = [
            ("Donor · Abs/Pelvis/Wrist Front", "donor", (0.0, 0.0, 1.02), 1.05, 0.0),
            ("Fit LOD1+Briefs Posed · Abs/Pelvis/Wrist", "posed1", (0.0, 0.0, 1.02), 1.05, 0.0),
            ("Donor · Torso/Glute/Thigh Profile", "donor", (0.0, 0.0, 1.02), 1.05, -90.0),
            ("Fit LOD1+Briefs Posed · Glute/Thigh Prof", "posed1", (0.0, 0.0, 1.02), 1.05, -90.0),
            ("Donor · Glutes/Calves/Ankles Back", "donor", (0.0, 0.0, 0.62), 1.22, 180.0),
            ("Fit LOD1+Briefs Posed · Glutes/Calves", "posed1", (0.0, 0.0, 0.62), 1.22, 180.0),
        ]
        up_tiles, lo_tiles = [], []
        for idx, (lbl, mk, pxyz, osc, deg) in enumerate(up_specs):
            p = tmp_dir / f"det_u_{idx}.png"
            _render_tile(scene, objs, cam_data, pivot, mk, p, cw, ch, pxyz, osc, deg)
            up_tiles.append((lbl, str(p)))
        for idx, (lbl, mk, pxyz, osc, deg) in enumerate(lo_specs):
            p = tmp_dir / f"det_l_{idx}.png"
            _render_tile(scene, objs, cam_data, pivot, mk, p, cw, ch, pxyz, osc, deg)
            lo_tiles.append((lbl, str(p)))

        extra_boards = [
            {
                "title": f"{coord_id} · Full-Body 6-Angle Clay Comparison (Runtime LOD1 + linenBriefs Primary Gate)",
                "tw": 360,
                "th": 620,
                "out": str(out_dir / "clay-6angle-comparison.png"),
                "rows": main_rows_cfg,
            }
        ]
        outputs["clay6Angle"] = str(out_dir / "clay-6angle-comparison.png")
        outputs["clayDetailAudit"] = str(out_dir / "clay-detail-audit.png")

        # Board 4: T-Pose Ref Comparison (Runtime LOD1 + linenBriefs) — Full-Body Raw LBS diagnostic + directly adjacent Full-Body,
        # side-by-side 1:1 half-span (`midline-to-wrist x head-to-waistband`, 0 intervening columns), AND stacked 1:1 wide
        # (`wrist-to-wrist x head-to-waistband`, 2D Reference directly above Pose Corrective):
        _render_tile(scene, objs, cam_data, pivot, "tp_lbs", tmp_dir / "tp_lbs_f_full.png", 1600, 1600, (0.0, 0.0, 1.03), 2.28, 0.0)
        _render_tile(scene, objs, cam_data, pivot, "tp_lbs", tmp_dir / "tp_lbs_b_full.png", 1600, 1600, (0.0, 0.0, 1.03), 2.28, 180.0)
        if not has_ref:
            _render_tile(scene, objs, cam_data, pivot, "tp_cor", tmp_dir / "tp_cor_f_full.png", 1600, 1600, (0.0, 0.0, 1.03), 2.28, 0.0)
            _render_tile(scene, objs, cam_data, pivot, "tp_cor", tmp_dir / "tp_cor_b_full.png", 1600, 1600, (0.0, 0.0, 1.03), 2.28, 180.0)
        cfg["tposeRefBoard"] = {
            "title": f"{coord_id} · Horizontal T-Pose (0.705) Anatomical Pose Calibration (Runtime LOD1 + linenBriefs)",
            "out": str(out_dir / "tpose-raised-arms-ref-comparison.png"),
            "hasRef": has_ref,
            "topRows": (
                [
                    [
                        ("Rigid LBS Diagnostic · Full-Body (Front)", str(tmp_dir / "tp_lbs_f_full.png"), 600, 600),
                        ("2D Reference · Full-Body (Front)", str(tmp_dir / "ref_f_aligned.png"), 600, 600),
                        ("Pose Corrective · Full-Body (Front)", str(tmp_dir / "tp_cor_f_full.png"), 600, 600),
                        ("2D Reference · 1:1 Half-Span Midline-to-Wrist (Front)", str(tmp_dir / "half_ref_f_1to1.png"), 680, 600),
                        ("Pose Corrective · 1:1 Half-Span Midline-to-Wrist (Front)", str(tmp_dir / "half_cor_f_1to1.png"), 680, 600),
                    ],
                    [
                        ("Rigid LBS Diagnostic · Full-Body (Back)", str(tmp_dir / "tp_lbs_b_full.png"), 600, 600),
                        ("2D Reference · Full-Body (Back)", str(tmp_dir / "ref_b_aligned.png"), 600, 600),
                        ("Pose Corrective · Full-Body (Back)", str(tmp_dir / "tp_cor_b_full.png"), 600, 600),
                        ("2D Reference · 1:1 Half-Span Midline-to-Wrist (Back)", str(tmp_dir / "half_ref_b_1to1.png"), 680, 600),
                        ("Pose Corrective · 1:1 Half-Span Midline-to-Wrist (Back)", str(tmp_dir / "half_cor_b_1to1.png"), 680, 600),
                    ],
                ]
                if has_ref
                else []
            ),
            "wideStacks": (
                [
                    [
                        ("2D Reference · 1:1 Wide Wrist-to-Wrist × Head-to-Waistband (Front)", str(tmp_dir / "wide_ref_f_1to1.png")),
                        ("Pose Corrective · 1:1 Wide Wrist-to-Wrist × Head-to-Waistband (Front)", str(tmp_dir / "wide_cor_f_1to1.png")),
                    ],
                    [
                        ("2D Reference · 1:1 Wide Wrist-to-Wrist × Head-to-Waistband (Back)", str(tmp_dir / "wide_ref_b_1to1.png")),
                        ("Pose Corrective · 1:1 Wide Wrist-to-Wrist × Head-to-Waistband (Back)", str(tmp_dir / "wide_cor_b_1to1.png")),
                    ],
                ]
                if has_ref
                else []
            ),
            "fallbackRows": [
                (
                    "Front",
                    [
                        ("Rigid LBS Diagnostic · Full-Body (Front)", str(tmp_dir / "tp_lbs_f_full.png")),
                        ("Pose Corrective · Full-Body (Front)", str(tmp_dir / "tp_cor_f_full.png")),
                    ],
                ),
                (
                    "Back",
                    [
                        ("Rigid LBS Diagnostic · Full-Body (Back)", str(tmp_dir / "tp_lbs_b_full.png")),
                        ("Pose Corrective · Full-Body (Back)", str(tmp_dir / "tp_cor_b_full.png")),
                    ],
                ),
            ],
        }
        outputs["tposeRefComparison"] = str(out_dir / "tpose-raised-arms-ref-comparison.png")

        # Board 5: Head, Neck, Face Identity, Clavicles & Nape 5-Angle Close-Up
        hd_rows = []
        for mk, mlbl in [
            ("donor", "Donor"),
            ("posed1", "Fit Posed LOD1"),
            ("posed0", "Fit Posed LOD0"),
            ("rest1", "Fit Rest LOD1"),
        ]:
            rtiles = []
            for anm, deg in [("Front", 0.0), ("3/4 Right", -38.0), ("Right Profile", -90.0), ("Rear 3/4", -142.0), ("Back Nape", 180.0)]:
                p = tmp_dir / f"hd_{mk}_{int(deg)}.png"
                _render_tile(scene, objs, cam_data, pivot, mk, p, 400, 440, (0.0, 0.0, 1.81), 0.44, deg)
                rtiles.append((f"{mlbl} · {anm}", str(p)))
            hd_rows.append((mlbl, rtiles))
        b5 = out_dir / "signoff-05-head-neck-jowl-nape-zoom.png"
        extra_boards.append({"title": f"{coord_id} · Head, Facial Identity, Neck, SCM, Clavicles & Nape Close-Up", "tw": 400, "th": 440, "out": str(b5), "rows": hd_rows})
        outputs["headNeckZoom"] = str(b5)

        # Board 6: Hands, Wrists, Palms & 5-Fingers Close-Up (Posed LOD1 vs Donor & Rest LOD0/LOD1)
        hn_tiles_0, hn_tiles_1 = [], []
        for idx_h, (lbl, mk, pxyz, yaw, pitch) in enumerate(
            [
                ("Donor · Posed Hand Palmar", "donor", hand_ctr_posed, -65.0, 0.0),
                ("Fit LOD1 Posed · Hand Palmar", "posed1", hand_ctr_posed, -65.0, 0.0),
                ("Donor · Posed Hand Dorsal", "donor", hand_ctr_posed, 115.0, 0.0),
                ("Fit LOD1 Posed · Hand Dorsal", "posed1", hand_ctr_posed, 115.0, 0.0),
                ("Donor · Posed Wrist/Knuckle Edge", "donor", hand_ctr_posed, -155.0, 0.0),
                ("Fit LOD1 Posed · Wrist/Knuckle Edge", "posed1", hand_ctr_posed, -155.0, 0.0),
            ]
        ):
            p = tmp_dir / f"hn0_{idx_h}.png"
            _render_tile(scene, objs, cam_data, pivot, mk, p, 380, 420, pxyz, 0.30, yaw, pitch)
            hn_tiles_0.append((lbl, str(p)))
        for idx_h, (lbl, mk, yaw, pitch) in enumerate(
            [
                ("Fit Rest LOD0 · Dorsum & 5-Fingers", "rest0", -40.0, 25.0),
                ("Fit Rest LOD1 · Dorsum & 5-Fingers", "rest1", -40.0, 25.0),
                ("Fit Rest LOD0 · Palm & Thumb Web", "rest0", 140.0, -25.0),
                ("Fit Rest LOD1 · Palm & Thumb Web", "rest1", 140.0, -25.0),
                ("Fit Rest LOD0 · Knuckle Thickness", "rest0", -130.0, 0.0),
                ("Fit Rest LOD1 · Knuckle Thickness", "rest1", -130.0, 0.0),
            ]
        ):
            p = tmp_dir / f"hn1_{idx_h}.png"
            _render_tile(scene, objs, cam_data, pivot, mk, p, 380, 420, hand_ctr_rest, 0.30, yaw, pitch)
            hn_tiles_1.append((lbl, str(p)))
        b6 = out_dir / "signoff-06-hands-wrists-5fingers-zoom.png"
        extra_boards.append({"title": f"{coord_id} · Wrists, Palms & 5-Finger Continuity / Clearance Audit", "tw": 380, "th": 420, "out": str(b6), "rows": [("Posed", hn_tiles_0), ("Rest", hn_tiles_1)]})
        outputs["handsFingersZoom"] = str(b6)

        # Board 7: Pectoral Cleavage, Deltoids, Armpits & Back 1:1 Zoom (Donor vs Posed LOD1 vs Posed LOD0 vs Rest LOD1)
        pa_rows = []
        for mk, mlbl in [
            ("donor", "Donor"),
            ("posed1", "Fit Posed LOD1"),
            ("posed0", "Fit Posed LOD0"),
            ("rest1", "Fit Rest LOD1"),
        ]:
            rtiles = []
            for anm, deg in [("Front", 0.0), ("3/4 Front", -35.0), ("Profile", -90.0), ("Rear 3/4", -145.0), ("Back", 180.0)]:
                p = tmp_dir / f"pa_{mk}_{int(deg)}.png"
                _render_tile(scene, objs, cam_data, pivot, mk, p, 400, 440, (0.0, 0.0, 1.48), 0.68, deg)
                rtiles.append((f"{mlbl} · {anm}", str(p)))
            pa_rows.append((mlbl, rtiles))
        b7 = out_dir / "signoff-07-pec-armpit-back-1to1-zoom.png"
        extra_boards.append({"title": f"{coord_id} · Pectorals, Deltoids, Armpits & Back Relief 1:1 Audit (Runtime LOD1 Primary)", "tw": 400, "th": 440, "out": str(b7), "rows": pa_rows})
        outputs["pecArmpitBackZoom"] = str(b7)

        # Board 8: Covered Pelvis/Glutes (`linenBriefs` ON) + Unmasked Bare-Saddle & Bare-Glute Diagnostics
        pg_rows = []
        for mk, mlbl in [
            ("donor", "Donor (Sculpted Briefs)"),
            ("posed1", "Fit Posed LOD1 + linenBriefs"),
            ("rest1", "Fit Rest LOD1 + linenBriefs"),
            ("posed1_bare", "Unmasked Bare Saddle (LOD1 Posed)"),
            ("rest1_bare", "Unmasked Bare Saddle (LOD1 Rest)"),
        ]:
            rtiles = []
            for anm, deg, ptch in [("Front", 0.0, 0.0), ("3/4 Front", -35.0, 0.0), ("Sub-Apron Tilt", 0.0, -22.0), ("Profile", -90.0, 0.0), ("Back Glutes", 180.0, 0.0)]:
                p = tmp_dir / f"pg_{mk}_{int(deg)}_{int(ptch)}.png"
                _render_tile(scene, objs, cam_data, pivot, mk, p, 400, 440, (0.0, 0.0, 1.00), 0.58, deg, ptch)
                rtiles.append((f"{mlbl} · {anm}", str(p)))
            pg_rows.append((mlbl, rtiles))
        ov_row_f, ov_jobs_f = _render_pelvis_noarm_overlay_row(scene, objs, cam_data, pivot)
        pg_rows.append(ov_row_f)
        cfg["pelvisOverlays"] = ov_jobs_f
        b8 = out_dir / "signoff-08-pelvis-groin-glutes-zoom.png"
        extra_boards.append({"title": f"{coord_id} · Pelvis, linenBriefs Fit, Bare-Saddle & 1:1 Arms-Hidden Profile Contour Overlay", "tw": 400, "th": 440, "out": str(b8), "rows": pg_rows})
        outputs["pelvisGroinGlutesZoom"] = str(b8)

        # Board 9: Profile & Back Limbs / Calves / Ankles Zoom (Donor vs Posed LOD1 vs Posed LOD0 vs Rest LOD1)
        lb_rows = []
        for mk, mlbl in [
            ("donor", "Donor"),
            ("posed1", "Fit Posed LOD1 + Briefs"),
            ("posed0", "Fit Posed LOD0 + Briefs"),
            ("rest1", "Fit Rest LOD1 + Briefs"),
        ]:
            rtiles = []
            for anm, pz_l, osc_l, deg in [
                ("Torso/Arm Profile", 1.28, 0.96, -90.0),
                ("Glute/Thigh Profile", 0.92, 0.96, -90.0),
                ("Knee/Calf/Ankle Profile", 0.48, 0.96, -90.0),
                ("Back & Arms", 1.36, 1.05, 180.0),
                ("Glutes/Calves Back", 0.62, 1.12, 180.0),
            ]:
                p = tmp_dir / f"lb_{mk}_{anm[:4]}_{int(deg)}.png"
                _render_tile(scene, objs, cam_data, pivot, mk, p, 400, 460, (0.0, 0.0, pz_l), osc_l, deg)
                rtiles.append((f"{mlbl} · {anm}", str(p)))
            lb_rows.append((mlbl, rtiles))
        b9 = out_dir / "signoff-09-profile-back-limbs-zoom.png"
        extra_boards.append({"title": f"{coord_id} · Profile & Posterior Trunk / Limbs / Calves / Ankles Audit (LOD1 Primary)", "tw": 400, "th": 460, "out": str(b9), "rows": lb_rows})
        outputs["profileBackLimbsZoom"] = str(b9)

        # Board 10: Rest LOD0 Master vs Runtime LOD1 Fidelity (with linenBriefs ON)
        r01_rows = []
        for mk, mlbl in [("rest0", "Authoring Master LOD0 (32,335v + Briefs)"), ("rest1", "Runtime LOD1 (8,568v + Briefs)")]:
            rtiles = []
            for anm, deg in [("Front", 0.0), ("3/4 Front", -35.0), ("Profile", -90.0), ("Rear 3/4", -145.0), ("Back", 180.0)]:
                p = tmp_dir / f"r01_{mk}_{int(deg)}.png"
                _render_tile(scene, objs, cam_data, pivot, mk, p, 380, 620, (0.0, 0.0, 1.015), 2.12, deg)
                rtiles.append((f"{mlbl} · {anm}", str(p)))
            r01_rows.append((mlbl, rtiles))
        b10 = out_dir / "signoff-10-rest-lod0-vs-lod1-zoom.png"
        extra_boards.append({"title": f"{coord_id} · Canonical Rest A-Pose: Master LOD0 vs Runtime LOD1 (80-120% Relief Gate)", "tw": 380, "th": 620, "out": str(b10), "rows": r01_rows})
        outputs["restLod0VsLod1"] = str(b10)

        # Board 11: Raised Arms 5-Angle Audit (Runtime LOD1 + linenBriefs)
        ra_rows = []
        for mk, mlbl in [
            ("tp_lbs", "T-Pose (0.705) · Rigid LBS"),
            ("tp_cor", "T-Pose (0.705) · Pose Corrective"),
            ("ra68_lbs", "Game Raised (+68°) · Rigid LBS"),
            ("ra68_cor", "Game Raised (+68°) · Pose Corrective"),
        ]:
            rtiles = []
            for anm, deg in [("Front", 0.0), ("3/4 Front", -32.0), ("Profile", -90.0), ("Rear 3/4", -148.0), ("Back", 180.0)]:
                p = tmp_dir / f"ra5_{mk}_{int(deg)}.png"
                _render_tile(scene, objs, cam_data, pivot, mk, p, 420, 440, (0.0, 0.0, 1.54), 1.24, deg)
                rtiles.append((f"{mlbl} · {anm}", str(p)))
            ra_rows.append((mlbl, rtiles))
        b11 = out_dir / "signoff-11-raised-arms-5angle-audit.png"
        extra_boards.append({"title": f"{coord_id} · Raised Arms Anatomical Pose 5-Angle Audit (Runtime LOD1 + linenBriefs)", "tw": 420, "th": 440, "out": str(b11), "rows": ra_rows})
        outputs["raisedArms5Angle"] = str(b11)

        cfg["extraBoards"] = extra_boards
        cfg["main6AngleRows"] = main_rows_cfg
        cfg["detailUpperTiles"] = up_tiles
        cfg["detailLowerTiles"] = lo_tiles
        cfg["detailAuditOut"] = str(out_dir / "clay-detail-audit.png")

    _stitch_audit_boards(cfg)
    shutil.rmtree(tmp_dir, ignore_errors=True)
    return outputs
