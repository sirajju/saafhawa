# Accessibility Implementation & Practices

This document details the accessibility features built into **SaafHawa**, linking each feature directly to the source code implementing and testing it.

---

### 1. Semantic HTML & Hierarchical Heading Order

- **Main Landmark & Skip Link:** The primary page content is enclosed in `<main id="main-content">` with a prominent skip link (`Skip to main content`): [`src/app/page.tsx`](../src/app/page.tsx), [`src/components/Navbar.tsx`](../src/components/Navbar.tsx).
- **Correct Heading Order:** The dashboard provides a top-level `<h1>Today in {place}</h1>`, followed sequentially by `<h2>` section headings and `<h3>` individual action titles. Each onboarding step has one `<h1>` with its questions as `<h2>`, so no level is skipped: [`src/components/PlanDashboard.tsx`](../src/components/PlanDashboard.tsx), [`src/components/dashboard/DashboardHeader.tsx`](../src/components/dashboard/DashboardHeader.tsx), [`src/components/dashboard/DailyTimeline.tsx`](../src/components/dashboard/DailyTimeline.tsx).
- **Article Landmarks:** Every daily action intervention uses an `<article>` tag with clear role and state bindings: [`src/components/dashboard/DailyTimelineItem.tsx`](../src/components/dashboard/DailyTimelineItem.tsx).
- **Dialog Roles:** The community advisory modal and the mobile full-height chat sheet are configured with `role="dialog"`, `aria-modal="true"`, and explicit `aria-labelledby` headings pointing to their scoped header IDs without duplicates: [`src/components/CommunityAdvisoryModal.tsx`](../src/components/CommunityAdvisoryModal.tsx), [`src/components/PlanDashboard.tsx`](../src/components/PlanDashboard.tsx), [`src/components/ChatPanel.tsx`](../src/components/ChatPanel.tsx).
- **View Switch Landmark:** The floating Dashboard / Household switch sits inside `<nav aria-label="Views">` and uses a `role="group"` of toggle buttons (`aria-pressed`), so all content belongs to a landmark: [`src/components/ViewSwitch.tsx`](../src/components/ViewSwitch.tsx).
- **Label in Name (WCAG 2.5.3):** Controls with extra context keep their visible text at the start of the accessible name (e.g. the place pill is announced as "Kozhikode: edit household profile"; the share button as "Share with society (advisory for Kozhikode)"): [`src/components/Navbar.tsx`](../src/components/Navbar.tsx), [`src/components/dashboard/DashboardHeader.tsx`](../src/components/dashboard/DashboardHeader.tsx).

---

### 2. Focus Management, Focus Trap & Return Focus

- **Modal & Sheet Focus Trap:** When `CommunityAdvisoryModal` or the mobile full-height chat sheet opens, focus is directed inside the modal dialog. Keyboard `Tab` and `Shift+Tab` cycles strictly within modal elements without leaking to the background page: [`src/lib/use-focus-trap.ts`](../src/lib/use-focus-trap.ts), [`src/components/CommunityAdvisoryModal.tsx`](../src/components/CommunityAdvisoryModal.tsx), [`src/components/PlanDashboard.tsx`](../src/components/PlanDashboard.tsx). Parent re-renders maintain stable focus because `onClose` is held in a ref.
- **Return Focus on Close:** Upon closing either dialog (via the Escape key or the Close button), focus is immediately restored to the triggering element that originally opened it.
- **Top of Page & Heading Focus on Load:** When the plan loads, the page keeps the top of the dashboard in view (`window.scrollTo({ top: 0, left: 0 })`) and programmatically shifts focus to the plan heading `<h1>` (`tabIndex={-1}`) so screen reader users immediately hear the destination: [`src/components/PlanDashboard.tsx`](../src/components/PlanDashboard.tsx), [`src/components/dashboard/DashboardHeader.tsx`](../src/components/dashboard/DashboardHeader.tsx).
- **Verification:** [`src/test/components-advisory-dialog.test.tsx`](../src/test/components-advisory-dialog.test.tsx), [`src/test/components-mobile-chat-sheet.test.tsx`](../src/test/components-mobile-chat-sheet.test.tsx), [`src/test/usability-timeline.test.tsx`](../src/test/usability-timeline.test.tsx), [`src/test/use-focus-trap.test.tsx`](../src/test/use-focus-trap.test.tsx).

---

### 3. Color Contrast Compliance & Target Sizes

