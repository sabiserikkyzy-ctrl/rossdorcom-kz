"""Remove a light neutral/checker background from non-white machinery art."""

from pathlib import Path
import sys

import numpy as np
from PIL import Image, ImageFilter


source, target = map(Path, sys.argv[1:3])
image = Image.open(source).convert("RGBA")
rgba = np.asarray(image).copy()
rgb = rgba[:, :, :3]
low = rgb.min(axis=2)
high = rgb.max(axis=2)
neutral = (low >= 225) & ((high - low) <= 20)
alpha = np.where(neutral, 0, rgba[:, :, 3]).astype(np.uint8)
alpha_image = Image.fromarray(alpha, mode="L").filter(ImageFilter.GaussianBlur(0.3))
result = Image.fromarray(rgba, mode="RGBA")
result.putalpha(alpha_image)
bbox = result.getbbox()
if bbox:
    result = result.crop(bbox)
result.save(target, optimize=True)
