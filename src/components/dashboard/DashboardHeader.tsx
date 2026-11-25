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
}

export function DashboardHeader({
  headingRef,
  plan,
  currentPlaceName,
  onOpenAdvisoryModal,
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

      {plan.isSampleData && (
        <div
          role="status"
          aria-label="Sample data mode active notice"
          className="mb-6 inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 py-1.5 text-[13px] text-[var(--ink-2)]"
        >
          <AlertTriangleIcon className="icon" />
          <span>Sample Data: Using built-in reference air quality data.</span>
        </div>
      )}
    </div>
  );
}
