---
name: Clinical Precision Narrative
colors:
  surface: '#f9f9ff'
  surface-dim: '#cadbfc'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dfe8ff'
  surface-container-highest: '#d6e3ff'
  on-surface: '#091c35'
  on-surface-variant: '#434654'
  inverse-surface: '#20314b'
  inverse-on-surface: '#ecf0ff'
  outline: '#737685'
  outline-variant: '#c3c6d6'
  surface-tint: '#0c56d0'
  primary: '#003d9b'
  on-primary: '#ffffff'
  primary-container: '#0052cc'
  on-primary-container: '#c4d2ff'
  inverse-primary: '#b2c5ff'
  secondary: '#285ab9'
  on-secondary: '#ffffff'
  secondary-container: '#709bfe'
  on-secondary-container: '#003179'
  tertiary: '#414446'
  on-tertiary: '#ffffff'
  tertiary-container: '#595b5d'
  on-tertiary-container: '#d2d3d5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b2c5ff'
  on-primary-fixed: '#001848'
  on-primary-fixed-variant: '#0040a2'
  secondary-fixed: '#d9e2ff'
  secondary-fixed-dim: '#b1c6ff'
  on-secondary-fixed: '#001946'
  on-secondary-fixed-variant: '#00419d'
  tertiary-fixed: '#e1e2e4'
  tertiary-fixed-dim: '#c5c6c8'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#444749'
  background: '#f9f9ff'
  on-background: '#091c35'
  surface-variant: '#d6e3ff'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

This design system is engineered for high-stakes clinical environments where data density must coexist with immediate legibility. The brand personality is **precise, clinical, and sophisticated**, moving away from "tech-bro" aesthetics toward a tool-like reliability that healthcare professionals can trust.

The design style follows a **Corporate / Modern** approach with a heavy emphasis on **Minimalism** and information hierarchy. It utilizes high-quality typography and a disciplined grid to ensure that complex medical datasets are digestible. Visual flair is intentionally restrained to prevent "analytical fatigue," focusing instead on clarity, accessibility, and high-contrast semantic signaling.

## Colors

The palette is anchored by **Atlassian-inspired deep blues** to evoke stability and institutional trust. The background utilizes a "layered white" strategy: `#FFFFFF` for primary surfaces (cards, inputs) and `#F4F5F7` for secondary structural elements (sidebar, page background) to create subtle depth without relying on heavy shadows.

**Semantic Utility:**
- **Critical (#DE350B):** Reserved strictly for high-risk patient alerts or system errors.
- **Warning (#FFAB00):** Used for moderate risk trends or pending actions.
- **Success (#36B37E):** Indicates low-risk status or completed diagnostic uploads.
- **Neutral Text:** Use `#172B4D` for headings and `#42526E` for body text to maintain WCAG AAA compliance on white backgrounds.

## Typography

The system uses **Inter** as the primary typeface for its exceptional legibility in UI and its neutral, professional tone. To differentiate clinical data points (like heart rates, lab values, or IDs) from prose, **JetBrains Mono** is introduced for tabular data and specific metrics to ensure character distinction (e.g., distinguishing '0' from 'O').

**Key Rules:**
- **Tracking:** Use tighter tracking (-0.01em to -0.02em) for larger headlines to maintain a "clinical" look.
- **Contrast:** Ensure all body text maintains at least a 4.5:1 contrast ratio. 
- **Labels:** Use `label-md` for small metadata, strictly in uppercase with increased letter spacing for readability.

## Layout & Spacing

The layout utilizes a **12-column fluid grid** for desktop and a **4-column grid** for mobile. Because clinical analytics require high data density, the system employs a strict 4px baseline grid to allow for compact yet organized information architecture.

- **Data Tables:** Use 8px internal cell padding to maximize row visibility without sacrificing scanability.
- **Sectioning:** Use 32px (`xl`) vertical spacing between major clinical modules (e.g., Patient History vs. Active Labs).
- **Responsive Reflow:** On tablet, the sidebar collapses into a rail to preserve horizontal space for data visualizations.

## Elevation & Depth

To maintain a "clinical" and clean aesthetic, this design system avoids heavy, dark shadows. Instead, it uses **Tonal Layers** and **Soft Ambient Shadows**.

- **Level 0 (Surface):** `#F4F5F7` - Used for the main application background.
- **Level 1 (Card):** `#FFFFFF` - Used for primary content containers. No shadow, but a 1px border of `#DFE1E6`.
- **Level 2 (Interaction):** `#FFFFFF` with a subtle shadow (0px 4px 8px rgba(9, 30, 66, 0.08)) for hovered elements or dropdowns.
- **Level 3 (Modals):** `#FFFFFF` with a deep shadow (0px 12px 24px rgba(9, 30, 66, 0.15)) to create a distinct separation from the analytical dashboard below.

## Shapes

The design system uses a **Rounded** (Level 2) shape language. A standard radius of **8px (0.5rem)** is applied to buttons, input fields, and cards. This softens the clinical "hardness" of the data, making the platform feel modern and approachable while remaining professional.

- **Buttons/Inputs:** 8px radius.
- **Modals/Large Containers:** 12px (rounded-lg) for a more substantial appearance.
- **Status Pills:** Fully rounded (pill-shaped) to distinguish them from interactive buttons.

## Components

### Buttons
- **Primary:** Solid `#0052CC` with white text. 8px radius.
- **Secondary:** Transparent with `#0052CC` border and text. 
- **Destructive:** Solid `#DE350B` for irreversible actions (e.g., "Delete Record").

### Input Fields
- Use `#FFFFFF` backgrounds with a 1px `#DFE1E6` border. 
- Active state: 2px border of `#0052CC`. 
- Error state: 1px border of `#DE350B` with a small helper icon.

### Data Tables (Clinical Focus)
- Zebra striping using `#F4F5F7` for even rows.
- Sticky headers for long patient lists.
- High-contrast text for critical metrics.

### Status Chips
- Small, rounded-full elements.
- Use the semantic palette with a 10% opacity background (e.g., Light Red background with Dark Red text) for a refined, modern look that doesn't overwhelm the user.

### Risk Cards
- Specialized cards featuring a left-accent border (4px width) colored according to the semantic risk levels (Green, Amber, Red) to allow for rapid peripheral scanning of patient status.