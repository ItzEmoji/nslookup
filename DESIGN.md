---
name: nslookup
description: A DNS lookup tool that starts as one search field and answers with a ruled register, one column per resolver, in the plain grammar of a hosting dashboard.
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
  focus: "#0051c3"
  signal-orange: "#f38020"
  band: "#1d1d1f"
  on-band: "#ffffff"
  ok: "#157f3b"
  ok-soft: "#e5f4ea"
  warn: "#8a4b00"
  warn-soft: "#fff1d6"
  warn-line: "#f0b44c"
  fail: "#b42318"
  fail-soft: "#fdeceb"
  note: "#4d4d52"
  note-soft: "#eeeef0"
  canvas-dark: "#121213"
  surface-dark: "#1c1c1e"
  surface-2-dark: "#202023"
  surface-3-dark: "#26262a"
  hover-dark: "#26262a"
  border-dark: "#313136"
  border-strong-dark: "#46464c"
  text-dark: "#f2f2f3"
  text-2-dark: "#c2c2c7"
  text-3-dark: "#9a9aa1"
  action-blue-dark: "#79aaff"
  action-blue-hover-dark: "#a3c4ff"
  action-blue-soft-dark: "#1a2a45"
  on-blue-dark: "#0b1a33"
  link-dark: "#79aaff"
  band-dark: "#f2f2f3"
  on-band-dark: "#1d1d1f"
  ok-dark: "#5fcf86"
  ok-soft-dark: "#173322"
  warn-dark: "#f5c060"
  warn-soft-dark: "#3a2c10"
  warn-line-dark: "#b8862b"
  fail-dark: "#ff8a80"
  fail-soft-dark: "#3d1a18"
  note-dark: "#c2c2c7"
  note-soft-dark: "#2c2c31"
typography:
  home-logo:
    fontFamily: "Noto Sans, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "46px"
    fontWeight: 650
    lineHeight: 1
    letterSpacing: "-0.035em"
  zone-name:
    fontFamily: "ui-monospace, SF Mono, Cascadia Mono, Cascadia Code, Menlo, Consolas, Liberation Mono, monospace"
    fontSize: "30px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Noto Sans, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Noto Sans, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Noto Sans, system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Noto Sans, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.3
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
  search: "19px"
  search-lg: "26px"
  pill: "999px"
spacing:
  xxs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "28px"
  xxl: "40px"
components:
  search:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.search}"
    padding: "0 6px 0 14px"
    height: "38px"
  search-lg:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.search-lg}"
    padding: "0 10px 0 20px"
    height: "52px"
  suggest-item:
    textColor: "{colors.text}"
    rounded: "{rounded.search}"
    padding: "0 4px 0 12px"
    height: "38px"
  suggest-item-active:
    backgroundColor: "{colors.hover}"
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
  icon-button:
    textColor: "{colors.text-2}"
    rounded: "{rounded.sm}"
    size: "30px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "0 10px"
    height: "32px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.sm}"
  card-head:
    padding: "12px 16px"
    height: "52px"
  fact-cells:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    padding: "10px 16px 11px"
  sectionbar:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    padding: "8px 8px 8px 16px"
  table-header:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text-2}"
    typography: "{typography.label}"
    padding: "8px 12px"
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
  selectable-tag:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-2}"
    rounded: "{rounded.sm}"
    padding: "0 9px"
    height: "28px"
  selectable-tag-on:
    backgroundColor: "{colors.action-blue-soft}"
    textColor: "{colors.action-blue}"
  code-block:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text}"
    typography: "{typography.value-mono}"
    rounded: "{rounded.sm}"
    padding: "7px 8px 7px 12px"
  toast:
    backgroundColor: "{colors.band}"
    textColor: "{colors.on-band}"
    rounded: "{rounded.sm}"
    padding: "9px 14px"
  modal:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
  row-differs:
    backgroundColor: "{colors.warn-soft}"
---

# Design System: nslookup

## Overview

**Creative North Star: "A Search Field That Answers Like a Console"**

