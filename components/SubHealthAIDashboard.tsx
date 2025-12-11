// @ts-nocheck
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { 
  Activity, Brain, Shield, ChevronRight, Play, ScanLine, Globe, Zap, 
  ArrowRight, Lock, ShieldCheck, Heart, Wind, Thermometer, 
  Database, Settings, User, Fingerprint, Layers, TrendingUp, 
  GitCommit, MessageSquare, LogOut, Search, Menu, Bell, X,
  Cpu, LayoutGrid, FileText, Mail, Key, AlertTriangle, 
  Stethoscope, Microscope, Watch, CheckCircle, CheckCircle2, BarChart2,
  UploadCloud, File, Plus, Trash2, Smartphone, CheckSquare, FlaskConical
} from 'lucide-react';
import { DEMO_PROFILES } from '@/lib/dashboardViewData';
import { ClinicalRiskSection } from '@/components/Dashboard/ClinicalRiskSection';
import { ClinicalReasonsCard } from '@/components/Dashboard/ClinicalReasonsCard';
import { supabase } from '@/lib/supabase';
// Import extracted UI components
import { BentoCard } from '@/components/ui/BentoCard';
import { MiniAreaChart } from '@/components/ui/MiniAreaChart';
import { SHAPBarChart } from '@/components/ui/SHAPBarChart';
import { StatValue } from '@/components/ui/StatValue';
// Import extracted utilities
import { formatNumber, specialtyLabel } from '@/lib/utils/dashboardUtils';
// Import extracted view components
import { DashboardView } from '@/components/Dashboard/views/DashboardView';
import { MultimodalView } from '@/components/Dashboard/views/MultimodalView';
import { ExplainabilityView } from '@/components/Dashboard/views/ExplainabilityView';
import { EvidenceView } from '@/components/Dashboard/views/EvidenceView';
import { DataSourcesView } from '@/components/Dashboard/DataSourcesView';

// Import extracted page components
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { LabUploadWizard } from '@/components/Dashboard/LabUploadWizard';
import { AnimatedGridBackground } from '@/components/AnimatedGridBackground';
import { LandingPage } from '@/components/LandingPage';
import { AuthScreen } from '@/components/AuthScreen';
import { DashboardShell } from '@/components/Dashboard/DashboardShell';
import { transformApiDataToDashboard } from '@/lib/dashboardTransformer';
import LoadingScreen from '@/components/LoadingScreen';

