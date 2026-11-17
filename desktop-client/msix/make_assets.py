"""Generate the MSIX visual assets from assets/clipsync.png (1024x1024 RGBA).

Usage: python msix/make_assets.py <output Assets dir>

Square44x44 gets the unplated/targetsize variants so the taskbar and Start
menu show the icon without a coloured plate behind it.
"""
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE = os.path.join(HERE, "..", "assets", "clipsync.png")

# name -> (width, height, icon size inside the canvas)
TILES = {
    "StoreLogo.png": (50, 50, 50),
    "Square150x150Logo.png": (150, 150, 104),
    "Square44x44Logo.png": (44, 44, 44),
    "SmallTile.png": (71, 71, 50),
    "LargeTile.png": (310, 310, 214),
    "Wide310x150Logo.png": (310, 150, 104),
}
TARGET_SIZES = (16, 24, 32, 48, 256)


def render(icon: Image.Image, width: int, height: int, size: int) -> Image.Image:
    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    scaled = icon.resize((size, size), Image.LANCZOS)
    canvas.paste(scaled, ((width - size) // 2, (height - size) // 2), scaled)
    return canvas


def main(out_dir: str) -> None:
    os.makedirs(out_dir, exist_ok=True)
    icon = Image.open(SOURCE).convert("RGBA")
    for name, (w, h, size) in TILES.items():
        render(icon, w, h, size).save(os.path.join(out_dir, name))
    for size in TARGET_SIZES:
        img = render(icon, size, size, size)
        img.save(os.path.join(out_dir, f"Square44x44Logo.targetsize-{size}.png"))
        img.save(os.path.join(out_dir, f"Square44x44Logo.targetsize-{size}_altform-unplated.png"))
    print(f"MSIX assets written to {out_dir}")


if __name__ == "__main__":
    main(sys.argv[1])
