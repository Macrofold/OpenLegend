"""Self-contained 2D image composition and label drawing for person-transfer review boards.

Uses `Pillow` (`PIL`) directly in-process when installed; otherwise executes natively inside
Blender's Python (`bpy.data.images` + `numpy`) or standard `numpy` + `zlib` PNG I/O with an
embedded crisp 5x7 ASCII bitmap font. Eliminates any external `Pillow` runtime dependency.
"""
from __future__ import annotations

import struct
import subprocess
import sys
import tempfile
import zlib
from pathlib import Path

sys.dont_write_bytecode = True

import numpy as np

try:
    from PIL import Image as _PilImage, ImageDraw as _PilImageDraw  # type: ignore

    HAS_NATIVE_PIL = True
except Exception:
    _PilImage = None
    _PilImageDraw = None
    HAS_NATIVE_PIL = False

# Compact 5x7 uppercase/symbol/digit/lowercase ASCII bitmap font (each entry is 7 rows of 5-bit ints).
_FONT_5X7: dict[str, tuple[int, ...]] = {
    " ": (0, 0, 0, 0, 0, 0, 0),
    "!": (4, 4, 4, 4, 4, 0, 4),
    '"': (10, 10, 0, 0, 0, 0, 0),
    "#": (10, 31, 10, 10, 31, 10, 0),
    "%": (25, 25, 2, 4, 8, 19, 19),
    "&": (12, 18, 20, 8, 21, 18, 13),
    "'": (4, 4, 0, 0, 0, 0, 0),
    "(": (2, 4, 8, 8, 8, 4, 2),
    ")": (8, 4, 2, 2, 2, 4, 8),
    "*": (0, 4, 21, 14, 21, 4, 0),
    "+": (0, 4, 4, 31, 4, 4, 0),
    ",": (0, 0, 0, 0, 4, 4, 8),
    "-": (0, 0, 0, 31, 0, 0, 0),
    ".": (0, 0, 0, 0, 0, 0, 4),
    "/": (1, 1, 2, 4, 8, 16, 16),
    "0": (14, 17, 19, 21, 25, 17, 14),
    "1": (4, 12, 4, 4, 4, 4, 14),
    "2": (14, 17, 1, 6, 8, 16, 31),
    "3": (31, 2, 4, 6, 1, 17, 14),
    "4": (2, 6, 10, 18, 31, 2, 2),
    "5": (31, 16, 30, 1, 1, 17, 14),
    "6": (6, 8, 16, 30, 17, 17, 14),
    "7": (31, 1, 2, 4, 8, 8, 8),
    "8": (14, 17, 17, 14, 17, 17, 14),
    "9": (14, 17, 17, 15, 1, 2, 12),
    ":": (0, 4, 0, 0, 0, 4, 0),
    ";": (0, 4, 0, 0, 4, 4, 8),
    "<": (2, 4, 8, 16, 8, 4, 2),
    "=": (0, 0, 31, 0, 31, 0, 0),
    ">": (8, 4, 2, 1, 2, 4, 8),
    "?": (14, 17, 1, 2, 4, 0, 4),
    "@": (14, 17, 23, 21, 23, 16, 14),
    "A": (14, 17, 17, 31, 17, 17, 17),
    "B": (30, 17, 17, 30, 17, 17, 30),
    "C": (14, 17, 16, 16, 16, 17, 14),
    "D": (30, 17, 17, 17, 17, 17, 30),
    "E": (31, 16, 16, 30, 16, 16, 31),
    "F": (31, 16, 16, 30, 16, 16, 16),
    "G": (14, 17, 16, 23, 17, 17, 15),
    "H": (17, 17, 17, 31, 17, 17, 17),
    "I": (14, 4, 4, 4, 4, 4, 14),
    "J": (7, 2, 2, 2, 2, 18, 12),
    "K": (17, 18, 20, 24, 20, 18, 17),
    "L": (16, 16, 16, 16, 16, 16, 31),
    "M": (17, 27, 21, 21, 17, 17, 17),
    "N": (17, 25, 21, 19, 17, 17, 17),
    "O": (14, 17, 17, 17, 17, 17, 14),
    "P": (30, 17, 17, 30, 16, 16, 16),
    "Q": (14, 17, 17, 17, 21, 18, 13),
    "R": (30, 17, 17, 30, 20, 18, 17),
    "S": (15, 16, 16, 14, 1, 1, 30),
    "T": (31, 4, 4, 4, 4, 4, 4),
    "U": (17, 17, 17, 17, 17, 17, 14),
    "V": (17, 17, 17, 17, 17, 10, 4),
    "W": (17, 17, 17, 21, 21, 27, 17),
    "X": (17, 17, 10, 4, 10, 17, 17),
    "Y": (17, 17, 10, 4, 4, 4, 4),
    "Z": (31, 1, 2, 4, 8, 16, 31),
    "[": (14, 8, 8, 8, 8, 8, 14),
    "\\": (16, 16, 8, 4, 2, 1, 1),
    "]": (14, 2, 2, 2, 2, 2, 14),
    "_": (0, 0, 0, 0, 0, 0, 31),
    "`": (8, 4, 0, 0, 0, 0, 0),
    "{": (2, 4, 4, 8, 4, 4, 2),
    "|": (4, 4, 4, 4, 4, 4, 4),
    "}": (8, 4, 4, 2, 4, 4, 8),
    "~": (0, 8, 21, 2, 0, 0, 0),
    "·": (0, 0, 0, 4, 0, 0, 0),
    "°": (6, 9, 9, 6, 0, 0, 0),
}

