// M13: Telugu + Hindi for the most visible text (navigation, homepage hero, price board).
// Translations were drafted by PropKnown's AI assistant and MUST be reviewed by a native speaker
// before the feature flag is switched on. Anything not in the dictionary falls back to English.
// Numbers, prices, place and project names are never translated.

export const LANGS = { en: { label: "English", short: "EN", html: "en-IN" }, te: { label: "తెలుగు", short: "తె", html: "te-IN" }, hi: { label: "हिंदी", short: "हि", html: "hi-IN" } } as const;
export type Lang = keyof typeof LANGS;
export const LANG_COOKIE = "pk_lang";

const en = {
  "nav.home": "Home", "nav.buy": "Buy", "nav.sell": "Sell", "nav.services": "Services", "nav.aiIntel": "AI Intel",
  "nav.builders": "For Builders", "nav.about": "About", "nav.contact": "Contact", "nav.resources": "Resources",
  "nav.login": "Login", "nav.consult": "Request Consultation",
  "hero.badge": "AI-Powered Intelligence · Zero Broker Spam",
  "hero.h1a": "Know the fair price", "hero.h1b": "before you pay the token.",
  "hero.sub": "The honest truth about any property — even when it's not what the seller wants you to hear.",
  "hero.subShort": "The honest truth about any property.",
  "hero.tab.area": "Area", "hero.tab.project": "Project", "hero.tab.quote": "My quote",
  "hero.label.area": "Check Any Location's Real Price", "hero.label.project": "Check a project's asking price", "hero.label.quote": "Is my quoted price fair?",
  "hero.button": "Check Real Price", "hero.brokerage": "Brokerage",
  "board.h2": "Real prices, area by area",
  "board.sub": "Typical apartment asking prices from live web sources. Pick a city, then tap any bar for its sources, range and captured date.",
  "board.p1": "Any city, any area, any project", "board.p2": "Every price with sources and date", "board.p3": "India, UAE and beyond",
} as const;
export type MsgKey = keyof typeof en;

const te: Partial<Record<MsgKey, string>> = {
  "nav.home": "హోమ్", "nav.buy": "కొనండి", "nav.sell": "అమ్మండి", "nav.services": "సేవలు", "nav.aiIntel": "AI ఇంటెల్",
  "nav.builders": "బిల్డర్ల కోసం", "nav.about": "మా గురించి", "nav.contact": "సంప్రదించండి", "nav.resources": "వనరులు",
  "nav.login": "లాగిన్", "nav.consult": "సలహా కోరండి",
  "hero.badge": "AI ఆధారిత సమాచారం · బ్రోకర్ల ఒత్తిడి లేదు",
  "hero.h1a": "టోకెన్ చెల్లించే ముందే", "hero.h1b": "సరైన ధర తెలుసుకోండి.",
  "hero.sub": "ఏ ఆస్తి గురించైనా నిజాయితీగల నిజం — అమ్మేవారు వినాలనుకోనిదైనా సరే.",
  "hero.subShort": "ఏ ఆస్తి గురించైనా నిజాయితీగల నిజం.",
  "hero.tab.area": "ప్రాంతం", "hero.tab.project": "ప్రాజెక్ట్", "hero.tab.quote": "నా కోట్",
  "hero.label.area": "ఏ ప్రాంతం అసలు ధరనైనా చూడండి", "hero.label.project": "ప్రాజెక్ట్ అడుగుతున్న ధర చూడండి", "hero.label.quote": "నాకు చెప్పిన ధర సరైనదేనా?",
  "hero.button": "అసలు ధర చూడండి", "hero.brokerage": "బ్రోకరేజ్",
  "board.h2": "అసలు ధరలు, ప్రాంతాల వారీగా",
  "board.sub": "లైవ్ వెబ్ మూలాల నుండి సాధారణ అపార్ట్‌మెంట్ అడిగే ధరలు. నగరాన్ని ఎంచుకుని, మూలాలు, పరిధి, సేకరించిన తేదీ కోసం ఏ బార్‌నైనా నొక్కండి.",
  "board.p1": "ఏ నగరమైనా, ఏ ప్రాంతమైనా, ఏ ప్రాజెక్ట్ అయినా", "board.p2": "ప్రతి ధరకూ మూలాలు, తేదీ", "board.p3": "భారత్, UAE, ఇంకా ఎన్నో",
};

const hi: Partial<Record<MsgKey, string>> = {
  "nav.home": "होम", "nav.buy": "खरीदें", "nav.sell": "बेचें", "nav.services": "सेवाएँ", "nav.aiIntel": "AI इंटेल",
  "nav.builders": "बिल्डरों के लिए", "nav.about": "हमारे बारे में", "nav.contact": "संपर्क करें", "nav.resources": "संसाधन",
  "nav.login": "लॉगिन", "nav.consult": "सलाह लें",
  "hero.badge": "AI-आधारित जानकारी · ब्रोकर का दबाव नहीं",
  "hero.h1a": "टोकन देने से पहले", "hero.h1b": "सही कीमत जानें।",
  "hero.sub": "किसी भी प्रॉपर्टी का ईमानदार सच — भले ही बेचने वाला वह सुनना न चाहे।",
  "hero.subShort": "किसी भी प्रॉपर्टी का ईमानदार सच।",
  "hero.tab.area": "इलाका", "hero.tab.project": "प्रोजेक्ट", "hero.tab.quote": "मेरा कोट",
  "hero.label.area": "किसी भी इलाके की असली कीमत देखें", "hero.label.project": "प्रोजेक्ट की माँगी गई कीमत देखें", "hero.label.quote": "क्या मुझे बताई गई कीमत सही है?",
  "hero.button": "असली कीमत देखें", "hero.brokerage": "ब्रोकरेज",
  "board.h2": "असली कीमतें, इलाकेवार",
  "board.sub": "लाइव वेब स्रोतों से अपार्टमेंट की आम माँगी गई कीमतें। शहर चुनें, फिर स्रोत, दायरा और तारीख देखने के लिए किसी भी बार पर टैप करें।",
  "board.p1": "कोई भी शहर, कोई भी इलाका, कोई भी प्रोजेक्ट", "board.p2": "हर कीमत के साथ स्रोत और तारीख", "board.p3": "भारत, UAE और आगे",
};

const DICTS: Record<Lang, Partial<Record<MsgKey, string>>> = { en, te, hi };

export function translate(lang: Lang, key: MsgKey): string {
  return DICTS[lang]?.[key] ?? en[key];
}
export const isLang = (v: unknown): v is Lang => typeof v === "string" && v in LANGS;
// Every Telugu/Hindi key must exist in English (checked in tests).
export const DICTIONARY_KEYS = { en: Object.keys(en), te: Object.keys(te), hi: Object.keys(hi) };
