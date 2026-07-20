#!/usr/bin/env python3
"""Prepare the photo gallery.

Drop full-size originals (JPEG, PNG, or iPhone HEIC) into assets/photos/.
Then run:

    python3 tools/build-photos.py

For each original this writes a web-sized JPEG into assets/photos/web/ and
regenerates assets/photos/manifest.json, which photos.html reads at runtime.

Static hosting can't list a directory, so the manifest is how the page knows
what exists. Re-run this whenever you add or remove photos.

HEIC is decoded with `sips` (macOS only). EXIF orientation is applied so
portrait phone shots aren't rotated.
"""

import json
import pathlib
import subprocess
import sys
import tempfile

from PIL import Image, ImageOps

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "photos"
WEB = SRC / "web"
MANIFEST = SRC / "manifest.json"

MAX_EDGE = 1800
QUALITY = 82
SOURCES = {".jpg", ".jpeg", ".png", ".heic", ".tif", ".tiff", ".webp"}


def load(path):
    """Open an image, going through sips for formats PIL can't decode."""
    if path.suffix.lower() != ".heic":
        return Image.open(path)

    tmp = pathlib.Path(tempfile.mkdtemp()) / "decoded.jpg"
    result = subprocess.run(
        ["sips", "-s", "format", "jpeg", str(path), "--out", str(tmp)],
        capture_output=True,
    )
    if result.returncode != 0 or not tmp.exists():
        raise RuntimeError("sips could not decode %s" % path.name)
    return Image.open(tmp)


def main():
    if not SRC.is_dir():
        sys.exit("No %s directory found." % SRC.relative_to(ROOT))

    WEB.mkdir(exist_ok=True)

    originals = sorted(
        (p for p in SRC.iterdir() if p.is_file() and p.suffix.lower() in SOURCES),
        key=lambda p: p.name.lower(),
    )
    if not originals:
        sys.exit("No images found in %s" % SRC.relative_to(ROOT))

    entries = []
    for path in originals:
        out = WEB / (path.stem + ".jpg")

        # Skip work that's already done and still current.
        if out.exists() and out.stat().st_mtime >= path.stat().st_mtime:
            with Image.open(out) as done:
                entries.append({"src": "assets/photos/web/" + out.name,
                                "w": done.width, "h": done.height})
            print("  = %s (up to date)" % out.name)
            continue

        try:
            image = load(path)
        except Exception as error:  # noqa: BLE001 - report and keep going
            print("  ! %s skipped: %s" % (path.name, error))
            continue

        with image:
            image = ImageOps.exif_transpose(image).convert("RGB")
            image.thumbnail((MAX_EDGE, MAX_EDGE), Image.LANCZOS)
            image.save(out, "JPEG", quality=QUALITY, optimize=True,
                       progressive=True)
            entries.append({"src": "assets/photos/web/" + out.name,
                            "w": image.width, "h": image.height})

        saved = path.stat().st_size / 1e6, out.stat().st_size / 1e6
        print("  + %-28s %5.1f MB -> %4.1f MB" % (out.name, *saved))

    # Alphabetical by filename, as the page displays them.
    entries.sort(key=lambda e: e["src"].lower())
    MANIFEST.write_text(json.dumps(entries, indent=2) + "\n")

    total = sum((WEB / pathlib.Path(e["src"]).name).stat().st_size for e in entries)
    print("\n%d photos -> %s (%.1f MB total)"
          % (len(entries), MANIFEST.relative_to(ROOT), total / 1e6))


if __name__ == "__main__":
    main()
