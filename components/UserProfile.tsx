
import React, { useState } from 'react';
import { ArrowLeft, LogOut, MapPin, User, Settings, Shield, Bell, HeartHandshake, X } from 'lucide-react';
import { Appeal, AppealType } from '../types';

interface Props {
  onBack: () => void;
  onLogout: () => void;
  onAddAppeal?: (appeal: Appeal) => void;
}

export const UserProfile: React.FC<Props> = ({ onBack, onLogout, onAddAppeal }) => {
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [appealData, setAppealData] = useState({
    type: AppealType.DONATION,
    title: '',
    description: '',
    urgency: 'MEDIUM',
    location: ''
  });

  // Mock user data
  const user = {
    name: "Alex Johnson",
    role: "Verified Feeder",
    zone: "Baker Street, Lane 4",
    joined: "March 2023",
    stats: {
      dogsFed: 12,
      reportsSubmitted: 5,
      karmaPoints: 850
    }
  };

  const handleSubmitAppeal = () => {
    if(!appealData.title || !appealData.description || !onAddAppeal) return;

    const newAppeal: Appeal = {
      id: Date.now().toString(),
      feederName: user.name,
      type: appealData.type as AppealType,
      title: appealData.title,
      description: appealData.description,
      urgency: appealData.urgency as any,
      location: appealData.location || user.zone,
      timestamp: new Date().toISOString(),
      status: 'OPEN'
    };

    onAddAppeal(newAppeal);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
       {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft size={20} className="mr-1" /> Back
        </button>
        <h1 className="text-lg font-bold text-slate-800">My Profile</h1>
        <div className="w-9"></div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col items-center text-center">
         <div className="w-24 h-24 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-full flex items-center justify-center text-white mb-4 shadow-lg shadow-teal-100">
            <span className="text-3xl font-bold">{user.name.charAt(0)}</span>
         </div>
         <h2 className="text-2xl font-extrabold text-slate-800">{user.name}</h2>
         <div className="flex items-center gap-2 text-teal-600 font-bold text-sm mt-1 bg-teal-50 px-3 py-1 rounded-full border border-teal-100">
            <Shield size={14} /> {user.role}
         </div>
         <p className="text-gray-400 text-sm mt-2 flex items-center gap-1">
            <MapPin size={12} /> {user.zone}
         </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
         <div className="bg-orange-50 p-4 rounded-2xl text-center border border-orange-100">
            <div className="text-2xl font-bold text-orange-600">{user.stats.dogsFed}</div>
            <div className="text-[10px] font-bold text-orange-800 uppercase tracking-wide">Dogs Fed</div>
         </div>
         <div className="bg-blue-50 p-4 rounded-2xl text-center border border-blue-100">
            <div className="text-2xl font-bold text-blue-600">{user.stats.reportsSubmitted}</div>
            <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wide">Reports</div>
         </div>
         <div className="bg-purple-50 p-4 rounded-2xl text-center border border-purple-100">
            <div className="text-2xl font-bold text-purple-600">{user.stats.karmaPoints}</div>
            <div className="text-[10px] font-bold text-purple-800 uppercase tracking-wide">Karma</div>
         </div>
      </div>
      
      {/* Create Appeal Section */}
      <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl p-6 border border-pink-100 shadow-sm">
         <div className="flex items-center justify-between mb-2">
            <div>
               <h3 className="font-bold text-rose-800 flex items-center gap-2">
                  <HeartHandshake size={20} /> Request Help
               </h3>
               <p className="text-xs text-rose-600">Need support for adoption, blood, or transport?</p>
            </div>
            <button 
               onClick={() => setShowAppealForm(true)}
               className="bg-white text-rose-600 font-bold text-xs px-4 py-2 rounded-full shadow-sm hover:bg-rose-600 hover:text-white transition-colors"
            >
               Create Appeal
            </button>
         </div>
      </div>

      {/* Appeal Modal */}
      {showAppealForm && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl relative">
               <button onClick={() => setShowAppealForm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                  <X size={20} />
               </button>
               
               <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                  <HeartHandshake className="text-rose-500" /> Create Community Appeal
               </h3>
               
               <div className="space-y-4">
                  <div>
                     <label className="text-xs font-bold text-gray-500 uppercase">Appeal Type</label>
                     <select 
                        value={appealData.type}
                        onChange={(e) => setAppealData({...appealData, type: e.target.value as any})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                     >
                        <option value="DONATION">Donation / Funds</option>
                        <option value="ADOPTION">Adoption</option>
                        <option value="FOSTER">Foster Care</option>
                        <option value="TRANSPORT">Transportation</option>
                        <option value="BLOOD">Blood Donor</option>
                        <option value="OTHER">Other Help</option>
                     </select>
                  </div>

                  <div>
                     <label className="text-xs font-bold text-gray-500 uppercase">Title</label>
                     <input 
                        type="text" 
                        placeholder="e.g. Urgent: B-Negative Blood Donor Needed" 
                        value={appealData.title}
                        onChange={(e) => setAppealData({...appealData, title: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                     />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                     <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Urgency</label>
                        <select 
                           value={appealData.urgency}
                           onChange={(e) => setAppealData({...appealData, urgency: e.target.value})}
                           className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                        >
                           <option value="LOW">Low</option>
                           <option value="MEDIUM">Medium</option>
                           <option value="HIGH">High</option>
                           <option value="CRITICAL">Critical</option>
                        </select>
                     </div>
                     <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Location</label>
                        <input 
                           type="text" 
                           placeholder="e.g. City Vet" 
                           value={appealData.location}
                           onChange={(e) => setAppealData({...appealData, location: e.target.value})}
                           className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                        />
                     </div>
                  </div>

                  <div>
                     <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                     <textarea 
                        rows={3}
                        placeholder="Explain the situation..." 
                        value={appealData.description}
                        onChange={(e) => setAppealData({...appealData, description: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                     />
                  </div>

                  <button 
                     onClick={handleSubmitAppeal}
                     className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-rose-200 transition-colors"
                  >
                     Post Appeal
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
         <button className="w-full p-4 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100">
            <Settings size={20} className="text-gray-400" />
            <span className="text-sm font-bold text-slate-700">Account Settings</span>
         </button>
         <button className="w-full p-4 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100">
            <User size={20} className="text-gray-400" />
            <span className="text-sm font-bold text-slate-700">Personal Information</span>
         </button>
         <button className="w-full p-4 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100">
            <Bell size={20} className="text-gray-400" />
            <span className="text-sm font-bold text-slate-700">Notifications</span>
         </button>
         <button 
            onClick={onLogout}
            className="w-full p-4 text-left flex items-center gap-3 hover:bg-red-50 transition-colors text-red-600 group"
         >
            <LogOut size={20} className="group-hover:scale-110 transition-transform" />
            <span className="text-sm font-bold">Log Out</span>
         </button>
      </div>
    </div>
  );
};
