'use client';

import React from 'react';

interface ViewSwitchProps {
  currentView: 'dash' | 'onb';
  onChangeView: (view: 'dash' | 'onb') => void;
}

export function ViewSwitch({ currentView, onChangeView }: ViewSwitchProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChangeView('onb');
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChangeView('dash');
    }
  };

  return (
    <nav
      className="view-switch seg"
      aria-label="Switch view"
      role="group"
      onKeyDown={handleKeyDown}
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
    </nav>
  );
}
