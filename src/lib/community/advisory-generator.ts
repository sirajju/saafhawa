import { GoogleGenAI } from '@google/genai';
import { getAirQualityByLocation } from '../air-quality/service';
import { AirQualityReport } from '../air-quality/types';
import { AdvisoryRequest, AdvisoryResponse } from './types';

export interface AdvisoryGeneratorOptions {
  model?: string;
  apiKey?: string;
  airQualityFetcher?: (place: string) => Promise<AirQualityReport>;
}

function resolveModel(customModel?: string): string {
  return customModel || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
}

function resolveApiKey(customApiKey?: string): string | undefined {
  return customApiKey || process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
}

/**
 * High-quality template fallback for WhatsApp advisories in English and Hindi.
 */
function generateTemplateAdvisory(
  report: AirQualityReport,
  audience: 'housing_society' | 'school_group',
  language: 'en' | 'hi'
): { headline: string; advisoryText: string } {
  const loc = report.location.name;
  const aqi = report.current.aqi ?? 250;
  const cat = report.current.category || 'Severe';
  const pm25 = report.current.pm25 ? `${report.current.pm25.value} µg/m³` : 'Extremely High';

  if (language === 'hi') {
    if (audience === 'school_group') {
      const headline = `🏫 स्कूल एवं अभिभावक समूह: वायु प्रदूषण सुरक्षा परामर्श (${loc})`;
      const advisoryText =
`*${headline}*
📅 दिनांक: ${new Date().toLocaleDateString('hi-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
📍 क्षेत्र: ${loc}
⚠️ *वायु गुणवत्ता (AQI): ${aqi}* (${cat} श्रेणी)
🌫️ *PM2.5 स्तर:* ${pm25}

सभी अभिभावकों, शिक्षकों और स्कूल प्रबंधन के लिए महत्वपूर्ण दिशा-निर्देश:

1️⃣ *सुबह की आउटडोर असेंबली स्थगित रखें:* सुबह 6 से 10 बजे के बीच स्मॉग का असर सबसे अधिक होता है। सभी प्रार्थना और खेल इनडोर कक्षाओं में आयोजित करें।
2️⃣ *N95 मास्क अनिवार्य:* स्कूल बस और वैन से आते-जाते समय सभी बच्चे N95 या FFP2 मास्क अवश्य पहनें।
3️⃣ *अस्थमा एवं सांस के मरीज़:* जिन बच्चों को अस्थमा या सांस की दिक्कत है, उनके बस्ते में प्रिस्क्राइब्ड इनहेलर ज़रूर रखें और क्लास टीचर को सूचित करें।
4️⃣ *खिड़कियां बंद रखें:* सुबह के समय क्लासरूम की खिड़कियां बंद रखें ताकि बाहर की जहरीली हवा अंदर न भरे।
5️⃣ *पानी और पोषण:* बच्चों को भरपूर गुनगुना पानी पीने और हाइड्रेटेड रहने के लिए प्रेरित करें।

_साफ़ हवा (SaafHawa) द्वारा जनहित में जारी — कृपया इसे अपने स्कूल और क्लास व्हाट्सएप ग्रुप में साझा करें!_ 🌿`;

      return { headline, advisoryText };
    } else {
      const headline = `🏘️ आवासीय सोसायटी / RWA शीतकालीन स्मॉग परामर्श (${loc})`;
      const advisoryText =
`*${headline}*
📅 दिनांक: ${new Date().toLocaleDateString('hi-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
📍 क्षेत्र: ${loc}
⚠️ *वर्तमान AQI:* ${aqi} (${cat})
🌫️ *PM2.5 प्रदूषण:* ${pm25}

सोसायटी के सभी निवासियों और सुरक्षा गार्ड्स के लिए महत्वपूर्ण सुझाव:

🚫 *कचरा या सूखे पत्ते बिल्कुल न जलाएं:* पत्तियों या कचरे को जलाने पर सख्त पाबंदी है। बागवानी कचरे को कंपोस्ट करें।
🚶‍♂️ *सुबह की सैर से बचें:* ठंड और स्मॉग सुबह सबसे घना होता है। बुज़ुर्ग और बच्चे सैर के लिए दोपहर 1 से 3 बजे का समय चुनें।
🧹 *गीला पोछा लगाएं:* सामान्य रास्तों और गलियारों में सूखी झाड़ू के बजाय गीले पोछे का उपयोग करें ताकि धूल न उड़े।
🚗 *कारपूल व मेट्रो का उपयोग:* दफ्तर जाने के लिए मेट्रो या कारपूलिंग चुनें; गेट पर गाड़ियों का इंजन बेवजह चालू न रखें।
😷 *बाहर निकलते समय N95 मास्क पहनें:* सुरक्षा गार्ड्स और हाउसकीपिंग स्टाफ को N95 मास्क उपलब्ध कराएं।

_साफ़ हवा (SaafHawa) द्वारा जनहित में जारी — मिलकर हवा को स्वच्छ बनाएं!_ 🌱`;

      return { headline, advisoryText };
    }
  }

  // English Advisories
  if (audience === 'school_group') {
    const headline = `🏫 School & Parent Smog Advisory (${loc})`;
    const advisoryText =
`*${headline}*
📅 Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
📍 Area: ${loc}
⚠️ *Current AQI:* ${aqi} (${cat})
🌫️ *PM2.5 Level:* ${pm25}

Key health precautions for students, parents, and teachers today:

1️⃣ *Suspend Morning Outdoor Assembly & Sports:* Cold inversion traps toxic particulates near the ground in the morning. Shift assemblies and PE classes indoors.
2️⃣ *N95 Masking on Commutes:* Students must wear certified N95 or FFP2 respirators on school buses, vans, and walks.
3️⃣ *Asthma & Respiratory Care:* Ensure students with asthma or respiratory allergies carry their inhalers and teachers are informed.
4️⃣ *Seal Classroom Windows:* Keep exterior doors and windows closed during morning hours to prevent smog infiltration.
5️⃣ *Stay Hydrated:* Encourage students to drink warm water regularly throughout the school day.

_Shared via SaafHawa Community Defense — Please forward to class & parent WhatsApp groups!_ 🌿`;

    return { headline, advisoryText };
  } else {
    const headline = `🏘️ Housing Society / RWA Clean Air Advisory (${loc})`;
    const advisoryText =
`*${headline}*
📅 Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
📍 Location: ${loc}
⚠️ *Current Air Quality:* ${aqi} (${cat})
🌫️ *PM2.5 Concentration:* ${pm25}

Urgent cooperative actions for all residents & facility management today:

🚫 *Zero Open Burning:* Strictly prohibit burning dry garden leaves or waste. Compost or mulch instead.
🚶‍♀️ *Shift Senior Walking Hours:* Early morning thermal inversion is hazardous. Seniors & heart/lung patients should walk between 1:00 PM – 3:30 PM.
🧹 *Wet Mopping in Corridors:* Instruct maintenance to damp-mop common driveways and stairwells instead of dry broom sweeping.
🚗 *Carpool & Zero-Idling:* Share rides or take the Metro; turn off car engines while waiting at society gates.
😷 *Protect Guards & Staff:* Ensure society security guards and facility workers have N95 masks for outdoor duty.

_Issued by SaafHawa Community Defense — Clean air begins with community action!_ 🌱`;

    return { headline, advisoryText };
  }
}

