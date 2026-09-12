# Reference Assets

Visual reference material for Clicks'n'Ticks GOALS. Design only — no application code.

## Files

| Filename | Type | Dimensions | Description |
| --- | --- | --- | --- |
| `01-GOALS-APPROVED-DASHBOARD.png` | PNG | 1214 × 1295 | Approved dashboard mockup — forest-green sidebar, cream canvas, floral hero |
| `02-GOALS-SAGE-PALETTE.jpg` | JPEG | 1080 × 1233 | Sage / camel / terracotta material moodboard |
| `03-CLICKSNTICKS-LOGO.png` | PNG | 2120 × 742 | Master brand logo — dusty rose on cream |

## Palette — brand-led

**Decision: the logo is the source of truth.** The green/sage/terracotta scheme in
`01` is superseded on colour. Its *layout* remains approved and unchanged.

### Brand core — sampled from `03`

| Token | Hex | Role |
| --- | --- | --- |
| `rose` | `#D49790` | Brand accent. Decorative and large-scale only — 2.12:1 on canvas |
| `rose-pale` | `#DBB3AC` | Tile fills, mid card layers |
| `rose-light` | `#EFCEC8` | Tints, Today's Focus panel |
| `brand-cream` | `#FAF5EF` | Logo ground |
| `ink` | `#111111` | Wordmark |

### Derived UI tokens — contrast-validated against WCAG AA

| Token | Hex | On canvas | Role |
| --- | --- | --- | --- |
| `sidebar` | `#241C1B` | 14.52:1 | Warm near-black nav, dark cards |
| `rose-deep` | `#A85F58` | 4.11:1 | Progress fills, links, large text |
| `rose-deeper` | `#7C4340` | 6.68:1 | Complete state, emphasis, body text |
| `clay` | `#9A5C33` | 4.62:1 | Behind/caution state, debits |
| `muted` | `#6E5B58` | 5.53:1 | Secondary text |
| `canvas` | `#F4EEE9` | — | Page ground |
| `surface` | `#FFFCF9` | — | Card fills |
| `track` | `#E8DAD2` | — | Progress track |

### Rules this palette must follow

1. **Brand `rose` is never a progress fill.** At 1.78:1 against `track` it is
   invisible as a bar. Fills use `rose-deep`, `rose-deeper` or `clay`.
2. **Colour never carries status alone.** `rose-deep` and `clay` differ by only
   1.12:1 in luminance and are indistinguishable to many viewers with colour
   vision deficiency. Every status also carries a labelled chip and an icon —
   tick for complete, warning for behind.
3. **Rose is not a semantic colour.** It is the brand accent; good/warning/
   complete are encoded by the derived tokens plus the non-colour cues above.

### Moodboard tones — from `02`

Retained as supporting neutrals only, not as UI status colours.

| Token | Hex |
| --- | --- |
| Olive sage | `#879179` |
| Camel | `#CC9D73` |
| Oat linen | `#DED2C2` |
| Warm grey | `#BFB2A2` |
| Taupe | `#A89B8B` |

## Typography

The logo pairs a high-contrast serif wordmark with a wide-tracked geometric sans.
Mockup uses **Playfair Display** (display) and **Jost** (UI/body) as the closest
available match, pending confirmation of the original brand faces.

## Resolved

The sub-brand question is settled: GOALS carries the master brand's rose
colourway. The tagline discrepancy is unresolved — the logo reads
`PLAN ORGANISE ACHIEVE`, the dashboard sidebar reads `PLAN · SAVE · ACHIEVE`.
