export const MOCK_GEOCODE_SUCCESS = {
  status: 'OK',
  results: [
    {
      formatted_address: 'Connaught Place, New Delhi, Delhi 110001, India',
      geometry: {
        location: {
          lat: 28.6315,
          lng: 77.2167,
        },
      },
      place_id: 'ChIJ123456',
    },
  ],
};

export const MOCK_GEOCODE_ZERO_RESULTS = {
  status: 'ZERO_RESULTS',
  results: [],
};

export const MOCK_GEOCODE_OVER_LIMIT = {
  status: 'OVER_QUERY_LIMIT',
  error_message: 'Raw Google internal quota error text that must never reach client',
  results: [],
};

export const MOCK_CURRENT_CONDITIONS_WITH_CPCB = {
  dateTime: '2026-11-23T08:00:00Z',
  regionCode: 'in',
  indexes: [
    {
      code: 'ind_cpcb',
      displayName: 'India National AQI (CPCB)',
      aqi: 342,
      aqiDisplay: '342',
      category: 'Very Poor',
      dominantPollutant: 'pm25',
    },
    {
      code: 'uaqi',
      displayName: 'Universal AQI',
      aqi: 78,
      aqiDisplay: '78',
      category: 'Very poor air quality',
      dominantPollutant: 'pm25',
    },
  ],
  pollutants: [
    {
      code: 'pm25',
      displayName: 'PM2.5',
      fullName: 'Fine particulate matter',
      concentration: {
        value: 185.5,
        units: 'MICROGRAMS_PER_CUBIC_METER',
      },
    },
    {
      code: 'pm10',
      displayName: 'PM10',
      fullName: 'Inhalable particulate matter',
      concentration: {
        value: 320.0,
        units: 'MICROGRAMS_PER_CUBIC_METER',
      },
    },
  ],
};

export const MOCK_CURRENT_CONDITIONS_UAQI_ONLY = {
  dateTime: '2026-11-23T08:00:00Z',
  regionCode: 'us',
  indexes: [
    {
      code: 'uaqi',
      displayName: 'Universal AQI',
      aqi: 45,
      aqiDisplay: '45',
      category: 'Fair air quality',
      dominantPollutant: 'pm25',
    },
  ],
  pollutants: [
    {
      code: 'pm25',
      displayName: 'PM2.5',
      concentration: {
        value: 12.0,
        units: 'MICROGRAMS_PER_CUBIC_METER',
      },
    },
  ],
};

export const generateMockHourlyForecast = (hours = 24) => ({
  regionCode: 'in',
  hourlyForecasts: Array.from({ length: hours }, (_, i) => {
    const hourStr = String(i).padStart(2, '0');
    return {
      dateTime: `2026-11-23T${hourStr}:00:00Z`,
      indexes: [
        {
          code: 'ind_cpcb',
          displayName: 'India National AQI (CPCB)',
          aqi: 320 + i * 2,
          category: 'Very Poor',
          dominantPollutant: 'pm25',
        },
        {
          code: 'uaqi',
          displayName: 'Universal AQI',
          aqi: 70 + Math.floor(i / 2),
          category: 'Very poor air quality',
          dominantPollutant: 'pm25',
        },
      ],
      pollutants: [
        {
          code: 'pm25',
          displayName: 'PM2.5',
          concentration: {
            value: 170.0 + i * 2,
            units: 'MICROGRAMS_PER_CUBIC_METER',
          },
        },
        {
          code: 'pm10',
          displayName: 'PM10',
          concentration: {
            value: 290.0 + i * 3,
            units: 'MICROGRAMS_PER_CUBIC_METER',
          },
        },
      ],
    };
  }),
});
