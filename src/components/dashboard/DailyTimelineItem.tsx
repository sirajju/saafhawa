'use client';

import React, { useState } from 'react';
import { PlannedAction } from '@/lib/plan/types';
import { CheckIcon } from '@/components/ui/Icons';

interface DailyTimelineItemProps {
  action: PlannedAction;
  isDone: boolean;
  onToggle: () => void;
}

export function DailyTimelineItem({
  action,
  isDone,
  onToggle,
}: DailyTimelineItemProps) {
  const [showDetails, setShowDetails] = useState(false);
  const doseAvoided = action.exposureReduction?.pm25InhaledDoseAvoidedUg;
  const co2SavedGrams = action.emissionReduction?.co2SavedGrams;
  const co2SavedKg = typeof co2SavedGrams === 'number' && co2SavedGrams > 0 ? co2SavedGrams / 1000 : null;
  const pm25Saved = action.emissionReduction?.pm25SavedGrams;

  return (
    <article className={`item ${isDone ? 'is-done' : ''}`}>
      <div>
        <h3>{action.title}</h3>
        <p>{action.reason || action.description}</p>

        <div className="facts">
          {typeof doseAvoided === 'number' && doseAvoided > 0 && (
            <span>
              <b className="num">{Math.round(doseAvoided)} µg</b> less breathed in
            </span>
          )}
          {typeof co2SavedKg === 'number' && co2SavedKg > 0 && (
            <span>
              <b className="num">{co2SavedKg.toFixed(1)} kg</b> CO₂ avoided
            </span>
          )}
          {typeof pm25Saved === 'number' && pm25Saved > 0 && (
            <span>
              <b className="num">{pm25Saved.toFixed(1)} g</b> soot kept out
            </span>
          )}
        </div>

        <button
          type="button"
          className="details"
          onClick={() => setShowDetails(!showDetails)}
        >
          <span>{showDetails ? 'Hide details' : 'How we calculated this'}</span>
          <span className="sr-only">Details</span>
        </button>

        {showDetails && (
          <div style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-2)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <p>{action.description}</p>
            {action.methodologyNotes && (
              <p className="caption">Calculation basis: {action.methodologyNotes}</p>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        className="done"
        aria-pressed={isDone}
        aria-label={`Mark action "${action.title}" as ${isDone ? 'incomplete' : 'completed'}`}
        onClick={onToggle}
      >
        <CheckIcon className="icon" />
      </button>
    </article>
  );
}
