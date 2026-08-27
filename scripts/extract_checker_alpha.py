"""Convert the light checker field from generated cutouts to true transparency."""

from collections import deque
from pathlib import Path
import sys

import numpy as np
from PIL import Image, ImageFilter


def extract(source: Path, target: Path) -> None:
    image = Image.open(source).convert("RGB")
    rgb = np.asarray(image)
    low = rgb.min(axis=2)
    high = rgb.max(axis=2)

    # The generated preview checker is neutral and very light. Only pixels in
    # that family which connect to the canvas edge are considered background,
    # protecting light body panels enclosed by a machine silhouette.
    eligible = (low >= 228) & ((high - low) <= 16)
    height, width = eligible.shape
    background = np.zeros((height, width), dtype=bool)
    queue: deque[tuple[int, int]] = deque()

    for x in range(width):
        if eligible[0, x]:
            queue.append((0, x))
        if eligible[height - 1, x]:
            queue.append((height - 1, x))
    for y in range(height):
        if eligible[y, 0]:
            queue.append((y, 0))
        if eligible[y, width - 1]:
            queue.append((y, width - 1))

    while queue:
        y, x = queue.popleft()
        if background[y, x] or not eligible[y, x]:
            continue
        background[y, x] = True
        if y:
            queue.append((y - 1, x))
        if y + 1 < height:
            queue.append((y + 1, x))
        if x:
            queue.append((y, x - 1))
        if x + 1 < width:
            queue.append((y, x + 1))

    alpha = np.where(background, 0, 255).astype(np.uint8)
    alpha_image = Image.fromarray(alpha, mode="L").filter(ImageFilter.GaussianBlur(0.35))
    rgba = image.convert("RGBA")
    rgba.putalpha(alpha_image)
    bbox = rgba.getbbox()
    if bbox:
        rgba = rgba.crop(bbox)
    # Keep the complete silhouette away from the UI container edges.
    padding = max(24, round(max(rgba.size) * 0.045))
    canvas = Image.new("RGBA", (rgba.width + padding * 2, rgba.height + padding * 2))
    canvas.alpha_composite(rgba, (padding, padding))
    rgba = canvas
    rgba.save(target, optimize=True)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: extract_checker_alpha.py source.png target.png")
    extract(Path(sys.argv[1]), Path(sys.argv[2]))
