

import React, { useState, useEffect, useRef } from 'react';
import { Dog, HealthLog, MedicalRecord } from '../types';
import { SYMPTOMS_LIST } from '../constants';
import { analyzeHealthLog, fileToGenerativePart, processHealthAudio } from '../geminiService';
import { ArrowLeft, Loader2, Stethoscope, AlertCircle, Thermometer, Activity, HeartPulse, ChevronDown, FilePlus, CheckCircle, Camera, X, Info, Mic } from 'lucide-react';

interface Props {
  dog: Dog;
  allDogs?: Dog[];
  onSelectDog?: (dog: Dog) => void;
  onUpdateDog?: (dog: Dog) => void;
  onBack: () => void;
}

export const HealthTracker: React.FC<Props> = ({ dog, allDogs, onSelectDog, onUpdateDog, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Audio State
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [log, setLog] = useState<Omit<HealthLog, 'id' | 'dogId' | 'aiAnalysis' | 'riskScore' | 'urgencyLevel'>>({
    timestamp: new Date().toISOString(),
    appetite: 5,
    waterIntake: 5,
    energy: 5,
    painLevel: 1,
    stoolQuality: 'Normal',
    vomitCount: 0,
    breathingDifficulty: false,
    isLimping: false,
    isItching: false,
    symptoms: [],
    notes: ''
  });

  // Reset log when dog changes
  useEffect(() => {
    setAnalysis(null);
    setLog(prev => ({ ...prev, symptoms: [], notes: '' }));
    setImageFile(null);
    setPreviewUrl(null);
    setIsRecording(false);
  }, [dog.id]);

  const toggleSymptom = (symptom: string) => {
    setLog(prev => ({
      ...prev,
      symptoms: prev.symptoms.includes(symptom) 
        ? prev.symptoms.filter(s => s !== symptom)
        : [...prev.symptoms, symptom]
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Audio Recording Logic
  const toggleRecording = async () => {
    if (isRecording) {
      // Stop Recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    } else {
      // Start Recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());
          
          setIsProcessingAudio(true);
          const transcribedText = await processHealthAudio(audioBlob);
          
          setLog(prev => ({
             ...prev,
             notes: prev.notes ? `${prev.notes}\n\n[Voice Note]: ${transcribedText}` : `[Voice Note]: ${transcribedText}`
          }));
          setIsProcessingAudio(false);
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Microphone access error:", err);
        alert("Could not access microphone. Please check permissions.");
      }
    }
  };

  const handleAnalysis = async () => {
    setLoading(true);
    setAnalysis(null);
    
    let base64 = undefined;
    if (imageFile) {
      const part = await fileToGenerativePart(imageFile);
      base64 = part.inlineData.data;
    }

    const result = await analyzeHealthLog(log, dog.breed, dog.age, base64);
    setAnalysis(result);
    setLoading(false);
  };

  const handleSaveToHistory = async () => {
    if (!onUpdateDog || !analysis) return;
    
    setIsSaving(true);
    
    const timestamp = new Date().toLocaleDateString();
    const symptomStr = log.symptoms.length > 0 ? log.symptoms.join(', ') : 'Routine Check';
    const visualNote = imageFile ? ' (Image Uploaded)' : '';
    
    // Extract urgency from AI analysis if possible
    let aiNote = "AI Risk Assessment Saved.";
    const urgencyMatch = analysis.match(/\*\*Urgency:?\*\*\s*(.+)/i);
    if (urgencyMatch && urgencyMatch[1]) {
        aiNote = `AI Urgency: ${urgencyMatch[1].trim()}`;
    }

    const summaryEntry = `${timestamp}: ${symptomStr}${visualNote}. ${aiNote}`;
    
    // Prepare New Record if Image Exists
    let newMedicalRecord: MedicalRecord | null = null;
    if (imageFile) {
        try {
           const part = await fileToGenerativePart(imageFile);
           newMedicalRecord = {
              id: Date.now().toString(),
              date: timestamp,
              description: `Health Check: ${symptomStr}`,
              imageUrl: `data:${imageFile.type};base64,${part.inlineData.data}`
           };
        } catch (e) {
           console.error("Failed to save image to gallery", e);
        }
    }

    const updatedDog = {
        ...dog,
        medicalHistory: [summaryEntry, ...(dog.medicalHistory || [])],
        medicalRecords: newMedicalRecord ? [newMedicalRecord, ...(dog.medicalRecords || [])] : dog.medicalRecords
    };
    
    onUpdateDog(updatedDog);
    setTimeout(() => setIsSaving(false), 1500);
  };

  const renderSlider = (label: string, value: number, setter: (val: number) => void, colorClass: string, icon?: React.ReactNode, isActivityType?: boolean) => {
    // Dynamic color logic for Activity/Energy sliders
    let finalColorClass = colorClass;
    let accentClass = 'accent-current';

    if (isActivityType) {
       // Red for extremes (1-2, 9-10), Blue for optimum (4-7)
       if (value <= 2 || value >= 9) {
          finalColorClass = 'text-red-500 bg-red-500';
          accentClass = 'accent-red-500';
       } else if (value === 3 || value === 8) {
          finalColorClass = 'text-orange-500 bg-orange-500';
          accentClass = 'accent-orange-500';
       } else {
          finalColorClass = 'text-blue-500 bg-blue-500';
          accentClass = 'accent-blue-500';
       }
    }

    return (
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
        <div className="flex justify-between mb-3 items-center">
          <label className={`font-bold flex items-center gap-2 ${isActivityType ? finalColorClass.split(' ')[0] : 'text-slate-700'}`}>
            {icon} {label}
          </label>
          <span className={`text-sm font-bold px-3 py-1 rounded-full ${finalColorClass} bg-opacity-20`}>
            {value}/10
          </span>
        </div>
        <input 
          type="range" min="1" max="10" 
          value={value}
          onChange={(e) => setter(parseInt(e.target.value))}
          className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${accentClass}`}
          style={{ color: 'inherit' }} 
        />
        <div className="flex justify-between text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wider">
          <span>Low</span>
          <span>Normal</span>
          <span>High</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex items-center justify-between sticky top-0 bg-gray-50/90 backdrop-blur-sm z-10 py-2">
        <button onClick={onBack} className="flex items-center text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft size={20} className="mr-1" /> Back
        </button>
        
        {/* Dropdown for Dog Selection */}
        {allDogs && allDogs.length > 0 && onSelectDog ? (
            <div className="relative">
                <select 
                    value={dog.id}
                    onChange={(e) => {
                        const selected = allDogs.find(d => d.id === e.target.value);
                        if(selected) onSelectDog(selected);
                    }}
                    className="appearance-none bg-white border border-gray-200 pl-4 pr-8 py-1.5 rounded-full text-xs font-bold focus:outline-none focus:ring-2 focus:ring-paws-500 shadow-sm"
                >
                    {allDogs.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
        ) : (
            <span className="text-xs font-bold bg-white border border-gray-200 px-3 py-1 rounded-full">
              {dog.name} • {new Date().toLocaleDateString()}
            </span>
        )}
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-lg shadow-gray-100 border border-gray-100 space-y-8">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Health Check-in</h1>
          <p className="text-gray-500 text-sm">Detailed logs help Gemini detect patterns early.</p>
        </div>

        {/* Pro Tip Section */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3 shadow-sm">
           <div className="bg-blue-100 p-2 rounded-full h-fit text-blue-600">
             <Info size={20} />
           </div>
           <div className="space-y-1">
              <h3 className="font-bold text-sm text-blue-900">Important: For Accurate Results</h3>
              <p className="text-xs text-blue-800 leading-relaxed">
                 The health results will be more accurate if the dog is monitored by keeping it confined in a <strong>safe and comfortable place</strong> with food and water. Having accurate data helps the AI to generate a more accurate diagnosis of the underlying condition.
              </p>
           </div>
        </div>

        {/* Vital Sliders */}
        <div className="space-y-4">
          <div className="text-paws-600">
             {renderSlider("Appetite", log.appetite, (v) => setLog({...log, appetite: v}), "text-paws-600 bg-paws-600")}
          </div>
          <div className="text-blue-500">
             {renderSlider("Water Intake", log.waterIntake, (v) => setLog({...log, waterIntake: v}), "text-blue-500 bg-blue-500")}
          </div>
          <div>
             {/* Use special activity logic: isActivityType=true */}
             {renderSlider("Energy Level", log.energy, (v) => setLog({...log, energy: v}), "", <Activity size={16}/>, true)}
          </div>
          <div className="text-red-500">
             {renderSlider("Pain Indicators", log.painLevel, (v) => setLog({...log, painLevel: v}), "text-red-500 bg-red-500", <HeartPulse size={16}/>)}
          </div>
        </div>

        {/* Critical Toggles */}
        <div>
           <label className="font-bold text-slate-700 block mb-3">Critical Observations</label>
           <div className="grid grid-cols-2 gap-3">
             {[
               { label: 'Breathing Issues', key: 'breathingDifficulty', val: log.breathingDifficulty },
               { label: 'Limping', key: 'isLimping', val: log.isLimping },
               { label: 'Excessive Itch', key: 'isItching', val: log.isItching },
               { label: 'Vomiting', key: 'vomitCount', val: log.vomitCount > 0, action: () => setLog({...log, vomitCount: log.vomitCount > 0 ? 0 : 1}) }
             ].map((item: any) => (
               <button
                 key={item.label}
                 onClick={() => item.action ? item.action() : setLog({...log, [item.key]: !item.val})}
                 className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                   item.val 
                   ? 'bg-red-50 border-red-500 text-red-700 shadow-sm' 
                   : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                 }`}
               >
                 <span className="text-sm font-semibold">{item.label}</span>
                 {item.val && <AlertCircle size={16} />}
               </button>
             ))}
           </div>
        </div>

        {/* Visual Symptoms Upload */}
        <div>
           <label className="font-bold text-slate-700 block mb-3">Visual Symptoms (Optional)</label>
           {!previewUrl ? (
              <label className="flex items-center gap-3 w-full p-4 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors group">
                  <div className="bg-indigo-50 text-indigo-500 p-2.5 rounded-lg group-hover:bg-indigo-100 transition-colors">
                    <Camera size={20} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-gray-600 block">Add Photo</span>
                    <span className="text-xs text-gray-400">Upload image of injury, stool, or skin issue for AI analysis</span>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
           ) : (
              <div className="relative rounded-xl overflow-hidden border border-gray-200 h-40 w-full bg-gray-50">
                  <img src={previewUrl} alt="Symptom" className="w-full h-full object-contain" />
                  <button 
                    onClick={() => { setPreviewUrl(null); setImageFile(null); }}
                    className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70"
                  >
                    <X size={14} />
                  </button>
              </div>
           )}
        </div>

        {/* Symptoms Grid */}
        <div>
          <label className="font-bold text-slate-700 block mb-3">Other Symptoms</label>
          <div className="flex flex-wrap gap-2">
            {SYMPTOMS_LIST.map(sym => (
              <button
                key={sym}
                onClick={() => toggleSymptom(sym)}
                className={`px-4 py-2 rounded-full text-xs font-bold border transition-colors ${
                  log.symptoms.includes(sym)
                    ? 'bg-purple-50 border-purple-500 text-purple-700'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>

        {/* Notes with Audio Input */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="font-bold text-slate-700">Detailed Notes & Observations</label>
            <button
               onClick={toggleRecording}
               disabled={isProcessingAudio}
               className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  isRecording 
                  ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
               }`}
            >
               {isProcessingAudio ? <Loader2 size={12} className="animate-spin" /> : <Mic size={12} />}
               {isRecording ? 'Stop Recording' : isProcessingAudio ? 'Transcribing...' : 'Record Voice Note'}
            </button>
          </div>
          <textarea 
            className="w-full p-4 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-paws-500 focus:outline-none bg-gray-50"
            rows={3}
            placeholder="Describe stool quality, mood changes, or specific behaviors..."
            value={log.notes}
            onChange={(e) => setLog({...log, notes: e.target.value})}
          />
        </div>

        <button 
          onClick={handleAnalysis}
          disabled={loading || isRecording}
          className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-xl shadow-slate-200 hover:shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-3"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Stethoscope size={20} />}
          {loading ? 'Consulting Gemini...' : 'Analyze Health Risk'}
        </button>
      </div>

      {/* AI Analysis Result */}
      {analysis && (
        <div className="bg-white border border-indigo-100 rounded-3xl p-6 shadow-xl shadow-indigo-50 animate-fade-in relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
          <div className="flex items-start gap-3 mb-6">
             <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600">
               <Activity size={24} />
             </div>
             <div>
               <h3 className="font-bold text-xl text-indigo-950">Gemini Assessment</h3>
               <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wide">Veterinary Triage Assistant</p>
             </div>
          </div>
          
          <div className="prose prose-sm prose-indigo max-w-none text-slate-600 bg-indigo-50/50 p-4 rounded-xl">
             {/* Simple formatting for markdown-like output */}
            {analysis.split('\n').map((line, i) => (
              <p key={i} className={`mb-1 ${line.startsWith('##') ? 'font-bold text-lg text-indigo-900 mt-4' : ''} ${line.startsWith('**Urgency') ? 'text-red-600 font-bold' : ''}`}>
                {line.replace(/##/g, '').replace(/\*\*/g, '')}
              </p>
            ))}
          </div>
          
          <div className="mt-6 flex items-start gap-3 bg-amber-50 p-4 rounded-xl border border-amber-100">
             <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
             <p className="text-xs text-amber-800 leading-relaxed">
               <strong>Legal Disclaimer:</strong> This AI analysis utilizes Google Gemini logic but is not a substitute for professional veterinary care. If symptoms worsen, proceed to a clinic immediately.
             </p>
          </div>

          {/* Save to History Button */}
          {onUpdateDog && (
             <button 
               onClick={handleSaveToHistory}
               disabled={isSaving}
               className={`mt-4 w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
                   isSaving 
                   ? 'bg-green-600 text-white shadow-green-200' 
                   : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
               }`}
             >
               {isSaving ? <CheckCircle size={18} /> : <FilePlus size={18} />}
               {isSaving ? 'Saved to Medical Records' : 'Save to Medical History'}
             </button>
          )}
        </div>
      )}
    </div>
  );
};
