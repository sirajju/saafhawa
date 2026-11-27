import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useOnboardingLocation } from '@/components/onboarding/use-onboarding-location';
import { type PlanRequest } from '@/lib/plan/types';
import { DEFAULT_PROFILE } from '@/components/onboarding/default-profile';

describe('useOnboardingLocation hook', () => {
  let mockSetFormData: React.Dispatch<React.SetStateAction<PlanRequest>>;
  let mockAreaInputRef: { current: HTMLInputElement | null };
  let originalGeolocation: Geolocation;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSetFormData = vi.fn((updater: React.SetStateAction<PlanRequest>) => {
      if (typeof updater === 'function') {
        updater(DEFAULT_PROFILE);
      }
    }) as unknown as React.Dispatch<React.SetStateAction<PlanRequest>>;
    mockAreaInputRef = { current: document.createElement('input') };

    originalGeolocation = navigator.geolocation;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'geolocation', {
      value: originalGeolocation,
      configurable: true,
      writable: true,
    });
  });

  it('handles success: resolves reverse geocode from /api/reverse-geocode and updates form', async () => {
    const mockCoords = { latitude: 12.9716, longitude: 77.5946 };
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: vi.fn((success) => success({ coords: mockCoords })),
      },
      configurable: true,
      writable: true,
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ formattedAddress: 'Bengaluru, Karnataka' }),
    } as Response);

    const { result } = renderHook(() => useOnboardingLocation(mockSetFormData, mockAreaInputRef));

    await act(async () => {
      result.current.handleLocate();
    });

    expect(result.current.isLocating).toBe(false);
    expect(result.current.areaNote).toContain('Found your location near Bengaluru, Karnataka');
    expect(result.current.areaError).toBeNull();
    expect(mockSetFormData).toHaveBeenCalled();
  });

  it('handles failure: keeps coordinates and shows fallback message enabling Continue', async () => {
    const mockCoords = { latitude: 12.9716, longitude: 77.5946 };
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: vi.fn((success) => success({ coords: mockCoords })),
      },
      configurable: true,
      writable: true,
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    const { result } = renderHook(() => useOnboardingLocation(mockSetFormData, mockAreaInputRef));

    await act(async () => {
      result.current.handleLocate();
    });

    expect(result.current.isLocating).toBe(false);
    expect(result.current.areaNote).toBe(
      "Location found. Couldn't get the area name, but your plan will use your exact position."
    );
    expect(result.current.areaError).toBeNull();
  });

  it('handles timeout (> 5s): keeps coordinates, sets fallback notice, and enables Continue', async () => {
    const mockCoords = { latitude: 12.9716, longitude: 77.5946 };
    Object.defineProperty(navigator, 'geolocation', {
      value: {
        getCurrentPosition: vi.fn((success) => success({ coords: mockCoords })),
      },
      configurable: true,
      writable: true,
    });

    // Simulate fetch aborting due to timeout
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
      new DOMException('The operation was aborted due to timeout', 'AbortError')
    );

    const { result } = renderHook(() => useOnboardingLocation(mockSetFormData, mockAreaInputRef));

    await act(async () => {
      result.current.handleLocate();
    });

    expect(result.current.isLocating).toBe(false);
    expect(result.current.areaNote).toBe(
      "Location found. Couldn't get the area name, but your plan will use your exact position."
    );
    expect(result.current.areaError).toBeNull();
  });
});
