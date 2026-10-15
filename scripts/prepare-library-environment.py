"""Prepare the finite CC0 scenery comparison; no downloads or world mutations.

Run with Python and Pillow, supplying the three recorded public source archives.
Only selected static meshes are admitted. Source geometry/UVs and cutout alpha
remain distinct from the optional, deliberately painted material RGB fields.
"""

import argparse
import hashlib
import io
import json
import math
import struct
import subprocess
import zipfile
from pathlib import Path, PurePosixPath

from PIL import Image, ImageDraw


SOURCES = {
    "nature": {
        "sha256": "fa7974a0d342bfe63c38664ba9f8ec1a4aab8ea25f099bdc56870e33588c4d9d",
        "page": "https://kenney.nl/assets/nature-kit",
        "archive": "https://kenney.nl/media/pages/assets/nature-kit/37ac38a37b-1677698939/kenney_nature-kit.zip",
        "license": "License.txt",
    },
    "survival": {
        "sha256": "c3586341b5932c87eb43d75d915434f47daed168b17ed36a03e8ca9977c7443e",
        "page": "https://kenney.nl/assets/survival-kit",
        "archive": "https://kenney.nl/media/pages/assets/survival-kit/4065a8185b-1712149243/kenney_survival-kit.zip",
        "license": "License.txt",
    },
    "quaternius": {
        "sha256": "298f6732b872e4cf7b30e6e7abf9641c7f6dc6b326df37ac089533ed7e3d58c9",
        "page": "https://quaternius.com/packs/stylizednaturemegakit.html",
        "archive": "https://quaternius.itch.io/stylized-nature-megakit/file/11055123",
        "archiveRequestMethod": "POST from the official free download page; resolves a temporary CDN URL",
        "downloadPage": "https://quaternius.itch.io/stylized-nature-megakit",
        "license": "License_Standard.txt",
    },
}
SELECTION = {
    "kenney": {
        "tree-broadleaf": ("nature", "Models/GLTF format/tree_detailed.glb"),
        "tree-conifer": ("survival", "Models/GLB format/tree.glb"),
        "tree-birch": ("nature", "Models/GLTF format/tree_thin.glb"),
        "woodland-shrub": ("nature", "Models/GLTF format/plant_bushDetailed.glb"),
    },
    "quaternius": {
        "tree-broadleaf": ("quaternius", "glTF/CommonTree_5.gltf"),
        "tree-conifer": ("quaternius", "glTF/Pine_5.gltf"),
        "tree-birch": ("quaternius", "glTF/CommonTree_3.gltf"),
        "woodland-shrub": ("quaternius", "glTF/Bush_Common.gltf"),
    },
}
COMPONENTS = {5120: "b", 5121: "B", 5122: "h", 5123: "H", 5125: "I", 5126: "f"}
WIDTHS = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def rounded(values):
    return [round(value, 7) for value in values]


def read_model(archive, name):
    raw = archive.read(name)
    if name.endswith(".glb"):
        if raw[:4] != b"glTF" or struct.unpack_from("<I", raw, 4)[0] != 2:
            raise ValueError("Expected current glTF binary input")
        size = struct.unpack_from("<I", raw, 12)[0]
        model = json.loads(raw[20:20 + size])
        binary = raw[28 + size:]
    else:
        model, binary = json.loads(raw), None
    folder = PurePosixPath(name).parent
    buffers = [archive.read(str(folder / item["uri"])) if "uri" in item else binary
               for item in model["buffers"]]

    def accessor(index):
        item = model["accessors"][index]
        if "sparse" in item:
            raise ValueError("Selected scenery does not use sparse accessors")
        view = model["bufferViews"][item["bufferView"]]
        code = COMPONENTS[item["componentType"]]
        count = WIDTHS[item["type"]]
        fmt = "<" + code * count
        stride = view.get("byteStride", struct.calcsize(fmt))
        offset = view.get("byteOffset", 0) + item.get("byteOffset", 0)
        values = [list(struct.unpack_from(fmt, buffers[view["buffer"]], offset + i * stride))
                  for i in range(item["count"])]
        if item.get("normalized") and code != "f":
            maximum = {"b": 127, "B": 255, "h": 32767, "H": 65535}[code]
            values = [[max(-1, value / maximum) for value in row] for row in values]
        return values

    def image(index):
        entry = model["images"][model["textures"][index]["source"]]
        if "uri" in entry:
            source = archive.read(str(folder / entry["uri"]))
        else:
            view = model["bufferViews"][entry["bufferView"]]
            start = view.get("byteOffset", 0)
            source = buffers[view["buffer"]][start:start + view["byteLength"]]
        return Image.open(io.BytesIO(source)).convert("RGBA"), digest(source)

    return raw, model, accessor, image


