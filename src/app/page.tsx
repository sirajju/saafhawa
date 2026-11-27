'use client';

import { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { OnboardingForm } from '@/components/OnboardingForm';
import { LoadingState } from '@/components/LoadingState';
import { CommunityAdvisoryModal } from '@/components/CommunityAdvisoryModal';
import { PlanDashboard } from '@/components/PlanDashboard';
import { ViewSwitch } from '@/components/ViewSwitch';
import { Footer } from '@/components/Footer';
import { ErrorState } from '@/components/ui/ErrorState';
import { type PlanRequest, type PlanResponse, PlanRequestSchema } from '@/lib/plan/types';
import { STORAGE_KEYS } from '@/lib/constants';
import { preferredScrollBehavior } from '@/lib/motion';

export default function HomePage() {
  const [profile, setProfile] = useState<PlanRequest | null>(null);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<'dash' | 'onb'>('onb');
  const [isAdvisoryModalOpen, setIsAdvisoryModalOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

  const isOnboarding = currentView === 'onb' || !plan;

  useEffect(() => {
    document.body.classList.toggle('on-onb', isOnboarding);
  }, [isOnboarding]);

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
      setCurrentView('dash');
      setLiveAnnouncement(
        `Action plan ready for ${planData.location.name}. ${planData.actions.length} clean air interventions recommended.`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
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
        const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
        if (saved) {
          const parsed = PlanRequestSchema.safeParse(JSON.parse(saved));
          if (!parsed.success) {
            localStorage.removeItem(STORAGE_KEYS.PROFILE);
            return;
          }
          if (isMounted) {
            setProfile(parsed.data);
            await fetchPlan(parsed.data);
          }
        }
      } catch {
        // Fallback to fresh onboarding
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    void loadSavedProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleProfileSubmit = (newProfile: PlanRequest) => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(newProfile));
    } catch {
      // Local storage safety
    }
    setProfile(newProfile);
    void fetchPlan(newProfile);
  };

  const currentPlaceName =
    plan && currentView === 'dash' ? plan.location.name || profile?.place || '' : '';
  const lookupPlace =
    profile?.coordinates ||
    (plan ? `${plan.location.latitude}, ${plan.location.longitude}` : profile?.place || '');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', flexDirection: 'column' }}>
      <Navbar
        currentPlace={currentPlaceName}
        onEditProfile={plan ? () => setCurrentView('onb') : undefined}
      />

      <main id="main-content" style={{ flex: 1, width: '100%' }}>
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {liveAnnouncement}
        </div>

        {isOnboarding && !isLoading && (
          <OnboardingForm initialProfile={profile} onSubmit={handleProfileSubmit} />
        )}

        {isLoading && <LoadingState />}

        {errorMessage && !isLoading && (
          <ErrorState
            message={errorMessage}
            onRetry={profile ? () => fetchPlan(profile) : undefined}
            onChangeLocation={() => setCurrentView('onb')}
          />
        )}

        {plan && !isLoading && currentView === 'dash' && (
          <PlanDashboard
            plan={plan}
            profile={profile}
            currentPlaceName={currentPlaceName}
            lookupPlace={lookupPlace}
            onOpenAdvisoryModal={() => setIsAdvisoryModalOpen(true)}
            onRetry={profile ? () => fetchPlan(profile) : undefined}
          />
        )}
      </main>

      {plan && !isLoading && (
        <ViewSwitch
          currentView={currentView}
          onChangeView={(v) => {
            setCurrentView(v);
            window.scrollTo({ top: 0, behavior: preferredScrollBehavior() });
          }}
        />
      )}

      <Footer dataSource={plan?.currentAirQuality?.dataSource} />

      <CommunityAdvisoryModal
        isOpen={isAdvisoryModalOpen}
        onClose={() => setIsAdvisoryModalOpen(false)}
        place={lookupPlace || currentPlaceName}
        displayPlace={currentPlaceName}
      />
    </div>
  );
}
