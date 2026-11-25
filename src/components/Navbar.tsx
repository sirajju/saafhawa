'use client';

import React, { useState, useEffect } from 'react';
import { BrandIcon, LocationIcon, SunIcon, MoonIcon, SystemThemeIcon } from './ui/Icons';
import { getShortPlaceName } from '@/lib/design-system';

interface NavbarProps {
  currentPlace?: string;
  onEditProfile?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

type ThemeMode = 'light' | 'dark' | 'system';

export function Navbar({
  currentPlace,
  onEditProfile,
}: NavbarProps) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'light';
    try {
      return (localStorage.getItem('saafhawa_theme') as ThemeMode) || 'light';
    } catch {
      return 'light';
    }
  });

  const shortPlace = getShortPlaceName(currentPlace);

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    try {
      localStorage.setItem('saafhawa_theme', newTheme);
    } catch {
      // LocalStorage error
    }

    const mq = typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null;
    const isDark = newTheme === 'dark' || (newTheme === 'system' && Boolean(mq?.matches));
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-user-theme', newTheme);
  };

  useEffect(() => {
    if (theme !== 'system' || typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return (
    <header className="app-header">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-teal-800 focus:text-white focus:outline-none"
      >
        Skip to main content
      </a>
      <div className="wrap bar">
        <div className="logo">
          <span className="logo-mark" aria-hidden="true">
            <BrandIcon className="icon" />
          </span>
          <span>SaafHawa</span>
          <span className="hi" lang="hi" aria-hidden="true">
            साफ़ हवा
          </span>
        </div>

        <div className="spacer" />

        {currentPlace && (
          <button
            type="button"
            className="place"
            onClick={onEditProfile}
            aria-label={`Edit household profile (${shortPlace})`}
          >
            <LocationIcon className="icon" />
            <span>{shortPlace}</span>
          </button>
        )}

        <div className="seg" role="group" aria-label="Colour theme">
          <button
            type="button"
            aria-pressed={theme === 'light'}
            data-t="light"
            aria-label="Light theme"
            className={theme === 'light' ? 'active' : ''}
            onClick={() => handleThemeChange('light')}
          >
            <SunIcon className="icon" />
          </button>
          <button
            type="button"
            aria-pressed={theme === 'dark'}
            data-t="dark"
            aria-label="Dark theme"
            className={theme === 'dark' ? 'active' : ''}
            onClick={() => handleThemeChange('dark')}
          >
            <MoonIcon className="icon" />
          </button>
          <button
            type="button"
            aria-pressed={theme === 'system'}
            data-t="system"
            aria-label="Match system theme"
            className={theme === 'system' ? 'active' : ''}
            onClick={() => handleThemeChange('system')}
          >
            <SystemThemeIcon className="icon" />
          </button>
        </div>
      </div>
    </header>
  );
}
