# Accessibility Implementation & Practices

This document details the accessibility features built into **SaafHawa**, linking each feature directly to the source code implementing and testing it.

---

### 1. Semantic HTML & Hierarchical Heading Order
- **Main Landmark & Skip Link:** The primary page content is enclosed in `<main id="main-content">` with a prominent skip link (`Skip to main content`): [`src/app/page.tsx`](src/app/page.tsx), [`src/components/Navbar.tsx`](src/components/Navbar.tsx).
- **Correct Heading Order:** The dashboard provides a top-level `<h1>Today in {place}</h1>`, followed sequentially by `<h2>` section headings and `<h3>` individual action titles: [`src/components/PlanDashboard.tsx`](src/components/PlanDashboard.tsx), [`src/components/dashboard/DashboardHeader.tsx`](src/components/dashboard/DashboardHeader.tsx), [`src/components/dashboard/DailyTimeline.tsx`](src/components/dashboard/DailyTimeline.tsx).
- **Article Landmarks:** Every daily action intervention uses an `<article>` tag with clear role and state bindings: [`src/components/dashboard/DailyTimelineItem.tsx`](src/components/dashboard/DailyTimelineItem.tsx).
- **Dialog Role:** The community modal is configured with `role="dialog"`, `aria-modal="true"`, and `aria-labelledby="advisory-modal-title"`: [`src/components/CommunityAdvisoryModal.tsx`](src/components/CommunityAdvisoryModal.tsx).

---

### 2. Focus Management, Focus Trap & Return Focus
- **Modal Focus Trap:** When `CommunityAdvisoryModal` opens, focus is directed inside the modal. Keyboard `Tab` and `Shift+Tab` cycles strictly within modal elements without leaking to the background page: [`src/lib/use-focus-trap.ts`](src/lib/use-focus-trap.ts), [`src/components/CommunityAdvisoryModal.tsx`](src/components/CommunityAdvisoryModal.tsx).
- **Return Focus on Close:** Upon closing the dialog (via the Escape key or the Close button), focus is restored to the triggering element that originally opened it.
- **Top of Page & Heading Focus on Load:** When the plan loads, the page keeps the top of the dashboard in view (`window.scrollTo({ top: 0, left: 0 })`) and programmatically shifts focus to the plan heading `<h1>` (`tabIndex={-1}`) so screen reader users immediately hear the destination: [`src/components/PlanDashboard.tsx`](src/components/PlanDashboard.tsx), [`src/components/dashboard/DashboardHeader.tsx`](src/components/dashboard/DashboardHeader.tsx).
- **Verification:** [`src/test/components-advisory-dialog.test.tsx`](src/test/components-advisory-dialog.test.tsx), [`src/test/usability-timeline.test.tsx`](src/test/usability-timeline.test.tsx).

---

### 3. Color Contrast Compliance & Target Sizes
- **High-Contrast Deep Teal:** All primary action buttons, choice chips, and navigation badges use `--brand` (`#0D766E` / `teal-700` in light mode, `#5FC4B8` in dark mode) providing verified WCAG AA contrast ($\ge 4.5:1$ against surface backgrounds): [`src/components/Navbar.tsx`](src/components/Navbar.tsx), [`src/components/PlanDashboard.tsx`](src/components/PlanDashboard.tsx), [`src/components/OnboardingForm.tsx`](src/components/OnboardingForm.tsx).
- **Mobile Body Text ≥ 15px:** Body copy enforces minimum 15px/16px font sizes across mobile viewports to prevent auto-zoom and visual strain.
- **Minimum Target Size (44px):** All interactive buttons in the navigation bar, onboarding navigation footer, and primary submission buttons enforce minimum 44×44px dimensions for touch accessibility: [`src/components/Navbar.tsx`](src/components/Navbar.tsx), [`src/components/OnboardingForm.tsx`](src/components/OnboardingForm.tsx).

---

### 4. Native Radios & Keyboard Arrow Navigation
- Audience and language pickers in the advisory modal use native `<input type="radio">` controls wrapped in styled labels. Users can navigate options seamlessly using keyboard Arrow keys (Left/Right/Up/Down) with automatic selection and single-tab departure: [`src/components/AdvisorySelectorBar.tsx`](src/components/AdvisorySelectorBar.tsx).

---

### 5. Multilingual Language Marking
- All Hindi / Devanagari content is explicitly marked with `lang="hi"` (including brand Hindi text, language selector labels, and rendered advisory bodies) to ensure screen readers switch to appropriate pronunciation engines:
  - [`src/components/Navbar.tsx`](src/components/Navbar.tsx)
  - [`src/components/AdvisorySelectorBar.tsx`](src/components/AdvisorySelectorBar.tsx)
  - [`src/components/AdvisoryModalBody.tsx`](src/components/AdvisoryModalBody.tsx)
