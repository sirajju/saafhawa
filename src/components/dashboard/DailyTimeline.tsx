'use client';

import React from 'react';
import { PlannedAction } from '@/lib/plan/types';
import { getLocalTimeDetails } from '@/lib/air-quality/forecast-advice';
import { DailyTimelineItem } from './DailyTimelineItem';

export type TimeSlot = 'anytime' | 'morning' | 'afternoon' | 'evening' | 'night';

export const TIME_SLOTS: Array<{
  id: TimeSlot;
  label: string;
  sub: string;
}> = [
  { id: 'anytime', label: 'Any time', sub: 'today' },
  { id: 'morning', label: 'Morning', sub: '6 – 12 PM' },
  { id: 'afternoon', label: 'Afternoon', sub: '12 – 5 PM' },
  { id: 'evening', label: 'Evening', sub: '5 – 9 PM' },
  { id: 'night', label: 'Night', sub: '9 PM – 6 AM' },
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

  const totalCount = actions.length;
  const doneCount = actions.filter((a) => completedActionIds.includes(a.actionId)).length;
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

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
    <section aria-labelledby="plan-h" role="region">
      <div className="section-head">
        <h2 id="plan-h">
          Your plan for today
          <span className="sr-only"> Today&apos;s Action Timeline</span>
        </h2>
        <div className="progress">
          <span className="num">
            {doneCount} of {totalCount} done ({progressPercent}%)
          </span>
          <span
            className="progress-track"
            role="progressbar"
            aria-valuenow={doneCount}
            aria-valuemin={0}
            aria-valuemax={totalCount}
            aria-label="Daily plan progress"
          >
            <i style={{ width: `${progressPercent}%` }} />
          </span>
        </div>
      </div>

      <div className="card" id="timeline">
        {TIME_SLOTS.map((slot) => {
          const slotActions = timelineGroups[slot.id];
          if (slotActions.length === 0) return null;
          const isPassed = isTimeSlotPassed(slot.id, currentHour);

          return (
            <div className={`period ${isPassed ? 'past' : ''}`} key={slot.id}>
              <div className="period-label">
                <b>{slot.label}</b>
                <span className="caption">{isPassed ? 'Passed' : slot.sub}</span>
              </div>

              <div>
                {slotActions.map((action) => (
                  <DailyTimelineItem
                    key={action.actionId}
                    action={action}
                    isDone={completedActionIds.includes(action.actionId)}
                    onToggle={() => onToggleActionDone(action.actionId)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