_UNICODE_ASCII_SUBS: tuple[tuple[str, str], ...] = (
    ("→", "->"),
    ("←", "<-"),
    ("—", "-"),
    ("–", "-"),
    ("×", "x"),
    ("±", "+/-"),
    ("≈", "~"),
    ("≤", "<="),
    ("≥", ">="),
)


def _read_png_rgb(path: Path) -> np.ndarray:
    """Load any image into `(H, W, 3)` uint8 sRGB using `bpy.data.images` or stdlib PNG/sips."""
    try:
        import bpy  # type: ignore

        im = bpy.data.images.load(str(path), check_existing=False)
        try:
            im.colorspace_settings.name = "Non-Color"
            w, h = int(im.size[0]), int(im.size[1])
            buf = np.empty(w * h * 4, dtype=np.float32)
            im.pixels.foreach_get(buf)
            arr = np.clip(np.round(buf.reshape(h, w, 4)[::-1, :, :3] * 255.0), 0, 255).astype(np.uint8)
            return arr
        finally:
            bpy.data.images.remove(im)
    except Exception:
        pass

    raw = path.read_bytes()
    if not raw.startswith(b"\x89PNG\r\n\x1a\n"):
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tf:
            tmp_png = Path(tf.name)
        try:
            subprocess.run(["/usr/bin/sips", "-s", "format", "png", str(path), "--out", str(tmp_png)], check=True, capture_output=True)
            raw = tmp_png.read_bytes()
        finally:
            tmp_png.unlink(missing_ok=True)

    pos = 8
    w = h = bit_depth = color_type = 0
    idat_chunks: list[bytes] = []
    while pos < len(raw):
        length = struct.unpack(">I", raw[pos : pos + 4])[0]
        ctype = raw[pos + 4 : pos + 8]
        cdata = raw[pos + 8 : pos + 8 + length]
        pos += 12 + length
        if ctype == b"IHDR":
            w, h, bit_depth, color_type, _, _, _ = struct.unpack(">IIBBBBB", cdata)
        elif ctype == b"IDAT":
            idat_chunks.append(cdata)
        elif ctype == b"IEND":
            break
    if bit_depth != 8 or color_type not in (2, 6):
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tf:
            tmp_png = Path(tf.name)
        try:
            subprocess.run(["/usr/bin/sips", "-s", "format", "png", str(path), "--out", str(tmp_png)], check=True, capture_output=True)
            return _read_png_rgb(tmp_png)
        finally:
            tmp_png.unlink(missing_ok=True)

    bpp = 3 if color_type == 2 else 4
    stride = w * bpp
    decomp = zlib.decompress(b"".join(idat_chunks))
    out = np.zeros((h, stride), dtype=np.uint8)
    prev = np.zeros(stride, dtype=np.int32)
    offset = 0
    for y in range(h):
        ftype = decomp[offset]
        row = np.frombuffer(decomp, dtype=np.uint8, count=stride, offset=offset + 1).astype(np.int32)
        offset += 1 + stride
        if ftype == 0:
            recon = row
        elif ftype == 1:
            recon = row.copy()
            for i in range(bpp, stride):
                recon[i] = (recon[i] + recon[i - bpp]) & 0xFF
        elif ftype == 2:
            recon = (row + prev) & 0xFF
        elif ftype == 3:
            recon = row.copy()
            for i in range(stride):
                left = recon[i - bpp] if i >= bpp else 0
                recon[i] = (recon[i] + ((left + prev[i]) >> 1)) & 0xFF
        elif ftype == 4:
            recon = row.copy()
            for i in range(stride):
                a = recon[i - bpp] if i >= bpp else 0
                b = int(prev[i])
                c = int(prev[i - bpp]) if i >= bpp else 0
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                recon[i] = (recon[i] + pr) & 0xFF
        else:
            raise ValueError(f"Unsupported PNG filter {ftype}")
        out[y] = recon.astype(np.uint8)
        prev = recon
    return out.reshape(h, w, bpp)[:, :, :3].copy()


