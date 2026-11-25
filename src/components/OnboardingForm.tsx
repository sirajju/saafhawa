'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PlanRequest } from '@/lib/plan/types';
import { DEFAULT_PROFILE } from './onboarding/default-profile';
import { useOnboardingLocation } from './onboarding/use-onboarding-location';
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
  const [hasAirConditioner, setHasAirConditioner] = useState<boolean>(false);
  const [incenseChoice, setIncenseChoice] = useState<'often' | 'sometimes' | 'no' | null>(() => {
    if (initialProfile?.usesIncenseOrMosquitoCoils === true) return 'sometimes';
    if (initialProfile?.usesIncenseOrMosquitoCoils === false) return 'no';
    return null;
  });

  const areaInputRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const {
    isLocating,
    areaError,
    setAreaError,
    areaNote,
    setAreaNote,
    handleLocate,
  } = useOnboardingLocation(setFormData, areaInputRef);

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

  const handleToggleEquipment = (
    field: 'hasAirPurifier' | 'hasKitchenChimneyOrExhaust' | 'hasAirConditioner'
  ) => {
    if (field === 'hasAirConditioner') {
      setHasAirConditioner((prev) => !prev);
    } else {
      setFormData((prev) => ({ ...prev, [field]: !prev[field] }));
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.place || formData.place.trim().length < 2) {
        setAreaError('Enter your city, area or pincode to continue.');
        areaInputRef.current?.focus();
        return;
      }
      setAreaError(null);
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
    if (currentStep === 2) setCurrentStep(1);
    if (currentStep === 3) setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div id="onb" className="onboarding-flow wrap">
      <div className="onboarding-col">
        <div
          className="step-progress"
          role="progressbar"
          aria-valuenow={currentStep}
          aria-valuemin={1}
          aria-valuemax={3}
          aria-label={`Step ${currentStep} of 3`}
        >
          <div className={`step-bar ${currentStep >= 1 ? 'active' : ''}`} />
          <div className={`step-bar ${currentStep >= 2 ? 'active' : ''}`} />
          <div className={`step-bar ${currentStep >= 3 ? 'active' : ''}`} />
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
            headingRef={headingRef}
            areaInputRef={areaInputRef}
            onAreaChange={handleAreaChange}
            onLocate={handleLocate}
            onFieldChange={handleFieldChange}
          />
        )}

        {currentStep === 2 && (
          <OnboardingStep2
            primaryCommuteMode={formData.primaryCommuteMode}
            dailyCommuteDistanceKm={formData.dailyCommuteDistanceKm}
            commutersCount={formData.commutersCount}
            canWorkFromHome={formData.canWorkFromHome}
            hasCarpoolOption={formData.hasCarpoolOption}
            headingRef={headingRef}
            onFieldChange={handleFieldChange}
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
            headingRef={headingRef}
            onFieldChange={handleFieldChange}
            onToggleEquipment={handleToggleEquipment}
            onIncenseChange={(choice: 'often' | 'sometimes' | 'no') => {
              setIncenseChoice(choice);
              setFormData((prev) => ({
                ...prev,
                usesIncenseOrMosquitoCoils: choice === 'often' || choice === 'sometimes',
              }));
            }}
          />
        )}

        <div className="form-actions">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="btn btn-secondary"
              aria-label="Back to previous step"
            >
              Back
            </button>
          )}
          <button
            id="onb-next"
            type="button"
            onClick={handleNext}
            className="btn btn-primary"
            style={{ minWidth: '160px' }}
          >
            {currentStep === 3 ? 'See my plan' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
