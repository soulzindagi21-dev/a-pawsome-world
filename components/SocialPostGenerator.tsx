import React, { useState, useEffect } from 'react';
import { AchievementContext } from '../types';
import { generateAchievementImage, generateSocialCaption } from '../geminiService';
import { ArrowLeft, Share2, Download, Sparkles, Loader2, Key } from 'lucide-react';

interface Props {
  context: AchievementContext;
  onBack: () => void;
}

export const SocialPostGenerator: React.FC<Props> = ({ context, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState<string>('');
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    checkKey();
  }, []);

  const checkKey = async () => {
    const aiStudio = (window as any).aistudio;
    if (aiStudio) {
      const selected = await aiStudio.hasSelectedApiKey();
      setHasKey(selected);
    }
  };

  const handleSelectKey = async () => {
    const aiStudio = (window as any).aistudio;
    if (aiStudio) {
      await aiStudio.openSelectKey();
      await checkKey();
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    
    try {
      // Fix: API key injection handled by environment, removed manual passing
      const [img, cap] = await Promise.all([
        generateAchievementImage(context),
        generateSocialCaption(context)
      ]);
      setGeneratedImage(img);
      setCaption(cap);
    } catch (e) {
      console.error(e);
      alert("Generation failed. Please ensure you have selected a valid API Key.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
       {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft size={20} className="mr-1" /> Back
        </button>
        <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
           Achievement Studio
        </h1>
      </div>

      {!generatedImage ? (
        <div className="bg-white rounded-3xl p-8 text-center shadow-lg border border-purple-100 flex flex-col items-center justify-center min-h-[400px]">
           <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner">
             {context.achievement.icon}
           </div>
           
           <h2 className="text-2xl font-extrabold text-slate-800 mb-2">{context.achievement.title}</h2>
           <p className="text-slate-500 max-w-xs mx-auto mb-8">{context.achievement.description}</p>

           {!hasKey ? (
             <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl max-w-sm w-full mb-6">
                <p className="text-xs text-amber-800 font-bold mb-3">
                  High-Quality Image Generation (Gemini 3 Pro) requires a paid API Key.
                </p>
                <button 
                  onClick={handleSelectKey}
                  className="w-full bg-amber-500 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-amber-600 transition-colors"
                >
                  <Key size={16} /> Select API Key
                </button>
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="block text-[10px] text-amber-600 mt-2 underline">
                  Billing Information
                </a>
             </div>
           ) : (
             <button
               onClick={handleGenerate}
               disabled={loading}
               className="w-full max-w-xs bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 rounded-xl shadow-xl shadow-purple-200 hover:shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-2"
             >
               {loading ? <Loader2 className="animate-spin" /> : <Sparkles fill="white" />}
               {loading ? 'Creating Masterpiece...' : 'Generate Celebration Post'}
             </button>
           )}
           
           <p className="text-[10px] text-gray-400 mt-4">Powered by Gemini 3 Pro</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-100 animate-fade-in">
           {/* Image Preview */}
           <div className="aspect-square bg-gray-100 relative">
              <img src={generatedImage} alt="Achievement" className="w-full h-full object-cover" />
              <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-slate-800 shadow-sm">
                 Generated with Gemini
              </div>
           </div>

           {/* Caption Editor */}
           <div className="p-6 space-y-4">
              <label className="text-xs font-bold text-gray-500 uppercase">Caption Draft</label>
              <textarea 
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full p-4 bg-gray-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-purple-200 font-medium text-slate-700"
                rows={4}
              />

              <div className="grid grid-cols-2 gap-3 pt-2">
                 <button className="bg-gray-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                    <Download size={18} /> Save
                 </button>
                 <button className="bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-200">
                    <Share2 size={18} /> Share
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};