
import React, { useState, useRef } from 'react';
import { Camera, CheckCircle, XCircle, ArrowLeft, Loader2, Upload, MapPin } from 'lucide-react';
import { verifyFeedingProof, fileToGenerativePart } from '../geminiService';

interface Props {
  onBack: () => void;
  onSuccess: () => void;
}

export const FeedingProofUpload: React.FC<Props> = ({ onBack, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ isValid: boolean; reason: string } | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const getGeolocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true }
      );
    });
  };

  const overlayTextOnImage = (imageSrc: string, lat: number, lng: number): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Add semi-transparent overlay at bottom
        const overlayHeight = canvas.height * 0.15;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, canvas.height - overlayHeight, canvas.width, overlayHeight);

        // Add text
        ctx.fillStyle = 'white';
        const fontSize = Math.max(20, Math.floor(canvas.width / 30));
        ctx.font = `bold ${fontSize}px sans-serif`;
        
        const timestamp = new Date().toLocaleString();
        const locationText = `📍 Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
        
        ctx.fillText(locationText, 20, canvas.height - overlayHeight + fontSize + 10);
        ctx.font = `${fontSize * 0.8}px sans-serif`;
        ctx.fillText(timestamp, 20, canvas.height - 20);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/jpeg', 0.9);
      };
      img.src = imageSrc;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setLoading(true);
      try {
        const coords = await getGeolocation();
        setLocation(coords);
        
        const originalPreview = URL.createObjectURL(f);
        const geotaggedBlob = await overlayTextOnImage(originalPreview, coords.lat, coords.lng);
        const geotaggedFile = new File([geotaggedBlob], `geotagged_${f.name}`, { type: 'image/jpeg' });
        
        setFile(geotaggedFile);
        setPreview(URL.createObjectURL(geotaggedBlob));
        setResult(null);
      } catch (err) {
        console.error("Geolocation or processing error:", err);
        // Fallback to original file if geolocation fails
        setFile(f);
        setPreview(URL.createObjectURL(f));
        alert("Could not get location. Image will be uploaded without geotag.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleVerify = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const part = await fileToGenerativePart(file);
      const verification = await verifyFeedingProof(part.inlineData.data);
      setResult(verification);
      if (verification.isValid) {
        setTimeout(onSuccess, 3000); // Wait 3s then trigger success callback
      }
    } catch (e) {
      setResult({ isValid: false, reason: "Upload failed. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
       {/* Header */}
       <div className="flex items-center gap-3">
         <button onClick={onBack} className="p-2 bg-white rounded-full text-gray-500 hover:text-gray-900 shadow-sm">
           <ArrowLeft size={20} />
         </button>
         <h1 className="text-xl font-bold text-slate-800">Upload Feeding Proof</h1>
       </div>

       <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100">
          <div className="mb-6 text-center">
             <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-600">
               <Camera size={32} />
             </div>
             <h2 className="text-lg font-bold text-slate-800">Show Us Your Care</h2>
             <p className="text-sm text-gray-500 max-w-xs mx-auto mt-2">
               Upload a photo of you feeding a community dog or filling water bowls. AI will verify it to update your streak.
             </p>
          </div>

          {!preview ? (
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:bg-gray-50 transition-colors">
               <Upload className="text-gray-400 mb-2" />
               <span className="text-sm font-bold text-gray-500">Tap to Upload Photo</span>
               <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
            </label>
          ) : (
            <div className="relative rounded-2xl overflow-hidden border border-gray-200">
               <img src={preview} alt="Proof" className="w-full h-64 object-cover" />
               {!loading && !result && (
                 <button 
                   onClick={() => { setFile(null); setPreview(null); }}
                   className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                 >
                   <XCircle size={20} />
                 </button>
               )}
            </div>
          )}

          {result && (
             <div className={`mt-4 p-4 rounded-xl flex items-start gap-3 ${result.isValid ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {result.isValid ? <CheckCircle className="shrink-0" /> : <XCircle className="shrink-0" />}
                <div>
                   <h3 className="font-bold">{result.isValid ? 'Verification Successful!' : 'Verification Failed'}</h3>
                   <p className="text-xs mt-1">{result.reason}</p>
                   {result.isValid && <p className="text-xs font-bold mt-2">Streak Updated! Redirecting...</p>}
                </div>
             </div>
          )}

          {preview && !result && (
             <button
               onClick={handleVerify}
               disabled={loading}
               className="w-full mt-6 bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
             >
               {loading ? <Loader2 className="animate-spin" /> : <CheckCircle />}
               {loading ? 'Verifying with AI...' : 'Submit Proof'}
             </button>
          )}
       </div>
    </div>
  );
};
