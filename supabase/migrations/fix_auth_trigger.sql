-- إصلاح شامل لنظام إنشاء الحسابات وحفظ الإيميل
-- قم بتشغيل هذا الكود في Supabase SQL Editor

-- 1. تحديث دالة Trigger لنسخ البريد الإلكتروني تلقائياً
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  parsed_grade_id bigint;
  user_role text;
BEGIN
  -- استخراج grade_id
  IF NEW.raw_user_meta_data->>'grade_id' ~ '^[0-9]+$' THEN
    parsed_grade_id := (NEW.raw_user_meta_data->>'grade_id')::bigint;
  ELSE
    parsed_grade_id := NULL;
  END IF;

  -- استخراج الدور
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');

  -- إدراج في جدول profiles مع نسخ الإيميل
  INSERT INTO public.profiles (
    id, name, email, phone, guardian_phone, grade_id, role, track, created_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'مستخدم جديد'),
    NEW.email, -- ✅ هذا السطر ينسخ البريد من جدول المصادقة
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'guardian_phone',
    parsed_grade_id,
    user_role,
    COALESCE(NEW.raw_user_meta_data->>'track', 'All'),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email, -- تحديث البريد إذا تغير
    name = EXCLUDED.name,
    phone = EXCLUDED.phone;

  RETURN NEW;
END;
$$;

-- 2. دالة الحذف (لإصلاح مشاكل الحذف)
CREATE OR REPLACE FUNCTION delete_user_account(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.profiles WHERE id = user_id;
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;

-- 3. سكريبت تعبئة البيانات المفقودة (Backfill) للحسابات القديمة
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id 
AND (p.email IS NULL OR p.email = '');
