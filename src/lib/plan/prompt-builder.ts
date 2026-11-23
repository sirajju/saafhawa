import { ACTION_CATALOGUE, ActionDefinition } from '../impact/catalogue';
import { AirQualityReport } from '../air-quality/types';
import { PlanRequest } from './types';

export interface PromptContent {
  systemInstruction: string;
  userPrompt: string;
}

export function buildPlanPrompt(
  profile: PlanRequest,
  airQuality: AirQualityReport,
  catalogue: ActionDefinition[] = ACTION_CATALOGUE
): PromptContent {
  const vulnerableGroups: string[] = [];
  if (profile.hasAsthmaOrRespiratoryCondition) vulnerableGroups.push('Asthma / Respiratory condition');
  if (profile.childrenCount > 0) vulnerableGroups.push(`${profile.childrenCount} child(ren)`);
  if (profile.elderlyCount > 0) vulnerableGroups.push(`${profile.elderlyCount} elderly member(s)`);

  const vulnerabilityDescription =
    vulnerableGroups.length > 0 ? vulnerableGroups.join(', ') : 'No high-risk health conditions reported';

  const systemInstruction = `You are SaafHawa's winter smog action advisor for families and communities.
Your mission is to pick the 6 to 8 most relevant and practical actions from our verified catalogue to help a family navigate today's air quality crisis.

CRITICAL RULES:
1. Select ONLY valid action IDs from the provided catalogue.
2. DO NOT include, calculate, or mention any numbers, micrograms (µg), percentages, doses, or emission values in your explanations. All quantitative impact numbers are computed deterministically by our backend calculator.
3. Keep the reason for each action short (1-2 sentences), encouraging, friendly, and directly tailored to the family's profile (e.g. mentioning asthma, kids, their commute mode, or purifier status).
4. Assign a practical suggestedTimeOfDay (e.g., "Morning", "Midday / Afternoon", "Evening", "Night / Bedtime", or "All Day").
5. Return exactly structured JSON matching the requested schema.`;

  const catalogueList = catalogue
    .map(
      (a) =>
        `- ID: "${a.id}" | Category: ${a.category} | Title: ${a.title}\n  Description: ${a.description}`
    )
    .join('\n');

  const userPrompt = `Household Profile:
- Location: ${airQuality.location.name}
- Occupants: ${profile.adultsCount} Adult(s), ${profile.childrenCount} Child(ren), ${profile.elderlyCount} Senior(s)
- Vulnerability / Health: ${vulnerabilityDescription}
- Primary Commute: ${profile.primaryCommuteMode} (${profile.dailyCommuteDistanceKm} km round-trip)
- Work From Home Option: ${profile.canWorkFromHome ? 'Yes' : 'No'}
- Carpool Option: ${profile.hasCarpoolOption ? 'Yes' : 'No'}
- Cooking Fuel: ${profile.cookingFuel}
- Space Heating Fuel: ${profile.heatingFuel}
- Owns Air Purifier: ${profile.hasAirPurifier ? 'Yes' : 'No'}
- Uses Incense/Mosquito Coils: ${profile.usesIncenseOrMosquitoCoils ? 'Yes' : 'No'}
- Open Leaf/Waste Burning: ${profile.hasGardenOrOpenWasteBurning ? 'Yes' : 'No'}
- Home Window Sealing: ${profile.windowSealingQuality}
- Daily Outdoor Time: ${profile.dailyOutdoorHoursPerPerson} hrs/person (Outdoor exercise: ${profile.doesOutdoorExercise ? 'Yes' : 'No'})
- Budget Preference: ${profile.budget}

Today's Air Quality Conditions:
- Current AQI: ${airQuality.current.aqi ?? 'Unknown'} (${airQuality.current.category ?? 'Unhealthy'}, Dominant Pollutant: ${airQuality.current.dominantPollutant ?? 'PM2.5'})
- Current PM2.5: ${airQuality.current.pm25?.value ?? 'Elevated'} µg/m³
- Hourly Trend: ${airQuality.hourlyForecast.length} hours of forecast data available

Action Catalogue to Choose From:
${catalogueList}

Task:
Select the 6 to 8 most useful actions from the catalogue above for this household today. Return the result as JSON. Remember: DO NOT include any numbers or numerical calculations in your reasons.`;

  return { systemInstruction, userPrompt };
}
