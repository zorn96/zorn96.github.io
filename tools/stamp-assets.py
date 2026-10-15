#!/usr/bin/env python3
"""Stamp cache-busting hashes into the site at deploy time.

GitHub Pages serves every file with `Cache-Control: max-age=600`, so browsers
may reuse old copies for up to ten minutes after a deploy. This script runs in
the deploy workflow (.github/workflows/deploy.yml), on the checked-out copy
that gets published, never on the files in the repo:

  1. Every local CSS, JS, and image reference gets `?v=<content hash>`, so a
     changed file has a new URL and can't be served from a stale cache:
       - src="..." / href="..." in the HTML pages
       - url(...) in the stylesheets
       - "assets/....png" style string literals in the scripts
  2. A build ID is written to version.json and into a
     <meta name="build"> tag on every page. js/site.js compares the two and
     reloads once if the page it's showing is older than the deploy.

Usage:

    python3 tools/stamp-assets.py [BUILD_ID]

BUILD_ID defaults to a hash of the stamped site. The workflow passes the
commit SHA.
"""

import hashlib
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

HTML_REF = re.compile(r'''(\b(?:src|href)=)(["'])([^"'#?]+)\2''')
CSS_REF = re.compile(r'''(url\(\s*)(["']?)([^"')#?]+)\2(\s*\))''')
JS_REF = re.compile(r'''(["'])(assets/[^"'#?]+\.(?:png|jpe?g|gif|svg|webp))\1''')


def digest(data):
    return hashlib.sha256(data).hexdigest()[:10]


def local_file(ref, base):
    """The file a relative reference points at, or None for anything else."""
    if re.match(r"^[a-z][a-z0-9+.-]*:|^//|^/", ref, re.I):
        return None  # absolute URL, protocol-relative, data:, mailto:, ...
    if ref.endswith(".html"):
        return None  # pages are covered by the build-ID check instead
    path = (base / ref).resolve()
    return path if path.is_file() and ROOT in path.parents else None


def stamped(ref, base):
    path = local_file(ref, base)
    return ref if path is None else "%s?v=%s" % (ref, digest(path.read_bytes()))


def rewrite(path, pattern, replace):
    text = path.read_text(encoding="utf-8")
    new = pattern.sub(replace, text)
    if new != text:
        path.write_text(new, encoding="utf-8")


def main():
    pages = sorted(ROOT.glob("*.html"))
    if not pages:
        sys.exit("No HTML pages found in %s" % ROOT)

    # Stylesheets and scripts first: their own hashes must reflect the
    # stamped image URLs inside them, so an image change busts them too.
    for css in sorted((ROOT / "css").glob("*.css")):
        rewrite(css, CSS_REF, lambda m: m.group(1) + m.group(2)
                + stamped(m.group(3), css.parent) + m.group(2) + m.group(4))

    for js in sorted((ROOT / "js").glob("*.js")):
        # Script paths resolve against the page, and every page is at the root.
        rewrite(js, JS_REF, lambda m: m.group(1)
                + stamped(m.group(2), ROOT) + m.group(1))

    for page in pages:
        rewrite(page, HTML_REF, lambda m: m.group(1) + m.group(2)
                + stamped(m.group(3), ROOT) + m.group(2))

    build = sys.argv[1] if len(sys.argv) > 1 else digest(
        b"".join(p.read_bytes() for p in pages))

    tag = '<meta name="build" content="%s">\n' % build
    for page in pages:
        text = page.read_text(encoding="utf-8")
        if "</head>" not in text:
            sys.exit("%s has no </head> to put the build tag in" % page.name)
        page.write_text(text.replace("</head>", tag + "</head>", 1),
                        encoding="utf-8")

    (ROOT / "version.json").write_text(json.dumps({"build": build}) + "\n")
    print("Stamped %d pages, build %s" % (len(pages), build))


if __name__ == "__main__":
    main()
