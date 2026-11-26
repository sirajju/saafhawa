'use client';

import React, { useEffect, useRef, useState } from 'react';
import { PlanResponse, PlanRequest } from '@/lib/plan/types';
import { AirQualityCard } from './AirQualityCard';
import { TotalSavingsBanner } from './TotalSavingsBanner';
import { DailyTimeline } from './dashboard/DailyTimeline';
import { DashboardHeader } from './dashboard/DashboardHeader';
import { ChatPanel } from './ChatPanel';
import { ChatIcon, ShareIcon } from './ui/Icons';

interface PlanDashboardProps {
  plan: PlanResponse;
  profile: PlanRequest | null;
  currentPlaceName: string;
  lookupPlace?: string;
  onOpenAdvisoryModal?: () => void;
  onRetry?: () => void;
}

function getTodayStorageKey(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `saafhawa_done_${today}`;
}

/**
 * Main dashboard displaying current air quality, 24-hour timeline of planned actions, and cumulative impact.
 */
export function PlanDashboard({
  plan,
  profile,
  currentPlaceName,
  lookupPlace,
  onOpenAdvisoryModal,
  onRetry,
}: PlanDashboardProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
  const lookupQuery =
    lookupPlace ||
    profile?.coordinates ||
    profile?.place ||
    (plan ? `${plan.location.latitude}, ${plan.location.longitude}` : currentPlaceName);

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

  return (
    <div className="wrap page" id="dash">
      {/* Main Content Stack */}
      <div className="stack">
        <DashboardHeader
          headingRef={headingRef}
          plan={plan}
          currentPlaceName={currentPlaceName}
          onOpenAdvisoryModal={onOpenAdvisoryModal}
          onRetry={onRetry}
        />

        {/* 1. Hero Card: AQI + Scale + Advice + 24hr Chart + Meta */}
        <AirQualityCard
          location={plan.location}
          current={plan.currentAirQuality}
          hourlyForecast={plan.hourlyForecast}
          householdProfile={profile}
        />

        {/* 2. Impact Card: 3 clean numbers separated by hairlines */}
        <TotalSavingsBanner
          summary={plan.summary}
          generationMethod={plan.generationMethod}
          fallbackReason={plan.fallbackReason}
          dailyQuotaResetTime={plan.dailyQuotaResetTime}
          onRetry={onRetry}
        />

        {/* 3. Your Plan for Today Card: Timeline by period */}
        <DailyTimeline
          actions={plan.actions}
          completedActionIds={completedActionIds}
          onToggleActionDone={handleToggleActionDone}
          timeZone={plan.location.timeZone}
        />
      </div>

      {/* 360px Right Rail on Desktop (moves below on <=1040px) */}
      <aside className="rail" aria-label="Assistant and Community Share">
        <ChatPanel
          householdProfile={profile || undefined}
          place={lookupQuery}
          displayPlace={currentPlaceName}
          dataSource={plan.currentAirQuality?.dataSource}
          measuredTime={plan.currentAirQuality?.dateTime}
          timeZone={plan.location.timeZone}
        />

        <div
          role="button"
          tabIndex={0}
          onClick={onOpenAdvisoryModal}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenAdvisoryModal?.();
            }
          }}
          className="card share-card"
          aria-label="Warn your society: A ready WhatsApp message in English or Hindi"
        >
          <span
            className="logo-mark"
            style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}
            aria-hidden="true"
          >
            <ShareIcon className="icon" />
          </span>
          <div>
            <h3>Warn your society</h3>
            <p className="caption">A ready WhatsApp message in English or हिन्दी</p>
          </div>
        </div>
      </aside>

      {/* Floating "Ask Assistant" Button on Mobile & Tablet */}
      <div className="lg:hidden chat-fab-mobile fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsMobileChatOpen(true)}
          aria-label="Ask SaafHawa Assistant"
          className="btn btn-primary"
          style={{ height: '48px', padding: '0 20px', borderRadius: '999px', boxShadow: 'var(--shadow)' }}
        >
          <ChatIcon className="icon" />
          <span>Ask Assistant</span>
        </button>
      </div>

      {/* Mobile Full-Height Sheet Modal */}
      {isMobileChatOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="chat-heading"
          className="lg:hidden fixed inset-0 z-50 flex flex-col bg-[var(--surface)] animate-in slide-in-from-bottom duration-200"
        >
          <ChatPanel
            householdProfile={profile || undefined}
            place={lookupQuery}
            displayPlace={currentPlaceName}
            dataSource={plan.currentAirQuality?.dataSource}
            measuredTime={plan.currentAirQuality?.dateTime}
            timeZone={plan.location.timeZone}
            onClose={() => setIsMobileChatOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
