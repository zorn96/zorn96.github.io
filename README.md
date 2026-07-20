# Azaria & Melina — October 9, 2027

Static wedding site, built to match the Canva designs in `design_base/`.

## Running it locally

The password gate uses the Web Crypto API, which browsers only expose in a
**secure context**. Opening the `.html` files directly (`file://`) will not
work — the gate will tell you to use https. Serve it instead:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

`localhost` counts as a secure context, as does the live `https://zorn96.github.io`.

## Deploying

It's a plain static site at the repo root, so GitHub Pages needs no build step.
Push to `main`, then in **Settings → Pages** set the source to `main` / `/ (root)`.

## Layout

```
index.html          Home — hero, monogram, live countdown
home.html          Our Special Day
travel.html         About Carmel, airports, hotel blocks
itinerary.html      The weekend, attire guide
things-to-do.html   Local activities (no Canva design — built to match)
photos.html         Gallery (no Canva design — built to match)
rsvp.html           "Coming Soon" placeholder
rsvp-full.html      The finished RSVP page, parked until it goes live
registry.html
css/style.css       Everything; palette + type as CSS custom properties
js/gate.js          Password gate
js/site.js          Nav, footer, countdown — injected on every page
js/photos.js        Reads the photo manifest and builds the gallery
tools/build-photos.py  Resizes photos and regenerates the manifest
assets/img/         Extracted from the Canva exports
assets/photos/      Your originals; web/ holds the resized copies
```

Nav and footer are injected by `js/site.js` from the `PAGES` array, so page
links live in exactly one place. Each page just needs `<div data-nav></div>`.
`rsvp-full.html` is deliberately absent from that array, so nothing links to it.

To put the real RSVP page live, swap the two files — copy `rsvp-full.html`
over `rsvp.html`.

## Adding photos

Drop originals into `assets/photos/` (JPEG, PNG, or iPhone HEIC — HEIC is
converted, since browsers other than Safari can't display it). Then:

```sh
python3 tools/build-photos.py
```

That writes web-sized copies into `assets/photos/web/` and regenerates
`assets/photos/manifest.json`, which `photos.html` reads at load time. Photos
display in alphabetical order by filename.

Static hosting can't list a directory, so a manifest is the only way to do
this without a backend — **re-run the script whenever you add or remove
photos**, or the page won't see the change.

The resize matters: the seven originals totalled 43 MB, which would have been
a miserable download on phone data. The web copies come to 3.2 MB. Consider
adding `assets/photos/*.jpg` (the originals) to `.gitignore` and keeping only
`web/` in the repo, if you'd rather not push the full-size files.

## The password gate — what it does and doesn't do

The passphrase is not in the source. `js/gate.js` stores only the SHA-256
digest, and hashes what the visitor types to compare.

**This is not real access control.** Be clear-eyed about it:

- The digest is unsalted and the passphrase is guessable from the couple's
  names. Anyone who takes the digest can crack it in seconds.
- The gate only hides content with CSS. Every page's full HTML is already
  downloaded — View Source, or `curl https://zorn96.github.io/travel.html`,
  returns everything with no password at all.
- Disabling JavaScript shows the whole site.

It stops search engines and casual link-followers. It does not stop anyone who
actually wants in. **Do not put anything on this site you'd mind a stranger
reading** — home addresses, guest contact details, anything financial.

If you want protection that actually holds, the usual options are a host with
real server-side auth (Netlify/Cloudflare Access), or encrypting the page
content with the passphrase so the ciphertext is useless without it
(e.g. `staticrypt`). Happy to switch it over.

Unlocking is remembered in `localStorage`, so guests type it once per browser.
Clear site data to see the gate again.

## Changing the password

```sh
printf 'your new passphrase' | shasum -a 256
```

Put the result in `DIGEST` in `js/gate.js`. Input is trimmed and lowercased
before hashing, so hash the lowercase form.

## Assets still to replace

Some backgrounds had text baked into the Canva export and couldn't be
recovered cleanly. These are best-effort crops — re-export each from Canva
without its text layer and overwrite the file at the same path, no code
changes needed:

| File | Problem |
| --- | --- |
| `assets/img/hero-vineyard.png` | Only a 1366×298 text-free band of the illustration. Stretched to fill the hero, so it's soft. **Most visible issue** — worth re-exporting first. |
| `assets/img/silk.png` | 115px strip from the right edge of the home design. |
| `assets/img/vineyard-band.jpg` | 180px-wide strip — the only column of the watercolour free of the design's baked-in nav text. It sits under a 72% green overlay, so the upscaling doesn't really show. |

`assets/img/cypress.jpg` is done — it came from a clean full-res export
(`design_base/registry-background.PNG`), downscaled to 2400px and saved as an
82-quality JPEG, 3.3 MB → 220 KB. That's the pattern for the remaining three:
export clean at full size, then downscale rather than dropping the original
straight in.

Hotel and registry logos (`logo-*.png`, `reg-*.png`) were lifted from the
design and colour-keyed to transparent PNGs, so they sit on any background.
If you want crisper versions, official vector assets from each brand's press
page would beat these upscaled crops.

## Substitutions

Canva fonts are licensed and mostly unavailable on the web. Nearest Google Font
equivalents are used throughout:

| Design | Used |
| --- | --- |
| Display serif (names, section titles) | Playfair Display |
| Script (*and*, *Friday*, signoffs) | Pinyon Script |
| Body serif | Cormorant Garamond |
| Sans (itinerary times, activity lists) | Montserrat |

Text is real HTML rather than sliced images, so it's selectable, searchable,
and reflows on mobile — very close to the designs, not pixel-identical.

## Placeholders to fill in

- `travel.html` — the four "Reserve" buttons are `<button disabled>` until
  booking opens. Swap each back to `<a class="btn" href="...">Reserve</a>`.
- `rsvp-full.html` — the "Click to Link" button points at `#`
- `itinerary.html` — Friday reads "Afternoon Activity TBD"
