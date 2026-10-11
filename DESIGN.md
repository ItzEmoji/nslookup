---
name: nslookup
description: A DNS lookup tool laid out like the dashboard operators already know, where each lookup is a zone and each check a record row.
colors:
  canvas: "#f7f7f8"
  surface: "#ffffff"
  surface-2: "#fafafa"
  surface-3: "#f2f2f3"
  hover: "#f4f4f5"
  border: "#e0e0e2"
  border-strong: "#c8c8cc"
  text: "#1d1d1f"
  text-2: "#4d4d52"
  text-3: "#6b6b70"
  action-blue: "#0051c3"
  action-blue-hover: "#003f99"
  action-blue-soft: "#e8f0fc"
  on-blue: "#ffffff"
  link: "#0051c3"
  signal-orange: "#f38020"
  signal-orange-soft: "#fef1e6"
  ok: "#157f3b"
  ok-soft: "#e5f4ea"
  warn: "#8a4b00"
  warn-soft: "#fff1d6"
  warn-line: "#f0b44c"
  fail: "#b42318"
  fail-soft: "#fdeceb"
  note: "#4d4d52"
  note-soft: "#eeeef0"
  focus: "#0051c3"
  canvas-dark: "#121213"
  surface-dark: "#1c1c1e"
  surface-2-dark: "#202023"
  surface-3-dark: "#26262a"
  border-dark: "#313136"
  border-strong-dark: "#46464c"
  text-dark: "#f2f2f3"
  text-2-dark: "#c2c2c7"
  text-3-dark: "#9a9aa1"
  action-blue-dark: "#2f74e0"
  action-blue-hover-dark: "#4a88ec"
  action-blue-soft-dark: "#1a2a45"
  link-dark: "#79aaff"
  ok-dark: "#5fcf86"
  ok-soft-dark: "#173322"
  warn-dark: "#f5c060"
  warn-soft-dark: "#3a2c10"
  fail-dark: "#ff8a80"
  fail-soft-dark: "#3d1a18"
  note-soft-dark: "#2c2c31"
typography:
  headline:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "26px"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.02em"
    fontFeature: "\"cv11\", \"ss01\""
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "\"cv11\", \"ss01\""
  body-table:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.5
  value-mono:
    fontFamily: "ui-monospace, SF Mono, Cascadia Mono, Cascadia Code, Menlo, Consolas, Liberation Mono, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.55
    fontFeature: "\"tnum\""
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  pill: "999px"
spacing:
  xxs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  xxl: "32px"
components:
  button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "32px"
  button-hover:
    backgroundColor: "{colors.hover}"
  button-primary:
    backgroundColor: "{colors.action-blue}"
    textColor: "{colors.on-blue}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "32px"
  button-primary-hover:
    backgroundColor: "{colors.action-blue-hover}"
  button-danger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fail}"
    rounded: "{rounded.sm}"
    height: "32px"
  button-danger-hover:
    backgroundColor: "{colors.fail-soft}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "0 10px"
    height: "36px"
  topbar-search:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "0 64px 0 34px"
    height: "34px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "18px 20px 16px"
  card-foot:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text-2}"
    padding: "11px 20px"
  table-header:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text-2}"
    typography: "{typography.label}"
    padding: "9px 16px"
  badge-ok:
    backgroundColor: "{colors.ok-soft}"
    textColor: "{colors.ok}"
    rounded: "{rounded.xs}"
    padding: "0 8px"
    height: "22px"
  badge-warn:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.warn}"
    rounded: "{rounded.xs}"
    padding: "0 8px"
    height: "22px"
  badge-fail:
    backgroundColor: "{colors.fail-soft}"
    textColor: "{colors.fail}"
    rounded: "{rounded.xs}"
    padding: "0 8px"
    height: "22px"
  badge-note:
    backgroundColor: "{colors.note-soft}"
    textColor: "{colors.note}"
    rounded: "{rounded.xs}"
    padding: "0 8px"
    height: "22px"
  side-item:
    textColor: "{colors.text-2}"
    rounded: "{rounded.sm}"
    padding: "0 10px"
    height: "34px"
  side-item-active:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.text}"
  chip:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text-2}"
    rounded: "{rounded.pill}"
    padding: "0 10px"
    height: "26px"
  chip-hover:
    backgroundColor: "{colors.action-blue-soft}"
    textColor: "{colors.link}"
  code-block:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text}"
    typography: "{typography.value-mono}"
    rounded: "{rounded.sm}"
    padding: "10px 10px 10px 14px"
  answer-differs:
    backgroundColor: "{colors.warn-soft}"
  answer-match:
    backgroundColor: "{colors.action-blue-soft}"
