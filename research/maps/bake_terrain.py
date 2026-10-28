"""Bake the terrain used by the chapter maps.

Downloads public elevation tiles (AWS Terrain Tiles, "terrarium" format; data from
SRTM, ETOPO1 and others, see https://registry.opendata.aws/terrain-tiles/) for the
Arabian Peninsula and writes, into assets/maps/:

  arabia-height.png   8-bit height map (0 = sea, else 1 + metres/12), read by map.js
  arabia-light.jpg    colour texture for the light theme
  arabia-dark.jpg     colour texture for the dark theme

The textures are drawn like an engraved museum map: sand tints by height, hillshade
lit from the north-west, faint contour lines every 500 m, an ink coastline, and
water lines offshore. Land outside the peninsula is faded.

Run from the repository root (needs numpy and Pillow, and network access):
    python3 research/maps/bake_terrain.py
"""
import math
import os
import subprocess
import tempfile

import numpy as np
from PIL import Image, ImageFilter

# keep in sync with BOUNDS in assets/map.js
LON0, LON1, LAT0, LAT1 = 34.5, 57.5, 12.5, 32.5
W, H = 576, 500            # height map size
TW, TH = 1728, 1500        # texture size (3x)
Z = 6
OUT = "assets/maps"

THEMES = {
    "light": dict(sea="#d9d6c3", sea_line="#a9a58e", low="#efe2c6", mid="#e2c99c", high="#c39a6b",
                  peak="#a87c52", ink="#3a2a1e", faded="#e6dcc6", contour="#8a6a4a"),
    "dark":  dict(sea="#0f0c0a", sea_line="#4a3d30", low="#3a2c21", mid="#4a3727", high="#664b33",
                  peak="#85664a", ink="#d9c3a0", faded="#211a15", contour="#b08c64"),
}


def hexrgb(h):
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], float)


