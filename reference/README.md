# Reference Assets

Visual reference material for Clicks'n'Ticks GOALS. Design only — no application code.

## Files

| Filename | Type | Dimensions | Description |
| --- | --- | --- | --- |
| `01-GOALS-APPROVED-DASHBOARD.png` | PNG | 1214 × 1295 | Approved dashboard mockup — forest-green sidebar, cream canvas, floral hero |
| `02-GOALS-SAGE-PALETTE.jpg` | JPEG | 1080 × 1233 | Sage / camel / terracotta material moodboard |
| `03-CLICKSNTICKS-LOGO.png` | PNG | 2120 × 742 | Master brand logo — dusty rose on cream |

## Palette — Clicks'n'Ticks GOALS, Sage Edition

**Authority: `01-GOALS-APPROVED-DASHBOARD.png` and `02-GOALS-SAGE-PALETTE.jpg`.**
The Sage/Botanical identity is the shipping GOALS product. The Clicks'n'Ticks
logo remains the master brand mark, adapted to this palette; the master brand's
dusty rose does not override the GOALS colourway.

### Approved colourway

| Name | Hex | Semantic token | On background | Role |
| --- | --- | --- | --- | --- |
| Primary Forest | `#022825` | `primary` | 14.25:1 | Sidebar, dark cards, complete state |
| Muted Eucalyptus | `#4A6C6A` | `secondary` / `success` | 5.21:1 | On-track, links, icons |
| Terracotta | `#864026` | `accent` / `warning` | 6.85:1 | Behind state, Projected Value tile |
| Soft Peach | `#CA8663` | `accent-soft` | 2.68:1 | Decoration only |
| Sage | `#96B0A4` | `tint` | 2.10:1 | Decoration only |
| Warm Beige | `#DBBC9E` | `warm` | 1.62:1 | Decoration only |

Supporting surfaces, derived: background `#F2EDE5`, surface `#FCFAF6`,
track `#E7DCCB`, border `#E2D8C8`, text `#1B2523`, muted text `#6B635A`.

### Rules the code enforces

1. **Sage, Soft Peach and Warm Beige are never text and never progress fills.**
   All three fall under 3:1 on the background, and under 2.2:1 against the
   track. Fills only ever use `success`, `warning` or `primary`.
2. **Colour never carries status alone.** Success and warning sit **1.31:1**
   apart in luminance in Sage, and 1.11:1 in Blush — indistinguishable to many
   viewers with colour vision deficiency. Every status also carries a label and
   an icon.
3. **No component holds a colour.** Components reference semantic tokens only.

## Editions

One engine, one component system, one calculation engine, one data model, with
interchangeable visual editions. Each edition is a single block of custom
properties in `src/app/globals.css`; switching sets `data-edition` on `<html>`.

| Edition | Status | Character |
| --- | --- | --- |
| **Sage** | Default, shipping | Forest structure, sage and eucalyptus support, terracotta and soft peach accents, warm beige ground |
| **Blush** | Preserved, not default | The rose treatment, kept whole so it can become a separate edition |

An edition changes no calculation, no stored data, no navigation and no
behaviour. Adding one means adding one selector block and nothing else.

## Master brand reference — from `03`

Logo colours, for brand documents. Not the GOALS UI palette.

| Role | Hex |
| --- | --- |
| Dusty rose | `#D49790` |
| Rose light | `#EFCEC8` |
| Brand cream | `#FAF5EF` |
| Ink | `#111111` |

## Moodboard tones — from `02`

| Token | Hex |
| --- | --- |
| Olive sage | `#879179` |
| Camel | `#CC9D73` |
| Oat linen | `#DED2C2` |
| Warm grey | `#BFB2A2` |
| Taupe | `#A89B8B` |

## Typography

Playfair Display (display) with Jost (UI/body), matching the logo's
serif-and-geometric pairing, pending confirmation of the original brand faces.

## Goal artwork

Goal cards and the goal detail hero support a user-selected photograph, stored
on the device in IndexedDB. Where there is no photograph, a category
illustration is drawn as inline SVG from edition tokens — so it themes with the
product, needs no network request, and cannot fail to load.

Photography that would improve the product is listed in the project README.

## Open item

The logo tagline reads `PLAN ORGANISE ACHIEVE`; the dashboard sidebar reads
`PLAN · SAVE · ACHIEVE`.
