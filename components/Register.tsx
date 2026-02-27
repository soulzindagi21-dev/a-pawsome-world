import React, { useState } from 'react';
import { AppLogo, APP_NAME } from '../constants';
import { Loader2, ShieldCheck, UserPlus, Mail, User, MapPin } from 'lucide-react';
import { UserRole } from '../types';

interface Props {
  onRegister: (userData: any) => Promise<void>;
  onBackToLogin: () => void;
}

export const Register: React.FC<Props> = ({ onRegister, onBackToLogin }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    zone: '',
    role: UserRole.CITIZEN
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onRegister(formData);
      // Success: App.tsx will unmount this component
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center relative overflow-hidden font-sans px-6 py-12">

      <div className="absolute inset-0 z-0 opacity-0.05 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://img.freepik.com/free-vector/hand-drawn-dog-pattern-design_23-2149639538.jpg')] bg-repeat opacity-10"></div>
      </div>

      <div className="flex flex-col items-center z-10 mb-8 text-center">
        <div className="scale-110 mb-4 shadow-lg rounded-lg">
          <AppLogo />
        </div>
        <h1 className="text-xl font-extrabold text-[#8B5E3C] tracking-widest uppercase">{APP_NAME}</h1>
        <p className="text-xs font-medium text-[#D4C5B0] mt-1">Join our community of dog lovers</p>
      </div>

      <div className="w-full max-w-md bg-white/80 backdrop-blur-md p-8 rounded-[40px] shadow-xl border border-[#F0E6D2] z-10">
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-1 bg-orange-50 px-3 py-1 rounded-full text-[10px] font-bold text-orange-600 border border-orange-100">
            <UserPlus size={12} /> NEW FEEDER REGISTRATION
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-3 rounded-2xl text-center">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D4C5B0]" size={18} />
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-[#FCF8F2] border border-[#F0E6D2] text-[#8B5E3C] placeholder-[#D4C5B0] pl-12 pr-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E6C6A0] transition-all text-sm"
              />
            </div>

            <div className="relative">
              <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D4C5B0]" size={18} />
              <input
                type="text"
                name="username"
                placeholder="Username"
                required
                value={formData.username}
                onChange={handleChange}
                className="w-full bg-[#FCF8F2] border border-[#F0E6D2] text-[#8B5E3C] placeholder-[#D4C5B0] pl-12 pr-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E6C6A0] transition-all text-sm"
              />
            </div>
          </div>

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D4C5B0]" size={18} />
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full bg-[#FCF8F2] border border-[#F0E6D2] text-[#8B5E3C] placeholder-[#D4C5B0] pl-12 pr-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E6C6A0] transition-all text-sm"
            />
          </div>

          <div className="relative">
            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D4C5B0]" size={18} />
            <input
              type="password"
              name="password"
              placeholder="Password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full bg-[#FCF8F2] border border-[#F0E6D2] text-[#8B5E3C] placeholder-[#D4C5B0] pl-12 pr-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E6C6A0] transition-all text-sm"
            />
          </div>

          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D4C5B0]" size={18} />
            <input
              type="text"
              name="zone"
              placeholder="Your Zone/Area"
              required
              value={formData.zone}
              onChange={handleChange}
              className="w-full bg-[#FCF8F2] border border-[#F0E6D2] text-[#8B5E3C] placeholder-[#D4C5B0] pl-12 pr-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E6C6A0] transition-all text-sm"
            />
          </div>

          <div className="relative">
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full bg-[#FCF8F2] border border-[#F0E6D2] text-[#8B5E3C] px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E6C6A0] transition-all text-sm"
            >
              <option value={UserRole.CITIZEN}>Citizen</option>
              <option value={UserRole.VERIFIED_FEEDER}>Feeder</option>
              <option value={UserRole.VET}>Veterinarian</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#F5D0A9] to-[#E6BA8C] text-[#8B5E3C] font-extrabold py-4 rounded-[30px] shadow-lg transform active:scale-95 flex items-center justify-center text-sm uppercase tracking-wide hover:brightness-105 mt-4"
          >
            {loading ? <Loader2 className="animate-spin text-[#8B5E3C]" /> : 'Create Account'}
          </button>

          <button
            type="button"
            onClick={onBackToLogin}
            className="w-full text-[#D4C5B0] text-xs font-bold hover:text-[#8B5E3C] transition-colors py-2"
          >
            Already have an account? Login
          </button>

        </form>
      </div>
    </div>
  );
};