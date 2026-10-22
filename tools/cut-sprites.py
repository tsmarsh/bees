#!/usr/bin/env python3
"""Cut a generated sprite sheet into transparent PNGs, one per figure.

The sheets are drawn on a flat white background. Background is whatever near-white region touches the sheet's edge
(so white eyes and highlights inside an ink outline survive). Figures are the big connected regions, read in rows
(top to bottom, then left to right); small regions (a tear drop, a loose antenna tip) join the figure they touch.
Each figure is saved as OUT_PREFIX-NAME.webp (or --ext png) with only its own pixels, so a neighbour's petals never leak in.

    tools/cut-sprites.py SHEET.png OUT_PREFIX name1 name2 ... [--size 256] [--ext png]

Needs Pillow. Run with `python3 -I`.
"""
import argparse
from collections import deque

from PIL import Image, ImageChops, ImageFilter

STEP = 4  # figures are found on a grid this coarse; the alpha edge itself stays full resolution


def background_mask(img, tolerance):
    """1 where a pixel is near-white and connected to the border."""
    w, h = img.size
    px = img.load()
    lo = 255 - tolerance
    bg = bytearray(w * h)
    q = deque()
    for x in range(w):
        q.append((x, 0)); q.append((x, h - 1))
    for y in range(h):
        q.append((0, y)); q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        i = y * w + x
        if bg[i]:
            continue
        p = px[x, y]
        if p[0] < lo or p[1] < lo or p[2] < lo:
            continue
        bg[i] = 1
        if x > 0: q.append((x - 1, y))
        if x < w - 1: q.append((x + 1, y))
        if y > 0: q.append((x, y - 1))
        if y < h - 1: q.append((x, y + 1))
    return bg


def label_regions(bg, w, h):
    """Label the foreground on a coarse grid. Returns (labels, gw, gh, regions) with regions = [(id, box, cells)]."""
    gw, gh = w // STEP, h // STEP
    fg = bytearray(gw * gh)
    for gy in range(gh):
        row = gy * STEP * w
        for gx in range(gw):
            # a cell is foreground if any of its corners is
            x = gx * STEP
            if not (bg[row + x] and bg[row + x + STEP - 1] and bg[row + (STEP - 1) * w + x] and bg[row + (STEP - 1) * w + x + STEP - 1]):
                fg[gy * gw + gx] = 1
    labels = [0] * (gw * gh)
    regions = []
    next_id = 1
    for start in range(gw * gh):
        if not fg[start] or labels[start]:
            continue
        q = deque([start]); labels[start] = next_id
        x0 = x1 = start % gw; y0 = y1 = start // gw; n = 0
        while q:
            i = q.popleft(); n += 1
            x, y = i % gw, i // gw
            x0, x1, y0, y1 = min(x0, x), max(x1, x), min(y0, y), max(y1, y)
            for j in ((i + 1) if x < gw - 1 else -1, (i - 1) if x > 0 else -1, (i + gw) if y < gh - 1 else -1, (i - gw) if y > 0 else -1):
                if j >= 0 and fg[j] and not labels[j]:
                    labels[j] = next_id; q.append(j)
        regions.append((next_id, [x0 * STEP, y0 * STEP, (x1 + 1) * STEP, (y1 + 1) * STEP], n))
        next_id += 1
    return labels, gw, gh, regions


def figures_of(regions, gap):
    """Big regions are figures; each small one joins the figure whose box it touches (or is dropped as a speck)."""
    biggest = max(n for _, _, n in regions)
    figures = [{"ids": {rid}, "box": list(box)} for rid, box, n in regions if n >= biggest * 0.15]
    for rid, b, n in regions:
        if n >= biggest * 0.15 or n < 4:
            continue
        for f in figures:
            fb = f["box"]
            if fb[0] - gap < b[2] and b[0] - gap < fb[2] and fb[1] - gap < b[3] and b[1] - gap < fb[3]:
                f["ids"].add(rid)
                f["box"] = [min(fb[0], b[0]), min(fb[1], b[1]), max(fb[2], b[2]), max(fb[3], b[3])]
                break
    return figures


def reading_order(figures):
    figures.sort(key=lambda f: (f["box"][1] + f["box"][3]) / 2)
    rows, row = [], [figures[0]]
    for f in figures[1:]:
        prev = row[-1]["box"]
        b = f["box"]
        if (b[1] + b[3]) / 2 - (prev[1] + prev[3]) / 2 < (prev[3] - prev[1]) / 2:
            row.append(f)
        else:
            rows.append(row); row = [f]
    rows.append(row)
    return [f for r in rows for f in sorted(r, key=lambda f: f["box"][0])]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sheet")
    ap.add_argument("prefix")
    ap.add_argument("names", nargs="+")
    ap.add_argument("--size", type=int, default=256, help="longest side of the biggest sprite; the rest share its scale")
    ap.add_argument("--ext", default="webp", help="output format: webp (smaller, what the game loads) or png")
    ap.add_argument("--tolerance", type=int, default=28)
    ap.add_argument("--gap", type=int, default=24)
    args = ap.parse_args()

    img = Image.open(args.sheet).convert("RGB")
    w, h = img.size
    bg = background_mask(img, args.tolerance)
    alpha = Image.frombytes("L", (w, h), bytes(0 if b else 255 for b in bg))
    # pull the cut in by a pixel and soften it, so the ink outline doesn't sit on a hard white fringe
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))

    labels, gw, gh, regions = label_regions(bg, w, h)
    figures = reading_order(figures_of(regions, args.gap))
    if len(figures) != len(args.names):
        raise SystemExit(f"{args.sheet}: found {len(figures)} figures, expected {len(args.names)}: {[f['box'] for f in figures]}")

    pad = 8
    # one scale for the whole sheet, so a character keeps its size when it changes pose
    longest = max(max(f["box"][2] - f["box"][0], f["box"][3] - f["box"][1]) + 2 * pad for f in figures)
    k = min(1.0, args.size / longest)
    for name, f in zip(args.names, figures):
        own = Image.frombytes("L", (gw, gh), bytes(255 if l in f["ids"] else 0 for l in labels))
        own = own.filter(ImageFilter.MaxFilter(3)).resize((gw * STEP, gh * STEP), Image.NEAREST)
        mask = Image.new("L", (w, h), 0)
        mask.paste(own, (0, 0))
        sprite = img.copy()
        sprite.putalpha(ImageChops.multiply(alpha, mask))
        x0, y0, x1, y1 = f["box"]
        crop = sprite.crop((max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad), min(h, y1 + pad)))
        crop = crop.resize((round(crop.width * k), round(crop.height * k)), Image.LANCZOS)
        out = f"{args.prefix}-{name}.{args.ext}"
        crop.save(out, quality=90, method=6) if args.ext == "webp" else crop.save(out, optimize=True)
        print(out, crop.size)


if __name__ == "__main__":
    main()
