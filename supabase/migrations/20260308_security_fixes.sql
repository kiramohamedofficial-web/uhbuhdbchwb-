-- ╔══════════════════════════════════════════════════════════╗
-- ║         إصلاح الثغرات الأمنية في قاعدة البيانات           ║
-- ║                    security_fixes.sql                     ║
-- ╚══════════════════════════════════════════════════════════╝
-- 
-- ⚠️ يجب تشغيل هذا الملف في Supabase SQL Editor
-- الرابط: https://supabase.com/dashboard/project/csipsaucwcuserhfrehn/sql
-- 
-- ═══════════════════════════════════════════════════════════
-- 1. إصلاح ثغرة جدول stories (الأخطر)
-- ═══════════════════════════════════════════════════════════

-- حذف السياسات الخطيرة التي تسمح لـ Anon بالحذف والإضافة
DROP POLICY IF EXISTS "Anon can delete stories" ON public.stories;
DROP POLICY IF EXISTS "Anon can insert stories" ON public.stories;

-- التأكد من تفعيل RLS على الجدول
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- ✅ سياسة القراءة: للجميع (قابل للتعديل)
DROP POLICY IF EXISTS "Anyone can read stories" ON public.stories;
CREATE POLICY "Anyone can read stories"
ON public.stories
FOR SELECT
USING (true);

-- ✅ سياسة الإضافة: للـ Admin فقط
DROP POLICY IF EXISTS "Only admin can insert stories" ON public.stories;
CREATE POLICY "Only admin can insert stories"
ON public.stories
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- ✅ سياسة التحديث: للـ Admin فقط
DROP POLICY IF EXISTS "Only admin can update stories" ON public.stories;
CREATE POLICY "Only admin can update stories"
ON public.stories
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- ✅ سياسة الحذف: للـ Admin فقط
DROP POLICY IF EXISTS "Only admin can delete stories" ON public.stories;
CREATE POLICY "Only admin can delete stories"
ON public.stories
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- ═══════════════════════════════════════════════════════════
-- 2. إزالة السياسات المكررة (cartoon_episodes)
-- ═══════════════════════════════════════════════════════════

-- عرض السياسات الموجودة أولاً (قم بتشغيل هذا للمراجعة)
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'cartoon_episodes';

-- ═══════════════════════════════════════════════════════════
-- 3. جدول email_verifications (لتخزين أكواد التحقق)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.email_verifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- فهرس لتسريع البحث
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON public.email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires ON public.email_verifications(expires_at);

-- تفعيل RLS
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

-- لا قراءة للعموم - Edge Functions تستخدم Service Role
CREATE POLICY "No public access to verifications"
ON public.email_verifications
FOR ALL
USING (false);

-- دالة لحذف الأكواد المنتهية تلقائياً
CREATE OR REPLACE FUNCTION cleanup_expired_verifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.email_verifications
    WHERE expires_at < now();
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- 4. التحقق من أن جدول profiles يدعم email_verified
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- ═══════════════════════════════════════════════════════════
-- 5. تأمين إضافي - التأكد من وجود Service Role فقط للعمليات الحساسة
-- ═══════════════════════════════════════════════════════════

-- دالة للتحقق من دور المستخدم (مساعدة)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    );
END;
$$;

-- ═══════════════════════════════════════════════════════════
-- ✅ التحقق النهائي - تشغيل هذا الاستعلام للتأكد
-- ═══════════════════════════════════════════════════════════
-- SELECT tablename, policyname, cmd, roles, qual
-- FROM pg_policies
-- WHERE tablename = 'stories'
-- ORDER BY policyname;
