'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PlanRequest } from '@/lib/plan/types';
import { DEFAULT_PROFILE } from './onboarding/default-profile';
import { OnboardingStep1 } from './onboarding/OnboardingStep1';
import { OnboardingStep2 } from './onboarding/OnboardingStep2';
import { OnboardingStep3 } from './onboarding/OnboardingStep3';

interface OnboardingFormProps {
  initialProfile?: Partial<PlanRequest> | null;
  onSubmit: (profile: PlanRequest) => void;
}

export function OnboardingForm({ initialProfile, onSubmit }: OnboardingFormProps) {
  const [formData, setFormData] = useState<PlanRequest>(() => ({
    ...DEFAULT_PROFILE,
    ...(initialProfile || {}),
  }));

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [areaError, setAreaError] = useState<string | null>(null);
  const [areaNote, setAreaNote] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [hasAirConditioner, setHasAirConditioner] = useState<boolean>(false);
  const [incenseChoice, setIncenseChoice] = useState<'often' | 'sometimes' | 'no' | null>(() => {
    if (initialProfile?.usesIncenseOrMosquitoCoils === true) return 'sometimes';
    if (initialProfile?.usesIncenseOrMosquitoCoils === false) return 'no';
    return null;
  });

  const areaInputRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [currentStep]);

  const handleFieldChange = (field: string, val: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleAreaChange = (val: string) => {
    setAreaError(null);
    setAreaNote(null);
    setFormData((prev) => ({ ...prev, place: val }));
  };

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
        setIsLocating(false);
        const { latitude, longitude } = position.coords;
        const coordsStr = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        setAreaError(null);
        setFormData((prev) => ({ ...prev, place: coordsStr }));
        setAreaNote(`Found your location near ${coordsStr}.`);
      },
      () => {
        setIsLocating(false);
        setAreaNote('Location access was blocked. Type your area or pincode instead.');
        areaInputRef.current?.focus();
      },
      { timeout: 8000 }
    );
  };

  const handleToggleEquipment = (
    field: 'hasAirPurifier' | 'hasKitchenChimneyOrExhaust' | 'hasAirConditioner'
  ) => {
    if (field === 'hasAirConditioner') {
      setHasAirConditioner((prev) => !prev);
    } else {
      setFormData((prev) => ({ ...prev, [field]: !prev[field] }));
    }
  };

  const handleIncenseChange = (choice: 'often' | 'sometimes' | 'no') => {
    setIncenseChoice(choice);
    setFormData((prev) => ({ ...prev, usesIncenseOrMosquitoCoils: choice === 'often' || choice === 'sometimes' }));
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (formData.place.trim().length < 2) {
        setAreaError('Enter your city, area or pincode to continue.');
        areaInputRef.current?.focus();
        return;
      }
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentStep === 2) {
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      onSubmit({ ...formData, place: formData.place.trim() });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <main id="onb" className="wrap">
      <div className="onb">
        <div className="steps" aria-hidden="true">
          <i className={currentStep >= 1 ? 'on' : ''} />
          <i className={currentStep >= 2 ? 'on' : ''} />
          <i className={currentStep >= 3 ? 'on' : ''} />
        </div>

        {currentStep === 1 && (
          <OnboardingStep1
            area={formData.place}
            adultsCount={formData.adultsCount}
            childrenCount={formData.childrenCount}
            elderlyCount={formData.elderlyCount}
            hasAsthmaOrRespiratoryCondition={formData.hasAsthmaOrRespiratoryCondition}
            areaError={areaError}
            areaNote={areaNote}
            isLocating={isLocating}
            onAreaChange={handleAreaChange}
            onFieldChange={handleFieldChange}
            onLocate={handleLocate}
            areaInputRef={areaInputRef}
            headingRef={headingRef}
          />
        )}

        {currentStep === 2 && (
          <OnboardingStep2
            primaryCommuteMode={formData.primaryCommuteMode}
            dailyCommuteDistanceKm={formData.dailyCommuteDistanceKm}
            commutersCount={formData.commutersCount}
            canWorkFromHome={formData.canWorkFromHome}
            hasCarpoolOption={formData.hasCarpoolOption}
            onFieldChange={handleFieldChange}
            headingRef={headingRef}
          />
        )}

        {currentStep === 3 && (
          <OnboardingStep3
            homeAreaSqFt={formData.homeAreaSqFt}
            cookingFuel={formData.cookingFuel}
            hasAirPurifier={formData.hasAirPurifier}
            hasKitchenChimneyOrExhaust={formData.hasKitchenChimneyOrExhaust}
            hasAirConditioner={hasAirConditioner}
            incenseChoice={incenseChoice}
            budget={formData.budget}
            onFieldChange={handleFieldChange}
            onToggleEquipment={handleToggleEquipment}
            onIncenseChange={handleIncenseChange}
            headingRef={headingRef}
          />
        )}
      </div>

      <div className="onb-bar">
        <div className="inner">
          <button
            type="button"
            className="btn btn-ghost"
            id="onb-back"
            onClick={handleBack}
            style={{ visibility: currentStep === 1 ? 'hidden' : 'visible' }}
          >
            Back
          </button>
          <span className="step-count" id="onb-count">
            Step {currentStep} of 3
          </span>
          <button
            type="button"
            className="btn btn-primary"
            id="onb-next"
            onClick={handleNext}
          >
            {currentStep === 3 ? 'See my plan' : 'Continue'}
          </button>
        </div>
      </div>
    </main>
  );
}
