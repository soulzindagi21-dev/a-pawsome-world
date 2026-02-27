

import React, { useState, useEffect } from 'react';
import { ViewState, Dog, DogType, Achievement, AchievementContext, Appeal, AppealType, User, UserRole } from './types';
import { NAV_ITEMS, APP_NAME, AppLogo } from './constants';
import { DogProfile } from './components/DogProfile';
import { HealthTracker } from './components/HealthTracker';
import { StreetWatch } from './components/StreetWatch';
import { CrimeReporter } from './components/CrimeReporter';
import { CommunityHub } from './components/CommunityHub';
import { Dashboard } from './components/Dashboard';
import { AddDogForm } from './components/AddDogForm';
import { MedicalHistoryView } from './components/MedicalHistoryView';
import { UserProfile } from './components/UserProfile';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { SocialPostGenerator } from './components/SocialPostGenerator';
import { FeedingProofUpload } from './components/FeedingProofUpload';
import { LanguageProvider, useLanguage, LANGUAGES } from './i18n';
import { Menu, Bell, Plus, User as UserIcon, Globe, ClipboardList, Wifi, AlertCircle, X, LogOut, ShieldCheck, Lock, Loader2, Database } from 'lucide-react';
import { supabase } from './supabaseClient';

// Mock Data for Initial State (Fallback)
const MOCK_DOGS: Dog[] = [
  { 
    id: '1', 
    name: 'Motu', 
    breed: 'Golden Retriever', 
    age: 3, 
    sex: 'Male', 
    weight: 30, 
    type: DogType.PET, 
    isSterilized: true, 
    imageUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=500',
    location: 'Main St. Colony',
    coordinates: { lat: 19.0765, lng: 72.8780 }, // Example coords near Mumbai
    personality: ['Friendly', 'Loyal'],
    medicalHistory: ['Vaccinated 2023'],
    reminders: [
      { id: 'r1', title: 'Heartworm Pill', date: '2024-11-01', completed: false, notes: 'Give with dinner', type: 'MEDICATION' },
      { id: 'r2', title: 'Annual Checkup', date: '2024-12-15', completed: false, type: 'OTHER' }
    ],
    weeklyActivity: [
      { day: 'Mon', score: 8 },
      { day: 'Tue', score: 7 },
      { day: 'Wed', score: 9 },
      { day: 'Thu', score: 6 },
      { day: 'Fri', score: 8 },
      { day: 'Sat', score: 9 },
      { day: 'Sun', score: 9 },
    ]
  },
  { 
    id: '2', 
    name: 'Luna', 
    breed: 'Indie Mix', 
    age: 2, 
    sex: 'Female', 
    weight: 18, 
    type: DogType.STRAY, 
    isSterilized: true, 
    location: 'Baker St. Colony', 
    coordinates: { lat: 19.0755, lng: 72.8770 }, // Example coords near Mumbai
    imageUrl: 'https://images.unsplash.com/photo-1517423568366-eb9a69127c53?auto=format&fit=crop&q=80&w=500',
    personality: ['Smart', 'Alert'],
    medicalHistory: ['Sterilized 2023'],
    reminders: [
       { id: 'r3', title: 'Booster Shot', date: '2024-10-30', completed: false, type: 'VACCINE' }
    ],
    weeklyActivity: [
      { day: 'Mon', score: 6 },
      { day: 'Tue', score: 8 },
      { day: 'Wed', score: 7 },
      { day: 'Thu', score: 5 },
      { day: 'Fri', score: 8 },
      { day: 'Sat', score: 10 },
      { day: 'Sun', score: 4 },
    ]
  },
];

// Robust Error Message Extractor
const getFriendlyErrorMessage = (error: any): string => {
  console.error("Supabase Error Details:", error); 

  if (!error) return "Unknown error occurred";
  if (typeof error === 'string') return error;

  // Handle nested error objects (common in some libs)
  if (error.error && typeof error.error === 'object') {
    return getFriendlyErrorMessage(error.error);
  }

  // Handle native JS Error objects
  if (error instanceof Error) {
    return error.message;
  }

  // Supabase / Postgrest Standard Properties
  const message = error.message || error.msg || error.description || error.error_description;
  const details = error.details || error.hint;
  const code = error.code || error.statusCode || error.status;

  if (message) {
    let finalMsg = message;
    if (code) finalMsg = `[${code}] ${finalMsg}`;
    if (details) finalMsg += ` (${details})`;
    return finalMsg;
  }

  // Fallback to JSON stringify
  try {
    const jsonStr = JSON.stringify(error);
    if (jsonStr === '{}' || jsonStr === '[]') {
       return String(error);
    }
    return jsonStr;
  } catch (e) {
    return "Error object could not be parsed";
  }
};

