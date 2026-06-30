# zkBallot video design

## 1. Visual theme

Dark, evidence-first developer tooling. Deep navy surfaces carry oversized white
type, mint signals successful verification, cyan identifies public links and
technical flow, and amber marks rejected or deliberately limited behavior.
Rounded glass panels and restrained glows should feel credible rather than
speculative.

## 2. Quick reference

### Colors

- Canvas: `#050812`
- Deep panel: `#060C1B`
- Secondary navy: `#081226`
- Primary text: `#EDF7FF`
- Body text: `#AEBED4`
- Mint success: `#70F2B8`
- Cyan evidence: `#80E5FF`
- Amber warning: `#FFE28A`
- Pink no-vote: `#FF8EB3`
- Terminal: `#050911`

Use primary text for all important copy on dark surfaces. Body text is reserved
for secondary explanations. Mint, cyan, and amber are accents, not paragraph
colors.

### Fonts

- Display and body: `Inter`, system fallback
- Technical values: `ui-monospace, SFMono-Regular, Consolas, monospace`
- Display: 96–112px, weight 700, tight tracking
- Section heading: 52–64px, weight 700
- Body: 21–24px, weight 400
- Labels: 14–18px, weight 700–900

No local font files were captured; use installed Inter or the system sans stack.

## 3. Component styling

### Glass evidence panel

- Background: `linear-gradient(180deg, rgba(255,255,255,.095), rgba(255,255,255,.035)), #060C1B`
- Border: `1px solid rgba(255,255,255,.13)`
- Radius: `34px`
- Shadow: `0 30px 90px rgba(0,0,0,.32)`
- Padding: `30–42px`

### Success chip

- Background: `rgba(112,242,184,.08)`
- Border: `1px solid rgba(112,242,184,.25)`
- Text: `#70F2B8`
- Radius: `999px`

### Transaction row

- Background: `rgba(255,255,255,.04)`
- Border: `1px solid rgba(255,255,255,.09)`
- Radius: `20px`
- Number badge: mint fill with near-black text
- Hash: cyan monospace

### Warning proof

- Background: `rgba(255,226,138,.08)`
- Border: `1px solid rgba(255,226,138,.28)`
- Text accent: `#FFE28A`

### Primary action

- Fill: gradient `#70F2B8` to `#63DDFF`
- Text: `#06110C`
- Radius: `999px`
- Weight: 700

## 4. Spacing and layout

Base unit is 4px. Use 12–20px inside compact evidence elements, 28–42px inside
panels, and 48–80px between major ideas. Keep a generous safe area of at least
96px around the 1920×1080 frame. Prefer asymmetric two-column layouts and large
type balanced by concrete proof data.

Radii: 12px for code, 20–22px for rows, 34px for major panels, pill radius for
status chips.

## 5. Iteration guide

1. Mint always means verified or successful; amber always means rejected or bounded.
2. Every claim beat must show a concrete contract ID, transaction hash, error, or tally.
3. Keep the canvas `#050812`; do not introduce light scenes.
4. Use cyan monospace only for public inputs, hashes, and explorer evidence.
5. Headlines stay short, white, and tightly tracked; explanations remain muted.
6. Never claim encrypted tallying or sealed ballots.
7. Prefer one large proof object per beat over a dense screenshot collage.
8. End with the exact result: `YES 2 · NO 1 · finalized = true`.
