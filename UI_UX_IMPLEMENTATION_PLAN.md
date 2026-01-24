# OffboardHQ UI/UX Implementation Plan (Step 1)

## Patterns Extracted from Skill Repo
- **Surface**: Premium card treatments using layered gradients, high-radius borders (32px+), and subtle 1px "inner-light" borders. Glassmorphism for floating UI elements like the navbar.
- **Interaction**: Micro-animations on hover (lift, scale 1.02x, glow). Staggered reveal animations for grid items. Shimmer effects for high-priority CTAs.
- **Layout**: Bento-grid style feature showcases. Radial gradient lighting overlays to create depth in dark mode. Consistent vertical rhythm (120px-160px section padding).
- **Rules**: Transition timings strictly 200-300ms. Corner radii scale: 12px (small), 24px (medium), 32px (large). Contrast ratio 7:1+ for primary text.

## Pattern Checklist

### Surface Patterns
- [ ] **Premium Cards**: Enhance `CONTROL_FEATURES` cards with inner-border lighting and refined gradient backgrounds.
- [ ] **Bento Layout**: Refactor the outcome section into a more scannable grid pattern.
- [ ] **Depth & Atmosphere**: Layer subtle noise textures and multi-stop radial gradients to eliminate "flat" dark mode feel.

### Interaction Patterns
- [ ] **CTA Shimmer**: Apply the "shimmer/sweep" effect to the "Book a Risk Check" buttons.
- [ ] **Card Hover State**: Implement smooth lift (translateY) + border color transition + subtle drop shadow.
- [ ] **Scroll Reveal**: Add staggered fadeInUp transitions to section components as they enter the viewport.

### Layout Patterns
- [ ] **Floating Navbar**: Refine blur levels and border opacity for a "floating" glass effect.
- [ ] **Responsive Rhythm**: Standardize section spacing across mobile/desktop for better scannability.

### Accessibility Patterns
- [ ] **Focus Rings**: Add high-contrast focus indicators for all interactive elements.
- [ ] **Contrast Verification**: Audit all caption/secondary text for WCAG compliance.

## Screenshot Inspiration
- **Visual Depth**: Inspired by `ui-ux-pro-max` Dark Mode guidelines (styles.csv) and `website.png`.
- **Feature Grid**: Inspired by "Bento Grid Showcase" (landing.csv, No. 29).
- **Navigation**: Inspired by "Floating Navbar" rules (styles.csv).

---
*Note: No copy changes or hero video modifications will be made during implementation.*
