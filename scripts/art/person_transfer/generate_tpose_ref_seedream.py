#!/usr/bin/env python3
"""Generate or recover a 2D horizontal T-pose reference sheet via ByteDance Seedream 5.0 Pro (Replicate API).

Persists `request.json` before polling so interrupted tasks recover cleanly without duplicate paid calls
(`docs/production-workflows/art-flows/README.md#waiting-on-tools`).
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
from pathlib import Path
import sys
import time
import urllib.request

sys.dont_write_bytecode = True

PACKAGE_DIR = Path(__file__).resolve().parent
if str(PACKAGE_DIR) not in sys.path:
    sys.path.insert(0, str(PACKAGE_DIR))

from runtime_env import external_output, load_env_key  # noqa: E402


def api_json(method: str, url: str, key: str, payload: dict | None = None, timeout: int = 60) -> dict:
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {
        "Authorization": f"Bearer {key}",
        "User-Agent": "OpenLegend-Art-Study/1.0",
        "Accept": "application/json",
    }
    if data is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--coordinate-id", required=True)
    parser.add_argument("--reference-sheet", required=True, type=Path)
    parser.add_argument("--prompt-file", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--repository", type=Path, default=None)
    parser.add_argument("--aspect-ratio", default="auto")
    parser.add_argument(
        "--pose-suffix",
        default="raised-arms-ref",
        help="Filename stem suffix for T-pose or arbitrary auxiliary pose reference (default: raised-arms-ref)",
    )
    args = parser.parse_args()

    out_dir = external_output(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    cid = args.coordinate_id
    sfx = args.pose_suffix
    png_path = out_dir / f"{cid}-{sfx}.png"
    rec_path = out_dir / f"{cid}-{sfx}.receipt.json"
    req_path = out_dir / f"{cid}-{sfx}.request.json"

    if rec_path.is_file() and png_path.is_file():
        rec = json.loads(rec_path.read_text())
        if rec.get("status") == "succeeded":
            print(json.dumps({"reused": True, "png": str(png_path), "predictionId": rec.get("id")}))
            return

    key = load_env_key("REPLICATE_API_KEY", args.repository)
    model_info = api_json("GET", "https://api.replicate.com/v1/models/bytedance/seedream-5-pro", key, timeout=20)
    lv = model_info["latest_version"]
    version_id = lv["id"]
    schemas = lv["openapi_schema"]["components"]["schemas"]
    ar_enum = schemas.get("aspect_ratio", {}).get("enum", [])
    aspect = args.aspect_ratio
    if aspect == "auto":
        aspect = "21:9" if "21:9" in ar_enum else ("16:9" if "16:9" in ar_enum else "3:2")

    pred_id = None
    if req_path.is_file():
        pred_id = json.loads(req_path.read_text()).get("predictionId")

    if not pred_id:
        ref_bytes = args.reference_sheet.read_bytes()
        data_uri = "data:image/png;base64," + base64.b64encode(ref_bytes).decode("ascii")
        prompt_txt = args.prompt_file.read_text().strip()
        payload = {
            "version": version_id,
            "input": {
                "prompt": prompt_txt,
                "image_input": [data_uri],
                "size": "2K",
                "aspect_ratio": aspect,
                "output_format": "png",
                "layer_decomposition": False,
            },
        }
        pred = api_json("POST", "https://api.replicate.com/v1/predictions", key, payload, timeout=60)
        pred_id = pred["id"]
        req_path.write_text(
            json.dumps(
                {
                    "coordinateId": cid,
                    "predictionId": pred_id,
                    "model": "bytedance/seedream-5-pro",
                    "version": version_id,
                    "aspectRatio": aspect,
                    "size": "2K",
                    "referenceSheet": str(args.reference_sheet.resolve()),
                    "referenceSheetSha256": hashlib.sha256(ref_bytes).hexdigest(),
                    "promptFile": str(args.prompt_file.resolve()),
                    "submittedAtUtc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                },
                indent=2,
            )
            + "\n"
        )
        print(f"[{cid}] submitted Seedream 5.0 Pro prediction={pred_id} aspect={aspect}", flush=True)

    while True:
        pred = api_json("GET", f"https://api.replicate.com/v1/predictions/{pred_id}", key, timeout=30)
        st = pred.get("status")
        if st == "succeeded":
            out_url = pred["output"][0] if isinstance(pred["output"], list) else pred["output"]
            dl_req = urllib.request.Request(out_url, headers={"User-Agent": "OpenLegend-Art-Study/1.0"})
            with urllib.request.urlopen(dl_req, timeout=60) as resp:
                img_bytes = resp.read()
            png_path.write_bytes(img_bytes)
            clean_rec = {k: v for k, v in pred.items() if k not in ("input", "urls")}
            clean_rec["model"] = "bytedance/seedream-5-pro"
            clean_rec["version"] = version_id
            clean_rec["inputSummary"] = json.loads(req_path.read_text())
            clean_rec["outputPng"] = {
                "path": str(png_path),
                "bytes": len(img_bytes),
                "sha256": hashlib.sha256(img_bytes).hexdigest(),
            }
            rec_path.write_text(json.dumps(clean_rec, indent=2) + "\n")
            print(json.dumps({"predictionId": pred_id, "png": str(png_path), "bytes": len(img_bytes), "metrics": pred.get("metrics")}))
            return
        if st in ("failed", "canceled"):
            err = pred.get("error")
            raise RuntimeError(f"Seedream prediction {pred_id} ended with {st}: {err}")
        time.sleep(3.0)


if __name__ == "__main__":
    main()
