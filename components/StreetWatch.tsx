import React, { useState, useEffect, useRef } from 'react';
import { MAP_STYLE } from '../constants';
import { MapPin, Eye, Search, AlertTriangle, Info, Shield, Camera, Stethoscope, ArrowLeft, CheckCircle, Target, Truck, AlertOctagon, Navigation, Globe, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { matchStrayDog, fileToGenerativePart, searchLocalDogServices } from '../geminiService';
import { Dog, DogType } from '../types';

declare global {
  interface Window {
    google: any;
  }
}

// Mock markers for demo
const NEARBY_ALERTS = [
  { id: 1, type: 'STRAY', latOffset: 0.001, lngOffset: -0.001, title: 'New Stray Sighted', desc: 'Baker St. Lane 2' },
  { id: 2, type: 'INJURY', latOffset: -0.001, lngOffset: 0.002, title: 'Possible Injury', desc: 'Main Market' }
];

interface Props {
  dogs?: Dog[];
}

export const StreetWatch: React.FC<Props> = ({ dogs = [] }) => {
  const [activeTab, setActiveTab] = useState<'MAP' | 'MISSING' | 'REPORT' | 'EXPLORE'>('MAP');
  const [matchResult, setMatchResult] = useState<string | null>(null);
  const [features, setFeatures] = useState<{ label: string; box_2d: number[] }[]>([]);
  const [isMatching, setIsMatching] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Maps Grounding State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingLocal, setIsSearchingLocal] = useState(false);
  const [groundedResults, setGroundedResults] = useState<{ text: string, links: any[] } | null>(null);

  // Map State
  const mapRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any[]>([]); // Track markers to clear them
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  // Report Form State
  const [reportView, setReportView] = useState<'MENU' | 'INJURY_FORM' | 'NEW_STRAY_FORM' | 'ILLEGAL_PICKUP_FORM'>('MENU');
  const [formState, setFormState] = useState({
    location: '',
    description: '',
    isUrgent: false,
    vehicleNo: '',
    dogCount: '',
    behavior: 'Scared' as 'Scared' | 'Friendly' | 'Aggressive',
    image: null as string | null
  });
  const [showSuccess, setShowSuccess] = useState(false);

  // Load Google Maps Script using import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (activeTab === 'MAP' && apiKey) {
      if (!window.google) {
        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
        if (!existingScript) {
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
          script.async = true;
          script.defer = true;
          script.onload = () => {
            // Small delay to ensure DOM is ready and mapRef is populated
            setTimeout(initMap, 100);
          };
          script.onerror = () => setMapError("Failed to load Google Maps API");
          document.head.appendChild(script);
        } else {
          // Script is loading, wait for it
          existingScript.addEventListener('load', () => setTimeout(initMap, 100));
        }
      } else {
        // Already loaded
        setTimeout(initMap, 100);
      }
    }
  }, [activeTab]);

  // Update markers when dogs change
  useEffect(() => {
    if (mapInstance && window.google) {
       addDogMarkers(mapInstance);
    }
  }, [dogs, mapInstance]);

  const clearMarkers = () => {
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
  };

  const handleReportSubmit = () => {
    if (!formState.location || !formState.description) {
      alert("Please provide both a location and a description for your report.");
      return;
    }

    setShowSuccess(true);
    setFormState({
      location: '',
      description: '',
      isUrgent: false,
      vehicleNo: '',
      dogCount: '',
      behavior: 'Scared',
      image: null
    });
  };

  const addDogMarkers = (map: any) => {
    if (!window.google || !window.google.maps) return;

    clearMarkers();

    dogs.forEach(dog => {
      if (dog.coordinates && typeof dog.coordinates.lat === 'number' && typeof dog.coordinates.lng === 'number') {
        
        const isStray = dog.type === DogType.STRAY;
        const color = isStray ? "#f97316" : "#14b8a6"; 

        try {
          const marker = new window.google.maps.Marker({
            position: dog.coordinates,
            map: map,
            title: dog.name,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 7,
              fillColor: color,
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: "white",
            },
          });

          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="padding:4px; text-align:center;">
                <strong style="font-size:14px; color:#1e293b;">${dog.name}</strong>
                <br/>
                <span style="font-size:10px; color:#64748b;">${dog.breed}</span>
                <br/>
                <span style="font-size:9px; font-weight:bold; color:${color}; border:1px solid ${color}; padding:1px 4px; border-radius:4px; margin-top:2px; display:inline-block;">
                  ${isStray ? 'COMMUNITY' : 'PET'}
                </span>
              </div>
            `
          });

          marker.addListener("click", () => {
            infoWindow.open(map, marker);
          });

          markersRef.current.push(marker);
        } catch (e) {
          console.warn("Failed to create marker for dog", dog.name, e);
        }
      }
    });
  };

  const initMap = () => {
    if (!mapRef.current || !window.google || !window.google.maps) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(pos);
          loadMap(pos);
        },
        () => {
          const defaultPos = { lat: 19.0760, lng: 72.8777 }; 
          loadMap(defaultPos);
        }
      );
    } else {
      const defaultPos = { lat: 19.0760, lng: 72.8777 };
      loadMap(defaultPos);
    }
  };

  const loadMap = (center: { lat: number, lng: number }) => {
    if (!window.google || !window.google.maps || !mapRef.current) return;
    
    const styles = [
      { "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }] },
      { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
      { "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
      { "elementType": "labels.text.stroke", "stylers": [{ "color": "#f5f5f5" }] },
      { "featureType": "administrative.land_parcel", "elementType": "labels.text.fill", "stylers": [{ "color": "#bdbdbd" }] },
      { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
      { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
      { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#e5e5e5" }] },
      { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] },
      { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
      { "featureType": "road.arterial", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
      { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#dadada" }] },
      { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
      { "featureType": "road.local", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] },
      { "featureType": "transit.line", "elementType": "geometry", "stylers": [{ "color": "#e5e5e5" }] },
      { "featureType": "transit.station", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
      { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#c9c9c9" }] },
      { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] }
    ];

    try {
        const map = new window.google.maps.Map(mapRef.current, {
          center: center,
          zoom: 15,
          styles: styles,
          disableDefaultUI: true,
          zoomControl: true,
        });

        setMapInstance(map);

        new window.google.maps.Marker({
          position: center,
          map: map,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#3b82f6",
            fillOpacity: 1,
            strokeColor: "white",
            strokeWeight: 2,
          },
          title: "You are here"
        });

        NEARBY_ALERTS.forEach(alert => {
          const position = {
            lat: center.lat + alert.latOffset,
            lng: center.lng + alert.lngOffset
          };

          const color = alert.type === 'INJURY' ? '#ef4444' : '#f59e0b';

          new window.google.maps.Circle({
            strokeColor: color,
            strokeOpacity: 0.8,
            strokeWeight: 1,
            fillColor: color,
            fillOpacity: 0.15,
            map,
            center: position,
            radius: 150,
          });

          const marker = new window.google.maps.Marker({
            position: position,
            map: map,
            title: alert.title,
            icon: {
                path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                scale: 6,
                fillColor: color,
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: "white"
            }
          });

          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="padding:6px;">
                <strong style="font-size:14px; color:#1e293b;">${alert.title}</strong>
                <br/>
                <span style="font-size:12px; color:#64748b;">${alert.desc}</span>
                <br/>
                <span style="font-size:10px; color:${color}; font-weight:bold; text-transform:uppercase; margin-top:4px; display:inline-block;">
                  ${alert.type} ALERT
                </span>
              </div>
            `
          });

          marker.addListener("click", () => {
            infoWindow.open(map, marker);
          });
        });

        addDogMarkers(map);
    } catch (e) {
        console.error("Map initialization failed", e);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      
      if (activeTab === 'MISSING') {
        setPreviewUrl(url);
        setIsMatching(true);
        setMatchResult(null);
        setFeatures([]);
        
        try {
            const base64Part = await fileToGenerativePart(file);
            const result = await matchStrayDog(base64Part.inlineData.data);
            
            setMatchResult(result.text);
            setFeatures(result.features);
        } catch(e) {
            setMatchResult("Analysis failed. Please try again.");
        } finally {
            setIsMatching(false);
        }
      } else {
        setFormState(prev => ({ ...prev, image: url }));
      }
    }
  };

  const handleLocalSearch = async (queryOverride?: string) => {
    const q = queryOverride || searchQuery;
    if (!q) return;

    setIsSearchingLocal(true);
    setGroundedResults(null);

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      const result = await searchLocalDogServices(q, latitude, longitude);
      setGroundedResults(result);
      setIsSearchingLocal(false);
    }, (error) => {
      console.error("Location error", error);
      setGroundedResults({ text: "Please enable geolocation to search for nearby services.", links: [] });
      setIsSearchingLocal(false);
    });
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-x-auto no-scrollbar">
        {[
          { id: 'MAP', label: 'Live Map' },
          { id: 'MISSING', label: 'Missing' },
          { id: 'REPORT', label: 'Report Stray' },
          { id: 'EXPLORE', label: 'AI Local' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
                setActiveTab(tab.id as any);
                setReportView('MENU');
                setPreviewUrl(null);
            }}
            className={`flex-1 py-3 text-[10px] sm:text-xs font-bold rounded-xl transition-all whitespace-nowrap px-4 ${
              activeTab === tab.id 
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md' 
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'MAP' && (
        <div className="relative animate-fade-in">
          <div className="rounded-2xl overflow-hidden shadow-lg border border-white dark:border-slate-700 relative bg-gray-200 dark:bg-slate-800" style={{ height: '400px' }}>
            {!import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? (
               <div className="h-full w-full flex flex-col items-center justify-center bg-gray-100 dark:bg-slate-800 p-8 text-center">
                  <MapPin size={48} className="text-gray-300 dark:text-slate-600 mb-4" />
                  <h3 className="font-bold text-gray-600 dark:text-slate-400">Google Maps Not Configured</h3>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-2 max-w-xs">Please add a valid VITE_GOOGLE_MAPS_API_KEY to enable the live map.</p>
               </div>
            ) : (
               <div ref={mapRef} className="w-full h-full" />
            )}
            
            {import.meta.env.VITE_GOOGLE_MAPS_API_KEY && (
              <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-white/50 dark:border-slate-700 text-[10px] space-y-2 w-32 z-10">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> You</div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div> Alert</div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Stray</div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-teal-500"></div> Pet</div>
              </div>
            )}
          </div>
          
          <div className="mt-4 bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
            <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-slate-800 dark:text-slate-100">Nearby Alerts</h3>
               <span className="text-[10px] bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-1 rounded-full font-bold animate-pulse">2 Active</span>
            </div>
            <ul className="space-y-4">
              <li className="flex gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 p-2 rounded-lg transition-colors" onClick={() => {
                   if(mapInstance && userLocation) {
                       mapInstance.panTo({ lat: userLocation.lat + NEARBY_ALERTS[0].latOffset, lng: userLocation.lng + NEARBY_ALERTS[0].lngOffset });
                       mapInstance.setZoom(17);
                   }
              }}>
                 <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-xl h-fit"><Eye size={18} className="text-blue-600 dark:text-blue-400"/></div>
                 <div className="border-b border-gray-100 dark:border-slate-700 pb-4 w-full last:border-0 last:pb-0">
                   <span className="font-bold block text-sm text-slate-800 dark:text-slate-100">New Stray Sighted</span>
                   <span className="text-xs text-gray-500 dark:text-slate-400 block mb-1">Baker St. Lane 2 • 10 mins ago</span>
                   <p className="text-xs text-slate-600 dark:text-slate-300">Brown indie, white paws. Seems scared.</p>
                 </div>
              </li>
              <li className="flex gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 p-2 rounded-lg transition-colors" onClick={() => {
                   if(mapInstance && userLocation) {
                       mapInstance.panTo({ lat: userLocation.lat + NEARBY_ALERTS[1].latOffset, lng: userLocation.lng + NEARBY_ALERTS[1].lngOffset });
                       mapInstance.setZoom(17);
                   }
              }}>
                 <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-xl h-fit"><AlertTriangle size={18} className="text-red-600 dark:text-red-400"/></div>
                 <div className="w-full">
                   <span className="font-bold block text-sm text-slate-800 dark:text-slate-100">Possible Injury</span>
                   <span className="text-xs text-gray-500 dark:text-slate-400 block mb-1">Main Market • 1 hour ago</span>
                   <button className="text-xs bg-red-600 dark:bg-red-700 text-white px-3 py-1.5 rounded-lg font-bold mt-1">View Details</button>
                 </div>
              </li>
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'EXPLORE' && (
        <div className="space-y-6 animate-fade-in">
           <div className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 border border-teal-100 dark:border-teal-800 p-6 rounded-2xl flex items-center gap-4">
             <div className="bg-white dark:bg-slate-800 p-3 rounded-full shadow-sm text-teal-600 dark:text-teal-400">
                <Globe size={24} />
             </div>
             <div>
               <h3 className="font-bold text-teal-900 dark:text-teal-100 text-lg">AI Local Explorer</h3>
               <p className="text-xs text-teal-700 dark:text-teal-400 mt-1">Find real-time information about nearby vets, pet shops, and shelters using Maps Grounding.</p>
             </div>
           </div>

           <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-2">
             {['24/7 Vets', 'Pet Pharmacies', 'Dog Parks', 'Animal Shelters'].map((chip) => (
                <button
                  key={chip}
                  onClick={() => {
                    setSearchQuery(chip);
                    handleLocalSearch(chip);
                  }}
                  className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-4 py-2 rounded-full text-xs font-bold text-gray-600 dark:text-slate-300 whitespace-nowrap hover:border-teal-500 hover:text-teal-600 transition-colors shadow-sm"
                >
                  {chip}
                </button>
             ))}
           </div>

           <div className="relative">
             <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLocalSearch()}
                placeholder="Search for something else (e.g. Pet Grooming)"
                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium dark:text-slate-100"
             />
             <div className="absolute top-4 left-4 text-gray-400">
                <Search size={20} />
             </div>
             <button
               onClick={() => handleLocalSearch()}
               disabled={isSearchingLocal || !searchQuery}
               className="absolute right-2 top-2 bg-teal-600 text-white p-2 rounded-xl shadow-md hover:bg-teal-700 transition-colors disabled:opacity-50"
             >
               {isSearchingLocal ? <Loader2 size={20} className="animate-spin" /> : <Navigation size={20} />}
             </button>
           </div>

           {groundedResults && (
             <div className="space-y-4 animate-fade-in">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl shadow-gray-100 dark:shadow-none border border-gray-100 dark:border-slate-700">
                   <div className="flex items-center gap-2 mb-4 text-teal-600 dark:text-teal-400">
                      <Sparkles size={18} />
                      <h4 className="font-bold text-sm">Grounded AI Analysis</h4>
                   </div>
                   <div className="prose prose-sm dark:prose-invert text-slate-600 dark:text-slate-300 leading-relaxed bg-teal-50/50 dark:bg-teal-900/10 p-4 rounded-xl border border-teal-50 dark:border-teal-900/30 mb-6">
                      {groundedResults.text.split('\n').map((line, i) => <p key={i} className="mb-2">{line}</p>)}
                   </div>

                   {groundedResults.links.length > 0 && (
                     <div>
                        <h5 className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3">Verified Sources</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                           {groundedResults.links.map((link, idx) => (
                              <a 
                                key={idx} 
                                href={link.uri} 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-100 dark:border-slate-700 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group"
                              >
                                 <div className="flex items-center gap-2">
                                    <MapPin size={14} className="text-teal-500" />
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-[150px]">{link.title}</span>
                                 </div>
                                 <ExternalLink size={12} className="text-gray-400 group-hover:text-teal-600" />
                              </a>
                           ))}
                        </div>
                     </div>
                   )}
                </div>
             </div>
           )}

           {!groundedResults && !isSearchingLocal && (
             <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-gray-400">
                   <Globe size={32} />
                </div>
                <h4 className="font-bold text-slate-400">Search Nearby</h4>
                <p className="text-xs text-gray-400 mt-2 max-w-[200px]">Use the bar above to find verified locations around you.</p>
             </div>
           )}
        </div>
      )}

      {activeTab === 'MISSING' && (
        <div className="space-y-6 animate-fade-in">
           <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-100 dark:border-amber-800 p-6 rounded-2xl flex items-center gap-4">
             <div className="bg-white dark:bg-slate-800 p-3 rounded-full shadow-sm text-amber-500">
                <Search size={24} />
             </div>
             <div>
               <h3 className="font-bold text-amber-900 dark:text-amber-100 text-lg">AI Stray Matcher</h3>
               <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">Found a dog? Upload a photo to check against our missing dog database using Gemini Vision.</p>
             </div>
           </div>

           {!previewUrl && (
             <label className="block w-full border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-3xl p-10 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-all group">
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                <div className="flex flex-col items-center gap-3 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-slate-300">
                   <Camera size={40} />
                   <span className="font-bold text-sm">Tap to upload photo</span>
                </div>
             </label>
           )}

           {previewUrl && (
             <div className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700 shadow-lg">
                <img src={previewUrl} alt="Analysis Target" className="w-full h-auto block" />
                {features.map((feature, idx) => {
                   const [ymin, xmin, ymax, xmax] = feature.box_2d;
                   const top = (ymin / 1000) * 100;
                   const left = (xmin / 1000) * 100;
                   const height = ((ymax - ymin) / 1000) * 100;
                   const width = ((xmax - xmin) / 1000) * 100;

                   return (
                     <div 
                        key={idx}
                        className="absolute border-2 border-blue-400 bg-blue-500/20 group"
                        style={{ top: `${top}%`, left: `${left}%`, height: `${height}%`, width: `${width}%` }}
                     >
                       <span className="absolute -top-6 left-0 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                         {feature.label}
                       </span>
                     </div>
                   );
                })}

                <button 
                  onClick={() => { setPreviewUrl(null); setMatchResult(null); setFeatures([]); }}
                  className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 backdrop-blur-sm"
                >
                  <ArrowLeft size={16} />
                </button>
             </div>
           )}

           {isMatching && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-4">
                 <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
                 Scanning features...
              </div>
           )}

           {matchResult && (
             <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl shadow-gray-100 dark:shadow-none border border-gray-100 dark:border-slate-700 animate-fade-in">
               <h4 className="font-bold mb-3 text-slate-800 dark:text-slate-100 flex items-center gap-2">
                 <Target size={18} className="text-blue-500" />
                 Identification Analysis
               </h4>
               
               {features.length > 0 && (
                 <div className="flex flex-wrap gap-2 mb-4">
                   {features.map((f, i) => (
                     <span key={i} className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-md border border-blue-100 dark:border-blue-800 font-bold">
                        {f.label}
                     </span>
                   ))}
                 </div>
               )}

               <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-gray-50 dark:bg-slate-700/50 p-4 rounded-xl border border-gray-100 dark:border-slate-700">
                  {matchResult}
               </p>
               
               <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                  <button className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 py-3 rounded-xl font-bold text-sm hover:bg-black dark:hover:bg-white transition-colors">
                    Search Database with these Filters
                  </button>
               </div>
             </div>
           )}
        </div>
      )}

      {activeTab === 'REPORT' && (
         <div className="animate-fade-in">
           {reportView === 'MENU' ? (
             <div className="space-y-4">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-xl flex gap-3">
                    <Info className="text-yellow-600 dark:text-yellow-400 shrink-0" />
                    <div className="text-xs text-yellow-800 dark:text-yellow-400">
                    <strong>Suspect Illegal Relocation?</strong>
                    <p>If you see dogs being rounded up by unverified vans, report specifically here.</p>
                    </div>
                </div>

                <button 
                    onClick={() => setReportView('INJURY_FORM')}
                    className="w-full py-5 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-2xl flex items-center justify-center gap-3 font-bold text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors shadow-sm"
                >
                    <div className="bg-orange-200 dark:bg-orange-800/50 p-2 rounded-full"><Stethoscope size={20} /></div>
                    Report Injured Stray
                </button>
                
                <button 
                    onClick={() => setReportView('NEW_STRAY_FORM')}
                    className="w-full py-5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl flex items-center justify-center gap-3 font-bold text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 shadow-sm"
                >
                    <div className="bg-gray-100 dark:bg-slate-700 p-2 rounded-full"><Eye size={20} /></div>
                    Report New Stray
                </button>
                
                <button 
                    onClick={() => setReportView('ILLEGAL_PICKUP_FORM')}
                    className="w-full py-5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl flex items-center justify-center gap-3 font-bold text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 shadow-sm"
                >
                    <div className="bg-red-200 dark:bg-red-800/50 p-2 rounded-full"><Shield size={20} /></div>
                    Report Illegal Pickup
                </button>
             </div>
           ) : (
             <div className="space-y-6">
                 <button 
                    onClick={() => setReportView('MENU')}
                    className="flex items-center text-gray-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-sm font-bold"
                 >
                    <ArrowLeft size={16} className="mr-1"/> Back to Options
                 </button>

                 <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-full h-1 ${
                        reportView === 'INJURY_FORM' ? 'bg-orange-500' : 
                        reportView === 'ILLEGAL_PICKUP_FORM' ? 'bg-red-500' : 'bg-blue-500'
                    }`}></div>
                    
                    {showSuccess ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center animate-fade-in">
                          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-6 shadow-sm">
                              <CheckCircle size={32} />
                          </div>
                          <h3 className="font-extrabold text-2xl text-slate-800 dark:text-slate-100 mb-2">Report Sent</h3>
                          <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto">Community volunteers and local authorities have been notified of this incident.</p>
                          <button 
                            onClick={() => { setShowSuccess(false); setReportView('MENU'); }}
                            className="mt-8 text-sm font-bold text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
                          >
                            Return to Menu
                          </button>
                      </div>
                    ) : (
                        <>
                             <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
                                 {reportView === 'INJURY_FORM' && <><Stethoscope className="text-orange-500" size={20}/> Injury Report</>}
                                 {reportView === 'NEW_STRAY_FORM' && <><Eye className="text-blue-500" size={20}/> New Stray Sighting</>}
                                 {reportView === 'ILLEGAL_PICKUP_FORM' && <><Shield className="text-red-500" size={20}/> Illegal Relocation</>}
                             </h2>
                             
                             <div className="space-y-4">
                                 <div>
                                     <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Location (Lane/Area)</label>
                                     <div className="relative">
                                        <MapPin className="absolute top-3 left-3 text-gray-400" size={16} />
                                        <input 
                                            type="text"
                                            value={formState.location}
                                            onChange={(e) => setFormState({...formState, location: e.target.value})}
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 text-slate-800 dark:text-slate-100"
                                            placeholder="e.g., Near South Market, Lane 3"
                                        />
                                     </div>
                                 </div>

                                 {reportView === 'ILLEGAL_PICKUP_FORM' && (
                                     <>
                                        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-800 text-xs text-red-800 dark:text-red-400 flex gap-2">
                                            <AlertTriangle size={16} className="shrink-0" />
                                            <p><strong>Do not intervene</strong> record from a safe distance.</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Vehicle Number / Desc</label>
                                            <div className="relative">
                                                <Truck className="absolute top-3 left-3 text-gray-400" size={16} />
                                                <input 
                                                    type="text"
                                                    value={formState.vehicleNo}
                                                    onChange={(e) => setFormState({...formState, vehicleNo: e.target.value})}
                                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-800 dark:text-slate-100"
                                                    placeholder="e.g., MH-12-AB-1234, White Van"
                                                />
                                            </div>
                                        </div>
                                     </>
                                 )}

                                 <div>
                                     <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                         {reportView === 'INJURY_FORM' ? 'Injury Details' : 'Narrative / Description'}
                                     </label>
                                     <textarea 
                                         value={formState.description}
                                         onChange={(e) => setFormState({...formState, description: e.target.value})}
                                         className="w-full p-4 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 text-slate-800 dark:text-slate-100"
                                         rows={3}
                                         placeholder="Provide more context..."
                                     />
                                 </div>

                                 <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Evidence / Photo</label>
                                    <label className="flex items-center gap-3 w-full p-3 border border-dashed border-gray-300 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                                        <div className="bg-gray-100 dark:bg-slate-700 p-2 rounded-lg text-gray-500 dark:text-slate-400"><Camera size={20} /></div>
                                        <span className="text-sm text-gray-500 dark:text-slate-400 font-medium truncate">
                                            {formState.image ? "Image Selected" : "Tap to upload media"}
                                        </span>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    </label>
                                 </div>
                                 
                                 <div className="pt-2">
                                     <button 
                                         onClick={handleReportSubmit}
                                         className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all text-white ${
                                             reportView === 'INJURY_FORM' ? 'bg-orange-500' :
                                             reportView === 'ILLEGAL_PICKUP_FORM' ? 'bg-red-600' :
                                             'bg-slate-900 dark:bg-slate-100 dark:text-slate-900'
                                         }`}
                                     >
                                         Submit Report
                                     </button>
                                 </div>
                             </div>
                        </>
                    )}
                 </div>
             </div>
           )}
         </div>
      )}
    </div>
  );
};