def fetch_dem():
    n = 2 ** Z
    tx = lambda lon: int((lon + 180) / 360 * n)
    ty = lambda lat: int((1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n)
    xs, ys = range(tx(LON0), tx(LON1) + 1), range(ty(LAT1), ty(LAT0) + 1)
    mosaic = np.zeros((len(ys) * 256, len(xs) * 256))
    with tempfile.TemporaryDirectory() as tmp:
        for i, x in enumerate(xs):
            for j, y in enumerate(ys):
                path = os.path.join(tmp, f"{x}_{y}.png")
                subprocess.run(["curl", "-s", "-f", "-m", "60", "-o", path,
                                f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{x}/{y}.png"], check=True)
                a = np.asarray(Image.open(path).convert("RGB")).astype(float)
                mosaic[j * 256:(j + 1) * 256, i * 256:(i + 1) * 256] = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
    return mosaic, xs[0], ys[0], n


def sample(mosaic, x0t, y0t, n, w, h):
    """Resample the Web Mercator mosaic onto a plain lon/lat grid (bilinear)."""
    lons = np.linspace(LON0, LON1, w)
    lats = np.linspace(LAT1, LAT0, h)
    px = ((lons + 180) / 360 * n - x0t) * 256
    r = np.radians(lats)
    py = ((1 - np.log(np.tan(r) + 1 / np.cos(r)) / math.pi) / 2 * n - y0t) * 256
    PX, PY = np.meshgrid(px, py)
    x0, y0 = np.floor(PX).astype(int), np.floor(PY).astype(int)
    fx, fy = PX - x0, PY - y0
    x1, y1 = np.minimum(x0 + 1, mosaic.shape[1] - 1), np.minimum(y0 + 1, mosaic.shape[0] - 1)
    return (mosaic[y0, x0] * (1 - fx) * (1 - fy) + mosaic[y0, x1] * fx * (1 - fy)
            + mosaic[y1, x0] * (1 - fx) * fy + mosaic[y1, x1] * fx * fy)


def peninsula_mask(land, w, h):
    """Land connected to Riyadh, minus Iran across the Gulf: the part we emphasise."""
    lon = np.linspace(LON0, LON1, w)[None, :].repeat(h, 0)
    lat = np.linspace(LAT1, LAT0, h)[:, None].repeat(w, 1)
    iran = (lon > 48.0) & (lat > 30.0 - 0.42 * (lon - 48.0))
    seed = np.zeros_like(land)
    seed[int((LAT1 - 24.7) / (LAT1 - LAT0) * (h - 1)), int((46.7 - LON0) / (LON1 - LON0) * (w - 1))] = True
    allowed = land & ~iran
    region = seed & allowed
    while True:  # flood fill by repeated dilation
        grown = region.copy()
        grown[1:] |= region[:-1]; grown[:-1] |= region[1:]
        grown[:, 1:] |= region[:, :-1]; grown[:, :-1] |= region[:, 1:]
        grown &= allowed
        if (grown == region).all():
            break
        region = grown
    # feather the edge, and fade gradually north of 30.5N (towards Iraq and the Levant)
    weight = np.asarray(Image.fromarray((region * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(w / 120)), float) / 255
    return weight * np.clip((32.0 - lat) / 1.5, 0, 1)


def erode(mask, steps):
    return ~dilate(~mask, steps)


def dilate(mask, steps):
    m = mask.copy()
    for _ in range(steps):
        g = m.copy()
        g[1:] |= m[:-1]; g[:-1] |= m[1:]; g[:, 1:] |= m[:, :-1]; g[:, :-1] |= m[:, 1:]
        m = g
    return m


def bake(E, theme):
    c = {k: hexrgb(v) for k, v in THEMES[theme].items()}
    land = E > 0.5
    focus = peninsula_mask(land, *E.shape[::-1])
    # hypsometric tint
    t = np.clip(E / 2600, 0, 1)[..., None]
    ramp = np.where(t < .25, c["low"] + (c["mid"] - c["low"]) * (t / .25),
           np.where(t < .6, c["mid"] + (c["high"] - c["mid"]) * ((t - .25) / .35),
                    c["high"] + (c["peak"] - c["high"]) * ((t - .6) / .4)))
    # hillshade, sun from the north-west
    gy, gx = np.gradient(np.where(land, E, 0) * 0.02)
    shade = np.clip((-gx * 0.7 + gy * 0.7) / np.sqrt(1 + gx ** 2 + gy ** 2), -1, 1)
    ramp = ramp * (1 + 0.35 * shade[..., None])
    # contours every 500 m
    band = np.floor(E / 500)
    edge = np.zeros_like(land)
    edge[1:] |= band[1:] != band[:-1]; edge[:, 1:] |= band[:, 1:] != band[:, :-1]
    edge &= land & (E > 250)
    ramp = np.where(edge[..., None], ramp * 0.82 + c["contour"] * 0.18, ramp)
    # fade land outside the peninsula
    f = (0.25 + 0.75 * focus)[..., None]
    ramp = ramp * f + c["faded"] * (1 - f)
    img = np.where(land[..., None], ramp, c["sea"])
    # water lines offshore, then the coastline
    sea = ~land
    coast = land & dilate(sea, 1)
    solid = dilate(erode(land, 3), 3)  # land without specks, so reefs get no water lines
    for d, a in ((6, .55), (13, .35), (22, .2)):
        ring = sea & dilate(solid, d) & ~dilate(solid, d - 1)
        img = np.where(ring[..., None], img * (1 - a) + c["sea_line"] * a, img)
    img = np.where(coast[..., None], img * 0.15 + c["ink"] * 0.85, img)
    return np.clip(img, 0, 255).astype(np.uint8)


def main():
    os.makedirs(OUT, exist_ok=True)
    mosaic, x0t, y0t, n = fetch_dem()
    E = sample(mosaic, x0t, y0t, n, W, H)
    code = np.where(E > 0.5, np.clip(1 + E / 12, 1, 255), 0).astype(np.uint8)
    Image.fromarray(code, "L").save(f"{OUT}/arabia-height.png", optimize=True)
    E3 = sample(mosaic, x0t, y0t, n, TW, TH)
    for theme in THEMES:
        im = Image.fromarray(bake(E3, theme), "RGB").filter(ImageFilter.SMOOTH)
        im.save(f"{OUT}/arabia-{theme}.jpg", quality=82, optimize=True, progressive=True)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