const MainApp: React.FC<{ onLogout: () => void, initialUser: User, onUpdateUser: (u: User) => void }> = ({ onLogout, initialUser, onUpdateUser }) => {
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [selectedDog, setSelectedDog] = useState<Dog | null>(MOCK_DOGS[0]);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [notificationCount, setNotificationCount] = useState(2);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAppLoading, setIsAppLoading] = useState(true);
  
  // Achievement / Social Generator State
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  // Appeals State
  const [appeals, setAppeals] = useState<Appeal[]>([
    { 
      id: '1', 
      feederName: 'Alex Johnson', 
      type: AppealType.BLOOD, 
      title: 'Emergency: B-Negative Donor', 
      description: 'Stray dog hit by car at Market Circle. Needs immediate transfusion.', 
      urgency: 'CRITICAL', 
      location: 'City Vet Clinic', 
      timestamp: new Date().toISOString(), 
      status: 'OPEN' 
    }
  ]);
  
  // Supabase Tasks State
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  const { language, setLanguage, t } = useLanguage();

  // Dark Mode Effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentView, selectedDog]);

  // Role Management Logic (Demotion check)
  useEffect(() => {
     if (initialUser.role === UserRole.VERIFIED_FEEDER && initialUser.lastProofDate) {
        const lastDate = new Date(initialUser.lastProofDate).getTime();
        const diffDays = (Date.now() - lastDate) / (1000 * 60 * 60 * 24);
        
        // Revoke status if > 7 days inactive (Safety check: Ensure diffDays is valid and truly > 7)
        if (!isNaN(diffDays) && diffDays > 7) {
           alert("Feeder Status Revoked: No feeding proof uploaded in 7 days. You have been returned to Citizen View.");
           onUpdateUser({ ...initialUser, role: UserRole.CITIZEN, feedingStreak: 0 });
        }
     }
  }, []);

  // Fetch Tasks from Supabase
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
           setTasks([
              { id: 'demo-1', title: '💉 Free Anti-Rabies Drive - This Sunday', created_at: new Date().toISOString() },
              { id: 'demo-2', title: '🐕 New Feeder Registration Open', created_at: new Date(Date.now() - 86400000).toISOString() }
           ]);
        } else {
          setTasks(data || []);
        }
      } catch (err: any) {
        setTasks([
           { id: 'err-1', title: '⚠️ Offline Mode: Showing cached updates', created_at: new Date().toISOString() },
           { id: 'demo-1', title: '💉 Free Anti-Rabies Drive - This Sunday', created_at: new Date().toISOString() }
        ]);
      } finally {
        setLoadingTasks(false);
      }
    };

    fetchTasks();
  }, []);

  // Fetch Dogs from Supabase with Auto-Seed fallback
  useEffect(() => {
    const fetchDogs = async () => {
      setIsAppLoading(true);
      console.log("Connecting to Supabase Dogs table...");
      
      try {
        const { data, error } = await supabase.from('dogs').select('*');
        
        if (error) {
           if (error.message?.includes("Supabase not configured")) {
             console.log("Running in Demo/Offline Mode (Supabase not configured)");
           } else {
             console.warn("Supabase fetch error, falling back to mock data:", error);
           }
           setDogs(MOCK_DOGS);
           setSelectedDog(MOCK_DOGS[0]);
        } else if (data && data.length > 0) {
           console.log("Dogs loaded from cloud:", data.length);
           // Map snake_case DB columns to camelCase Typescript interface
           const mappedDogs: Dog[] = data.map((d: any) => {
             // Use image from DB, or fallback only if null/empty
             let rawImg = d.image_url || d.imageUrl;
             
             // Cleanup: If the database contains a 'blob:' URL (from previous session uploads), it is invalid now.
             // We treat it as null so the default logic kicks in.
             if (rawImg && typeof rawImg === 'string' && rawImg.startsWith('blob:')) {
                rawImg = null;
             }

             let safeImage = rawImg;
             
             // Specific defaults for known demo dogs if image is missing
             if (!safeImage) {
                 if (d.name === 'Motu') safeImage = 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=500';
                 else if (d.name === 'Luna') safeImage = 'https://images.unsplash.com/photo-1517423568366-eb9a69127c53?auto=format&fit=crop&q=80&w=500';
                 else safeImage = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=500';
             }
             
             // Safely handle potential nulls
             const safeId = d.id ? d.id.toString() : Math.random().toString();
             const safeAge = d.age !== null && d.age !== undefined ? Number(d.age) : 0;
             const safeWeight = d.weight !== null && d.weight !== undefined ? Number(d.weight) : 0;

             return {
                id: safeId,
                name: d.name || 'Unknown Dog',
                breed: d.breed || 'Unknown',
                age: safeAge,
                sex: d.sex,
                weight: safeWeight,
                type: d.type as DogType,
                imageUrl: safeImage,
                isSterilized: !!(d.is_sterilized || d.isSterilized),
                location: d.location,
                coordinates: d.coordinates,
                personality: d.personality || [],
                medicalHistory: d.medical_history || d.medicalHistory || [],
                reminders: d.reminders || [],
                feeders: d.feeders || [],
                medicalRecords: d.medical_records || d.medicalRecords || [], // CRITICAL FIX: Load medical_records
                weeklyActivity: d.weekly_activity || d.weeklyActivity || [
                  { day: 'Mon', score: 5 }, { day: 'Tue', score: 5 }, { day: 'Wed', score: 5 },
                  { day: 'Thu', score: 5 }, { day: 'Fri', score: 5 }, { day: 'Sat', score: 5 }, { day: 'Sun', score: 5 }
                ]
             };
           });
           setDogs(mappedDogs);
           if (mappedDogs.length > 0) setSelectedDog(mappedDogs[0]);
        } else {
           // Database is empty. Use mock data locally AND try to seed the DB.
           console.log("Database empty. Seeding mock data...");
           setDogs(MOCK_DOGS);
           setSelectedDog(MOCK_DOGS[0]);

           // Attempt to seed
           try {
             for (const dog of MOCK_DOGS) {
                await supabase.from('dogs').insert([{
                  name: dog.name,
                  breed: dog.breed,
                  age: dog.age,
                  sex: dog.sex,
                  weight: dog.weight,
                  type: dog.type,
                  image_url: dog.imageUrl,
                  is_sterilized: dog.isSterilized,
                  location: dog.location,
                  personality: dog.personality,
                  medical_history: dog.medicalHistory,
                  reminders: dog.reminders,
                  coordinates: dog.coordinates,
                  feeders: dog.feeders,
                  weekly_activity: dog.weeklyActivity,
                  medical_records: dog.medicalRecords || []
                }]);
             }
             console.log("Seeding complete.");
           } catch (seedError) {
             console.warn("Seeding failed (likely RLS or connection):", seedError);
           }
        }
      } catch (e) {
         console.warn("Using offline mode for dogs:", e);
         setDogs(MOCK_DOGS);
         setSelectedDog(MOCK_DOGS[0]);
      } finally {
        setIsAppLoading(false);
      }
    };
    
    fetchDogs();
  }, []);

  const handleAddDog = async (newDog: Dog) => {
    // 1. Optimistic Update
    const tempId = newDog.id;
    setDogs(prev => [...prev, newDog]);
    setCurrentView('DASHBOARD');

    // 2. Persist to Supabase
    try {
       const safeDog = {
          ...newDog,
          age: Number.isNaN(Number(newDog.age)) ? 0 : Number(newDog.age),
          weight: Number.isNaN(Number(newDog.weight)) ? 0 : Number(newDog.weight)
       };

       // Primary: Try snake_case (Standard Schema)
       const payloadSnake = {
          name: safeDog.name,
          breed: safeDog.breed,
          age: safeDog.age,
          sex: safeDog.sex,
          weight: safeDog.weight,
          type: safeDog.type,
          image_url: safeDog.imageUrl,
          is_sterilized: safeDog.isSterilized,
          location: safeDog.location,
          coordinates: safeDog.coordinates || null, 
          personality: safeDog.personality || [],
          medical_history: safeDog.medicalHistory || [],
          reminders: safeDog.reminders || [],
          feeders: safeDog.feeders || [],
          weekly_activity: safeDog.weeklyActivity || [],
          medical_records: safeDog.medicalRecords || [] // CRITICAL FIX: Save medicalRecords
       };

       let { data, error } = await supabase
         .from('dogs')
         .insert([payloadSnake])
         .select();

       // Fallback: Try camelCase if column not found
       if (error && (error.code === 'PGRST204' || error.code === '42703')) {
          console.warn("Database column mismatch. Retrying with camelCase...");
          const payloadCamel = {
             name: safeDog.name,
             breed: safeDog.breed,
             age: safeDog.age,
             sex: safeDog.sex,
             weight: safeDog.weight,
             type: safeDog.type,
             imageUrl: safeDog.imageUrl,
             isSterilized: safeDog.isSterilized,
             location: safeDog.location,
             coordinates: safeDog.coordinates || null,
             personality: safeDog.personality || [],
             medicalHistory: safeDog.medicalHistory || [],
             reminders: safeDog.reminders || [],
             feeders: safeDog.feeders || [],
             weeklyActivity: safeDog.weeklyActivity || [],
             medicalRecords: safeDog.medicalRecords || [] // CRITICAL FIX
          };
          const retry = await supabase.from('dogs').insert([payloadCamel]).select();
          data = retry.data;
          error = retry.error;
       }

       if (error) throw error;

       // 3. Update local state with REAL ID from database
       if (data && data.length > 0) {
          const realId = data[0].id ? data[0].id.toString() : tempId;
          setDogs(prev => prev.map(d => d.id === tempId ? { ...d, id: realId } : d));
       }

    } catch (e: any) {
       console.error("Failed to save dog to cloud:", e);
       const errMsg = getFriendlyErrorMessage(e);
       alert(`Failed to save to database: ${errMsg}`);
       // Revert optimistic update
       setDogs(prev => prev.filter(d => d.id !== tempId));
    }
  };

  const handleUpdateDog = async (updatedDog: Dog) => {
    // Optimistic Update
    setDogs(prev => prev.map(d => d.id === updatedDog.id ? updatedDog : d));
    if (selectedDog?.id === updatedDog.id) setSelectedDog(updatedDog);

    // Update in Supabase
    try {
       // Ensure numbers are numbers and not strings from input fields
       const safeDog = {
          ...updatedDog,
          age: Number.isNaN(Number(updatedDog.age)) ? 0 : Number(updatedDog.age),
          weight: Number.isNaN(Number(updatedDog.weight)) ? 0 : Number(updatedDog.weight)
       };

       const payloadSnake = {
          name: safeDog.name,
          breed: safeDog.breed,
          age: safeDog.age,
          sex: safeDog.sex,
          weight: safeDog.weight,
          type: safeDog.type,
          image_url: safeDog.imageUrl,
          is_sterilized: safeDog.isSterilized,
          location: safeDog.location,
          coordinates: safeDog.coordinates || null,
          personality: safeDog.personality || [],
          medical_history: safeDog.medicalHistory || [],
          reminders: safeDog.reminders || [],
          feeders: safeDog.feeders || [],
          weekly_activity: safeDog.weeklyActivity || [],
          medical_records: safeDog.medicalRecords || [] // CRITICAL FIX: Update medicalRecords
       };

       let { data, error } = await supabase.from('dogs').update(payloadSnake).eq('id', safeDog.id).select();

       // Fallback: Try camelCase
       if (error && (error.code === 'PGRST204' || error.code === '42703')) {
          console.warn("Update failed (column mismatch), retrying with camelCase...");
          const payloadCamel = {
             name: safeDog.name,
             breed: safeDog.breed,
             age: safeDog.age,
             sex: safeDog.sex,
             weight: safeDog.weight,
             type: safeDog.type,
             imageUrl: safeDog.imageUrl,
             isSterilized: safeDog.isSterilized,
             location: safeDog.location,
             coordinates: safeDog.coordinates || null,
             personality: safeDog.personality || [],
             medicalHistory: safeDog.medicalHistory || [],
             reminders: safeDog.reminders || [],
             feeders: safeDog.feeders || [],
             weeklyActivity: safeDog.weeklyActivity || [],
             medicalRecords: safeDog.medicalRecords || [] // CRITICAL FIX
          };
          const retry = await supabase.from('dogs').update(payloadCamel).eq('id', safeDog.id).select();
          data = retry.data;
          error = retry.error;
       }

       if (error) throw error;
       
       if (data && data.length === 0) {
         console.warn("Update operation completed but no rows were modified. Possible ID mismatch.", safeDog.id);
       }

    } catch (e: any) {
       console.error("Failed to update dog in cloud", e);
       const errMsg = getFriendlyErrorMessage(e);
       alert(`Failed to update database: ${errMsg}`);
    }
  };

  const handleDeleteDog = async (dogId: string) => {
     // 1. Optimistic Update: Remove locally and navigate home
     setDogs(prev => prev.filter(d => d.id !== dogId));
     setSelectedDog(null);
     setCurrentView('DASHBOARD');

     // 2. Delete from Supabase
     try {
        const { error } = await supabase.from('dogs').delete().eq('id', dogId);
        if (error) throw error;
     } catch (e: any) {
        console.error("Failed to delete dog:", e);
        const errMsg = getFriendlyErrorMessage(e);
        alert(`Failed to delete from database: ${errMsg}. Please refresh the page.`);
     }
  };

  const handleAddAppeal = (newAppeal: Appeal) => {
    setAppeals([newAppeal, ...appeals]);
    setCurrentView('COMMUNITY');
  };

  const handleProofSuccess = () => {
     const newStreak = initialUser.feedingStreak + 1;
     let newRole = initialUser.role;

     // Promotion Logic
     if (initialUser.role === UserRole.CITIZEN && newStreak >= 3) {
        alert("Congratulations! You've uploaded 3 days of proof. You are now a Verified Feeder!");
        newRole = UserRole.VERIFIED_FEEDER;
     }

     onUpdateUser({
        ...initialUser,
        feedingStreak: newStreak,
        role: newRole,
        lastProofDate: new Date().toISOString()
     });
     setCurrentView('DASHBOARD');
  };

  const renderView = () => {
    switch (currentView) {
      case 'DASHBOARD':
        return <Dashboard 
                  dogs={dogs} 
                  user={initialUser}
                  onSelectDog={setSelectedDog} 
                  onNavigate={setCurrentView} 
               />;
      case 'PROFILE':
        return initialUser.role !== UserRole.CITIZEN && selectedDog ? 
          <DogProfile 
            dog={selectedDog} 
            onUpdateDog={handleUpdateDog}
            onDelete={() => handleDeleteDog(selectedDog.id)}
            onBack={() => setCurrentView('DASHBOARD')} 
            onEdit={() => setCurrentView('EDIT_DOG')}
            onViewHistory={() => setCurrentView('MEDICAL_HISTORY')}
            onCheckHealth={() => setCurrentView('HEALTH_LOG')}
          /> : 
          <Dashboard dogs={dogs} user={initialUser} onSelectDog={setSelectedDog} onNavigate={setCurrentView} />;
      case 'HEALTH_LOG':
        return <HealthTracker 
                  dog={selectedDog || dogs[0]} 
                  allDogs={dogs}
                  onSelectDog={setSelectedDog}
                  onUpdateDog={handleUpdateDog}
                  onBack={() => setCurrentView('DASHBOARD')} 
               />;
      case 'STREET_WATCH':
        return <StreetWatch dogs={dogs} />;
      case 'CRIME_REPORT':
        return <CrimeReporter onBack={() => setCurrentView('DASHBOARD')} />;
      case 'COMMUNITY':
        return <CommunityHub 
                  appeals={appeals}
                  onSelectAchievement={(ach) => {
                     setSelectedAchievement(ach);
                     setCurrentView('SOCIAL_GENERATOR');
                  }}
               />;
      case 'ADD_DOG':
        return initialUser.role !== UserRole.CITIZEN ? <AddDogForm onBack={() => setCurrentView('DASHBOARD')} onSave={handleAddDog} /> : <Dashboard dogs={dogs} user={initialUser} onSelectDog={setSelectedDog} onNavigate={setCurrentView} />;
      case 'EDIT_DOG':
        return <AddDogForm 
                  initialData={selectedDog}
                  onBack={() => setCurrentView('PROFILE')} 
                  onSave={(dog) => { handleUpdateDog(dog); setCurrentView('PROFILE'); }} 
                />;
      case 'MEDICAL_HISTORY':
        return selectedDog ? 
          <MedicalHistoryView 
            dog={selectedDog} 
            onBack={() => setCurrentView('PROFILE')} 
          /> :
          <Dashboard dogs={dogs} user={initialUser} onSelectDog={setSelectedDog} onNavigate={setCurrentView} />;
      case 'USER_PROFILE':
        return <UserProfile
                  user={initialUser}
                  onBack={() => setCurrentView('DASHBOARD')}
                  onLogout={onLogout}
                  onAddAppeal={handleAddAppeal}
               />;
      case 'SOCIAL_GENERATOR':
        return selectedAchievement ? (
           <SocialPostGenerator 
              context={{ achievement: selectedAchievement, userName: initialUser.name }}
              onBack={() => setCurrentView('COMMUNITY')}
           />
        ) : <CommunityHub appeals={appeals} />;
      case 'FEEDING_PROOF':
        return <FeedingProofUpload onBack={() => setCurrentView('DASHBOARD')} onSuccess={handleProofSuccess} />;
      default:
        return <Dashboard dogs={dogs} user={initialUser} onSelectDog={setSelectedDog} onNavigate={setCurrentView} />;
    }
  };

  const getTranslatedNavLabel = (id: string) => {
    switch(id) {
      case 'DASHBOARD': return t('nav_home');
      case 'STREET_WATCH': return t('nav_streetwatch');
      case 'HEALTH_LOG': return t('nav_health');
      case 'COMMUNITY': return t('nav_community');
      case 'CRIME_REPORT': return t('nav_report');
      default: return '';
    }
  };

  const isCitizen = initialUser.role === UserRole.CITIZEN;

  if (isAppLoading) {
     return (
        <div className="min-h-screen bg-white dark:bg-slate-900 flex flex-col items-center justify-center text-center p-6">
           <div className="relative mb-6">
              <div className="absolute inset-0 bg-teal-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
              <div className="relative bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl">
                 <AppLogo />
              </div>
           </div>
           <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mb-2">Connecting to PawCloud</h2>
           <p className="text-slate-500 text-sm flex items-center gap-2">
              <Loader2 className="animate-spin" size={14} /> Synchronizing Database...
           </p>
        </div>
     );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col font-sans text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-white dark:bg-slate-900 flex flex-col animate-fade-in md:hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <AppLogo />
              <span className="text-xl font-extrabold text-slate-800 dark:text-white">{APP_NAME}</span>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 bg-gray-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-800 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id as ViewState);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full p-4 rounded-xl flex items-center gap-4 transition-all ${
                  currentView === item.id 
                    ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-bold' 
                    : 'text-slate-600 dark:text-slate-400 font-medium hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="scale-110">{item.icon}</div>
                <span className="text-lg">{getTranslatedNavLabel(item.id)}</span>
              </button>
            ))}

            <div className="my-6 border-t border-gray-100 dark:border-slate-800"></div>

            <button
              onClick={() => {
                setCurrentView('USER_PROFILE');
                setIsMobileMenuOpen(false);
              }}
              className="w-full p-4 rounded-xl flex items-center gap-4 text-slate-600 dark:text-slate-400 font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              <UserIcon size={24} />
              <span className="text-lg">My Profile</span>
            </button>
          </div>

          <div className="p-6 border-t border-gray-100 dark:border-slate-800">
            <button 
              onClick={onLogout}
              className="w-full py-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-extrabold rounded-2xl flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
            >
              <LogOut size={20} /> Log Out
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white dark:bg-slate-800 shadow-sm sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full md:hidden transition-colors"
            >
              <Menu size={24} className="text-gray-600 dark:text-gray-300" />
            </button>
            <div className="flex items-center gap-2">
              <AppLogo />
              <span className="text-xl font-extrabold bg-gradient-to-r from-teal-600 to-emerald-500 bg-clip-text text-transparent hidden sm:block">
                {APP_NAME}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${initialUser.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700 border-purple-200' : isCitizen ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                {initialUser.role.replace('_', ' ')}
            </div>

            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`relative w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none shadow-inner ${
                isDarkMode ? 'bg-slate-700' : 'bg-sky-200'
              }`}
            >
              <div 
                className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center text-sm ${
                  isDarkMode ? 'translate-x-6' : 'translate-x-0'
                }`}
              >
                {isDarkMode ? '💤' : '🐕'}
              </div>
            </button>

            <button 
              className="relative p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
              onClick={() => setNotificationCount(0)}
            >
              <Bell size={24} className="text-gray-600 dark:text-gray-300" />
              {notificationCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                  {notificationCount}
                </span>
              )}
            </button>
            <div 
              className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center border border-indigo-200 dark:border-indigo-800 cursor-pointer hover:bg-indigo-200 transition-colors"
              onClick={() => setCurrentView('USER_PROFILE')}
              title="View Profile"
            >
              <UserIcon size={18} className="text-indigo-600 dark:text-indigo-300" />
            </div>

            <button 
              onClick={onLogout}
              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 rounded-full transition-colors hidden sm:flex"
              title="Log Out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 pb-24 md:pb-8">
        {renderView()}

        {/* Supabase Widget */}
        {currentView === 'DASHBOARD' && (
          <div className="mt-8 bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
                <div className="bg-teal-100 dark:bg-teal-900/50 p-2 rounded-lg text-teal-600 dark:text-teal-400">
                  <Database size={18} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Cloud Sync Active</h3>
                  <p className="text-[10px] text-slate-400">Connected to Supabase {isAppLoading ? '(Syncing...)' : '• Live'}</p>
                </div>
            </div>
             <div className="space-y-2">
                 <div className="text-sm bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                       {tasks.length > 0 ? tasks[0].title : 'System: All services operational.'}
                    </span>
                 </div>
             </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 pb-safe z-40 transition-colors duration-300">
        <div className="flex justify-around items-center h-16">
          {NAV_ITEMS.map((item) => {
            const isAbuse = item.id === 'CRIME_REPORT';
            const isActive = currentView === item.id;
            const isRestricted = false;
            
            return (
              <button
                key={item.id}
                onClick={() => !isRestricted && setCurrentView(item.id as ViewState)}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                   isRestricted ? 'opacity-40 cursor-not-allowed' : ''
                } ${
                  isAbuse 
                    ? (isActive ? 'text-red-600' : 'text-red-500 dark:text-red-400')
                    : (isActive ? 'text-teal-600 dark:text-teal-400' : 'text-gray-400 dark:text-gray-500')
                }`}
              >
                {isRestricted ? <div className="relative">{item.icon}<div className="absolute -top-1 -right-1 bg-gray-200 rounded-full p-[1px]"><Lock size={8} /></div></div> : item.icon}
                <span className="text-[10px] font-medium truncate w-16 text-center">{getTranslatedNavLabel(item.id)}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Single source of truth: onAuthStateChange handles all session state.
  // No getSession() call — avoids the race condition where getSession()
  // returns null before Supabase finishes parsing OAuth URL tokens.
  useEffect(() => {
    let mounted = true;
    let currentFetchId = 0; // Invalidates stale profile fetches on rapid auth events

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;

        if (session?.user) {
          const fetchId = ++currentFetchId;

          try {
            const { data: profileData } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single();

            // Bail if component unmounted or a newer auth event superseded this one
            if (!mounted || fetchId !== currentFetchId) return;

            if (profileData) {
              setUser({
                id: profileData.id,
                name: profileData.name,
                username: profileData.username,
                role: profileData.role,
                zone: profileData.zone || profileData.location,
                joinedDate: profileData.joined_date || profileData.created_at,
                stats: profileData.stats || { dogsFed: 0, reportsSubmitted: 0, karmaPoints: 0 },
                feedingStreak: profileData.feeding_streak || 0,
                lastProofDate: profileData.last_proof_date || null
              });
            } else {
              const meta = session.user.user_metadata;
              setUser({
                id: session.user.id,
                name: meta?.name || 'User',
                username: meta?.username || session.user.email?.split('@')[0] || 'user',
                role: meta?.role || UserRole.CITIZEN,
                zone: meta?.zone || meta?.location || 'Unknown Zone',
                joinedDate: session.user.created_at.split('T')[0],
                stats: { dogsFed: 0, reportsSubmitted: 0, karmaPoints: 0 },
                feedingStreak: 0,
                lastProofDate: null
              });
            }
          } catch (err) {
            if (!mounted || fetchId !== currentFetchId) return;
            console.error("Profile fetch error:", err);
            // Fallback to auth metadata so the user isn't locked out
            const meta = session.user.user_metadata;
            setUser({
              id: session.user.id,
              name: meta?.name || 'User',
              username: meta?.username || session.user.email?.split('@')[0] || 'user',
              role: meta?.role || UserRole.CITIZEN,
              zone: meta?.zone || meta?.location || 'Unknown Zone',
              joinedDate: session.user.created_at.split('T')[0],
              stats: { dogsFed: 0, reportsSubmitted: 0, karmaPoints: 0 },
              feedingStreak: 0,
              lastProofDate: null
            });
          }
        } else {
          currentFetchId++; // Invalidate any in-flight profile fetches
          setUser(null);
        }

        // Release loading screen only after the first auth event fully resolves
        // (including the async profile fetch above).
        if (mounted) setIsAuthLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Expose toggle to Login component via window hack
  useEffect(() => {
    (window as any).toggleRegister = () => setIsRegistering(true);
    return () => { delete (window as any).toggleRegister; };
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (err) {
      console.error("Logout error:", err);
      // Even if Supabase fails, clear local state
      setUser(null);
    }
  };

  const handleLogin = async (username: string, password?: string, roleOverride?: UserRole) => {
    if (roleOverride) {
      // Mock login for admin — no Supabase event, so set user directly
      setUser({
        id: 'mock-admin',
        name: 'Administrator',
        username: 'admin',
        role: roleOverride,
        zone: 'Global',
        joinedDate: new Date().toISOString().split('T')[0],
        stats: { dogsFed: 0, reportsSubmitted: 0, karmaPoints: 0 },
        feedingStreak: 0,
        lastProofDate: null
      });
      return;
    }

    // Only authenticate — onAuthStateChange listener handles profile fetch + setUser
    const email = username.includes('@') ? username : `${username}@example.com`;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: password || 'defaultpassword'
    });

    if (error) throw error;
  };

  const handleRegister = async (userData: any) => {
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          name: userData.name,
          username: userData.username,
          location: userData.zone,
          role: userData.role
        }
      }
    });

    if (error) throw error;

    // If Supabase returned a session, onAuthStateChange handles setUser.
    // If no session (email confirmation required), set user from signup data directly.
    if (!data.session && data.user) {
      const meta = data.user.user_metadata;
      setUser({
        id: data.user.id,
        name: meta.name || userData.name,
        username: meta.username || userData.username,
        role: meta.role || userData.role,
        zone: meta.zone || meta.location || userData.zone,
        joinedDate: data.user.created_at ? data.user.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
        stats: { dogsFed: 0, reportsSubmitted: 0, karmaPoints: 0 },
        feedingStreak: 0,
        lastProofDate: null
      });
    }

    setIsRegistering(false);
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-teal-600 mb-4" size={48} />
        <p className="text-[#8B5E3C] font-bold animate-pulse">Verifying Session...</p>
      </div>
    );
  }

  if (!user) {
    if (isRegistering) {
      return <Register onRegister={handleRegister} onBackToLogin={() => setIsRegistering(false)} />;
    }
    return <Login onLogin={handleLogin} />;
  }

  return (
    <LanguageProvider>
      <MainApp 
        onLogout={handleLogout} 
        initialUser={user} 
        onUpdateUser={setUser} 
      />
    </LanguageProvider>
  );
};

export default App;
