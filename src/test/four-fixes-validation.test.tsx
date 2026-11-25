import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { SafeMarkdown } from '@/components/chat/SafeMarkdown';
import { calculateActionImpact } from '@/lib/impact/calculator';
import { ACTION_CATALOGUE } from '@/lib/impact/catalogue';
import { generateHouseholdPlan } from '@/lib/plan';
import { PlanRequest } from '@/lib/plan/types';
import { MOCK_AIR_QUALITY, MOCK_PROFILE } from './plan-fixtures';

describe('Four Fixes Validation Suite', () => {
  describe('Fix 1: Chat Safe Markdown Rendering', () => {
    it('renders bold, italics and lists safely without visible asterisks', () => {
      const rawContent =
        '**Recommendation:** Strenuous outdoor play is **not safe** today.\n\n' +
        '• **HEPA Air Purifier:** Running in bedroom reduces PM2.5.\n' +
        '• **Ventilate:** Only during *cleanest* midday window.\n\n' +
        '1. Wear an N95 mask.\n' +
        '2. Seal windows.';

      const { container } = render(<SafeMarkdown content={rawContent} />);

      const strongs = container.querySelectorAll('strong');
      expect(strongs.length).toBeGreaterThanOrEqual(3);
      expect(strongs[0].textContent).toBe('Recommendation:');
      expect(strongs[1].textContent).toBe('not safe');

      const ems = container.querySelectorAll('em');
      expect(ems.length).toBe(1);
      expect(ems[0].textContent).toBe('cleanest');

      expect(container.querySelectorAll('ul li').length).toBe(2);
      expect(container.querySelectorAll('ol li').length).toBe(2);

      expect(container.textContent).not.toContain('**Recommendation:**');
      expect(container.textContent).not.toContain('**not safe**');
    });

    it('safely neutralizes raw HTML tags from input', () => {
      const rawContent = 'Check this <script>alert("xss")</script> and <b>raw html</b>';
      const { container } = render(<SafeMarkdown content={rawContent} />);
      expect(container.querySelector('script')).toBeNull();
      expect(container.textContent).toContain('<script>');
    });
  });

  describe('Fix 2: No Commute Actions for Non-Commuters', () => {
    it('does not offer post_commute_hygiene when primaryCommuteMode is "none"', async () => {
      const nonCommuteProfile: PlanRequest = {
        ...MOCK_PROFILE,
        place: 'Delhi',
        primaryCommuteMode: 'none',
        commutersCount: 0,
        dailyCommuteDistanceKm: 0,
      };

      const plan = await generateHouseholdPlan(nonCommuteProfile, {
        airQualityFetcher: vi.fn().mockResolvedValue(MOCK_AIR_QUALITY),
        apiKey: '',
      });

      const actionIds = plan.actions.map((a) => a.actionId);
      expect(actionIds).not.toContain('post_commute_hygiene');
      expect(actionIds).not.toContain('swap_car_for_metro');
      expect(actionIds).not.toContain('swap_two_wheeler_for_metro_or_bus');
      expect(actionIds).not.toContain('carpool_to_work');
      expect(actionIds).not.toContain('work_from_home_on_smog_days');
    });

    it('evaluates post_commute_hygiene as not applicable when commutersCount is 0', () => {
      const postCommuteDef = ACTION_CATALOGUE.find((a) => a.id === 'post_commute_hygiene')!;
      const impact = calculateActionImpact(
        postCommuteDef,
        { ...MOCK_PROFILE, primaryCommuteMode: 'none', commutersCount: 0 },
        { currentPm25: 150 }
      );
      expect(impact.applicable).toBe(false);
      expect(impact.reasonIfNotApplicable).toContain('no daily commute');
    });
  });

  describe('Fix 3: Free Actions for Wood / Chulha Cooking', () => {
    it('provides free cooking actions for zero-cost biomass household and skips paid induction', async () => {
      const biomassZeroCostProfile: PlanRequest = {
        ...MOCK_PROFILE,
        place: 'Delhi',
        cookingFuel: 'biomass',
        budget: 'zero_cost',
        childrenCount: 2,
        hasKitchenChimneyOrExhaust: false,
      };

      const plan = await generateHouseholdPlan(biomassZeroCostProfile, {
        airQualityFetcher: vi.fn().mockResolvedValue(MOCK_AIR_QUALITY),
        apiKey: '',
      });

      const actionIds = plan.actions.map((a) => a.actionId);
      expect(actionIds).not.toContain('swap_biomass_cookstove_to_induction');

      const hasFreeCookingAction = actionIds.some(
        (id) =>
          id === 'cook_with_kitchen_cross_ventilation' ||
          id === 'keep_vulnerable_out_of_chulha_kitchen' ||
          id === 'use_dry_seasoned_chulha_fuel'
      );
      expect(hasFreeCookingAction).toBe(true);

      for (const action of plan.actions) {
        expect(action.costRupees ?? 0).toBe(0);
        expect(action.costLabel).toContain('Free');
      }
    });

    it('offers induction swap with approximate cost label when household has a budget', async () => {
      const biomassBudgetProfile: PlanRequest = {
        ...MOCK_PROFILE,
        place: 'Delhi',
        cookingFuel: 'biomass',
        budget: 'low',
      };

      const plan = await generateHouseholdPlan(biomassBudgetProfile, {
        airQualityFetcher: vi.fn().mockResolvedValue(MOCK_AIR_QUALITY),
        apiKey: '',
      });

      const inductionAction = plan.actions.find(
        (a) => a.actionId === 'swap_biomass_cookstove_to_induction'
      );
      expect(inductionAction).toBeDefined();
      expect(inductionAction?.costRupees).toBeGreaterThan(0);
      expect(inductionAction?.costLabel).toMatch(/₹2,200|₹1,800/);
    });
  });

  describe('Fix 4: Reason Personalization with Household Specifics', () => {
    it('personalizes vacuuming and wet mopping reasons to mention home size and at-risk members', async () => {
      const asthmaHousehold: PlanRequest = {
        ...MOCK_PROFILE,
        place: 'Delhi',
        homeAreaSqFt: 650,
        hasAsthmaOrRespiratoryCondition: true,
        childrenCount: 1,
      };

      const plan = await generateHouseholdPlan(asthmaHousehold, {
        airQualityFetcher: vi.fn().mockResolvedValue(MOCK_AIR_QUALITY),
        apiKey: '',
      });

      const reasons = plan.actions.map((a) => a.reason).join(' ');
      expect(reasons).toMatch(/650 sq ft/i);
      expect(reasons).toMatch(/airway|asthma|child/i);

      const mopAction = plan.actions.find((a) => a.actionId === 'wet_mop_instead_of_dry_sweeping');
      if (mopAction) expect(mopAction.reason).toContain('650 sq ft');

      const vacuumAction = plan.actions.find((a) => a.actionId === 'avoid_non_hepa_vacuuming');
      if (vacuumAction) expect(vacuumAction.reason).toContain('650 sq ft');
    });

    it('generates different reasons for different home sizes and occupant demographics', async () => {
      const planA = await generateHouseholdPlan(
        { ...MOCK_PROFILE, place: 'Delhi', homeAreaSqFt: 450, elderlyCount: 2, childrenCount: 0 },
        { airQualityFetcher: vi.fn().mockResolvedValue(MOCK_AIR_QUALITY), apiKey: '' }
      );

      const planB = await generateHouseholdPlan(
        { ...MOCK_PROFILE, place: 'Delhi', homeAreaSqFt: 1800, elderlyCount: 0, childrenCount: 3 },
        { airQualityFetcher: vi.fn().mockResolvedValue(MOCK_AIR_QUALITY), apiKey: '' }
      );

      const reasonsA = planA.actions.map((a) => a.reason).join(' ');
      const reasonsB = planB.actions.map((a) => a.reason).join(' ');

      expect(reasonsA).toContain('450 sq ft');
      expect(reasonsB).toContain('1800 sq ft');
      expect(reasonsA).toMatch(/senior|elderly/i);
      expect(reasonsB).toMatch(/child/i);
    });
  });
});