---

# Design System: nslookup

## Overview

**Creative North Star: "The Familiar Console"**

nslookup wears the shape of a hosting dashboard the operator already knows by muscle memory: a 56px top bar, a 240px left sidebar, white cards on a pale canvas, and ruled tables. A lookup reads as a zone; every DNS type, mail record and certificate is a row with a status. Nothing about the frame asks to be learned, so all the attention goes to the values. The direction contract pins this world to the Cloudflare dashboard's grammar, but the product carries none of Cloudflare's identity: its own mark is an orange rounded square holding a white magnifier.

The surface is dense and quiet. Type sits at 13 to 14px, borders are 1px hairlines, and color mostly means something: blue is something you can do, orange is where you are, and green, amber, red and grey are verdicts. Depth is flat; cards are separated by borders and canvas, never by shadow. The one signature move is in-place resolver comparison: opening a record row reveals each resolver's answers side by side, hovering a value lights up the same value in every resolver, and values that some resolvers did not return carry an amber fill and a "not from X" note.

**Key Characteristics:**
- Dashboard shell: sticky 56px top bar, 240px sidebar that becomes a drawer under 900px.
- White 8px-radius cards with 1px borders on a #f7f7f8 canvas; flat, no decorative shadows.
- Inter for interface text, system monospace for every value (domains, records, IPs, TTLs, timings).
- Blue for actions and links only; orange for the brand mark and the active-nav bar only.
- Four status badges (ok, warn, fail, note), each a soft fill with a strong text color and an icon.
- Full light and dark token sets, following the OS by default with a `data-theme` override.

## Colors

A neutral grey ramp carries nearly everything; two brand hues each own exactly one job, and four status hues carry verdicts.

### Primary
- **Action Blue** (`action-blue`): primary buttons, links, link-buttons ("Details", "Show N more", "Raw response"), focus rings, the input focus border, checked toggles and selected record-type tags. Its soft tint (`action-blue-soft`) is the input focus halo, chip hover, selection color and the hover-link highlight in the resolver comparison. In dark mode the button fill lifts to `action-blue-dark` and links to the lighter `link-dark` for contrast.

### Secondary
- **Signal Orange** (`signal-orange`): the brand mark's square and the 3px bar at the left edge of the active sidebar item. Nothing else.

### Status
- **Verdict Green** (`ok` on `ok-soft`): passing checks, the "Agree" dot, sidebar section checkmarks, copied state.
- **Review Amber** (`warn` on `warn-soft`): "Split", "Issue" and review badges, slow resolver timings, the "not from X" notes, and the disagreeing-value fill. `warn-line` is the amber rule color.
- **Failure Red** (`fail` on `fail-soft`): failed checks, resolver errors, the danger button, the danger card border.
- **Note Grey** (`note` on `note-soft`): informational badges such as "Needs a selector".

### Neutral
- **Canvas Grey** (`canvas`): page background behind cards and the shell.
- **Card White** (`surface`): cards, top bar, sidebar, inputs, modals.
- **Inset Grey** (`surface-2`): table headers, card footers, code blocks, expanded rows, row hover.
- **Pressed Grey** (`surface-3`): active sidebar item, segmented-control track.
- **Hairline** (`border`) and **Firm Hairline** (`border-strong`): card and table rules; input, button and tag outlines.
- **Ink / Secondary Ink / Muted Ink** (`text`, `text-2`, `text-3`): body text; descriptions and inactive nav; meta, placeholders and icons.

### Named Rules
**The One Job Per Hue Rule.** Blue means "you can act here"; orange means "this is the product / you are here". Blue never decorates and orange never marks an action, a status or a heading.

**The Verdict Pair Rule.** Every status is a soft fill plus a strong text in the same hue, with an icon, so the meaning survives without color. Status hues never appear as decoration.

**The Two Theme Rule.** Every surface, text and status token has a dark counterpart (the `-dark` keys). Dark applies under `prefers-color-scheme: dark` unless `data-theme="light"` is set, and always under `data-theme="dark"`. Signal Orange keeps its value in both themes.

## Typography

**Body Font:** Inter (with system-ui, -apple-system, Segoe UI, Roboto fallbacks), loaded at weights 400 to 700, with `cv11` and `ss01` enabled.
**Label/Mono Font:** the system monospace stack (ui-monospace, SF Mono, Cascadia Mono, Menlo, Consolas) with tabular numerals.

