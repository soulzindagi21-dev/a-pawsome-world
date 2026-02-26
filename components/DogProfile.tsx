

import React, { useState, useEffect } from 'react';
import { Dog, Reminder, MedicalRecord } from '../types';
import { ArrowLeft, Weight, Activity, Syringe, FileText, User, Heart, Tag, Calendar, Bell, Plus, X, CheckCircle, Clock, Trash2, Pencil, SquarePlus, Save, Info, Sparkles, TrendingUp, TrendingDown, AlertTriangle, Stethoscope, ChevronLeft, ChevronRight, ScanLine, FileCheck, Loader2, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { parseVetBook, fileToGenerativePart } from '../geminiService';

interface Props {
  dog: Dog;
  onBack: () => void;
  onEdit: () => void;
  onViewHistory?: () => void;
  onUpdateDog?: (dog: Dog) => void;
  onDelete?: () => void;
  onCheckHealth?: () => void;
}

// Generate last 7 days with dates
const generateWeeklyData = () => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const data = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    data.push({
      day: days[d.getDay()],
      date: d.getDate(), // Day of month
      fullDate: d.toLocaleDateString(),
      score: 5 // Default
    });
  }
  return data;
};

export const DogProfile: React.FC<Props> = ({ dog, onBack, onEdit, onViewHistory, onUpdateDog, onDelete, onCheckHealth }) => {
  const [activeTab, setActiveTab] = useState<'INFO' | 'VET' | 'GALLERY'>('INFO');
  
  // View Mode: Weekly vs Monthly
  const [viewMode, setViewMode] = useState<'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Local state for reminders (mock persistence)
  const [reminders, setReminders] = useState<Reminder[]>(dog.reminders || []);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [newReminder, setNewReminder] = useState({ title: '', date: '', notes: '', type: 'OTHER' });

  // Activity Edit State
  const [isEditingActivity, setIsEditingActivity] = useState(false);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [wellnessInsight, setWellnessInsight] = useState<{ status: 'OPTIMUM' | 'WARNING' | 'CRITICAL' | 'IMPROVING', message: string, trend: 'UP' | 'DOWN' | 'STABLE' | 'ERRATIC' } | null>(null);

  // Vet Scanner State
  const [showScanner, setShowScanner] = useState(false);
  const [scanFiles, setScanFiles] = useState<File[]>([]);
  const [scanPreviews, setScanPreviews] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ history: any[], reminders: any[] } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    let currentData = generateWeeklyData();
    
    // Smart Merge: Match by Day Name first, then fallback to index
    if (dog.weeklyActivity && dog.weeklyActivity.length > 0) {
       currentData = currentData.map((d, index) => {
          // 1. Try to find a score for this specific day name (e.g. "Mon")
          const storedByDay = dog.weeklyActivity?.find(w => w.day === d.day);
          
          // 2. Fallback to index if day names don't match or strictly ordered
          const storedByIndex = dog.weeklyActivity ? dog.weeklyActivity[index] : null;

          // Priority: Day Match > Index Match > Default (5)
          const finalScore = storedByDay ? storedByDay.score : (storedByIndex ? storedByIndex.score : 5);

          return {
            ...d,
            score: finalScore
          };
       });
    }
    setActivityData(currentData);
    generateWellnessInsight(currentData);
  }, [dog]); // Re-run when dog prop changes (e.g. after save)

  // Logic to generate daily health update based on activity history
  const generateWellnessInsight = (data: any[]) => {
    const scores = data.map(d => d.score);
    const avg = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
    const recentScores = scores.slice(-3); // Last 3 days
    const recentAvg = recentScores.reduce((a: number, b: number) => a + b, 0) / recentScores.length;
    
    // Check for variance/stability
    const variance = scores.reduce((a: number, b: number) => a + Math.pow(b - avg, 2), 0) / scores.length;

    let status: 'OPTIMUM' | 'WARNING' | 'CRITICAL' | 'IMPROVING' = 'OPTIMUM';
    let message = `${dog.name}'s activity levels are stable and healthy. Keep up the good routine!`;
    let trend: 'UP' | 'DOWN' | 'STABLE' | 'ERRATIC' = 'STABLE';

    // 1. Detect Lethargy (Critical Low)
    if (recentAvg < 3) {
      status = 'CRITICAL';
      message = `Alert: Activity has dropped significantly recently. This could indicate pain, sickness, or injury.`;
      trend = 'DOWN';
    } 
    // 2. Detect Hyperactivity (Critical High)
    else if (recentAvg > 8) {
       status = 'WARNING';
       message = `Caution: unusually high activity detected. Watch for signs of anxiety, stress, or aggression.`;
       trend = 'UP';
    }
    // 3. Detect Improvement (Recovering)
    else if (scores[0] < 4 && recentAvg >= 4 && recentAvg <= 7) {
       status = 'IMPROVING';
       message = `Great news! ${dog.name} is showing signs of recovery. Activity levels are returning to normal.`;
       trend = 'UP';
    }
    // 4. Detect Deterioration (Slow decline)
    else if (scores[0] >= 5 && recentAvg <= 3.5) {
       status = 'WARNING';
       message = `Notice: A gradual decline in energy observed over the week. Monitor food intake closely.`;
       trend = 'DOWN';
    }
    // 5. Erratic Behavior
    else if (variance > 5) {
       status = 'WARNING';
       message = `Unstable activity patterns detected. ${dog.name} is fluctuating between high and low energy.`;
       trend = 'ERRATIC';
    }

    setWellnessInsight({ status, message, trend });
  };

  const handleAddReminder = () => {
    if(!newReminder.title || !newReminder.date) return;
    const reminder: Reminder = {
      id: Date.now().toString(),
      title: newReminder.title,
      date: newReminder.date,
      completed: false,
      notes: newReminder.notes,
      type: newReminder.type as any
    };
    setReminders([...reminders, reminder]);
    setShowAddReminder(false);
    setNewReminder({ title: '', date: '', notes: '', type: 'OTHER' });
  };

  const toggleReminder = (id: string) => {
    setReminders(reminders.map(r => r.id === id ? { ...r, completed: !r.completed } : r));
  };

  const deleteReminder = (id: string) => {
    setReminders(reminders.filter(r => r.id !== id));
  };

  const handleSaveActivity = () => {
    if (onUpdateDog) {
      // Strip extra date data before saving to keep DB schema clean
      const minimalData = activityData.map(d => ({ day: d.day, score: d.score }));
      onUpdateDog({
        ...dog,
        weeklyActivity: minimalData
      });
      setIsEditingActivity(false);
    }
  };

  const updateActivityScore = (dayIndex: number, newScore: number) => {
    // Functional update ensures we're working with the latest state
    // .map() creates a new array, ensuring immutability without 'read-only' errors
    setActivityData(prevData => 
      prevData.map((item, idx) => 
        idx === dayIndex ? { ...item, score: newScore } : item
      )
    );
  };

  const handleDeleteClick = () => {
     if (window.confirm(`Are you sure you want to delete ${dog.name}'s profile?`)) {
        if(onDelete) onDelete();
     }
  };

  // Helper to determine color based on activity score
  const getActivityColor = (score: number) => {
    if (score <= 2 || score >= 9) return '#ef4444'; // Red-500
    if (score === 3 || score === 8) return '#f97316'; // Orange-500
    return '#3b82f6'; // Blue-500
  };

  const getActivityTailwindColor = (score: number) => {
    if (score <= 2 || score >= 9) return 'text-red-500';
    if (score === 3 || score === 8) return 'text-orange-500';
    return 'text-blue-500';
  };
  
  const getActivityBgColor = (score: number) => {
    if (score <= 2 || score >= 9) return 'bg-red-500';
    if (score === 3 || score === 8) return 'bg-orange-500';
    return 'bg-blue-500';
  };

  const getActivityAccentClass = (score: number) => {
    if (score <= 2 || score >= 9) return 'accent-red-500';
    if (score === 3 || score === 8) return 'accent-orange-500';
    return 'accent-blue-500';
  };

  // Calendar Logic
  const getDaysInMonth = (date: Date) => {
     const year = date.getFullYear();
     const month = date.getMonth();
     const days = new Date(year, month + 1, 0).getDate();
     const firstDay = new Date(year, month, 1).getDay();
     return { days, firstDay };
  };

  const renderCalendar = () => {
     const { days, firstDay } = getDaysInMonth(currentMonth);
     const blanks = Array(firstDay).fill(null);
     const daySlots = Array.from({ length: days }, (_, i) => i + 1);
     
     // Mock historical data for calendar view (since we only store 7 days in this demo)
     const getMockScoreForDay = (d: number) => {
         // Use the actual data if it falls in the last 7 days range, otherwise random safe value
         const today = new Date().getDate();
         const diff = today - d;
         if (diff >= 0 && diff < 7) {
            return activityData[6 - diff]?.score || 5;
         }
         return Math.floor(Math.random() * 4) + 4; // Random 4-7
     };

     // Helper to check if a day is in the future
     const isFutureDate = (day: number) => {
        const now = new Date();
        const checkDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        // Normalize time to midnight
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return checkDate > today;
     };

     return (
        <div className="grid grid-cols-7 gap-1 mt-4 text-center">
           {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
              <div key={d} className="text-[10px] font-bold text-gray-400 mb-1">{d}</div>
           ))}
           {blanks.map((_, i) => <div key={`blank-${i}`} className="aspect-square"></div>)}
           {daySlots.map(d => {
              const score = getMockScoreForDay(d);
              const future = isFutureDate(d);
              
              return (
                <div key={d} className={`aspect-square flex items-center justify-center relative group ${future ? 'cursor-not-allowed opacity-30' : 'cursor-pointer'}`}>
                   <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${!future && 'hover:scale-110'} ${future ? 'bg-gray-200 text-gray-400' : `${getActivityBgColor(score)} text-white`}`}>
                      {d}
                   </div>
                   {/* Tooltip */}
                   {!future && (
                     <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        Score: {score}/10
                     </div>
                   )}
                </div>
              );
           })}
        </div>
     );
  };

  const changeMonth = (offset: number) => {
     const newDate = new Date(currentMonth);
     newDate.setMonth(newDate.getMonth() + offset);
     setCurrentMonth(newDate);
  };

  const handleScanFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      setScanFiles(files);
      
      // Create previews
      const previews = files.map(f => URL.createObjectURL(f));
      setScanPreviews(previews);
      
      setScanResult(null);
      setScanError(null);
    }
  };

  const handleScan = async () => {
    if(scanFiles.length === 0) return;
    setIsScanning(true);
    setScanError(null);
    try {
        // Convert all files to base64 parts
        const parts = await Promise.all(scanFiles.map(f => fileToGenerativePart(f)));
        // Extract only the base64 data strings for the service
        const base64Strings = parts.map(p => p.inlineData.data);
        
        const result = await parseVetBook(base64Strings);
        setScanResult(result);
    } catch(e) {
        setScanError("Unable to analyze documents. Please ensure the image is clear and contains readable text.");
    } finally {
        setIsScanning(false);
    }
  };

  const confirmScan = () => {
    if(!scanResult || !onUpdateDog) return;
    
    // 1. Add extracted Reminders
    const newReminders: Reminder[] = scanResult.reminders.map(r => ({
        id: Date.now().toString() + Math.random(),
        title: r.title,
        date: r.date,
        completed: false,
        notes: "Scanned from Vet Record",
        type: r.type as any
    }));

    // 2. Add extracted History (text)
    const newHistory = scanResult.history.map(h => `${h.date}: ${h.description} (Imported)`);

    // 3. Save the images to medicalRecords
    const timestamp = new Date().toLocaleDateString();
    
    const saveAndClose = async () => {
        const imageRecords = await Promise.all(scanFiles.map(async (file, index) => {
             const part = await fileToGenerativePart(file);
             return {
                 id: Date.now().toString() + index,
                 imageUrl: `data:${file.type};base64,${part.inlineData.data}`,
                 date: timestamp,
                 description: `Scanned Document ${index + 1}`
             };
        }));

        onUpdateDog({
            ...dog,
            medicalHistory: [...(dog.medicalHistory || []), ...newHistory],
            reminders: [...reminders, ...newReminders],
            medicalRecords: [...(dog.medicalRecords || []), ...imageRecords]
        });

        // Reset Scanner UI
        setShowScanner(false);
        setScanFiles([]);
        setScanPreviews([]);
        setScanResult(null);
    };
    
    saveAndClose();
  };

  const removeFile = (index: number) => {
      const newFiles = [...scanFiles];
      newFiles.splice(index, 1);
      setScanFiles(newFiles);
      
      const newPreviews = [...scanPreviews];
      newPreviews.splice(index, 1);
      setScanPreviews(newPreviews);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Navbar */}
      <div className="flex items-center justify-between">
         <button onClick={onBack} className="p-2 bg-white rounded-full shadow-sm text-gray-600 hover:text-gray-900">
           <ArrowLeft size={20} />
         </button>
         <div className="flex gap-2">
            {onDelete && (
              <button 
                type="button"
                onClick={handleDeleteClick}
                className="p-2 bg-white rounded-full shadow-sm text-red-500 hover:text-red-600 border border-gray-100 hover:bg-red-50 transition-colors"
                title="Delete Profile"
              >
                <Trash2 size={20} />
              </button>
            )}
            <button 
              onClick={onEdit}
              className="p-2 bg-white rounded-full shadow-sm text-blue-500 hover:text-blue-600"
              title="Edit Profile"
            >
              <Pencil size={20} />
            </button>
            <button 
              onClick={onViewHistory}
              className="p-2 bg-white rounded-full shadow-sm text-indigo-500 hover:text-indigo-600 group"
              title="Medical History"
            >
               <SquarePlus size={20} className="group-hover:scale-110 transition-transform"/>
            </button>
         </div>
      </div>

      {/* Main Profile Card */}
      <div className="relative">
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header / Cover */}
            <div className="h-32 bg-gradient-to-r from-slate-100 to-slate-200"></div>
            
            <div className="px-6 pb-6 pt-12 relative">
               {/* Avatar */}
               <div className="absolute -top-12 left-6 p-1 bg-white rounded-2xl shadow-md">
                 <img 
                    src={dog.imageUrl} 
                    alt={dog.name} 
                    className="w-24 h-24 rounded-xl object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=500';
                    }}
                 />
               </div>

               <div className="flex justify-between items-start mb-4">
                 <div>
                   <h1 className="text-3xl font-extrabold text-slate-800">{dog.name}</h1>
                   <p className="text-slate-500 font-medium">{dog.breed}</p>
                 </div>
                 <div className="text-right">
                   <div className="text-2xl font-bold text-slate-800">{dog.age}<span className="text-sm font-normal text-gray-400">yrs</span></div>
                   <div className="text-sm text-gray-400">{dog.sex}</div>
                 </div>
               </div>

               {/* Tags */}
               <div className="flex flex-wrap gap-2 mb-6">
                 {dog.isSterilized && (
                   <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200">
                     ✓ Sterilized
                   </span>
                 )}
                 {dog.type === 'STRAY' && (
                    <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold border border-orange-200">
                      Community Dog
                    </span>
                 )}
               </div>

               {/* Personality */}
               {dog.personality && (
                  <div className="mb-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Personality</h3>
                    <div className="flex gap-2">
                       {dog.personality.map(p => (
                          <span key={p} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-medium">
                            {p}
                          </span>
                       ))}
                    </div>
                  </div>
               )}

               <button 
                  onClick={onCheckHealth}
                  className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl shadow-lg shadow-slate-200 hover:bg-black transition-all flex items-center justify-center gap-2"
               >
                 <Stethoscope size={18} /> Daily Health Check-in
               </button>
            </div>
        </div>
      </div>

      {/* Vet Book Scanner */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-3xl p-6 border border-indigo-100 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-6 opacity-5 text-indigo-500">
            <ScanLine size={100} />
         </div>
         <div className="relative z-10">
            <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2 mb-2">
               <FileCheck size={20} /> Vet Book Scanner
            </h3>
            <p className="text-sm text-indigo-700 mb-4 max-w-xs">
               Upload photos of prescription or vet records. Gemini AI will extract medical history & reminders automatically.
            </p>
            
            <button 
               onClick={() => setShowScanner(true)}
               className="bg-white text-indigo-600 font-bold text-sm px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-2"
            >
               <ScanLine size={16} /> Open Scanner
            </button>
         </div>
      </div>

      {/* Wellness Insight */}
      {wellnessInsight && (
        <div className={`p-4 rounded-2xl border flex gap-3 items-start ${
           wellnessInsight.status === 'OPTIMUM' ? 'bg-green-50 border-green-100 text-green-800' :
           wellnessInsight.status === 'WARNING' ? 'bg-orange-50 border-orange-100 text-orange-800' :
           wellnessInsight.status === 'CRITICAL' ? 'bg-red-50 border-red-100 text-red-800' :
           'bg-blue-50 border-blue-100 text-blue-800'
        }`}>
           <div className={`p-2 rounded-full shrink-0 ${
              wellnessInsight.status === 'OPTIMUM' ? 'bg-green-100 text-green-600' :
              wellnessInsight.status === 'WARNING' ? 'bg-orange-100 text-orange-600' :
              wellnessInsight.status === 'CRITICAL' ? 'bg-red-100 text-red-600' :
              'bg-blue-100 text-blue-600'
           }`}>
              {wellnessInsight.trend === 'UP' ? <TrendingUp size={16}/> : 
               wellnessInsight.trend === 'DOWN' ? <TrendingDown size={16}/> : 
               wellnessInsight.trend === 'ERRATIC' ? <Activity size={16}/> : <Sparkles size={16}/>}
           </div>
           <div>
              <h4 className="font-bold text-sm mb-1">Wellness Insight</h4>
              <p className="text-xs leading-relaxed opacity-90">{wellnessInsight.message}</p>
           </div>
        </div>
      )}

      {/* Activity Chart */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
         <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
               <Activity size={20} className="text-orange-500" /> Activity Levels
            </h3>
            <div className="flex bg-gray-100 p-1 rounded-lg">
               <button 
                 onClick={() => setViewMode('WEEKLY')}
                 className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${viewMode === 'WEEKLY' ? 'bg-white shadow-sm text-slate-800' : 'text-gray-500'}`}
               >
                 Weekly
               </button>
               <button 
                 onClick={() => setViewMode('MONTHLY')}
                 className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${viewMode === 'MONTHLY' ? 'bg-white shadow-sm text-slate-800' : 'text-gray-500'}`}
               >
                 Monthly
               </button>
            </div>
         </div>

         {viewMode === 'WEEKLY' ? (
           <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={activityData}>
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                    <Tooltip 
                       cursor={{fill: 'transparent'}}
                       content={({active, payload}) => {
                          if(active && payload && payload.length) {
                             return (
                                <div className="bg-slate-800 text-white text-xs p-2 rounded-lg shadow-xl">
                                   <p className="font-bold mb-1">{payload[0].payload.fullDate}</p>
                                   <p>Energy Score: {payload[0].value}/10</p>
                                </div>
                             )
                          }
                          return null;
                       }}
                    />
                    <Bar dataKey="score" radius={[4, 4, 4, 4]} barSize={32}>
                       {activityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getActivityColor(entry.score)} />
                       ))}
                    </Bar>
                 </BarChart>
              </ResponsiveContainer>
              
              <div className="mt-4 flex justify-between items-center">
                 <p className="text-xs text-gray-400 italic">Tap 'Health Check-in' to update today's score.</p>
                 <button 
                   onClick={() => setIsEditingActivity(!isEditingActivity)} 
                   className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                 >
                   {isEditingActivity ? 'Done Editing' : 'Edit Past Data'}
                 </button>
              </div>

              {isEditingActivity && (
                 <div className="mt-4 space-y-3 bg-gray-50 p-3 rounded-xl border border-gray-100 animate-fade-in">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Adjust Past Scores</p>
                    <div className="grid grid-cols-7 gap-2">
                       {activityData.map((d, idx) => (
                          <div key={idx} className="flex flex-col items-center gap-1">
                             <span className="text-[10px] font-bold text-gray-400">{d.day}</span>
                             <input 
                                type="number" 
                                min="1" max="10" 
                                value={d.score}
                                onChange={(e) => updateActivityScore(idx, parseInt(e.target.value))}
                                className={`w-8 h-8 text-center text-xs font-bold rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-200 ${getActivityTailwindColor(d.score)}`}
                             />
                          </div>
                       ))}
                    </div>
                    <button onClick={handleSaveActivity} className="w-full mt-2 bg-slate-800 text-white text-xs font-bold py-2 rounded-lg">Save Changes</button>
                 </div>
              )}
           </div>
         ) : (
           <div>
              <div className="flex items-center justify-between mb-2">
                 <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-100 rounded-full"><ChevronLeft size={16}/></button>
                 <span className="text-sm font-bold text-slate-800">{currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                 <button onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-100 rounded-full"><ChevronRight size={16}/></button>
              </div>
              {renderCalendar()}
              <div className="flex justify-center gap-4 mt-4 text-[10px] text-gray-500 font-medium">
                 <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Normal</span>
                 <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500"></div> High/Low</span>
                 <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Critical</span>
              </div>
           </div>
         )}
      </div>

      {/* Reminders Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
         <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
               <Bell size={20} className="text-yellow-500" /> Reminders
            </h3>
            <button 
              onClick={() => setShowAddReminder(true)}
              className="bg-slate-900 text-white p-1.5 rounded-lg hover:bg-black transition-colors"
            >
              <Plus size={16} />
            </button>
         </div>

         {reminders.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm italic">
               No active reminders.
            </div>
         ) : (
            <div className="space-y-3">
               {reminders.map(r => (
                 <div key={r.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${r.completed ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-100 shadow-sm'}`}>
                    <button 
                      onClick={() => toggleReminder(r.id)}
                      className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${r.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-transparent hover:border-green-400'}`}
                    >
                       <CheckCircle size={12} fill="currentColor" />
                    </button>
                    <div className="flex-1">
                       <h4 className={`text-sm font-bold ${r.completed ? 'text-gray-500 line-through' : 'text-slate-800'}`}>{r.title}</h4>
                       <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1">
                          <span className="flex items-center gap-1"><Clock size={10} /> {r.date}</span>
                          {r.type && <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{r.type}</span>}
                       </div>
                    </div>
                    <button onClick={() => deleteReminder(r.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                       <Trash2 size={14} />
                    </button>
                 </div>
               ))}
            </div>
         )}

         {showAddReminder && (
            <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100 animate-fade-in">
               <div className="space-y-3">
                  <input 
                    type="text" 
                    placeholder="Reminder Title (e.g. Heartworm Pill)" 
                    value={newReminder.title}
                    onChange={(e) => setNewReminder({...newReminder, title: e.target.value})}
                    className="w-full p-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <div className="flex gap-2">
                     <input 
                       type="date" 
                       value={newReminder.date}
                       onChange={(e) => setNewReminder({...newReminder, date: e.target.value})}
                       className="flex-1 p-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-200"
                     />
                     <select 
                       value={newReminder.type}
                       onChange={(e) => setNewReminder({...newReminder, type: e.target.value})}
                       className="flex-1 p-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-200"
                     >
                        <option value="VACCINE">Vaccine</option>
                        <option value="MEDICATION">Meds</option>
                        <option value="DEWORMING">Deworm</option>
                        <option value="OTHER">Other</option>
                     </select>
                  </div>
                  <div className="flex gap-2 pt-1">
                     <button onClick={() => setShowAddReminder(false)} className="flex-1 py-2 text-xs font-bold text-gray-500 hover:bg-gray-200 rounded-lg">Cancel</button>
                     <button onClick={handleAddReminder} className="flex-1 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add Reminder</button>
                  </div>
               </div>
            </div>
         )}
      </div>

      {/* Vet Scanner Modal */}
      {showScanner && (
         <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
               {/* Header */}
               <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
                  <div className="flex items-center gap-2">
                     <ScanLine size={20} />
                     <h2 className="font-bold text-lg">Vet Record Analysis</h2>
                  </div>
                  <button onClick={() => { setShowScanner(false); setScanFiles([]); setScanResult(null); }} className="p-1 hover:bg-indigo-500 rounded-full">
                     <X size={20} />
                  </button>
               </div>

               {/* Body */}
               <div className="p-6 overflow-y-auto">
                  {!scanResult ? (
                     <>
                        <div className="border-2 border-dashed border-indigo-100 bg-indigo-50/50 rounded-2xl p-8 text-center mb-6">
                           <input type="file" multiple accept="image/*" onChange={handleScanFileChange} className="hidden" id="scan-upload" />
                           <label htmlFor="scan-upload" className="cursor-pointer block">
                              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm text-indigo-500">
                                 <ImageIcon size={32} />
                              </div>
                              <h3 className="font-bold text-indigo-900">Tap to Upload Documents</h3>
                              <p className="text-xs text-indigo-400 mt-1">Supports multiple pages (Prescriptions, Vaccine Cards)</p>
                           </label>
                        </div>

                        {scanFiles.length > 0 && (
                           <div className="grid grid-cols-3 gap-3 mb-6">
                              {scanPreviews.map((src, i) => (
                                 <div key={i} className="aspect-[3/4] relative rounded-lg overflow-hidden border border-gray-200 group">
                                    <img src={src} className="w-full h-full object-cover" alt="scan" />
                                    <button onClick={() => removeFile(i)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                       <X size={12} />
                                    </button>
                                 </div>
                              ))}
                           </div>
                        )}

                        {isScanning && (
                           <div className="flex flex-col items-center justify-center py-8 text-indigo-600">
                              <Loader2 size={40} className="animate-spin mb-3" />
                              <p className="font-bold text-sm">Analyzing with Gemini Vision...</p>
                              <p className="text-xs text-indigo-400">Extracting dates, vaccines, and notes</p>
                           </div>
                        )}

                        {scanError && (
                           <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm mb-4 flex gap-2 items-start border border-red-100">
                              <AlertCircle size={16} className="shrink-0 mt-0.5" />
                              {scanError}
                           </div>
                        )}

                        <button 
                           onClick={handleScan} 
                           disabled={isScanning || scanFiles.length === 0}
                           className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                        >
                           {isScanning ? 'Processing...' : `Analyze ${scanFiles.length} Document${scanFiles.length !== 1 ? 's' : ''}`}
                        </button>
                     </>
                  ) : (
                     <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-xl border border-green-100">
                           <CheckCircle size={20} />
                           <span className="font-bold text-sm">Analysis Complete! Review extracted data:</span>
                        </div>

                        <div>
                           <h4 className="font-bold text-xs text-gray-400 uppercase tracking-wider mb-2">History Found</h4>
                           {scanResult.history.length > 0 ? (
                              <div className="space-y-2">
                                 {scanResult.history.map((h, i) => (
                                    <div key={i} className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex gap-3 text-sm">
                                       <span className="font-bold text-slate-700 whitespace-nowrap">{h.date}</span>
                                       <span className="text-gray-600">{h.description}</span>
                                    </div>
                                 ))}
                              </div>
                           ) : <p className="text-sm text-gray-400 italic">No past history detected.</p>}
                        </div>

                        <div>
                           <h4 className="font-bold text-xs text-gray-400 uppercase tracking-wider mb-2">Reminders Found</h4>
                           {scanResult.reminders.length > 0 ? (
                              <div className="space-y-2">
                                 {scanResult.reminders.map((r, i) => (
                                    <div key={i} className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex gap-3 text-sm items-center">
                                       <Bell size={14} className="text-blue-500" />
                                       <div className="flex-1">
                                          <div className="font-bold text-blue-900">{r.title}</div>
                                          <div className="text-xs text-blue-700">{r.date} • {r.type}</div>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           ) : <p className="text-sm text-gray-400 italic">No future reminders detected.</p>}
                        </div>

                        <div className="flex gap-3 pt-4">
                           <button onClick={() => setScanResult(null)} className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50">
                              Rescan
                           </button>
                           <button onClick={confirmScan} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700">
                              Save to Profile
                           </button>
                        </div>
                     </div>
                  )}
               </div>
            </div>
         </div>
      )}
    </div>
  );
};
