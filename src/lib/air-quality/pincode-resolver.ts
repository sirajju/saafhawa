/* eslint-disable complexity */
import { LocationNotFoundError, ProviderUnavailableError, AirQualityError } from './types';
import { safeFetch } from './safe-fetch';

const POSTAL_PINCODE_API_URL = 'https://api.postalpincode.in/pincode';

const INDIAN_CITY_ALIASES: Record<string, string> = {
  bangalore: 'Bengaluru',
  bombay: 'Mumbai',
  calcutta: 'Kolkata',
  madras: 'Chennai',
};

export function normalizeIndianCity(name?: string | null): string | null {
  if (!name) return null;
  const lower = name.toLowerCase().trim();
  return INDIAN_CITY_ALIASES[lower] || name.trim();
}

interface PostalPincodePostOffice {
  Name?: string;
  Description?: string | null;
  BranchType?: string;
  DeliveryStatus?: string;
  Circle?: string;
  District?: string;
  Division?: string;
  Region?: string;
  State?: string;
  Country?: string;
  Pincode?: string;
}

interface PostalPincodeResponseItem {
  Status?: string;
  Message?: string;
  PostOffice?: PostalPincodePostOffice[] | null;
}

export interface ClientRequestOptions {
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

/**
 * Resolves a 6-digit Indian Postal PIN code into prioritized candidate search queries.
 */
export async function resolveIndianPincodeCandidates(
  pincode: string,
  options: ClientRequestOptions = {}
): Promise<string[]> {
  const url = `${POSTAL_PINCODE_API_URL}/${encodeURIComponent(pincode)}`;

  let response: Response;
  try {
    response = await safeFetch(
      url,
      { method: 'GET', headers: { Accept: 'application/json' } },
      options
    );
  } catch (err) {
    if (err instanceof AirQualityError) throw err;
    throw new ProviderUnavailableError(
      'Unable to connect to postal pincode service. Please check your connection.'
    );
  }

  if (!response.ok) {
    throw new LocationNotFoundError(
      `Could not resolve Indian pincode "${pincode}". Please enter a city or area name instead (e.g. "Connaught Place, New Delhi" or "Bandra, Mumbai").`
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new LocationNotFoundError(
      `Could not resolve Indian pincode "${pincode}". Please enter a city or area name instead (e.g. "Connaught Place, New Delhi" or "Bandra, Mumbai").`
    );
  }

  if (Array.isArray(data) && data.length > 0) {
    const item = data[0] as PostalPincodeResponseItem;
    if (item.Status === 'Success' && Array.isArray(item.PostOffice) && item.PostOffice.length > 0) {
      const po = item.PostOffice[0];
      const candidates: string[] = [];
      if (po.District && po.State) candidates.push(`${po.District}, ${po.State}`);
      if (po.Name && po.State) candidates.push(`${po.Name}, ${po.State}`);
      if (po.District) candidates.push(po.District);
      if (po.Circle) candidates.push(po.Circle);
      if (candidates.length > 0) return Array.from(new Set(candidates));
    }
  }

  throw new LocationNotFoundError(
    `Could not resolve Indian pincode "${pincode}". Please enter a city or area name instead (e.g. "Connaught Place, New Delhi" or "Bandra, Mumbai").`
  );
}
