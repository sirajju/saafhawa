'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { OnboardingForm } from '@/components/OnboardingForm';
import { AirQualityCard } from '@/components/AirQualityCard';
import { TotalSavingsBanner } from '@/components/TotalSavingsBanner';
import { PlanCard } from '@/components/PlanCard';
import { LoadingState } from '@/components/LoadingState';
import { ChatPanel } from '@/components/ChatPanel';
import { CommunityAdvisoryModal } from '@/components/CommunityAdvisoryModal';
import { PlannedAction, PlanRequest, PlanResponse } from '@/lib/plan/types';

const STORAGE_KEY = 'saafhawa_profile';

export default function HomePage() {
  const [profile, setProfile] = useState<PlanRequest | null>(null);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [isAdvisoryModalOpen, setIsAdvisoryModalOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchPlan = async (currentProfile: PlanRequest) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentProfile),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(
          errData?.message || `Unable to generate smog plan (HTTP ${response.status})`
        );
      }

      const planData: PlanResponse = await response.json();
      setPlan(planData);
      setIsEditingProfile(false);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred while generating your plan.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Load profile from localStorage on initial render
  useEffect(() => {
    let isMounted = true;

    async function loadSavedProfile() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed: PlanRequest = JSON.parse(saved);
          if (isMounted) {
            setProfile(parsed);
            await fetchPlan(parsed);
          }
        } else {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      } catch {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSavedProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleProfileSubmit = (newProfile: PlanRequest) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
    } catch {
      // Storage quota or private browsing safety
    }
    setProfile(newProfile);
    fetchPlan(newProfile);
  };

  // Group actions into the three designated categories
  const dailyRoutineActions: PlannedAction[] =
    plan?.actions.filter((a) => a.category === 'daily_routine') || [];
  const indoorAirActions: PlannedAction[] =
    plan?.actions.filter((a) => a.category === 'indoor_air') || [];
  const sustainableSwapActions: PlannedAction[] =
    plan?.actions.filter((a) => a.category === 'sustainable_swaps') || [];

  const currentPlaceName = plan?.location.name || profile?.place || '110001';

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <Navbar
        currentPlace={currentPlaceName}
        onEditProfile={profile ? () => setIsEditingProfile(true) : undefined}
        onRefresh={profile ? () => fetchPlan(profile) : undefined}
        onOpenCommunityAdvisory={profile ? () => setIsAdvisoryModalOpen(true) : undefined}
        isLoading={isLoading}
      />

      <main id="main-content" className="flex-1 pb-16">
        {/* State 1: Onboarding or Editing Profile */}
        {(!profile || isEditingProfile) && !isLoading && (
          <OnboardingForm
            initialProfile={profile}
            onSubmit={handleProfileSubmit}
            onCancel={profile ? () => setIsEditingProfile(false) : undefined}
            isEditing={Boolean(profile)}
          />
        )}

        {/* State 2: Loading State */}
        {isLoading && <LoadingState />}

        {/* State 3: Error Message */}
        {errorMessage && !isLoading && (
          <div className="mx-auto mt-8 max-w-2xl px-4 sm:px-6">
            <div
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm dark:border-rose-900 dark:bg-rose-950/70"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden="true">
                  ⚠️
                </span>
                <div>
                  <h2 className="text-base font-bold text-rose-950 dark:text-rose-100">
                    Unable to Load Air Quality or Plan
                  </h2>
                  <p className="mt-1 text-sm text-rose-800 dark:text-rose-300">
                    {errorMessage}
                  </p>
                  <div className="mt-4 flex gap-3">
                    {profile && (
                      <button
                        type="button"
                        onClick={() => fetchPlan(profile)}
                        className="rounded-lg bg-rose-700 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                      >
                        Try Again
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(true)}
                      className="rounded-lg border border-rose-300 bg-white px-4 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-200"
                    >
                      Change Location
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* State 4: Active Dashboard */}
        {plan && !isLoading && !isEditingProfile && (
          <div className="mx-auto max-w-6xl space-y-8 px-4 pt-6 sm:px-6 sm:pt-8">
            {/* Top Section: Real-time Air Quality */}
            <AirQualityCard
              location={plan.location}
              current={plan.currentAirQuality}
              hourlyForecast={plan.hourlyForecast || []}
            />

            {/* Total Collective Household Savings Banner */}
            <TotalSavingsBanner
              summary={plan.summary}
              generationMethod={plan.generationMethod}
            />

            {/* Community Share CTA Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:p-5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
              <div className="flex items-center gap-3 text-center sm:text-left">
                <span className="text-2xl" aria-hidden="true">
                  📢
                </span>
                <div>
                  <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-100">
                    Empower Your Neighborhood or School Today
                  </h3>
                  <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
                    Generate an instant WhatsApp advisory formatted in English or Hindi for your RWA or parent group.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAdvisoryModalOpen(true)}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:bg-emerald-500"
              >
                <span>Share with My Community</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>

            {/* Grouped Action Cards */}
            <div className="space-y-10 pt-2">
              {/* Group 1: Daily Routine */}
              {dailyRoutineActions.length > 0 && (
                <section aria-labelledby="daily-routine-heading">
                  <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                    <div>
                      <h2
                        id="daily-routine-heading"
                        className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50"
                      >
                        <span aria-hidden="true">🌅</span>
                        <span>Daily Routine & Outdoor Guidance</span>
                      </h2>
                      <p className="mt-0.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                        Smart timing and protective equipment shifts tailored to your family&apos;s daily movement.
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-950/80 dark:text-amber-200">
                      {dailyRoutineActions.length} Actions
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    {dailyRoutineActions.map((action) => (
                      <PlanCard key={action.actionId} action={action} />
                    ))}
                  </div>
                </section>
              )}

              {/* Group 2: Indoor Air Quality */}
              {indoorAirActions.length > 0 && (
                <section aria-labelledby="indoor-air-heading">
                  <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                    <div>
                      <h2
                        id="indoor-air-heading"
                        className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50"
                      >
                        <span aria-hidden="true">🏠</span>
                        <span>Indoor Air Quality Hacks</span>
                      </h2>
                      <p className="mt-0.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                        Affordable filtration, source control, and ventilation strategies to keep your home safe.
                      </p>
                    </div>
                    <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-900 dark:bg-teal-950/80 dark:text-teal-200">
                      {indoorAirActions.length} Actions
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    {indoorAirActions.map((action) => (
                      <PlanCard key={action.actionId} action={action} />
                    ))}
                  </div>
                </section>
              )}

              {/* Group 3: Sustainable Swaps */}
              {sustainableSwapActions.length > 0 && (
                <section aria-labelledby="sustainable-swaps-heading">
                  <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                    <div>
                      <h2
                        id="sustainable-swaps-heading"
                        className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50"
                      >
                        <span aria-hidden="true">🚲</span>
                        <span>Sustainable Swaps & Emission Reductions</span>
                      </h2>
                      <p className="mt-0.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                        Commute, fuel, and waste alternatives that eliminate source emissions for the community.
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200">
                      {sustainableSwapActions.length} Actions
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    {sustainableSwapActions.map((action) => (
                      <PlanCard key={action.actionId} action={action} />
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Interactive Chat Assistant Panel */}
            <div className="pt-4">
              <ChatPanel
                place={currentPlaceName}
                householdProfile={profile}
              />
            </div>

            {/* Bottom Community Empowerment Note */}
            <footer className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <p className="font-medium text-slate-700 dark:text-slate-300">
                SaafHawa is built to help families and communities navigate severe winter smog through collective action.
              </p>
              <p className="mt-1">
                Data provided via Google Maps Platform & Central Pollution Control Board (CPCB) standards. Impact numbers are calculated by deterministic physical exposure models.
              </p>
            </footer>
          </div>
        )}
      </main>

      {/* Community Advisory Modal */}
      <CommunityAdvisoryModal
        isOpen={isAdvisoryModalOpen}
        onClose={() => setIsAdvisoryModalOpen(false)}
        place={currentPlaceName}
      />
    </div>
  );
}
