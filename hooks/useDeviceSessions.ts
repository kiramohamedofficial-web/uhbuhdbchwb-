
import { useEffect, useRef } from "react";
import { supabase } from "../services/storageService";
import {
  registerDeviceSession,
  logoutCurrentDevice,
  touchDeviceActivity,
} from "../services/deviceSessionService";

/**
 * Hook to manage device sessions automatically.
 */
export function useDeviceSessions(onBlocked?: (message: string) => void) {
  const lastRegisteredUserRef = useRef<string | null>(null);

  useEffect(() => {
    const handleRegistration = async (userId: string) => {
        if (lastRegisteredUserRef.current === userId) {
            return;
        }
        
        lastRegisteredUserRef.current = userId;
        const result = await registerDeviceSession(userId);
        
        if (!result.ok) {
            lastRegisteredUserRef.current = null;
            if (onBlocked) {
                onBlocked(result.message || "فشل تسجيل الجهاز.");
            }
        }
    };

    const checkSession = async () => {
        const { data } = await supabase.auth.getSession();
        const user = data.session?.user;
        if (user) {
            await handleRegistration(user.id);
        }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await handleRegistration(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        lastRegisteredUserRef.current = null;
      }
    });

    // Real-time Session Killer Monitor
    let sessionChannel: any = null;
    const sessionId = localStorage.getItem('device_session_id');

    if (sessionId) {
        sessionChannel = supabase
            .channel(`session-monitor-${sessionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'device_sessions',
                    filter: `id=eq.${sessionId}`
                },
                (payload) => {
                    const updatedSession = payload.new;
                    // If session marked inactive remotely, force logout
                    if (updatedSession.active === false && onBlocked) {
                        onBlocked("تم إنهاء جلستك من قبل الإدارة أو من جهاز آخر.");
                    }
                }
            )
            .subscribe();
    }

    return () => {
      subscription.unsubscribe();
      if (sessionChannel) supabase.removeChannel(sessionChannel);
    };
  }, [onBlocked]);
}

/**
 * Sign out helper that cleans up device session first.
 */
export async function signOutWithDeviceRelease(userId?: string) {
  let targetId = userId;

  if (!targetId) {
      const { data } = await supabase.auth.getSession();
      targetId = data.session?.user?.id;
  }

  if (targetId) {
    try {
      await logoutCurrentDevice(targetId);
    } catch (e) {
      console.warn("Error releasing device session:", e);
    }
  }
  
  localStorage.removeItem('device_session_id');
  localStorage.removeItem('gstudent_device_fingerprint');
  await supabase.auth.signOut();
}

/**
 * Activity heartbeat
 */
export async function pingDeviceActivity() {
  const { data } = await supabase.auth.getSession();
  if (data.session?.user) {
    await touchDeviceActivity(data.session.user.id);
  }
}