// --- APP ORCHESTRATOR ---
export default function SubHealthAIDashboard({ 
  initialClinical,
  serverUserId,
  serverEmail,
  isRealUser: serverIsRealUser,
  // New props for direct data injection
  currentEmail,
  isSyntheticDemo,
  metrics,
  labs,
  vitals,
  dataUserId,
}: { 
  initialClinical?: any;
  serverUserId?: string;
  serverEmail?: string;
  isRealUser?: boolean;
  // New props
  currentEmail?: string;
  isSyntheticDemo?: boolean;
  metrics?: any[];
  labs?: any[];
  vitals?: any[];
  dataUserId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize view and user state based on URL params to avoid showing landing page for demo users
  const getInitialState = () => {
    if (serverUserId) {
      return { view: 'dashboard' as const, userId: null, userMode: null };
    }
    const urlUser = searchParams?.get('user');
    if (urlUser === 'demo-healthy' || urlUser === 'demo-risk') {
      return { view: 'dashboard' as const, userId: urlUser, userMode: urlUser as 'demo-healthy' | 'demo-risk' };
    }
    return { view: 'landing' as const, userId: null, userMode: null };
  };
  
  const initialState = getInitialState();
  const [view, setView] = useState(initialState.view); // 'landing' | 'auth' | 'dashboard'
  const [userId, setUserId] = useState<string | null>(initialState.userId);
  const [userMode, setUserMode] = useState<'healthy' | 'risk' | 'demo-healthy' | 'demo-risk' | null>(initialState.userMode);
  const [activePage, setActivePage] = useState('dashboard');
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [version] = useState('phase3-v1-wes');
  const isLoggingOutRef = useRef(false);

  // Load fonts on mount (matching original code)
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Unbounded:wght@300;400;600;700&family=Space+Mono:wght@400;700&family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);
  
  // Determine if this is a real user: server prop takes precedence, then fallback to client-side logic
  const isRealUser = serverIsRealUser ?? Boolean(userId && !userMode);

  // ALWAYS validate and clean up invalid URL params (runs on every page, including landing)
  useEffect(() => {
    const urlUser = searchParams?.get('user');
    
    // If server provided userId, clear any URL params (authenticated user doesn't need URL params)
    if (serverUserId) {
      if (urlUser) {
        const url = new URL(window.location.href);
        url.searchParams.delete('user');
        window.history.replaceState({}, '', url.toString());
      }
      return;
    }

    // Validate URL param: only accept demo users or valid UUIDs
    if (urlUser) {
      const isDemoUser = urlUser === 'demo-healthy' || urlUser === 'demo-risk';
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const isValidUUID = UUID_RE.test(urlUser);
      
      // If it's a valid demo user, only update if state doesn't match (avoid redundant updates)
      if (isDemoUser) {
        if (userId !== urlUser || userMode !== urlUser || view !== 'dashboard') {
          setUserId(urlUser);
          setUserMode(urlUser);
          setView('dashboard');
        }
        return; // Don't clear valid demo users
      }
      
      // If invalid, immediately clear it and reset state
      if (!isValidUUID) {
        console.warn('⚠️ Invalid user identifier in URL, clearing:', urlUser);
        const url = new URL(window.location.href);
        url.searchParams.delete('user');
        window.history.replaceState({}, '', url.toString());
        // Clear any invalid userId and ensure we're on landing page
        if (userId === urlUser) {
          setUserId(null);
          setUserMode(null);
        }
        if (view === 'dashboard') {
          setView('landing');
        }
      }
    }
  }, [searchParams, serverUserId, userId, userMode, view]);

  // If server provides userId (logged-in user), use it immediately
  // Only update if not already set to avoid redundant state updates that cause double renders
  useEffect(() => {
    if (serverUserId && userId !== serverUserId) {
      console.log('✅ Using server-provided user ID:', serverUserId);
      setUserId(serverUserId);
      setUserMode(null); // Real user, not demo
      if (view !== 'dashboard') {
        setView('dashboard'); // Only set if not already dashboard
      }
    }
  }, [serverUserId, userId, view]);

  // This useEffect is now redundant - the validation useEffect above handles demo users
  // Removed to prevent double state updates that cause flashing

  // Validate userId is either a demo user or a valid UUID
  const isValidUserId = useMemo(() => {
    if (!userId) return false;
    if (userId === 'demo-healthy' || userId === 'demo-risk') return true;
    // Check if it's a valid UUID format
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return UUID_RE.test(userId);
  }, [userId]);

  // If props are provided (direct data injection mode), we still need to fetch risk/SHAP/forecast data
  const isPropsMode = Boolean(currentEmail && metrics && labs && vitals);
  // In props mode, use dataUserId for API fetches; otherwise use userId from URL/state
  const effectiveUserId = isPropsMode ? dataUserId : userId;
  
  // Validate effectiveUserId (works for both props mode and non-props mode)
  const isValidEffectiveUserId = useMemo(() => {
    if (!effectiveUserId) return false;
    if (effectiveUserId === 'demo-healthy' || effectiveUserId === 'demo-risk') return true;
    // Check if it's a valid UUID format
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return UUID_RE.test(effectiveUserId);
  }, [effectiveUserId]);

  // State for API errors
  const [apiError, setApiError] = useState<string | null>(null);

  // Fetch real data when user is set and valid
  const fetcher = (url: string) => fetch(url).then(async (res) => {
    if (!res.ok) {
      // If we get a 400 or 401, the user identifier is invalid
      if (res.status === 400 || res.status === 401) {
        console.error('❌ Invalid user identifier detected (HTTP ' + res.status + '), clearing userId');
        const errorData = await res.json().catch(() => ({}));
        
        // Set consistent error message
        setApiError('Invalid username or password');
        
        // Clear invalid userId and redirect to auth
        setUserId(null);
        setUserMode(null);
        setView('auth');
        throw new Error(errorData.error || 'Invalid user identifier');
      }
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch data');
    }
    return res.json();
  });

  const shouldFetch = isValidEffectiveUserId && view === 'dashboard';

  const { data: dash, error: dashError, isLoading: dashLoading } = useSWR(
    shouldFetch ? `/api/dashboard?user=${effectiveUserId}&version=${version}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
    }
  );

  const { data: exp, error: expError, isLoading: expLoading } = useSWR(
    shouldFetch ? `/api/explain?user=${effectiveUserId}&version=${version}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
    }
  );

  const { data: riskData, error: riskError, isLoading: riskLoading } = useSWR(
    shouldFetch ? `/api/risk?user=${effectiveUserId}&version=${version}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
    }
  );

  const { data: metricSnapshot, error: metricSnapshotError, isLoading: metricSnapshotLoading } = useSWR(
    shouldFetch ? `/api/metric_snapshot?user=${effectiveUserId}&version=${version}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
    }
  );

  const { data: trendsData, error: trendsError, isLoading: trendsLoading } = useSWR(
    shouldFetch ? `/api/trends?user=${effectiveUserId}&version=${version}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
    }
  );

  // Combine props data with API data for real users
  const propsData = useMemo(() => {
    if (metrics && labs && vitals) {
      const latestMetrics = metrics[0] || {};
      const latestLabs = labs[0] || {};
      const latestVitals = vitals[0] || {};

      const sleepMinutes = latestMetrics.sleep_minutes;
      const sleepHours = sleepMinutes != null ? sleepMinutes / 60 : 0;

      return {
        instabilityScore: 0,
        status: "STABLE" as const,
        narrative: "No baseline computed yet. Risk scores will appear once we have enough wearable + lab data.",
        vitals: {
          hrv: latestMetrics.hrv_avg ?? 0,
          rhr: latestMetrics.rhr ?? 0,
          resp: latestVitals.respiratory_rate ?? 14,
          temp: latestVitals.temperature_f ?? 98.6,
        },
        trends: { hrv: "stable" as const, rhr: "stable" as const },
        drivers: [],
        drift: { metabolic: "Unknown" as const, cardio: "Unknown" as const, inflammation: "Unknown" as const },
        sleep: {
          deep: sleepHours ? Number((0.25 * sleepHours).toFixed(1)) : 0,
          rem: sleepHours ? Number((0.25 * sleepHours).toFixed(1)) : 0,
          light: sleepHours ? Number((0.4 * sleepHours).toFixed(1)) : 0,
          awake: sleepHours ? Number((0.1 * sleepHours).toFixed(1)) : 0,
        },
        labs: labs.map(l => ({
          name: l.test_name,
          value: String(l.value),
          unit: l.unit,
          status: l.flag,
        })),
        forecast: [],
        volatilityIndex: "0.000",
        volatilityTrail: [],
        hasForecast: false,
      };
    }
    return null;
  }, [metrics, labs, vitals]);

  const currentData = useMemo(() => {
    if (isPropsMode) {
      // If we have API data, merge it with props data
      if (dash && exp) {
        const apiTransformed = transformApiDataToDashboard(dash, exp, riskData, metricSnapshot);
        if (apiTransformed) {
          return {
            ...apiTransformed,
            vitals: propsData?.vitals || apiTransformed.vitals,
            labs: (propsData?.labs && propsData.labs.length > 0) ? propsData.labs : apiTransformed.labs,
            clinicalReasons: dash?.clinicalReasons || [],
          };
        }
      }
      // Fallback to propsData if API data isn't ready yet
      // This ensures we show something immediately instead of staying in loading state
      return propsData;
    }
    if (userMode === "demo-healthy") return DEMO_PROFILES["demo-healthy"];
    if (userMode === "demo-risk") return DEMO_PROFILES["demo-risk"];
    if (userId && userId !== 'demo-healthy' && userId !== 'demo-risk') {
      if (dash && exp) {
        const transformed = transformApiDataToDashboard(dash, exp, riskData, metricSnapshot);
        if (transformed) return { ...transformed, clinicalReasons: dash?.clinicalReasons || [] };
      }
      return null;
    }
    return null;
  }, [isPropsMode, propsData, userMode, userId, dash, exp, riskData, metricSnapshot]);

  // In props mode, show loading only if we don't have propsData AND API calls are still loading
  // Otherwise, show propsData immediately even if API calls are still loading
  const loading =
    (shouldFetch && (dashLoading || expLoading || riskLoading || metricSnapshotLoading || trendsLoading)) ||
    (isPropsMode && !currentData && !propsData);

  useEffect(() => {
    isLoggingOutRef.current = isLoggingOut;
  }, [isLoggingOut]);

  // Handle initial view based on authentication status and URL params
  // Only update if state doesn't match (avoid redundant updates that cause flashing)
  useEffect(() => {
    if (serverUserId) {
      if (view !== 'dashboard') {
        setView('dashboard');
      }
      return;
    }
    
    // Check if there's a demo user in URL params - only update if state doesn't match
    const urlUser = searchParams?.get('user');
    if (urlUser === 'demo-healthy' || urlUser === 'demo-risk') {
      if (userId !== urlUser || userMode !== urlUser || view !== 'dashboard') {
        setUserId(urlUser);
        setUserMode(urlUser);
        setView('dashboard');
      }
    } else if (!userId && !urlUser && view !== 'landing' && view !== 'auth') {
      // Only set to landing if no user is set, no URL param, and view is not already landing or auth
      // Don't reset if user is on auth page (they clicked the login button)
      setView('landing');
    }
  }, [serverUserId, searchParams, userId, userMode, view]);

  const handleLogin = async (email: string, password?: string) => {
    if (email === "demo-healthy" || email === "demo-risk") {
      // For demo users, redirect immediately without setting state (avoid double render)
      // The redirect will cause a full page reload, and the component will initialize from URL params
      window.location.href = `/?user=${email}`;
      return { success: true };
    }

    if (!password) {
      return { success: false, error: "Password is required for real users." };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Supabase login error:", error);
        return { success: false, error: "Invalid Email or Password" };
      }

      if (data.user) {
        console.log("Login successful, user:", data.user.email);
        // Ensure session is established before redirecting
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log("Session established, redirecting to dashboard.");
          // Redirect immediately without delay to avoid showing dashboard before redirect
          window.location.href = '/dashboard';
          return { success: true };
        } else {
          console.error("Session not established after login.");
          return { success: false, error: "Login failed: session not established." };
        }
      }
      return { success: false, error: "Login failed: unknown reason." };
    } catch (err) {
      console.error("Unexpected login error:", err);
      return { success: false, error: "An unexpected error occurred during login." };
    }
  };

  const handleLogout = async () => {
    // Redirect immediately to avoid showing dashboard during logout
    // Sign out in the background, but don't wait for it
    supabase.auth.signOut().catch(err => {
      console.error("Logout error:", err);
    });
    
    // Redirect immediately to prevent dashboard flash
    window.location.href = '/';
  };

  // Don't render dashboard if logging out (shouldn't happen due to immediate redirect, but safety check)
  if (isLoggingOut) {
    return <LoadingScreen />;
  }

  if (view === "landing") {
    return <LandingPage onNavigateAuth={() => setView('auth')} />;
  }

  if (view === "auth") {
    return <AuthScreen onLogin={handleLogin} onNavigateBack={() => setView('landing')} />;
  }

  if (view === 'dashboard' && !isValidEffectiveUserId && !loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 text-neutral-300">
        <p>No valid user selected or data profile found.</p>
        <button
          className="mt-2 rounded-md border border-neutral-600 px-3 py-1 text-sm"
          onClick={() => setView('landing')}
        >
          Back to landing
        </button>
      </div>
    );
  }

  return (
    <>
      {view === 'dashboard' && (isPropsMode || (userId || userMode)) && (
        <>
          <DashboardShell
            activePage={activePage}
            setActivePage={setActivePage}
            isLoggingOut={isLoggingOut}
            isRealUser={isPropsMode ? !isSyntheticDemo : isRealUser}
            serverEmail={isPropsMode ? currentEmail : serverEmail}
            onLogout={handleLogout}
            onToggleCopilot={() => setIsCopilotOpen(true)}
            userId={isPropsMode ? dataUserId : effectiveUserId}
            userMode={isPropsMode ? null : userMode}
            version={version}
          >
            {loading && !currentData && !isPropsMode && activePage !== 'settings' && activePage !== 'evidence' && (
              <LoadingScreen />
            )}
            {activePage === 'evidence' && <EvidenceView userId={effectiveUserId} version={version} />}
            {activePage === 'settings' && (
              <DataSourcesView 
                userMode={userMode === 'demo-risk' ? 'risk' : 'healthy'} 
                isRealUser={isPropsMode ? !isSyntheticDemo : isRealUser}
                currentEmail={isPropsMode ? currentEmail : serverEmail}
                userId={effectiveUserId}
              />
            )}
            {currentData && (
              <>
                {activePage === 'dashboard' && (
                  <>
                    <DashboardView 
                      profile={userMode === 'demo-risk' ? 'risk' : 'healthy'} 
                      data={currentData} 
                      forecastSeries={dash?.forecast ? dash.forecast.map((p: any) => ({ risk: (p.value || 0) / 100, date: p.date })) : []} 
                      onToggleCopilot={() => setIsCopilotOpen(true)} 
                      isDemo={userMode === 'demo-healthy' || userMode === 'demo-risk'} 
                      userId={effectiveUserId} 
                      latestMetrics={metricSnapshot} 
                      clinical={initialClinical} 
                      clinicalReasons={currentData?.clinicalReasons || dash?.clinicalReasons || []}
                      version={version}
                    />
                  </>
                )}
                {activePage === 'insights' && <MultimodalView profile={userMode === 'demo-risk' ? 'risk' : 'healthy'} data={currentData} trendsData={trendsData} isDemo={userMode === 'demo-healthy' || userMode === 'demo-risk'} isRealUser={isPropsMode ? !isSyntheticDemo : isRealUser} currentEmail={isPropsMode ? currentEmail : serverEmail} userId={effectiveUserId} />}
                {activePage === 'shap' && <ExplainabilityView profile={userMode === 'demo-risk' ? 'risk' : 'healthy'} data={currentData} userId={effectiveUserId} version={version} />}
              </>
            )}
          </DashboardShell>
          {currentData && (
            <CopilotDrawer 
              isOpen={isCopilotOpen} 
              onClose={() => setIsCopilotOpen(false)} 
              profile={userMode === 'demo-risk' ? 'risk' : 'healthy'} 
              data={currentData} 
            />
          )}
        </>
      )}
    </>
  );
}
