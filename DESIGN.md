---
name: Colonias de Verano · Valle Viejo
description: Inscripción, ficha médica y panel de urgencias de las Colonias de Verano municipales, con el mundo visual del natatorio municipal.
colors:
  pool: "#006494"
  pool-hover: "#00557e"
  pool-2: "#0082a8"
  pool-ink: "#00405f"
  pool-wash: "#d9eef8"
  pool-wash-2: "#eef7fc"
  tile: "#e8f4fa"
  grout: "#d4e8f3"
  surface: "#ffffff"
  surface-2: "#f4f9fc"
  ink: "#0f2430"
  ink-2: "#3a525e"
  ink-3: "#5a707b"
  line: "#c6dae4"
  line-strong: "#8aa5b2"
  buoy-red: "#d63a24"
  buoy-yellow: "#f2b72f"
  ok: "#1d7348"
  ok-wash: "#def3e7"
  danger: "#b3261e"
  danger-wash: "#fdecea"
  warn: "#8a5300"
  warn-wash: "#fff3d6"
typography:
  display:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "clamp(1.7rem, 5.4vw, 2.1rem)"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1.12rem"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Atkinson Hyperlegible, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
  label:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 700
    lineHeight: 1.3
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  sheet: "20px"
  pill: "99px"
spacing:
  xs: "6px"
  sm: "12px"
  md: "18px"
  lg: "24px"
  tile: "28px"
components:
  button-primary:
    backgroundColor: "{colors.pool}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.pool-hover}"
  button-tonal:
    backgroundColor: "{colors.pool-wash}"
    textColor: "{colors.pool-ink}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
    height: "44px"
  button-outlined:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.pool}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
    height: "44px"
  button-big:
    backgroundColor: "{colors.pool}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    padding: "14px 28px"
    height: "54px"
  tool-button:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.pool}"
    rounded: "{rounded.md}"
    size: "44px"
  question-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "22px 24px 24px"
  section-head:
    backgroundColor: "{colors.pool}"
    textColor: "{colors.surface}"
    typography: "{typography.headline}"
    rounded: "{rounded.md}"
    padding: "10px 18px"
  lane-number:
    backgroundColor: "{colors.pool}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    size: "34px"
  input-underline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    padding: "10px 0 8px"
  input-boxed:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "12px 14px"
    height: "48px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "40px"
  chip-active:
    backgroundColor: "{colors.pool-wash}"
    textColor: "{colors.pool-ink}"
  notice:
    backgroundColor: "{colors.pool-wash-2}"
    textColor: "{colors.pool-ink}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
  notice-danger:
    backgroundColor: "{colors.danger-wash}"
  nav-rail:
    backgroundColor: "{colors.pool-ink}"
    width: "264px"
    padding: "18px 14px"
---

# Design System: Colonias de Verano · Valle Viejo

## Overview

**Creative North Star: "El natatorio municipal en enero"**

The app is the municipal pool on a summer morning: institutional blue water across every header band, pale celeste tile with a fine grout line underfoot, and lane ropes of red and yellow buoys that measure how far you have swum. Surfaces are flat white cards laid on the tile like kickboards on the deck. Nothing is glossy, nothing is SaaS; the official blue and the municipal logos carry the trust, and the pool vocabulary carries the warmth.

Density changes by audience but the world does not. The public form is a generous, one-question-per-card column (max 770px) that behaves like a Google Form, because parents already know how to fill one in. The panel is denser (fixed-column list, 44px tool buttons) because a coordinator in the sun needs to find a child and call a guardian in seconds. Both sit on the same tile, under the same water band, with the same buoy rope.

Type is large and plain: Atkinson Hyperlegible at 17px for reading, Figtree heavy for titles and labels. Motion is quiet and functional: buoys light up one at a time as the form fills, the active question's left focus bar slides down, the water band drifts slowly; reduced motion turns all of it off.

**Key Characteristics:**
- Celeste tile background with a 1px grout line every 28px, on every screen.
- Water bands (celeste to blue vertical gradient) at the top of form, login and panel.
- Flat white cards, 12px radius, one quiet shadow; depth comes from the water band and tile, not from stacking.
- The lane rope of buoys is the signature: progress in the form, separator in the panel.
- Numbered lanes (a blue rounded square with a digit) mark form sections.
- Fixed marks for state: a filled red dot means attention, a green ring means clear.

## Colors

Institutional water blues over pale tile, with two buoy accents held strictly to progress and separators, and a separate state set for meaning.

### Primary
- **Municipal Pool Blue** (pool): the mandatory institutional primary. Filled buttons, section heads, lane numbers, selected radios and checkboxes, the input focus underline, links, the bottom of the water gradient. Hover deepens to **Deep Pool** (pool-hover).
- **Valle Viejo Celeste** (pool-2): the mandatory institutional celeste. Top of the water gradient, the global focus outline (3px), the question focus bar.
- **Pool Ink** (pool-ink): brand-colored text on light washes, and the panel's navigation rail background.

### Secondary
- **Clear Water** (pool-wash) and **Shallow Water** (pool-wash-2): selection, tonal buttons, active chips, hover rows, informational notices, and the "Sí" row in the health grid.