- **High-Contrast Deep Teal & Secondary Ink:** All primary action buttons, choice chips, and navigation badges use `--brand` (`#0e5a55` in light mode, `#5fc4b8` in dark mode) providing verified WCAG AA contrast ($\ge 4.5:1$ against surface backgrounds): [`src/app/styles/tokens.css`](../src/app/styles/tokens.css), [`src/components/Navbar.tsx`](../src/components/Navbar.tsx), [`src/components/PlanDashboard.tsx`](../src/components/PlanDashboard.tsx), [`src/components/OnboardingForm.tsx`](../src/components/OnboardingForm.tsx). Secondary text tokens use `--ink-3` (`#666b75` in light mode, `#8a909b` in dark mode) providing verified $\ge 4.5:1$ contrast against light background (`#f6f5f1`) and surface tiers.
- **Mobile Body Text ≥ 15px:** Body copy enforces minimum 15px/16px font sizes across mobile viewports to prevent auto-zoom and visual strain.
- **Target Sizes (WCAG 2.2 SC 2.5.8):** All primary touch controls (such as the navigation bar actions, onboarding navigation footer buttons, primary submission button, and mobile chat button) meet or exceed 44×44px / 48px touch dimensions. Compact inline controls (such as the 36px modal close button, 32px theme toggle buttons, and segmented controls) strictly comply with WCAG 2.2 Target Size (Minimum) SC 2.5.8 ($\ge 24\times 24$ CSS pixels with sufficient spacing): [`src/components/Navbar.tsx`](../src/components/Navbar.tsx), [`src/components/OnboardingForm.tsx`](../src/components/OnboardingForm.tsx), [`src/components/ChatHeader.tsx`](../src/components/ChatHeader.tsx).
- **AQI Colours as Graphics (WCAG 1.4.11):** In the light theme the Satisfactory (`#5a8220`) and Moderate (`#9a6f00`) colours reach at least 4.1:1 against every background they sit on. Past timeline periods are de-emphasised with desaturation rather than opacity, so their text keeps full contrast: [`src/app/styles/tokens.css`](../src/app/styles/tokens.css), [`src/app/styles/timeline.css`](../src/app/styles/timeline.css).

---

### 4. Native Radios & Keyboard Arrow Navigation

- Audience and language pickers in the advisory modal use native `<input type="radio">` controls wrapped in styled labels. Users can navigate options seamlessly using keyboard Arrow keys (Left/Right/Up/Down) with automatic selection and single-tab departure: [`src/components/AdvisorySelectorBar.tsx`](../src/components/AdvisorySelectorBar.tsx).
- **Visible Keyboard Focus:** Because the radios are visually hidden inside their labels, the label shows a 2px brand outline when its radio has keyboard focus (`.seg label:has(input:focus-visible)`): [`src/app/styles/layout.css`](../src/app/styles/layout.css).

---

### 5. Multilingual Language Marking

- All Hindi / Devanagari content is explicitly marked with `lang="hi"` (including brand Hindi text, language selector labels, and rendered advisory bodies) to ensure screen readers switch to appropriate pronunciation engines:
  - [`src/components/Navbar.tsx`](../src/components/Navbar.tsx)
  - [`src/components/AdvisorySelectorBar.tsx`](../src/components/AdvisorySelectorBar.tsx)
  - [`src/components/AdvisoryModalBody.tsx`](../src/components/AdvisoryModalBody.tsx)
- Verification: [`src/test/components-advisory-dialog.test.tsx`](../src/test/components-advisory-dialog.test.tsx).

---

### 6. Labelled Choice Groups, Associated Labels & Error Linkage

- Onboarding choices (commute mode, distance, fuel, budget and similar) are rendered as labelled radio groups (`role="radiogroup"` with `role="radio"` options and `aria-checked`), each under a visible `<h2>` question, with arrow-key navigation: [`src/components/onboarding/OptionGroup.tsx`](../src/components/onboarding/OptionGroup.tsx), [`src/components/onboarding/OnboardingStep1.tsx`](../src/components/onboarding/OnboardingStep1.tsx), [`src/components/onboarding/OnboardingStep2.tsx`](../src/components/onboarding/OnboardingStep2.tsx), [`src/components/onboarding/OnboardingStep3.tsx`](../src/components/onboarding/OnboardingStep3.tsx).
- Text inputs have an explicit `<label htmlFor="...">` association: [`src/components/onboarding/OnboardingStep1.tsx`](../src/components/onboarding/OnboardingStep1.tsx).
- **Error Linkage:** When validation fails, the area input receives `aria-invalid="true"` and is tied to its hint and error message via `aria-describedby`; the message region is `aria-live="polite"`.
- Verification: [`src/test/components-form.test.tsx`](../src/test/components-form.test.tsx).