def prepared_alpha(original, size, cutoff):
    """Area-filter alpha separately; preserve admitted cutout area at its cutoff."""
    source = original.getchannel("A")
    alpha = source.resize((size, size), Image.Resampling.BOX)
    threshold = math.ceil(cutoff * 255)
    target = sum(source.histogram()[threshold:]) / (source.width * source.height)
    best, error = alpha, 1.0
    low, high = 0.25, 4.0
    for _ in range(20):
        scale = (low + high) / 2
        candidate = alpha.point([min(255, round(value * scale)) for value in range(256)])
        coverage = sum(candidate.histogram()[threshold:]) / (size * size)
        if abs(coverage - target) < error:
            best, error = candidate, abs(coverage - target)
        if coverage < target:
            low = scale
        else:
            high = scale
    if error > 0.02:
        raise ValueError("A selected cutout loses too much area at the prepared size")
    return best, {"sourceCoverage": target, "preparedCoverageError": error}


def paint(role, size):
    """Connected material-specific shapes, not per-texel random variation."""
    width, height = (32, 64) if role in ("bark", "birch") else (32, 32)
    palette = {
        "leaf": ("#5c7859", "#506b50", "#6b825f", "#78916a"),
        "bark": ("#6d5038", "#49352b", "#947658", "#af9570"),
        "birch": ("#b8bcaa", "#5d625a", "#d9dac7", "#929b8a"),
    }[role]
    canvas = Image.new("RGB", (width, height), palette[0])
    draw = ImageDraw.Draw(canvas)
    if role == "leaf":
        for x, y, w in [(1, 4, 10), (19, 10, 11), (9, 24, 12)]:
            draw.rectangle((x + 1, y + 4, x + w, y + 6), fill=palette[1])
            draw.rectangle((x + 1, y + 1, x + w - 1, y + 3), fill=palette[2])
            draw.rectangle((x + 3, y, x + w - 3, y + 1), fill=palette[3])
    elif role == "birch":
        for x, y, w in [(0, 5, 8), (19, 16, 12), (8, 28, 7), (23, 40, 9), (2, 55, 11)]:
            draw.rectangle((x, y, x + w, y + 1), fill=palette[1])
            draw.rectangle((x + 2, y + 2, x + w - 2, y + 2), fill=palette[3])
        draw.rectangle((14, 0, 17, 63), fill=palette[2])
    else:
        for x, y, h in [(2, 2, 18), (12, 14, 25), (23, 1, 29), (4, 37, 25), (21, 43, 19)]:
            draw.rectangle((x + 2, y + 3, x + 3, y + h), fill=palette[1])
            draw.rectangle((x, y, x + 1, y + h - 4), fill=palette[2])
            draw.rectangle((x + 1, y, x + 2, y + 2), fill=palette[3])
    return canvas.resize((size, size), Image.Resampling.NEAREST).convert("RGBA")


