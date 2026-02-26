

export enum UserRole {
  CITIZEN = 'CITIZEN',
  VERIFIED_FEEDER = 'VERIFIED_FEEDER',
  VET = 'VET',
  ADMIN = 'ADMIN'
}

export enum DogType {
  PET = 'PET',
  STRAY = 'STRAY',
  COMMUNITY = 'COMMUNITY'
}

export type Language = 'en' | 'hi' | 'bn' | 'mr' | 'te' | 'ta';

export interface Reminder {
  id: string;
  title: string;
  date: string;
  completed: boolean;
  notes?: string;
  type?: 'VACCINE' | 'MEDICATION' | 'DEWORMING' | 'OTHER';
}

export interface MedicalRecord {
  id: string;
  imageUrl: string;
  date: string;
  description: string;
}

export interface Dog {
  id: string;
  name: string;
  breed: string;
  age: number;
  sex: 'Male' | 'Female' | 'Unknown';
  weight: number;
  type: DogType;
  imageUrl: string;
  isSterilized: boolean;
  microchipId?: string;
  location?: string; // e.g., "Main St. Colony"
  coordinates?: { lat: number; lng: number };
  personality: string[]; // e.g., "Friendly", "Shy", "Alpha"
  feeders?: string[]; // Names of verified feeders
  medicalHistory: string[];
  medicalRecords?: MedicalRecord[]; // Stored images of vet books
  reminders?: Reminder[];
  weeklyActivity?: { day: string; score: number }[];
}

export interface HealthLog {
  id: string;
  dogId: string;
  timestamp: string;
  appetite: number; // 1-10
  waterIntake: number; // 1-10
  energy: number; // 1-10
  painLevel: number; // 1-10
  stoolQuality: string;
  vomitCount: number;
  breathingDifficulty: boolean;
  isLimping: boolean;
  isItching: boolean;
  symptoms: string[];
  notes: string;
  aiAnalysis?: string;
  riskScore?: number; // 0-100
  urgencyLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
}

export interface IncidentReport {
  id: string;
  type: 'INJURY' | 'SICKNESS' | 'FIGHT' | 'MISSING' | 'NEW_STRAY' | 'ILLEGAL_RELOCATION' | 'CRIME';
  description: string;
  location: { lat: number; lng: number; address: string };
  timestamp: string;
  mediaUrls: string[];
  status: 'PENDING' | 'VERIFIED' | 'RESOLVED';
  aiAssessment?: string;
}

export interface KindnessMetric {
  laneName: string;
  score: number; // 0-100
  feedersCount: number;
  incidentCount: number;
  loveReactions: number;
}

export interface PollCandidate {
  id: string;
  dogId: string;
  name: string;
  votes: number;
  campaignSlogan?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // Emoji or Lucide icon name
  currentProgress: number;
  maxProgress: number;
  isUnlocked: boolean;
  type: 'STREAK' | 'KARMA' | 'MEDICAL' | 'FEEDING';
}

export interface AchievementContext {
  achievement: Achievement;
  userName: string;
  dogName?: string;
}

export enum AppealType {
  DONATION = 'DONATION',
  ADOPTION = 'ADOPTION',
  TRANSPORT = 'TRANSPORT',
  BLOOD = 'BLOOD',
  FOSTER = 'FOSTER',
  OTHER = 'OTHER'
}

export interface Appeal {
  id: string;
  feederName: string;
  type: AppealType;
  title: string;
  description: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  location: string;
  timestamp: string;
  status: 'OPEN' | 'FULFILLED';
}

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  zone: string;
  joinedDate: string;
  stats: {
    dogsFed: number;
    reportsSubmitted: number;
    karmaPoints: number;
  };
  feedingStreak: number; // Consecutive days
  lastProofDate: string | null; // ISO Date string
}

export type ViewState = 'DASHBOARD' | 'PROFILE' | 'HEALTH_LOG' | 'STREET_WATCH' | 'CRIME_REPORT' | 'COMMUNITY' | 'VET_BOOK' | 'ADD_DOG' | 'EDIT_DOG' | 'MEDICAL_HISTORY' | 'USER_PROFILE' | 'SOCIAL_GENERATOR' | 'FEEDING_PROOF';
