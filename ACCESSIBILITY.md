# Accessibility Implementation & Practices

This document details the accessibility features built into **SaafHawa**, linking each feature directly to the source code implementing and testing it.

---

### 1. Semantic HTML & Hierarchical Heading Order
- **Main Landmark & Skip Link:** The primary page content is enclosed in `<main id="main-content">` with a prominent skip link (`Skip to main content`): [`src/app/page.tsx`](src/app/page.tsx), [`src/components/Navbar.tsx`](src/components/Navbar.tsx).
- **Correct Heading Order:** The dashboard provides a top-level `<h1>Clean Air Action Plan for {place}</h1>`, followed sequentially by `<h2>` section headings and `<h3>` individual action titles: [`src/components/PlanDashboard.tsx`](src/components/PlanDashboard.tsx), [`src/components/ActionCategorySection.tsx`](src/components/ActionCategorySection.tsx), [`src/components/PlanCard.tsx`](src/components/PlanCard.tsx).
- **Article Landmarks:** Every plan card uses an `<article>` tag to represent an independent clean-air intervention: [`src/components/PlanCard.tsx`](src/components/PlanCard.tsx).
- **Dialog Role:** The community modal is configured with `role="dialog"`, `aria-modal="true"`, and `aria-labelledby="advisory-modal-title"`: [`src/components/CommunityAdvisoryModal.tsx`](src/components/CommunityAdvisoryModal.tsx).

### 2. Focus Management, Focus Trap & Return Focus
- **Modal Focus Trap:** When `CommunityAdvisoryModal` opens, focus is directed inside the modal. Keyboard `Tab` and `Shift+Tab` cycles strictly within modal elements without leaking to the background page: [`src/lib/use-focus-trap.ts`](src/lib/use-focus-trap.ts), [`src/components/CommunityAdvisoryModal.tsx`](src/components/CommunityAdvisoryModal.tsx).
- **Return Focus on Close:** Upon closing the dialog (via the Escape key or the Close button), focus is restored to the triggering element that originally opened it.
- **Verification:** [`src/test/components-advisory-dialog.test.tsx`](src/test/components-advisory-dialog.test.tsx).

### 3. Color Contrast Compliance & Target Sizes
- **High-Contrast Green:** All white-on-green badges, buttons, and indicators use `bg-emerald-700` (contrast ratio $> 5.8:1$) or `bg-emerald-800`, well above the WCAG 4.5:1 minimum threshold: [`src/components/Navbar.tsx`](src/components/Navbar.tsx), [`src/components/PlanDashboard.tsx`](src/components/PlanDashboard.tsx), [`src/components/OnboardingForm.tsx`](src/components/OnboardingForm.tsx).
- **Legible Helper Text:** Secondary and supporting helper texts use `text-slate-600 dark:text-slate-400`, avoiding low-contrast grey tones.
- **Minimum Target Size (44px):** All interactive buttons in the navigation bar and primary form submission buttons enforce `min-h-[44px] min-w-[44px]` for motor and touch accessibility: [`src/components/Navbar.tsx`](src/components/Navbar.tsx), [`src/components/OnboardingForm.tsx`](src/components/OnboardingForm.tsx).

### 4. Native Radios & Keyboard Arrow Navigation
- Audience and language pickers in the advisory modal use native `<input type="radio">` controls wrapped in styled labels. Users can navigate options seamlessly using keyboard Arrow keys (Left/Right/Up/Down) with automatic selection and single-tab departure: [`src/components/AdvisorySelectorBar.tsx`](src/components/AdvisorySelectorBar.tsx).

### 5. Multilingual Language Marking
- All Hindi / Devanagari content is explicitly marked with `lang="hi"` (including brand Hindi text, language selector labels, and rendered advisory bodies) to ensure screen readers switch to appropriate pronunciation engines:
  - [`src/components/Navbar.tsx`](src/components/Navbar.tsx)
  - [`src/components/AdvisorySelectorBar.tsx`](src/components/AdvisorySelectorBar.tsx)
  - [`src/components/AdvisoryModalBody.tsx`](src/components/AdvisoryModalBody.tsx)