def prepare(archives, output):
    output = output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    data = {"metadata": {"uvOrigin": "top-left", "textureRows": "top-to-bottom",
                         "baseColorSpace": "linear", "textureColorSpace": "sRGB",
                         "normalization": "centered XZ, bottom Y=0, max XZ width=1, height=1"},
            "variants": {}, "materials": {}, "textures": {}}
    provenance = {"license": "CC0-1.0", "sources": {}, "models": [], "textures": [],
                  "modifications": ["Preserve source triangle topology, UVs and authored normals.",
                                    "Bake node translations; fit unchanged caller-owned envelopes.",
                                    "Prepare at most 128-square shared textures; filter alpha separately and measure cutoff coverage.",
                                    "Keep source RGB and optional authored leaf/bark/birch RGB separate with identical alpha.",
                                    "Clamp negligible exporter vertex-color overshoot to 0..1 and retain six decimal places.",
                                    "Omit source normal maps and metallic response for this controlled art comparison.",
                                    "CommonTree_3 supplies slender birch structure; pale painted bark is a named approximation."]}
    opened = {}
    for source, path in archives.items():
        raw = path.read_bytes()
        if digest(raw) != SOURCES[source]["sha256"]:
            raise ValueError(f"The recorded {source} archive hash does not match")
        opened[source] = zipfile.ZipFile(io.BytesIO(raw))
        license_bytes = opened[source].read(SOURCES[source]["license"])
        (output / f"LICENSE.{source}.txt").write_bytes(license_bytes)
        provenance["sources"][source] = {**SOURCES[source], "bytes": len(raw),
                                          "licenseSha256": digest(license_bytes)}
    for variant, selection in SELECTION.items():
        data["variants"][variant] = {}
        for appearance, (source, filename) in selection.items():
            raw, model, accessor, image = read_model(opened[source], filename)
            parts = []

            def visit(node_index, translation):
                node = model["nodes"][node_index]
                if ("matrix" in node or node.get("rotation", [0, 0, 0, 1]) != [0, 0, 0, 1]
                        or node.get("scale", [1, 1, 1]) != [1, 1, 1]):
                    raise ValueError("Selected static models require translation-only nodes")
                origin = [a + b for a, b in zip(translation, node.get("translation", [0, 0, 0]))]
                if "mesh" in node:
                    for primitive in model["meshes"][node["mesh"]]["primitives"]:
                        if primitive.get("mode", 4) != 4:
                            raise ValueError("Selected scenery must contain triangles")
                        material = model["materials"][primitive["material"]]
                        name = material.get("name", "source material")
                        role = "leaf" if "lea" in name.lower() else "bark" if "bark" in name.lower() else None
                        if appearance == "tree-birch" and role == "bark":
                            role = "birch"
                        key = variant + "-" + digest(json.dumps([material, role], sort_keys=True).encode())[:12]
                        if key not in data["materials"]:
                            pbr = material.get("pbrMetallicRoughness", {})
                            prepared = {"name": name, "baseColor": pbr.get("baseColorFactor", [1, 1, 1, 1]),
                                        "alphaCutoff": material.get("alphaCutoff", 0.5) if material.get("alphaMode") == "MASK" else 0,
                                        "doubleSided": material.get("doubleSided", False)}
                            if "baseColorTexture" in pbr:
                                original, image_hash = image(pbr["baseColorTexture"]["index"])
                                size = min(128, max(original.size))
                                texture = original.resize((size, size), Image.Resampling.BOX)
                                alpha, coverage = prepared_alpha(original, size, max(prepared["alphaCutoff"], 0.001))
                                texture.putalpha(alpha)
                                texture_id = "source-" + digest((image_hash + str(size) + str(prepared["alphaCutoff"])).encode())[:12]
                                prepared["texture"] = texture_id
                                data["textures"][texture_id] = {"width": size, "height": size, "rgba": list(texture.tobytes())}
                                if role:
                                    painted = paint(role, size)
                                    painted.putalpha(alpha)
                                    prepared["paintedTexture"] = key + "-painted"
                                    data["textures"][key + "-painted"] = {"width": size, "height": size, "rgba": list(painted.tobytes())}
                                provenance["textures"].append({"material": key, "sourceSha256": image_hash,
                                                                "sourceDimensions": list(original.size), "preparedDimensions": [size, size], **coverage})
                            data["materials"][key] = prepared
                        attributes = primitive["attributes"]
                        positions = accessor(attributes["POSITION"])
                        normals = accessor(attributes["NORMAL"])
                        uv = accessor(attributes["TEXCOORD_0"]) if "TEXCOORD_0" in attributes else [[0, 0]] * len(positions)
                        colors = accessor(attributes["COLOR_0"]) if "COLOR_0" in attributes else [[1, 1, 1, 1]] * len(positions)
                        parts.append({"positions": [[v + origin[i] for i, v in enumerate(p)] for p in positions],
                                      "normals": normals, "uvs": uv, "colors": [c if len(c) == 4 else c + [1] for c in colors],
                                      "indices": [v[0] for v in accessor(primitive["indices"])], "material": key})
                for child in node.get("children", []):
                    visit(child, origin)

            for node in model["scenes"][model.get("scene", 0)]["nodes"]:
                visit(node, [0, 0, 0])
            points = [p for part in parts for p in part["positions"]]
            minimum = [min(p[i] for p in points) for i in range(3)]
            maximum = [max(p[i] for p in points) for i in range(3)]
            width = max(maximum[0] - minimum[0], maximum[2] - minimum[2])
            scale = [width, maximum[1] - minimum[1], width]
            center = [(minimum[0] + maximum[0]) / 2, minimum[1], (minimum[2] + maximum[2]) / 2]
            for part in parts:
                part["positions"] = [v for p in part["positions"] for v in rounded([(p[i] - center[i]) / scale[i] for i in range(3)])]
                transformed = [[n[i] * scale[i] for i in range(3)] for n in part["normals"]]
                part["normals"] = [v for n in transformed for v in rounded([x / math.hypot(*n) for x in n])]
                part["uvs"] = [v for uv in part["uvs"] for v in uv]
                part["colors"] = [round(min(1, max(0, v)), 6) for c in part["colors"] for v in c]
            bounds = {"min": rounded([(minimum[i] - center[i]) / scale[i] for i in range(3)]),
                      "max": rounded([(maximum[i] - center[i]) / scale[i] for i in range(3)])}
            data["variants"][variant][appearance] = {"parts": parts, "bounds": bounds}
            provenance["models"].append({"variant": variant, "appearance": appearance, "source": source,
                                          "path": filename, "sha256": digest(raw), "sourceBounds": {"min": minimum, "max": maximum},
                                          "triangles": sum(len(p["indices"]) // 3 for p in parts), "parts": len(parts)})
    destination = output / "scenery.json"
    destination.write_text(json.dumps(data, separators=(",", ":")) + "\n")
    # Generated assets follow the repository's pinned formatter; hash the final
    # bytes so the retained provenance also verifies the checked-in artifact.
    prettier = ["pnpm", "exec", "prettier", "--config", str(Path(__file__).resolve().parents[1] / ".prettierrc.json"), "--write"]
    subprocess.run([*prettier, str(destination)], check=True)
    provenance["output"] = {"path": destination.name, "bytes": destination.stat().st_size,
                             "sha256": digest(destination.read_bytes())}
    provenance_path = output / "provenance.json"
    provenance_path.write_text(json.dumps(provenance, indent=2) + "\n")
    subprocess.run([*prettier, str(provenance_path)], check=True)
    print(json.dumps({"output": provenance["output"], "models": provenance["models"], "textures": provenance["textures"]}, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    for name in SOURCES:
        parser.add_argument("--" + name, type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    prepare({name: getattr(args, name) for name in SOURCES}, args.output)
