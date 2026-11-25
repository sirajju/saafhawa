/**
 * SaafHawa Calm Health Design System
 * 
 * Tailored for worried parents navigating winter smog:
 * - Brand Color: Deep Teal (reassuring, medical-grade, calm)
 * - AQI Category Colors: Used ONLY for air quality data
 * - Type Scale: One large number per section, body text >= 16px on mobile
 * - Card Style: Single elevated card container without nested bordered boxes
 * - Consistent Buttons: Exactly one primary deep teal action per view
 */

export const DESIGN_SYSTEM = {
  colors: {
    brand: {
      teal: 'teal-800',
      tealDark: 'teal-900',
      tealLight: 'teal-50',
      tealBorder: 'teal-200',
    },
    // AQI Category Colors - STRICTLY reserved for air quality indices only!
    aqiCategories: {
      good: {
        hex: '#16a34a',
        text: 'text-emerald-700 dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-950/60',
        border: 'border-emerald-300 dark:border-emerald-800',
      },
      satisfactory: {
        hex: '#15803d',
        text: 'text-green-700 dark:text-green-400',
        bg: 'bg-green-50 dark:bg-green-950/60',
        border: 'border-green-300 dark:border-green-800',
      },
      moderate: {
        hex: '#d97706',
        text: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-950/60',
        border: 'border-amber-300 dark:border-amber-800',
      },
      poor: {
        hex: '#ea580c',
        text: 'text-orange-600 dark:text-orange-400',
        bg: 'bg-orange-50 dark:bg-orange-950/60',
        border: 'border-orange-300 dark:border-orange-800',
      },
      veryPoor: {
        hex: '#9333ea',
        text: 'text-purple-700 dark:text-purple-400',
        bg: 'bg-purple-50 dark:bg-purple-950/60',
        border: 'border-purple-300 dark:border-purple-800',
      },
      severe: {
        hex: '#be123c',
        text: 'text-rose-700 dark:text-rose-400',
        bg: 'bg-rose-50 dark:bg-rose-950/60',
        border: 'border-rose-300 dark:border-rose-800',
      },
    },
  },
  typography: {
    heroNumber: 'text-5xl sm:text-7xl font-black tracking-tight',
    metricNumber: 'text-2xl sm:text-3xl font-extrabold tracking-tight',
    sectionHeading: 'text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50',
    bodyText: 'text-base leading-relaxed text-slate-700 dark:text-slate-300',
    smallText: 'text-xs text-slate-500 dark:text-slate-400',
  },
  components: {
    card: 'rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-xs dark:border-slate-800 dark:bg-slate-900',
    primaryButton:
      'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-teal-800 px-6 py-2.5 text-base font-semibold text-white shadow-sm transition-all hover:bg-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 dark:bg-teal-700 dark:hover:bg-teal-600',
    secondaryButton:
      'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
  },
} as const;
