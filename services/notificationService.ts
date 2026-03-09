
import { supabase } from './storageService';
import { logAdminAction } from './auditService';

// ═══════════════════════════════════════════════════════════
// 📢 نظام الإشعارات الشامل - Push Notifications Service
// ═══════════════════════════════════════════════════════════

export type NotificationTarget = 'all' | 'students' | 'teachers' | 'supervisors' | 'specific';
export type NotificationChannel = 'in_app' | 'broadcast' | 'both';
export type NotificationSeverity = 'info' | 'warning' | 'success' | 'error' | 'urgent';

export interface BroadcastMessage {
    id: string;
    title: string;
    body: string;
    target: NotificationTarget;
    channel: NotificationChannel;
    severity: NotificationSeverity;
    targetUserIds?: string[];
    createdBy: string;
    createdByName: string;
    isActive: boolean;
    scheduledAt?: string;
    expiresAt?: string;
    createdAt: string;
    readCount?: number;
    totalCount?: number;
    link?: string;
    imageUrl?: string;
}

export interface NotificationRecord {
    id: string;
    messageId: string;
    userId: string;
    isRead: boolean;
    readAt?: string;
    createdAt: string;
}

// ═══════════════════════════════════════════════════════════
// 📤 بث رسالة لجميع الطلاب أو مجموعة محددة
// ═══════════════════════════════════════════════════════════

export const broadcastMessage = async (params: {
    title: string;
    body: string;
    target: NotificationTarget;
    severity?: NotificationSeverity;
    channel?: NotificationChannel;
    targetUserIds?: string[];
    expiresInHours?: number;
    link?: string;
    imageUrl?: string;
    adminId: string;
    adminName: string;
}): Promise<{ success: boolean; messageId?: string; recipientCount?: number; error?: string }> => {
    try {
        const {
            title, body, target, severity = 'info', channel = 'both',
            targetUserIds, expiresInHours, link, imageUrl, adminId, adminName
        } = params;

        const expiresAt = expiresInHours
            ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString()
            : null;

        // 1. إنشاء رسالة البث
        const { data: message, error: msgError } = await supabase
            .from('broadcast_messages')
            .insert({
                title,
                body,
                target,
                channel,
                severity,
                target_user_ids: targetUserIds || null,
                created_by: adminId,
                created_by_name: adminName,
                is_active: true,
                expires_at: expiresAt,
                link,
                image_url: imageUrl,
            })
            .select()
            .single();

        if (msgError) {
            console.error('Broadcast message insert error:', msgError);
            return { success: false, error: msgError.message };
        }

        // 2. تحديد المستلمين
        let recipientIds: string[] = [];

        if (target === 'specific' && targetUserIds?.length) {
            recipientIds = targetUserIds;
        } else if (target !== 'all') {
            // جلب المستخدمين حسب الدور
            const roleMap: Record<string, string> = {
                students: 'student',
                teachers: 'teacher',
                supervisors: 'supervisor',
            };
            const role = roleMap[target];
            if (role) {
                const { data: users } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('role', role);
                recipientIds = (users || []).map((u: any) => u.id);
            }
        } else {
            // جميع المستخدمين
            const { data: users } = await supabase
                .from('profiles')
                .select('id');
            recipientIds = (users || []).map((u: any) => u.id);
        }

        // 3. إنشاء سجلات الإشعارات الفردية
        if (recipientIds.length > 0 && channel !== 'broadcast') {
            const notifications = recipientIds.map(userId => ({
                message_id: message.id,
                user_id: userId,
                is_read: false,
            }));

            // إدراج على دفعات لتجنب تجاوز الحدود
            const batchSize = 500;
            for (let i = 0; i < notifications.length; i += batchSize) {
                const batch = notifications.slice(i, i + batchSize);
                const { error: notifError } = await supabase
                    .from('user_notifications')
                    .insert(batch);
                if (notifError) console.warn(`Batch ${i} insert warning:`, notifError.message);
            }
        }

        // 4. تسجيل العملية في سجل التدقيق
        await logAdminAction(
            adminId,
            adminName,
            'BROADCAST_MESSAGE',
            `تم بث رسالة "${title}" إلى ${recipientIds.length} مستخدم (target: ${target})`,
            message.id,
            'broadcast_message'
        );

        return {
            success: true,
            messageId: message.id,
            recipientCount: recipientIds.length,
        };

    } catch (err: any) {
        console.error('broadcastMessage error:', err);
        return { success: false, error: err.message };
    }
};

// ═══════════════════════════════════════════════════════════
// 📥 جلب الإشعارات الخاصة بمستخدم
// ═══════════════════════════════════════════════════════════

