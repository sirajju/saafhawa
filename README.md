# SaafHawa (Clean Air Assistant) 🌫️🌱

> A smart winter smog mitigation assistant built for families and communities to navigate severe air quality crises with low-emission routines, indoor air quality hacks, and measurable impact tracking.

---

## 📋 Project Brief

During severe winter smog episodes, toxic particulate levels (PM2.5 / PM10) skyrocket, severely threatening public health, particularly for children, the elderly, and vulnerable populations. **SaafHawa** is a dedicated hackathon web application that empowers individuals, families, and neighborhood communities to take proactive control during hazardous air events.

### Core Objectives:
- **Personalized Smog Survival & Routine Guidance**: Suggest actionable, low-emission daily routines and travel/heating alternatives tailored to where the user lives (local microclimate and AQI) and how they live (housing type, commute, heating methods, household makeup).
- **Indoor Air Quality (IAQ) Hacks**: Provide affordable, DIY, and accessible indoor air purification and ventilation strategies to minimize indoor particulate exposure.
- **Measurable Impact Visualization**: Clearly showcase the immediate and cumulative impact of every choice—contrasting business-as-usual emissions/exposure with recommended clean alternatives (e.g., exposure reduction, emissions avoided, cost savings).
- **Community-Level Resilience**: Offer community-wide coordination tips and collective emission-reduction alerts during peak smog days.

---

## 🏗️ Architecture Overview

The application is structured for fast iteration, server-side data privacy, and strong type safety using modern web standards.

```
┌────────────────────────────────────────────────────────┐
│                   Client (Browser)                     │
│  - Next.js App Router (React 19)                       │
│  - Tailwind CSS UI Components & Data Visualizations    │
│  - No sensitive credentials or API keys exposed        │
└───────────────────────────┬────────────────────────────┘
                            │
               HTTPS / Next.js Server Actions & API Routes
                            │
┌───────────────────────────▼────────────────────────────┐
│              Next.js Server Runtime (Node.js)          │
│  - Request Validation via Zod Schemas                  │
│  - Environment Secrets (process.env.GOOGLE_MAPS_API_KEY│
│  - Google Geocoding & Air Quality APIs                 │
│  - 15-Minute Caching (Capped Capacity)                 │
│  - Sanitized Error Handling (No Internals Leaked)      │
└────────────────────────────────────────────────────────┘
```

