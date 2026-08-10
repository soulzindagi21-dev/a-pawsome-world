
import React, { useState } from 'react';
import { ArrowLeft, LogOut, MapPin, User as UserIcon, Settings, Shield, HeartHandshake, X, Loader2, Save, KeyRound, Eye, EyeOff, AlertTriangle, Users as UsersIcon } from 'lucide-react';
import { Appeal, AppealType, User } from '../types';
import { supabase } from '../supabaseClient';

interface Props {
  user: User;
  onBack: () => void;
  onLogout: () => void;
  onAddAppeal?: (appeal: Appeal) => void;
  onUpdateUser?: (user: User) => void;
}

export const UserProfile: React.FC<Props> = ({ user, onBack, onLogout, onAddAppeal, onUpdateUser }) => {
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [showPersonalInfo, setShowPersonalInfo] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [appealData, setAppealData] = useState({
    type: AppealType.DONATION,
    title: '',
    description: '',
    urgency: 'MEDIUM',
    location: ''
  });

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

  // --- Personal Information ---
  const [personalForm, setPersonalForm] = useState({
    name: user.name,
    zone: user.zone,
    location: user.location || '',
    bio: user.bio || ''
  });
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [personalError, setPersonalError] = useState('');

  const handleSavePersonalInfo = async () => {
    setSavingPersonal(true);
    setPersonalError('');
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: personalForm.name,
          zone: personalForm.zone,
          location: personalForm.location,
          bio: personalForm.bio
        })
        .eq('id', user.id);

      if (error) throw error;

      onUpdateUser?.({ ...user, ...personalForm });
      setShowPersonalInfo(false);
    } catch (err: any) {
      setPersonalError(err.message || 'Could not save changes.');
    } finally {
      setSavingPersonal(false);
    }
  };

  // --- Account Settings ---
  const [settingsForm, setSettingsForm] = useState({
    notifyEmergency: user.notifyEmergency ?? false,
    notifyCommunity: user.notifyCommunity ?? false,
    publicProfile: user.publicProfile ?? false
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState('');

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSettingsError('');
    try {
      const { error } = await supabase
        .from('users')
        .update({
          notify_emergency: settingsForm.notifyEmergency,
          notify_community: settingsForm.notifyCommunity,
          public_profile: settingsForm.publicProfile
        })
        .eq('id', user.id);

      if (error) throw error;

      onUpdateUser?.({ ...user, ...settingsForm });
      setShowAccountSettings(false);
    } catch (err: any) {
      setSettingsError(err.message || 'Could not save changes.');
    } finally {
      setSavingSettings(false);
    }
  };

  // --- Change Password (within Account Settings) ---
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  const handleChangePassword = async () => {
    setPasswordMessage('');
    if (newPassword.length < 6) {
      setPasswordMessage('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage('Passwords do not match.');
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordMessage('Password updated successfully.');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordFields(false);
    } catch (err: any) {
      setPasswordMessage(err.message || 'Could not update password.');
    } finally {
      setChangingPassword(false);
    }
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
         <button
            onClick={() => setShowAccountSettings(true)}
            className="w-full p-4 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
         >
            <Settings size={20} className="text-gray-400" />
            <span className="text-sm font-bold text-slate-700">Account Settings</span>
         </button>
         <button
            onClick={() => setShowPersonalInfo(true)}
            className="w-full p-4 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
         >
            <UserIcon size={20} className="text-gray-400" />
            <span className="text-sm font-bold text-slate-700">Personal Information</span>
         </button>
         <button
            onClick={onLogout}
            className="w-full p-4 text-left flex items-center gap-3 hover:bg-red-50 transition-colors text-red-600 group"
         >
            <LogOut size={20} className="group-hover:scale-110 transition-transform" />
            <span className="text-sm font-bold">Log Out</span>
         </button>
      </div>

      {/* Personal Information Modal */}
      {showPersonalInfo && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
               <button onClick={() => setShowPersonalInfo(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                  <X size={20} />
               </button>

               <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                  <UserIcon className="text-teal-500" /> Personal Information
               </h3>

               <div className="space-y-4">
                  <div>
                     <label className="text-xs font-bold text-gray-500 uppercase">Full Name</label>
                     <input
                        type="text"
                        value={personalForm.name}
                        onChange={(e) => setPersonalForm({ ...personalForm, name: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                     />
                  </div>

                  <div>
                     <label className="text-xs font-bold text-gray-500 uppercase">Zone / Area</label>
                     <input
                        type="text"
                        value={personalForm.zone}
                        onChange={(e) => setPersonalForm({ ...personalForm, zone: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                     />
                  </div>

                  <div>
                     <label className="text-xs font-bold text-gray-500 uppercase">Location</label>
                     <input
                        type="text"
                        placeholder="e.g. Near City Vet, Main St."
                        value={personalForm.location}
                        onChange={(e) => setPersonalForm({ ...personalForm, location: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                     />
                  </div>

                  <div>
                     <label className="text-xs font-bold text-gray-500 uppercase">Bio</label>
                     <textarea
                        rows={3}
                        placeholder="A short note about yourself..."
                        value={personalForm.bio}
                        onChange={(e) => setPersonalForm({ ...personalForm, bio: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                     />
                  </div>

                  <div>
                     <label className="text-xs font-bold text-gray-500 uppercase">Email</label>
                     <input
                        type="text"
                        value={user.email || ''}
                        disabled
                        className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-400 cursor-not-allowed"
                     />
                  </div>

                  <div>
                     <label className="text-xs font-bold text-gray-500 uppercase">Username</label>
                     <input
                        type="text"
                        value={user.username}
                        disabled
                        className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-400 cursor-not-allowed"
                     />
                  </div>

                  {personalError && (
                     <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-3 rounded-xl flex items-center gap-2">
                        <AlertTriangle size={14} /> {personalError}
                     </div>
                  )}

                  <button
                     onClick={handleSavePersonalInfo}
                     disabled={savingPersonal}
                     className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-teal-100 transition-colors flex items-center justify-center gap-2"
                  >
                     {savingPersonal ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                     Save Changes
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Account Settings Modal */}
      {showAccountSettings && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
               <button onClick={() => setShowAccountSettings(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                  <X size={20} />
               </button>

               <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                  <Settings className="text-teal-500" /> Account Settings
               </h3>

               <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer">
                     <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-red-400" /> Emergency Alerts
                     </span>
                     <input
                        type="checkbox"
                        checked={settingsForm.notifyEmergency}
                        onChange={(e) => setSettingsForm({ ...settingsForm, notifyEmergency: e.target.checked })}
                        className="w-5 h-5 accent-teal-500"
                     />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer">
                     <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <UsersIcon size={16} className="text-blue-400" /> Community Updates
                     </span>
                     <input
                        type="checkbox"
                        checked={settingsForm.notifyCommunity}
                        onChange={(e) => setSettingsForm({ ...settingsForm, notifyCommunity: e.target.checked })}
                        className="w-5 h-5 accent-teal-500"
                     />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer">
                     <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Eye size={16} className="text-purple-400" /> Public Profile
                     </span>
                     <input
                        type="checkbox"
                        checked={settingsForm.publicProfile}
                        onChange={(e) => setSettingsForm({ ...settingsForm, publicProfile: e.target.checked })}
                        className="w-5 h-5 accent-teal-500"
                     />
                  </label>

                  {settingsError && (
                     <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-3 rounded-xl flex items-center gap-2">
                        <AlertTriangle size={14} /> {settingsError}
                     </div>
                  )}

                  <button
                     onClick={handleSaveSettings}
                     disabled={savingSettings}
                     className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-teal-100 transition-colors flex items-center justify-center gap-2"
                  >
                     {savingSettings ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                     Save Preferences
                  </button>

                  {/* Change Password */}
                  <div className="pt-4 mt-2 border-t border-gray-100">
                     <button
                        type="button"
                        onClick={() => setShowPasswordFields(!showPasswordFields)}
                        className="w-full flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-teal-600 transition-colors"
                     >
                        <KeyRound size={16} /> Change Password
                     </button>

                     {showPasswordFields && (
                        <div className="mt-3 space-y-3">
                           <div className="relative">
                              <input
                                 type={passwordVisible ? 'text' : 'password'}
                                 placeholder="New password"
                                 value={newPassword}
                                 onChange={(e) => setNewPassword(e.target.value)}
                                 className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pr-10 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                              />
                              <button
                                 type="button"
                                 onClick={() => setPasswordVisible(!passwordVisible)}
                                 className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                              >
                                 {passwordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                           </div>
                           <input
                              type={passwordVisible ? 'text' : 'password'}
                              placeholder="Confirm new password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                           />

                           {passwordMessage && (
                              <p className="text-xs font-semibold text-center text-rose-600">{passwordMessage}</p>
                           )}

                           <button
                              onClick={handleChangePassword}
                              disabled={changingPassword}
                              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                           >
                              {changingPassword ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                              Update Password
                           </button>
                        </div>
                     )}
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};
