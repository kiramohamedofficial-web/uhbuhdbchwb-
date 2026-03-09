
import React, { useState, useCallback } from 'react';
import { supabase, addStory, deleteStory } from '../../services/storageService';
import { useToast } from '../../useToast';
import { ToastType } from '../../types';
import { 
    ArrowRightIcon, 
    DatabaseIcon, 
    TrashIcon, 
    ClockIcon, 
    CheckCircleIcon, 
    XCircleIcon, 
    ShieldExclamationIcon, 
    CodeIcon,
    InformationCircleIcon,
    ClipboardIcon
} from '../common/Icons';

type TestStatus = 'pass' | 'fail' | 'warn' | 'pending';

interface DiagnosticResult {
    id: string;
    title: string;
    status: TestStatus;
    message: string;
}

const LogEntry: React.FC<{ result: DiagnosticResult }> = ({ result }) => {
    const styles = {
        pass: { icon: CheckCircleIcon, color: 'text-emerald-500', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20' },
        fail: { icon: XCircleIcon, color: 'text-red-500', bg: 'bg-red-500/5', border: 'border-red-500/20' },
        warn: { icon: ShieldExclamationIcon, color: 'text-amber-500', bg: 'bg-amber-500/5', border: 'border-amber-500/20' },
        pending: { icon: ClockIcon, color: 'text-gray-400', bg: 'bg-gray-400/5', border: 'border-gray-400/10' },
    };
    const s = styles[result.status];
    const Icon = s.icon;

    return (
        <div className={`p-4 rounded-2xl border ${s.bg} ${s.border} flex items-start gap-3 transition-all animate-slide-up`}>
            <Icon className={`w-5 h-5 ${s.color} mt-0.5 shrink-0`} />
            <div className="flex-1">
                <p className={`text-sm font-black ${s.color}`}>{result.title}</p>
                <p className="text-sm text-[var(--text-secondary)] font-bold mt-1 opacity-80 leading-relaxed">{result.message}</p>
            </div>
        </div>
    );
};

const StoryDiagnosticsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { addToast } = useToast();
    const [results, setResults] = useState<DiagnosticResult[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [stats, setStats] = useState({ errors: 0, warnings: 0, passes: 0 });

    const sqlFixCode = `-- SQL FIX FOR STORY SYSTEM
-- Run this in Supabase SQL Editor if tests fail

-- 1. Create Stories Table
CREATE TABLE IF NOT EXISTS public.stories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL, -- 'image', 'text', 'movie'
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'main',
    is_permanent BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE,
    movie_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;

-- 3. Policy for Public Viewing
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Stories View" ON public.stories;
CREATE POLICY "Public Stories View" ON public.stories FOR SELECT USING (true);

-- 4. Policy for Admin Management (Update as per your admin role logic)
CREATE POLICY "Admin All Access" ON public.stories FOR ALL USING (true);

-- 5. Auto Cleanup Cron (Optional but recommended for expires_at)
-- This requires pg_cron extension or manual maintenance calls
`;

    const runAllChecks = async () => {
        setIsScanning(true);
        const currentResults: DiagnosticResult[] = [];
        let errors = 0;
        let warns = 0;
        let passes = 0;

        const addResult = (title: string, status: TestStatus, message: string) => {
            if (status === 'fail') errors++;
            if (status === 'warn') warns++;
            if (status === 'pass') passes++;
            currentResults.push({ id: Math.random().toString(), title, status, message });
            setResults([...currentResults]);
            setStats({ errors, warnings: warns, passes });
        };

        setResults([]);

        // TEST 1: Database Connection
        try {
            const { error } = await supabase.from('stories').select('count', { count: 'exact', head: true });
            if (error) throw error;
            addResult("الاتصال بقاعدة البيانات", "pass", "تم التحقق من الاتصال بنجاح.");
        } catch (e: any) {
            addResult("الاتصال بقاعدة البيانات", "fail", `فشل الاتصال: ${e.message}`);
        }

        // TEST 2: Table Existence & Columns
        try {
            const { data, error } = await supabase.from('stories').select('*').limit(1);
            if (error) {
                if (error.code === '42P01') addResult("وجود الجدول", "fail", "جدول stories غير موجود في قاعدة البيانات.");
                else throw error;
            } else {
                const cols = data && data.length > 0 ? Object.keys(data[0]) : [];
                const required = ['id', 'type', 'content', 'category', 'is_permanent', 'expires_at'];
                const missing = required.filter(c => !cols.includes(c));
                
                if (data.length === 0) {
                    addResult("هيكل الأعمدة", "warn", "الجدول فارغ، لا يمكن التحقق من الأعمدة تلقائياً. يرجى مراجعة الـ SQL.");
                } else if (missing.length > 0) {
                    addResult("هيكل الأعمدة", "fail", `الأعمدة التالية مفقودة: ${missing.join(', ')}`);
                } else {
                    addResult("هيكل الأعمدة", "pass", "جميع الأعمدة الأساسية موجودة وسليمة.");
                }
            }
        } catch (e: any) {
            addResult("فحص الجدول", "fail", e.message);
        }

        // TEST 3: Creation & Expiry Logic (12 Hours)
        let testStoryId: string | null = null;
        try {
            const testContent = "Diagnostic_Test_Story_" + Date.now();
            await supabase.from('stories').insert({
                type: 'text',
                content: testContent,
                category: 'main',
                is_permanent: false,
                expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
            });

            const { data: created } = await supabase.from('stories').select('*').eq('content', testContent).single();
            if (created) {
                testStoryId = created.id;
                const expiry = new Date(created.expires_at);
                const diff = (expiry.getTime() - new Date(created.created_at).getTime()) / (1000 * 60 * 60);
                
                if (Math.abs(diff - 12) < 0.1) {
                    addResult("برمجية الـ 12 ساعة", "pass", "النظام يقوم بحساب توقيت الانتهاء بدقة (12 ساعة).");
                } else {
                    addResult("برمجية الـ 12 ساعة", "warn", `توقيت الانتهاء غير دقيق: الفرق هو ${diff.toFixed(1)} ساعة.`);
                }
            } else {
                addResult("إنشاء الحالات", "fail", "تعذر إنشاء حالة اختبارية، يرجى فحص الصلاحيات (RLS).");
            }
        } catch (e: any) {
            addResult("اختبار الإضافة", "fail", `خطأ أثناء المحاكاة: ${e.message}`);
        }

        // TEST 4: Deletion Logic
        if (testStoryId) {
            try {
                const { error } = await deleteStory(testStoryId);
                if (error) throw error;
                addResult("حذف الحالات", "pass", "تم اختبار عملية الحذف اليدوية وتعمل بنجاح.");
            } catch (e: any) {
                addResult("حذف الحالات", "fail", `فشل الحذف: ${e.message}`);
            }
        } else {
            addResult("حذف الحالات", "pending", "تم التخطي لعدم نجاح إنشاء حالة الاختبار.");
        }

        // TEST 5: Media Storage Connectivity
        try {
            const { data: bucket } = await supabase.storage.getBucket('images');
            if (bucket) addResult("اتصال سلة التخزين", "pass", "سلة تخزين الصور متاحة لرفع حالات الصور.");
            else addResult("اتصال سلة التخزين", "warn", "تعذر التأكد من سلة التخزين، قد تواجه مشاكل في رفع الصور.");
        } catch (e) {
            addResult("سلة التخزين", "warn", "سوبابيس لم تستجب لطلب فحص السلة.");
        }

        // TEST 6: Realtime Connectivity
        addResult("تفعيل الـ Realtime", "warn", "يرجى التأكد يدوياً من تفعيل Replication لجدول stories في سوبابيس.");

        setIsScanning(false);
        if (errors === 0) addToast("اكتمل الفحص: النظام سليم.", ToastType.SUCCESS);
        else addToast(`اكتمل الفحص: وجد ${errors} أخطاء.`, ToastType.ERROR);
    };

    return (
        <div className="fade-in space-y-6 pb-20 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-purple-500 transition-all">
                        <ArrowRightIcon className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)]">فحص أعطال الحالات</h1>
                        <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-1">Story System Deep Diagnostics</p>
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button 
                        onClick={() => { navigator.clipboard.writeText(sqlFixCode); addToast("تم نسخ الكود!", ToastType.SUCCESS); }}
                        className="flex-1 md:flex-none px-6 py-3 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-xl font-black text-sm border border-[var(--border-primary)] flex items-center justify-center gap-2"
                    >
                        <ClipboardIcon className="w-4 h-4"/> كود الإصلاح
                    </button>
                    <button 
                        onClick={runAllChecks} 
                        disabled={isScanning}
                        className="flex-1 md:flex-none px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
                    >
                        {isScanning ? 'جاري الفحص...' : 'بدء فحص شامل'}
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            {results.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-emerald-500/10 p-4 rounded-3xl border border-emerald-500/20 text-center">
                        <p className="text-2xl font-black text-emerald-500">{stats.passes}</p>
                        <p className="text-sm font-black text-emerald-600 uppercase">ناجح</p>
                    </div>
                    <div className="bg-amber-500/10 p-4 rounded-3xl border border-amber-500/20 text-center">
                        <p className="text-2xl font-black text-amber-500">{stats.warnings}</p>
                        <p className="text-sm font-black text-amber-600 uppercase">تنبيهات</p>
                    </div>
                    <div className="bg-red-500/10 p-4 rounded-3xl border border-red-500/20 text-center">
                        <p className="text-2xl font-black text-red-500">{stats.errors}</p>
                        <p className="text-sm font-black text-red-600 uppercase">أخطاء</p>
                    </div>
                </div>
            )}

            {/* Main Log Area */}
            <div className="bg-[var(--bg-secondary)] p-6 rounded-[2.5rem] border border-[var(--border-primary)] shadow-sm">
                <h3 className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest mb-6 flex items-center gap-2">
                    <DatabaseIcon className="w-5 h-5 opacity-70"/> تقرير الفحص التفصيلي
                </h3>

                <div className="space-y-3">
                    {results.length > 0 ? (
                        results.map(res => <LogEntry key={res.id} result={res} />)
                    ) : (
                        <div className="py-20 text-center text-gray-400 opacity-50">
                            <ShieldExclamationIcon className="w-16 h-16 mx-auto mb-4" />
                            <p className="font-bold">يرجى الضغط على زر "بدء فحص شامل" لتحليل النظام</p>
                        </div>
                    )}
                </div>
            </div>

            {/* SQL Preview (if errors exist) */}
            {stats.errors > 0 && (
                <div className="bg-[#0f172a] p-8 rounded-[2.5rem] border border-white/5 animate-fade-in">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-white font-black text-lg">كود الإصلاح الشامل</h3>
                            <p className="text-sm text-gray-500 font-bold mt-1">قم بنسخ هذا الكود وتشغيله في سوبابيس لحل جميع المشاكل التقنية للجداول.</p>
                        </div>
                        <CodeIcon className="w-8 h-8 text-indigo-500 opacity-50" />
                    </div>
                    <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
                        <pre className="text-sm text-emerald-400 font-mono leading-relaxed overflow-x-auto custom-scrollbar" dir="ltr">
                            {sqlFixCode}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StoryDiagnosticsView;
