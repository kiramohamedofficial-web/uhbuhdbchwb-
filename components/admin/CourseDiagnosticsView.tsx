import React, { useState } from 'react';
import { createCourse, updateCourse, deleteCourse, getAllCourses, supabase } from '../../services/storageService';
import { getAllTeachers } from '../../services/teacherService';
import { useToast } from '../../useToast';
import { ToastType } from '../../types';
import { ArrowRightIcon, BookOpenIcon } from '../common/Icons';

const LogViewer: React.FC<{ logs: string[] }> = ({ logs }) => (
    <div className="mt-4 bg-[var(--bg-tertiary)] p-4 rounded-lg h-96 overflow-y-auto font-mono text-sm border border-[var(--border-primary)] shadow-inner">
        {logs.map((log, index) => (
            <p key={index} className={`whitespace-pre-wrap ${log.includes('✅') ? 'text-green-500' : log.includes('❌') ? 'text-red-500' : 'text-[var(--text-secondary)]'}`}>
                {`[${new Date().toLocaleTimeString('en-GB')}] ${log}`}
            </p>
        ))}
    </div>
);

const CourseDiagnosticsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { addToast } = useToast();
    const [logs, setLogs] = useState<string[]>(['جاهز لبدء فحص نظام الكورسات...']);
    const [isSimulating, setIsSimulating] = useState(false);

    const addLog = (log: string) => setLogs(prev => [...prev, log]);

    const handleRunSimulation = async () => {
        setIsSimulating(true);
        setLogs([]);
        let createdCourseId: string | null = null;

        const cleanup = async () => {
            if (createdCourseId) {
                addLog(`تنظيف: حذف الكورس التجريبي (ID: ${createdCourseId})...`);
                const { error } = await deleteCourse(createdCourseId);
                if (error) addLog(`❌ فشل تنظيف الكورس: ${error.message}`);
                else addLog(`✅ تم تنظيف الكورس بنجاح.`);
            }
        };

        try {
            addLog("=== بدء فحص نظام الكورسات ===");

            // 0. Get a teacher ID
            addLog("0. البحث عن مدرس لربط الكورس به...");
            const teachers = await getAllTeachers();
            if (teachers.length === 0) throw new Error("لا يوجد مدرسين في النظام لإجراء الاختبار.");
            const teacherId = teachers[0].id;
            addLog(`✅ تم اختيار المدرس: ${teachers[0].name} (ID: ${teacherId})`);

            // 1. Create Course
            addLog("1. إنشاء كورس تجريبي...");
            const coursePayload = {
                title: `DIAGNOSTIC_TEST_COURSE_${Date.now()}`,
                description: "Test description for diagnostics",
                teacherId: teacherId,
                coverImage: "https://via.placeholder.com/300",
                price: 100,
                isFree: false,
                // Fix: Added missing videos property
                videos: []
            };
            
            const { data: createdData, error: createError } = await createCourse(coursePayload);
            if (createError || !createdData) throw new Error(`فشل إنشاء الكورس: ${createError?.message}`);
            createdCourseId = createdData.id;
            addLog(`✅ تم إنشاء الكورس بنجاح (ID: ${createdCourseId}).`);

            // 2. Read (Verify creation)
            addLog("2. التحقق من وجود الكورس في قاعدة البيانات...");
            
            // Retry logic to handle eventual consistency
            let foundCourse = null;
            for (let i = 0; i < 3; i++) {
                const { data } = await supabase.from('courses').select('*').eq('id', createdCourseId).single();
                if (data) {
                    foundCourse = data;
                    break;
                }
                addLog(`- محاولة ${i + 1}: لم يتم العثور عليه، جاري إعادة المحاولة...`);
                await new Promise(r => setTimeout(r, 1000));
            }

            if (!foundCourse || !createdCourseId) throw new Error("فشل العثور على الكورس بعد إنشائه.");
            addLog(`✅ تم العثور على الكورس في قاعدة البيانات.`);

            // 3. Update Course
            addLog("3. تعديل بيانات الكورس (تغيير العنوان)...");
            const newTitle = `UPDATED_TEST_COURSE_${Date.now()}`;
            const { error: updateError } = await updateCourse(createdCourseId, { title: newTitle });
            if (updateError) throw new Error(`فشل تعديل الكورس: ${updateError.message}`);
            
            // Verify Update
            const { data: updatedCourse } = await supabase.from('courses').select('*').eq('id', createdCourseId).single();
            if (updatedCourse?.title !== newTitle) throw new Error("فشل التحقق من التعديل. العنوان لم يتغير.");
            addLog(`✅ تم تعديل العنوان بنجاح إلى: ${newTitle}`);

            // 4. Delete Course
            addLog("4. حذف الكورس...");
            const { error: deleteError } = await deleteCourse(createdCourseId);
            if (deleteError) throw new Error(`فشل حذف الكورس: ${deleteError.message}`);
            
            // Verify Deletion
            const { data: deletedCheck } = await supabase.from('courses').select('id').eq('id', createdCourseId).maybeSingle();
            if (deletedCheck) throw new Error("❌ فشل الحذف! الكورس لا يزال موجوداً.");
            
            createdCourseId = null; // Mark as deleted for cleanup logic
            addLog(`✅ تم حذف الكورس والتأكد من اختفائه.`);

            addLog("\n🏁 اكتمل فحص الكورسات بنجاح!");
            addToast("اكتمل فحص الكورسات بنجاح!", ToastType.SUCCESS);

        } catch (error: any) {
            addLog(`❌ فشل الفحص: ${error.message}`);
            addToast("فشل الفحص. راجع السجلات.", ToastType.ERROR);
        } finally {
            await cleanup();
            setIsSimulating(false);
        }
    };

    return (
        <div className="fade-in">
            <button onClick={onBack} className="flex items-center space-x-2 space-x-reverse mb-6 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                <ArrowRightIcon className="w-4 h-4" />
                <span>العودة إلى فحص الأعطال</span>
            </button>
            <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">فحص نظام الكورسات</h1>
            <p className="mb-8 text-[var(--text-secondary)]">أداة لتشخيص عمليات الإضافة، التعديل، والحذف للكورسات.</p>
            
            <div className="bg-[var(--bg-secondary)] p-6 rounded-xl shadow-lg border border-[var(--border-primary)]">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                            <BookOpenIcon className="w-6 h-6 text-purple-500" />
                            محاكاة دورة الحياة الكورس
                        </h2>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">
                            سيتم إنشاء كورس وهمي، تعديله، ثم حذفه للتأكد من سلامة العمليات.
                        </p>
                    </div>
                    <button 
                        onClick={handleRunSimulation} 
                        disabled={isSimulating}
                        className="w-full sm:w-auto px-6 py-3 font-semibold bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-all disabled:opacity-50 shadow-lg shadow-purple-500/20"
                    >
                        {isSimulating ? 'جاري الفحص...' : 'بدء المحاكاة'}
                    </button>
                </div>
                <LogViewer logs={logs} />
            </div>
        </div>
    );
};

export default CourseDiagnosticsView;