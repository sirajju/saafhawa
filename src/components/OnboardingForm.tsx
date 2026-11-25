'use client';

import React, { useState } from 'react';
import { PlanRequest } from '@/lib/plan/types';
import { CommuteFields } from './onboarding/CommuteFields';
import { IndoorEnvironmentFields } from './onboarding/IndoorEnvironmentFields';
import { OnboardingProgressBar } from './onboarding/OnboardingProgressBar';
import { OnboardingStep1 } from './onboarding/OnboardingStep1';
import { OnboardingNavFooter } from './onboarding/OnboardingNavFooter';
import { DEFAULT_PROFILE } from './onboarding/default-profile';
import { AlertTriangleIcon } from './ui/Icons';

interface OnboardingFormProps {
  initialProfile?: Partial<PlanRequest> | null;
  onSubmit: (profile: PlanRequest) => void;
  onCancel?: () => void;
  isEditing?: boolean;
}

export function OnboardingForm({
  initialProfile,
  onSubmit,
  onCancel,
  isEditing = false,
}: OnboardingFormProps) {
  const [formData, setFormData] = useState<PlanRequest>({
    ...DEFAULT_PROFILE,
    ...(initialProfile || {}),
  });

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const handleChange = (field: keyof PlanRequest, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleUseBrowserLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('Browser location is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    setGeoStatus('Detecting your location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude } = position.coords;
        const coordsStr = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        handleChange('place', coordsStr);
        setGeoStatus(`Location detected: ${coordsStr}`);
        setErrorMessage(null);
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGeoStatus('Location permission denied. Please type your location above.');
        } else {
          setGeoStatus('Unable to determine location. Please type your location above.');
        }
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  const validateStep1 = (): boolean => {
    const placeTrimmed = formData.place.trim();
    if (placeTrimmed.length < 2) {
      setErrorMessage('Please enter a valid place name, city, or pincode (at least 2 characters).');
      return false;
    }
    if (placeTrimmed.length > 120) {
      setErrorMessage('Place name cannot exceed 120 characters.');
      return false;
    }
    if (formData.adultsCount < 1) {
      setErrorMessage('Household must include at least 1 adult occupant.');
      return false;
    }
    setErrorMessage(null);
    return true;
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentStep === 1) {
      if (!validateStep1()) return;
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentStep === 2) {
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1()) {
      setCurrentStep(1);
      return;
    }
    onSubmit({ ...formData, place: formData.place.trim() });
  };

  const progressPercent = currentStep === 1 ? 33 : currentStep === 2 ? 66 : 100;

  return (
    <main id="onb" className="wrap">
      <div className="onb">
        <OnboardingProgressBar
          currentStep={currentStep}
          isEditing={isEditing}
          progressPercent={progressPercent}
        />

        <form onSubmit={handleSubmit} aria-label="Household Profile Form" noValidate>
          {errorMessage && (
            <div
              id="form-error-alert"
              role="alert"
              style={{
                marginBottom: 24,
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--aqi-severe)',
                background: 'var(--aqi-severe-soft)',
                color: 'var(--ink)',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertTriangleIcon className="h-4 w-4 shrink-0" style={{ color: 'var(--aqi-severe)' }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {currentStep === 1 && (
            <OnboardingStep1
              formData={formData}
              errorMessage={errorMessage}
              geoStatus={geoStatus}
              isLocating={isLocating}
              onChange={handleChange}
              onClearError={() => setErrorMessage(null)}
              onUseBrowserLocation={handleUseBrowserLocation}
            />
          )}

          {currentStep === 2 && (
            <CommuteFields formData={formData} onChange={handleChange} />
          )}

          {currentStep === 3 && (
            <IndoorEnvironmentFields formData={formData} onChange={handleChange} />
          )}

          <OnboardingNavFooter
            currentStep={currentStep}
            isEditing={isEditing}
            onCancel={onCancel}
            onBack={handleBack}
            onNext={handleNext}
          />
        </form>
      </div>
    </main>
  );
}