**Character:** Inter does the interface talking at small, firm sizes; monospace marks anything the operator might copy into a terminal. The split itself is information.

### Hierarchy
- **Headline** (650, 26px, 1.2, -0.02em; 22px under 900px): the page or zone title, such as the looked-up domain.
- **Title** (600, 16px, 1.3, -0.01em): card titles ("DNS records", "Mail"). Section titles use 600 at 15px; modal titles 600 at 17px.
- **Body** (400, 14px, 1.5): default text and page descriptions, capped near 70ch.
- **Body Table** (400, 13.5px): table cells, sidebar items, key/value lists. Secondary lines drop to 12.5 to 13px in `text-2`.
- **Label** (600, 12px): table headers, sidebar group labels, badges. Sentence case, no uppercase tracking.
- **Value Mono** (400, 13px, 1.55): record values, the record type column, curl strips, code blocks, timings and TTLs (12px).

### Named Rules
**The Copyable Is Mono Rule.** If a string could be pasted into a shell (a domain, record, IP, TTL, command), it is set in monospace. Prose and labels are never mono.

## Layout

The shell is a CSS grid: a sticky 56px top bar (`--topbar-h`), then a 240px sidebar (`--sidebar-w`) beside a fluid main column. The sidebar is sticky under the top bar and scrolls on its own. Main content is padded 28px 32px 64px and centered at a 1120px max width (920px for narrow pages such as Settings).

Spacing follows a 4px base used mostly in steps of 4, 8, 12, 16, 20, 24 and 32px. Cards stack with a 20px gap and pad their heads at 18px 20px 16px and bodies at 0 20px 20px. Table cells are 11px 16px, with 20px at the outer edges so cell text aligns with the card head. The home view uses a two-column card grid with a 20px gap.

Responsive behavior:
- **Under 1100px:** the record table drops its Source column.
- **Under 900px:** the sidebar becomes a fixed off-canvas drawer (min(280px, 85vw)) that slides in over a scrim, opened from a menu button; top-bar text links hide, the wordmark text hides beside the mark, the lookup field takes the remaining width, and card and table padding tightens to 16px.
- **Under 640px:** record tables restack into a grid per row (type, status and Details on one line; content below), certificate tables become labelled lists, and the lookup button wraps under the field.

## Elevation & Depth

The system is flat. Cards, the top bar and the sidebar sit at the same level and are separated only by 1px borders and the canvas tone. A single popover shadow (`--shadow-pop`) exists, and it is used only for surfaces that genuinely float above the page: the autocomplete dropdown, modals, toasts, the back-to-top button and the mobile sidebar drawer.

### Shadow Vocabulary
- **Popover** (`box-shadow: 0 8px 24px rgba(20,20,30,0.12), 0 2px 6px rgba(20,20,30,0.06)`; dark: `0 8px 28px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.3)`): floating layers only.
- **Control knob** (`box-shadow: 0 1px 2px rgba(0,0,0,0.25)`, 0.12 on the segmented thumb): the toggle-switch knob and the selected segment, to read as a physical control.

### Named Rules
**The Floats-Only Shadow Rule.** A shadow means "this is above the page and will go away". Anything that lives in the page flow, including cards, tables and the zone header, has a border and no shadow.

## Shapes

Corners are gently rounded and consistent by scale: 8px for cards, modals, dropdowns and toasts; 6px for buttons, inputs, code blocks, sidebar items and the resolver answer boxes; 4px for badges, keycaps and inline code; fully round only for example chips, status dots, the toggle track and the back-to-top button. Every container edge is a 1px hairline. Icons are 16px line icons on a 1.75 stroke (2.25 inside badges). The brand mark is a 24-unit square with 6-unit corners in Signal Orange and a white magnifier.

## Components

### Buttons
Compact and plain, like dashboard controls.
- **Shape:** gently rounded (6px), 32px tall, 12px side padding, 500 weight at 13px; the large variant is 40px tall.
- **Default:** white with a firm hairline border; hover fills with the hover grey.
- **Primary:** Action Blue fill with white text ("Run again", "Look up", "Save"); hover deepens to `action-blue-hover`.
- **Danger:** red text on white; hover adds a red soft fill and red border.
- **Ghost / icon / link:** transparent icon buttons (32px square, `text-2`), and link-buttons in Action Blue with an underline on hover.
- **Focus:** a 2px focus-color outline offset 2px on every interactive element. Transitions are 120ms on color only.

