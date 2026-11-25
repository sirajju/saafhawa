'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { OnboardingForm } from '@/components/OnboardingForm';
import { LoadingState } from '@/components/LoadingState';
import { CommunityAdvisoryModal } from '@/components/CommunityAdvisoryModal';
import { PlanDashboard } from '@/components/PlanDashboard';
import { Footer } from '@/components/Footer';
import { ErrorState } from '@/components/ui/ErrorState';
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
    <div className="flex min-h-screen w-full max-w-full overflow-x-hidden min-w-0 flex-col bg-slate-50 font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <Navbar
        currentPlace={currentPlaceName}
        onEditProfile={profile ? () => setIsEditingProfile(true) : undefined}
        onRefresh={profile ? () => fetchPlan(profile) : undefined}
        isLoading={isLoading}
      />

      <main id="main-content" className="flex-1 w-full max-w-full overflow-x-hidden min-w-0 pb-12">
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
          <ErrorState
            message={errorMessage}
            onRetry={profile ? () => fetchPlan(profile) : undefined}
            onChangeLocation={() => setIsEditingProfile(true)}
          />
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

      <Footer dataSource={plan?.currentAirQuality?.dataSource} />

      <CommunityAdvisoryModal
        isOpen={isAdvisoryModalOpen}
        onClose={() => setIsAdvisoryModalOpen(false)}
        place={currentPlaceName}
      />
    </div>
  );
}
