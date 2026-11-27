import { describe, it, expect, vi } from 'vitest';
import { ZodError } from 'zod';
import { AirQualityError } from '@/lib/air-quality/types';
import { toErrorResponse } from '@/lib/api/responses';
import * as logger from '@/lib/logger';

describe('API Route Error Response Status, Title and Message Mapping', () => {
  it('community-advisory maps AirQualityError to 500 Advisory Generation Error and logs it', async () => {
    const logSpy = vi.spyOn(logger, 'logServerError').mockImplementation(() => {});
    const error = new AirQualityError('Underlying provider failed', 503);

    const res = toErrorResponse('API:community-advisory', error, {
      serverErrorTitle: 'Advisory Generation Error',
      fallbackMessage: 'Unable to generate community advisory right now. Please try again.',
      zodErrorTitle: 'Validation Error',
      zodErrorMessage: 'Invalid advisory parameters.',
      treatAirQualityAsServerError: true,
    });

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Advisory Generation Error');
    expect(data.message).toBe(
      'Unable to generate community advisory right now. Please try again.'
    );
    expect(logSpy).toHaveBeenCalledWith('API:community-advisory', error);
    logSpy.mockRestore();
  });

  it('chat route returns 500 Chat Service Error on unexpected failures', async () => {
    const logSpy = vi.spyOn(logger, 'logServerError').mockImplementation(() => {});
    const error = new Error('Model timeout');

    const res = toErrorResponse('API:chat', error, {
      serverErrorTitle: 'Chat Service Error',
      fallbackMessage:
        'Unable to process your clean air question right now. Please try again shortly.',
      zodErrorTitle: 'Validation Error',
      zodErrorMessage: 'Please provide a message under 500 characters.',
    });

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Chat Service Error');
    expect(data.message).toBe(
      'Unable to process your clean air question right now. Please try again shortly.'
    );
    logSpy.mockRestore();
  });

  it('air-quality route returns 404 Not Found for location lookup errors and full 500 message', async () => {
    const error404 = new AirQualityError('Location "Unknown" could not be resolved.', 404);
    const res404 = toErrorResponse('API:air-quality', error404, {
      serverErrorTitle: 'Internal Server Error',
      fallbackMessage:
        'An unexpected error occurred while processing air quality data. Please try again later.',
      zodErrorTitle: 'Invalid Request',
      zodErrorMessage:
        'Query parameter "place" must be a valid location name or pincode between 2 and 120 characters.',
      airQualityTitles: {
        400: 'Invalid Request',
        404: 'Not Found',
        429: 'Too Many Requests',
        503: 'Service Unavailable',
      },
      airQualityFallbackTitle: 'Service Error',
    });

    expect(res404.status).toBe(404);
    const data404 = await res404.json();
    expect(data404.error).toBe('Not Found');
    expect(data404.message).toBe('Location "Unknown" could not be resolved.');

    const error500 = new Error('Database crash');
    const res500 = toErrorResponse('API:air-quality', error500, {
      serverErrorTitle: 'Internal Server Error',
      fallbackMessage:
        'An unexpected error occurred while processing air quality data. Please try again later.',
    });

    expect(res500.status).toBe(500);
    const data500 = await res500.json();
    expect(data500.error).toBe('Internal Server Error');
    expect(data500.message).toBe(
      'An unexpected error occurred while processing air quality data. Please try again later.'
    );
  });

  it('plan route keeps Service Unavailable for 400 and 502 AirQualityError', async () => {
    const error400 = new AirQualityError('Bad coordinates', 400);
    const error502 = new AirQualityError('Upstream bad gateway', 502);

    const planOptions = {
      serverErrorTitle: 'Internal Server Error',
      fallbackMessage: 'An unexpected error occurred while generating your daily smog plan.',
      zodErrorTitle: 'Validation Error',
      zodErrorMessage: 'The household profile contains invalid or out-of-range values.',
      airQualityTitles: {
        404: 'Location Not Found',
        429: 'Too Many Requests',
      },
      airQualityFallbackTitle: 'Service Unavailable',
    };

    const res400 = toErrorResponse('API:plan', error400, planOptions);
    expect(res400.status).toBe(400);
    const data400 = await res400.json();
    expect(data400.error).toBe('Service Unavailable');
    expect(data400.message).toBe('Bad coordinates');

    const res502 = toErrorResponse('API:plan', error502, planOptions);
    expect(res502.status).toBe(502);
    const data502 = await res502.json();
    expect(data502.error).toBe('Service Unavailable');
    expect(data502.message).toBe('Upstream bad gateway');
  });

  it('retains Validation Error title and fixed messages for ZodError', async () => {
    const zodErr = new ZodError([]);

    const resAdvisory = toErrorResponse('API:community-advisory', zodErr, {
      zodErrorTitle: 'Validation Error',
      zodErrorMessage: 'Invalid advisory parameters.',
    });
    expect(resAdvisory.status).toBe(400);
    const dataAdvisory = await resAdvisory.json();
    expect(dataAdvisory.error).toBe('Validation Error');
    expect(dataAdvisory.message).toBe('Invalid advisory parameters.');

    const resPlan = toErrorResponse('API:plan', zodErr, {
      zodErrorTitle: 'Validation Error',
      zodErrorMessage: 'The household profile contains invalid or out-of-range values.',
    });
    expect(resPlan.status).toBe(400);
    const dataPlan = await resPlan.json();
    expect(dataPlan.error).toBe('Validation Error');
    expect(dataPlan.message).toBe('The household profile contains invalid or out-of-range values.');
  });
});