export const getUserNotifications = async (
    userId: string,
    limit = 30
): Promise<{ notifications: any[]; unreadCount: number }> => {
    try {
        // جلب الإشعارات الشخصية
        const { data: personal } = await supabase
            .from('user_notifications')
            .select(`
                *,
                broadcast_messages (
                    id, title, body, severity, link, image_url, created_at, expires_at
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        // جلب الرسائل العامة (broadcast فقط - لا تحتاج سجلات فردية)
        const { data: broadcasts } = await supabase
            .from('broadcast_messages')
            .select('*')
            .eq('is_active', true)
            .in('target', ['all', 'students'])
            .eq('channel', 'broadcast')
            .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
            .order('created_at', { ascending: false })
            .limit(10);

        const personalMapped = (personal || [])
            .filter((n: any) => n.broadcast_messages)
            .map((n: any) => ({
                id: n.id,
                messageId: n.message_id,
                title: n.broadcast_messages.title,
                body: n.broadcast_messages.body,
                severity: n.broadcast_messages.severity,
                link: n.broadcast_messages.link,
                imageUrl: n.broadcast_messages.image_url,
                isRead: n.is_read,
                readAt: n.read_at,
                createdAt: n.broadcast_messages.created_at,
                source: 'personal',
            }));

        const broadcastMapped = (broadcasts || []).map((b: any) => ({
            id: `broadcast-${b.id}`,
            messageId: b.id,
            title: b.title,
            body: b.body,
            severity: b.severity,
            link: b.link,
            imageUrl: b.image_url,
            isRead: false, // broadcasts are always shown
            createdAt: b.created_at,
            source: 'broadcast',
        }));

        const allNotifications = [...personalMapped, ...broadcastMapped]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, limit);

        const unreadCount = personalMapped.filter(n => !n.isRead).length + broadcastMapped.length;

        return { notifications: allNotifications, unreadCount };
    } catch (err) {
        console.error('getUserNotifications error:', err);
        return { notifications: [], unreadCount: 0 };
    }
};

// ═══════════════════════════════════════════════════════════
// ✅ تعليم إشعار كمقروء
// ═══════════════════════════════════════════════════════════

export const markNotificationRead = async (notificationId: string, userId: string) => {
    return await supabase
        .from('user_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', userId);
};

export const markAllNotificationsRead = async (userId: string) => {
    return await supabase
        .from('user_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_read', false);
};

// ═══════════════════════════════════════════════════════════
// 📊 إحصائيات الإشعارات (للمدير)
// ═══════════════════════════════════════════════════════════

export const getBroadcastStats = async () => {
    const { data: messages } = await supabase
        .from('broadcast_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    if (!messages) return [];

    return messages.map((m: any) => ({
        id: m.id,
        title: m.title,
        body: m.body,
        target: m.target,
        severity: m.severity,
        isActive: m.is_active,
        createdAt: m.created_at,
        expiresAt: m.expires_at,
        createdByName: m.created_by_name,
    }));
};

export const deleteBroadcastMessage = async (messageId: string) => {
    // حذف الإشعارات الفردية أولاً
    await supabase.from('user_notifications').delete().eq('message_id', messageId);
    // ثم حذف الرسالة
    return await supabase.from('broadcast_messages').delete().eq('id', messageId);
};

export const toggleBroadcastMessage = async (messageId: string, isActive: boolean) => {
    return await supabase
        .from('broadcast_messages')
        .update({ is_active: isActive })
        .eq('id', messageId);
};

// ═══════════════════════════════════════════════════════════
// 🔔 إشعار مخصص لمستخدم واحد
// ═══════════════════════════════════════════════════════════

export const sendPersonalNotification = async (params: {
    userId: string;
    title: string;
    body: string;
    severity?: NotificationSeverity;
    link?: string;
    adminId: string;
    adminName: string;
}) => {
    return broadcastMessage({
        ...params,
        target: 'specific',
        targetUserIds: [params.userId],
        channel: 'in_app',
        severity: params.severity || 'info',
    });
};

// SQL for creating required tables (run in Supabase SQL Editor)
export const NOTIFICATION_TABLES_SQL = `
-- ════ جدول رسائل البث ════
CREATE TABLE IF NOT EXISTS public.broadcast_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    target TEXT NOT NULL DEFAULT 'all',
    channel TEXT NOT NULL DEFAULT 'both',
    severity TEXT NOT NULL DEFAULT 'info',
    target_user_ids UUID[],
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by_name TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    scheduled_at TIMESTAMPTZ,
    link TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage broadcast messages"
ON public.broadcast_messages FOR ALL
USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' )
WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );

CREATE POLICY "Users can read active broadcasts"
ON public.broadcast_messages FOR SELECT
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- ════ جدول إشعارات المستخدمين ════
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES public.broadcast_messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(message_id, user_id)
);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread ON public.user_notifications(user_id, is_read) WHERE is_read = false;

CREATE POLICY "Users can manage their own notifications"
ON public.user_notifications FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Admins can read all notifications"
ON public.user_notifications FOR SELECT
USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );
`;
