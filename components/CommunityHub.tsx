
import React, { useState, useEffect } from 'react';
import { Trophy, Heart, TrendingUp, Award, ThumbsUp, Flame, Lock, Unlock, HeartHandshake, MapPin, Clock, AlertCircle } from 'lucide-react';
import { generatePollCandidates } from '../geminiService';
import { Achievement, Appeal, AppealType } from '../types';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const KINDNESS_DATA = [
  { name: 'Lane 1', score: 85 },
  { name: 'Lane 2', score: 65 },
  { name: 'Lane 3', score: 92 },
  { name: 'Market', score: 45 },
];

// Mock Achievements Data
const ACHIEVEMENTS: Achievement[] = [
  { id: '1', title: 'Consistent Feeder', description: 'Fed dogs for 7 days in a row', icon: '🥘', currentProgress: 7, maxProgress: 7, isUnlocked: true, type: 'STREAK' },
  { id: '2', title: 'Community Hero', description: 'Earned 500 Karma Points', icon: '🦸', currentProgress: 350, maxProgress: 500, isUnlocked: false, type: 'KARMA' },
  { id: '3', title: 'Guardian Angel', description: 'Sponsored 1 Sterilization', icon: '🏥', currentProgress: 1, maxProgress: 1, isUnlocked: true, type: 'MEDICAL' },
  { id: '4', title: 'Pack Leader', description: 'Verified 10 Community Dogs', icon: '🐕', currentProgress: 4, maxProgress: 10, isUnlocked: false, type: 'FEEDING' },
];

interface Props {
  onSelectAchievement?: (achievement: Achievement) => void;
  appeals?: Appeal[];
}

