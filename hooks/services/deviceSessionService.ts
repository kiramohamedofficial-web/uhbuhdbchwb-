
import { supabase } from './storageService';

const DEVICE_KEY = "gstudent_device_fingerprint";
let memoryFingerprint: string | null = null;

// Generate or retrieve a persistent device ID stored in localStorage
function getDeviceFingerprint(): string {
  if (typeof window === "undefined") return "server-device";
  if (memoryFingerprint) return memoryFingerprint;

  try {
    let existing = window.localStorage.getItem(DEVICE_KEY);
    if (!existing) {
      existing = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      window.localStorage.setItem(DEVICE_KEY, existing);
    }
    memoryFingerprint = existing;
    return existing;
  } catch (e) {
    console.warn("LocalStorage access denied/failed for device fingerprint", e);
    if (!memoryFingerprint) {
       memoryFingerprint = `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
    return memoryFingerprint;
  }
}

function getDeviceName(): string {
  if (typeof navigator === "undefined") return "Unknown device";
  const ua = navigator.userAgent || "Unknown";
  const platform = (navigator as any).platform || "Unknown OS";
  let name = "Desktop/Laptop";
  if (/android/i.test(ua)) name = "Android Device";
  else if (/ipad|iphone|ipod/i.test(ua)) name = "iOS Device";
  
  return `${name} (${platform})`;
}

export type RegisterDeviceResult = {
  ok: boolean;
  message?: string;
};

/**
 * Main registration function called on login/app load.
 * SMART MODE: Auto-cleans stale sessions (> 12 hours inactivity) to fix "ghost" sessions.
 */
export async function registerDeviceSession(
  userId: string
): Promise<RegisterDeviceResult> {
  const device_fingerprint = getDeviceFingerprint();
  const device_name = getDeviceName();
  const MAX_DEVICES = 2; // الحد المسموح به للأجهزة
  const STALE_SESSION_HOURS = 12; // الجلسات الخاملة لأكثر من 12 ساعة تحذف تلقائياً

  try {
    // 0. Check exemption (Admins/Supervisors bypass limits)
    // We wrap this in try-catch to avoid breaking flow if profiles table is RLS restricted for read
    let isExempt = false;
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .maybeSingle();
        
        isExempt = !!(profile && (profile.role === 'admin' || profile.role === 'supervisor'));
    } catch(err) {
        // Ignore exemption check failures
        console.warn("Exemption check failed, treating as normal user.");
    }

    // 1. Fetch ALL active sessions for this user to analyze them
    // SAFE FETCH: If table doesn't exist or RLS blocks, we just continue
    const { data: activeSessions, error: fetchError } = await supabase
        .from("device_sessions")
        .select("id, device_fingerprint, last_active_at")
        .eq("user_id", userId)
        .eq("active", true);

    if (fetchError) {
         // If error is related to missing table or permissions, log warn and ALLOW access
         // to prevent locking users out due to system config issues.
         console.warn("Device session check skipped due to DB error:", fetchError.message);
         return { ok: true };
    }

    let currentSessionId = null;
    let activeCount = 0;
    const now = new Date();

    // 2. Analyze and Clean Stale Sessions
    if (activeSessions && activeSessions.length > 0) {
        for (const session of activeSessions) {
            const lastActive = new Date(session.last_active_at);
            const hoursDiff = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60);

            if (session.device_fingerprint === device_fingerprint) {
                // This is THIS device re-logging in or refreshing
                currentSessionId = session.id;
                // Don't count self yet, we handle update below
            } else if (hoursDiff > STALE_SESSION_HOURS) {
                // This is a stale session from another device (Ghost session)
                // Auto-close it to free up space
                await supabase
                    .from("device_sessions")
                    .update({ active: false })
                    .eq("id", session.id);
                console.log(`Auto-cleaned stale session: ${session.id}`);
            } else {
                // Valid active session on another device
                activeCount++;
            }
        }
    }

    // 3. Check Limits (If not exempt)
    // We add 1 to activeCount if we are about to create a NEW session (currentSessionId is null)
    
    /* 
    // DISABLED TEMPORARILY: Allow login even if limit reached
    if (!isExempt && !currentSessionId && activeCount >= MAX_DEVICES) {
        return {
            ok: false,
            message: `عفواً، لقد تجاوزت الحد الأقصى للأجهزة المسموح بها (${MAX_DEVICES}). يجب تسجيل الخروج من الأجهزة الأخرى أولاً.`
        };
    }
    */

    // 4. Update or Insert
    if (currentSessionId) {
        // Update existing session heartbeat
        await supabase
            .from("device_sessions")
            .update({ active: true, last_active_at: new Date().toISOString() })
            .eq("id", currentSessionId);
    } else {
        // Create new session
        const { error: insertError } = await supabase.from("device_sessions").insert({
            user_id: userId,
            device_fingerprint,
            device_name,
            active: true,
            last_active_at: new Date().toISOString()
        });

        if (insertError) {
            // If DB trigger blocks it despite our cleanup (Race condition), handle gracefully
            if (insertError.message?.includes("تجاوز") || insertError.code === 'P0001') {
                 // Bypass checking even if DB blocks insert
                 console.warn("Session limit reached in DB, bypassing UI block.");
                 return { ok: true };
            }
            // If random DB error, log but don't block login
             console.error("Session insert failed:", insertError.message);
             return { ok: true };
        }
    }

    return { ok: true };

  } catch (error: any) {
      // FIX: Check for RLS or Missing Table errors FIRST to avoid alarming console.error
      if (error?.code === '42P01' || error?.code === '42501') {
          console.warn("Device sessions warning: Table missing or RLS policy restriction. Bypassing check to allow login.");
          return { ok: true };
      }
      
      console.error("Device registration error:", error?.message || error);
      
      // DISABLED BLOCKING ON ERROR: Return true to allow login
      return { 
          ok: true, 
          message: "حدث خطأ في التحقق من الأجهزة (تم التجاوز)." 
      };
  }
}

/**
 * Logout specific device (Current)
 * Ensures we use the correct fingerprint from local storage.
 */
export async function logoutCurrentDevice(userId: string) {
  const device_fingerprint = getDeviceFingerprint();
  
  if (!userId || !device_fingerprint) return;

  try {
      // Deactivate session in DB
      const { error } = await supabase
        .from("device_sessions")
        .update({ active: false }) 
        .eq("user_id", userId)
        .eq("device_fingerprint", device_fingerprint);
      
      if (error) {
          console.error("Error logging out device (DB update failed):", error);
      }
        
  } catch (e) {
      console.error("Error logging out device (Exception):", e);
  }
}

/**
 * Update heartbeat
 */
export async function touchDeviceActivity(userId: string) {
  const device_fingerprint = getDeviceFingerprint();
  // Fire and forget
  supabase
    .from("device_sessions")
    .update({ last_active_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("device_fingerprint", device_fingerprint)
    .then(() => {}); 
}
