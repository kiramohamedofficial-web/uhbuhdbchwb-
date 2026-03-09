
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../services/storageService';
import { useToast } from '../../useToast';
import { analyzeDatabaseStructure } from '../../services/geminiService';
import { ToastType } from '../../types';
import { 
    ArrowRightIcon, DatabaseIcon, CheckCircleIcon, XCircleIcon, 
    ShieldExclamationIcon, ListIcon, 
    CodeIcon, ClipboardIcon, InformationCircleIcon, SparklesIcon
} from '../common/Icons';
import Loader from '../common/Loader';

// --- الوثائق المرجعية (الحقيقة المطلقة للمنصة) ---
const FULL_DB_DOCS = `
# 📊 المخطط النموذجي لمنصة Gstudent

## 👥 المستخدمين
- **profiles**: id (UUID), name, email (Updated), phone, role, grade_id, stage, track, teacher_id, profile_image_url, guardian_phone, max_devices, created_at.
- **teachers**: id (UUID), name, phone, subject, image_url, teaching_grades, teaching_levels, is_special.
- **supervisor_teachers**: supervisor_id, teacher_id.

## 📚 المحتوى
- **grades**: id, name, name_ar, level, level_ar, stage.
- **units**: id, title, semester_id, teacher_id, track.
- **lessons**: id, title, description, content, video_url, image_url, type, unit_id, is_free, questions, video_questions, quiz_type, passing_score.
- **courses**: id, title, description, cover_image, teacher_id, price, is_published, is_free, pdf_url.
- **course_videos**: id, title, video_url, is_free, course_id.
- **reels**: id, title, youtube_url, is_published.

## 💳 الاشتراكات والعمليات
- **subscriptions**: id, user_id, plan, status, teacher_id, start_date, end_date.
- **subscription_requests_temp**: id, user_id, user_name, plan, payment_from_number, status, subject_name, unit_id.
- **subscription_codes**: code, duration_days, max_uses, times_used, teacher_id, used_by_user_ids.

## 📱 النظام والترفيه
- **device_sessions**: id, user_id, device_fingerprint, active, last_active_at.
- **cartoon_movies**: id, title, story, poster_url, type, category, rating, is_published, franchise, gallery_images.
- **cartoon_seasons**: id, series_id, season_number, title, poster_url.
- **cartoon_episodes**: id, movie_id, season_id, episode_number, title, video_url, download_links.
- **movie_requests**: id, user_id, student_name, movie_name, notes, admin_reply, status.
- **stories**: id, type, content, category, is_permanent, expires_at, movie_data.
- **platform_settings**: id, platform_name, hero_title, monthly_price, quarterly_price, semi_annually_price, annual_price, payment_numbers, announcement_banner, icon_settings.

## ⚙️ Triggers & Functions
- **handle_new_user**: يجب أن ينسخ (email, phone, name) من auth.users إلى profiles.
- **delete_user_account**: لحذف المستخدم بالكامل.
`;

const DatabaseDiagnosticsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { addToast } = useToast();
    const [activeView, setActiveView] = useState<'status' | 'sql' | 'docs' | 'audit' | 'ai-report'>('status');
    const [isLoading, setIsLoading] = useState(false);
    
    // Audit Results
    const [auditSummary, setAuditSummary] = useState<{
        tablesFound: number;
        missingTables: string[];
        columnIssues: Record<string, string[]>;
        isPerfect: boolean;
    } | null>(null);

    // AI Analysis State
    const [aiAnalysisResult, setAiAnalysisResult] = useState<string>('');
    const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

    // --- 🛠️ استكشاف قاعدة البيانات الحية ---
    const runDeepAudit = useCallback(async () => {
        setIsLoading(true);
        setAuditSummary(null);
        
        try {
            // 1. الحصول على قائمة الجداول الحقيقية من Information Schema عبر RPC
            const { data: allDbTables, error: listError } = await supabase.rpc('list_public_tables');
            if (listError) throw listError;
            
            const dbTableNames = (allDbTables as any[]).map(t => t.table_name);
            
            // 2. تحليل الجداول المفقودة بناءً على FULL_DB_DOCS
            // استخراج أسماء الجداول من النص المرجعي
            const expectedTableNames = [
                'profiles', 'teachers', 'supervisor_teachers', 'grades', 'units', 'lessons', 
                'courses', 'course_videos', 'reels', 'subscriptions', 'subscription_requests_temp', 
                'subscription_codes', 'device_sessions', 'cartoon_movies', 'cartoon_seasons', 
                'cartoon_episodes', 'movie_requests', 'stories', 'platform_settings'
            ];

            const missingTables = expectedTableNames.filter(name => !dbTableNames.includes(name));
            const columnIssues: Record<string, string[]> = {};

            // 3. فحص الأعمدة للجداول الموجودة
            for (const tableName of expectedTableNames) {
                if (dbTableNames.includes(tableName)) {
                    const { data: cols } = await supabase.rpc('get_table_columns', { p_table: tableName });
                    if (cols) {
                        const dbCols = (cols as any[]).map(c => c.column_name);
                        // استخراج الأعمدة المتوقعة يدوياً للمقارنة السريعة في الواجهة
                        // سنعتمد هنا على الـ AI للتحليل العميق، ولكن نعطي مؤشرات أولية
                    }
                }
            }

            setAuditSummary({
                tablesFound: dbTableNames.length,
                missingTables,
                columnIssues,
                isPerfect: missingTables.length === 0
            });

            addToast("اكتمل المسح الأولي لهيكل البيانات.", ToastType.SUCCESS);

        } catch (e: any) {
            addToast(`خطأ أثناء الفحص: ${e.message}`, ToastType.ERROR);
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    // --- 🤖 بدء التحليل الذكي عبر Gemini ---
    const runAiAudit = async () => {
        if (!process.env.API_KEY) {
            addToast("مفتاح API مفقود.", ToastType.ERROR);
            return;
        }

        setIsAiAnalyzing(true);
        setAiAnalysisResult('');
        
        try {
            // 1. جلب الهيكل الكامل الحالي بدقة
            const { data: allDbTables } = await supabase.rpc('list_public_tables');
            const currentLiveSchema: Record<string, string[]> = {};

            if (Array.isArray(allDbTables)) {
                for (const t of (allDbTables as any[])) {
                    const { data: cols } = await supabase.rpc('get_table_columns', { p_table: t.table_name });
                    if (Array.isArray(cols)) {
                        currentLiveSchema[t.table_name] = cols.map(c => c.column_name);
                    }
                }
            }

            // 2. طلب التحليل من Gemini
            const analysis = await analyzeDatabaseStructure(JSON.stringify(currentLiveSchema), FULL_DB_DOCS);
            setAiAnalysisResult(analysis);
            addToast("تم إنتاج التقرير الذكي.", ToastType.SUCCESS);
            setActiveView('ai-report');

        } catch (e: any) {
            addToast(`فشل التحليل الذكي: ${e.message}`, ToastType.ERROR);
        } finally {
            setIsAiAnalyzing(false);
        }
    };

    const fullSqlSchema = `-- Gstudent Complete Database Schema & Diagnostics Support
-- Run this in Supabase SQL Editor

-- 🛠️ 1. دالة جلب أسماء الأعمدة (لفحص الهيكلية)
CREATE OR REPLACE FUNCTION get_table_columns(p_table text)
RETURNS TABLE (column_name text, data_type text) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT c.column_name::text, c.data_type::text
  FROM information_schema.columns c
  WHERE c.table_name = p_table
  AND c.table_schema = 'public';
END;
$$;

-- 🛠️ 2. دالة جلب قائمة الجداول (لكشف الجداول غير المستخدمة)
CREATE OR REPLACE FUNCTION list_public_tables()
RETURNS TABLE (table_name text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT t.table_name::text
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE';
END;
$$;

-- 🛠️ 3. إصلاح صلاحيات المنهج (Units & Lessons)
ALTER TABLE IF EXISTS public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view units" ON public.units;
CREATE POLICY "Anyone can view units" ON public.units FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage units" ON public.units;
CREATE POLICY "Admins manage units" ON public.units
FOR ALL TO authenticated USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'teacher', 'supervisor')
) WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'teacher', 'supervisor')
);

DROP POLICY IF EXISTS "Anyone can view lessons" ON public.lessons;
CREATE POLICY "Anyone can view lessons" ON public.lessons FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage lessons" ON public.lessons;
CREATE POLICY "Admins manage lessons" ON public.lessons
FOR ALL TO authenticated USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'teacher', 'supervisor')
) WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'teacher', 'supervisor')
);

-- 🛠️ 4. إصلاح التريجر لضمان حفظ الإيميل
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  parsed_grade_id bigint;
  user_role text;
BEGIN
  IF NEW.raw_user_meta_data->>'grade_id' ~ '^[0-9]+$' THEN
    parsed_grade_id := (NEW.raw_user_meta_data->>'grade_id')::bigint;
  ELSE
    parsed_grade_id := NULL;
  END IF;
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');

  INSERT INTO public.profiles (
    id, name, email, phone, guardian_phone, grade_id, role, track, created_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'مستخدم جديد'),
    NEW.email, -- Copy Email
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'guardian_phone',
    parsed_grade_id,
    user_role,
    COALESCE(NEW.raw_user_meta_data->>'track', 'All'),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    phone = EXCLUDED.phone;

  RETURN NEW;
END;
$$;

-- 🛠️ 5. دالة تنظيف البيانات اليتيمة (Required for System Health)
CREATE OR REPLACE FUNCTION clean_orphaned_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_progress_count int;
  v_quizzes_count int;
  v_activity_count int;
BEGIN
  DELETE FROM public.student_progress WHERE student_id NOT IN (SELECT id FROM public.profiles);
  GET DIAGNOSTICS v_progress_count = ROW_COUNT;

  DELETE FROM public.quiz_attempts WHERE user_id NOT IN (SELECT id FROM public.profiles);
  GET DIAGNOSTICS v_quizzes_count = ROW_COUNT;

  DELETE FROM public.video_activity WHERE user_id NOT IN (SELECT id FROM public.profiles);
  GET DIAGNOSTICS v_activity_count = ROW_COUNT;

  RETURN json_build_object(
    'progress_deleted', v_progress_count,
    'quizzes_deleted', v_quizzes_count,
    'activity_deleted', v_activity_count
  );
END;
$$;
`;

    const copySql = () => {
        navigator.clipboard.writeText(fullSqlSchema);
        addToast("تم نسخ كود الـ SQL للحافظة", ToastType.SUCCESS);
    };

    return (
        <div className="fade-in space-y-6 pb-20 max-w-6xl mx-auto">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-purple-500 transition-all">
                        <ArrowRightIcon className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-[var(--text-primary)]">هيكل قاعدة البيانات</h1>
                        <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-1">Database Schema & Access Controls</p>
                    </div>
                </div>
                <div className="flex bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-primary)] shadow-sm">
                    <button onClick={() => setActiveView('status')} className={`px-6 py-2 rounded-lg text-sm font-black transition-all ${activeView === 'status' ? 'bg-indigo-600 text-white shadow-md' : 'text-[var(--text-secondary)]'}`}>الحالة</button>
                    <button onClick={() => setActiveView('sql')} className={`px-6 py-2 rounded-lg text-sm font-black transition-all ${activeView === 'sql' ? 'bg-indigo-600 text-white shadow-md' : 'text-[var(--text-secondary)]'}`}>تعميم الكود (SQL)</button>
                    <button onClick={() => setActiveView('docs')} className={`px-6 py-2 rounded-lg text-sm font-black transition-all ${activeView === 'docs' ? 'bg-indigo-600 text-white shadow-md' : 'text-[var(--text-secondary)]'}`}>التوثيق</button>
                </div>
            </header>

            {activeView === 'status' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isLoading ? (
                        <div className="col-span-full py-20 flex justify-center"><Loader /></div>
                    ) : (
                        auditSummary?.tablesFound ? (
                            <div className="col-span-full text-center py-20">
                                <CheckCircleIcon className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                                <h3 className="text-2xl font-bold">تم العثور على {auditSummary.tablesFound} جدول</h3>
                                <p className="text-gray-500">للحصول على تقرير مفصل، يرجى استخدام تحليل الذكاء الاصطناعي.</p>
                            </div>
                        ) : (
                            <div className="col-span-full text-center py-20">
                                <DatabaseIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                <button onClick={runDeepAudit} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold">بدء المسح</button>
                            </div>
                        )
                    )}
                </div>
            ) : activeView === 'sql' ? (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-[#0f172a] rounded-[2.5rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600"></div>
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400 border border-indigo-500/20">
                                    <CodeIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white">Full SQL Schema Repair</h2>
                                    <p className="text-sm text-slate-400 font-bold">Copy and execute in Supabase SQL Editor to fix questions & access issues</p>
                                </div>
                            </div>
                            <button onClick={copySql} className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all flex items-center gap-2 border border-white/10 group active:scale-95 shadow-lg">
                                <ClipboardIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                <span className="text-sm font-black">نسخ كود الإصلاح</span>
                            </button>
                        </div>

                        <div className="bg-black/40 rounded-2xl border border-white/5 p-6 h-[50vh] overflow-y-auto custom-scrollbar">
                            <pre className="text-sm sm:text-[11px] font-mono text-emerald-400/90 leading-relaxed text-left whitespace-pre-wrap" dir="ltr">
                                {fullSqlSchema}
                            </pre>
                        </div>
                    </div>
                </div>
            ) : (
                /* --- View 3: Documentation --- */
                <div className="space-y-8 animate-fade-in">
                    <div className="bg-[var(--bg-secondary)] p-8 md:p-12 rounded-[3rem] border border-[var(--border-primary)] shadow-sm">
                        <div className="flex justify-between items-center mb-10 border-b border-[var(--border-primary)] pb-6">
                            <h2 className="text-2xl font-black text-indigo-600">الدليل المرجعي لهيكل الجداول</h2>
                            <button 
                                onClick={() => { navigator.clipboard.writeText(FULL_DB_DOCS); addToast("تم نسخ الوثيقة", ToastType.SUCCESS); }}
                                className="px-5 py-2 bg-[var(--bg-tertiary)] rounded-xl text-[var(--text-primary)] font-black text-sm border border-[var(--border-primary)] flex items-center gap-2 hover:bg-[var(--border-primary)]"
                            >
                                <ClipboardIcon className="w-4 h-4"/> نسخ الوثيقة
                            </button>
                        </div>
                        
                        <div className="prose prose-sm dark:prose-invert max-w-none font-bold text-[var(--text-secondary)] leading-loose text-right" dir="rtl">
                            <div dangerouslySetInnerHTML={{ 
                                __html: FULL_DB_DOCS
                                    .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-black text-[var(--text-primary)] mb-6">$1</h1>')
                                    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-black text-indigo-600 mt-10 mb-4 border-r-4 border-indigo-600 pr-4">$1</h2>')
                                    .replace(/\|/g, ' ') 
                                    .replace(/\n/g, '<br/>')
                            }} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DatabaseDiagnosticsView;