export const CommunityHub: React.FC<Props> = ({ onSelectAchievement, appeals = [] }) => {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loadingPoll, setLoadingPoll] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(12); // Mock streak

  useEffect(() => {
    const loadCandidates = async () => {
      setLoadingPoll(true);
      const result = await generatePollCandidates("friendly neighborhood, mostly Indies, lots of kids");
      if (!result || result.length === 0) {
        setCandidates([
          { name: "Captain Wags", breed: "Indie", slogan: "Free belly rubs for all!" },
          { name: "Princess Biscuit", breed: "Beagle Mix", slogan: "No crumb left behind." },
          { name: "Sheriff Bruno", breed: "German Shepherd", slogan: "Keeping the lane safe." }
        ]);
      } else {
        setCandidates(result);
      }
      setLoadingPoll(false);
    };
    loadCandidates();
  }, []);

  // Find next locked achievement for countdown
  const nextGoal = ACHIEVEMENTS.find(a => !a.isUnlocked) || ACHIEVEMENTS[0];

  const getUrgencyColor = (u: string) => {
     switch(u) {
        case 'CRITICAL': return 'bg-red-100 text-red-700 border-red-200';
        case 'HIGH': return 'bg-orange-100 text-orange-700 border-orange-200';
        case 'MEDIUM': return 'bg-blue-100 text-blue-700 border-blue-200';
        default: return 'bg-green-100 text-green-700 border-green-200';
     }
  };

  const getTypeIcon = (t: string) => {
     switch(t) {
        case 'BLOOD': return '🩸';
        case 'DONATION': return '💰';
        case 'TRANSPORT': return '🚗';
        default: return '🤝';
     }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      
      {/* Gamification Dashboard */}
      <section className="grid grid-cols-2 gap-4">
          {/* Streak Card */}
          <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-3xl p-6 text-white shadow-lg shadow-orange-200 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-20">
                <Flame size={100} />
             </div>
             <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1 opacity-90">
                   <Flame size={18} fill="white" />
                   <span className="text-xs font-bold uppercase tracking-wider">Feeding Streak</span>
                </div>
                <h2 className="text-4xl font-extrabold">{currentStreak} <span className="text-lg font-medium">Days</span></h2>
                <p className="text-[10px] mt-2 bg-white/20 inline-block px-2 py-1 rounded-lg backdrop-blur-sm">
                   Next milestone: 14 Days
                </p>
             </div>
          </div>

          {/* Next Goal Countdown */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-center">
             <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Next Goal</span>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{nextGoal.type}</span>
             </div>
             <h3 className="font-bold text-slate-800 leading-tight mb-3">{nextGoal.title}</h3>
             
             {/* Progress Bar */}
             <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2 overflow-hidden">
                <div 
                   className="bg-blue-500 h-2.5 rounded-full transition-all duration-1000" 
                   style={{ width: `${(nextGoal.currentProgress / nextGoal.maxProgress) * 100}%` }}
                ></div>
             </div>
             <div className="flex justify-between text-[10px] text-gray-500 font-medium">
                <span>{nextGoal.currentProgress}</span>
                <span>{nextGoal.maxProgress} (Target)</span>
             </div>
          </div>
      </section>

      {/* Community Appeals Board */}
      <section>
         <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
               <HeartHandshake size={20} className="text-rose-500" /> Community Appeals
            </h3>
            <span className="text-xs font-bold bg-rose-50 text-rose-600 px-2 py-1 rounded-full">{appeals.length} Active</span>
         </div>
         
         {appeals.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-400 text-sm">
               No active appeals right now.
            </div>
         ) : (
            <div className="space-y-3">
               {appeals.map(appeal => (
                  <div key={appeal.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative overflow-hidden group hover:border-rose-200 transition-colors">
                     {/* Urgency Stripe */}
                     <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                        appeal.urgency === 'CRITICAL' ? 'bg-red-500' : 
                        appeal.urgency === 'HIGH' ? 'bg-orange-500' : 'bg-blue-400'
                     }`}></div>
                     
                     <div className="pl-3">
                        <div className="flex justify-between items-start mb-2">
                           <div className="flex items-center gap-2">
                              <span className="text-lg" role="img">{getTypeIcon(appeal.type)}</span>
                              <span className="font-bold text-slate-800 text-sm">{appeal.title}</span>
                           </div>
                           <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getUrgencyColor(appeal.urgency)}`}>
                              {appeal.urgency}
                           </span>
                        </div>
                        
                        <p className="text-xs text-slate-600 mb-3 leading-relaxed">{appeal.description}</p>
                        
                        <div className="flex items-center justify-between text-[10px] text-gray-400">
                           <div className="flex gap-3">
                              <span className="flex items-center gap-1"><MapPin size={10} /> {appeal.location}</span>
                              <span className="flex items-center gap-1"><Clock size={10} /> {new Date(appeal.timestamp).toLocaleDateString()}</span>
                           </div>
                           <span className="font-bold text-slate-500">by {appeal.feederName}</span>
                        </div>
                        
                        <button className="w-full mt-3 py-2 bg-slate-50 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-800 hover:text-white transition-colors">
                           Extend Help
                        </button>
                     </div>
                  </div>
               ))}
            </div>
         )}
      </section>

      {/* Trophy Case (Achievements) */}
      <section>
         <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Trophy size={20} className="text-yellow-500" /> Trophy Case
         </h3>
         <div className="grid grid-cols-2 gap-3">
            {ACHIEVEMENTS.map(ach => (
               <div 
                 key={ach.id}
                 onClick={() => ach.isUnlocked && onSelectAchievement && onSelectAchievement(ach)}
                 className={`relative p-4 rounded-2xl border transition-all ${
                    ach.isUnlocked 
                    ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-amber-200 cursor-pointer hover:shadow-md hover:scale-[1.02]' 
                    : 'bg-gray-50 border-gray-100 opacity-70 grayscale'
                 }`}
               >
                  <div className="flex justify-between items-start mb-2">
                     <span className="text-2xl" role="img" aria-label="icon">{ach.icon}</span>
                     {ach.isUnlocked ? <Unlock size={14} className="text-amber-400" /> : <Lock size={14} className="text-gray-400" />}
                  </div>
                  <h4 className={`font-bold text-sm leading-tight ${ach.isUnlocked ? 'text-amber-900' : 'text-gray-600'}`}>
                     {ach.title}
                  </h4>
                  <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">{ach.description}</p>
                  
                  {ach.isUnlocked && (
                     <div className="mt-3 text-[10px] font-bold text-amber-600 flex items-center gap-1">
                        Click to Share <Award size={10} />
                     </div>
                  )}
               </div>
            ))}
         </div>
      </section>

      {/* Kindness Quotient Header */}
      <div className="relative overflow-hidden bg-slate-900 rounded-3xl p-8 text-white shadow-xl shadow-slate-200">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Heart size={150} fill="currentColor" />
        </div>
        <div className="relative z-10">
            <div className="flex justify-between items-start mb-2">
                <div>
                   <h2 className="text-sm font-bold opacity-80 uppercase tracking-wider">Your Lane's Kindness Score</h2>
                   <h1 className="text-5xl font-extrabold mb-1">92<span className="text-2xl opacity-60">/100</span></h1>
                </div>
                <div className="bg-white/10 backdrop-blur-md p-2 rounded-lg">
                   <TrendingUp size={24} />
                </div>
            </div>
            <p className="font-semibold text-emerald-400">Status: Excellent Sanctuary 🌟</p>
        </div>
      </div>

      {/* Leaderboard Chart */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Award size={20} className="text-purple-500" />
          Neighborhood Rankings
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={KINDNESS_DATA} layout="vertical" barGap={4}>
              <XAxis type="number" hide />
              <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
              <Bar dataKey="score" fill="#a855f7" radius={[0, 4, 4, 0]} barSize={24} background={{ fill: '#f3e8ff' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Most Loved Pup Poll */}
      <div className="bg-amber-50 rounded-3xl shadow-sm border border-amber-100 p-6 relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-100 rounded-full blur-2xl"></div>
        
        <div className="flex items-center gap-3 mb-6 relative z-10">
           <div className="bg-amber-100 p-2 rounded-full text-amber-600">
              <Trophy size={20} />
           </div>
           <div>
             <h2 className="font-bold text-amber-950">Poll: Most Loved Pup</h2>
             <p className="text-xs text-amber-700">AI-Nominated based on engagement</p>
           </div>
        </div>

        {loadingPoll ? (
          <div className="text-center py-12 text-amber-600 text-sm animate-pulse">Scanning tail wags...</div>
        ) : (
          <div className="space-y-4 relative z-10">
            {candidates.map((c, idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-amber-100 flex items-center justify-between group hover:shadow-md transition-all">
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg">🐶</div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{c.name}</h4>
                    <p className="text-[10px] text-gray-500 italic">"{c.slogan}"</p>
                  </div>
                </div>
                <button className="bg-amber-50 text-amber-600 p-2 rounded-full hover:bg-amber-500 hover:text-white transition-all">
                  <ThumbsUp size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
