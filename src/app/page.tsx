'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { OnboardingForm } from '@/components/OnboardingForm';
import { LoadingState } from '@/components/LoadingState';
import { CommunityAdvisoryModal } from '@/components/CommunityAdvisoryModal';
import { PlanDashboard } from '@/components/PlanDashboard';
import { PlanRequest, PlanResponse } from '@/lib/plan/types';

const STORAGE_KEY = 'saafhawa_profile';

export default function HomePage() {
  const [profile, setProfile] = useState<PlanRequest | null>(null);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [isAdvisoryModalOpen, setIsAdvisoryModalOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

  const fetchPlan = async (currentProfile: PlanRequest) => {
    setIsLoading(true);
    setErrorMessage(null);
    setLiveAnnouncement('Generating your clean air action plan...');

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
      setLiveAnnouncement(
        `Action plan ready for ${planData.location.name}. ${planData.actions.length} clean air interventions recommended, avoiding ${planData.summary.totalPm25InhaledDoseAvoidedUg} micrograms of PM2.5 inhaled dose.`
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred while generating your plan.';
      setErrorMessage(message);
      setLiveAnnouncement(`Error: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

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
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {liveAnnouncement}
        </div>

        {(!profile || isEditingProfile) && !isLoading && (
          <OnboardingForm
            initialProfile={profile}
            onSubmit={handleProfileSubmit}
            onCancel={profile ? () => setIsEditingProfile(false) : undefined}
            isEditing={Boolean(profile)}
          />
        )}

        {isLoading && <LoadingState isSampleData={plan?.isSampleData} />}

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

        {plan && !isLoading && !isEditingProfile && (
          <PlanDashboard
            plan={plan}
            profile={profile}
            currentPlaceName={currentPlaceName}
            onOpenAdvisoryModal={() => setIsAdvisoryModalOpen(true)}
          />
        )}
      </main>

      <CommunityAdvisoryModal
        isOpen={isAdvisoryModalOpen}
        onClose={() => setIsAdvisoryModalOpen(false)}
        place={currentPlaceName}
      />
    </div>
  );
}
