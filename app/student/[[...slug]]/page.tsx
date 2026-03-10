'use client';

import React, { useEffect, createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../../hooks/useSession';
import { useSubscription } from '../../../hooks/useSubscription';
import { useIcons } from '../../../IconContext';
import { Role, Mode, AppearanceSettings, CustomColors, Style } from '../../../types';
import { initData, supabase, signOut, deleteExpiredStories } from '../../../services/storageService';
import { useSubscription as useSubHook } from '../../../hooks/useSubscription';
import { pingDeviceActivity } from '../../../hooks/useDeviceSessions';
import { useRealtimeNotifications } from '../../../hooks/useRealtimeNotifications';
import StudentDashboard from '../../../components/student/StudentDashboard';
import Loader from '../../../components/common/Loader';
import { ToastContainer } from '../../../components/common/Toast';
import ScreenSecurity from '../../../components/common/ScreenSecurity';
import ErrorBoundary from '../../../components/common/ErrorBoundary';
import Modal from '../../../components/common/Modal';

// App lifecycle context
const AppLifecycleContext = React.createContext({ setRefreshPaused: (paused: boolean) => { } });

const STORAGE_KEY = 'last_visited_path';

function StudentPageInner() {
    const { currentUser, isLoading, isPostRegistrationModalOpen, closePostRegistrationModal, refetchUser } = useSession();
    const { refetchSubscription } = useSubscription();
    const icons = useIcons();
    const router = useRouter();
    const [refreshPauseCount, setRefreshPauseCount] = useState(0);
    const isRefreshPaused = refreshPauseCount > 0;
    const lastVisibilityChange = React.useRef(Date.now());

    const setRefreshPaused = useCallback((paused: boolean) => {
        setRefreshPauseCount(prev => Math.max(0, prev + (paused ? 1 : -1)));
    }, []);

    useRealtimeNotifications();

    useEffect(() => {
        // Save path for persistence
        localStorage.setItem(STORAGE_KEY, '/student');
    }, []);

    useEffect(() => {
        const favicon = document.getElementById('favicon') as HTMLLinkElement | null;
        if (favicon && icons.faviconUrl) favicon.href = icons.faviconUrl;
        if (icons.mainLogoUrl) {
            document.documentElement.style.setProperty('--header-logo-url', `url('${icons.mainLogoUrl}')`);
        }
    }, [icons]);

    useEffect(() => {
        const handleResume = async () => {
            const now = Date.now();
            if (now - lastVisibilityChange.current < 1000) return;
            lastVisibilityChange.current = now;
            if (isRefreshPaused) return;
            if (currentUser?.role === Role.SUPERVISOR) return;
            if (document.visibilityState === 'visible' && currentUser) {
                pingDeviceActivity();
                deleteExpiredStories();
                if (!navigator.onLine) return;
                try {
                    const { data: { session }, error } = await supabase.auth.getSession();
                    if (error || !session) {
                        const { error: refreshError } = await supabase.auth.refreshSession();
                        if (refreshError) { await signOut(); window.location.reload(); return; }
                    }
                    const refreshData = () => { refetchUser(false); refetchSubscription(); };
                    if ('requestIdleCallback' in window) {
                        (window as any).requestIdleCallback(refreshData);
                    } else {
                        setTimeout(refreshData, 50);
                    }
                } catch (err) { console.error("Error during app resume:", err); }
            }
        };
        const handlePageShow = (event: PageTransitionEvent) => { if (event.persisted) handleResume(); };
        document.addEventListener('visibilitychange', handleResume);
        window.addEventListener('pageshow', handlePageShow);
        window.addEventListener('online', handleResume);
        return () => {
            document.removeEventListener('visibilitychange', handleResume);
            window.removeEventListener('pageshow', handlePageShow);
            window.removeEventListener('online', handleResume);
        };
    }, [currentUser, refetchUser, refetchSubscription, isRefreshPaused]);

    useEffect(() => {
        if (isRefreshPaused || !currentUser) return;
        if (currentUser.role === Role.SUPERVISOR) return;
        const refreshInterval = setInterval(() => {
            if (document.visibilityState === 'visible' && navigator.onLine) {
                refetchUser(false); refetchSubscription(); pingDeviceActivity(); deleteExpiredStories();
            }
        }, 60000);
        return () => clearInterval(refreshInterval);
    }, [isRefreshPaused, currentUser, refetchUser, refetchSubscription]);

    if (isLoading) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)]">
                <img src={icons.mainLogoUrl} alt="Logo" className="w-48 object-contain mb-4 animate-pulse drop-shadow-lg" />
                <Loader />
                <p className="mt-4 text-lg text-[var(--text-secondary)]">جاري تحميل المنصة...</p>
            </div>
        );
    }

    if (!currentUser) {
        router.replace('/welcome');
        return null;
    }

    if (currentUser.role !== Role.STUDENT) {
        router.replace('/');
        return null;
    }

    const lifecycleValue = useMemo(() => ({ setRefreshPaused }), [setRefreshPaused]);

    return (
        <AppLifecycleContext.Provider value={lifecycleValue}>
            <div className="transition-all duration-300 min-h-screen">
                <ErrorBoundary>
                    <StudentDashboard />
                </ErrorBoundary>
            </div>
            <ToastContainer />
            <Modal
                isOpen={isPostRegistrationModalOpen}
                onClose={closePostRegistrationModal}
                title="⚠️ تنبيه هام عند التسجيل"
                alignTop={true}
            >
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-lg space-y-3">
                    <ul className="list-disc list-inside space-y-2 text-right">
                        <li>سيتم <strong>حذف حسابك تلقائيًّا بعد 60 يومًا من عدم النشاط</strong> (عدم الدخول إلى المنصة).</li>
                        <li><strong>تسجيل الدخول مسموح به من جهاز واحد فقط</strong> في نفس الوقت.</li>
                    </ul>
                    <p className="font-semibold pt-2 border-t border-red-500/30">
                        يُرجى الالتزام بسياسة الاستخدام لضمان استمرارية حسابك.
                    </p>
                </div>
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={closePostRegistrationModal}
                        className="px-6 py-2 font-bold bg-red-600 text-white rounded-lg transition-colors hover:bg-red-700"
                    >
                        حسنًا، فهمت
                    </button>
                </div>
            </Modal>
        </AppLifecycleContext.Provider>
    );
}

export default function StudentPage() {
    return <StudentPageInner />;
}
