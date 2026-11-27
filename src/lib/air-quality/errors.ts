// Custom Domain Errors for Air Quality

export class AirQualityError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = 'AirQualityError';
    this.statusCode = statusCode;
  }
}

export class LocationNotFoundError extends AirQualityError {
  constructor(query: string) {
    super(`Location not found for "${query}". Please check the place name or pincode.`, 404);
    this.name = 'LocationNotFoundError';
  }
}

export class QuotaExceededError extends AirQualityError {
  constructor() {
    super('Air quality service quota or rate limit exceeded. Please try again later.', 429);
    this.name = 'QuotaExceededError';
  }
}

export class ProviderUnavailableError extends AirQualityError {
  constructor(
    reason = 'Air quality service is temporarily unavailable. Please try again shortly.'
  ) {
    super(reason, 503);
    this.name = 'ProviderUnavailableError';
  }
}

export class InvalidInputError extends AirQualityError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'InvalidInputError';
  }
}
