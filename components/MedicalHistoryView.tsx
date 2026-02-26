
import React, { useMemo, useState } from 'react';
import { Dog } from '../types';
import { ArrowLeft, FileText, Calendar, Activity, SquarePlus, Stethoscope, Syringe, Pill, AlertCircle, ShieldCheck, List, Image as ImageIcon, X } from 'lucide-react';

interface Props {
  dog: Dog;
  onBack: () => void;
}

// Helper to categorize medical entries based on keywords
const getCategory = (text: string) => {
  const lower = text.toLowerCase();
  // Added 'raksharab' to the check
  if (lower.includes('rabies') || lower.includes('anti-rabies') || lower.includes('raksharab')) return 'RABIES';
  if (lower.includes('7 in 1') || lower.includes('dhpp') || lower.includes('9 in 1') || lower.includes('distemper') || lower.includes('parvo') || lower.includes('multivalent') || lower.includes('megavac')) return 'VACCINE_COMBO';
  if (lower.includes('deworm')) return 'DEWORMING';
  if (lower.includes('checkup') || lower.includes('consultation')) return 'CHECKUP';
  return 'OTHER';
};

// Helper for styling based on category
const getStyles = (category: string) => {
  switch (category) {
    case 'RABIES':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
        title: 'Anti-Rabies Vaccine', // Renamed from Critical Protection
        iconBg: 'bg-red-100',
        iconColor: 'text-red-600',
        icon: ShieldCheck // Shield for Rabies
      };
    case 'VACCINE_COMBO':
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-800',
        title: 'Core Vaccine',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        icon: Syringe
      };
    case 'DEWORMING':
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-800',
        title: 'Parasite Control',
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
        icon: Pill
      };
    case 'CHECKUP':
      return {
        bg: 'bg-indigo-50',
        border: 'border-indigo-200',
        text: 'text-indigo-800',
        title: 'Vet Visit',
        iconBg: 'bg-indigo-100',
        iconColor: 'text-indigo-600',
        icon: Stethoscope
      };
    default:
      return {
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        text: 'text-slate-700',
        title: 'General Log',
        iconBg: 'bg-slate-100',
        iconColor: 'text-slate-400',
        icon: Activity
      };
  }
};

