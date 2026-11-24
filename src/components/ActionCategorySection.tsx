import React from 'react';
import { PlannedAction } from '@/lib/plan/types';
import { PlanCard } from '@/components/PlanCard';

interface ActionCategorySectionProps {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  badgeClass: string;
  actions: PlannedAction[];
}

export function ActionCategorySection({
  id,
  icon,
  title,
  subtitle,
  badgeClass,
  actions,
}: ActionCategorySectionProps) {
  if (actions.length === 0) return null;

  return (
    <section aria-labelledby={`${id}-heading`}>
      <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
        <div>
          <h2
            id={`${id}-heading`}
            className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50"
          >
            <span aria-hidden="true">{icon}</span>
            <span>{title}</span>
          </h2>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            {subtitle}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>
          {actions.length} Actions
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {actions.map((action) => (
          <PlanCard key={action.actionId} action={action} />
        ))}
      </div>
    </section>
  );
}