nslookup opens the way a search engine does: the product's mark, its name, and one rounded field in the middle of an empty page. There is no navigation to learn, no landing copy and no documentation links. Typing a domain or an IP and pressing Enter is the whole interface.

The answer is a dashboard page in the plain grammar operators know from hosting control panels: a white 56px top bar, white cards on a pale grey canvas, 1px hairlines and ruled tables. The visual language is Cloudflare-like (Noto Sans, action blue, an orange mark) but carries none of Cloudflare's identity; the mark is the product's own orange rounded square holding a white magnifier.

The signature move is the **register**: every record a lookup found, one row per value, with a column per resolver. A tick and the TTL mean that resolver returned the value; an amber cell with a dash means it did not. Disagreement is visible at a glance and can be isolated with one checkbox.

**Key Characteristics:**
- Search-first: one field, centred on the start page, that glides into the top bar once a lookup runs.
- Results as a ruled register with one column per resolver; never stacks of large status cards.
- Noto Sans for the interface, system monospace for every value that could be pasted into a shell.
- Blue only for actions, links and focus; orange only for the mark.
- Four verdict badges (ok, warn, fail, note), each a soft fill, a strong text colour and an icon.
- Flat surfaces separated by hairlines; shadows only on things that float or lift.
- Full light and dark token sets that follow the OS, with a `data-theme` override.
- Motion that explains a change (the field moving, results arriving) and can be turned off.

## Colors

A neutral grey ramp carries nearly everything. Two brand hues each own exactly one job, and four status hues carry verdicts.

### Primary
- **Action Blue** (`action-blue`, `--ink`): primary buttons ("Run again", "Save"), links, link-buttons, IP links in the register, focus rings, checked toggles and checkboxes, pressed record-type tags, the spinner arc. Its soft tint (`action-blue-soft`, `--ink-tint`) is the input focus halo, text selection and the pressed-tag fill.
- In dark mode the blue lifts to `#79aaff` and primary buttons put dark navy text (`on-blue-dark`) on it, so the button stays legible without a saturated block of colour.

### Secondary
- **Signal Orange** (`signal-orange`): the brand mark's square, in the top bar and on the start page. Nothing else. It keeps its value in both themes.

### Status
- **Verdict Green** (`ok` on `ok-soft`): "No issues", passing checks, the per-resolver tick, the copied state.
- **Review Amber** (`warn` on `warn-soft`): split answers, missing values, slow resolver timings, warning counts in the section bar. `warn-line` outlines the cell where a resolver is missing a value.
- **Failure Red** (`fail` on `fail-soft`): failed checks, resolver errors, the danger button, the delete hover in the suggestion list, error toasts.
- **Note Grey** (`note` on `note-soft`): informational badges and "Querying".

### Neutral
- **Canvas Grey** (`canvas`): the page behind everything.
- **Card White** (`surface`): cards, the top bar, the search field and its suggestion list, the section bar, modals.
- **Inset Grey** (`surface-2`): table headers, row hover, code blocks, raw-response panels, the alt-view header.
- **Pressed Grey** (`surface-3`): the segmented-control track, loading placeholders.
- **Hairline** (`border`) and **Firm Hairline** (`border-strong`): card and table rules; input, button, field and checkbox outlines.
- **Ink / Secondary Ink / Muted Ink** (`text`, `text-2`, `text-3`): body text; descriptions and inactive controls; labels, meta, placeholders and icons.
- **Band** (`band` with `on-band`): toasts only. It inverts in dark mode.

### Named Rules
**The One Job Per Hue Rule.** Blue means "you can act here"; orange means "this is the product". Blue never decorates, and orange never marks an action, a status or a heading.

**The Verdict Pair Rule.** Every status is a soft fill plus a strong text in the same hue, with an icon or a word, so the meaning survives without colour. Status hues never appear as decoration.

**The Two Theme Rule.** Every surface, text and status token has a dark counterpart (the `-dark` keys). Dark applies under `prefers-color-scheme: dark` unless `data-theme="light"` is set, and always under `data-theme="dark"`.

