
import { supabase } from './storageService';

export interface AuditLog {
    id: string;
    admin_id: string;
    admin_name: string;
    action: string;
    details: string;
    target_id?: string;
    target_type?: string;
    created_at: string;
}

export const logAdminAction = async (adminId: string, adminName: string, action: string, details: string, targetId?: string, targetType?: string) => {
    try {
        const { error } = await supabase.from('admin_audit_logs').insert({
            admin_id: adminId,
            admin_name: adminName,
            action,
            details,
            target_id: targetId,
            target_type: targetType
        });
        if (error) console.error("Failed to log admin action:", error);
    } catch (e) {
        console.error("Exception logging admin action:", e);
    }
};

export const getAuditLogs = async (limit = 100): Promise<AuditLog[]> => {
    try {
        const { data, error } = await supabase
            .from('admin_audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error("Failed to fetch audit logs:", e);
        return [];
    }
};

export const AUDIT_LOGS_SQL = `
-- Create admin_audit_logs table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    admin_name TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    target_id TEXT,
    target_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Policy: Admins can insert audit logs
CREATE POLICY "Admins can insert audit logs" ON public.admin_audit_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );
`;
