import React, { useState } from 'react';
import { AppLogo, APP_NAME } from '../constants';
import { Loader2, ShieldCheck, LockKeyhole, UserPlus } from 'lucide-react';
import { UserRole } from '../types';
import { supabase } from '../supabaseClient';

interface Props {
  onLogin: (username: string, password?: string, roleOverride?: UserRole) => void;
}

export const Login: React.FC<Props> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Background config (unchanged)
  const [bgConfig] = useState(() => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      return {
        url: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&q=80&w=2000",
        size: 'cover',
        repeat: 'no-repeat',
        opacity: 0.2,
        greeting: "Good Morning"
      };
    } else if (hour >= 18 || hour < 5) {
      return {
        url: "https://images.unsplash.com/photo-1535295972055-1c762f4483e5?auto=format&fit=crop&q=80&w=2000",
        size: 'cover',
        repeat: 'no-repeat',
        opacity: 0.15,
        greeting: "Good Evening"
      };
    } else {
      return {
        url: "https://img.freepik.com/free-vector/hand-drawn-dog-pattern-design_23-2149639538.jpg",
        size: '400px',
        repeat: 'repeat',
        opacity: 0.08,
        greeting: "Welcome Back"
      };
    }
  });

  const handleLoginSubmit = (targetRole?: UserRole) => {
    setLoading(true);
    onLogin(username, password, targetRole);
    setTimeout(() => setLoading(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLoginSubmit();
  };

  // ✅ GOOGLE LOGIN HANDLER
  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });

      if (error) {
        console.error("Google login error:", error);
        alert(error.message);
      }
    } catch (err) {
      console.error("Unexpected Google login error:", err);
      alert("Google login failed.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-between relative overflow-hidden font-sans">

      {/* Background */}
      <div
        className="absolute inset-0 z-0 pointer-events-none mix-blend-multiply transition-all duration-1000 ease-in-out"
        style={{
          backgroundImage: `url('${bgConfig.url}')`,
          backgroundRepeat: bgConfig.repeat as any,
          backgroundSize: bgConfig.size,
          backgroundPosition: 'center',
          opacity: bgConfig.opacity
        }}
      ></div>

      {/* Branding */}
      <div className="pt-12 flex flex-col items-center z-10 px-6 text-center">
        <div className="scale-125 mb-4 shadow-xl rounded-lg">
          <AppLogo />
        </div>
        <h1 className="text-xl font-extrabold text-[#8B5E3C] tracking-widest uppercase">
          {APP_NAME}
        </h1>
        <p className="text-xs font-medium text-[#D4C5B0] mt-2 max-w-xs leading-relaxed">
          {bgConfig.greeting} • Community & Welfare Portal
        </p>
      </div>

      {/* Form */}
      <div className="w-full max-w-xs z-10 mb-10">
        <form onSubmit={handleSubmit} className="space-y-4 flex flex-col items-center">

          <div className="w-full space-y-3">
            <div className="text-center mb-4">
              <span className="inline-flex items-center gap-1 bg-white/80 px-3 py-1 rounded-full text-[10px] font-bold text-orange-600 border border-orange-100">
                <ShieldCheck size={12} /> MEMBER LOGIN
              </span>
            </div>

            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#FCF8F2]/90 border border-[#F0E6D2] text-[#8B5E3C] px-6 py-4 rounded-[24px] text-center font-bold"
            />

            <input
              type="password"
              placeholder="••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#FCF8F2]/90 border border-[#F0E6D2] text-[#8B5E3C] px-6 py-4 rounded-[24px] text-center font-bold"
            />
          </div>

          {/* Normal Login */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#F5D0A9] to-[#E6BA8C] text-[#8B5E3C] font-extrabold py-4 rounded-[30px]"
          >
            {loading ? <Loader2 className="animate-spin text-[#8B5E3C]" /> : 'Access Account'}
          </button>

          {/* ✅ Google Login Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full bg-white border border-gray-300 py-4 rounded-[30px] font-bold text-sm hover:bg-gray-50 transition"
          >
            {googleLoading ? (
              <Loader2 className="animate-spin mx-auto" />
            ) : (
              "Continue with Google"
            )}
          </button>

          <div className="w-full pt-4 border-t border-[#F0E6D2]/50 space-y-2">
            <button
              type="button"
              onClick={() => handleLoginSubmit(UserRole.ADMIN)}
              className="w-full text-[#D4C5B0] text-xs font-bold flex items-center justify-center gap-2 py-2"
            >
              <LockKeyhole size={12} /> Login as Administrator
            </button>

            <button
              type="button"
              onClick={() => (window as any).toggleRegister?.()}
              className="w-full text-orange-500 text-xs font-extrabold flex items-center justify-center gap-2 py-2 bg-orange-50 rounded-xl border border-orange-100"
            >
              <UserPlus size={12} /> New here? Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};