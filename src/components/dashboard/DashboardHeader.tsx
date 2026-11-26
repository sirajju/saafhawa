'use client';

import React from 'react';
import { PlanResponse } from '@/lib/plan/types';
import { ShareIcon, AlertTriangleIcon } from '@/components/ui/Icons';
import { getShortPlaceName, getHouseholdSummary } from '@/lib/design-system';

interface DashboardHeaderProps {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  plan: PlanResponse;
  currentPlaceName: string;
  onOpenAdvisoryModal?: () => void;
  onRetry?: () => void;
}

export function DashboardHeader({
  headingRef,
  plan,
  currentPlaceName,
  onOpenAdvisoryModal,
  onRetry,
}: DashboardHeaderProps) {
  const fullPlace = plan.location.name || currentPlaceName;
  const shortPlace = getShortPlaceName(fullPlace);
  const summaryLine = getHouseholdSummary(plan.householdProfile);

  return (
    <div>
      <div className="title-row">
        <div>
          <h1
            ref={headingRef}
            tabIndex={-1}
            style={{ outline: 'none' }}
            className="focus:outline-none"
          >
            Today in {shortPlace}
            <span className="sr-only"> Clean Air Action Plan for {shortPlace}</span>
            {fullPlace && fullPlace !== shortPlace && (
              <span className="sr-only"> ({fullPlace})</span>
            )}
          </h1>
          <p>{summaryLine}</p>
        </div>

        {onOpenAdvisoryModal && (
          <button
            type="button"
            onClick={onOpenAdvisoryModal}
            aria-label={`Share advisory for ${shortPlace}`}
            className="btn hide-sm"
          >
            <ShareIcon className="icon" />
            <span>Share with society</span>
          </button>
        )}
      </div>

      {plan.generationMethod === 'rule_based_fallback' && plan.fallbackReason === 'gemini_busy' && (
        <div
          role="status"
          aria-label="Gemini busy notice"
          className="mb-6 flex items-center justify-between gap-3 flex-wrap rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-[13px] text-[var(--ink-2)]"
        >
          <div className="flex items-center gap-2">
            <AlertTriangleIcon className="icon text-amber-600 dark:text-amber-400" />
            <span>Gemini is busy right now, so this plan was built by our rules. Try again in a minute.</span>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="btn btn-sm"
              style={{ padding: '2px 10px', fontSize: '12px', height: '26px' }}
            >
              Retry
            </button>
          )}
        </div>
      )}

      {plan.generationMethod === 'rule_based_fallback' && plan.fallbackReason === 'daily_quota_exhausted' && (
        <div
          role="status"
          aria-label="Daily quota exhausted notice"
          className="mb-6 flex items-center justify-between gap-3 flex-wrap rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-[13px] text-[var(--ink-2)]"
        >
          <div className="flex items-center gap-2">
            <AlertTriangleIcon className="icon text-amber-600 dark:text-amber-400" />
            <span>Today&apos;s free Gemini limit is used up, so plans are built by our rules until {plan.dailyQuotaResetTime || 'tomorrow'}.</span>
          </div>
        </div>
      )}
    </div>
  );
}