### Tertiary
- **Buoy Red** (buoy-red) and **Buoy Yellow** (buoy-yellow): the lane rope only. Alternating lit buoys in the progress rope, and the static dotted divider under the panel's search banner and in the nav rail and login card.

### Neutral
- **Pool Tile** (tile): page background. **Grout** (grout): the 28px tile line.
- **White Deck** (surface) for cards; **Wet Deck** (surface-2) for zebra rows, table heads and resting tool buttons.
- **Deep Water Ink** (ink) for text; **ink-2** for secondary text (7.6:1 on white); **ink-3** for help text and placeholders (4.9:1 on white).
- **Lane Line** (line) for dividers; **Lane Line Strong** (line-strong) for input strokes, unlit buoy outlines and the rope itself.

### State
- **danger / danger-wash**: errors, required asterisks, the required-note line, health alerts, destructive tool buttons.
- **ok / ok-wash**: "sin condiciones", the clear health ring, call buttons, success.
- **warn / warn-wash**: weather suspension notices.

### Named Rules
**The Red Means Trouble Rule.** Red (danger) appears only for errors, required marks, health alerts and destructive actions. A neutral "Sí" answer is never red: the selected dot is Pool Blue and the row washes in Clear Water. If a red element is not asking for attention, it is wrong.

**The Buoys Stay In The Water Rule.** Buoy Red and Buoy Yellow belong to the lane rope and the buoy divider. They are not accents for avatars, focus rings, badges or categories.

**The Lane Colors Are Not Buoys Rule.** Each locality gets its own lane color for its chip swatch and list tag. New lane colors must come from outside the buoy pair and outside the state set, so a locality is never mistaken for progress, an alert or a "clear" state.

## Typography

**Display Font:** Figtree (with system-ui, sans-serif)
**Body Font:** Atkinson Hyperlegible (with system-ui, sans-serif)

**Character:** Figtree at 700–800 gives titles a friendly, municipal-signage weight; Atkinson Hyperlegible was drawn for low-vision readers and makes every answer, DNI and phone number unambiguous. Numbers are tabular everywhere.

### Hierarchy
- **Display** (800, clamp(1.7rem, 5.4vw, 2.1rem), 1.2): the form's title card heading. One per screen.
- **Headline** (800, 1.35–1.4rem, 1.2): section heads ("La colonia") beside the lane number; panel banner heading.
- **Title** (700, 1.12rem, 1.35): each question's title; list names at 1.04rem.
- **Body** (400, 17px base, 1.5): descriptions capped at 62ch; answers at ~1.06rem; help text 0.95rem in ink-3.
- **Label** (600–700, 0.85–0.98rem): buttons, chips, grid and table heads, nav items. Sentence case.

### Named Rules
**The Big Enough Rule.** Body never drops below 16px on inputs and 17px on reading text; help and secondary text never below 0.88rem; only compact chips and badges go smaller (0.72–0.82rem). This audience reads on a bright-sun phone.

**The No Kicker Rule.** There are no eyebrow or kicker labels above headings, and no uppercase tracked micro-labels. A heading says what it is; a locality name above an alert title is data, not decoration.

## Layout

The public form is a single centered column (max 770px, 12px side gutter) with a 12px vertical stack gap between cards. The first container overlaps the water band by 44px so the title card rises out of the water. Login is a 440px card overlapping a 200px water band by 64px.

The panel is a 264px fixed navigation rail plus a 64px water top bar, with content capped at 1360px and padded 24px 28px. At 900px and below the rail disappears, a white bottom navigation with pill-backed icons takes over, a 56px floating "new" button sits above it, and modals become bottom sheets with a handle. At 520px the progress rope takes a full row above the nav buttons, and those buttons stretch to equal width.

The ficha list uses fixed columns (health mark, name, ficha number, locality, health, actions) so every row reads the same; the ficha number column drops below 1180px.

Card padding is 24px (18–20px on phones); touch targets are 44px minimum, options 52px tall.

## Elevation & Depth

Mostly flat. Depth comes from the water band behind content and the white-on-tile contrast; shadows are cool blue-tinted (rgb 0,48,72) and quiet. A card rests at the low shadow, lifts to the medium shadow when its question has focus or a filled button is hovered, and only modals use the high shadow.

### Shadow Vocabulary
- **Resting** (`0 1px 2px rgba(0,48,72,0.12), 0 1px 3px rgba(0,48,72,0.06)`): every card, question, list and stat block.
- **Raised** (`0 2px 4px rgba(0,48,72,0.08), 0 8px 24px rgba(0,48,72,0.12)`): focused question, login card, hovered filled button.
- **Overlay** (`0 12px 40px rgba(0,40,60,0.22)`): sheets and modals.

### Named Rules
**The Lift On Focus Rule.** A surface rises only in response to state (focus, hover) or because it floats above the page (sheet, FAB). Nothing is raised for emphasis at rest.

## Shapes

