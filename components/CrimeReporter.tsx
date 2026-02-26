import React, { useState } from 'react';
import { analyzeCrimeReport, fileToGenerativePart } from '../geminiService';
import { ShieldAlert, ArrowLeft, Loader2, Camera, AlertOctagon } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export const CrimeReporter: React.FC<Props> = ({ onBack }) => {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{assessment: string, isCruelty: boolean, severity: string} | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleSubmit = async () => {
    if (!description) return;
    setLoading(true);
    
    let base64 = undefined;
    if (imageFile) {
      const part = await fileToGenerativePart(imageFile);
      base64 = part.inlineData.data;
    }

    const aiResult = await analyzeCrimeReport(description, base64);
    setResult(aiResult);
    setLoading(false);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft size={20} className="mr-1" /> Exit
        </button>
        <span className="text-sm font-bold text-red-600 flex items-center gap-1">
          <ShieldAlert size={16} /> Confidential Report
        </span>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
        <AlertOctagon className="text-red-600 shrink-0" />
        <div className="text-xs text-red-800">
          <strong className="block mb-1">Safety First</strong>
          Do not intervene in dangerous situations. Do not put yourself at risk to gather evidence. This tool helps format reports for authorities; it does not replace calling 911/100.
        </div>
      </div>

      {!result ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
          <h2 className="text-xl font-bold">Report an Incident</h2>
          
          <div>
            <label className="block text-sm font-semibold mb-2">What happened?</label>
            <textarea 
              className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none min-h-[120px]"
              placeholder="Describe the incident, location, and animals involved..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
             <label className="block text-sm font-semibold mb-2">Evidence (Optional)</label>
             <label className="flex items-center gap-2 border border-gray-200 rounded-xl p-3 cursor-pointer hover:bg-gray-50">
               <Camera className="text-gray-400" />
               <span className="text-sm text-gray-500">{imageFile ? imageFile.name : 'Upload Photo/Video'}</span>
               <input type="file" className="hidden" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
             </label>
          </div>

          <button 
            onClick={handleSubmit}
            disabled={loading || !description}
            className="w-full bg-red-600 text-white py-4 rounded-xl font-bold shadow-md hover:bg-red-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : <ShieldAlert />}
            Analyze & Generate Report
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className={`p-4 text-white font-bold flex justify-between items-center ${result.isCruelty ? 'bg-red-600' : 'bg-gray-600'}`}>
            <span>Analysis Complete</span>
            <span className="text-xs bg-white/20 px-2 py-1 rounded">Severity: {result.severity}</span>
          </div>
          
          <div className="p-6 space-y-4">
             <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-800 whitespace-pre-line border-l-4 border-red-400">
               {result.assessment}
             </div>

             <div className="pt-4 border-t border-gray-100">
               <h3 className="font-bold mb-2 text-sm">Next Steps</h3>
               <button className="w-full border border-gray-300 py-3 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 text-sm mb-2">
                 Download Official PDF Format
               </button>
               <button className="w-full bg-blue-600 py-3 rounded-lg font-semibold text-white hover:bg-blue-700 text-sm">
                 Find Nearest NGO/Authorities
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
