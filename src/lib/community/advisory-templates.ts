/* eslint-disable max-lines-per-function */
import { type AirQualityReport } from '../air-quality/types';
import { formatMeasurementTime } from '../air-quality/time-utils';

/**
 * High-quality template fallback for WhatsApp advisories in English and Hindi.
 */
export function generateTemplateAdvisory(
  report: AirQualityReport,
  audience: 'housing_society' | 'school_group',
  language: 'en' | 'hi'
): { headline: string; advisoryText: string } {
  const loc = report.location.name;
  const aqiNum = report.current.aqi;
  const aqiText = typeof aqiNum === 'number' ? `${aqiNum}` : 'Data unavailable';
  const cat = report.current.category ? `(${report.current.category})` : '';
  const aqiDisplay = `${aqiText} ${cat}`.trim();
  const pm25 = report.current.pm25 ? `${report.current.pm25.value} µg/m³` : 'Unavailable';
  const source = report.current.dataSource || 'Open-Meteo (CAMS model)';
  const measuredTime = formatMeasurementTime(report.current.dateTime, report.location.timeZone);

  const aqiLabelHi = '⚠️ *वायु गुणवत्ता:*';
  const aqiLabelEn = '⚠️ *Air Quality:*';

  if (language === 'hi') {
    if (audience === 'school_group') {
      const headline = `🏫 स्कूल एवं अभिभावक समूह: वायु प्रदूषण सुरक्षा परामर्श (${loc})`;
      const advisoryText = `*${headline}*
📅 दिनांक: ${new Date().toLocaleDateString('hi-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
📍 क्षेत्र: ${loc}
📊 *डेटा स्रोत:* ${source} (मापा गया समय: ${measuredTime})
${aqiLabelHi} ${aqiDisplay}
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
      const advisoryText = `*${headline}*
📅 दिनांक: ${new Date().toLocaleDateString('hi-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
📍 क्षेत्र: ${loc}
📊 *डेटा स्रोत:* ${source} (मापा गया समय: ${measuredTime})
${aqiLabelHi} ${aqiDisplay}
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
    const advisoryText = `*${headline}*
📅 Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
📍 Area: ${loc}
📊 *Data Source:* ${source} (Measured: ${measuredTime})
${aqiLabelEn} ${aqiDisplay}
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
    const advisoryText = `*${headline}*
📅 Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
📍 Location: ${loc}
📊 *Data Source:* ${source} (Measured: ${measuredTime})
${aqiLabelEn} ${aqiDisplay}
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
