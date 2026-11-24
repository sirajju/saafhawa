import { FunctionDeclaration, Type } from '@google/genai';

export const AIR_QUALITY_TOOL_DECLARATION: FunctionDeclaration = {
  name: 'getAirQualityAndForecast',
  description:
    'Retrieves the real-time Air Quality Index (AQI), PM2.5, PM10, dominant pollutant, and 24-hour hourly forecast for a place name or pincode. Always call this when the user asks about current conditions, specific hours (e.g. 5 PM), or upcoming forecast.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      place: {
        type: Type.STRING,
        description: 'The location name, landmark, city, or pincode (e.g. "Connaught Place", "110001", "Lahore").',
      },
    },
    required: ['place'],
  },
};

export const CALCULATE_IMPACT_TOOL_DECLARATION: FunctionDeclaration = {
  name: 'calculateActionImpact',
  description:
    'Runs the scientific arithmetic engine to calculate exact PM2.5 inhaled dose avoided (in µg) and emissions saved (PM2.5 and CO2 in grams) for a specific action from the catalogue.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      actionId: {
        type: Type.STRING,
        description:
          'The ID of the action from the catalogue (e.g. "wear_n95_mask_outside", "run_hepa_air_purifier_bedroom", "swap_car_for_metro", "eliminate_incense_and_mosquito_coils", "diy_corsi_rosenthal_box").',
      },
    },
    required: ['actionId'],
  },
};

export const LIST_ACTIONS_TOOL_DECLARATION: FunctionDeclaration = {
  name: 'listCatalogueActions',
  description:
    'Lists the verified clean-air actions available in the SaafHawa catalogue grouped by daily routine, indoor air, and sustainable swaps.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      category: {
        type: Type.STRING,
        description:
          'Optional category filter: "daily_routine", "indoor_air", or "sustainable_swaps".',
      },
    },
  },
};

export const CHAT_TOOLS = [
  {
    functionDeclarations: [
      AIR_QUALITY_TOOL_DECLARATION,
      CALCULATE_IMPACT_TOOL_DECLARATION,
      LIST_ACTIONS_TOOL_DECLARATION,
    ],
  },
];