Gently rounded throughout: 12px for cards, questions, notices and tool buttons; 8px for selects, boxed inputs, options and lane numbers; 16px for the panel banner, list and stat cards; 20px top corners for mobile sheets. Buttons and chips are full pills. Form answers are underlined, not boxed, the way Google Forms draws them. Radios are 24px circles with a 12px Pool Blue dot; checkboxes are 22px squares with a 4px radius. Buoys are 14px-tall capsules on a 2px rope.

## Components

### Buttons
Tactile pills that press in.
- **Shape:** full pill (99px), 44px minimum height; big variant 54px.
- **Primary:** Pool Blue fill, white Figtree 700 text, 10px 20px padding, a hairline shadow.
- **Hover / Focus:** hover deepens to Deep Pool and lifts to the raised shadow (pointer devices only); active scales to 0.97; focus shows the 3px celeste outline.
- **Tonal / Outlined / Text:** Clear Water fill with Pool Ink text; white with a 1.5px inset Lane Line Strong ring; transparent with Pool Blue text.
- **Tool buttons:** 44px square, 12px radius, tinted by job: Wet Deck/Pool Blue default, ok-wash for call, a WhatsApp green wash, danger-wash for delete.

### Chips
- **Style:** 40px pills, Figtree 600. On white: Lane Line Strong outline, ink-2 text; active fills Clear Water with a Pool Blue border. On the water banner: translucent white with a white border; active turns solid white with Pool Ink text.
- **Locality chips** carry a 12px lane swatch in that locality's lane color.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** White Deck on tile.
- **Shadow Strategy:** Resting; Raised on focus.
- **Title card:** a 10px Pool Blue top band.
- **Internal Padding:** 24px (20px 18px on phones).

### Inputs / Fields
- **Form answers:** no box, a 1.5px Lane Line Strong underline; on focus a 2px Pool Blue underline grows from the center. Placeholder "Tu respuesta" in ink-3.
- **Selects and panel fields:** 48–52px boxed, 1.5px stroke, 8px radius; focus turns the stroke Pool Blue with a 3px celeste halo.
- **Error:** the question gets a 1.5px danger ring, its focus bar turns red and stays shown, and a bold danger message with an icon appears below.

### Navigation
- **Rail (desktop):** Pool Ink background, 48px items in Figtree 600; the active item sits on a white pill with Pool Ink text; hover is a 10% white wash. A buoy divider separates primary sections from the public-form link.
- **Bottom nav (≤900px):** white bar, 60px items; the active icon sits on a Clear Water pill and turns Pool Blue.
- **Top bar:** the water gradient with white logo plates.

### Question card with focus bar (signature)
Each question is its own white card. When it has focus, a 6px celeste bar slides down its left edge (scaleY, 260ms) and the card lifts. This is a deliberate, pinned borrowing from Google Forms, which parents recognize; it is the only place a colored side stripe is used.

### Section head with lane number
A Pool Blue band across the top of a card holding a white lane-number square (34px, 8px radius, Figtree 800 digit) and the section headline in white. Sections read as lanes: "Carril 1 de 5".

### Lane rope (signature)
A 2px Lane Line Strong rope with N buoy capsules. Lit buoys alternate Buoy Red and Buoy Yellow; newly lit buoys pop (scale 0.7 → 1.18 → 1, 420ms) one after another 70ms apart. It is the form's progress bar (role progressbar) beside a "Carril n de N" label. The static version is a 10px dotted red/yellow divider under the panel banner, in the rail and in the login card.

### Health mark
An 18px fixed mark at the start of each list row: a filled danger dot with a danger-wash halo means "has conditions"; a 3px ok ring means "sin condiciones". Alert chips (danger-wash, dark red text) name the condition.

### Notice
A 12px-radius wash with an icon and no side stripe: Shallow Water/Pool Ink for information, warn-wash for weather suspensions, danger-wash for errors, ok-wash for success.

## Do's and Don'ts

### Do:
- **Do** put the tile (28px grout grid) behind every screen and a water band at the top of every entry surface.
- **Do** use the lane rope for progress and the buoy divider as the only decorative separator.
- **Do** mark a selected "Sí" with Pool Blue and a Clear Water row wash.
- **Do** keep touch targets at 44px or more, options at 52px, and inputs at 16px or more.
- **Do** keep the question focus bar on the active Google-Forms-style question; it is a pinned exception.
- **Do** show state with fixed marks (filled dot vs ring) plus words, never color alone.
- **Do** honor prefers-reduced-motion: buoys, focus bars and the water drift all stop.

### Don't:
- **Don't** use red for anything that is not an error, a required mark, a health alert or a destructive action.
- **Don't** use Buoy Red or Buoy Yellow outside the lane rope and buoy divider.
- **Don't** take a new locality lane color from the buoy pair or the state colors.
- **Don't** add kicker or eyebrow labels, or uppercase tracked micro-labels, above headings.
- **Don't** add colored side stripes to cards or notices; the question focus bar is the only one.
- **Don't** box the public form's text answers; they are underlined, as in Google Forms.
- **Don't** bring the official print sheet's look (Roboto, slate borders, cyan table heads) into screens; it is a legacy print artifact outside this world.
