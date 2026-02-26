import React from 'react';
import { 
  Heart, 
  Activity, 
  MapPin, 
  AlertTriangle, 
  ShieldAlert, 
  Stethoscope, 
  Trophy, 
  Home, 
  Camera, 
  FileText,
  PawPrint 
} from 'lucide-react';

export const APP_NAME = "A PAWSOME WORLD";

export const AppLogo = () => (
  <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-lg flex items-center justify-center text-white shadow-sm transform -rotate-6">
    <PawPrint size={18} />
  </div>
);

export const NAV_ITEMS = [
  { id: 'DASHBOARD', label: 'Home', icon: <Home size={20} /> },
  { id: 'STREET_WATCH', label: 'StreetWatch', icon: <MapPin size={20} /> },
  { id: 'HEALTH_LOG', label: 'Health', icon: <Activity size={20} /> },
  { id: 'COMMUNITY', label: 'Community', icon: <Trophy size={20} /> },
  { id: 'CRIME_REPORT', label: 'Abuse Report', icon: <ShieldAlert size={20} /> },
];

export const SYMPTOMS_LIST = [
  "Coughing", "Sneezing", "Limping", "Scratching", "Whining", "Aggression", "Lethargy", "Pale Gums"
];

// Placeholder map style for StreetWatch
export const MAP_STYLE = {
  width: '100%',
  height: '400px',
  backgroundColor: '#e5e7eb',
  borderRadius: '0.75rem',
  position: 'relative' as const,
  overflow: 'hidden' as const
};