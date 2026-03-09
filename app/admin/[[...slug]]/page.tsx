'use client';

import React, { useEffect, useState, useCallback, useMemo, useContext, createContext, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../../hooks/useSession';
import { useSubscription } from '../../../hooks/useSubscription';
import { useIcons } from '../../../IconContext';
import { Role, Mode, AppearanceSettings, CustomColors, Style } from '../../../types';
import { supabase, signOut, deleteExpiredStories } from '../../../services/storageService';
import { pingDeviceActivity } from '../../../hooks/useDeviceSessions';
import { useRealtimeNotifications } from '../../../hooks/useRealtimeNotifications';
import AdminDashboard from '../../../components/admin/AdminDashboard';
import Loader from '../../../components/common/Loader';
import { ToastContainer } from '../../../components/common/Toast';
import ScreenSecurity from '../../../components/common/ScreenSecurity';
import ErrorBoundary from '../../../components/common/ErrorBoundary';

const defaultColors: Record<string, CustomColors> = {
    'light': { '--bg-primary': '#F8FAFC', '--bg-secondary': '#FFFFFF', '--text-primary': '#0F172A', '--accent-primary': '#6366F1' },
    'dark': { '--bg-primary': '#020204', '--bg-secondary': '#0A0A0F', '--text-primary': '#FFFFFF', '--accent-primary': '#6366F1' }
};
const defaultAppearanceSettings: AppearanceSettings = {
    neon: { enabled: false, color: '#00ffff', intensity: 0.5 },
    customColors: defaultColors,
};

interface AppearanceContextType {
    mode: Mode; setMode: (mode: Mode) => void;
    style: Style; setStyle: (style: Style) => void;
    appearanceSettings: AppearanceSettings;
    setAppearanceSettings: React.Dispatch<React.SetStateAction<AppearanceSettings>>;
    profileHeaderColor: string; setProfileHeaderColor: (color: string) => void; // Added missing properties and closed interface
}

import { AppearanceContext, useAppearance } from '../../../AppContext';

const AppLifecycleContext = createContext({ setRefreshPaused: (paused: boolean) => { } });

function AppearanceProvider({ children }: { children: React.ReactNode }) {
    const { mode, setMode, style, setStyle, appearanceSettings, setAppearanceSettings, profileHeaderColor, setProfileHeaderColor } = useAppearance();

    // Admin override logic here
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', mode);
        document.documentElement.setAttribute('data-style', style);
        mode === 'dark' ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark');
        const colors = appearanceSettings.customColors[mode] || defaultColors[mode];
        if (colors) for (const [key, value] of Object.entries(colors)) document.documentElement.style.setProperty(key, value as string);
        localStorage.setItem('theme_mode', mode);
        localStorage.setItem('theme_style', style);
        localStorage.setItem('appearance_settings', JSON.stringify(appearanceSettings));
        localStorage.setItem('profile_header_color', profileHeaderColor);
    }, [mode, style, appearanceSettings, profileHeaderColor]);

    return <>{children}</>;
}

const STORAGE_KEY = 'last_visited_path';

function AdminPageInner() {
    const { currentUser, isLoading, refetchUser } = useSession();
    const { refetchSubscription } = useSubscription();
    const icons = useIcons();
    const router = useRouter();
    const [refreshPauseCount, setRefreshPauseCount] = useState(0);
    const isRefreshPaused = refreshPauseCount > 0;
    const lastVisibilityChange = useRef(Date.now());
    const setRefreshPaused = useCallback((paused: boolean) => setRefreshPauseCount(prev => Math.max(0, prev + (paused ? 1 : -1))), []);

    useRealtimeNotifications();
    useEffect(() => { localStorage.setItem(STORAGE_KEY, '/admin'); }, []);

    useEffect(() => {
        const favicon = document.getElementById('favicon') as HTMLLinkElement | null;
        if (favicon && icons.faviconUrl) favicon.href = icons.faviconUrl;
        if (icons.mainLogoUrl) document.documentElement.style.setProperty('--header-logo-url', `url('${icons.mainLogoUrl}')`);
    }, [icons]);

    useEffect(() => {
        const handleResume = async () => {
            const now = Date.now();
            if (now - lastVisibilityChange.current < 1000) return;
            lastVisibilityChange.current = now;
            if (isRefreshPaused) return;
            if (document.visibilityState === 'visible' && currentUser) {
                pingDeviceActivity(); deleteExpiredStories();
                if (!navigator.onLine) return;
                try {
                    const { data: { session }, error } = await supabase.auth.getSession();
                    if (error || !session) { const { error: re } = await supabase.auth.refreshSession(); if (re) { await signOut(); window.location.reload(); return; } }
                    const rd = () => { refetchUser(false); refetchSubscription(); };
                    'requestIdleCallback' in window ? (window as any).requestIdleCallback(rd) : setTimeout(rd, 50);
                } catch (err) { console.error("Resume error:", err); }
            }
        };
        const handlePageShow = (e: PageTransitionEvent) => { if (e.persisted) handleResume(); };
        document.addEventListener('visibilitychange', handleResume);
        window.addEventListener('pageshow', handlePageShow);
        window.addEventListener('online', handleResume);
        return () => { document.removeEventListener('visibilitychange', handleResume); window.removeEventListener('pageshow', handlePageShow); window.removeEventListener('online', handleResume); };
    }, [currentUser, refetchUser, refetchSubscription, isRefreshPaused]);

    useEffect(() => {
        if (isRefreshPaused || !currentUser) return;
        const id = setInterval(() => {
            if (document.visibilityState === 'visible' && navigator.onLine) { refetchUser(false); refetchSubscription(); pingDeviceActivity(); deleteExpiredStories(); }
        }, 60000);
        return () => clearInterval(id);
    }, [isRefreshPaused, currentUser, refetchUser, refetchSubscription]);

    if (isLoading) return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)]">
            <img src={icons.mainLogoUrl} alt="Logo" className="w-48 object-contain mb-4 animate-pulse drop-shadow-lg" />
            <Loader />
            <p className="mt-4 text-lg text-[var(--text-secondary)]">جاري تحميل المنصة...</p>
        </div>
    );

    if (!currentUser) { router.replace('/welcome'); return null; }
    if (currentUser.role !== Role.ADMIN) { router.replace('/'); return null; }

    return (
        <AppLifecycleContext.Provider value={{ setRefreshPaused }}>
            <div className="transition-all duration-300 min-h-screen">
                <ErrorBoundary>
                    <ScreenSecurity>
                        <AdminDashboard />
                    </ScreenSecurity>
                </ErrorBoundary>
            </div>
            <ToastContainer />
        </AppLifecycleContext.Provider>
    );
}

export default function AdminPage() {
    return <AppearanceProvider><AdminPageInner /></AppearanceProvider>;
}
