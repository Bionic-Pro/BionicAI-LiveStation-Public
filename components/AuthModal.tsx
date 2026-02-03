import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, AlertCircle, Eye, EyeOff, User, Mail } from 'lucide-react';
import { supabase } from '../services/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  correctPassword?: string;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  // Pre-fill credentials as requested for Admin setup
  const [email, setEmail] = useState('m3bionic@gmail.com');
  const [password, setPassword] = useState('admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset state on open, but keep the pre-fill for convenience if desired
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
        if (signUpError) throw signUpError;
        alert("Confirmation email sent! Please check your inbox (and spam folder). Click the link to activate your account, then sign in here.");
        setMode('signin');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0f1116] w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl p-6 animate-in zoom-in-95 duration-200 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-600 hover:text-slate-400 p-2"
        >
          <span className="sr-only">Close</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-4 border border-white/5">
            <Lock className="w-5 h-5 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-white">{mode === 'signin' ? 'Welcome Back' : 'Create Account'}</h3>
          <p className="text-xs text-slate-500 mt-1">Secure Cloud Sync via Supabase</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
               <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
               <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#06070a] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-primary/50"
                  required
               />
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-[#06070a] border border-white/10 rounded-xl pl-10 pr-12 py-3 text-sm text-white focus:outline-none focus:border-primary/50"
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          {error && (
            <div className="flex items-center gap-2 text-secondary text-[10px] font-bold uppercase tracking-wider justify-center bg-secondary/10 py-2 rounded-lg">
              <AlertCircle className="w-3 h-3" /> {error}
            </div>
          )}

          <div className="pt-2">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-white/10 disabled:opacity-50"
            >
              {loading ? 'Processing...' : (mode === 'signin' ? 'Sign In' : 'Sign Up')} <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          
          <div className="text-center">
            <button 
                type="button"
                onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                className="text-[10px] text-slate-500 hover:text-white transition-colors uppercase tracking-wider font-bold"
            >
                {mode === 'signin' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;