def _write_png_rgb(path: Path, arr: np.ndarray, compress_level: int = 6) -> None:
    """Write `(H, W, 3)` uint8 sRGB array losslessly as an 8-bit RGB PNG."""
    rgb = np.ascontiguousarray(arr[:, :, :3], dtype=np.uint8)
    h, w, _ = rgb.shape
    raw_rows = np.hstack([np.zeros((h, 1), dtype=np.uint8), rgb.reshape(h, w * 3)]).tobytes()
    compressed = zlib.compress(raw_rows, level=compress_level)

    def chunk(tag: bytes, payload: bytes) -> bytes:
        crc = zlib.crc32(tag + payload) & 0xFFFFFFFF
        return struct.pack(">I", len(payload)) + tag + payload + struct.pack(">I", crc)

    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)
    png_bytes = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", compressed) + chunk(b"IEND", b"")
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_bytes(png_bytes)


def _resize_rgb(arr: np.ndarray, new_w: int, new_h: int) -> np.ndarray:
    """Separable bilinear resize on `(H, W, 3)` uint8 array."""
    h, w, _ = arr.shape
    if (w, h) == (new_w, new_h):
        return arr.copy()
    src = arr.astype(np.float32)
    xs = (np.arange(new_w, dtype=np.float32) + 0.5) * (w / max(new_w, 1)) - 0.5
    xs = np.clip(xs, 0.0, max(w - 1, 0))
    x0 = np.floor(xs).astype(np.int32)
    x1 = np.minimum(x0 + 1, max(w - 1, 0))
    wx = (xs - x0)[None, :, None]
    horiz = src[:, x0, :] * (1.0 - wx) + src[:, x1, :] * wx

    ys = (np.arange(new_h, dtype=np.float32) + 0.5) * (h / max(new_h, 1)) - 0.5
    ys = np.clip(ys, 0.0, max(h - 1, 0))
    y0 = np.floor(ys).astype(np.int32)
    y1 = np.minimum(y0 + 1, max(h - 1, 0))
    wy = (ys - y0)[:, None, None]
    out = horiz[y0, :, :] * (1.0 - wy) + horiz[y1, :, :] * wy
    return np.clip(np.round(out), 0, 255).astype(np.uint8)


