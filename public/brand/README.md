# Logo & brand assets — source of truth

**Roya Vosoughi** — *Reclaim your time.* (v5, cream / ink / petrol,
applied 2026-11-16). Every file here uses the same Signal R mark and the same
wordmark; only the background and text colour change per file.
Regenerate from `components/ui/Logo.tsx` proportions rather than
hand-editing the paths.

**Palette:** Canvas (cream) `#F5EBE0` background, Ink `#1E1E1E` text and dark
surfaces, Petrol `#0C4C59` buttons and accents (Petrol-on-ink `#2A93A3` for
accents on Ink — main petrol is too dark to read there).

**The mark (Signal R):** a rounded single-stroke R whose leg is the one Petrol
stroke — the step from idea to working system. The R is Ink on light and
Canvas on dark; the leg is Petrol on light and Petrol-on-ink on dark. On the
icon it is a Canvas R with an Ink leg on a Petrol tile. Never stretched.
**Wordmark:** the mark *is* the R of "Roya", followed by "oya Vosoughi" in
Space Grotesk Bold, −4% tracking, converted to vector outlines (not live
text) — renders identically everywhere, no font install needed. Always Latin,
in both English and Farsi contexts.

## Which file to use

| File | Background | Use it for |
|---|---|---|
| `roya-logo.svg` / `.png` | transparent, ink | The default — any light background |
| `roya-logo-white.svg` / `.png` | transparent, cream | On ink or other dark surfaces |
| `roya-logo-card.svg` / `.png` | ink rounded card | LinkedIn banner, email signature, social previews |
| `roya-mark.svg` / `.png` | transparent, ink | Just the R, on your own light background |
| `roya-icon.svg` / `.png` / `@256.png` | petrol rounded square | Favicon, app icon, LinkedIn/Instagram avatar |

The site's live favicon is `app/icon.svg` (same as `roya-icon.svg`).

## History

- **v1** (through 2026-08-04): Roya Vosoughi, rounded green R with a separate
  bar. Backed up in `../../brand/backup-logo-v1/`.
- **v2** (2026-08-04 → 2026-09-24): Roya Vosoughi, green R monogram +
  Montserrat SemiBold wordmark, Deep Forest palette. Backed up in
  `../../brand/backup-logo-roya-v2/`, no longer used anywhere.
- **v3** (2026-09-24, same day): rebrand to **Nura** — Deep Indigo / Electric
  Violet / Neon Cyan / Soft White, dark theme.
- **v3.1**: Nura in **navy & coral** — Canvas `#F5F5F7`, Navy
  `#14213D`, Coral `#E07A5F`. Light theme; chosen as the most trustworthy for
  business managers.
- **v4** (2026-10-10 → 2026-11-16): back to **Roya Vosoughi** — a trademark
  search found NURA already registered in software/IT classes (Mooney S.p.A.
  in Italy, NuraLogix in the EU). Cream / ink / cobalt palette (Cobalt `#0047AB`), Signal R mark.
- **v5** (current, 2026-11-16): same name and Signal R mark; the accent moves
  from cobalt to **petrol** `#0C4C59` (calmer, warmer blue-green, still
  trustworthy). Same day refined: main petrol `#0C4C59` (between petrol and
  deep petrol), hover `#0B3B45`, petrol-on-ink `#2A93A3`; the pastel
  petrol-light `#5FB3BF` was removed as too light for the brand.

Full rationale: `../../Roya_Brand_Guide.md` §02.
