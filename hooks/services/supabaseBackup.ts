/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║         ملف اتصال Supabase الاحتياطي الرئيسي              ║
 * ║  يُستخدم هذا الملف إذا فشل الاتصال الأساسي في               ║
 * ║  storageService.ts أو إذا احتجت لعميل منفصل               ║
 * ╚══════════════════════════════════════════════════════════╝
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ✅ بيانات الاتصال الأساسية
const PRIMARY_URL = 'https://csipsaucwcuserhfrehn.supabase.co';
const PRIMARY_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzaXBzYXVjd2N1c2VyaGZyZWhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyOTQwMTgsImV4cCI6MjA3Njg3MDAxOH0.FJu12ARvbqG0ny0D9d1Jje3BxXQ-q33gjx7JSH26j1w';

// ✅ بيانات الاتصال من متغيرات البيئة (الأولوية القصوى)
const ENV_URL = typeof process !== 'undefined'
    ? (process.env.NEXT_PUBLIC_SUPABASE_URL || PRIMARY_URL)
    : PRIMARY_URL;

const ENV_KEY = typeof process !== 'undefined'
    ? (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PRIMARY_ANON_KEY)
    : PRIMARY_ANON_KEY;

// ✅ إعدادات العميل الاحتياطي
const BACKUP_CLIENT_OPTIONS = {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    },
    realtime: {
        params: { eventsPerSecond: 10 },
    },
    global: {
        headers: { 'X-Client-Info': 'gstudent-backup-client' },
    },
};

/** العميل الاحتياطي مع Session */
let backupClientInstance: SupabaseClient | null = null;

export const getBackupClient = (): SupabaseClient => {
    if (!backupClientInstance) {
        backupClientInstance = createClient(ENV_URL, ENV_KEY, BACKUP_CLIENT_OPTIONS);
    }
    return backupClientInstance;
};

/** عميل مؤقت بدون حفظ Session (للعمليات الحساسة) */
export const createTempClient = (): SupabaseClient => {
    return createClient(ENV_URL, ENV_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
        },
        global: {
            headers: { 'X-Client-Info': 'gstudent-temp-client' },
        },
    });
};

/**
 * ✅ اختبار الاتصال بقاعدة البيانات
 * يُرجع true إذا كان الاتصال يعمل
 */
export const testConnection = async (): Promise<boolean> => {
    try {
        const client = getBackupClient();
        const { error } = await client.from('profiles').select('id').limit(1);
        return !error;
    } catch {
        return false;
    }
};

/**
 * ✅ الحصول على الـ Session الحالية
 */
export const getBackupSession = async () => {
    const client = getBackupClient();
    const { data: { session }, error } = await client.auth.getSession();
    if (error) return null;
    return session;
};

/**
 * ✅ إعادة ضبط العميل الاحتياطي (في حال حدوث مشكلة)
 */
export const resetBackupClient = () => {
    backupClientInstance = null;
};

export const supabaseBackup = getBackupClient();

export default supabaseBackup;
