import { z } from 'zod';

export const DEFAULT_GEMINI_MODELS: readonly string[] = [
  'gemini-flash-lite-latest',
  'gemini-2.5-flash-lite',
  'gemini-3.8-flash',
] as const;

export const EnvSchema = z.object({
  GEMINI_API_KEY: z.string().trim().optional(),
  AI_API_KEY: z.string().trim().optional(),
  GOOGLE_MAPS_API_KEY: z.string().trim().optional(),
  WAQI_TOKEN: z.string().trim().optional(),
  GEMINI_MODELS: z.string().trim().optional(),
  GEMINI_MODEL: z.string().trim().optional(),
  GEMINI_FALLBACK_MODEL: z.string().trim().optional(),
  TRUSTED_PROXY_HOPS: z.string().trim().optional(),
  VERCEL: z.string().trim().optional(),
  NODE_ENV: z.string().trim().optional(),
});

export type RawEnv = z.infer<typeof EnvSchema>;

export interface ParsedEnv {
  geminiApiKey: string | undefined;
  googleMapsApiKey: string | undefined;
  waqiToken: string | undefined;
  geminiModels: readonly string[];
  trustedProxyHops: number;
  isVercel: boolean;
}

export function parseEnv(raw: NodeJS.ProcessEnv = process.env): ParsedEnv {
  const result = EnvSchema.safeParse(raw);
  const data = result.success ? result.data : {};

  const geminiApiKey = data.GEMINI_API_KEY || data.AI_API_KEY || undefined;
  const googleMapsApiKey = data.GOOGLE_MAPS_API_KEY || undefined;
  const waqiToken = data.WAQI_TOKEN || undefined;

  let geminiModels: string[];
  if (data.GEMINI_MODELS) {
    const parsed = data.GEMINI_MODELS.split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    geminiModels = parsed.length > 0 ? Array.from(new Set(parsed)) : [...DEFAULT_GEMINI_MODELS];
  } else if (data.GEMINI_MODEL || data.GEMINI_FALLBACK_MODEL) {
    const list = [
      data.GEMINI_MODEL || 'gemini-flash-lite-latest',
      data.GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash-lite',
    ]
      .map((s) => s.trim())
      .filter(Boolean);
    geminiModels = Array.from(new Set(list));
  } else {
    geminiModels = [...DEFAULT_GEMINI_MODELS];
  }

  let trustedProxyHops = 1;
  const rawHops = data.TRUSTED_PROXY_HOPS;
  if (rawHops !== undefined && rawHops !== '') {
    if (rawHops === 'unknown' || rawHops === 'none') {
      trustedProxyHops = 0;
    } else {
      const parsed = parseInt(rawHops, 10);
      trustedProxyHops = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    }
  }

  const isVercel = Boolean(data.VERCEL);

  return {
    geminiApiKey,
    googleMapsApiKey,
    waqiToken,
    geminiModels,
    trustedProxyHops,
    isVercel,
  };
}

const ENV_KEYS = Object.keys(EnvSchema.shape) as (keyof typeof EnvSchema.shape)[];
let cachedSignature: string | undefined;
let cachedEnv: ParsedEnv | undefined;

/**
 * Returns the parsed environment, re-parsing only when one of the variables we read
 * has changed (tests and local tooling can change process.env at runtime).
 */
function currentEnv(): ParsedEnv {
  const signature = ENV_KEYS.map((key) => process.env[key] ?? '').join('\u0000');
  if (!cachedEnv || signature !== cachedSignature) {
    const parsed = parseEnv(process.env);
    cachedEnv = Object.freeze({
      ...parsed,
      geminiModels: Object.freeze([...parsed.geminiModels]),
    });
    cachedSignature = signature;
  }
  return cachedEnv;
}

export const env: ParsedEnv = new Proxy({} as ParsedEnv, {
  get(_target, prop: keyof ParsedEnv) {
    return currentEnv()[prop];
  },
});

export function resolveGeminiApiKey(customApiKey?: string): string | undefined {
  return customApiKey || env.geminiApiKey;
}
