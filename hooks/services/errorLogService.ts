
import { supabase } from './storageService';
import { ErrorLog } from '../types';

/**
 * 🛠️ خدمة تسجيل الأخطاء (Error Logging Service)
 * تقوم بتسجيل الأخطاء في جدول مخصص في قاعدة البيانات ليراها المالك.
 */

export const logError = async (
    source: string, 
    message: string, 
    details?: any, 
    severity: 'error' | 'warning' | 'info' = 'error'
) => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        
        // معلومات الجهاز
        const deviceInfo = typeof navigator !== 'undefined' ? navigator.userAgent : 'Server';

        const payload = {
            source,
            message: message.substring(0, 500), // Limit length
            stack: details ? JSON.stringify(details).substring(0, 2000) : null,
            user_id: userId,
            device_info: deviceInfo,
            severity,
            created_at: new Date().toISOString()
        };

        // محاولة الكتابة في جدول السجلات (يجب إنشاؤه في قاعدة البيانات)
        const { error } = await supabase.from('system_logs').insert(payload);
        
        if (error) {
            console.error("Failed to push log to DB:", error);
            // Fallback to console if DB fails
        }
    } catch (e) {
        console.error("Logging Service Exception:", e);
    }
};

export const getErrorLogs = async (limit = 100): Promise<ErrorLog[]> => {
    const { data, error } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error("Error fetching logs:", error);
        return [];
    }
    
    return data as ErrorLog[];
};

export const clearErrorLogs = async () => {
    const { error } = await supabase.from('system_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (error) throw error;
};

// SQL Helper for creating the table (Use in SQL Editor)
export const ERROR_LOGS_SQL = `
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source TEXT,
    message TEXT,
    stack TEXT,
    user_id UUID,
    device_info TEXT,
    severity TEXT DEFAULT 'error',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Allow insert by everyone (for logging client errors)
CREATE POLICY "Enable insert for all users" ON public.system_logs FOR INSERT WITH CHECK (true);

-- Allow select/delete only by admins
CREATE POLICY "Enable access for admins" ON public.system_logs 
FOR ALL 
USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );
`;
