
import React from 'react';
import { Dog, ViewState, DogType, User, UserRole } from '../types';
import { Plus, Activity, AlertTriangle, Map, Heart, Sparkles, MapPin, Lock, Camera, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../i18n';

interface Props {
  dogs: Dog[];
  user: User;
  onSelectDog: (dog: Dog) => void;
  onNavigate: (view: ViewState) => void;
}

export const Dashboard: React.FC<Props> = ({ dogs, user, onSelectDog, onNavigate }) => {
  const { t } = useLanguage();
  const isCitizen = user.role === UserRole.CITIZEN;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Welcome with Role Context */}
      <div className={`relative overflow-hidden rounded-3xl p-8 text-white shadow-2xl transition-colors ${isCitizen ? 'bg-slate-800' : 'bg-gradient-to-br from-slate-900 to-slate-800'}`}>
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <Heart size={200} fill="white" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
             {isCitizen ? (
                <span className="bg-gray-600 text-gray-200 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Citizen View</span>
             ) : (
                <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                   <ShieldCheck size={10} /> Verified Feeder
                </span>
             )}
          </div>
          <h1 className="text-2xl font-bold mb-2 leading-tight">
             {isCitizen ? "Welcome, Neighbor! 👋" : t('dashboard_insight')}
          </h1>
          <p className="opacity-80 text-sm max-w-md mb-6">
             {isCitizen 
                ? "You have limited access. View neighborhood safety ratings and basic dog info. Unlock full Feeder access by caring for strays." 
                : t('dashboard_insight_desc')
             }
          </p>
          
          <div className="flex gap-3">
             <button 
                onClick={() => onNavigate('COMMUNITY')}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-lg text-xs font-bold transition-all border border-white/10"
             >
               {t('btn_view_score')}
             </button>
             <button 
                onClick={() => onNavigate('STREET_WATCH')}
                className="bg-paws-500 hover:bg-paws-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-lg shadow-paws-900/20"
             >
               {t('act_map')}
             </button>
          </div>
        </div>
      </div>

      {/* Proof Upload / Streak Widget */}
      <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10 text-orange-500">
             <Camera size={80} />
          </div>
          <div className="relative z-10">
             <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Camera size={20} className="text-orange-500" />
                {isCitizen ? 'Unlock Feeder Access' : 'Maintain Feeder Status'}
             </h2>
             <div className="mt-4 mb-2 flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
                <span>Current Streak: {user.feedingStreak} Days</span>
                <span>Target: {isCitizen ? '3 Days' : '7 Day Maintenance'}</span>
             </div>
             
             {/* Progress Bar */}
             <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-3 mb-4 overflow-hidden">
                <div 
                   className={`h-full rounded-full transition-all duration-1000 ${isCitizen ? 'bg-blue-500' : 'bg-green-500'}`}
                   style={{ width: `${Math.min((user.feedingStreak / (isCitizen ? 3 : 7)) * 100, 100)}%` }}
                ></div>
             </div>

             <button 
                onClick={() => onNavigate('FEEDING_PROOF')}
                className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-bold py-3 rounded-xl shadow-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
             >
                <Camera size={16} /> Upload Daily Feeding Proof
             </button>
             <p className="text-[10px] text-gray-400 text-center mt-3">
                {isCitizen 
                   ? "Upload photo of feeding strays for 3 consecutive days to get verified." 
                   : "Keep uploading at least once every 7 days to retain your badge."
                }
             </p>
          </div>
      </section>

      {/* Quick Grid */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100 transition-colors">{t('quick_actions')}</h2>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { id: 'CRIME_REPORT', label: t('act_report'), icon: <AlertTriangle size={20} />, bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', locked: false },
            { id: 'STREET_WATCH', label: t('act_map'), icon: <Map size={20} />, bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', locked: false },
            { id: 'HEALTH_LOG', label: t('act_health'), icon: <Activity size={20} />, bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', locked: false },
            { id: 'COMMUNITY', label: t('act_polls'), icon: <Heart size={20} />, bg: 'bg-pink-50 dark:bg-pink-900/30', text: 'text-pink-600 dark:text-pink-400', locked: false },
          ].map((item: any) => (
            <button 
              key={item.id}
              onClick={() => !item.locked && onNavigate(item.id)}
              className={`${item.bg} border ${item.locked ? 'border-gray-200 opacity-60 cursor-not-allowed' : 'border-transparent hover:scale-105 active:scale-95'} p-3 rounded-2xl flex flex-col items-center gap-2 transition-transform relative`}
            >
              <div className={`${item.text} bg-white dark:bg-slate-800 p-2.5 rounded-xl shadow-sm`}>
                {item.locked ? <Lock size={20} className="text-gray-400" /> : item.icon}
              </div>
              <span className={`font-bold text-[10px] ${item.text}`}>{item.label}</span>
              {item.locked && <div className="absolute inset-0 bg-gray-50/10 rounded-2xl"></div>}
            </button>
          ))}
        </div>
      </section>

      {/* My Dogs List */}
      <section>
        <div className="flex items-center justify-between mb-4">
           <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100 transition-colors">{t('your_pack')}</h2>
           <button 
             onClick={() => onNavigate('ADD_DOG')}
             className="text-paws-600 dark:text-paws-400 text-xs font-bold bg-paws-50 dark:bg-paws-900/30 px-3 py-1 rounded-full hover:bg-paws-100 dark:hover:bg-paws-900/50 transition-colors flex items-center gap-1"
           >
             <Plus size={14} /> {t('add_dog')}
           </button>
        </div>
        
        <div className="space-y-4">
          {dogs.map(dog => (
            <div 
              key={dog.id}
              onClick={() => {
                   onSelectDog(dog);
                   onNavigate('PROFILE');
              }}
              className={`bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-slate-700 flex items-center gap-5 transition-all group cursor-pointer hover:shadow-md`}
            >
              <div className="relative">
                <img 
                  src={dog.imageUrl} 
                  alt={dog.name} 
                  className="w-16 h-16 rounded-xl object-cover shadow-sm group-hover:scale-105 transition-transform"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=500';
                  }}
                />
                {dog.type === DogType.STRAY && (
                   <div className="absolute -bottom-2 -right-2 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white dark:border-slate-800">
                     STRAY
                   </div>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 transition-colors">{dog.name}</h3>
                  <div className="flex gap-1">
                     {dog.isSterilized && <span className="w-2 h-2 rounded-full bg-green-500" title="Sterilized"></span>}
                  </div>
                </div>
                <p className="text-sm text-gray-400 font-medium">{dog.breed} • {dog.age}y</p>
                {dog.location && (
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <MapPin size={10} /> {dog.location}
                  </p>
                )}
              </div>
              
              <div className="text-gray-300 dark:text-gray-600">
                <Activity size={20} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