### Chips
- **Style:** pill example chips (26px, mono 12.5px) in Inset Grey with a hairline; hover turns them blue-tinted with a blue border.
- **Selectable tags:** 6px-radius mono tags in Settings; pressed state is blue border, blue soft fill and link-colored text.

### Cards / Containers
- **Corner Style:** 8px.
- **Background:** Card White on the canvas; footers in Inset Grey with a top hairline.
- **Shadow Strategy:** none (see Elevation).
- **Border:** 1px `border`; the danger card mixes 35% `fail` into the border.
- **Internal Padding:** 20px (16px under 900px). A card head carries a title, a one-line description and right-aligned meta ("7 checks · 1 flagged").

### Inputs / Fields
- **Style:** 36px, white, 1px firm hairline, 6px radius; mono variant for values. The top-bar lookup is 34px on Inset Grey with a search icon and a `Ctrl K` keycap.
- **Focus:** border turns Action Blue with a 3px `action-blue-soft` halo; the top-bar field also turns white.
- **Toggles and segmented controls:** 36x20 switch filling blue when on; segmented control on Pressed Grey with a white selected segment.

### Navigation
- **Top bar:** white, 56px, bottom hairline; mark and wordmark (650, 16px), a divider, the lookup field, then text links (CLI, API) and icon buttons (theme, settings).
- **Sidebar:** white with a right hairline. Items are 34px rows at 500/13.5px in `text-2` with a 17px muted icon; hover fills grey. The active item gets Pressed Grey, 600 weight, full-ink icon, and the 3px Signal Orange bar at its left edge. Groups are separated by hairlines and headed by 12px labels; per-section counts show a green check or a warn badge with the flag count.
- **Mobile:** the sidebar becomes a drawer with the popover shadow over a 35% dark scrim.

### Status Badges
22px tall, 4px radius, 600 weight at 12px, with a 13px icon: check for ok, triangle for warn, circle-x for fail, info for note. An unflagged row uses a plain green dot and a word ("Agree", "Found") rather than a badge, so badges only appear where something needs attention.

### Record Table
The core report surface. Columns: Type (mono, 600), Content, Status, Source, Details. Rows flagged warn or fail carry a faint tint of their status soft color across the row. Content cells list values in mono, each with a copy button that appears on hover. Multi-value cells show at most 5 values, followed by a "Show N more" link-button; each value is clamped to 2 lines with the full text in its title. A Details toggle (blue, chevron rotates 180°) opens the comparison in place below the row.

### Resolver Comparison (signature)
Opened in place under a record row on an Inset Grey band. One bordered box per resolver (6px radius, min 260px, auto-fit grid, 12px gap), headed by the resolver name, its timing in mono (amber when slow) and a copy button. Each box lists answers with TTLs. Hovering or focusing a value lights the same normalized value in every resolver with `action-blue-soft`; a value missing from other resolvers gets a 70% `warn-soft` fill and a small amber "not from X" note. A resolver error replaces the table with a fail badge and the message.

## Do's and Don'ts

### Do:
- **Do** keep every page inside the shell: 56px top bar, 240px sidebar, cards in a centered column no wider than 1120px.
- **Do** separate surfaces with 1px hairlines and the canvas tone; reserve the popover shadow for dropdowns, modals, toasts and the mobile drawer.
- **Do** use Action Blue (#0051c3) only for actions, links and focus, and Signal Orange (#f38020) only for the mark and the active-nav bar.
- **Do** express every verdict as one of the four badges (ok, warn, fail, note), soft fill plus strong text plus icon.
- **Do** set every copyable value in the system monospace and give it a copy affordance.
- **Do** cap multi-value cells at 5 values with "Show N more" and clamp each value to 2 lines.
- **Do** define both light and dark values for any new token and honor `data-theme`.

### Don't:
- **Don't** use the Cloudflare logo, cloud or wordmark as branding (the name appears only as data, e.g. a resolver); the product's mark is its own orange magnifier square.
- **Don't** add decorative shadows, gradients or glows to cards, tables or headers.
- **Don't** use orange for buttons, links, headings or warnings; warnings are amber (`warn`), not brand orange.
- **Don't** introduce a hero wordmark landing or a stack of large rounded status cards; results are rows in ruled tables.
- **Don't** set prose or labels in monospace, or values in Inter.
