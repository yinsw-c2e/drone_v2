---
name: AeroCommand Pro
colors:
  surface: '#0f131d'
  surface-dim: '#0f131d'
  surface-bright: '#353944'
  surface-container-lowest: '#0a0e18'
  surface-container-low: '#171b26'
  surface-container: '#1b1f2a'
  surface-container-high: '#262a34'
  surface-container-highest: '#313540'
  on-surface: '#dfe2f0'
  on-surface-variant: '#b9cacb'
  inverse-surface: '#dfe2f0'
  inverse-on-surface: '#2c303b'
  outline: '#849495'
  outline-variant: '#3a494b'
  surface-tint: '#00dbe7'
  primary: '#e1fdff'
  on-primary: '#00363a'
  primary-container: '#00f2ff'
  on-primary-container: '#006a71'
  inverse-primary: '#00696f'
  secondary: '#adc6ff'
  on-secondary: '#002e6a'
  secondary-container: '#0566d9'
  on-secondary-container: '#e6ecff'
  tertiary: '#fff6e4'
  on-tertiary: '#3b2f00'
  tertiary-container: '#fed83a'
  on-tertiary-container: '#725e00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#74f5ff'
  primary-fixed-dim: '#00dbe7'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f54'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004395'
  tertiary-fixed: '#ffe173'
  tertiary-fixed-dim: '#e8c423'
  on-tertiary-fixed: '#221b00'
  on-tertiary-fixed-variant: '#554500'
  background: '#0f131d'
  on-background: '#dfe2f0'
  surface-variant: '#313540'
  bg-base: '#0B0E14'
  bg-surface: '#141822'
  bg-elevated: '#1E2433'
  status-warning: '#F59E0B'
  status-critical: '#EF4444'
  status-success: '#10B981'
  telemetry-cyan: '#00F2FF'
  telemetry-blue: '#3B82F6'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base-unit: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  container-max-width: 1440px
---

## Brand & Style

The design system is engineered to evoke the precision and authority of an aviation control tower. It targets logistics professionals, drone pilots, and fleet managers who require high-density data visualization and mission-critical reliability.

The visual style is **Industrial/Modern**, characterized by:
- **Atmospheric Depth:** A "dark mode first" approach using deep charcols and navies to reduce eye strain during prolonged monitoring.
- **Functional Aesthetics:** Using technical visual cues like crosshairs, scanning lines, and grid overlays to reinforce the "command center" narrative.
- **Reliability:** High-contrast interactions and a clear separation between monitoring (passive) and commanding (active) states.
- **Glassmorphism:** Utilized selectively for map overlays and floating telemetry panels to maintain spatial context without obstructing the global view.

## Colors

The palette is built on a foundation of **Deep Space Neutrals** to ensure chromatic actions remain legible and urgent. 

- **Primary Action (#00F2FF):** Reserved for "Active Missions," "Current State," and "Execute" actions. It carries a subtle outer glow (0px 0px 8px) when used in icons or status pips.
- **Secondary Action (#3B82F6):** Used for navigation, supportive actions, and secondary data sets.
- **Functional Feedback:** Warning Amber (#F59E0B) and Critical Red (#EF4444) are used exclusively for telemetry breaches, battery alerts, and airspace violations.
- **Layering:** Backgrounds use `#0B0E14` for the lowest level (base), while `#141822` is used for primary containers and cards.

## Typography

This design system employs a three-tier typography strategy to balance readability with a technical aesthetic:

1. **Hanken Grotesk (Headlines):** High-impact and modern, used for primary titles and dashboard summaries.
2. **Inter (Interface & Content):** Chosen for its exceptional legibility at small sizes, used for all form labels, body text, and descriptions.
3. **JetBrains Mono (Data & Telemetry):** A monospaced font used for GPS coordinates, timestamps, battery percentages, and financial figures to ensure tabular alignment and a "machine-read" feel.

On mobile devices, headlines scale down (e.g., `display-lg` becomes 32px) to prevent layout breaking, while maintaining the same line-height ratios.

## Layout & Spacing

The layout utilizes a **4px baseline grid** to ensure mathematical precision in element alignment.

- **Mobile:** A single-column fluid layout with 16px side margins. Cards are full-width.
- **Desktop Dashboard:** A 12-column grid. Left-hand navigation is fixed at 240px. The central "Monitoring" area expands, while right-hand "Detail" panels use 4-column spans (fixed 360px-400px).
- **Density:** High density is preferred for telemetry data, while form-based pages (order creation) use more whitespace to prevent cognitive overload.
- **Gaps:** Use 12px or 16px between sibling cards. Use 4px or 8px for internal element grouping (e.g., label vs. value).

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Subtle Glows** rather than heavy drop shadows.

- **Base Level:** `#0B0E14` (Canvas)
- **Mid Level:** `#141822` (Primary Content Cards)
- **Top Level:** `#1E2433` (Modals, Overlays, Floating Map Tools)
- **Interactions:** Hover states on interactive cards use a subtle `0.5px` border in Primary Cyan with a `4px` blur glow.
- **Glassmorphism:** Overlays on map surfaces use a background blur of `12px` with a 60% opacity fill of the surface color to maintain visual continuity with the terrain below.

## Shapes

The shape language is **Soft-Technical**. 

Small corner radii (4px for standard elements, 8px for large cards) are used to maintain a professional, industrial feel without appearing too aggressive or "sharp." 

- **Standard Buttons/Inputs:** 4px radius (`rounded-sm`).
- **Data KPI Cards:** 8px radius (`rounded-lg`).
- **Status Pips:** Fully circular (50% radius).
- **Dividers:** 1px solid lines with 10-15% opacity to subtly define sections.

## Components

### Buttons & Actions
- **Primary Action:** Solid Primary Cyan fill, black text (`#0B0E14`). High contrast.
- **Secondary Action:** Ghost style with a 1px Blue border and blue text.
- **Critical Action:** Red outline with subtle red inner glow on hover.

### Data KPI Cards
- Feature a `label-caps` title at the top, a `display-lg` (or `headline-md`) numeric value in the center, and a small sparkline or status trend at the bottom.
- Monospaced fonts are mandatory for the numeric values.

### Telemetry Gauges
- Circular or linear progress indicators using the `Primary Cyan` for current levels. 
- Critical thresholds (e.g., battery < 15%) trigger a color shift to `Critical Red`.

### Status Timelines
- Vertical or horizontal tracks using connected nodes. 
- Completed steps: Blue line + Blue check icon.
- Active step: Cyan line + Pulsing Cyan node.
- Pending: Gray dashed line + hollow node.

### Interactive Map Overlays
- Floating controls (Zoom, Layer toggle) use the high-elevation surface with 12px blur.
- Tooltips on map pins use `JetBrains Mono` for coordinates to ensure rapid scanning.

### Input Fields
- Dark background (`#0B0E14`), 1px border (`#2D3748`). 
- Focus state: Border changes to Primary Cyan with a 2px outer soft glow.