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
rsvp.html           RSVP form (name, email, phone, attending) — live
faq.html            Frequently asked questions (edit the Q&A freely)
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

## RSVP backend (Google Sheet, no server)

`rsvp.html` posts to a Google Apps Script Web App that upserts a row per
guest into a private Google Sheet, keyed on **name + email** — resubmitting
with the same name and email updates that guest's row instead of adding a
duplicate. The Sheet is never public; the script runs as you and writes to it,
so guests only ever reach the script, never the data.

Setup (all inside your Google account, free):

1. Follow the header comment in `tools/rsvp-apps-script.gs` — create a Sheet,
   paste the script, set `SHEET_ID` and `SHARED_TOKEN`, deploy as a Web App
   ("execute as me", "anyone can access"), and copy the `/exec` URL.
2. In `js/rsvp.js`, set `ENDPOINT` to that URL and `TOKEN` to the **same**
   string you used for `SHARED_TOKEN`.

Until `ENDPOINT` is set the form still validates and previews, but tells the
guest submissions aren't open yet — so it's safe to deploy before wiring the
backend.

Apps Script returns `Access-Control-Allow-Origin: *` on its final response,
and the form posts a "simple" request (form-encoded, no custom headers, so no
CORS preflight) — so the browser **reads the JSON reply** and only thanks the
guest once the row is confirmed saved. (A browser can't be told to ignore
CORS; this works because the server sends the right header, not because we
bypass anything. It would only break if we sent JSON or a custom header, which
would trigger a preflight Apps Script can't answer.)

The endpoint URL lives in the client JS (unavoidable for a static site); the
`SHARED_TOKEN` keeps casual junk out, but the real protection is that nothing
readable is ever exposed.

**What's collected right now:** name, email, phone, and a single
"Will you be able to attend the Wedding Weekend?" — a rough head count. The
page tells guests a detailed RSVP (individual events, meals) will follow. The
script still has `Events`, `Party Size`, and `Notes` columns ready for that;
they'll just sit empty until the detailed form ships.

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

Password entry is trimmed and **lowercased** before hashing, so phone
auto-capitalisation and caps lock don't matter — "Azaria+Melina" and
"azaria+melina" both work.

Unlocking is remembered in `localStorage`, so the password is typed once per
browser. Clear site data to see the gate again.

## Guest names

The gate also asks for the guest's first and last name (required). They're
stored **uppercased** in session cookies (`am_first`, `am_last`) and read back
into `window.guest` (`{ first, last }`) by `js/site.js`, so pages can tailor
content per guest:

```js
if (window.guest.first === "MELINA") { /* ... */ }
```

Because they're *session* cookies, they clear when the browser closes. The
lock check requires the name cookie too, so the gate reappears when it's
gone — but if the visitor is still unlocked, it only asks for the name again,
not the password. (To make the names persist across sessions instead, give the
cookies a `max-age` in `setSessionCookie` in `js/gate.js`.)

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
- `itinerary.html` — Friday reads "Afternoon Activity TBD"
