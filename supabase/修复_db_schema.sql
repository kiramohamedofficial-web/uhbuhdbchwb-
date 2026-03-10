-- 🛠️ Gstudent Platform - Database Repair & Recovery Script
-- This script reconstructs missing tables and ensures schema integrity.

-- 1. Restore Missing 'books' Table
CREATE TABLE IF NOT EXISTS public.books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    author TEXT,
    cover_image TEXT,
    pdf_url TEXT,
    category TEXT,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Ensure Integrity for Empty Tables (adding indexes if missing)
CREATE INDEX IF NOT EXISTS idx_student_progress_student_id ON public.student_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_lessons_unit_id ON public.lessons(unit_id);

-- 3. Storage Bucket Check (Notes for admin)
-- Ensure 'profiles' and 'lesson-images' buckets exist in Supabase Dashboard.

-- 4. Enable Row Level Security (RLS) Safety Check
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public books are viewable by everyone" ON public.books;
CREATE POLICY "Public books are viewable by everyone" ON public.books FOR SELECT USING (true);