/**
 * Generates an advisory for WhatsApp sharing via Gemini (or localized template fallback).
 */
export async function generateCommunityAdvisory(
  request: AdvisoryRequest,
  options: AdvisoryGeneratorOptions = {}
): Promise<AdvisoryResponse> {
  const fetcher = options.airQualityFetcher ?? getAirQualityByLocation;
  const report = await fetcher(request.place);

  const model = resolveModel(options.model);
  const apiKey = resolveApiKey(options.apiKey);

  const snapshot = {
    locationName: report.location.name,
    aqi: report.current.aqi,
    category: report.current.category || 'Severe',
    pm25UgM3: report.current.pm25 ? report.current.pm25.value : null,
  };

  if (!apiKey) {
    const template = generateTemplateAdvisory(report, request.audience, request.language);
    return {
      headline: template.headline,
      advisoryText: template.advisoryText,
      audience: request.audience,
      language: request.language,
      airQualitySnapshot: snapshot,
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are a public health and air quality communication specialist in India.
Write a concise, impactful WhatsApp broadcast advisory in ${request.language === 'hi' ? 'Hindi (Devanagari script)' : 'English'} for a ${request.audience === 'school_group' ? 'School / Parent Teacher Group' : 'Housing Society / Resident Welfare Association (RWA)'}.

LOCATION & AIR QUALITY:
- Location: ${report.location.name}
- Current AQI: ${report.current.aqi ?? 'Severe'} (${report.current.category ?? 'Unhealthy'})
- PM2.5 Level: ${report.current.pm25?.value ?? 'Elevated'} µg/m³
- Dominant Pollutant: ${report.current.dominantPollutant ?? 'PM2.5'}

REQUIREMENTS:
1. Format for WhatsApp: use bold headers (*Title*), numbered points (1️⃣, 2️⃣), and clean bullet points with relevant emojis.
2. Provide 4 to 5 highly practical, low-emission actions specific to ${request.audience === 'school_group' ? 'schools (cancel morning outdoor assemblies, N95 masking on buses, inhalers for asthma kids, indoor recess)' : 'housing societies (no leaf burning, wet mopping corridors instead of dry sweeping, no vehicle idling at gates, shift elderly walks to midday, carpooling)'}.
3. Keep it brief (under 250 words) so it fits in a single mobile screen and is ready to copy-paste.
4. Output ONLY the raw WhatsApp text with no conversational preamble or markdown code fences.`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    const advisoryText = response.text?.trim();

    if (advisoryText && advisoryText.length > 50) {
      const headline = request.language === 'hi'
        ? (request.audience === 'school_group' ? `🏫 स्कूल परामर्श: ${report.location.name}` : `🏘️ सोसायटी परामर्श: ${report.location.name}`)
        : (request.audience === 'school_group' ? `🏫 School Smog Advisory: ${report.location.name}` : `🏘️ Community Clean Air Advisory: ${report.location.name}`);

      return {
        headline,
        advisoryText,
        audience: request.audience,
        language: request.language,
        airQualitySnapshot: snapshot,
      };
    }

    const template = generateTemplateAdvisory(report, request.audience, request.language);
    return {
      headline: template.headline,
      advisoryText: template.advisoryText,
      audience: request.audience,
      language: request.language,
      airQualitySnapshot: snapshot,
    };
  } catch {
    const template = generateTemplateAdvisory(report, request.audience, request.language);
    return {
      headline: template.headline,
      advisoryText: template.advisoryText,
      audience: request.audience,
      language: request.language,
      airQualitySnapshot: snapshot,
    };
  }
}
