
import React, { useState } from 'react';
import { supabase, updateLesson, getAllGrades } from '../../services/storageService';
import { getAllTeachers } from '../../services/teacherService';
import { useToast } from '../../useToast';
import { ToastType, Lesson, Unit, Teacher, Grade, Semester, LessonType } from '../../types';
import { ArrowRightIcon, BookOpenIcon, CheckCircleIcon, XCircleIcon, PlayIcon, ShieldExclamationIcon, DatabaseIcon, PencilIcon, TrashIcon, CodeIcon, ClipboardIcon, ClockIcon } from '../common/Icons';

const LogViewer: React.FC<{ logs: string[] }> = ({ logs }) => (
    <div className="mt-4 bg-[#0a0a0a] p-5 rounded-[2rem] h-96 overflow-y-auto font-mono text-[11px] border border-white/5 shadow-inner custom-scrollbar" dir="ltr">
        {logs.map((log, index) => (
            <p key={index} className={`mb-1.5 leading-relaxed ${log.includes('✅') ? 'text-emerald-400 font-bold' : log.includes('❌') ? 'text-red-400 font-bold' : log.includes('🔍') ? 'text-blue-400' : log.includes('⏱️') ? 'text-amber-400 font-bold' : 'text-gray-500'}`}>
                <span className="opacity-60 mr-2">[{new Date().toLocaleTimeString('en-GB')}]</span>
                {log}
            </p>
        ))}
    </div>
);

const LessonDiagnosticsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { addToast } = useToast();
    const [logs, setLogs] = useState<string[]>(['جاهز لبدء فحص دورة حياة الحصة...']);
    const [isSimulating, setIsSimulating] = useState(false);
    const [showFix, setShowFix] = useState(false);

    const addLog = (log: string) => setLogs(prev => [log, ...prev]);

    const sqlFixCode = `-- كود إصلاح جدول وقت الفيديو (Video Activity)
-- انسخ هذا الكود وشغله في SQL Editor لحل مشكلة عدم تسجيل الوقت

-- 1. إنشاء جدول نشاط الفيديو إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS public.video_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    lesson_id UUID REFERENCES public.lessons NOT NULL,
    watched_seconds INTEGER DEFAULT 0,
    milestone TEXT,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, lesson_id)
);

-- 2. تفعيل الحماية
ALTER TABLE public.video_activity ENABLE ROW LEVEL SECURITY;

-- 3. إصلاح سياسات الأمان (RLS) للسماح للطلاب بالكتابة
DROP POLICY IF EXISTS "Users manage own activity" ON public.video_activity;
DROP POLICY IF EXISTS "Admin Manage All Activity" ON public.video_activity;
DROP POLICY IF EXISTS "Manage Video Activity" ON public.video_activity;

-- سياسة تسمح للطالب بإدراج وتعديل بياناته، وللمدير بالتحكم
CREATE POLICY "Manage Video Activity" ON public.video_activity
FOR ALL
USING (
    auth.uid() = user_id OR 
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
    auth.uid() = user_id OR 
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);
`;

    const handleTestVideoTracking = async () => {
        setIsSimulating(true);
        setLogs([]);
        addLog("⏱️ بدء اختبار نظام احتساب وقت الفيديو...");

        try {
            // 1. Prerequisites
            addLog("🔍 1. البحث عن بيانات للاختبار (طالب + حصة)...");
            // Find a student profile (or use self if needed, but here we scan DB)
            const { data: student } = await supabase.from('profiles').select('id, name').limit(1).maybeSingle();
            const { data: lesson } = await supabase.from('lessons').select('id, title').limit(1).maybeSingle();

            if (!student) throw new Error("لا يوجد طلاب مسجلين لإجراء الاختبار.");
            if (!lesson) throw new Error("لا توجد حصص مسجلة لإجراء الاختبار.");

            addLog(`✅ تم اختيار الطالب: ${student.name}`);
            addLog(`✅ تم اختيار الحصة: ${lesson.title}`);

            // 2. Simulate Tracking
            const testSeconds = Math.floor(Math.random() * 500) + 60; // Random seconds > 60
            const testMilestone = '50%';
            
            addLog(`💾 2. محاولة تسجيل مشاهدة لمدة ${testSeconds} ثانية...`);
            
            // This replicates trackVideoProgress logic
            const { error: upsertError } = await supabase.from('video_activity').upsert({
                user_id: student.id,
                lesson_id: lesson.id,
                watched_seconds: testSeconds,
                milestone: testMilestone,
                last_updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,lesson_id' });

            if (upsertError) {
                if (upsertError.code === '42P01') {
                    addLog("❌ خطأ حرج: جدول video_activity غير موجود!");
                    setShowFix(true);
                } else if (upsertError.code === '42501') {
                    addLog("❌ خطأ صلاحيات: سياسة RLS تمنع التعديل (يجب تفعيل سياسة الكتابة).");
                    setShowFix(true);
                } else {
                    addLog(`❌ خطأ قاعدة البيانات: ${upsertError.message}`);
                }
                throw upsertError;
            }

            addLog("✅ تم إرسال أمر الحفظ بنجاح.");

            // 3. Verify
            addLog("🔍 3. التحقق من القيمة المحفوظة في قاعدة البيانات...");
            const { data: verifyData, error: verifyError } = await supabase
                .from('video_activity')
                .select('watched_seconds, milestone')
                .eq('user_id', student.id)
                .eq('lesson_id', lesson.id)
                .single();

            if (verifyError) throw verifyError;

            if (verifyData.watched_seconds === testSeconds) {
                addLog(`✅ تطابق تام! الوقت المسجل: ${verifyData.watched_seconds} ثانية.`);
                addToast("نظام الوقت يعمل بكفاءة!", ToastType.SUCCESS);
            } else {
                addLog(`❌ فشل التطابق! المسجل: ${verifyData.watched_seconds}، المتوقع: ${testSeconds}`);
                throw new Error("Data mismatch");
            }

            // 4. Cleanup (Optional, maybe keep it to show in UI)
            addLog("🧹 4. تنظيف بيانات الاختبار...");
            await supabase.from('video_activity').delete().eq('user_id', student.id).eq('lesson_id', lesson.id);
            addLog("✅ تم حذف سجل الاختبار.");

        } catch (e: any) {
            addLog(`❌ فشل الاختبار: ${e.message}`);
            addToast("فشل اختبار الوقت", ToastType.ERROR);
        } finally {
            setIsSimulating(false);
        }
    };

    const handleRunSimulation = async () => {
        setIsSimulating(true);
        setLogs([]);
        setShowFix(false);
        let createdLessonId: string | null = null;
        let unitToUse: Unit | null = null;
        let teacherToUse: Teacher | null = null;
        let gradeToUse: Grade | null = null;
        let semesterToUse: Semester | null = null;

        const cleanup = async () => {
            if (createdLessonId) {
                addLog(`🧹 تنظيف: جاري حذف حصة الاختبار...`);
                const { error } = await supabase.from('lessons').delete().eq('id', createdLessonId);
                if (error) addLog(`❌ فشل تنظيف الحصة: ${error.message}`);
                else addLog(`✅ تم تنظيف النظام.`);
            }
        };

        try {
            addLog("🚀 بدء فحص شامل لنظام إدارة الحصص...");
            
            // 1. Setup Context
            addLog("🔍 1. جلب البيانات الأساسية للمحاكاة...");
            const grades = await getAllGrades();
            if (grades.length === 0) throw new Error("لا توجد صفوف دراسية.");
            
            const teachers = await getAllTeachers();
            if (teachers.length === 0) throw new Error("لا يوجد مدرسين في المنصة لإجراء الاختبار.");
            teacherToUse = teachers[0];

            unitToUse = grades.flatMap(g => g.semesters.flatMap(s => s.units)).find(u => u.teacherId === teacherToUse!.id) || grades.flatMap(g => g.semesters.flatMap(s => s.units))[0];
            if (!unitToUse) throw new Error("لا توجد وحدات دراسية.");
            
            gradeToUse = grades.find(g => g.semesters.some(s => s.units.some(u => u.id === unitToUse!.id))) || null;
            semesterToUse = gradeToUse?.semesters.find(s => s.units.some(u => u.id === unitToUse!.id)) || null;
            
            addLog(`✅ تم اختيار المدرس: ${teacherToUse.name}`);
            addLog(`✅ تم اختيار الوحدة: ${unitToUse.title}`);

            // 2. CREATE PAID
            addLog("🔍 2. محاكاة: إضافة حصة جديدة (حالة مدفوعة)...");
            const payload = {
                title: "Diagnostic Test Lesson - PAID",
                description: "Original description.",
                content: "https://youtube.com/test",
                type: LessonType.EXPLANATION,
                is_free: false, 
                unit_id: unitToUse.id,
                teacher_id: teacherToUse.id,
                questions: [{ questionText: 'Q1?', options: ['A', 'B'], correctAnswerIndex: 0 }]
            };
            
            const { data: created, error: createError } = await supabase.from('lessons').insert(payload).select().single();

            if (createError) {
                if (createError.message.includes('violates foreign key constraint')) {
                    addLog(`❌ خطأ: فشل في إضافة الحصة بسبب "قيد المفتاح الأجنبي" (Foreign Key).`);
                    addLog(`⚠️ التحليل: العمود teacher_id يحاول الربط بمعرّف غير موجود أو بجدول خاطئ.`);
                }
                throw new Error(`فشل إنشاء الحصة: ${createError.message}`);
            }
            
            createdLessonId = created.id;
            addLog(`✅ نجاح: تم الإنشاء بـ ID: ${createdLessonId}`);

            // Verify Creation
            const { data: v1 } = await supabase.from('lessons').select('is_free, title').eq('id', createdLessonId).single();
            if (!v1 || v1.is_free !== false) throw new Error("❌ فشل التحقق: الحصة يجب أن تكون مدفوعة ولكن قاعدة البيانات سجلتها مجانية.");
            addLog("✅ تحقق: الحصة مسجلة 'مدفوعة' بنجاح.");

            // 3. EDIT TO FREE + CHANGE TITLE
            addLog("🔍 3. محاكاة: تعديل الحصة لـ 'مجانية' وتغيير العنوان...");
            const { error: edit1Error } = await updateLesson(gradeToUse!.id, semesterToUse!.id, unitToUse.id, { 
                ...created, 
                isFree: true, 
                title: "Diagnostic Test Lesson - FREE" 
            } as Lesson);
            
            if (edit1Error) throw new Error(`فشل التعديل: ${edit1Error.message}`);

            // Verify Edit 1
            const { data: v2 } = await supabase.from('lessons').select('is_free, title').eq('id', createdLessonId).single();
            if (!v2 || v2.is_free !== true) throw new Error("❌ فشل التحقق: لم يتم تحويل الحصة لمجانية في قاعدة البيانات.");
            if (v2.title !== "Diagnostic Test Lesson - FREE") throw new Error("❌ فشل التحقق: لم يتغير العنوان.");
            addLog("✅ نجاح: تم التعديل لـ 'مجاني' وتحديث العنوان بنجاح.");

            // 4. EDIT DESCRIPTION & QUESTIONS & BACK TO PAID
            addLog("🔍 4. محاكاة: تعديل الوصف والأسئلة وإعادتها لـ 'مدفوعة'...");
            const { error: edit2Error } = await updateLesson(gradeToUse!.id, semesterToUse!.id, unitToUse.id, { 
                ...created, 
                isFree: false, 
                description: "Updated Description Test",
                questions: [{ questionText: 'Updated Q?', options: ['1', '2'], correctAnswerIndex: 1 }]
            } as Lesson);

            if (edit2Error) throw new Error(`فشل التعديل الثاني: ${edit2Error.message}`);

            // Verify Edit 2
            const { data: v3 } = await supabase.from('lessons').select('*').eq('id', createdLessonId).single();
            if (v3.is_free !== false) throw new Error("❌ فشل التحقق: لم يتم إعادة الحصة لمدفوعة.");
            if (v3.description !== "Updated Description Test") throw new Error("❌ فشل التحقق: لم يتغير الوصف.");
            if (v3.questions?.[0]?.questionText !== "Updated Q?") throw new Error("❌ فشل التحقق: لم يتم تحديث الأسئلة.");
            addLog("✅ نجاح: تم تحديث الوصف والأسئلة والحالة المدفوعة.");

            addLog("\n🏁 اكتمل فحص الشامل! نظام الحصص يعمل بكفاءة 100%.");
            addToast("نجح فحص الحصص بالكامل!", ToastType.SUCCESS);

        } catch (e: any) {
            addLog(`❌ فشل الاختبار: ${e.message}`);
            addToast(`فشل الاختبار: ${e.message}`, ToastType.ERROR);
        } finally {
            await cleanup();
            setIsSimulating(false);
        }
    };
    
    return (
        <div className="fade-in space-y-6 pb-20">
            <button onClick={onBack} className="flex items-center gap-2 p-2 text-sm font-bold text-[var(--text-secondary)] hover:text-indigo-600 transition-colors">
                <ArrowRightIcon className="w-4 h-4" /> العودة للفحص
            </button>
            <div className="bg-[var(--bg-secondary)] p-8 rounded-[2.5rem] border border-[var(--border-primary)] shadow-sm">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 mb-6">
                    <div>
                        <h1 className="text-3xl font-black text-[var(--text-primary)]">فحص دورة حياة الحصة</h1>
                        <p className="text-[var(--text-secondary)] mt-1 font-medium">اختبار آلي للإضافة، تعديل الاسم، تبديل (مجاني/مدفوع)، وتعديل الأسئلة.</p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <button 
                            onClick={handleTestVideoTracking} 
                            disabled={isSimulating}
                            className="w-full md:w-auto px-6 py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-black shadow-lg shadow-teal-500/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                            {isSimulating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <ClockIcon className="w-5 h-5" />}
                            اختبار احتساب وقت الطالب
                        </button>
                        
                        <button 
                            onClick={handleRunSimulation} 
                            disabled={isSimulating}
                            className="w-full md:w-auto px-8 py-4 bg-pink-600 hover:bg-pink-700 text-white rounded-2xl font-black shadow-lg shadow-pink-500/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                            {isSimulating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <PlayIcon className="w-5 h-5" />}
                            بدء الفحص الآلي
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8">
                        <h3 className="text-sm font-black uppercase text-[var(--text-secondary)] tracking-widest mb-3 flex items-center gap-2">
                             <DatabaseIcon className="w-4 h-4 opacity-70"/> سجل محاكاة النظام
                        </h3>
                        <LogViewer logs={logs} />
                    </div>
                    <div className="lg:col-span-4 space-y-4">
                         {showFix && (
                            <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl animate-fade-in">
                                <h3 className="text-red-500 font-black text-sm mb-3 flex items-center gap-2">
                                    <ShieldExclamationIcon className="w-5 h-5"/> عطل في الصلاحيات!
                                </h3>
                                <p className="text-sm text-[var(--text-secondary)] font-bold mb-4">
                                    تم اكتشاف مشكلة في جدول video_activity أو صلاحيات RLS الخاصة به. هذا يمنع تسجيل وقت الطلاب. استخدم الكود أدناه للإصلاح.
                                </p>
                                <button 
                                    onClick={() => { navigator.clipboard.writeText(sqlFixCode); addToast("تم نسخ الكود!", ToastType.SUCCESS); }}
                                    className="w-full py-3 bg-red-600 text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 shadow-lg hover:bg-red-700 transition-all"
                                >
                                    <ClipboardIcon className="w-4 h-4" /> نسخ كود الإصلاح
                                </button>
                                <pre className="mt-3 p-3 bg-black rounded-xl text-[8px] font-mono text-emerald-400 overflow-x-auto max-h-32 custom-scrollbar border border-white/5">
                                    {sqlFixCode}
                                </pre>
                            </div>
                         )}

                         <div className="p-6 bg-blue-600 rounded-3xl text-white shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                            <h3 className="font-black text-lg mb-2 relative z-10">ماذا سنفحص؟</h3>
                            <ul className="text-sm space-y-2 opacity-90 relative z-10 font-bold">
                                <li className="flex items-center gap-2"><CheckCircleIcon className="w-4 h-4"/> دقة عمود is_free</li>
                                <li className="flex items-center gap-2"><CheckCircleIcon className="w-4 h-4"/> تحديث النصوص (العنوان والوصف)</li>
                                <li className="flex items-center gap-2"><CheckCircleIcon className="w-4 h-4"/> سلامة مصفوفة الأسئلة (JSON)</li>
                                <li className="flex items-center gap-2"><CheckCircleIcon className="w-4 h-4"/> جدول تتبع وقت الفيديو</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LessonDiagnosticsView;