---

### 7. Scoped Live Regions & Instant Form Display

- **One region per concern, each announced once:** plan loading and readiness ([`src/app/page.tsx`](../src/app/page.tsx), `role="status"`, `aria-atomic`); the chat conversation ([`src/components/ChatMessageList.tsx`](../src/components/ChatMessageList.tsx), `role="log"`); advisory generation and "Copied" confirmation ([`src/components/AdvisoryModalBody.tsx`](../src/components/AdvisoryModalBody.tsx), [`src/components/AdvisoryModalFooter.tsx`](../src/components/AdvisoryModalFooter.tsx), `role="status"`); and AI fallback notices ([`src/components/dashboard/DashboardHeader.tsx`](../src/components/dashboard/DashboardHeader.tsx)). Chat errors are added to the conversation log only, not to a second alert, so they are not read twice.
- **Immediate Form Display:** First-time visitors are presented with the onboarding form immediately on initial load without a loading screen flash (`isLoading: false` initial state): [`src/app/page.tsx`](../src/app/page.tsx).

---

### 8. Reduced Motion Support & No Color-Alone Status

- **Reduced Motion:** A global `@media (prefers-reduced-motion: reduce)` block in [`src/app/styles/responsive.css`](../src/app/styles/responsive.css) disables animations, smooth scrolls, and transitions under user preference. JavaScript-driven scrolling (chat auto-scroll, back-to-top) also switches to instant scrolling for that preference: [`src/lib/motion.ts`](../src/lib/motion.ts).
- **No Color-Alone Status:** Air quality categories (Good, Satisfactory, Moderate, Poor, Very Poor, Severe) are always accompanied by textual category names, numeric ranges, and descriptive icons: [`src/components/AirQualityCard.tsx`](../src/components/AirQualityCard.tsx). Screen-reader text equivalents (`sr-only`) describe every chart, timeline point, and gauge.
- **24-Hour Forecast Chart Summary:** The SVG chart is a `role="img"` with a short name, followed by a visually hidden (not focusable) text summary of the current hour, the cleanest window and the peak smog hour, so the details are read once: [`src/components/ForecastChart.tsx`](../src/components/ForecastChart.tsx), [`src/components/forecast/ForecastChartSvg.tsx`](../src/components/forecast/ForecastChartSvg.tsx).

---

### 9. Calm Design System & Responsive Modalities

- **Dual Responsive Chat Modality:** On mobile devices ($< 1024$px), chat opens via an accessible floating button (`aria-label="Ask SaafHawa Assistant"`) into a full-height sheet modal (`role="dialog"`, `aria-modal="true"`) with a dedicated close button. On desktop, it is rendered as a sticky side panel (`role="region"`): [`src/components/PlanDashboard.tsx`](../src/components/PlanDashboard.tsx), [`src/components/ChatPanel.tsx`](../src/components/ChatPanel.tsx).
- **Isolated AQI Category Tokens:** Indian National CPCB AQI colors are strictly isolated to air quality numbers, category badges, and forecast bars. UI buttons, interactive cards, and navigation controls never overload AQI colors: [`src/lib/design-system.ts`](../src/lib/design-system.ts).
- **Adjusted Totals Explanation:** The cumulative impact banner plainly explains underneath that overlapping actions are adjusted, clarifying why cumulative totals can be less than the cards added together: [`src/components/TotalSavingsBanner.tsx`](../src/components/TotalSavingsBanner.tsx).
- **Accessible Data Source Attribution & Local Time:** The data source (e.g. Open-Meteo Copernicus CAMS, CPCB Ground Station) and local measurement time are rendered with semantic text and high-contrast typography in [`src/components/AirQualityCard.tsx`](../src/components/AirQualityCard.tsx), follow-up chat, and community advisories.

---

### 10. Automated Accessibility Testing

- [`e2e/accessibility-axe.spec.ts`](../e2e/accessibility-axe.spec.ts) runs axe-core (`@axe-core/playwright`) with the WCAG 2.0/2.1/2.2 A and AA rule sets against onboarding, the dashboard, the advisory dialog and the assistant chat dialog, in both light and dark themes, and fails on any serious or critical violation. It runs in CI with the rest of the Playwright suite (8 checks, all passing).
- Component-level checks (focus trap, return focus, `lang="hi"`, live regions, labels) run in Vitest: see [`docs/TESTING.md`](TESTING.md).
