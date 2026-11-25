'use client';

import React from 'react';
import { PlannedAction } from '@/lib/plan/types';
import { PlanCard } from '@/components/PlanCard';
import { ClockIcon, SunriseIcon, SunIcon, SunsetIcon, MoonIcon } from '@/components/ui/Icons';
import { getLocalTimeDetails } from '@/lib/air-quality/forecast-advice';

export type TimeSlot = 'anytime' | 'morning' | 'afternoon' | 'evening' | 'night';

export const TIME_SLOTS: Array<{
  id: TimeSlot;
  label: string;
  hours: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'anytime',
    label: 'Any time today',
    hours: 'Flexible / All Day',
    icon: ClockIcon,
  },
  {
    id: 'morning',
    label: 'Morning',
    hours: '6 AM – 12 PM',
    icon: SunriseIcon,
  },
  {
    id: 'afternoon',
    label: 'Afternoon',
    hours: '12 PM – 5 PM',
    icon: SunIcon,
  },
  {
    id: 'evening',
    label: 'Evening',
    hours: '5 PM – 9 PM',
    icon: SunsetIcon,
  },
  {
    id: 'night',
    label: 'Night',
    hours: '9 PM – 6 AM',
    icon: MoonIcon,
  },
];

export function getTimeSlotForAction(action: PlannedAction): TimeSlot {
  const s = (action.suggestedTimeOfDay || '').toLowerCase();
  const id = action.actionId.toLowerCase();

  if (
    s.includes('all day') ||
    s.includes('daytime setup') ||
    s.includes('setup') ||
    s.includes('anytime') ||
    s.includes('any time') ||
    s.includes('flexible') ||
    s.includes('ongoing')
  ) {
    return 'anytime';
  }

  if (s.includes('night') || s.includes('bedtime') || s.includes('sleep') || id.includes('bedroom')) {
    return 'night';
  }
  if (s.includes('evening') || s.includes('post-commute') || s.includes('sunset')) {
    return 'evening';
  }
  if (
    s.includes('afternoon') ||
    s.includes('midday') ||
    s.includes('lunch') ||
    s.includes('1 pm') ||
    s.includes('2 pm') ||
    s.includes('3 pm') ||
    s.includes('meal') ||
    s.includes('cooking')
  ) {
    return 'afternoon';
  }
  if (s.includes('morning') || s.includes('commute') || s.includes('early') || s.includes('breakfast')) {
    return 'morning';
  }

  return 'anytime';
}

export function isTimeSlotPassed(slot: TimeSlot, localHour: number): boolean {
  if (slot === 'anytime') return false;
  if (slot === 'morning') return localHour >= 12;
  if (slot === 'afternoon') return localHour >= 17;
  if (slot === 'evening') return localHour >= 21;
  if (slot === 'night') return localHour >= 6 && localHour < 21;
  return false;
}

interface DailyTimelineProps {
  actions: PlannedAction[];
  completedActionIds: string[];
  onToggleActionDone: (actionId: string) => void;
  timeZone?: string;
  referenceNow?: Date;
}

export function DailyTimeline({
  actions,
  completedActionIds,
  onToggleActionDone,
  timeZone = 'Asia/Kolkata',
  referenceNow = new Date(),
}: DailyTimelineProps) {
  const localDetails = getLocalTimeDetails(referenceNow.toISOString(), timeZone);
  const currentHour = localDetails.hour;

  // Group actions
  const timelineGroups: Record<TimeSlot, PlannedAction[]> = {
    anytime: [],
    morning: [],
    afternoon: [],
    evening: [],
    night: [],
  };

  actions.forEach((action) => {
    const slot = getTimeSlotForAction(action);
    timelineGroups[slot].push(action);
  });

  return (
    <div className="space-y-8" role="region" aria-label="Daily action plan timeline">
      {TIME_SLOTS.map((slot) => {
        const slotActions = timelineGroups[slot.id];
        if (slotActions.length === 0) return null;

        const SlotIcon = slot.icon;
        const isPassed = isTimeSlotPassed(slot.id, currentHour);

        return (
          <section
            key={slot.id}
            aria-labelledby={`timeline-heading-${slot.id}`}
            className={`rounded-2xl border p-5 sm:p-6 transition-colors ${
              isPassed
                ? 'border-slate-200/60 bg-slate-50/50 opacity-90 dark:border-slate-800/60 dark:bg-slate-900/40'
                : 'border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    isPassed
                      ? 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      : 'bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                  }`}
                >
                  <SlotIcon className="h-4 w-4" />
                </div>
                <div>
                  <h3
                    id={`timeline-heading-${slot.id}`}
                    className="text-base font-bold text-slate-900 dark:text-slate-50"
                  >
                    {slot.label}
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{slot.hours}</span>
                </div>
              </div>

              {isPassed && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  Passed earlier today
                </span>
              )}
            </div>

            <div className="mt-4 space-y-4">
              {slotActions.map((action) => (
                <PlanCard
                  key={action.actionId}
                  action={action}
                  isCompleted={completedActionIds.includes(action.actionId)}
                  onToggleDone={() => onToggleActionDone(action.actionId)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
