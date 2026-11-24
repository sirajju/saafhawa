'use client';

import React from 'react';
import { AirQualityCard } from '@/components/AirQualityCard';
import { TotalSavingsBanner } from '@/components/TotalSavingsBanner';
import { ActionCategorySection } from '@/components/ActionCategorySection';
import { ChatPanel } from '@/components/ChatPanel';
import { PlannedAction, PlanRequest, PlanResponse } from '@/lib/plan/types';

interface PlanDashboardProps {
  plan: PlanResponse;
  profile: PlanRequest | null;
  currentPlaceName: string;
  onOpenAdvisoryModal: () => void;
}

export function PlanDashboard({
  plan,
  profile,
  currentPlaceName,
  onOpenAdvisoryModal,
}: PlanDashboardProps) {
  const dailyRoutineActions: PlannedAction[] =
    plan.actions.filter((a) => a.category === 'daily_routine') || [];
  const indoorAirActions: PlannedAction[] =
    plan.actions.filter((a) => a.category === 'indoor_air') || [];
  const sustainableSwapActions: PlannedAction[] =
    plan.actions.filter((a) => a.category === 'sustainable_swaps') || [];

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 pt-6 sm:px-6 sm:pt-8">
      <header className="border-b border-slate-200 pb-4 dark:border-slate-800">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-slate-50">
          Clean Air Action Plan for {plan.location.name}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Tailored daily routine, indoor air interventions, and low-emission swaps for your household.
        </p>
      </header>

      {plan.isSampleData && (
        <div
          role="status"
          aria-label="Sample data mode active notice"
          className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 shadow-sm dark:border-amber-800 dark:bg-amber-950/60"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">
              ⚠️
            </span>
            <div>
              <h2 className="text-sm font-bold text-amber-950 dark:text-amber-100">
                Sample Data Mode Active
              </h2>
              <p className="text-xs text-amber-900/90 dark:text-amber-200/90">
                Operating with built-in reference air quality for New Delhi and rule-based action planning because Google API keys are not configured. All features, arithmetic, and recommendations remain fully functional.
              </p>
            </div>
          </div>
        </div>
      )}

      <AirQualityCard
        location={plan.location}
        current={plan.currentAirQuality}
        hourlyForecast={plan.hourlyForecast || []}
        isSampleData={plan.isSampleData}
      />

      <TotalSavingsBanner
        summary={plan.summary}
        generationMethod={plan.generationMethod}
      />

      <section
        aria-label="Community outreach"
        className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:p-5 dark:border-emerald-900/60 dark:bg-emerald-950/30"
      >
        <div className="flex items-center gap-3 text-center sm:text-left">
          <span className="text-2xl" aria-hidden="true">
            📢
          </span>
          <div>
            <h2 className="text-sm font-bold text-emerald-950 dark:text-emerald-100">
              Empower Your Neighborhood or School Today
            </h2>
            <p className="text-xs text-emerald-900 dark:text-emerald-300">
              Generate an instant WhatsApp advisory formatted in English or Hindi for your RWA or parent group.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenAdvisoryModal}
          className="inline-flex min-h-[44px] min-w-[44px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <span>Share with My Community</span>
          <span aria-hidden="true">→</span>
        </button>
      </section>

      <div className="space-y-10 pt-2">
        <ActionCategorySection
          id="daily-routine"
          icon="🌅"
          title="Daily Routine & Outdoor Guidance"
          subtitle="Smart timing and protective equipment shifts tailored to your family's daily movement."
          badgeClass="bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200"
          actions={dailyRoutineActions}
        />

        <ActionCategorySection
          id="indoor-air"
          icon="🏠"
          title="Indoor Air Quality Hacks"
          subtitle="Affordable filtration, source control, and ventilation strategies to keep your home safe."
          badgeClass="bg-teal-100 text-teal-900 dark:bg-teal-950/80 dark:text-teal-200"
          actions={indoorAirActions}
        />

        <ActionCategorySection
          id="sustainable-swaps"
          icon="🚲"
          title="Sustainable Swaps & Emission Reductions"
          subtitle="Commute, fuel, and waste alternatives that eliminate source emissions for the community."
          badgeClass="bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200"
          actions={sustainableSwapActions}
        />
      </div>

      <div className="pt-4">
        <ChatPanel
          place={currentPlaceName}
          householdProfile={profile}
        />
      </div>

      <footer className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        <p className="font-medium text-slate-700 dark:text-slate-300">
          SaafHawa is built to help families and communities navigate severe winter smog through collective action.
        </p>
        <p className="mt-1">
          Data provided via Google Maps Platform & Central Pollution Control Board (CPCB) standards. Impact numbers are calculated by deterministic physical exposure models.
        </p>
      </footer>
    </div>
  );
}