class _FallbackImage:
    class Resampling:
        LANCZOS = 1
        BILINEAR = 2

    def __init__(self, arr: np.ndarray):
        self._arr = np.ascontiguousarray(arr[:, :, :3], dtype=np.uint8)

    def __enter__(self) -> "_FallbackImage":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        return None

    @property
    def width(self) -> int:
        return int(self._arr.shape[1])

    @property
    def height(self) -> int:
        return int(self._arr.shape[0])

    @property
    def size(self) -> tuple[int, int]:
        return (self.width, self.height)

    def __array__(self, dtype=None) -> np.ndarray:
        return self._arr.astype(dtype) if dtype is not None else self._arr

    def convert(self, mode: str = "RGB") -> "_FallbackImage":
        return _FallbackImage(self._arr.copy())

    def copy(self) -> "_FallbackImage":
        return _FallbackImage(self._arr.copy())

    def getpixel(self, xy: tuple[int, int]) -> tuple[int, int, int]:
        x = max(0, min(self.width - 1, int(xy[0])))
        y = max(0, min(self.height - 1, int(xy[1])))
        px = self._arr[y, x]
        return (int(px[0]), int(px[1]), int(px[2]))

    def crop(self, box: tuple[int, int, int, int]) -> "_FallbackImage":
        x0, y0, x1, y1 = (int(round(v)) for v in box)
        cw, ch = max(1, x1 - x0), max(1, y1 - y0)
        out = np.zeros((ch, cw, 3), dtype=np.uint8)
        sx0, sy0 = max(0, x0), max(0, y0)
        sx1, sy1 = min(self.width, x1), min(self.height, y1)
        if sx1 > sx0 and sy1 > sy0:
            out[sy0 - y0 : sy1 - y0, sx0 - x0 : sx1 - x0] = self._arr[sy0:sy1, sx0:sx1]
        return _FallbackImage(out)

    def resize(self, size: tuple[int, int], resample: int = 1) -> "_FallbackImage":
        return _FallbackImage(_resize_rgb(self._arr, int(size[0]), int(size[1])))

    def paste(self, im: "_FallbackImage", xy: tuple[int, int]) -> None:
        ox, oy = int(xy[0]), int(xy[1])
        src = im._arr
        sh, sw, _ = src.shape
        dx0, dy0 = max(0, ox), max(0, oy)
        dx1, dy1 = min(self.width, ox + sw), min(self.height, oy + sh)
        if dx1 > dx0 and dy1 > dy0:
            self._arr[dy0:dy1, dx0:dx1] = src[dy0 - oy : dy1 - oy, dx0 - ox : dx1 - ox]

    def save(self, path: str | Path, format: str = "PNG", compress_level: int = 6) -> None:
        _write_png_rgb(Path(path), self._arr, compress_level=compress_level)

    @staticmethod
    def open(path: str | Path) -> "_FallbackImage":
        return _FallbackImage(_read_png_rgb(Path(path)))

    @staticmethod
    def new(mode: str, size: tuple[int, int], color: tuple[int, ...] = (0, 0, 0)) -> "_FallbackImage":
        w, h = int(size[0]), int(size[1])
        arr = np.empty((h, w, 3), dtype=np.uint8)
        arr[:, :] = color[:3]
        return _FallbackImage(arr)

    @staticmethod
    def fromarray(arr: np.ndarray) -> "_FallbackImage":
        return _FallbackImage(np.asarray(arr, dtype=np.uint8))


class _FallbackDraw:
    def __init__(self, im: _FallbackImage):
        self._im = im

    def text(self, xy: tuple[int, int], text: str, fill: tuple[int, ...] = (255, 255, 255)) -> None:
        arr = self._im._arr
        h, w, _ = arr.shape
        cx, cy = int(xy[0]), int(xy[1]) + 2
        col = np.array(fill[:3], dtype=np.uint8)
        norm_text = str(text)
        for src_tok, dst_tok in _UNICODE_ASCII_SUBS:
            if src_tok in norm_text:
                norm_text = norm_text.replace(src_tok, dst_tok)
        for ch in norm_text:
            glyph = _FONT_5X7.get(ch) or _FONT_5X7.get(ch.upper()) or _FONT_5X7["?"]
            if cx + 6 >= 0 and cx < w:
                for ry, bits in enumerate(glyph):
                    py = cy + ry
                    if 0 <= py < h and bits:
                        for rx in range(5):
                            if (bits >> (4 - rx)) & 1:
                                px = cx + rx
                                if 0 <= px < w:
                                    arr[py, px] = col
            cx += 6

    def line(
        self,
        pts: list[tuple[int | float, int | float]],
        fill: tuple[int, ...] = (255, 255, 255),
        width: int = 1,
    ) -> None:
        if len(pts) < 2:
            return
        arr = self._im._arr
        h, w, _ = arr.shape
        col = np.array(fill[:3], dtype=np.uint8)
        half = max(0, int(width) // 2)
        for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
            steps = max(int(round(max(abs(x1 - x0), abs(y1 - y0)))), 1)
            xs = np.round(np.linspace(x0, x1, steps + 1)).astype(np.int32)
            ys = np.round(np.linspace(y0, y1, steps + 1)).astype(np.int32)
            for dy in range(-half, half + 1):
                for dx in range(-half, half + 1):
                    px = np.clip(xs + dx, 0, w - 1)
                    py = np.clip(ys + dy, 0, h - 1)
                    arr[py, px] = col


class _FallbackImageDrawModule:
    @staticmethod
    def Draw(im: _FallbackImage) -> _FallbackDraw:
        return _FallbackDraw(im)


Image = _PilImage if HAS_NATIVE_PIL else _FallbackImage
ImageDraw = _PilImageDraw if HAS_NATIVE_PIL else _FallbackImageDrawModule
