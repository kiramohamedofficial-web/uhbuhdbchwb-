-- ╔══════════════════════════════════════════════════════════════════╗
-- ║     System Audit, Optimization & Notification Infrastructure     ║
-- ║                  20260308_full_system_upgrade.sql                ║
-- ╚══════════════════════════════════════════════════════════════════╝
--
-- 🚀 شغّل هذا الملف في Supabase SQL Editor:
-- https://supabase.com/dashboard/project/csipsaucwcuserhfrehn/sql
--
-- ════════════════════════════════════════════════════════════════════
-- PART 1: إصلاح ثغرة stories الأمنية (من الملف السابق)
-- ════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Anon can delete stories" ON public.stories;
DROP POLICY IF EXISTS "Anon can insert stories" ON public.stories;

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read stories" ON public.stories;
CREATE POLICY "Anyone can read stories" ON public.stories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admin can insert stories" ON public.stories;
CREATE POLICY "Only admin can insert stories" ON public.stories FOR INSERT
WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );

DROP POLICY IF EXISTS "Only admin can update stories" ON public.stories;
CREATE POLICY "Only admin can update stories" ON public.stories FOR UPDATE
USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' )
WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );

DROP POLICY IF EXISTS "Only admin can delete stories" ON public.stories;
CREATE POLICY "Only admin can delete stories" ON public.stories FOR DELETE
USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );

-- ════════════════════════════════════════════════════════════════════
-- PART 2: جداول نظام الإشعارات الشامل
-- ════════════════════════════════════════════════════════════════════

-- 2A. رسائل البث (Broadcast Messages)
CREATE TABLE IF NOT EXISTS public.broadcast_messages (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title       TEXT NOT NULL,
    body        TEXT NOT NULL,
    target      TEXT NOT NULL DEFAULT 'all'
                    CHECK (target IN ('all','students','teachers','supervisors','specific')),
    channel     TEXT NOT NULL DEFAULT 'both'
                    CHECK (channel IN ('in_app','broadcast','both')),
    severity    TEXT NOT NULL DEFAULT 'info'
                    CHECK (severity IN ('info','warning','success','error','urgent')),
    target_user_ids UUID[],
    created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by_name TEXT,
    is_active   BOOLEAN DEFAULT true NOT NULL,
    expires_at  TIMESTAMPTZ,
    scheduled_at TIMESTAMPTZ,
    link        TEXT,
    image_url   TEXT,
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.broadcast_messages IS 'رسائل البث من المدير للطلاب والمستخدمين';

ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;

-- فهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_active 
    ON public.broadcast_messages(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_target 
    ON public.broadcast_messages(target, is_active);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_created 
    ON public.broadcast_messages(created_at DESC);

-- سياسات RLS
DROP POLICY IF EXISTS "Admins manage broadcast messages" ON public.broadcast_messages;
CREATE POLICY "Admins manage broadcast messages" ON public.broadcast_messages
    FOR ALL
    USING  ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' )
    WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );

DROP POLICY IF EXISTS "Users can read active broadcasts" ON public.broadcast_messages;
CREATE POLICY "Users can read active broadcasts" ON public.broadcast_messages
    FOR SELECT
    USING (
        is_active = true
        AND (expires_at IS NULL OR expires_at > now())
        AND auth.uid() IS NOT NULL
    );

-- ────────────────────────────────────────────────────────────────────
-- 2B. إشعارات المستخدمين الفردية
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_notifications (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id  UUID REFERENCES public.broadcast_messages(id) ON DELETE CASCADE NOT NULL,
    user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    is_read     BOOLEAN DEFAULT false NOT NULL,
    read_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(message_id, user_id)
);

COMMENT ON TABLE public.user_notifications IS 'إشعارات شخصية لكل مستخدم';

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- فهارس لتحسين الأداء (مهم جداً مع كثرة السجلات)
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id
    ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread
    ON public.user_notifications(user_id, is_read)
    WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_user_notifications_created
    ON public.user_notifications(created_at DESC);

DROP POLICY IF EXISTS "Users manage own notifications" ON public.user_notifications;
CREATE POLICY "Users manage own notifications" ON public.user_notifications
    FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins read all notifications" ON public.user_notifications;
CREATE POLICY "Admins read all notifications" ON public.user_notifications
    FOR SELECT
    USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );

-- ════════════════════════════════════════════════════════════════════
-- PART 3: جدول سجل التدقيق (Admin Audit Log)
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    admin_name  TEXT NOT NULL,
    action      TEXT NOT NULL,
    details     TEXT,
    target_id   TEXT,
    target_type TEXT,
    ip_address  TEXT,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.admin_audit_logs IS 'سجل جميع العمليات الإدارية';

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON public.admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.admin_audit_logs(created_at DESC);

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs
    FOR SELECT
    USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );

-- السماح بالإدراج لأي مستخدم مسجل دخول (لتسجيل عمليات الإدارة)
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can insert audit logs" ON public.admin_audit_logs
    FOR INSERT
    WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor') );

-- ════════════════════════════════════════════════════════════════════
-- PART 4: جدول سجل أخطاء النظام
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.system_logs (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source      TEXT,
    message     TEXT,
    stack       TEXT,
    user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_role   TEXT,
    device_info TEXT,
    severity    TEXT DEFAULT 'error' CHECK (severity IN ('error','warning','info')),
    created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.system_logs IS 'سجل أخطاء النظام والتشخيص';

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_system_logs_severity ON public.system_logs(severity);
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON public.system_logs(created_at DESC);

DROP POLICY IF EXISTS "Enable insert for all users" ON public.system_logs;
CREATE POLICY "Enable insert for all users" ON public.system_logs
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable access for admins" ON public.system_logs;
CREATE POLICY "Enable access for admins" ON public.system_logs
    FOR SELECT
    USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );

DROP POLICY IF EXISTS "Admins delete logs" ON public.system_logs;
CREATE POLICY "Admins delete logs" ON public.system_logs
    FOR DELETE
    USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );

