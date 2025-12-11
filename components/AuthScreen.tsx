"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Key, Fingerprint, ShieldCheck, Activity, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AnimatedGridBackground } from '@/components/AnimatedGridBackground';

type AuthScreenProps = {
  onLogin: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  onNavigateBack?: () => void;
};

export function AuthScreen({ onLogin, onNavigateBack }: AuthScreenProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create Protocol is not available in prototype
    if (mode === 'signup') {
      return; // Do nothing - form is disabled
    }

    setError(null);
    setLoading(true);

    // Skip Supabase auth for demo users (only if userId is explicitly a demo user)
    if (userId === 'demo-healthy' || userId === 'demo-risk') {
      const result = await onLogin(userId);
      if (!result.success) {
        setError(result.error || 'Login failed');
        setLoading(false);
      }
      return;
    }

    // For real users, validate email format
    const emailTrimmed = userEmail?.trim() || '';
    if (!emailTrimmed || !emailTrimmed.includes('@')) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    if (!password?.trim()) {
      setError('Password is required');
      setLoading(false);
      return;
    }
    
    try {
      const result = await onLogin(emailTrimmed, password);
      if (!result.success) {
        setError(result.error || 'Login failed');
        setLoading(false);
      }
      // If success, onLogin will handle redirect
    } catch (e: any) {
      console.error('Login error:', e);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  // Don't show full loading screen here - just disable buttons to prevent double loading
  // The dashboard will show the loading screen after redirect

  return (
    <div className="min-h-screen bg-[#02040a] flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <AnimatedGridBackground />
      </div>

      <div className="relative z-10 w-full max-w-md px-6 animate-[fadeInUp_0.5s_ease-out]">
        
        {/* Main Auth Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 backdrop-blur-xl shadow-2xl mb-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 mb-4 bg-slate-900 border border-slate-700 rounded-xl shadow-[0_0_20px_rgba(34,211,238,0.1)]">
              <Lock className="w-5 h-5 text-cyan-400" />
            </div>
            <h2 className="text-2xl font-['Unbounded'] font-bold text-white mb-2">Secure Gateway</h2>
            <p className="text-slate-500 text-xs font-mono uppercase tracking-wide">Restricted Access // Bio-Twin v1.0</p>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-black/40 p-1 rounded-lg mb-6 border border-white/5">
            <button 
              onClick={() => {
                setMode('login');
                setError(null); // Clear any errors when switching to Identity Login
              }}
              className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${mode === 'login' ? 'bg-slate-800 text-white shadow-sm border border-white/10' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Identity Login
            </button>
            <button 
              onClick={() => {
                setMode('signup');
                setError(null); // Clear any errors when switching to Create Protocol
              }}
              className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${mode === 'signup' ? 'bg-slate-800 text-white shadow-sm border border-white/10' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Create Protocol
            </button>
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* User ID/Email Field */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono text-slate-400 uppercase tracking-widest ml-1">Bio-ID (Email or UUID)</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-cyan-400 transition-colors" />
                  <input 
                    type="email" 
                    value={userEmail || userId}
                    disabled={loading}
                    required={!userId}
                    onChange={(e) => {
                      setError(null);
                      const val = e.target.value;
                      
                      if (val.includes('@')) {
                        setUserEmail(val);
                        setUserId('');
                      } else if (val === '' || val === 'demo-healthy' || val === 'demo-risk') {
                        setUserId(val);
                        setUserEmail('');
                      } else {
                        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                        const looksLikeUUID = UUID_RE.test(val) || (val.length > 30 && /^[0-9a-f-]+$/i.test(val));
                        
                        if (looksLikeUUID || val.length < 10) {
                          setUserId(val);
                          setUserEmail('');
                        } else {
                          setError('Please enter a valid email address. UUIDs and user IDs cannot be used for login.');
                          e.target.value = userEmail || userId || '';
                        }
                      }
                    }}
                    className="w-full bg-black/40 border border-slate-800 rounded-lg py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-slate-700 font-mono disabled:opacity-50 disabled:cursor-not-allowed" 
                    placeholder="researcher@subhealth.ai or user-uuid" 
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono text-slate-400 uppercase tracking-widest ml-1">Passphrase</label>
                <div className="relative group">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-cyan-400 transition-colors" />
                  <input 
                    type="password" 
                    value={password}
                    disabled={loading}
                    required={!userId && !userEmail.includes('demo')}
                    onChange={(e) => {
                      setError(null);
                      setPassword(e.target.value);
                    }}
                    className="w-full bg-black/40 border border-slate-800 rounded-lg py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-slate-700 font-mono disabled:opacity-50 disabled:cursor-not-allowed" 
                    placeholder="••••••••••••" 
                  />
                </div>
              </div>

              {/* Error Message - only for login */}
              {error && (
                <div className="mt-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg">
                  <p className="text-[10px] font-mono text-rose-400 text-center">{error}</p>
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-white hover:bg-cyan-50 disabled:opacity-50 disabled:cursor-not-allowed text-black font-['Unbounded'] font-bold text-xs uppercase tracking-wider rounded-lg transition-all mt-4 shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    <span>Authenticating…</span>
                  </>
                ) : (
                  <span>Authenticate</span>
                )}
              </button>
            </form>
          ) : (
            /* Create Protocol - Coming Soon */
            <div className="space-y-6">
              <div className="text-center space-y-3">
                <h3 className="text-lg font-['Unbounded'] font-bold text-white">Create Protocol</h3>
                <p className="text-sm text-slate-400 font-mono leading-relaxed">
                  Coming soon – this will allow researchers to onboard new Bio-Twin protocols.
                </p>
              </div>
              
              <div className="pt-4">
                <button 
                  type="button"
                  disabled
                  className="w-full py-3 bg-slate-800/50 border border-slate-700 text-slate-500 font-['Unbounded'] font-bold text-xs uppercase tracking-wider rounded-lg cursor-not-allowed opacity-50 flex items-center justify-center gap-2"
                >
                  REQUEST ACCESS
                </button>
                <p className="text-center mt-3 text-[10px] font-mono text-slate-500 italic">
                  Protocol creation is currently closed in this prototype. Access is by invitation only.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Reviewer Bypass Section */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
          <div className="relative flex justify-center mb-6"><span className="bg-[#02040a] px-3 text-[9px] text-slate-600 font-mono uppercase tracking-widest border border-slate-800 rounded-full">Reviewer Bypass</span></div>
        </div>

        <div className="grid grid-cols-2 gap-4 opacity-80 hover:opacity-100 transition-opacity">
          <button 
            onClick={async () => {
              setLoading(true);
              const result = await onLogin('demo-healthy');
              if (!result.success) {
                setError(result.error || 'Failed to load demo');
                setLoading(false);
              }
            }}
            disabled={loading}
            className="py-3 px-4 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-cyan-500/30 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-all duration-300 text-[9px] font-mono uppercase tracking-widest flex flex-col items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShieldCheck size={16} className="group-hover:scale-110 transition-transform" />
            <span>Demo: Nominal</span>
          </button>
          <button 
            onClick={async () => {
              setLoading(true);
              const result = await onLogin('demo-risk');
              if (!result.success) {
                setError(result.error || 'Failed to load demo');
                setLoading(false);
              }
            }}
            disabled={loading}
            className="py-3 px-4 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-amber-500/30 hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-all duration-300 text-[9px] font-mono uppercase tracking-widest flex flex-col items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Activity size={16} className="group-hover:scale-110 transition-transform" />
            <span>Demo: High Drift</span>
          </button>
        </div>

        <p className="text-center mt-8 text-[9px] text-slate-700 font-mono">
          Authorized Personnel Only. All Access Logged.
        </p>
      </div>
    </div>
  );
}