## Typography

**Interface Font:** Noto Sans, loaded from Google Fonts at weights 400 to 700, with system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue and Arial as fallbacks.
**Value Font:** the system monospace stack (ui-monospace, SF Mono, Cascadia Mono, Menlo, Consolas, Liberation Mono) with tabular numerals.

**Character:** Noto Sans is plain, open and slightly wide, so labels stay legible at 12 to 13.5px. Its Latin, Greek and Cyrillic coverage keeps internationalised names consistent with the rest of the page. Monospace marks anything the operator might copy into a terminal; the split itself is information.

### Hierarchy
- **Home Logo** (650, 46px, -0.035em; 36px under 900px): the wordmark beside the 54px mark on the start page. The only large type in the product.
- **Zone Name** (mono 500, 30px, -0.02em; 26px under 900px): the looked-up domain or IP at the top of the results.
- **Headline** (650, 26px, -0.02em; 24px under 900px): page titles such as Settings and the API page.
- **Title** (600, 15px, -0.01em): card and section titles ("Records", "Mail", "Resolvers"). Modal titles are 600 at 17px.
- **Body** (400, 13.5px, 1.5): default text. Descriptions use 13 to 14px in `text-2`, capped near 70ch.
- **Label** (600, 12px): table headers, fact-cell labels, the suggestion-list header, field labels. Sentence case, never uppercase.
- **Value Mono** (400, 13px, 1.55): record values, the type column (600 at 12.5px), curl strips and code. TTLs and timings are 12px.
- **Search** (14px in the top bar, 17px on the start page).

### Named Rules
**The Copyable Is Mono Rule.** If a string could be pasted into a shell (a domain, record, IP, TTL, command), it is set in monospace. Prose, labels and buttons are never mono.

## Layout

There is no sidebar in the app. A sticky 56px top bar (`--topbar-h`) holds the mark and wordmark, a divider, the search field (up to 540px) and, at the right edge, the theme and settings icon buttons. Main content is padded `0 40px 88px` (`0 16px 72px` under 900px).

### Views
- **Start page:** the top bar turns transparent and borderless and hides its mark and search slot. The home logo sits 17vh from the top (12vh under 900px) with the large search field 32px below it, at most 640px wide. Nothing else is on the page.
- **Results:** a centred column up to 1180px. The zone header (name, overall badge, a row of fact cells) is followed by the sticky section bar and one card per section: Records (or Reverse DNS for an IP), Mail, Registry and TLS, depending on what was looked up.
- **Settings:** a centred column up to 900px: a page head, then cards of setting rows (Display, Checks, Record types, Resolvers, Data).
- **API page (`/api-docs`):** the only page with an index column: a 220px sidebar beside the content, grouped by OpenAPI tag. It is reached by URL only; the app links to no documentation.

### Spacing
A 4px base, used mostly in steps of 4, 8, 12, 16 and 20px. Cards stack with a 20px gap. Card heads are at least 52px tall with 12px 16px padding; table cells are 9px 12px with 16px at the outer edges, so cell text lines up with the card title.

### Responsive behaviour
- **Under 1000px:** the section bar's tools wrap under the section links.
- **Under 900px:** the wordmark text and the `Ctrl K` keycap hide, the top-bar search takes the remaining width, and setting rows stack their control under the text. On the API page the sidebar becomes an off-canvas drawer over a scrim.
- **Under 640px:** fact cells collapse to one or two columns; the section links scroll sideways; button labels hide, leaving icons; the register restacks so each row shows type and value on top and one inline "Resolver ✓ TTL" tally per resolver below; mail checks and certificates become labelled lists.

## Elevation & Depth

The system is flat. Cards, the top bar and the section bar sit at page level, separated by 1px borders and the canvas tone.

