'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AirQualityCard } from '@/components/AirQualityCard';
import { TotalSavingsBanner } from '@/components/TotalSavingsBanner';
import { ChatPanel } from '@/components/ChatPanel';
import { PlanRequest, PlanResponse } from '@/lib/plan/types';
import { ChatIcon } from './ui/Icons';
import { DashboardHeader } from './dashboard/DashboardHeader';
import { DailyTimeline } from './dashboard/DailyTimeline';

interface PlanDashboardProps {
  plan: PlanResponse;
  profile: PlanRequest | null;
  currentPlaceName: string;
  onOpenAdvisoryModal: () => void;
}

function getTodayStorageKey(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `saafhawa_done_${today}`;
}

export function PlanDashboard({
  plan,
  profile,
  currentPlaceName,
  onOpenAdvisoryModal,
}: PlanDashboardProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);

  const [completedActionIds, setCompletedActionIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(getTodayStorageKey());
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Storage unavailable fallback
    }
    return [];
  });

  // Focus plan heading and ensure top of page stays in view on load
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    headingRef.current?.focus();
  }, [plan]);

  const handleToggleActionDone = (actionId: string) => {
    setCompletedActionIds((prev) => {
      const updated = prev.includes(actionId) ? prev.filter((id) => id !== actionId) : [...prev, actionId];
      try {
        localStorage.setItem(getTodayStorageKey(), JSON.stringify(updated));
      } catch {
        // Storage unavailable fallback
      }
      return updated;
    });
  };

  const totalActions = plan.actions.length;
  const doneCount = plan.actions.filter((a) => completedActionIds.includes(a.actionId)).length;
  const progressPercent = totalActions > 0 ? Math.round((doneCount / totalActions) * 100) : 0;

  return (
    <div className="mx-auto max-w-6xl w-full min-w-0 px-4 pt-4 sm:px-6 sm:pt-6">
      <DashboardHeader
        headingRef={headingRef}
        plan={plan}
        currentPlaceName={currentPlaceName}
        doneCount={doneCount}
        totalActions={totalActions}
        progressPercent={progressPercent}
        onOpenAdvisoryModal={onOpenAdvisoryModal}
      />

      {/* Main Layout: Plan on Left, Side Panel Chat on Desktop */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Air Quality, Impact Summary & Daily Timeline */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-8">
          <AirQualityCard
            location={plan.location}
            current={plan.currentAirQuality}
            hourlyForecast={plan.hourlyForecast || []}
            isSampleData={plan.isSampleData}
            householdProfile={profile}
          />

          <TotalSavingsBanner summary={plan.summary} generationMethod={plan.generationMethod} />

          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50">
              Today&apos;s Action Timeline
            </h2>
            <DailyTimeline
              actions={plan.actions}
              completedActionIds={completedActionIds}
              onToggleActionDone={handleToggleActionDone}
              timeZone={plan.location.timeZone}
            />
          </div>
        </div>

        {/* Right Column: Desktop Side Panel Chat (Sticky) */}
        <div className="hidden lg:block lg:col-span-5 xl:col-span-4 sticky top-6">
          <ChatPanel
            householdProfile={profile || undefined}
            place={currentPlaceName}
            isSampleData={plan.isSampleData}
          />
        </div>
      </div>

      {/* Floating "Ask Assistant" Button on Mobile & Tablet */}
      <div className="lg:hidden fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsMobileChatOpen(true)}
          aria-label="Ask SaafHawa Assistant"
          className="flex items-center gap-2 rounded-full bg-teal-800 px-5 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 dark:bg-teal-700"
        >
          <ChatIcon className="h-5 w-5" />
          <span>Ask Assistant</span>
        </button>
      </div>

      {/* Mobile Full-Height Sheet Modal */}
      {isMobileChatOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="chat-heading"
          className="lg:hidden fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-900 animate-in slide-in-from-bottom duration-200"
        >
          <ChatPanel
            householdProfile={profile || undefined}
            place={currentPlaceName}
            isSampleData={plan.isSampleData}
            onClose={() => setIsMobileChatOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
