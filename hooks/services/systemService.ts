
import { supabase, getPlatformSettings } from './storageService';
import { getAllSubscriptions } from './subscriptionService';
export { runSystemAudit, getSystemSummary, autoFixIssue, type SystemAuditReport, type DiagnosticItem, type DiagnosticStatus } from './systemAuditor';


export const getAdminStats = async () => {
    const { count: studentCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
    const { count: teacherCount } = await supabase.from('teachers').select('*', { count: 'exact', head: true });

    const subs = await getAllSubscriptions();
    const settings = await getPlatformSettings();
    return { students: studentCount || 0, teachers: teacherCount || 0, subs: subs || [], settings };
};

/**
 * ✅ تشغيل تنظيف شامل عبر Supabase RPC (cleanup_system_data)
 */
export const runSystemCleanup = async () => {
    try {
        const { data, error } = await supabase.rpc('cleanup_system_data');
        if (error) throw error;
        return { success: true, data };
    } catch (e: any) {
        console.error('System cleanup error:', e);
        return { success: false, error: e.message };
    }
};


/**
 * 🔐 فحص حالة تحصين النظام (Security Hardening Status)
 */
export const getSecurityHardeningReport = async () => {
    try {
        // فحص وجود pgcrypto والدوال الأمنية عبر RPC تشخيصي
        const { data, error } = await supabase.rpc('check_security_hardening');
        if (error) throw error;
        return { success: true, data };
    } catch (e: any) {
        console.error("Security Audit Error:", e);
        return { success: false, error: e.message };
    }
};

/**
 * 📝 جلب سجل التدقيق الأمني
 */
export const getSecurityAuditLogs = async (limit = 20) => {
    const { data, error } = await supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
    return { data, error };
};

// --- Device & Session Monitoring ---

export const getViolatingAccounts = async () => {
    return await supabase.rpc('get_violating_accounts');
};

export const getLoginHistory = async () => {
    return await supabase.rpc('get_login_history');
};

export const logoutDeviceSession = async (sessionId: string) => {
    return await supabase.from('device_sessions').update({ active: false }).eq('id', sessionId);
};

// --- Database Schema Audit ---

export const listPublicTables = async () => {
    return await supabase.rpc('list_public_tables');
};

export const getTableColumns = async (tableName: string) => {
    return await supabase.rpc('get_table_columns', { p_table: tableName });
};

/**
 * 🕵️‍♂️ فحص أمان RPCs
 */
export const checkSecurityHardening = async () => {
    try {
        const { data: hasAuditTable } = await supabase.rpc('check_table_exists', { p_table: 'security_audit_log' });
        const { data: rlsStatus } = await supabase.rpc('check_rls_status');

        return {
            auditLogEnabled: !!hasAuditTable,
            rlsStatus: rlsStatus || [],
            timestamp: new Date().toISOString()
        };
    } catch (e) {
        return { error: "Security RPCs missing", auditLogEnabled: false, rlsStatus: [] };
    }
};

// Added missing cleanOrphanedData fix
/**
 * 🧹 تنظيف البيانات اليتيمة (Orphaned Data Cleanup)
 * تقوم بحذف السجلات المرتبطة بمستخدمين لم يعد لهم وجود في جدول profiles
 */
export const cleanOrphanedData = async () => {
    try {
        const { data, error } = await supabase.rpc('clean_orphaned_data');

        if (error) {
            // Check if function doesn't exist to provide a helpful message
            if (error.code === '42883' || error.message?.includes('function')) {
                return {
                    error: { message: "الدالة البرمجية 'clean_orphaned_data' غير موجودة في قاعدة البيانات. يرجى تشغيل سكريبت الإصلاح من لوحة قاعدة البيانات." },
                    counts: { progress: 0, quizzes: 0, activity: 0 }
                };
            }
            return { error, counts: { progress: 0, quizzes: 0, activity: 0 } };
        }

        return {
            error: null,
            counts: {
                progress: data?.progress_deleted || 0,
                quizzes: data?.quizzes_deleted || 0,
                activity: data?.activity_deleted || 0
            }
        };
    } catch (e: any) {
        console.error("Cleanup Execution Error:", e);
        return {
            error: e,
            counts: { progress: 0, quizzes: 0, activity: 0 }
        };
    }
};
