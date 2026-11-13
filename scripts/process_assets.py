#!/usr/bin/env python3
"""
Process raw generated illustrations into transparent, centered, defringed PNG assets.
Uses macOS `sips` to decode JPEG -> BMP, pure numpy for border-connected 8-neighbor
BFS flood-fill + edge defringe + premultiplied area-averaged downscaling, and stdlib
zlib/struct to write clean 32-bit RGBA PNGs.
"""

from __future__ import annotations

from collections import deque
from pathlib import Path
import shutil
import struct
import subprocess
import sys
import tempfile
import zlib
import numpy as np

RAW_DIR = Path("/Users/gitsilence/.gemini/antigravity/brain/734cabcd-b9f4-4712-a5d8-e48b458b9429")
OUT_DIR = Path("/Users/gitsilence/github/what_to_eat_today/public/assets/illustrations")


def load_image_rgb(src_path: Path) -> np.ndarray:
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_jpg = Path(tmpdir) / "input.jpg"
        tmp_bmp = Path(tmpdir) / "input.bmp"
        shutil.copy2(src_path, tmp_jpg)
        subprocess.run(
            ["/usr/bin/sips", "-s", "format", "bmp", str(tmp_jpg), "--out", str(tmp_bmp)],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        data = tmp_bmp.read_bytes()

    # Parse BMP header
    pixel_offset = struct.unpack_from("<I", data, 10)[0]
    width, height = struct.unpack_from("<ii", data, 18)
    bpp = struct.unpack_from("<H", data, 28)[0]
    top_down = height < 0
    height = abs(height)
    channels = bpp // 8
    row_stride = ((width * channels + 3) // 4) * 4

    buf = np.frombuffer(data, dtype=np.uint8, offset=pixel_offset)
    buf = buf[: height * row_stride].reshape((height, row_stride))
    pixels = buf[:, : width * channels].reshape((height, width, channels))
    if not top_down:
        pixels = pixels[::-1, :, :]
    # BMP is BGR(A) -> RGB
    rgb = pixels[:, :, :3][:, :, ::-1].copy()
    return rgb


def save_png_rgba(rgba: np.ndarray, out_path: Path) -> None:
    h, w, c = rgba.shape
    assert c == 4
    # Prepend filter byte 0 (None) to each scanline
    raw_rows = np.hstack([np.zeros((h, 1), dtype=np.uint8), rgba.reshape((h, w * 4))])
    compressed = zlib.compress(raw_rows.tobytes(), level=6)

    def chunk(tag: bytes, payload: bytes) -> bytes:
        crc = zlib.crc32(tag + payload) & 0xFFFFFFFF
        return struct.pack(">I", len(payload)) + tag + payload + struct.pack(">I", crc)

    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)  # 8-bit RGBA
    png_bytes = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", compressed)
        + chunk(b"IEND", b"")
    )
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(png_bytes)


