# Local implementation prompt — Support Staff Solutions

**Read this whole file before touching anything.** It exists because the session that made
the current commit ran in a sandbox whose egress policy allowed only
`raw.githubusercontent.com` and `registry.npmjs.org`. Company websites, Wikimedia and every
logo CDN returned `403 CONNECT tunnel failed`, so **nine client logos could not be
downloaded**. Everything else the client asked for is already done and on the branch.

Run this on a machine with normal network access.

---

## 0 · What is already done — do not redo it

| Client request | State |
|---|---|
| Remove Agro Import | **Done.** Both `<li>`s removed; `images/logo-miami-agro-import.jpg` deleted from git |
| 13 requested companies represented, no duplicates | **Done.** 14 cells total (the 13 plus Falcon Farms, which the client did not ask to remove) |
| `management@supportstaffsolutionsusa.com` | **Already correct** before this round. Verified in 8 positions; no edit was needed |
| Alejandro Amado biography English | **Done.** Five paragraphs rewritten in `about-us.html`, no fact changed |
| Logo strip layout for a larger set | **Done.** The 2/3/6 grid was replaced with wrap-and-centre flex |

**The only work left is the nine logo files, plus two pre-existing asset debts.**

---

## 1 · Repo shape

Hand-written static HTML. No framework, no build step, no CMS, no partials. Five pages:
`index.html`, `about-us.html`, `services.html`, `contact-us.html`,
`employment-application-form.html`. CSS is four files in load order: `tokens.css`,
`base.css`, `components.css`, `pages.css`.

```bash
npm install                 # only dependency is nodemailer, for the form tests
npm test                    # node --test test/*.test.js — THE GATE. 11 tests.
node .claude/serve.js . 4321   # NOTE: .claude/ is gitignored in this repo, so this file
                               # may not exist in your checkout. Any static server with
                               # cleanUrls (serve /about-us from about-us.html) will do.
```

Commit author **must** be `hosting@senaviacorp.com` or Vercel rejects the deploy with
`TEAM_ACCESS_REQUIRED`:

```bash
git config user.email hosting@senaviacorp.com
git config user.name "Senavia Corp"
```

Branch: `claude/eloquent-dirac-lbysat`.

---

## 2 · The nine missing logos

They live in the client logo strip, which is duplicated in **two** files and must stay in
sync:

- `index.html` — `<section class="brands u-page">`, images use `loading="eager"`
- `about-us.html` — `<section class="brands u-section u-page">`, has an extra
  `<p class="brands__lead">`, images use `loading="lazy"`

Each company that has no logo file is currently rendered as a **wordmark cell**:

```html
<li class="logos__item"><span class="logos__wordmark">Continental Flowers</span></li>
```

When you obtain a logo, replace that whole `<li>` with an image cell, in **both** files:

```html
<li class="logos__item" style="--s:0.9"><img src="images/logo-continental-flowers.svg"
    width="W" height="H" loading="eager" decoding="async" alt="Continental Flowers"></li>
```

`width`/`height` are the asset's intrinsic pixel dimensions (they only reserve the aspect
ratio and prevent layout shift). `loading` is `eager` in `index.html`, `lazy` in
`about-us.html`. Everything else is identical between the two files.

### The list, in strip order

| # | Company as displayed | Target filename | Sourcing note |
|---|---|---|---|
| 1 | Continental Flowers | `images/logo-continental-flowers.svg` | Miami-area flower importer |
| 2 | Alpine Fresh | `images/logo-alpine-fresh.svg` | Miami-area produce/flower importer |
| 3 | American Consolidation Logistics | `images/logo-american-consolidation-logistics.svg` | Verify against American **Floral** Cargo, a different Miami company that appears in the same searches |
| 4 | Champion Air Cargo | `images/logo-champion-air-cargo.svg` | Client wrote "Champion Air Cargo Inc." The Doral company registers as **Champion Air Cargo De Colombia Inc**; do not confuse it with **Champion Air**, the defunct US charter airline |
| 5 | Sunshine Bouquet | `images/logo-sunshine-bouquet.svg` | Client wrote "Sunshine Bouquet Company". Brand site is `sunshinebouquet.com`. The largest of the nine, so a brand/press kit is most likely to exist |
| 10 | CBIZ | `images/logo-cbiz.svg` | Public company (NYSE: CBZ). Investor-relations pages usually publish a downloadable mark |
| 11 | Rock Garden | `images/logo-rock-garden.svg` | Ambiguous name — confirm with the client which Rock Garden this is before using any asset |
| 12 | Traza Design & Manufacturing | `images/logo-traza-design-manufacturing.svg` | **Name discrepancy, confirm first.** The company matching the description trades as **Trazza** Design & Manufacturing, two z's, `trazzadesign.com`, Miami/Medley, 3D printing and CNC since 2007. The client wrote it with one z on both of their lists. If Trazza is the right company, correct the displayed name here **and** in the Ospina repo, which carries the same entry |
| 13 | Go Fish Cargo | `images/logo-go-fish-cargo.svg` | Not confidently identified. Searches surface *Miami Fish Cargo LLC*, which may or may not be the same business. Confirm with the client |

