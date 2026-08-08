import React, { useState } from 'react';
import { AppLogo, APP_NAME } from '../constants';
import { Loader2, KeyRound } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface Props {
  onDone: () => void;
}

export const ResetPassword: React.FC<Props> = ({ onDone }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    alert('Password updated! You can now use it to log in.');
    onDone();
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center relative overflow-hidden font-sans px-6">
      <div className="flex flex-col items-center z-10 mb-8 text-center">
        <div className="scale-125 mb-4 shadow-xl rounded-lg">
          <AppLogo />
        </div>
        <h1 className="text-xl font-extrabold text-[#8B5E3C] tracking-widest uppercase">
          {APP_NAME}
        </h1>
        <p className="text-xs font-medium text-[#D4C5B0] mt-2 flex items-center gap-1">
          <KeyRound size={12} /> Set a New Password
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-3">
        <input
          type="password"
          placeholder="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-[#FCF8F2]/90 border border-[#F0E6D2] text-[#8B5E3C] px-6 py-4 rounded-[24px] text-center font-bold"
        />
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full bg-[#FCF8F2]/90 border border-[#F0E6D2] text-[#8B5E3C] px-6 py-4 rounded-[24px] text-center font-bold"
        />

        {error && <p className="text-red-500 text-xs text-center font-bold">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-[#F5D0A9] to-[#E6BA8C] text-[#8B5E3C] font-extrabold py-4 rounded-[30px]"
        >
          {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Update Password'}
        </button>
      </form>
    </div>
  );
};
