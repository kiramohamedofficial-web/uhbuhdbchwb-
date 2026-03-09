
import React, { useState } from 'react';
import { supabase } from '../../services/storageService';
import { createTeacher, deleteTeacher } from '../../services/teacherService';
import { useToast } from '../../useToast';
import { ArrowRightIcon, ShieldCheckIcon, ShieldExclamationIcon, DatabaseIcon, CodeIcon, ClipboardIcon, PlayIcon } from '../common/Icons';
import { ToastType } from '../../types';

const LogViewer: React.FC<{ logs: string[] }> = ({ logs }) => (
    <div className="mt-4 bg-[#0a0a0a] p-5 rounded-[2rem] h-80 overflow-y-auto font-mono text-[11px] border border-white/5 shadow-inner custom-scrollbar" dir="ltr">
        {logs.map((log, index) => (
            <p key={index} className={`mb-1.5 leading-relaxed ${log.includes('✅') ? 'text-emerald-400 font-bold' : log.includes('❌') ? 'text-red-400 font-bold' : 'text-gray-500'}`}>
                <span className="opacity-60 mr-2">[{new Date().toLocaleTimeString('en-GB')}]</span>
                {log}
            </p>
        ))}
    </div>
);

const TeacherCreationDiagnosticsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { addToast } = useToast();
    const [logs, setLogs] = useState<string[]>(['نظام فحص المدرسين جاهز...']);
    const [isSimulating, setIsSimulating] = useState(false);
    const [showFix, setShowFix] = useState(false);

    const addLog = (log: string) => setLogs(prev => [log, ...prev]);

    const sqlRepairCode = `-- كود إصلاح نظام المدرسين (SQL)
-- قم بتشغيل هذا الكود في SQL Editor في سوبابيس لإصلاح الجداول والدوال

-- 1. التأكد من جدول المدرسين وسماحية الحقول (إسقاط شرط NOT NULL عن الهاتف)
ALTER TABLE IF EXISTS public.teachers 
  ALTER COLUMN phone DROP NOT NULL,
  ALTER COLUMN subject DROP NOT NULL,
  ALTER COLUMN email DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT, -- الآن اختياري تماماً
    subject TEXT,
    image_url TEXT,
    teaching_grades INTEGER[] DEFAULT '{}',
    teaching_levels TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. دالة إضافة المدرس (RPC) المحدثة - تدعم النجاح/الفشل بوضوح
CREATE OR REPLACE FUNCTION create_teacher_account(
    p_name text,
    p_email text,
    p_password text,
    p_phone text,
    p_subject text,
    p_teaching_grades integer[],
    p_teaching_levels text[],
    p_image_url text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_user_id uuid;
BEGIN
    -- 1. المحاولة في جدول المدرسين أولاً (للتحقق من البيانات)
    INSERT INTO public.teachers (name, email, phone, subject, teaching_grades, teaching_levels, image_url)
    VALUES (p_name, p_email, p_phone, p_subject, p_teaching_grades, p_teaching_levels, p_image_url)
    RETURNING id INTO new_user_id;

    RETURN json_build_object('id', new_user_id, 'success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
`;

    const handleRunTest = async () => {
        setIsSimulating(true);
        setShowFix(false);
        setLogs([]);
        addLog("🚀 بدء فحص دورة حياة حساب المدرس...");

        try {
            addLog("1. فحص الاتصال بقاعدة البيانات والجدول...");
            const { error: dbErr } = await supabase.from('teachers').select('id').limit(1);
            if (dbErr) throw new Error(`❌ جدول المدرسين غير موجود أو لا يمكن الوصول إليه: ${dbErr.message}`);
            addLog("✅ تم العثور على جدول المدرسين.");

            addLog("2. محاكاة استدعاء دالة الإنشاء (RPC) بدون رقم هاتف...");
            const testEmail = `test.teacher.${Date.now()}@diagnostic.com`;
            
            const result = await createTeacher({
                name: "مدرس تجريبي",
                email: testEmail,
                subject: "فحص تقني",
                teachingGrades: [1, 2],
                teachingLevels: ["Secondary"],
                phone: "", // نرسل هاتف فارغ للاختبار
                imageUrl: ""
            });

            if (!result.success) {
                if (result.error?.message?.includes("function") && result.error?.message?.includes("does not exist")) {
                    addLog("❌ خطأ: الدالة البرمجية 'create_teacher_account' غير موجودة.");
                    setShowFix(true);
                } else {
                    addLog(`❌ فشل الـ RPC: ${result.error?.message}`);
                    throw new Error(result.error?.message || "فشل غير معروف في الـ RPC");
                }
            } else {
                addLog("✅ استجابة الدالة ناجحة! تم التعامل مع الهاتف الفارغ.");
                addLog("3. تنظيف بيانات الاختبار...");
                const { data: toDel } = await supabase.from('teachers').select('id').eq('email', testEmail).maybeSingle();
                if(toDel) await supabase.from('teachers').delete().eq('id', toDel.id);
                addLog("✅ تم التنظيف بنجاح.");
                addToast("نظام المدرسين يعمل بكفاءة!", ToastType.SUCCESS);
            }

        } catch (e: any) {
            addLog(`❌ فشل الاختبار: ${e.message}`);
            setShowFix(true);
            addToast("تم رصد أخطاء في النظام.", ToastType.ERROR);
        } finally {
            setIsSimulating(false);
        }
    };

    return (
        <div className="fade-in space-y-6">
            <button onClick={onBack} className="flex items-center gap-2 p-2 text-sm font-bold text-[var(--text-secondary)] hover:text-indigo-600 transition-colors">
                <ArrowRightIcon className="w-4 h-4" /> العودة للفحص
            </button>

            <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-[#0f172a] p-8 rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-3xl"></div>
                <div className="relative z-10 text-right">
                    <h1 className="text-3xl font-black text-white">تشخيص نظام المدرسين</h1>
                    <p className="text-indigo-200/60 font-bold">فحص الحقول الإجبارية، سماحية NULL للهاتف، ودقة الـ RPC.</p>
                </div>
                <button 
                    onClick={handleRunTest} 
                    disabled={isSimulating}
                    className="relative z-10 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-xl active:scale-95 transition-all disabled:opacity-50 flex items-center gap-3"
                >
                    {isSimulating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <PlayIcon className="w-5 h-5" />}
                    بدء الفحص الآلي
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                    <div className="bg-[var(--bg-secondary)] p-6 rounded-[2.5rem] border border-[var(--border-primary)] shadow-sm h-full">
                        <h2 className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest mb-4 flex items-center gap-2">
                            <DatabaseIcon className="w-5 h-5 opacity-70"/> سجل العمليات
                        </h2>
                        <LogViewer logs={logs} />
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-6">
                    {showFix && (
                        <div className="bg-red-500/5 border border-red-500/20 p-6 rounded-[2.5rem] animate-fade-in">
                            <h3 className="text-red-500 font-black text-sm mb-3 flex items-center gap-2">
                                <ShieldExclamationIcon className="w-5 h-5"/> تم اكتشاف مشكلة!
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)] font-bold leading-relaxed mb-6">
                                يبدو أن قاعدة البيانات تفرض وجود رقم الهاتف أو أن الدالة البرمجية لا تُرجع تأكيداً بالنجاح. استخدم الكود أدناه للإصلاح.
                            </p>
                            <div className="relative group">
                                <pre className="bg-black p-4 rounded-xl text-[8px] font-mono text-emerald-400 overflow-x-auto max-h-40 custom-scrollbar mb-4 border border-white/5">
                                    {sqlRepairCode}
                                </pre>
                                <button 
                                    onClick={() => { navigator.clipboard.writeText(sqlRepairCode); addToast("تم نسخ الكود!", ToastType.SUCCESS); }}
                                    className="w-full py-3 bg-red-600 text-white rounded-xl text-sm font-black flex items-center justify-center gap-2"
                                >
                                    <ClipboardIcon className="w-4 h-4" /> نسخ كود الإصلاح
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                        <h3 className="text-lg font-black mb-2 relative z-10">تعليمات</h3>
                        <p className="text-sm font-bold opacity-80 leading-relaxed relative z-10">
                            هذا الفحص يتأكد من أن النظام يقبل إنشاء مدرس حتى لو لم يتم تزويد رقم هاتف، عبر إسقاط شرط "NOT NULL" من عمود الهاتف في قاعدة البيانات.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherCreationDiagnosticsView;