-- ════════════════════════════════════════════════════════════════════
-- PART 5: جدول أكواد التحقق من الإيميل
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.email_verifications (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email       TEXT NOT NULL,
    code        TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON public.email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires ON public.email_verifications(expires_at);

ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No public access to verifications" ON public.email_verifications FOR ALL USING (false);

-- ════════════════════════════════════════════════════════════════════
-- PART 6: تحسينات أداء الفهارس على الجداول الموجودة
-- ════════════════════════════════════════════════════════════════════

-- فهارس profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_grade_id ON public.profiles(grade_id);

-- فهارس subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status 
    ON public.subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_end 
    ON public.subscriptions(status, end_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_teacher_id 
    ON public.subscriptions(teacher_id);

-- فهارس lessons
CREATE INDEX IF NOT EXISTS idx_lessons_unit_id ON public.lessons(unit_id);
CREATE INDEX IF NOT EXISTS idx_lessons_teacher_id ON public.lessons(teacher_id);

-- فهارس device_sessions
CREATE INDEX IF NOT EXISTS idx_device_sessions_user_active 
    ON public.device_sessions(user_id, active);
CREATE INDEX IF NOT EXISTS idx_device_sessions_last_active 
    ON public.device_sessions(last_active);

-- ════════════════════════════════════════════════════════════════════
-- PART 7: إضافة حقول email_verified لـ profiles
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- ════════════════════════════════════════════════════════════════════
-- PART 8: دوال مساعدة للنظام
-- ════════════════════════════════════════════════════════════════════

-- دالة تنظيف تلقائي للبيانات المنتهية
CREATE OR REPLACE FUNCTION cleanup_system_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    expired_subs_count INTEGER;
    stale_sessions_count INTEGER;
    expired_broadcasts_count INTEGER;
    expired_verifications_count INTEGER;
BEGIN
    -- تحديث الاشتراكات المنتهية
    UPDATE subscriptions SET status = 'Expired'
    WHERE status = 'Active' AND end_date < now();
    GET DIAGNOSTICS expired_subs_count = ROW_COUNT;

    -- إيقاف الجلسات القديمة (+30 يوم)
    UPDATE device_sessions SET active = false
    WHERE active = true AND last_active < now() - interval '30 days';
    GET DIAGNOSTICS stale_sessions_count = ROW_COUNT;

    -- إيقاف رسائل البث المنتهية
    UPDATE broadcast_messages SET is_active = false
    WHERE is_active = true AND expires_at IS NOT NULL AND expires_at < now();
    GET DIAGNOSTICS expired_broadcasts_count = ROW_COUNT;

    -- حذف أكواد التحقق المنتهية
    DELETE FROM email_verifications WHERE expires_at < now();
    GET DIAGNOSTICS expired_verifications_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'expired_subscriptions_updated', expired_subs_count,
        'stale_sessions_deactivated', stale_sessions_count,
        'expired_broadcasts_deactivated', expired_broadcasts_count,
        'expired_verifications_deleted', expired_verifications_count,
        'cleaned_at', now()
    );
END;
$$;

-- دالة فحص وجود جدول
CREATE OR REPLACE FUNCTION check_table_exists(p_table TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = p_table
    );
END;
$$;

-- دالة فحص حالة RLS
CREATE OR REPLACE FUNCTION check_rls_status()
RETURNS TABLE(table_name TEXT, rls_enabled BOOLEAN, policy_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.tablename::TEXT,
        t.rowsecurity,
        COUNT(p.policyname) AS policy_count
    FROM pg_tables t
    LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = 'public'
    WHERE t.schemaname = 'public'
    GROUP BY t.tablename, t.rowsecurity
    ORDER BY t.tablename;
END;
$$;

-- دالة تنظيف البيانات اليتيمة
CREATE OR REPLACE FUNCTION clean_orphaned_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    progress_deleted INTEGER := 0;
    quizzes_deleted INTEGER := 0;
    activity_deleted INTEGER := 0;
BEGIN
    -- حذف سجلات التقدم لمستخدمين غير موجودين
    DELETE FROM student_progress sp
    WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = sp.student_id);
    GET DIAGNOSTICS progress_deleted = ROW_COUNT;

    -- حذف محاولات الاختبار لمستخدمين غير موجودين
    DELETE FROM quiz_attempts qa
    WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = qa.user_id);
    GET DIAGNOSTICS quizzes_deleted = ROW_COUNT;

    -- حذف نشاط الفيديو لمستخدمين غير موجودين
    DELETE FROM video_activity va
    WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = va.user_id);
    GET DIAGNOSTICS activity_deleted = ROW_COUNT;

    RETURN jsonb_build_object(
        'progress_deleted', progress_deleted,
        'quizzes_deleted', quizzes_deleted,
        'activity_deleted', activity_deleted
    );
END;
$$;

-- ════════════════════════════════════════════════════════════════════
-- PART 9: جدول الإعلانات (announcements) إذا لم يكن موجوداً
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.announcements (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title      TEXT NOT NULL,
    content    TEXT NOT NULL,
    image_url  TEXT,
    link_url   TEXT,
    is_active  BOOLEAN DEFAULT true,
    priority   INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_announcements_active ON public.announcements(is_active, priority DESC);

DROP POLICY IF EXISTS "Anyone can read active announcements" ON public.announcements;
CREATE POLICY "Anyone can read active announcements" ON public.announcements
    FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins manage announcements" ON public.announcements;
CREATE POLICY "Admins manage announcements" ON public.announcements
    FOR ALL
    USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' )
    WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );

-- ════════════════════════════════════════════════════════════════════
-- ✅ التحقق النهائي - شغّل هذا للتأكد
-- ════════════════════════════════════════════════════════════════════

-- SELECT cleanup_system_data();
-- SELECT check_rls_status() ORDER BY table_name;
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
