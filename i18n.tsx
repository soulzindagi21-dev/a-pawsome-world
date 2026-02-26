
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Language } from './types';

export const LANGUAGES: { code: Language; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
];

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    dashboard_welcome: "Daily Insight",
    dashboard_insight: "Hydration is key today! 💧",
    dashboard_insight_desc: "Based on high temperatures in your area, ensure community strays have access to fresh water bowls.",
    btn_view_score: "View Community Score",
    btn_report_stray: "Report Stray",
    quick_actions: "Quick Actions",
    your_pack: "Your Pack",
    add_dog: "Add Dog",
    nav_home: "Home",
    nav_streetwatch: "StreetWatch",
    nav_health: "Health",
    nav_community: "Community",
    nav_report: "Abuse Report",
    act_report: "Report",
    act_map: "Map",
    act_health: "Health",
    act_polls: "Polls",
  },
  hi: {
    dashboard_welcome: "दैनिक सुझाव",
    dashboard_insight: "आज हाइड्रेशन महत्वपूर्ण है! 💧",
    dashboard_insight_desc: "आपके क्षेत्र में उच्च तापमान के आधार पर, सुनिश्चित करें कि सामुदायिक कुत्तों के लिए ताजे पानी के कटोरे हों।",
    btn_view_score: "सामुदायिक स्कोर देखें",
    btn_report_stray: "स्ट्रे रिपोर्ट करें",
    quick_actions: "त्वरित कार्य",
    your_pack: "आपके कुत्ते",
    add_dog: "कुत्ता जोड़ें",
    nav_home: "होम",
    nav_streetwatch: "स्ट्रीट वॉच",
    nav_health: "स्वास्थ्य",
    nav_community: "समुदाय",
    nav_report: "क्रूरता रिपोर्ट",
    act_report: "रिपोर्ट",
    act_map: "नक्शा",
    act_health: "स्वास्थ्य",
    act_polls: "पोल",
  },
  bn: {
    dashboard_welcome: "দৈনিক অন্তর্দৃষ্টি",
    dashboard_insight: "আজ জল পান করা জরুরি! 💧",
    dashboard_insight_desc: "উচ্চ তাপমাত্রার কারণে, রাস্তার কুকুরদের জন্য পরিষ্কার জলের ব্যবস্থা করুন।",
    btn_view_score: "কমিউনিটি স্কোর",
    btn_report_stray: "কুকুর রিপোর্ট করুন",
    quick_actions: "দ্রুত পদক্ষেপ",
    your_pack: "আপনার কুকুর",
    add_dog: "কুকুর যোগ করুন",
    nav_home: "হোম",
    nav_streetwatch: "স্ট্রিট ওয়াচ",
    nav_health: "স্বাস্থ্য",
    nav_community: "কমিউনিটি",
    nav_report: "রিপোর্ট",
    act_report: "রিপোর্ট",
    act_map: "ম্যাপ",
    act_health: "স্বাস্থ্য",
    act_polls: "ভোট",
  },
  mr: {
    dashboard_welcome: "दैनिक माहिती",
    dashboard_insight: "आज हायड्रेशन महत्त्वाचे आहे! 💧",
    dashboard_insight_desc: "वाढत्या तापमानामुळे, भटक्या कुत्र्यांसाठी स्वच्छ पाण्याची व्यवस्था करा.",
    btn_view_score: "कम्युनिटी स्कोर",
    btn_report_stray: "भटका कुत्रा नोंदवा",
    quick_actions: "जलद कृती",
    your_pack: "तुमचे श्वान",
    add_dog: "श्वान जोडा",
    nav_home: "होम",
    nav_streetwatch: "स्ट्रीट वॉच",
    nav_health: "आरोग्य",
    nav_community: "समुदाय",
    nav_report: "तक्रार",
    act_report: "रिपोर्ट",
    act_map: "नकाशा",
    act_health: "आरोग्य",
    act_polls: "पोल",
  },
  te: {
    dashboard_welcome: "రోజువారీ సలహా",
    dashboard_insight: "ఈ రోజు హైడ్రేషన్ ముఖ్యం! 💧",
    dashboard_insight_desc: "ఎండలు ఎక్కువగా ఉన్నాయి, వీధి కుక్కల కోసం మంచినీటి గిన్నెలు ఉంచండి.",
    btn_view_score: "కమ్యూనిటీ స్కోర్",
    btn_report_stray: "నివేదిక",
    quick_actions: "త్వరిత చర్యలు",
    your_pack: "మీ కుక్కలు",
    add_dog: "కుక్కను జోడించండి",
    nav_home: "హోమ్",
    nav_streetwatch: "స్ట్రీట్ వాచ్",
    nav_health: "ఆరోగ్యం",
    nav_community: "కమ్యూనిటీ",
    nav_report: "రిపోర్ట్",
    act_report: "రిపోర్ట్",
    act_map: "మ్యాప్",
    act_health: "ఆరోగ్యం",
    act_polls: "పోల్స్",
  },
  ta: {
    dashboard_welcome: "தினசரி தகவல்",
    dashboard_insight: "இன்று தண்ணீர் குடிப்பது முக்கியம்! 💧",
    dashboard_insight_desc: "வெப்பநிலை அதிகமாக உள்ளதால், தெரு நாய்களுக்கு தண்ணீர் வைக்கவும்.",
    btn_view_score: "சமூக மதிப்பெண்",
    btn_report_stray: "தெரு நாய் அறிக்கை",
    quick_actions: "விரைவு செயல்கள்",
    your_pack: "உங்கள் நாய்கள்",
    add_dog: "நாய் சேர்",
    nav_home: "முகப்பு",
    nav_streetwatch: "ஸ்ட்ரீட் வாட்ச்",
    nav_health: "சுகாதாரம்",
    nav_community: "சமூகம்",
    nav_report: "புகார்",
    act_report: "புகார்",
    act_map: "வரைபடம்",
    act_health: "சுகாதாரம்",
    act_polls: "வாக்கெடுப்பு",
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string) => {
    return TRANSLATIONS[language][key] || TRANSLATIONS['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
