import { ACTION_CATALOGUE, type ActionDefinition } from '../impact/catalogue';
import { type AirQualityReport } from '../air-quality/types';
import { type PlanRequest } from './types';

export interface PromptContent {
  systemInstruction: string;
  userPrompt: string;
}

export function buildPlanPrompt(
  profile: PlanRequest,
  airQuality: AirQualityReport,
  catalogue: ActionDefinition[] = ACTION_CATALOGUE,
  cleanestWindowText = 'midday'
): PromptContent {
  const vulnerableGroups: string[] = [];
  if (profile.hasAsthmaOrRespiratoryCondition)
    vulnerableGroups.push('Asthma / Respiratory condition');
  if (profile.childrenCount > 0) vulnerableGroups.push(`${profile.childrenCount} child(ren)`);
  if (profile.elderlyCount > 0) vulnerableGroups.push(`${profile.elderlyCount} elderly member(s)`);

  const vulnerabilityDescription =
    vulnerableGroups.length > 0
      ? vulnerableGroups.join(', ')
      : 'No high-risk health conditions reported';

  const systemInstruction = `You are SaafHawa's winter smog action advisor for families and communities.
Your mission is to pick 6 to 8 highly relevant, customized actions from our verified catalogue to help this specific household today.

PERSONALIZATION & CLINICAL RULES:
1. Select ONLY valid action IDs from the provided catalogue.
2. NO NUMBERS IN REASONS: DO NOT include, calculate, or mention any numbers, doses, micrograms (µg), or percentage drops in reasons.
3. HOUSEHOLD-SPECIFIC REASONS: Write reasons strictly matching this household's actual occupants.
   - For a single adult: speak directly to them ("protects your lungs"), NEVER say "family members".
   - If elderly members live there: mention protecting senior cardiovascular and lung reserves, NEVER say "women and children" unless children live there.
   - If children live there: reference protecting children from ground-level inversion.
   - If asthma is reported: mention airway protection and avoiding asthma attacks.
4. BUDGET CONSTRAINTS:
   - If Budget is "zero_cost", choose ONLY Free actions. DO NOT recommend buying induction cooktops, HEPA purifiers, or electric heaters.
5. SENIOR PROTECTION: If seniors live in the home, prioritize "senior_indoor_morning_walk" and "seniors_avoid_strenuous_outdoor".
6. FORECAST TIMING: Schedule time-sensitive actions (ventilation, walks, workouts, outdoor chores) specifically for the cleanest forecast window: ${cleanestWindowText}.
   - If commutersCount is 0, do NOT schedule masks for "Commute Hours"; schedule for "Any outdoor walks or errands".
7. COMMUTE ACTIONS: If primaryCommuteMode is "none" or commutersCount is 0, DO NOT select commute actions ("post_commute_hygiene", "swap_car_for_metro", "swap_two_wheeler_for_metro_or_bus", "carpool_to_work", "work_from_home_on_smog_days").
8. AIR QUALITY SENSITIVITY: Current AQI is ${airQuality.current.aqi ?? 'unavailable'} (${airQuality.current.category ?? 'unavailable'}). If air quality is Good (<=50) or Satisfactory (51-100) and forecast remains clean, DO NOT recommend N95 masks, window sealing, or keeping children/seniors indoors. State clearly that air is fine for normal activity (with a light note for people with asthma if AQI is above 50). Only recommend timing changes if the forecast actually gets worse (>100).
9. Return strictly structured JSON matching the requested schema.`;

  const catalogueList = catalogue
    .map(
      (a) =>
        `- ID: "${a.id}" | Category: ${a.category} | Cost: ${a.costLabel || 'Free (₹0)'} | Title: ${a.title}\n  Description: ${a.description}`
    )
    .join('\n');

  const userPrompt = `Household Profile:
- Location: ${airQuality.location.name}
- Occupants: ${profile.adultsCount} Adult(s), ${profile.childrenCount} Child(ren), ${profile.elderlyCount} Senior(s)
- Vulnerability / Health: ${vulnerabilityDescription}
- Commute: ${profile.primaryCommuteMode} (${profile.dailyCommuteDistanceKm} km round-trip, ${profile.commutersCount} commuter(s))
- Work From Home Option: ${profile.canWorkFromHome ? 'Yes' : 'No'}
- Carpool Option: ${profile.hasCarpoolOption ? 'Yes' : 'No'}
- Cooking Fuel: ${profile.cookingFuel} | Space Heating Fuel: ${profile.heatingFuel}
- Air Purifier Owned: ${profile.hasAirPurifier ? 'Yes' : 'No'}
- Incense / Mosquito Coils: ${profile.usesIncenseOrMosquitoCoils ? 'Yes' : 'No'}
- Open Leaf / Waste Burning: ${profile.hasGardenOrOpenWasteBurning ? 'Yes' : 'No'}
- Window Sealing: ${profile.windowSealingQuality}
- Daily Outdoor Time: ${profile.dailyOutdoorHoursPerPerson} hrs/person (Outdoor exercise: ${profile.doesOutdoorExercise ? 'Yes' : 'No'})
- Budget Preference: ${profile.budget}

Today's Air Quality Conditions:
- Current AQI: ${airQuality.current.aqi ?? 'unavailable'} (${airQuality.current.category ?? 'unavailable'}, Dominant: ${airQuality.current.dominantPollutant ?? 'unavailable'})
- Current PM2.5: ${airQuality.current.pm25?.value !== null && airQuality.current.pm25?.value !== undefined ? `${airQuality.current.pm25.value} µg/m³` : 'unavailable'}
- Cleanest Forecast Window Today: ${cleanestWindowText}

Action Catalogue:
${catalogueList}

Task:
Select 6 to 8 tailored actions from the catalogue for this household today. Return JSON.`;

  return { systemInstruction, userPrompt };
}