- Verification: [`src/test/components-advisory-dialog.test.tsx`](src/test/components-advisory-dialog.test.tsx).

### 6. Form Fieldsets, Associated Labels & Error Linkage
- All form controls are grouped within semantic `<fieldset>` elements with descriptive `<legend>` headings (Demographics, Commute, Indoor Setup):
  - [`src/components/onboarding/DemographicsFields.tsx`](src/components/onboarding/DemographicsFields.tsx)
  - [`src/components/onboarding/CommuteFields.tsx`](src/components/onboarding/CommuteFields.tsx)
  - [`src/components/onboarding/IndoorEnvironmentFields.tsx`](src/components/onboarding/IndoorEnvironmentFields.tsx)
- Every input has an explicit `<label htmlFor="...">` association: [`src/components/OnboardingForm.tsx`](src/components/OnboardingForm.tsx).
- **Error Linkage:** When validation fails, invalid inputs receive `aria-invalid="true"` and are tied directly to the error message via `aria-describedby="form-error-alert place-hint"`: [`src/components/OnboardingForm.tsx`](src/components/OnboardingForm.tsx).
- Verification: [`src/test/components-form.test.tsx`](src/test/components-form.test.tsx).

### 7. Single Authoritative Live Region & Instant Form Display
- **Single Live Region:** The application maintains a single authoritative `role="status"` region with `aria-live="polite"` and `aria-atomic="true"` in [`src/app/page.tsx`](src/app/page.tsx) to announce plan loading, readiness, and error updates. Duplicate live regions were eliminated from [`src/components/LoadingState.tsx`](src/components/LoadingState.tsx).
- **Immediate Form Display:** First-time visitors are presented with the onboarding form immediately on initial load without a loading screen flash (`isLoading: false` initial state): [`src/app/page.tsx`](src/app/page.tsx).

### 8. Reduced Motion Support & No Color-Alone Status
- **Reduced Motion:** A global `@media (prefers-reduced-motion: reduce)` block in [`src/app/globals.css`](src/app/globals.css) minimizes animation and transition durations. Interactive components and progress spinners apply `motion-reduce:animate-none` and `motion-reduce:transition-none`: [`src/components/LoadingState.tsx`](src/components/LoadingState.tsx), [`src/components/AdvisoryModalBody.tsx`](src/components/AdvisoryModalBody.tsx).
- **No Color-Alone Status:** Air quality categories (Good, Moderate, Poor, Very Poor, Severe) are always accompanied by textual category names, numeric ranges, and descriptive icons: [`src/components/AirQualityCard.tsx`](src/components/AirQualityCard.tsx). Screen-reader text equivalents (`sr-only`) describe every chart, timeline point, and gauge.

### 9. Accessible Sample Data Notices & Contextual Total Explanation
- **Accessible Sample Data Labels:** When operating in sample data mode, accessible `role="status"` badges and labels clearly inform assistive technology users that reference data is active across [`src/components/ChatHeader.tsx`](src/components/ChatHeader.tsx), [`src/components/LoadingState.tsx`](src/components/LoadingState.tsx), and [`src/components/AirQualityCard.tsx`](src/components/AirQualityCard.tsx). Neutral wording is consistently enforced, avoiding misleading "live" claims.
- **Clarification of Overlapping Cumulative Totals:** The total impact dashboard banner includes an explicit line explaining that overlapping interventions are adjusted for physical interactions, clarifying why cumulative totals may differ from summing individual cards linearly: [`src/components/TotalSavingsBanner.tsx`](src/components/TotalSavingsBanner.tsx).
- Verification: [`src/test/wording-sample-data.test.tsx`](src/test/wording-sample-data.test.tsx).
