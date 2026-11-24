# Accessibility Implementation (WCAG 2.1 AA)

This document details the accessibility features built into **SaafHawa**, linking each feature directly to the source code implementing and testing it.

---

### 1. Semantic HTML & Landmark Roles
- **Main Landmark:** The primary page content is enclosed in `<main id="main-content">` with a visible bypass target: [`src/app/page.tsx`](file:///src/app/page.tsx).
- **Section & Heading Structure:** Distinct `<section aria-labelledby="...">` blocks with hierarchical headings (`h1` through `h3`) organize live air quality, action plan groups, and chat: [`src/components/AirQualityCard.tsx`](file:///src/components/AirQualityCard.tsx), [`src/components/PlanDashboard.tsx`](file:///src/components/PlanDashboard.tsx).
- **Article Landmarks:** Every plan card uses an `<article>` tag to represent an independent clean-air intervention: [`src/components/PlanCard.tsx`](file:///src/components/PlanCard.tsx).
- **Dialog Role:** The community modal is configured with `role="dialog"`, `aria-modal="true"`, and `aria-labelledby="advisory-modal-title"`: [`src/components/CommunityAdvisoryModal.tsx`](file:///src/components/CommunityAdvisoryModal.tsx).

### 2. Form Landmarks, Fieldsets & Associated Labels
- All form controls in the onboarding flow are grouped within semantic `<fieldset>` elements with descriptive `<legend>` headings (demographics, commute, indoor setup):
  - [`src/components/onboarding/DemographicsFields.tsx`](file:///src/components/onboarding/DemographicsFields.tsx)
  - [`src/components/onboarding/CommuteFields.tsx`](file:///src/components/onboarding/CommuteFields.tsx)
  - [`src/components/onboarding/IndoorEnvironmentFields.tsx`](file:///src/components/onboarding/IndoorEnvironmentFields.tsx)
- Every `<input>`, `<select>`, and `<textarea>` has an explicit `<label htmlFor="...">` association: [`src/components/OnboardingForm.tsx`](file:///src/components/OnboardingForm.tsx).
- Form landmark declared with `role="form"` and `aria-label="Household Profile Form"`: [`src/components/OnboardingForm.tsx`](file:///src/components/OnboardingForm.tsx#L96).
- Verification: [`src/test/components-form.test.tsx`](file:///src/test/components-form.test.tsx).

### 3. Screen Reader Live Regions & Text Equivalents
- **Live Status Announcement:** Plan generation progress and completion states are announced to assistive technology using an `aria-live="polite"` region with `aria-atomic="true"`: [`src/app/page.tsx`](file:///src/app/page.tsx#L85-L92).
- **No Color-Alone Status:** Air quality categories (Good, Moderate, Poor, Very Poor, Severe) are always accompanied by textual category names, numeric ranges, and descriptive icons: [`src/components/AirQualityCard.tsx`](file:///src/components/AirQualityCard.tsx#L70-L88).
- **Screen Reader Text:** Hidden screen-reader descriptions (`sr-only`) describe the exact meaning of every gauge, metric, and forecast point: [`src/components/AirQualityCard.tsx`](file:///src/components/AirQualityCard.tsx#L107-L109), [`src/components/ForecastTimeline.tsx`](file:///src/components/ForecastTimeline.tsx#L61-L63).
- **Sample Data Notice:** Visible badge paired with `role="status"` and `aria-label="Sample data notice"`: [`src/components/AirQualityCard.tsx`](file:///src/components/AirQualityCard.tsx#L57-L66).

### 4. Full Keyboard Navigation & Focus Management
- **Keyboard Traversal:** All interactive elements (buttons, radio groups, checkboxes, textareas) are reachable and operable via keyboard Tab and Enter/Space: [`src/components/PlanCard.tsx`](file:///src/components/PlanCard.tsx).
- **Modal Escape Key:** Pressing Escape immediately closes the community advisory dialog: [`src/components/CommunityAdvisoryModal.tsx`](file:///src/components/CommunityAdvisoryModal.tsx#L45-L53).
- **Scrollable Regions:** The horizontal hourly forecast timeline has `tabIndex={0}` and `role="region"` with an `aria-label`, allowing keyboard users to scroll horizontally: [`src/components/ForecastTimeline.tsx`](file:///src/components/ForecastTimeline.tsx#L33-L37).
- **Focus Rings:** Visible focus outlines (`focus-visible:ring-2 focus-visible:ring-emerald-500`) are applied across all interactive controls.
- Verification: [`src/test/components-cards.test.tsx`](file:///src/test/components-cards.test.tsx), [`src/test/components-form.test.tsx`](file:///src/test/components-form.test.tsx).
