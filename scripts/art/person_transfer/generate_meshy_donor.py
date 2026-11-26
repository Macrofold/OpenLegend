#!/usr/bin/env python3
"""Generate or recover Multi-Image-to-3D body donor(s) via Meshy Direct OpenAPI v1 (`MESHY_API_KEY`).

Follows `docs/production-workflows/art-flows/body-reference-family.md#meshy-donor-generation`:
- `should_remesh = False` and `pose_mode` omitted so raw donor surface relief and A-pose are preserved;
- `request-record.json` persisted immediately so interrupted runs recover `taskId` without duplicate charges;
- Meshy credit balance recorded before and after the batch.
"""
from __future__ import annotations

import argparse
import base64
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
from pathlib import Path
import sys
import time
import urllib.error
import urllib.request

sys.dont_write_bytecode = True

PACKAGE_DIR = Path(__file__).resolve().parent
if str(PACKAGE_DIR) not in sys.path:
    sys.path.insert(0, str(PACKAGE_DIR))

from runtime_env import external_output, load_env_key, sha256_file  # noqa: E402

API_BASE = "https://api.meshy.ai/openapi/v1"


def api_json(method: str, url: str, key: str, payload: dict | None = None, timeout: int = 60) -> dict:
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Authorization": f"Bearer {key}", "Accept": "application/json"}
    if data is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        body = err.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Meshy HTTP {err.code} on {method} {url}: {body[:1200]}") from err