def remove_border_white(rgb: np.ndarray, lum_thresh: int = 235, chroma_thresh: int = 22) -> np.ndarray:
    h, w, _ = rgb.shape
    rgb_i = rgb.astype(np.int16)
    max_c = rgb_i.max(axis=2)
    min_c = rgb_i.min(axis=2)

    # Candidate pure/near-white background pixels
    is_bg_cand = (
        (rgb_i[:, :, 0] > lum_thresh)
        & (rgb_i[:, :, 1] > lum_thresh)
        & (rgb_i[:, :, 2] > lum_thresh)
        & ((max_c - min_c) < chroma_thresh)
    )

    visited = np.zeros((h, w), dtype=bool)
    q = deque()

    for x in range(w):
        for y in (0, h - 1):
            if is_bg_cand[y, x] and not visited[y, x]:
                visited[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if is_bg_cand[y, x] and not visited[y, x]:
                visited[y, x] = True
                q.append((y, x))

    neighbors = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
    while q:
        cy, cx = q.popleft()
        for dy, dx in neighbors:
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and is_bg_cand[ny, nx]:
                visited[ny, nx] = True
                q.append((ny, nx))

    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[:, :, :3] = rgb
    alpha = np.full((h, w), 255, dtype=np.uint8)
    alpha[visited] = 0

    # Soft defringe for 1-2px anti-aliased halo next to transparent background
    bg_mask = visited
    dilated = bg_mask.copy()
    for dy, dx in neighbors:
        shifted = np.zeros_like(bg_mask)
        y_src = slice(max(0, -dy), h - max(0, dy))
        x_src = slice(max(0, -dx), w - max(0, dx))
        y_dst = slice(max(0, dy), h - max(0, -dy))
        x_dst = slice(max(0, dx), w - max(0, -dx))
        shifted[y_dst, x_dst] = bg_mask[y_src, x_src]
        dilated |= shifted

    edge_band = dilated & (~bg_mask)
    lum = rgb_i.mean(axis=2)
    chroma = max_c - min_c
    fringe = edge_band & (lum > 214) & (chroma < 34)
    if np.any(fringe):
        factor = np.clip((255.0 - lum[fringe]) / 41.0, 0.12, 1.0)
        new_a = (alpha[fringe].astype(np.float32) * factor).astype(np.uint8)
        alpha[fringe] = new_a
        a_norm = np.maximum(new_a.astype(np.float32) / 255.0, 0.22)
        for c in range(3):
            chan = rgba[:, :, c].astype(np.float32)
            unblended = (chan[fringe] - 255.0 * (1.0 - a_norm)) / a_norm
            rgba[fringe, c] = np.clip(unblended, 0, 255).astype(np.uint8)

    rgba[:, :, 3] = alpha
    return rgba


def resize_premultiplied_rgba(img: np.ndarray, new_h: int, new_w: int) -> np.ndarray:
    """High-quality area/bilinear downscaling in premultiplied alpha space."""
    src_h, src_w, _ = img.shape
    a = img[:, :, 3:4].astype(np.float32) / 255.0
    premul = np.concatenate([img[:, :, :3].astype(np.float32) * a, a * 255.0], axis=2)

    # Box-filter supersample grid for crisp downscaling without aliasing
    scale_y = src_h / new_h
    scale_x = src_w / new_w
    samples = 4 if max(scale_y, scale_x) > 1.5 else 2

    acc = np.zeros((new_h, new_w, 4), dtype=np.float32)
    for sy in range(samples):
        oy = (np.arange(new_h) + (sy + 0.5) / samples) * scale_y - 0.5
        oy = np.clip(oy, 0.0, src_h - 1.001)
        y0 = np.floor(oy).astype(np.int32)
        fy = (oy - y0)[:, None, None]
        y1 = np.minimum(y0 + 1, src_h - 1)
        for sx in range(samples):
            ox = (np.arange(new_w) + (sx + 0.5) / samples) * scale_x - 0.5
            ox = np.clip(ox, 0.0, src_w - 1.001)
            x0 = np.floor(ox).astype(np.int32)
            fx = (ox - x0)[None, :, None]
            x1 = np.minimum(x0 + 1, src_w - 1)

            c00 = premul[y0[:, None], x0[None, :]]
            c01 = premul[y0[:, None], x1[None, :]]
            c10 = premul[y1[:, None], x0[None, :]]
            c11 = premul[y1[:, None], x1[None, :]]
            interp = (
                c00 * (1 - fy) * (1 - fx)
                + c01 * (1 - fy) * fx
                + c10 * fy * (1 - fx)
                + c11 * fy * fx
            )
            acc += interp

    acc /= samples * samples
    out_a = np.clip(acc[:, :, 3], 0.0, 255.0)
    out_rgb = np.zeros((new_h, new_w, 3), dtype=np.uint8)
    valid = out_a > 0.5
    out_rgb[valid] = np.clip(
        acc[:, :, :3][valid] / (out_a[valid, None] / 255.0), 0.0, 255.0
    ).astype(np.uint8)

    out = np.zeros((new_h, new_w, 4), dtype=np.uint8)
    out[:, :, :3] = out_rgb
    out[:, :, 3] = np.round(out_a).astype(np.uint8)
    return out


def trim_and_center(rgba: np.ndarray, target_size: int, margin_ratio: float = 0.08) -> np.ndarray:
    alpha = rgba[:, :, 3]
    ys, xs = np.where(alpha > 12)
    if len(xs) == 0 or len(ys) == 0:
        return np.zeros((target_size, target_size, 4), dtype=np.uint8)

    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    cropped = rgba[y0:y1, x0:x1]

    ch, cw, _ = cropped.shape
    max_dim = int(round(target_size * (1.0 - 2 * margin_ratio)))
    scale = min(max_dim / cw, max_dim / ch)
    nw = max(1, int(round(cw * scale)))
    nh = max(1, int(round(ch * scale)))

    resized = resize_premultiplied_rgba(cropped, nh, nw)
    canvas = np.zeros((target_size, target_size, 4), dtype=np.uint8)
    ox = (target_size - nw) // 2
    oy = (target_size - nh) // 2
    canvas[oy : oy + nh, ox : ox + nw] = resized
    return canvas


def find_raw(prefix: str) -> Path:
    matches = sorted(RAW_DIR.glob(f"{prefix}*"))
    if not matches:
        raise FileNotFoundError(f"Missing raw asset with prefix: {prefix}")
    return matches[0]


def process_single(prefix: str, dst_name: str, size: int = 480) -> None:
    src_path = find_raw(prefix)
    rgb = load_image_rgb(src_path)
    transparent = remove_border_white(rgb)
    centered = trim_and_center(transparent, size, margin_ratio=0.06)
    save_png_rgba(centered, OUT_DIR / dst_name)
    print(f"Saved {dst_name} ({size}x{size})")


def process_grid(
    prefix: str,
    names: tuple[str, str, str, str],
    size: int = 256,
    thresh_overrides: dict[str, tuple[int, int]] | None = None,
) -> None:
    src_path = find_raw(prefix)
    rgb = load_image_rgb(src_path)
    h, w, _ = rgb.shape
    mx, my = w // 2, h // 2
    slices = [
        rgb[0:my, 0:mx],   # Top-Left
        rgb[0:my, mx:w],   # Top-Right
        rgb[my:h, 0:mx],   # Bottom-Left
        rgb[my:h, mx:w],   # Bottom-Right
    ]
    overrides = thresh_overrides or {}
    for sub_rgb, dst_name in zip(slices, names):
        lum_t, chroma_t = overrides.get(dst_name, (235, 22))
        transparent = remove_border_white(sub_rgb, lum_thresh=lum_t, chroma_thresh=chroma_t)
        centered = trim_and_center(transparent, size, margin_ratio=0.08)
        save_png_rgba(centered, OUT_DIR / dst_name)
        print(f"Saved {dst_name} ({size}x{size})")


def main() -> int:
    process_single("hero_noodles_raw", "hero-noodles.png", 480)
    process_single("hero_burger_raw", "hero-burger.png", 480)
    process_grid("grid_1_raw", ("hotpot.png", "bbq.png", "japanese.png", "noodles.png"), 256)
    process_grid("grid_2_raw", ("fastfood.png", "homestyle.png", "lightmeal.png", "sichuan.png"), 256)
    process_grid(
        "grid_3_raw",
        ("milktea.png", "pizza.png", "dessert.png", "dumplings.png"),
        256,
        thresh_overrides={"dessert.png": (247, 8)},
    )
    print("All assets processed successfully.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