Positions 6–9 and 14 already have files and must not be touched: U.S. Greens Corp,
Bouquet Collection, Servientrega, Pipeline, Falcon Farms.

### Two naming decisions already made — do not "fix" them by duplicating

- The client's list says **"US Green"**. The existing file is `logo-us-greens-corp.png` and
  the image literally reads *U.S. Greens Corp — worldwide distributors of floral cut greens
  & flowers*. The `alt` describes the image, so it stays as-is. Same company, not a missing
  entry.
- The client's list says **"Servientrega International"**. The existing file is the
  *Servientrega — Centro de Soluciones* lockup, which is a different business unit of the
  same group. It was left as-is because the `alt` must describe the image on screen. **If
  the client means the International unit, get that lockup and save it as
  `images/logo-servientrega-international.png`**, then swap the cell and its `alt`. Do not
  add a second Servientrega cell.

### Two asset debts the repo already had

1. **The Elite Flower.** `images/logo-the-elite-flower.svg` exists but is not in the strip:
   all 28 of its paths are `fill:rgb(100%,100%,100%)`, so it is invisible on the white band.
   The purple "by Hannaford" variant is needed. Adding it makes 15 cells — the layout
   handles that without changes now (see §4).
2. **Servientrega needs a PNG with alpha.** The current PNG is 25.3% opaque white pixels.
   It only disappears because the band sits on pure `--c-paper` (#ffffff). Until a
   transparent version arrives, **the band cannot move to `--c-paper-2` or to a colour
   plane.** This is why `.brands` is separated from the services section by a hairline
   rather than a background change (`css/pages.css`, `.brands`).

---

## 3 · Asset sourcing rules

In preference order:

1. The company's own website.
2. Its official press / media / brand kit.
3. An official company business profile that publishes the asset.
4. A reputable public brand repository, or Wikimedia Commons where appropriate.

Prefer SVG. Otherwise a transparent PNG, high resolution, ≥360px wide. Optimize anything
oversized.

**Never:** hotlink; ship a watermarked image, a screenshot, a search-result thumbnail, a
low-resolution JPEG, an unofficial recreation, or an AI-generated approximation of a mark.

**If you cannot confidently identify a company's official logo, do not guess.** Leave the
wordmark cell exactly as it is — it is a designed state, not a placeholder — and report the
company as unresolved.

---

## 4 · Design system rules that constrain this work

### The logo strip

`css/components.css`, the `/* logos cliente */` block. Read the comment there first; it
carries the reasoning, and it is the file of record.

- **Per-logo optical scale `--s`.** Logos are not equalized by pixels, they are equalized by
  visual weight. `max-height: calc(3.5rem * var(--s, 1))`, with `width/height: auto` and
  `max-width: 100%`, so nothing is ever distorted. Current values: U.S. Greens Corp `0.8`,
  Bouquet Collection `1.3` (vertical lockup), Servientrega `1`, Pipeline `0.78`,
  Falcon Farms `0.92`. Set a new logo's `--s` by eye against these, then check it against
  the measurement in §5.
- **Cell height is 5rem and deliberate.** It covers the tallest logo (Bouquet Collection at
  3.5rem × 1.3 = 72.8px) and the longest name at three lines. `.logos` uses
  `align-items: stretch`, not `center` — with `center`, cells of different internal heights
  landed at different vertical offsets and the row looked ragged.
- **Layout no longer depends on the number of marks.** The old 2/3/6 column grid was chosen
  because six divides by all three. Fourteen divides only by 2 and 7, so the grid was
  replaced by `display: flex; flex-wrap: wrap; justify-content: center` with
  `flex: 0 1 8.5rem`. Measured: 2 per row at 375px, 4 at 768px, 5 at 1024px, 6 at 1200px,
  7 at 1440px — so 7+7 exactly on desktop, and a short final row is centred rather than
  stranded at the left. Adding a fifteenth mark needs no CSS change.
- **Third-party marks are never recoloured** and never take the SSS green. The resting grey
  is `filter: grayscale(1); opacity: .78` — an attenuation, not a tint. `.78` is not
  arbitrary: below it several marks fell under 3:1 against mid-grey on white.
- **Wordmark colour is `--c-mute` (#5c6167), 6.26:1 on white.** It is text, so it must meet
  the AA text minimum; the logos beside it are images, which do not. That is why the two are
  attenuated differently and why the wordmark cannot simply be made lighter to match.

### Site-wide

- **The diagonal is 3.43°, constant at every width**, expressed as `6vw` rather than a
  percentage. `clip-path` resolves percentages per axis against the element box, so a
  percentage would make the angle drift with the aspect ratio. Use the `.plane` primitive in
  `base.css`; never put the diagonal on the element that holds text; one diagonal per screen
  height at most; nothing `position: fixed` may live inside a clipped section.
- **Green is surface, never ink on white.** `#43b556` on white is 2.63:1 and fails AA even
  at large sizes. Green fill takes `--c-ink` text (6.65:1). For green *as text* on light, the
  only permitted value is `--c-green-ink` `#2f7d3d` (5.09:1). The full table is at the top of
  `css/tokens.css` — read it before touching a colour.
- **One animated moment on the site** (the hero), added inside
  `@media (prefers-reduced-motion: no-preference)` rather than removed under `reduce`, so the
  default state is the visible one. No content visibility may depend on JavaScript.
- **`.w-form-done` and `.w-form-fail` carry `display: none` in `css/components.css`.** That
  rule came from the deleted `webflow.css`, and `js/form-submit.js` only ever sets
  `display: block`. Remove it and both form pages show the success and error panels
  permanently, **without throwing any error.**

---

## 5 · Test gates

`npm test` runs `test/assets.test.js` (4 tests) and `test/submit.test.js` (7 tests).

The asset tests will reject your work if:

1. **Any local `src`, `href` or `url()` in any root `*.html` or `css/*` does not resolve on
   disk.** This is the one that catches a logo referenced before its file is added.
2. **Any `srcset` candidate does not resolve.** Parsed separately, because `srcset` slipped
   past the `src="` regex once.
3. **Any asset is served from a third party.** The allowed-host list is literally `[]` — no
   CDN, no Google Fonts, no external image host. Download everything into `images/`.
4. Anything is still served from a Webflow host.

There is **no contrast test and no image-dimension test** in this repo. Contrast is enforced
by the comments in `css/tokens.css` and `AUDITORIA-DISENO.md`, by hand. If you change the
wordmark colour or the logo opacity, compute the ratio yourself.

`test/submit.test.js` covers `api/submit.js` and is unrelated to this work, but it must stay
green. It needs `nodemailer` installed.

### Measuring a new `--s`

Serve the site, then in the browser console on `/`:

```js
[...document.querySelectorAll('.logos__item img')].map(i => {
  const r = i.getBoundingClientRect()
  return `${i.alt}: ${Math.round(r.width)}x${Math.round(r.height)}`
})
```

A new mark should land in the same height band as its neighbours — roughly 31–56px for
horizontal lockups, up to 73px for a vertical one. If it renders much taller or shorter,
adjust `--s` and re-measure. Also confirm the row counts above still hold at 375 / 768 /
1440 and that no row ends up with a single stranded item.

---

## 6 · Acceptance checklist

- [ ] Every logo obtained is the official current mark, downloaded locally into `images/`,
      not hotlinked, not a recreation.
- [ ] Each replaced cell is updated in **both** `index.html` and `about-us.html`, with the
      correct `loading` value in each.
- [ ] `alt` text describes what is actually in the image.
- [ ] Every new `--s` measured, not guessed.
- [ ] Agro Import appears nowhere, in markup or in `images/`.
- [ ] No company appears twice under a naming variant — particularly US Green /
      U.S. Greens Corp and the two Servientrega lockups.
- [ ] `npm test` green.
- [ ] At 375 / 768 / 1440: no horizontal scroll, no stranded single-item row, no logo cut
      off or stretched, wordmark and logo cells read at comparable weight.
- [ ] Any company whose logo could not be confidently identified is still a wordmark cell and
      is named in your final report.
- [ ] `README.md` item 5 updated to match whatever is still outstanding.
