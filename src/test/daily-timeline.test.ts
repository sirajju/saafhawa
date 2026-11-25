import { describe, it, expect } from 'vitest';
import { getTimeSlotForAction, isTimeSlotPassed } from '@/components/dashboard/DailyTimeline';
import { PlannedAction } from '@/lib/plan/types';

describe('Daily Timeline - Grouping & Past Time Marking', () => {
  const makeAction = (id: string, timeOfDay: string): PlannedAction => ({
    actionId: id,
    title: `Action ${id}`,
    category: 'indoor_air',
    suggestedTimeOfDay: timeOfDay,
    reason: 'Health protection',
    description: 'Detailed description',
    methodologyNotes: 'Notes',
    exposureReduction: {
      pm25InhaledDoseAvoidedUg: 10,
      pm25ConcentrationReductionUgM3: 5,
      percentageDrop: 15,
    },
    emissionReduction: {
      pm25SavedGrams: 0,
      co2SavedGrams: 0,
    },
  });

  it('places "All Day" and "Daytime Setup" under "anytime" (Any time today), NOT under Morning', () => {
    const allDayAction = makeAction('diy_corsi_rosenthal_box', 'All Day');
    const daytimeSetupAction = makeAction('seal_doors_weatherstrip', 'Daytime Setup');
    const flexibleAction = makeAction('wet_mop_floors', 'Anytime');

    expect(getTimeSlotForAction(allDayAction)).toBe('anytime');
    expect(getTimeSlotForAction(daytimeSetupAction)).toBe('anytime');
    expect(getTimeSlotForAction(flexibleAction)).toBe('anytime');
  });

  it('correctly maps morning, afternoon, evening, and night actions', () => {
    expect(getTimeSlotForAction(makeAction('wear_mask', 'Morning Commute'))).toBe('morning');
    expect(getTimeSlotForAction(makeAction('shift_exercise', 'Afternoon 1 PM - 3 PM'))).toBe('afternoon');
    expect(getTimeSlotForAction(makeAction('post_commute_saline', 'Evening Post-Commute'))).toBe('evening');
    expect(getTimeSlotForAction(makeAction('run_hepa_bedroom', 'Night / Bedtime'))).toBe('night');
  });

  it('marks Morning as passed when local hour is 1:00 PM (13:00)', () => {
    const hour = 13; // 1 PM
    expect(isTimeSlotPassed('anytime', hour)).toBe(false);
    expect(isTimeSlotPassed('morning', hour)).toBe(true);
    expect(isTimeSlotPassed('afternoon', hour)).toBe(false);
    expect(isTimeSlotPassed('evening', hour)).toBe(false);
  });

  it('marks Morning and Afternoon as passed when local hour is 6:00 PM (18:00)', () => {
    const hour = 18; // 6 PM
    expect(isTimeSlotPassed('anytime', hour)).toBe(false);
    expect(isTimeSlotPassed('morning', hour)).toBe(true);
    expect(isTimeSlotPassed('afternoon', hour)).toBe(true);
    expect(isTimeSlotPassed('evening', hour)).toBe(false);
    expect(isTimeSlotPassed('night', hour)).toBe(true);
  });

  it('marks Morning, Afternoon, and Evening as passed when local hour is 10:00 PM (22:00)', () => {
    const hour = 22; // 10 PM
    expect(isTimeSlotPassed('anytime', hour)).toBe(false);
    expect(isTimeSlotPassed('morning', hour)).toBe(true);
    expect(isTimeSlotPassed('afternoon', hour)).toBe(true);
    expect(isTimeSlotPassed('evening', hour)).toBe(true);
    expect(isTimeSlotPassed('night', hour)).toBe(false); // active tonight
  });
});