### Technology Stack:
- **Framework**: [Next.js](https://nextjs.org/) (App Router, React 19)
- **Language**: [TypeScript](https://www.typescriptlang.org/) for end-to-end type safety
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Validation**: [Zod](https://zod.dev/) for strict schema validation of API payloads, user inputs, and output reports
- **Testing**: [Vitest](https://vitest.dev/) with JSDOM for fast, modern unit testing
- **Linting & Code Quality**: [ESLint](https://eslint.org/) with `eslint-config-next`
- **Security & Secret Isolation**: Strict server-side secret management—the Google API key is never leaked to client bundles.

---

## 🌫️ Air Quality Module

The application provides a resilient backend service and API endpoint to fetch air quality data:

- **Endpoint**: `GET /api/air-quality?place=<place_or_pincode>`
- **Query Parameter**: Accepts only the parameter `place` (capped between 2 and 120 characters).
- **Index Priority**:
  1. Primary: India's National AQI (`ind_cpcb`, 0–500 scale)
  2. Fallback: Universal AQI (`uaqi`, 0–100 scale)
  3. If no index is returned, AQI returns `null` (not 0).
- **Hourly Forecast**:
  - Sends an explicit 24-hour time period (`startTime` to `endTime`) to the Google Air Quality API.
  - If the forecast request fails, the service still returns current conditions with an empty forecast array.
- **Resilience & Timeouts**:
  - All external requests enforce strict request timeouts.
  - Quota exhaustion (HTTP 429) and network/provider failures (HTTP 503) are caught and returned as clean, user-safe messages without leaking Google's raw error text or internal validation details.
- **Caching**:
  - 15-minute in-memory TTL cache with capacity capped to a few hundred entries and automatic eviction of oldest entries upon overflow.

---

## 📋 Daily Smog Action Plan Generator

The application provides a hybrid AI + scientific arithmetic endpoint to craft customized daily smog survival plans:

- **Endpoint**: `POST /api/plan`
- **Payload**: Receives household profile (place, adults/children/elderly counts, asthma/respiratory vulnerability, commute mode & distance, cooking/heating fuels, purifier ownership, budget).
- **Gemini AI Role**:
  - Uses the official `@google/genai` SDK with strict JSON schema enforcement (`responseSchema`).
  - Selects the 6 to 8 most impactful actions from our 21-action catalogue for this specific household today.
  - Returns **only** `actionId`, `suggestedTimeOfDay`, and an empathetic, friendly `reason`.
  - **Zero Numbers**: Gemini is strictly prohibited from inventing or producing any numerical calculations.
  - Reads model name from `GEMINI_MODEL` (default: `gemini-2.5-flash`).
- **Resilience & Fallback**:
  - Validates all IDs: any ID returned by Gemini that is not in the catalogue is immediately dropped.
  - If Gemini fails, times out, or returns fewer than 4 valid actions, the system automatically triggers a rule-based selection algorithm to ensure the user always receives a complete plan.
- **Scientific Impact Engine**:
  - Deterministic arithmetic from `src/lib/impact/` is attached in code after selection.
  - Provides exact microgram ($\mu g$) inhaled PM2.5 dose avoided and grams of PM2.5 / CO2 emissions saved.

---

## 💬 Conversational Smog Assistant (Function Calling)

Users can ask context-aware follow-up questions (e.g., *"Can my daughter play outside at 5 PM?"*, *"How much PM2.5 do we save if I bike?"*, *"What purifier works on a budget?"*).

- **Endpoint**: `POST /api/chat`
- **Grounding via Function Calling**:
  Instead of guessing air quality numbers or inventing physics equations, Gemini calls tools in code:
  1. `getAirQualityAndForecast`: Retrieves real-time AQI, PM2.5, PM10, and hourly 24-hr forecast via our cached Air Quality module.
  2. `calculateActionImpact`: Runs our deterministic scientific calculator to return exact avoided $\mu\text{g}$ inhaled dose and emissions saved.
  3. `listCatalogueActions`: Explores interventions across daily routines, indoor air hacks, and sustainable swaps.
- **Safety & Boundary Rules**:
  - **Zero Guessing**: Models are forbidden from hallucinating numeric AQI or impact figures.
  - **Strict Scope**: Remains focused on air quality, protective health precautions, and low-emission routines.
  - **Medical Disclaimer**: For questions concerning respiratory symptoms, medication, or asthma attacks, provides general air filtration and sealing precautions while explicitly advising consulting a medical doctor.
- **Protection**:
  - Max 500 characters per message.
  - In-memory sliding-window rate limiting (15 requests/minute per client IP).
  - Graceful rule-based fallback if offline or API key is unconfigured.

---

## 📢 Community Smog Advisory (WhatsApp-Ready)

Enables users to broadcast hyper-local, action-oriented smog advisories to their housing society (RWA) or school/parent groups.

- **Endpoint**: `POST /api/community-advisory`
- **Target Audiences**:
  - `housing_society`: Emphasizes stopping leaf/waste burning, shifting outdoor stroll times, wet mopping common areas, avoiding idle engines, and distributing N95 masks to guards and housekeeping.
  - `school_group`: Focuses on suspending morning outdoor assemblies and sports, enforcing N95 masks on commutes, inhaler preparedness, classroom window sealing, and warm water hydration.
- **Bilingual**: Ready in both **English** and **Hindi** (Devnagari).
- **One-Click Sharing**:
  - Pre-formatted for WhatsApp with bold headers, numbered emojis (`1️⃣`, `2️⃣`), and crisp bullet points.
  - One-click "Copy to Clipboard" with animated visual feedback.
  - Direct "Share to WhatsApp" button (`https://api.whatsapp.com/send?text=...`).
- **Protection**:
  - In-memory sliding-window rate limiting (20 requests/minute per client IP).

---

## 🔒 Security & Environment Variables

All API keys **must remain server-only**.

- **Server-Side Access**: Keys are read strictly within server modules using `process.env.GOOGLE_MAPS_API_KEY` and `process.env.GEMINI_API_KEY`.
- **No Client Exposure**: Never prefix secret keys with `NEXT_PUBLIC_`.
- Reference template: [`.env.example`](./.env.example)

### Setting up Environment Variables:
```bash
cp .env.example .env.local
```

Populate the values in `.env.local`:
```env
GOOGLE_MAPS_API_KEY=your_google_maps_platform_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

---

## 📁 Repository Structure

```
.
├── .env.example            # Template for server-only environment variables
├── eslint.config.mjs       # ESLint configuration
├── next.config.ts          # Next.js configuration
├── package.json            # Scripts & project dependencies
├── tsconfig.json           # TypeScript configuration
├── vitest.config.mts       # Vitest unit test configuration
└── src/
    ├── app/                # Next.js App Router
    │   ├── api/
    │   │   ├── air-quality/route.ts        # GET /api/air-quality?place=...
    │   │   ├── chat/route.ts               # POST /api/chat (function calling)
    │   │   ├── community-advisory/route.ts # POST /api/community-advisory
    │   │   └── plan/route.ts               # POST /api/plan
    │   ├── globals.css     # Global styles & Tailwind CSS
    │   ├── layout.tsx      # Root layout
    │   └── page.tsx        # Dashboard, onboarding, chat & advisory modal
    ├── components/         # Accessible, responsive UI components
    │   ├── AirQualityCard.tsx
    │   ├── ChatPanel.tsx
    │   ├── CommunityAdvisoryModal.tsx
    │   ├── Navbar.tsx
    │   ├── OnboardingModal.tsx
    │   ├── PlanActionCard.tsx
    │   └── PlanImpactSummary.tsx
    ├── lib/
    │   ├── air-quality/    # CPCB & UAQI index fetching, 15-min capped cache
    │   ├── chat/           # Gemini function-calling tools & handlers
    │   ├── community/      # WhatsApp advisory generator in EN & HI
    │   ├── impact/         # Deterministic scientific impact arithmetic
    │   ├── plan/           # Hybrid Gemini + fallback plan generator
    │   └── rate-limit.ts   # Sliding-window IP rate limiter
    └── test/               # Vitest unit & integration test suites
        ├── air-quality.test.ts
        ├── chat-tools.test.ts
        ├── impact.test.ts
        └── plan.test.ts
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v20+ (v22+ recommended)
- **npm**: v10+

### Installation
```bash
npm install
```

### Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### Running Unit Tests
```bash
# Run unit tests once
npm test

# Run unit tests in watch mode
npm run test:watch
```

### Running ESLint & Type Check
```bash
npm run lint
npx tsc --noEmit
```

### Building for Production
```bash
npm run build
npm start
```
