import { useState, type RefObject } from 'react';
import { type PlanRequest } from '@/lib/plan/types';

export function useOnboardingLocation(
  setFormData: React.Dispatch<React.SetStateAction<PlanRequest>>,
  areaInputRef: RefObject<HTMLInputElement | null>
) {
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [areaError, setAreaError] = useState<string | null>(null);
  const [areaNote, setAreaNote] = useState<string | null>(null);

  const handleLocate = () => {
    setAreaNote('Finding your location…');
    if (!navigator.geolocation) {
      setAreaNote("Location isn't available in this browser. Type your area instead.");
      areaInputRef.current?.focus();
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const coordsStr = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        setAreaError(null);
        setFormData((prev) => ({ ...prev, place: coordsStr, coordinates: coordsStr }));
        setAreaNote('Looking up your locality…');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        fetch(`/api/reverse-geocode?lat=${latitude}&lon=${longitude}`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        })
          .then(async (res) => {
            clearTimeout(timeoutId);
            if (!res.ok) throw new Error('Reverse geocode failed');
            const data = await res.json();
            if (data?.formattedAddress) {
              setFormData((prev) => ({
                ...prev,
                place: data.formattedAddress,
                coordinates: coordsStr,
              }));
              setAreaNote(`Found your location near ${data.formattedAddress}.`);
              setAreaError(null);
            } else {
              throw new Error('No locality found');
            }
          })
          .catch(() => {
            clearTimeout(timeoutId);
            setFormData((prev) => ({
              ...prev,
              place: prev.place || coordsStr,
              coordinates: coordsStr,
            }));
            setAreaNote(
              "Location found. Couldn't get the area name, but your plan will use your exact position."
            );
            setAreaError(null);
          })
          .finally(() => {
            setIsLocating(false);
          });
      },
      () => {
        setIsLocating(false);
        setAreaNote('Location access was blocked. Type your area or pincode instead.');
        areaInputRef.current?.focus();
      },
      { timeout: 8000 }
    );
  };

  return {
    isLocating,
    areaError,
    setAreaError,
    areaNote,
    setAreaNote,
    handleLocate,
  };
}