export const MedicalHistoryView: React.FC<Props> = ({ dog, onBack }) => {
  const [activeTab, setActiveTab] = useState<'TIMELINE' | 'GALLERY'>('TIMELINE');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Process logs: Parse date, sort, and group by year
  const timeline = useMemo(() => {
    if (!dog.medicalHistory) return [];

    const parsed = dog.medicalHistory.map(entry => {
      // Attempt to split by first colon for date (Format: "YYYY-MM-DD: Description")
      const parts = entry.split(':');
      let dateStr = '';
      let content = entry;
      let dateObj = new Date(0); // Default to epoch if no date

      // Simple heuristic: if first part looks like a date
      if (parts.length > 1) {
         const potentialDateStr = parts[0].trim();
         const potentialDate = new Date(potentialDateStr);
         if (!isNaN(potentialDate.getTime())) {
            dateStr = potentialDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            content = parts.slice(1).join(':').trim();
            dateObj = potentialDate;
         }
      }

      return {
        original: entry,
        content,
        dateObj,
        dateStr, // Formatted short date or empty
        category: getCategory(content)
      };
    });

    // Sort descending by date
    parsed.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());

    // Group by Year
    const groups: Record<string, typeof parsed> = {};
    parsed.forEach(item => {
       // If date is epoch (1970), categorize as 'Undated'
       const year = item.dateObj.getFullYear() === 1970 ? 'General / Undated' : item.dateObj.getFullYear().toString();
       if (!groups[year]) groups[year] = [];
       groups[year].push(item);
    });

    // Return entries sorted by year descending
    return Object.entries(groups).sort((a, b) => {
        if (a[0] === 'General / Undated') return 1;
        if (b[0] === 'General / Undated') return -1;
        return Number(b[0]) - Number(a[0]);
    });
  }, [dog.medicalHistory]);

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack} 
          className="flex items-center text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={20} className="mr-1" /> Back to Profile
        </button>
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
          <SquarePlus size={20} />
          <span>Medical Records</span>
        </div>
      </div>

      {/* Hero Card */}
      <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-lg shadow-indigo-200 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4">
            <Stethoscope size={140} />
         </div>
         <div className="relative z-10 flex items-center gap-4">
             <div className="w-16 h-16 rounded-2xl bg-white p-1 shadow-sm">
                <img src={dog.imageUrl} alt={dog.name} className="w-full h-full object-cover rounded-xl" />
             </div>
             <div>
                <h1 className="text-2xl font-extrabold">{dog.name}'s History</h1>
                <p className="text-indigo-200 text-sm font-medium">Complete Clinical Timeline</p>
             </div>
         </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-gray-200 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('TIMELINE')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'TIMELINE' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <List size={16} /> Clinical Timeline
        </button>
        <button
          onClick={() => setActiveTab('GALLERY')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'GALLERY' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ImageIcon size={16} /> Medical Gallery
        </button>
      </div>

      {/* Content Area */}
      {activeTab === 'TIMELINE' ? (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
           <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                  <Activity size={20} className="text-indigo-500" />
                  Clinical Logs
              </h3>
              <div className="flex gap-2 text-[10px] font-bold">
                 <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full"><div className="w-2 h-2 bg-red-500 rounded-full"></div> Anti-Rabies</span>
                 <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-full"><div className="w-2 h-2 bg-blue-500 rounded-full"></div> 7-in-1</span>
              </div>
           </div>

           {!timeline || timeline.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                 <FileText size={48} className="mx-auto mb-3 opacity-20" />
                 <p className="text-sm">No medical records found.</p>
                 <p className="text-xs mt-1">Logs saved from Health Check-ins will appear here.</p>
              </div>
           ) : (
              <div className="space-y-8 relative pl-2">
                 {/* Global Vertical Line */}
                 <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-gray-100"></div>

                 {timeline.map(([year, items]) => (
                    <div key={year} className="relative">
                       {/* Year Header */}
                       <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 rounded-full bg-white border-2 border-indigo-100 flex items-center justify-center font-bold text-xs text-indigo-600 shadow-sm z-10 relative">
                             {year.substring(0, 4)}
                          </div>
                          <div className="h-px bg-gray-100 flex-1"></div>
                       </div>

                       <div className="space-y-3 pl-10">
                          {items.map((entry, index) => {
                             const styles = getStyles(entry.category);
                             const Icon = styles.icon;

                             return (
                                <div key={index} className={`relative rounded-xl p-4 border ${styles.bg} ${styles.border} transition-all hover:shadow-md`}>
                                   {/* Connector Dot */}
                                   <div className={`absolute -left-[31px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-sm ${styles.iconBg.replace('bg-', 'bg-').replace('100', '500')}`}></div>
                                   {/* Connector Line Horizontal */}
                                   <div className="absolute -left-[27px] top-1/2 w-5 h-0.5 bg-gray-200"></div>

                                   <div className="flex items-start gap-3">
                                      <div className={`shrink-0 p-2 rounded-lg ${styles.iconBg} ${styles.iconColor}`}>
                                         <Icon size={18} />
                                      </div>
                                      <div className="flex-1">
                                         <div className="flex justify-between items-start">
                                            <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${styles.text}`}>
                                               {styles.title}
                                            </h4>
                                            {entry.dateStr && (
                                               <span className="text-[10px] font-semibold text-gray-400 flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-gray-100">
                                                  <Calendar size={10} /> {entry.dateStr}
                                               </span>
                                            )}
                                         </div>
                                         <p className="text-slate-700 text-sm font-medium leading-relaxed">
                                            {entry.content}
                                         </p>
                                      </div>
                                   </div>
                                </div>
                             );
                          })}
                       </div>
                    </div>
                 ))}
              </div>
           )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 min-h-[400px]">
           <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                  <ImageIcon size={20} className="text-purple-500" />
                  Scanned Documents & Photos
              </h3>
              <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                {dog.medicalRecords?.length || 0} Files
              </span>
           </div>

           {(!dog.medicalRecords || dog.medicalRecords.length === 0) ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-300">
                  <ImageIcon size={64} className="mb-4 opacity-50" />
                  <p className="text-sm font-bold text-gray-400">No records found</p>
                  <p className="text-xs">Scan vet books or upload health photos to see them here.</p>
              </div>
           ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                 {dog.medicalRecords.map((rec) => (
                    <div 
                      key={rec.id} 
                      onClick={() => setSelectedImage(rec.imageUrl)}
                      className="aspect-[3/4] rounded-xl overflow-hidden border border-gray-200 relative group cursor-pointer shadow-sm hover:shadow-md transition-all"
                    >
                       <img src={rec.imageUrl} alt="Record" className="w-full h-full object-cover" />
                       <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent p-3 pt-8 opacity-100">
                          <p className="text-white text-[10px] font-bold mb-0.5">{rec.date}</p>
                          <p className="text-white/80 text-[10px] line-clamp-2 leading-tight">{rec.description}</p>
                       </div>
                    </div>
                 ))}
              </div>
           )}
        </div>
      )}

      {/* Image Lightbox */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedImage(null)}>
           <button className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors bg-white/10 p-2 rounded-full">
              <X size={24} />
           </button>
           <img src={selectedImage} alt="Full view" className="max-w-full max-h-[90vh] rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};