- Verification: [`src/test/components-advisory-dialog.test.tsx`](src/test/components-advisory-dialog.test.tsx).

---

### 6. Form Fieldsets, Associated Labels & Error Linkage
- All form controls are grouped within semantic `<fieldset>` elements with descriptive `<legend>` headings (Your home, Getting around, Inside your home):
  - [`src/components/onboarding/OnboardingStep1.tsx`](src/components/onboarding/OnboardingStep1.tsx)
  - [`src/components/onboarding/OnboardingStep2.tsx`](src/components/onboarding/OnboardingStep2.tsx)
  - [`src/components/onboarding/OnboardingStep3.tsx`](src/components/onboarding/OnboardingStep3.tsx)
  - [`src/components/onboarding/ChoiceChipGroup.tsx`](src/components/onboarding/ChoiceChipGroup.tsx)
  - [`src/components/onboarding/OptionGroup.tsx`](src/components/onboarding/OptionGroup.tsx)
- Every input has an explicit `<label htmlFor="...">` association: [`src/components/OnboardingForm.tsx`](src/components/OnboardingForm.tsx), [`src/components/onboarding/OnboardingStep1.tsx`](src/components/onboarding/OnboardingStep1.tsx).
- **Error Linkage:** When validation fails, invalid inputs receive `aria-invalid="true"` and are tied directly to the error message via `aria-describedby`: [`src/components/OnboardingForm.tsx`](src/components/OnboardingForm.tsx).
- Verification: [`src/test/components-form.test.tsx`](src/test/components-form.test.tsx).

---

### 7. Single Authoritative Live Region & Instant Form Display
- **Single Live Region:** The application maintains a single authoritative `role="status"` region with `aria-live="polite"` and `aria-atomic="true"` in [`src/app/page.tsx`](src/app/page.tsx) to announce plan loading, readiness, and error updates without duplicate announcements.
- **Immediate Form Display:** First-time visitors are presented with the onboarding form immediately on initial load without a loading screen flash (`isLoading: false` initial state): [`src/app/page.tsx`](src/app/page.tsx).

---

### 8. Reduced Motion Support & No Color-Alone Status
- **Reduced Motion:** A global `@media (prefers-reduced-motion: reduce)` block in [`src/app/globals.css`](src/app/globals.css) and component stylesheets disables animations and transitions under user preference.
- **No Color-Alone Status:** Air quality categories (Good, Satisfactory, Moderate, Poor, Very Poor, Severe) are always accompanied by textual category names, numeric ranges, and descriptive icons: [`src/components/AirQualityCard.tsx`](src/components/AirQualityCard.tsx). Screen-reader text equivalents (`sr-only`) describe every chart, timeline point, and gauge.
- **24-Hour Forecast Chart Summary:** The visual SVG forecast chart includes an accessible `<div className="sr-only">` text summary detailing the current hour ("Now"), cleanest window, and peak smog hour: [`src/components/ForecastChart.tsx`](src/components/ForecastChart.tsx).

---

### 9. Calm Design System & Responsive Modalities
- **Dual Responsive Chat Modality:** On mobile devices ($< 1024$px), chat opens via an accessible floating button (`aria-label="Ask SaafHawa Assistant"`) into a full-height sheet modal (`role="dialog"`, `aria-modal="true"`) with a dedicated close button. On desktop, it is rendered as a sticky side panel (`role="region"`): [`src/components/PlanDashboard.tsx`](src/components/PlanDashboard.tsx), [`src/components/ChatPanel.tsx`](src/components/ChatPanel.tsx).
- **Isolated AQI Category Tokens:** Indian National CPCB AQI colors are strictly isolated to air quality numbers, category badges, and forecast bars. UI buttons, interactive cards, and navigation controls never overload AQI colors: [`src/lib/design-system.ts`](src/lib/design-system.ts).
- **Adjusted Totals Explanation:** The cumulative impact banner plainly explains underneath that overlapping actions are adjusted, clarifying why cumulative totals can be less than the cards added together: [`src/components/TotalSavingsBanner.tsx`](src/components/TotalSavingsBanner.tsx).
- **Accessible Data Source Attribution & Local Time:** The data source (e.g. Open-Meteo Copernicus CAMS, CPCB Ground Station) and local measurement time are rendered with semantic text and high-contrast typography in [`src/components/AirQualityCard.tsx`](src/components/AirQualityCard.tsx), follow-up chat, and community advisories.