### Shadow Vocabulary
- **Popover** (`--shadow-pop`: `0 8px 24px rgba(20,20,30,0.12), 0 2px 6px rgba(20,20,30,0.06)`; dark `0 8px 28px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.3)`): modals, toasts, the back-to-top button and the mobile drawer on the API page.
- **Search lift** (`0 1px 6px rgba(20,20,30,0.14)` on hover and focus; `0 2px 10px` with a `0 10px 16px` list shadow while suggestions are open): the search field is the one in-flow element that lifts, because it is the one thing you are meant to touch.
- **Sticky hint** (`0 1px 2px rgba(20,20,30,0.04)`): the section bar, so it reads as resting above the cards it scrolls over.
- **Control knob** (`0 1px 2px`): the toggle knob and the selected segment.

### Named Rules
**The Floats-or-Invites Shadow Rule.** A shadow means "this is above the page" or "this is the field to type in". Cards, tables and the zone header have a border and no shadow.

## Shapes

Corners are gently rounded: 6px (`--radius`) for cards, fact cells, buttons, inputs, code blocks and the section bar; 8px for modals; 4px (`--radius-sm`) for badges, counts, checkboxes and keycaps. The search field is the one fully rounded control: 19px radius in the top bar, 26px on the start page, and its suggestion rows repeat that pill shape inside the list. Toggle tracks, the clear and delete buttons, status dots and the back-to-top button are round.

Icons are 16px line icons on a 1.6 stroke (2 to 2.4 inside badges, ticks and checkboxes). The brand mark is a 24-unit square with 6-unit corners in Signal Orange and a white magnifier.

## Components

### Search Field (signature)
- **Shape:** a white pill with a firm hairline, a search icon on the left and a clear button once there is text. 38px tall in the top bar (with a `Ctrl K` keycap when empty and unfocused); 52px, 17px text and a soft resting shadow on the start page.
- **Suggestions:** focusing the field opens a list of recent lookups that hangs from it. The field squares off its bottom corners, and the field and list read as one card divided by an inset hairline. A "Recent" header carries a "Clear all" link-button. Each row is a 38px rounded pill with a clock icon, the lookup in text, its kind ("Domain", "IPv4", "IPv6") in muted 12px, and a round bin button that appears on hover or selection and turns red on hover. Arrow keys move a grey selection through the rows.
- **Privacy:** recents are kept only in this browser and only while Settings › Data › "Remember recent lookups" is on.

### Fact Cells
A white 6px box split into labelled cells (min 190px, auto-fit) by hairlines: Kind, Resolvers with their slowest answer, Queried (UTC), and a wide "From a terminal" cell with the curl command and a copy button. A cell flagged warn or fail takes that status's soft fill.

### Section Bar
Sticky 8px below the top bar. On the left, links to each section with a mono count (or an amber/red count chip when something is flagged). On the right: the "Only disagreements" checkbox, a Form / Zone / JSON segmented control, an Export button and the primary "Run again" button. Keyboard shortcuts: `1` to `3` switch views and `D` toggles the filter; anywhere, `/` focuses the search and `?` lists the shortcuts.

### Register (signature)
The records table. Columns: Type (mono 600, 96px), Value (mono), one right-aligned column per resolver, and a copy column. Rows are grouped by type with a hairline between groups.
- A resolver cell holds a green tick and the TTL with tabular numerals, `NODATA` in muted small caps-style text, or a red error code.
- A row where resolvers disagree takes a 55% `warn-soft` wash; the cell for the resolver that is missing the value takes full `warn-soft`, a `warn-line` inset outline and a short amber dash.
- Hovering a row fills it Inset Grey, dims every other value to `text-2` and reveals its copy button.
- IPs are link-buttons that open an IP-info modal (details and a small map).
- "Only disagreements" hides every type group whose resolvers agree and says so when none remain.

### Checks and Certificates
Mail and CAA checks are ruled tables: a mono check name, the record found (pre-wrapped with a copy button), a reference column and a right-aligned verdict, either a badge or a green "OK" word. Flagged rows carry a 55% wash of their status colour. TLS lists recent certificates with mono names and dates; expired ones fall to `text-3`. A "Raw response" disclosure opens the source JSON in an Inset Grey code panel.