def download_binary(url: str, dst: Path, timeout: int = 180) -> dict:
    dst.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "OpenLegend-Art-Study/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read()
    dst.write_bytes(raw)
    return {"path": str(dst), "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}


def to_data_uri(png_path: Path) -> str:
    b64 = base64.b64encode(png_path.read_bytes()).decode("ascii")
    return f"data:image/png;base64,{b64}"


def run_one_coordinate(
    coord_id: str,
    crops_root: Path,
    donors_root: Path,
    key: str,
    ai_model: str,
    should_texture: bool,
    poll_seconds: float = 8.0,
    timeout_seconds: float = 900.0,
) -> dict:
    out_dir = external_output(donors_root / coord_id)
    out_dir.mkdir(parents=True, exist_ok=True)
    req_record_path = out_dir / "request-record.json"
    receipt_path = out_dir / "provider-receipt.json"
    glb_path = out_dir / "model.glb"

    if receipt_path.is_file() and glb_path.is_file():
        existing = json.loads(receipt_path.read_text())
        if existing.get("status") == "SUCCEEDED" and sha256_file(glb_path) == existing["downloads"]["glb"]["sha256"]:
            return existing

    crop_dir = crops_root / coord_id
    panels = [crop_dir / "front.png", crop_dir / "profile.png", crop_dir / "back.png"]
    for p in panels:
        if not p.is_file():
            raise FileNotFoundError(f"Missing crop panel: {p}")

    task_id = None
    if req_record_path.is_file():
        prior = json.loads(req_record_path.read_text())
        task_id = prior.get("taskId")

    if not task_id:
        payload = {
            "image_urls": [to_data_uri(p) for p in panels],
            "ai_model": ai_model,
            "should_remesh": False,
            "should_texture": should_texture,
            "enable_pbr": False,
            "image_enhancement": False,
        }
        submitted_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        created = api_json("POST", f"{API_BASE}/multi-image-to-3d", key, payload, timeout=120)
        task_id = created.get("result") or created.get("id")
        if not task_id:
            raise RuntimeError(f"Unexpected Meshy create response for {coord_id}: {created}")
        req_record = {
            "coordinateId": coord_id,
            "provider": "Meshy Direct OpenAPI v1",
            "endpoint": "/openapi/v1/multi-image-to-3d",
            "taskId": task_id,
            "submittedAtUtc": submitted_at,
            "parameters": {
                "ai_model": ai_model,
                "should_remesh": False,
                "should_texture": should_texture,
                "enable_pbr": False,
                "image_enhancement": False,
                "pose_mode": "omitted (preserve source A-pose)",
            },
            "inputs": [
                {"panel": p.name, "path": str(p), "sha256": sha256_file(p), "bytes": p.stat().st_size}
                for p in panels
            ],
        }
        req_record_path.write_text(json.dumps(req_record, indent=2) + "\n")

    deadline = time.monotonic() + timeout_seconds
    last_status = None
    while time.monotonic() < deadline:
        info = api_json("GET", f"{API_BASE}/multi-image-to-3d/{task_id}", key, timeout=60)
        status = info.get("status")
        prog = info.get("progress")
        if (status, prog) != last_status:
            print(f"[{coord_id}] task={task_id} status={status} progress={prog}", flush=True)
            last_status = (status, prog)
        if status == "SUCCEEDED":
            downloads: dict[str, dict] = {}
            glb_url = (info.get("model_urls") or {}).get("glb")
            if not glb_url:
                raise RuntimeError(f"Succeeded Meshy task {task_id} has no model_urls.glb")
            downloads["glb"] = download_binary(glb_url, glb_path)
            thumb_url = info.get("thumbnail_url")
            if thumb_url:
                downloads["thumbnail"] = download_binary(thumb_url, out_dir / "thumbnail.png")
            tex_urls = info.get("texture_urls") or []
            if tex_urls and isinstance(tex_urls[0], dict) and tex_urls[0].get("base_color"):
                downloads["baseColor"] = download_binary(tex_urls[0]["base_color"], out_dir / "base_color.png")
            receipt = {
                "coordinateId": coord_id,
                "taskId": task_id,
                "status": status,
                "modelType": info.get("model_type"),
                "precedingTasks": info.get("preceding_tasks"),
                "createdAt": info.get("created_at"),
                "startedAt": info.get("started_at"),
                "finishedAt": info.get("finished_at"),
                "downloads": downloads,
            }
            receipt_path.write_text(json.dumps(receipt, indent=2) + "\n")
            return receipt
        if status in ("FAILED", "CANCELED", "EXPIRED"):
            err_msg = info.get("task_error")
            raise RuntimeError(f"Meshy task {task_id} for {coord_id} ended with {status}: {err_msg}")
        time.sleep(poll_seconds)

    raise TimeoutError(f"Timed out waiting for Meshy task {task_id} ({coord_id}); task saved in {req_record_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--coordinates", nargs="+", required=True, help="Coordinate IDs such as M050-F100")
    parser.add_argument("--study-dir", required=True, type=Path)
    parser.add_argument("--repository", type=Path, default=None)
    parser.add_argument("--ai-model", default="latest")
    parser.add_argument("--untextured", action="store_true")
    parser.add_argument("--parallel", type=int, default=4)
    args = parser.parse_args()

    study = external_output(args.study_dir)
    crops_root = study / "sources/crops"
    donors_root = study / "donors"
    donors_root.mkdir(parents=True, exist_ok=True)

    key = load_env_key("MESHY_API_KEY", args.repository)
    bal_before = api_json("GET", f"{API_BASE}/balance", key)
    t0 = time.monotonic()

    results: dict[str, dict] = {}
    with ThreadPoolExecutor(max_workers=max(1, min(args.parallel, len(args.coordinates)))) as pool:
        futs = {
            pool.submit(
                run_one_coordinate,
                cid,
                crops_root,
                donors_root,
                key,
                args.ai_model,
                not args.untextured,
            ): cid
            for cid in args.coordinates
        }
        for fut in as_completed(futs):
            cid = futs[fut]
            results[cid] = fut.result()

    bal_after = api_json("GET", f"{API_BASE}/balance", key)
    charged = int(bal_before["balance"]) - int(bal_after["balance"])
    batch_summary = {
        "coordinates": args.coordinates,
        "aiModel": args.ai_model,
        "shouldTexture": not args.untextured,
        "wallSeconds": round(time.monotonic() - t0, 2),
        "balanceBefore": bal_before,
        "balanceAfter": bal_after,
        "chargedCredits": charged,
        "estimatedUsdAtProRate": round(charged * 0.02, 2),
        "results": {k: results[k] for k in args.coordinates},
    }
    stamp = "-".join(args.coordinates)
    (donors_root / f"batch-{stamp}-receipt.json").write_text(json.dumps(batch_summary, indent=2) + "\n")
    print(json.dumps(batch_summary, indent=2))


if __name__ == "__main__":
    main()
