
import React, { useState, useEffect } from 'react';
import { Dog, DogType } from '../types';
import { ArrowLeft, Camera, Home, Trees, Check, X, MapPin, Loader2, Link as LinkIcon, ImagePlus } from 'lucide-react';

interface Props {
  onBack: () => void;
  onSave: (dog: Dog) => void;
  initialData?: Dog | null;
}

// Helper to resize image before converting to Base64
// Reduced max dimensions to 500x500 to ensure payload fits in standard DB text columns and network requests
const resizeImage = (file: File, maxWidth: number = 500, maxHeight: number = 500): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Compress to JPEG with 0.7 quality for smaller payload
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const AddDogForm: React.FC<Props> = ({ onBack, onSave, initialData }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: DogType.PET,
    gender: 'Male' as 'Male' | 'Female' | 'Unknown',
    breed: '',
    age: '',
    weight: '',
    isSterilized: false,
    location: '',
    personality: '',
    imageUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=500' // Better default
  });
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number} | undefined>(undefined);

  // Initialize form if editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        type: initialData.type,
        gender: initialData.sex,
        breed: initialData.breed,
        age: (initialData.age !== undefined && initialData.age !== null) ? initialData.age.toString() : '0',
        weight: (initialData.weight !== undefined && initialData.weight !== null) ? initialData.weight.toString() : '0',
        isSterilized: initialData.isSterilized,
        location: initialData.location || '',
        personality: initialData.personality ? initialData.personality.join(', ') : '',
        imageUrl: initialData.imageUrl
      });
      setPreviewUrl(initialData.imageUrl);
      setCoordinates(initialData.coordinates);
    }
  }, [initialData]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsProcessingImage(true);
      const file = e.target.files[0];
      
      try {
        // Resize and compress image
        const resizedBase64 = await resizeImage(file);
        setPreviewUrl(resizedBase64);
        setFormData(prev => ({ ...prev, imageUrl: resizedBase64 }));
      } catch (error) {
        console.error("Image processing failed", error);
        alert("Failed to process image. Please try another one.");
      } finally {
        setIsProcessingImage(false);
      }
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoordinates({ lat: latitude, lng: longitude });
        setFormData(prev => ({
          ...prev,
          location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
        }));
        setIsGettingLocation(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Unable to retrieve your location. Please ensure location permissions are enabled.");
        setIsGettingLocation(false);
      }
    );
  };

  const handleSubmit = () => {
    if (!formData.name) {
      alert("Please enter a name for the dog.");
      return;
    }

    if (isProcessingImage) {
      alert("Please wait for the image to finish processing.");
      return;
    }

    const updatedDog: Dog = {
      id: initialData ? initialData.id : Date.now().toString(),
      name: formData.name,
      breed: formData.breed || 'Unknown Mix',
      age: parseInt(formData.age) || 0,
      sex: formData.gender,
      weight: parseFloat(formData.weight) || 0,
      type: formData.type,
      imageUrl: formData.imageUrl,
      isSterilized: formData.isSterilized,
      location: formData.location,
      coordinates: coordinates,
      personality: formData.personality.split(',').map(s => s.trim()).filter(s => s),
      medicalHistory: initialData ? initialData.medicalHistory : [],
      reminders: initialData ? initialData.reminders : []
    };

    onSave(updatedDog);
  };

  // Determine what to show in the URL input
  const displayUrl = formData.imageUrl.startsWith('data:') 
    ? '(Image Data Uploaded)' 
    : formData.imageUrl;

  return (
    <div className="pb-24 animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
         <button onClick={onBack} className="p-2 bg-white rounded-full shadow-sm text-gray-600 hover:text-gray-900 transition-colors">
           <ArrowLeft size={20} />
         </button>
         <h1 className="text-lg font-bold text-slate-800">{initialData ? 'Edit Profile' : 'Add New Profile'}</h1>
         <div className="w-9"></div> {/* Spacer for alignment */}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden p-6 md:p-8">
        
        {/* Photo Upload */}
        <div className="flex justify-center mb-6">
          <label className="relative cursor-pointer group">
            <div className={`w-32 h-32 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center bg-gray-50 overflow-hidden transition-colors group-hover:bg-gray-100 ${previewUrl ? 'border-none' : ''}`}>
               {isProcessingImage ? (
                 <div className="flex flex-col items-center text-gray-400">
                    <Loader2 size={24} className="animate-spin mb-2" />
                    <span className="text-[10px] font-bold">Compressing...</span>
                 </div>
               ) : previewUrl ? (
                 <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
               ) : (
                 <>
                   <ImagePlus className="text-gray-400 mb-2" size={24} />
                   <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Add Photo</span>
                 </>
               )}
            </div>
            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            {previewUrl && !isProcessingImage && (
              <div className="absolute -bottom-2 -right-2 bg-slate-800 text-white p-2 rounded-full shadow-md">
                <Camera size={14} />
              </div>
            )}
          </label>
        </div>
        
        {/* Image URL Input (Fallback/Direct) */}
        <div className="mb-8">
            <div className="relative">
              <LinkIcon className="absolute top-3 left-3 text-gray-400" size={16} />
              <input 
                type="text"
                value={displayUrl}
                onChange={(e) => {
                    const val = e.target.value;
                    // Only allow editing if it's not a placeholder for base64
                    if (val !== '(Image Data Uploaded)') {
                       setFormData(prev => ({ ...prev, imageUrl: val }));
                       if (!isProcessingImage) setPreviewUrl(val);
                    } else {
                       // If they try to edit the placeholder, clear it
                       setFormData(prev => ({ ...prev, imageUrl: '' }));
                       setPreviewUrl(null);
                    }
                }}
                placeholder="Or paste an Image URL (e.g. Unsplash)"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pl-10 text-xs focus:outline-none focus:ring-2 focus:ring-paws-500 transition-shadow text-gray-600"
              />
              {formData.imageUrl.startsWith('data:') && (
                 <button 
                   onClick={() => {
                      setFormData(prev => ({ ...prev, imageUrl: '' }));
                      setPreviewUrl(null);
                   }}
                   className="absolute right-3 top-3 text-gray-400 hover:text-red-500"
                 >
                   <X size={16} />
                 </button>
              )}
            </div>
            <p className="text-[10px] text-gray-400 mt-2 text-center">
               Tip: Images are automatically resized for faster loading. Pasting a URL is also supported.
            </p>
        </div>

        <div className="space-y-6">
          
          {/* Dog Type */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Dog Type</label>
            <div className="flex gap-4">
               <button 
                 onClick={() => setFormData(prev => ({...prev, type: DogType.PET}))}
                 className={`flex-1 p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${
                   formData.type === DogType.PET 
                   ? 'border-orange-500 bg-orange-50 text-orange-700 font-bold shadow-sm' 
                   : 'border-gray-100 bg-white text-gray-500 hover:bg-gray-50'
                 }`}
               >
                 <Home size={18} /> Pet
               </button>
               <button 
                 onClick={() => setFormData(prev => ({...prev, type: DogType.STRAY}))}
                 className={`flex-1 p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${
                   formData.type === DogType.STRAY
                   ? 'border-green-500 bg-green-50 text-green-700 font-bold shadow-sm' 
                   : 'border-gray-100 bg-white text-gray-500 hover:bg-gray-50'
                 }`}
               >
                 <Trees size={18} /> Community/Stray
               </button>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Name *</label>
            <input 
              type="text"
              value={formData.name}
              onChange={(e) => {
                 const val = e.target.value;
                 setFormData(prev => ({...prev, name: val}));
              }}
              placeholder="Enter dog's name"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-paws-500 transition-shadow"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3">Gender</label>
            <div className="flex gap-6">
               {['Male', 'Female', 'Unknown'].map((g) => (
                 <label key={g} className="flex items-center gap-2 cursor-pointer group">
                   <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.gender === g ? 'border-paws-500' : 'border-gray-300 group-hover:border-gray-400'}`}>
                      {formData.gender === g && <div className="w-2.5 h-2.5 bg-paws-500 rounded-full" />}
                   </div>
                   <span className={`text-sm ${formData.gender === g ? 'font-bold text-slate-800' : 'text-gray-500'}`}>{g}</span>
                   <input 
                      type="radio" 
                      name="gender" 
                      className="hidden" 
                      checked={formData.gender === g} 
                      onChange={() => setFormData(prev => ({...prev, gender: g as any}))} 
                   />
                 </label>
               ))}
            </div>
          </div>

          {/* Breed & Age */}
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Breed</label>
                <input 
                  type="text"
                  value={formData.breed}
                  onChange={(e) => {
                     const val = e.target.value;
                     setFormData(prev => ({...prev, breed: val}));
                  }}
                  placeholder="e.g. Indie, Lab"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-paws-500 transition-shadow"
                />
             </div>
             <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Approx. Age</label>
                <input 
                  type="number"
                  value={formData.age}
                  onChange={(e) => {
                     const val = e.target.value;
                     setFormData(prev => ({...prev, age: val}));
                  }}
                  placeholder="e.g. 2 years"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-paws-500 transition-shadow"
                />
             </div>
          </div>

          {/* Weight */}
          <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Weight (kg)</label>
              <input 
                type="number"
                value={formData.weight}
                onChange={(e) => {
                   const val = e.target.value;
                   setFormData(prev => ({...prev, weight: val}));
                }}
                placeholder="e.g. 15"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-paws-500 transition-shadow"
              />
          </div>

          {/* Sterilized Toggle */}
          <div className="flex items-center justify-between py-2">
             <label className="text-sm font-bold text-slate-700">Sterilized / Neutered</label>
             <button 
               onClick={() => setFormData(prev => ({...prev, isSterilized: !formData.isSterilized}))}
               className={`w-12 h-7 rounded-full transition-colors relative ${formData.isSterilized ? 'bg-green-500' : 'bg-gray-200'}`}
             >
                <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-1 transition-transform ${formData.isSterilized ? 'left-6' : 'left-1'}`}></div>
             </button>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Location / Geo Zone</label>
            <div className="relative">
              <input 
                type="text"
                value={formData.location}
                onChange={(e) => {
                   const val = e.target.value;
                   setFormData(prev => ({...prev, location: val}));
                }}
                placeholder="e.g. Lane 3, South Block"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pr-28 text-sm focus:outline-none focus:ring-2 focus:ring-paws-500 transition-shadow"
              />
              <button 
                onClick={handleGetLocation}
                disabled={isGettingLocation}
                className="absolute right-2 top-1.5 bg-paws-50 text-paws-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-paws-100 flex items-center gap-1 disabled:opacity-50"
              >
                {isGettingLocation ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />}
                {isGettingLocation ? 'Locating...' : 'Use GPS'}
              </button>
            </div>
          </div>

          {/* Personality */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Personality Notes</label>
            <textarea 
              value={formData.personality}
              onChange={(e) => {
                 const val = e.target.value;
                 setFormData(prev => ({...prev, personality: val}));
              }}
              placeholder="Describe their personality, behavior patterns..."
              rows={3}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-paws-500 transition-shadow resize-none"
            />
          </div>

          {/* Submit */}
          <div className="pt-4">
             <button 
               onClick={handleSubmit}
               disabled={isProcessingImage}
               className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-black hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {isProcessingImage ? <Loader2 className="animate-spin" /> : <Check size={20} />}
               {initialData ? 'Update Profile' : 'Save Profile'}
             </button>
          </div>

        </div>
      </div>
    </div>
  );
};