### Zone and JSON Views
Alternatives to the Form view, in the same white box: an Inset Grey header with the request line in mono and meta, then the content as preformatted mono text (a zone file, or the API's own JSON for the same lookup).

### Buttons
- **Shape:** 6px radius, 32px tall, 12px side padding, 500 weight at 13px; the large variant is 40px.
- **Default:** white with a firm hairline; hover fills `hover`.
- **Primary:** Action Blue fill; hover deepens to `action-blue-hover`.
- **Danger:** red text; hover adds `fail-soft` and a red border.
- **Icon / link:** 30px transparent icon buttons in `text-2`; link-buttons in `link` with an underline on hover.
- **Press:** buttons sink 1px while pressed. Focus is a 2px `focus` outline offset 2px on every interactive element.

### Settings Controls
Setting rows put a 600 13.5px title and a 12.5px description on the left and the control on the right. Toggles are 34x18 tracks that fill blue when on. Segmented controls sit on Pressed Grey with a white selected segment. Record types are 28px mono tags that turn blue-bordered, blue-tinted and blue-text when pressed. Resolvers are rows with name, URL and actions, editable in place.

### Status Badges
22px tall, 4px radius, 600 weight at 12px, with a 13px icon: check for ok, triangle for warn, circle-x for fail, info for note. Badges in the register's type column and certificate rows shrink to 18px at 11px. The zone's overall badge grows to 26px.

### Floating Elements
- **Toasts:** bottom-centre, on the inverted Band surface, 13px, rising in over 220ms. Error toasts use `fail`.
- **Modals:** 560px (420px narrow), 8px radius, popover shadow, over a 45% black overlay; header, body and an optional footer separated by hairlines.
- **Back to top:** a 36px round button at the bottom right that fades in after scrolling.

## Motion

Motion explains what changed and never decorates. Easing is `--ease-out` (`cubic-bezier(0.16, 1, 0.3, 1)`).

- **View changes** use the View Transitions API. The search field is the one named element (`view-transition-name: search`), so it glides between the centre of the start page and the top bar over 420ms while the rest of the page cross-fades over 220ms. Theme changes cross-fade over 320ms.
- **Results** rise 8px and fade in over 380ms, top to bottom: header, then section bar (+50ms), then each section (+100, 150, 200, 250ms).
- **Suggestions** drop 4px into place over 160ms; a deleted row folds away.
- **Small confirmations:** the copy icon pops from 60% scale over 220ms; modals fade in and rise over 240ms; buttons sink 1px on press.

### Named Rules
**The Off Switch Rule.** Settings › Display › Animations turns every transition and animation off. Under `prefers-reduced-motion: reduce`, movement is dropped but the fades that explain a change stay, the search no longer glides and nothing staggers.

## Do's and Don'ts

### Do:
- **Do** keep the start page to the logo and the search field.
- **Do** show results as rows in ruled tables, with a column per resolver wherever answers are compared.
- **Do** separate surfaces with 1px hairlines and the canvas tone; keep shadows for floating layers and the search field.
- **Do** use Action Blue (#0051c3) only for actions, links and focus, and Signal Orange (#f38020) only for the mark.
- **Do** express every verdict as one of the four badges, or a soft wash plus a strong word.
- **Do** set every copyable value in the system monospace and give it a copy button.
- **Do** define a dark value for any new token and honour `data-theme`.
- **Do** give any new motion a reduced-motion version and respect the Animations setting.

### Don't:
- **Don't** put navigation, documentation links, a footer or marketing copy on the start page or in the top bar.
- **Don't** use the Cloudflare logo, cloud or wordmark as branding; Cloudflare appears only as data (a resolver name).
- **Don't** use orange for buttons, links, headings or warnings; warnings are amber (`warn`).
- **Don't** add decorative shadows, gradients or glows to cards, tables or headers.
- **Don't** return to a sidebar shell in the app, or to a neon or terminal "hacker" palette.
- **Don't** set prose or labels in monospace, or values in Noto Sans.
