import React from 'react';

interface NavbarProps {
  currentPlace?: string;
  onEditProfile?: () => void;
  onRefresh?: () => void;
  onOpenCommunityAdvisory?: () => void;
  isLoading?: boolean;
}

export function Navbar({
  currentPlace,
  onEditProfile,
  onRefresh,
  onOpenCommunityAdvisory,
  isLoading = false,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-emerald-600 focus:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
      >
        Skip to main content
      </a>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-700/20">
            <span className="text-xl font-bold" aria-hidden="true">
              🍃
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
                SaafHawa
              </span>
              <span className="hidden text-xs font-semibold text-emerald-700 dark:text-emerald-400 sm:inline-block">
                साफ़ हवा
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                Smog Assistant
              </span>
            </div>
            <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
              Daily low-emission routines & clean air hacks
            </p>
          </div>
        </div>

        {/* Current Location Pill & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {currentPlace && (
            <div className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 md:flex">
              <span aria-hidden="true">📍</span>
              <span className="max-w-[180px] truncate" title={currentPlace}>
                {currentPlace}
              </span>
            </div>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              aria-label="Refresh air quality and plan"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <span className={isLoading ? 'animate-spin' : ''} aria-hidden="true">
                🔄
              </span>
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}

          {onOpenCommunityAdvisory && (
            <button
              type="button"
              onClick={onOpenCommunityAdvisory}
              aria-label="Share advisory with your community or school"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 dark:hover:bg-emerald-900"
            >
              <span aria-hidden="true">📢</span>
              <span className="hidden sm:inline">Share Advisory</span>
            </button>
          )}

          {onEditProfile && (
            <button
              type="button"
              onClick={onEditProfile}
              aria-label="Edit household profile"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:hover:bg-emerald-500"
            >
              <span aria-hidden="true">⚙️</span>
              <span>Edit Profile</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
