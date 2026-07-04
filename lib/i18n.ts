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
  getConsultation:  { en: "Request Consultation", hi: "सलाह लें",  te: "సలహా పొందండి" },

  heroBadge:        { en: "AI-Powered Intelligence · RERA-Verified Listings · Zero Broker Spam", hi: "एआई-संचालित इंटेलिजेंस · रेरा-सत्यापित लिस्टिंग · शून्य ब्रोकर स्पैम", te: "AI ఆధారిత ఇంటెలిజెన్స్ · RERA-ధృవీకరించిన లిస్టింగ్‌లు · జీరో బ్రోకర్ స్పామ్" },
  heroHeadline1:    { en: "Know Before You",  hi: "निवेश करने से पहले", te: "పెట్టుబడి పెట్టే ముందు" },
  heroHeadline2:    { en: "Invest",           hi: "जानें",              te: "తెలుసుకోండి" },
  heroSubhead:      { en: "India's first AI-powered, RERA-verified real estate advisory. Honest pricing. Zero fake listings. Expert guidance — across India and beyond.",
                       hi: "भारत की पहली एआई-संचालित, रेरा-सत्यापित रियल एस्टेट सलाहकार सेवा। ईमानदार कीमतें। शून्य नकली लिस्टिंग। विशेषज्ञ मार्गदर्शन — भारत और उससे आगे।",
                       te: "భారతదేశపు మొదటి AI-ఆధారిత, RERA-ధృవీకరించిన రియల్ ఎస్టేట్ సలహా సేవ. నిజాయితీ ధరలు. నకిలీ లిస్టింగ్‌లు లేవు. నిపుణుల మార్గదర్శకత్వం — భారతదేశం మరియు అంతకు మించి." },
  heroSearchBtn:    { en: "Search Properties", hi: "प्रॉपर्टी खोजें", te: "ప్రాపర్టీలను వెతకండి" },

  footerProperties: { en: "Properties", hi: "प्रॉपर्टी", te: "ప్రాపర్టీలు" },
  footerServices:   { en: "Services",   hi: "सेवाएं",   te: "సేవలు" },
  footerRights:     { en: "All rights reserved.", hi: "सर्वाधिकार सुरक्षित।", te: "అన్ని హక్కులు కలిగి ఉన్నారు." },
  footerPrivacy:    { en: "Privacy Policy", hi: "गोपनीयता नीति", te: "గోప్యతా విధానం" },
  footerTerms:      { en: "Terms of Use",   hi: "उपयोग की शर्तें", te: "ఉపయోగ నిబంధనలు" },
  footerDisclaimer: { en: "Disclaimer",     hi: "अस्वीकरण",      te: "నిరాకరణ" },
};

export type DictKey = keyof typeof DICT;
