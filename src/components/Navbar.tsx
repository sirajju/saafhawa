'use client';

import React, { useState, useRef, useEffect } from 'react';
import { BrandIcon, LocationIcon, RefreshIcon, EditIcon, MenuDotsIcon } from './ui/Icons';

interface NavbarProps {
  currentPlace?: string;
  onEditProfile?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function Navbar({
  currentPlace,
  onEditProfile,
  onRefresh,
  isLoading = false,
}: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <header className="sticky top-0 z-40 w-full max-w-full border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-teal-800 focus:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
      >
        Skip to main content
      </a>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-3.5 py-2.5 sm:px-6 sm:py-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-teal-800 text-white shadow-xs ring-1 ring-teal-900/20 dark:bg-teal-700">
            <BrandIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
                SaafHawa
              </span>
              <span
                lang="hi"
                className="hidden text-xs font-semibold text-teal-800 dark:text-teal-400 md:inline-block"
              >
                साफ़ हवा
              </span>
              <span className="hidden rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-800 border border-teal-200/60 dark:bg-teal-950/70 dark:text-teal-300 dark:border-teal-800 sm:inline-block">
                Clean Air Assistant
              </span>
            </div>
            <p className="hidden text-xs text-slate-600 dark:text-slate-400 sm:block">
              Daily low-emission routines &amp; clean air hacks
            </p>
          </div>
        </div>

        {/* Desktop inline controls & Mobile responsive toolbar */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Location indicator (Desktop) */}
          {currentPlace && (
            <div className="hidden min-h-[38px] items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 md:flex">
              <LocationIcon className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" />
              <span className="max-w-[140px] truncate" title={currentPlace}>
                {currentPlace}
              </span>
            </div>
          )}

          {/* Desktop Refresh Button */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              aria-label="Refresh air quality and plan"
              className="hidden sm:inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshIcon className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          )}

          {/* Primary Action: Edit Profile */}
          {onEditProfile && (
            <button
              type="button"
              onClick={onEditProfile}
              aria-label="Edit household profile"
              className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-800 shadow-2xs transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <EditIcon className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
              <span>Edit Profile</span>
            </button>
          )}

          {/* Mobile Refresh in menu if available */}
          {onRefresh && (
            <div className="relative sm:hidden" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                aria-expanded={isMenuOpen}
                aria-haspopup="true"
                aria-label="More actions"
                className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                <MenuDotsIcon className="h-4 w-4" />
              </button>

              {isMenuOpen && (
                <div
                  role="menu"
                  aria-orientation="vertical"
                  className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg ring-1 ring-black/5 dark:border-slate-800 dark:bg-slate-900"
                >
                  {currentPlace && (
                    <div className="border-b border-slate-100 px-3 py-1.5 text-[11px] font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400 flex items-center gap-1">
                      <LocationIcon className="h-3 w-3 text-teal-700" />
                      <span className="truncate">{currentPlace}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onRefresh();
                    }}
                    disabled={isLoading}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <RefreshIcon className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh Plan</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
