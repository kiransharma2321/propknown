export type LangCode = "en" | "hi" | "te";

export interface LangInfo { code: LangCode; label: string; flag: string }

export const LANGUAGES: LangInfo[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "hi", label: "हिन्दी",   flag: "🇮🇳" },
  { code: "te", label: "తెలుగు",   flag: "🇮🇳" },
];

// Scoped dictionary — header nav, hero, footer, and primary CTAs only.
// Listing data, admin/CRM, and long-form page copy stay English-only by design.
export const DICT: Record<string, Record<LangCode, string>> = {
  navHome:          { en: "Home",         hi: "होम",           te: "హోమ్" },
  navBuy:           { en: "Buy",          hi: "खरीदें",         te: "కొనండి" },
  navSell:          { en: "Sell",         hi: "बेचें",          te: "అమ్మండి" },
  navServices:      { en: "Services",     hi: "सेवाएं",         te: "సేవలు" },
  navAiIntel:       { en: "AI Intel",     hi: "एआई इंटेल",     te: "AI ఇంటెల్" },
  navInvest:        { en: "Invest",       hi: "निवेश करें",     te: "పెట్టుబడి" },
  navBuilders:      { en: "For Builders", hi: "बिल्डरों के लिए", te: "బిల్డర్ల కోసం" },
  navNri:           { en: "NRI",          hi: "एनआरआई",        te: "NRI" },
  navAbout:         { en: "About",        hi: "हमारे बारे में", te: "మా గురించి" },
  navContact:       { en: "Contact",      hi: "संपर्क करें",    te: "సంప్రదించండి" },
  getConsultation:  { en: "Get Consultation", hi: "सलाह लें",  te: "సలహా పొందండి" },

  heroBadge:        { en: "AI-Powered · RERA Verified · Zero Broker Spam", hi: "एआई-संचालित · रेरा सत्यापित · शून्य ब्रोकर स्पैम", te: "AI ఆధారిత · RERA ధృవీకరించబడింది · జీరో బ్రోకర్ స్పామ్" },
  heroHeadline1:    { en: "Know Before You",  hi: "निवेश करने से पहले", te: "పెట్టుబడి పెట్టే ముందు" },
  heroHeadline2:    { en: "Invest",           hi: "जानें",              te: "తెలుసుకోండి" },
  heroSubhead:      { en: "India's first AI-verified real estate platform. Smart search. Honest prices. Zero fake listings.",
                       hi: "भारत का पहला एआई-सत्यापित रियल एस्टेट प्लेटफॉर्म। स्मार्ट खोज। ईमानदार कीमतें। शून्य नकली लिस्टिंग।",
                       te: "భారతదేశపు మొదటి AI-ధృవీకరించిన రియల్ ఎస్టేట్ ప్లాట్‌ఫారమ్. స్మార్ట్ సెర్చ్. నిజాయితీ ధరలు. నకిలీ లిస్టింగ్‌లు లేవు." },
  heroSearchBtn:    { en: "Search Properties", hi: "प्रॉपर्टी खोजें", te: "ప్రాపర్టీలను వెతకండి" },

  footerProperties: { en: "Properties", hi: "प्रॉपर्टी", te: "ప్రాపర్టీలు" },
  footerServices:   { en: "Services",   hi: "सेवाएं",   te: "సేవలు" },
  footerRights:     { en: "All rights reserved.", hi: "सर्वाधिकार सुरक्षित।", te: "అన్ని హక్కులు కలిగి ఉన్నారు." },
  footerPrivacy:    { en: "Privacy Policy", hi: "गोपनीयता नीति", te: "గోప్యతా విధానం" },
  footerTerms:      { en: "Terms of Use",   hi: "उपयोग की शर्तें", te: "ఉపయోగ నిబంధనలు" },
  footerDisclaimer: { en: "Disclaimer",     hi: "अस्वीकरण",      te: "నిరాకరణ" },
};

export type DictKey = keyof typeof DICT;
