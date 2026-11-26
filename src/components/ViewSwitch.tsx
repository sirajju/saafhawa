'use client';

import React from 'react';

interface ViewSwitchProps {
  currentView: 'dash' | 'onb';
  onChangeView: (view: 'dash' | 'onb') => void;
}

export function ViewSwitch({ currentView, onChangeView }: ViewSwitchProps) {
  return (
    <div
      className="view-switch seg"
      aria-label="Switch view"
      role="group"
    >
      <button
        type="button"
        aria-pressed={currentView === 'dash'}
        data-v="dash"
        onClick={() => onChangeView('dash')}
        style={{ width: 'auto', padding: '0 16px' }}
      >
        Dashboard
      </button>
      <button
        type="button"
        aria-pressed={currentView === 'onb'}
        data-v="onb"
        onClick={() => onChangeView('onb')}
        style={{ width: 'auto', padding: '0 16px' }}
      >
        Household
      </button>
    </div>
  );
}
