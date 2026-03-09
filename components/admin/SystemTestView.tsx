

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '../../services/storageService';
import { checkDbConnection, listPublicTables, getTableColumns } from '../../services/systemService';
import { createTeacher, deleteTeacher } from '../../services/teacherService';
import { createSupervisorAccount, deleteSupervisor } from '../../services/supervisorService';
import { addCartoonMovie, deleteCartoonMovie, addSeason, addEpisode } from '../../services/movieService';
import { addUnitToSemester, deleteUnit, addLessonToUnit } from '../../services/storageService';
import { createCourse, deleteCourse } from '../../services/storageService';
import { generateSubscriptionCodes, deleteSubscriptionCode } from '../../services/subscriptionService';
import { useToast } from '../../useToast';
import { ToastType, LessonType } from '../../types';
import { 
    CheckCircleIcon, XCircleIcon, PlayIcon, ActivityIcon,
    DatabaseIcon, CodeIcon, ClipboardIcon, ShieldCheckIcon, TrashIcon,
    ArrowRightIcon, ShieldExclamationIcon, InformationCircleIcon,
    TableCellsIcon, UsersIcon, VideoCameraIcon,
    CreditCardIcon, FilmIcon, BookOpenIcon, CpuChipIcon
} from '../common/Icons';

// --- Types ---
type TestStatus = 'idle' | 'running' | 'pass' | 'fail' | 'warning';
type AuditTab = 'overview' | 'missing' | 'incomplete' | 'unused' | 'security';
type ViewMode = 'schema' | 'functional';

interface AuditItem {
    id: string;
    category: 'Schema' | 'Security' | 'Infrastructure' | 'Data';
    name: string;
    type: 'Table' | 'Column' | 'Policy' | 'Function';
    status: TestStatus;
    details?: string;
    parentTable?: string;
}

// --- Helper: Translate SQL Errors ---
const translateError = (error: any): string => {
    if (!error) return "خطأ غير معروف";
    const msg = error.message || JSON.stringify(error);
    const code = error.code || '';

    if (code === '42501') return `⛔ صلاحيات غير كافية (RLS Policy). تأكد من سياسات الأمان. (Code: ${code})`;
    if (code === '42P01') return `⛔ الجدول غير موجود في قاعدة البيانات. (Code: ${code})`;
    if (code === '23503') return `⛔ انتهاك المفتاح الأجنبي (Foreign Key). تحاول الربط ببيانات غير موجودة. (Code: ${code})`;
    if (code === '23505') return `⛔ تكرار بيانات فريدة (Unique Violation). (Code: ${code})`;
    
    return `❌ ${msg} (Code: ${code})`;
};

// --- Schema Definition (Same as before) ---
const EXPECTED_SCHEMA: Record<string, string[]> = {
    'profiles': ['id', 'name', 'email', 'phone', 'role', 'grade_id', 'created_at', 'guardian_phone', 'max_devices'],
    'teachers': ['id', 'name', 'subject', 'image_url', 'created_at', 'teaching_grades', 'teaching_levels', 'phone', 'email', 'is_special'],
    'grades': ['id', 'name', 'level', 'level_ar'],
    'semesters': ['id', 'title', 'grade_id'],
    'units': ['id', 'title', 'semester_id', 'teacher_id'],
    'lessons': ['id', 'title', 'unit_id', 'teacher_id', 'video_url', 'type', 'is_free', 'description', 'questions', 'video_questions', 'published_at'],
    'courses': ['id', 'title', 'teacher_id', 'price', 'is_published', 'cover_image', 'pdf_url'],
    'course_videos': ['id', 'course_id', 'video_url', 'title', 'is_free'],
    'subscriptions': ['id', 'user_id', 'plan', 'status', 'start_date', 'end_date', 'teacher_id'],
    'subscription_codes': ['code', 'duration_days', 'max_uses', 'times_used', 'teacher_id', 'used_by_user_ids'],
    'subscription_requests_temp': ['id', 'user_id', 'status', 'plan', 'payment_from_number', 'subject_name'],
    'student_progress': ['student_id', 'lesson_id', 'created_at'],
    'quiz_attempts': ['id', 'user_id', 'lesson_id', 'score', 'is_pass', 'submitted_answers'],
    'video_activity': ['user_id', 'lesson_id', 'watched_seconds', 'milestone', 'last_updated_at'], 
    'device_sessions': ['id', 'user_id', 'device_fingerprint', 'active', 'last_active_at'],
    'cartoon_movies': ['id', 'title', 'type', 'category', 'is_published', 'poster_url', 'video_url', 'franchise', 'download_links'],
    'cartoon_seasons': ['id', 'series_id', 'season_number', 'is_published'],
    'cartoon_episodes': ['id', 'movie_id', 'season_id', 'video_url', 'episode_number', 'download_links'],
    'movie_requests': ['id', 'user_id', 'movie_name', 'status', 'admin_reply'],
    'platform_settings': ['id', 'platform_name', 'monthly_price', 'icon_settings', 'announcement_banner'],
    'stories': ['id', 'type', 'content', 'expires_at', 'category'],
    'supervisors': ['id', 'name', 'email'],
    'supervisor_teachers': ['supervisor_id', 'teacher_id']
};

const StatCard: React.FC<{ title: string; value: number; color: string; icon: any; onClick?: () => void; active?: boolean }> = ({ title, value, color, icon: Icon, onClick, active }) => (
    <button 
        onClick={onClick}
        className={`p-5 rounded-[2rem] border transition-all duration-300 w-full text-right group ${active ? `bg-${color.split('-')[1]}-500/10 border-${color.split('-')[1]}-500 ring-2 ring-${color.split('-')[1]}-500/20` : `bg-[var(--bg-secondary)] border-[var(--border-primary)] hover:border-${color.split('-')[1]}-500/50`}`}
    >
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-80">{title}</p>
                <p className={`text-4xl font-black mt-2 ${color} group-hover:scale-110 transition-transform origin-right`}>{value}</p>
            </div>
            <div className={`p-3 rounded-2xl ${color.replace('text-', 'bg-').replace('500', '500/10').replace('600', '600/10')}`}>
                <Icon className={`w-6 h-6 ${color}`} />
            </div>
        </div>
    </button>
);

const FunctionalTestCard: React.FC<{ 
    title: string; 
    description: string; 
    icon: any; 
    color: string; 
    onRun: () => void; 
    isRunning: boolean; 
    status: TestStatus 
}> = ({ title, description, icon: Icon, color, onRun, isRunning, status }) => {
    return (
        <div className={`p-6 rounded-[2.5rem] border relative overflow-hidden transition-all group ${status === 'pass' ? 'bg-emerald-500/5 border-emerald-500/20' : status === 'fail' ? 'bg-red-500/5 border-red-500/20' : 'bg-[var(--bg-secondary)] border-[var(--border-primary)]'}`}>
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={`p-3 rounded-2xl ${color} bg-opacity-10 text-${color.split('-')[1]}-500`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div className="flex gap-2">
                    {status === 'pass' && <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-sm font-black">ناجح</span>}
                    {status === 'fail' && <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-sm font-black">فشل</span>}
                </div>
            </div>
            <h3 className="text-lg font-black text-[var(--text-primary)] mb-1 relative z-10">{title}</h3>
            <p className="text-sm text-[var(--text-secondary)] font-bold opacity-60 mb-6 relative z-10 min-h-[40px]">{description}</p>
            
            <button 
                onClick={onRun} 
                disabled={isRunning}
                className={`w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all relative z-10 ${isRunning ? 'bg-gray-100 text-gray-400' : 'bg-[var(--text-primary)] text-[var(--bg-primary)] hover:scale-[1.02] shadow-lg'}`}
            >
                {isRunning ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : <PlayIcon className="w-4 h-4" />}
                {isRunning ? 'جاري الاختبار...' : 'تشغيل المحاكاة'}
            </button>
        </div>
    );
};

const ConsoleLog: React.FC<{ logs: string[] }> = ({ logs }) => (
    <div className="bg-[#0D1117] p-6 rounded-[2.5rem] border border-white/5 h-96 overflow-y-auto custom-scrollbar font-mono text-sm shadow-inner" dir="ltr">
        {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
                <CodeIcon className="w-12 h-12 mb-2" />
                <p>Ready for simulation...</p>
            </div>
        ) : (
            logs.map((log, idx) => (
                <div key={idx} className={`mb-2 font-medium break-words whitespace-pre-wrap ${log.includes('✅') ? 'text-emerald-400' : log.includes('❌') || log.includes('⛔') ? 'text-red-400' : log.includes('🚀') ? 'text-blue-400' : 'text-gray-400'}`}>
                    <span className="opacity-60 mr-2">[{new Date().toLocaleTimeString('en-GB')}]</span>
                    {log}
                </div>
            ))
        )}
    </div>
);


const SystemTestView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { addToast } = useToast();
    const [viewMode, setViewMode] = useState<ViewMode>('schema');
    
    // --- Schema Audit State ---
    const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
    const [unusedTables, setUnusedTables] = useState<string[]>([]);
    const [isAuditRunning, setIsAuditRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [activeTab, setActiveTab] = useState<AuditTab>('overview');
    const [generatedFixSql, setGeneratedFixSql] = useState('');
    const [showRpcFix, setShowRpcFix] = useState(false);

    // --- Functional Test State ---
    const [simulationLogs, setSimulationLogs] = useState<string[]>([]);
    const [testStatuses, setTestStatuses] = useState<Record<string, TestStatus>>({});
    const [isSimulating, setIsSimulating] = useState(false);

    // --- Helper: Add Log ---
    const addLog = (msg: string) => setSimulationLogs(prev => [msg, ...prev]);

    // --- 1. Schema Audit Logic ---
    const stats = useMemo(() => {
        const totalChecks = auditItems.length;
        const failed = auditItems.filter(i => i.status === 'fail').length;
        const correctTables = auditItems.filter(i => i.type === 'Table' && i.status === 'pass').length;
        const missingTablesCount = auditItems.filter(i => i.type === 'Table' && i.status === 'fail').length;
        const incompleteColumnsCount = auditItems.filter(i => i.type === 'Column' && i.status === 'fail').length;
        const securityIssuesCount = auditItems.filter(i => i.category === 'Security' && i.status === 'fail').length;
        return { totalChecks, failed, correctTables, missingTablesCount, incompleteColumnsCount, securityIssuesCount, unusedCount: unusedTables.length };
    }, [auditItems, unusedTables]);

    const generateFixScript = useCallback(() => {
        let script = `-- 🛠️ Gstudent Auto-Generated Repair Script\n-- 🕒 Created at: ${new Date().toISOString()}\n\n`;
        const missingTables = auditItems.filter(i => i.status === 'fail' && i.type === 'Table');
        const missingCols = auditItems.filter(i => i.status === 'fail' && i.type === 'Column');
        const missingRLS = auditItems.filter(i => i.status === 'fail' && i.name.includes('Access'));

        if (missingTables.length > 0) {
            script += `-- [1] Missing Tables Creation (Jumping Start)\n`;
            missingTables.forEach(item => {
                const tableName = item.name;
                script += `CREATE TABLE IF NOT EXISTS public.${tableName} (\n    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n    created_at TIMESTAMPTZ DEFAULT now()\n);\n`;
                script += `ALTER PUBLICATION supabase_realtime ADD TABLE public.${tableName};\n`;
            });
            script += `\n`;
        }
        if (missingCols.length > 0) {
            script += `-- [2] Missing Columns Injection\n`;
            missingCols.forEach(item => {
                const [table, col] = item.name.split('.');
                let type = 'TEXT';
                if (col.includes('is_') || col === 'active' || col === 'sajda') type = 'BOOLEAN DEFAULT FALSE';
                else if (col.includes('price') || col.includes('score') || col.includes('count') || col.includes('number') || col.includes('limit')) type = 'INTEGER DEFAULT 0';
                else if (col.includes('date') || col.includes('_at')) type = 'TIMESTAMP WITH TIME ZONE';
                else if (['questions', 'video_questions', 'download_links', 'icon_settings', 'announcement_banner', 'gallery_images', 'teaching_grades', 'teaching_levels', 'submitted_answers', 'movie_data'].includes(col)) type = 'JSONB DEFAULT \'[]\'::jsonb';
                else if (col.endsWith('_id')) type = 'UUID'; 
                script += `ALTER TABLE public.${table} ADD COLUMN IF NOT EXISTS ${col} ${type};\n`;
            });
            script += `\n`;
        }
        if (missingRLS.length > 0) {
            script += `-- [3] Security Policies (RLS) Fix\n`;
            const distinctTables = [...new Set(missingRLS.map(i => i.name.split(' ')[2]))];
            distinctTables.forEach(table => {
                script += `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;\n`;
                script += `DROP POLICY IF EXISTS "Public Read ${table}" ON public.${table};\n`;
                script += `CREATE POLICY "Public Read ${table}" ON public.${table} FOR SELECT USING (true);\n`;
            });
        }
        setGeneratedFixSql(script);
    }, [auditItems]);

    useEffect(() => { if (stats.failed > 0) generateFixScript(); }, [stats.failed, generateFixScript]);

    const runFullAudit = async () => {
        setIsAuditRunning(true);
        setAuditItems([]);
        setUnusedTables([]);
        setGeneratedFixSql('');
        setShowRpcFix(false);
        setProgress(0);
        const newAuditItems: AuditItem[] = [];
        const pushItem = (item: AuditItem) => { newAuditItems.push(item); setAuditItems([...newAuditItems]); };

        try {
            const { error: connError } = await checkDbConnection();
            pushItem({ id: 'conn', category: 'Infrastructure', name: 'Database Connection', type: 'Function', status: connError ? 'fail' : 'pass', details: connError?.message });
            const { data: tables, error: rpcError } = await listPublicTables();
            if (rpcError) {
                pushItem({ id: 'rpc', category: 'Infrastructure', name: 'Diagnostic Functions (RPC)', type: 'Function', status: 'fail', details: 'Missing RPCs' });
                setShowRpcFix(true);
                throw new Error("RPCs Missing");
            } else {
                pushItem({ id: 'rpc', category: 'Infrastructure', name: 'Diagnostic Functions (RPC)', type: 'Function', status: 'pass' });
            }
            const dbTableNames = tables.map((t: any) => t.table_name);
            const expectedTableNames = Object.keys(EXPECTED_SCHEMA);
            const totalSteps = expectedTableNames.length;
            let currentStep = 0;
            const unused = dbTableNames.filter((t: string) => !expectedTableNames.includes(t));
            setUnusedTables(unused);
            for (const tableName of expectedTableNames) {
                currentStep++;
                setProgress((currentStep / totalSteps) * 100);
                const expectedColumns = EXPECTED_SCHEMA[tableName];
                if (!dbTableNames.includes(tableName)) {
                    pushItem({ id: `tbl_${tableName}`, category: 'Schema', name: tableName, type: 'Table', status: 'fail', details: 'الجدول غير موجود بالكامل' });
                    expectedColumns.forEach(col => { pushItem({ id: `col_${tableName}_${col}`, category: 'Schema', name: `${tableName}.${col}`, type: 'Column', status: 'fail', details: 'الجدول الأم مفقود', parentTable: tableName }); });
                    continue;
                } else {
                    pushItem({ id: `tbl_${tableName}`, category: 'Schema', name: tableName, type: 'Table', status: 'pass' });
                }
                const { data: cols } = await getTableColumns(tableName);
                const existingCols = cols?.map((c: any) => c.column_name) || [];
                for (const col of expectedColumns) {
                    if (!existingCols.includes(col)) {
                        pushItem({ id: `col_${tableName}_${col}`, category: 'Schema', name: `${tableName}.${col}`, type: 'Column', status: 'fail', details: `العمود ${col} ناقص`, parentTable: tableName });
                    } else {
                        pushItem({ id: `col_${tableName}_${col}`, category: 'Schema', name: `${tableName}.${col}`, type: 'Column', status: 'pass', parentTable: tableName });
                    }
                }
                const { error: accessError } = await supabase.from(tableName).select('count', { count: 'exact', head: true });
                if (accessError) {
                    pushItem({ id: `acc_${tableName}`, category: 'Security', name: `Read Access ${tableName}`, type: 'Policy', status: 'fail', details: accessError.message });
                } else {
                    pushItem({ id: `acc_${tableName}`, category: 'Security', name: `Read Access ${tableName}`, type: 'Policy', status: 'pass' });
                }
            }
            addToast(`اكتمل الفحص: ${newAuditItems.length} نقطة تم فحصها.`, ToastType.SUCCESS);
        } catch (e: any) {
            console.error(e);
            addToast("توقف الفحص بسبب خطأ حرج.", ToastType.ERROR);
        } finally {
            setIsAuditRunning(false);
            setProgress(100);
        }
    };

    const filteredItems = useMemo(() => {
        switch (activeTab) {
            case 'missing': return auditItems.filter(i => i.type === 'Table' && i.status === 'fail');
            case 'incomplete': return auditItems.filter(i => i.type === 'Column' && i.status === 'fail');
            case 'security': return auditItems.filter(i => i.category === 'Security');
            case 'unused': return [];
            default: return auditItems;
        }
    }, [activeTab, auditItems]);


    // --- 2. Functional Simulations (ENHANCED) ---
    
    // --- STAFF TEST ---
    const runStaffTest = async () => {
        setIsSimulating(true);
        setTestStatuses(p => ({ ...p, staff: 'running' }));
        setSimulationLogs([]);
        addLog("🚀 بدء اختبار إدارة الكادر (Staff Simulation)...");
        
        try {
            // 1. Create Teacher
            addLog("1. إنشاء مدرس تجريبي...");
            const testEmail = `test.teacher.${Date.now()}@sim.com`;
            const { success, data: teacherData, error } = await createTeacher({
                name: "Simulated Teacher",
                email: testEmail,
                subject: "Simulation",
                teachingGrades: [1],
                teachingLevels: ["Secondary"],
                phone: "01000000000"
            });
            
            if (!success || !teacherData?.id) throw new Error(`فشل إنشاء المدرس: ${translateError(error)}`);
            addLog(`✅ تم إنشاء المدرس (ID: ${teacherData.id})`);

            // 2. Create Supervisor
            addLog("2. إنشاء مشرف تجريبي...");
            const supEmail = `test.sup.${Date.now()}@sim.com`;
            const { success: supSuccess, userId: supId, error: supError } = await createSupervisorAccount({
                name: "Simulated Supervisor",
                email: supEmail,
                password: "password123",
                teacherIds: [teacherData.id]
            });
            
            if (!supSuccess || !supId) throw new Error(`فشل إنشاء المشرف: ${translateError(supError)}`);
            addLog(`✅ تم إنشاء المشرف وربطه بالمدرس (ID: ${supId})`);

            // 3. Verify Link
            addLog("3. التحقق من جدول الربط (supervisor_teachers)...");
            const { data: links, error: linkError } = await supabase.from('supervisor_teachers').select('*').eq('supervisor_id', supId);
            if (linkError) throw new Error(`خطأ في قراءة جدول الربط: ${translateError(linkError)}`);
            if (!links || links.length === 0) throw new Error("لم يتم العثور على سجل الربط في قاعدة البيانات.");
            addLog("✅ تم التحقق من وجود العلاقة.");

            // 4. Cleanup
            addLog("🧹 تنظيف البيانات...");
            await deleteSupervisor(supId);
            await deleteTeacher(teacherData.id);
            addLog("✅ تم حذف البيانات التجريبية بنجاح.");
            
            setTestStatuses(p => ({ ...p, staff: 'pass' }));
        } catch (e: any) {
            addLog(`❌ فشل الاختبار: ${e.message}`);
            setTestStatuses(p => ({ ...p, staff: 'fail' }));
        } finally {
            setIsSimulating(false);
        }
    };

    // --- CURRICULUM TEST ---
    const runCurriculumTest = async () => {
        setIsSimulating(true);
        setTestStatuses(p => ({ ...p, curriculum: 'running' }));
        setSimulationLogs([]);
        addLog("🚀 بدء اختبار المنهج الدراسي...");

        let createdUnitId: string | null = null;
        let createdLessonId: string | null = null;

        try {
            // Get Grade & Semester
            addLog("1. جلب صف دراسي وفصل دراسي صالح...");
            const { data: grades, error: gradeError } = await supabase.from('grades').select('*, semesters(*)').limit(1).single();
            
            if (gradeError) throw new Error(`فشل جلب الصفوف: ${translateError(gradeError)}`);
            if (!grades) throw new Error("لا توجد صفوف دراسية (Grades) في قاعدة البيانات.");
            if (!grades.semesters || grades.semesters.length === 0) throw new Error(`الصف ${grades.name} لا يحتوي على فصول دراسية (Semesters).`);

            const semester = grades.semesters[0];
            addLog(`✅ تم اختيار الصف: ${grades.name}، الفصل: ${semester.title}`);
            
            // 1. Add Unit
            addLog("2. محاولة إضافة وحدة دراسية...");
            const { data: unit, error: uErr } = await addUnitToSemester(grades.id, semester.id, {
                title: "Simulated Unit",
                teacherId: null as any, // Null teacher for general test
                track: 'All'
            });
            if (uErr || !unit) throw new Error(`فشل إنشاء الوحدة: ${translateError(uErr)}`);
            
            const unitId = (unit as any)[0]?.id || (unit as any).id; // Handle array/obj return
            createdUnitId = unitId;
            addLog(`✅ تم إنشاء الوحدة (ID: ${unitId})`);

            // 2. Add Lesson
            addLog("3. محاولة إضافة درس...");
            const { data: lesson, error: lErr } = await addLessonToUnit(grades.id, semester.id, unitId, {
                title: "Simulated Lesson",
                type: LessonType.EXPLANATION,
                content: "https://youtu.be/test",
                videoQuestions: [{ questionText: "Q?", options: ["A","B"], correctAnswerIndex: 0 }]
            });
            if (lErr || !lesson) throw new Error(`فشل إنشاء الدرس: ${translateError(lErr)}`);
            
            const lessonId = (lesson as any)[0]?.id || (lesson as any).id;
            createdLessonId = lessonId;
            addLog(`✅ تم إنشاء الدرس (ID: ${lessonId})`);

            // 3. Verify Data
            addLog("4. التحقق من صحة البيانات المسجلة...");
            const { data: verifyLesson, error: verifyErr } = await supabase.from('lessons').select('id').eq('id', lessonId).single();
            if (verifyErr || !verifyLesson) throw new Error("لم يتم العثور على الدرس بعد إنشائه (قد يكون بسبب RLS).");
            addLog("✅ الدرس موجود وقابل للقراءة.");

            setTestStatuses(p => ({ ...p, curriculum: 'pass' }));

        } catch (e: any) {
            addLog(`❌ فشل الاختبار: ${e.message}`);
            setTestStatuses(p => ({ ...p, curriculum: 'fail' }));
        } finally {
            // Cleanup
            if (createdLessonId || createdUnitId) {
                addLog("🧹 تنظيف البيانات...");
                if (createdLessonId) await supabase.from('lessons').delete().eq('id', createdLessonId);
                if (createdUnitId) await supabase.from('units').delete().eq('id', createdUnitId!);
                addLog("✅ تم الحذف.");
            }
            setIsSimulating(false);
        }
    };

    // --- MEDIA TEST ---
    const runMediaTest = async () => {
        setIsSimulating(true);
        setTestStatuses(p => ({ ...p, media: 'running' }));
        setSimulationLogs([]);
        addLog("🚀 بدء اختبار السينما والميديا...");

        let movieId: string | null = null;

        try {
            // 0. Pre-check table
            addLog("0. فحص جدول cartoon_movies...");
            const { error: tableCheck } = await supabase.from('cartoon_movies').select('id').limit(1);
            if (tableCheck && tableCheck.code === '42P01') throw new Error("جدول cartoon_movies غير موجود!");

            // 1. Add Movie
            addLog("1. إضافة فيلم كرتون...");
            const { data: movie, error: mErr } = await addCartoonMovie({
                title: "Simulated Movie",
                type: 'series',
                category: 'Test',
                isPublished: false
            });
            if (mErr || !movie) throw new Error(`فشل إنشاء الفيلم: ${translateError(mErr)}`);
            movieId = movie.id;
            addLog(`✅ تم إنشاء الفيلم/المسلسل (ID: ${movie.id})`);

            // 2. Add Season
            addLog("2. إضافة موسم...");
            const { id: seasonId } = await addSeason({
                series_id: movie.id,
                season_number: 1,
                title: "Season 1"
            });
            if (!seasonId) throw new Error("فشل إنشاء الموسم (لم يرجع ID).");
            addLog(`✅ تم إنشاء الموسم.`);

            // 3. Add Episode
            addLog("3. إضافة حلقة...");
            await addEpisode({
                movie_id: movie.id,
                season_id: seasonId,
                title: "Ep 1",
                episodeNumber: 1,
                videoUrl: "http://test.com/vid.mp4"
            });
            addLog(`✅ تم إنشاء الحلقة.`);

            setTestStatuses(p => ({ ...p, media: 'pass' }));
        } catch (e: any) {
             addLog(`❌ فشل: ${e.message}`);
             setTestStatuses(p => ({ ...p, media: 'fail' }));
        } finally {
            if (movieId) {
                addLog("🧹 تنظيف...");
                await deleteCartoonMovie(movieId);
                addLog("✅ تم الحذف.");
            }
            setIsSimulating(false);
        }
    };
    
    // --- COURSES TEST ---
    const runCourseTest = async () => {
        setIsSimulating(true);
        setTestStatuses(p => ({ ...p, courses: 'running' }));
        setSimulationLogs([]);
        addLog("🚀 بدء اختبار الكورسات (Store)...");

        let courseId: string | null = null;

        try {
            // 1. Find Teacher (Need a teacher ID for FK)
            addLog("1. البحث عن مدرس لربط الكورس به...");
            const { data: t, error: tErr } = await supabase.from('teachers').select('id').limit(1).maybeSingle();
            if (tErr) throw new Error(`خطأ في جلب المدرسين: ${translateError(tErr)}`);
            if (!t) throw new Error("لا يوجد مدرسين في النظام لربط الكورس بهم.");
            addLog(`✅ تم اختيار المدرس (ID: ${t.id})`);

            // 2. Add Course
            addLog("2. إنشاء كورس مدفوع...");
            const { data: course, error } = await createCourse({
                title: "Simulated Course",
                description: "Test",
                price: 100,
                teacherId: t.id,
                coverImage: "https://via.placeholder.com/300",
                isFree: false,
                videos: [{ id: 'temp-1', title: "Vid 1", videoUrl: "http://..", isFree: true }]
            });
            if (error || !course) throw new Error(`فشل إنشاء الكورس: ${translateError(error)}`);
            courseId = course.id;
            addLog(`✅ تم إنشاء الكورس والفيديوهات (ID: ${course.id})`);

            setTestStatuses(p => ({ ...p, courses: 'pass' }));
        } catch (e: any) {
             addLog(`❌ فشل: ${e.message}`);
             setTestStatuses(p => ({ ...p, courses: 'fail' }));
        } finally {
            if (courseId) {
                addLog("🧹 تنظيف...");
                await deleteCourse(courseId);
                addLog("✅ تم الحذف.");
            }
            setIsSimulating(false);
        }
    };

    // --- SUBSCRIPTION TEST ---
    const runFinanceTest = async () => {
        setIsSimulating(true);
        setTestStatuses(p => ({ ...p, finance: 'running' }));
        setSimulationLogs([]);
        addLog("🚀 بدء اختبار المالية والأكواد...");

        let generatedCode: string | null = null;

        try {
            // 1. Generate Code
            addLog("1. توليد كود اشتراك...");
            const { data: codes, error } = await generateSubscriptionCodes({
                count: 1,
                durationType: 'monthly',
                maxUses: 1
            });
            if (error || !codes || codes.length === 0) throw new Error(`فشل توليد الكود: ${translateError(error)}`);
            const code = codes[0].code;
            generatedCode = code;
            addLog(`✅ تم توليد الكود: ${code}`);

            // 2. Validate Code (Check RPC)
            addLog("2. التحقق من صلاحية الكود (RPC Check)...");
            const { data: val, error: rpcErr } = await supabase.rpc('validate_subscription_code_usage', { p_code: code });
            
            if (rpcErr) {
                 // Check if RPC exists
                 if (rpcErr.message.includes("function") && rpcErr.message.includes("does not exist")) {
                     throw new Error("الدالة validate_subscription_code_usage غير موجودة في قاعدة البيانات.");
                 }
                 throw new Error(`خطأ في الـ RPC: ${rpcErr.message}`);
            }

            if (!val || !val.valid) throw new Error(`الكود الجديد غير صالح! الرد: ${JSON.stringify(val)}`);
            addLog("✅ الكود صالح وجاهز للاستخدام.");

            setTestStatuses(p => ({ ...p, finance: 'pass' }));
        } catch (e: any) {
             addLog(`❌ فشل: ${e.message}`);
             setTestStatuses(p => ({ ...p, finance: 'fail' }));
        } finally {
            if (generatedCode) {
                addLog("🧹 تنظيف...");
                await deleteSubscriptionCode(generatedCode);
                addLog("✅ تم حذف الكود.");
            }
            setIsSimulating(false);
        }
    };

    return (
        <div className="fade-in pb-20 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <button onClick={onBack} className="flex items-center gap-2 p-2 text-sm font-bold text-[var(--text-secondary)] hover:text-indigo-600 transition-colors">
                    <ArrowRightIcon className="w-4 h-4" /> العودة للوحة
                </button>
                
                {/* Mode Switcher */}
                <div className="flex bg-[var(--bg-secondary)] p-1.5 rounded-2xl border border-[var(--border-primary)] shadow-sm">
                    <button 
                        onClick={() => setViewMode('schema')} 
                        className={`px-8 py-3 rounded-xl text-sm font-black transition-all ${viewMode === 'schema' ? 'bg-indigo-600 text-white shadow-lg' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
                    >
                        فحص الهيكل (Schema)
                    </button>
                    <button 
                        onClick={() => setViewMode('functional')} 
                        className={`px-8 py-3 rounded-xl text-sm font-black transition-all ${viewMode === 'functional' ? 'bg-purple-600 text-white shadow-lg' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
                    >
                        اختبار العمليات (Simulation)
                    </button>
                </div>
            </div>

            {/* --- VIEW: FUNCTIONAL TESTS --- */}
            {viewMode === 'functional' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
                    {/* Left: Test Cards */}
                    <div className="lg:col-span-7 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FunctionalTestCard 
                                title="إدارة الكادر" 
                                description="إضافة/حذف مدرسين ومشرفين."
                                icon={UsersIcon} color="bg-blue-500"
                                onRun={runStaffTest} isRunning={isSimulating && testStatuses.staff === 'running'} status={testStatuses.staff || 'idle'}
                            />
                            <FunctionalTestCard 
                                title="المنهج الدراسي" 
                                description="وحدات، دروس، أسئلة فيديو."
                                icon={BookOpenIcon} color="bg-purple-500"
                                onRun={runCurriculumTest} isRunning={isSimulating && testStatuses.curriculum === 'running'} status={testStatuses.curriculum || 'idle'}
                            />
                            <FunctionalTestCard 
                                title="الميديا والسينما" 
                                description="أفلام، مسلسلات، حلقات."
                                icon={FilmIcon} color="bg-red-500"
                                onRun={runMediaTest} isRunning={isSimulating && testStatuses.media === 'running'} status={testStatuses.media || 'idle'}
                            />
                            <FunctionalTestCard 
                                title="المتجر والكورسات" 
                                description="كورسات مدفوعة وفيديوهات."
                                icon={CreditCardIcon} color="bg-emerald-500"
                                onRun={runCourseTest} isRunning={isSimulating && testStatuses.courses === 'running'} status={testStatuses.courses || 'idle'}
                            />
                            <FunctionalTestCard 
                                title="نظام الاشتراكات" 
                                description="توليد وتفعيل الأكواد."
                                icon={CodeIcon} color="bg-amber-500"
                                onRun={runFinanceTest} isRunning={isSimulating && testStatuses.finance === 'running'} status={testStatuses.finance || 'idle'}
                            />
                        </div>
                    </div>

                    {/* Right: Live Console */}
                    <div className="lg:col-span-5">
                        <div className="sticky top-4">
                            <div className="flex items-center gap-2 mb-4">
                                <CpuChipIcon className="w-5 h-5 text-indigo-500" />
                                <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest">سجل العمليات الحية</h3>
                            </div>
                            <ConsoleLog logs={simulationLogs} />
                            
                            <div className="mt-6 p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 flex gap-3">
                                <InformationCircleIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
                                <p className="text-sm text-blue-700 dark:text-blue-300 font-bold leading-relaxed">
                                    هذا الوضع يقوم بإجراء عمليات حقيقية على قاعدة البيانات (Insert/Delete). يتم استخدام بيانات وهمية (Dummy Data) ويتم تنظيفها تلقائياً بعد كل اختبار.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- VIEW: SCHEMA AUDIT (Legacy View) --- */}
            {viewMode === 'schema' && (
                /* Reuse existing Schema Audit UI */
                <div className="space-y-8 animate-fade-in">
                    <div className="bg-[#0f172a] rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 border border-white/5">
                        <div className="relative z-10 text-center md:text-right">
                            <h1 className="text-4xl font-black mb-3 tracking-tight">فحص الهيكل (Schema)</h1>
                            <p className="text-indigo-200/70 font-bold text-sm md:text-base">
                                التحقق من وجود الجداول، الأعمدة، وصلاحيات الأمان (RLS).
                            </p>
                        </div>
                        <div className="relative z-10">
                            <button 
                                onClick={runFullAudit} 
                                disabled={isAuditRunning}
                                className="px-10 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {isAuditRunning ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <ShieldCheckIcon className="w-6 h-6" />}
                                <span>{isAuditRunning ? `جاري الفحص ${Math.round(progress)}%` : 'بدء الفحص'}</span>
                            </button>
                        </div>
                        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-indigo-600/20 to-transparent pointer-events-none"></div>
                    </div>

                    {auditItems.length > 0 && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                            <StatCard title="جداول سليمة" value={stats.correctTables} color="text-emerald-500" icon={CheckCircleIcon} active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
                            <StatCard title="جداول مفقودة" value={stats.missingTablesCount} color="text-red-500" icon={DatabaseIcon} active={activeTab === 'missing'} onClick={() => setActiveTab('missing')} />
                            <StatCard title="جداول ناقصة" value={stats.incompleteColumnsCount} color="text-amber-500" icon={TableCellsIcon} active={activeTab === 'incomplete'} onClick={() => setActiveTab('incomplete')} />
                            <StatCard title="مهمل" value={stats.unusedCount} color="text-slate-400" icon={TrashIcon} active={activeTab === 'unused'} onClick={() => setActiveTab('unused')} />
                        </div>
                    )}
                    
                    {/* List & Fixes Area (Same as original) */}
                    {auditItems.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                             <div className="lg:col-span-7">
                                <div className="bg-[var(--bg-secondary)] rounded-[2.5rem] border border-[var(--border-primary)] shadow-sm overflow-hidden flex flex-col max-h-[600px]">
                                    {/* List Content */}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                                        {filteredItems.map((item, idx) => (
                                            <div key={idx} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${item.status === 'pass' ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-red-500/5 border-red-500/20'}`}>
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${item.status === 'pass' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                                    {item.status === 'pass' ? <CheckCircleIcon className="w-5 h-5"/> : <XCircleIcon className="w-5 h-5"/>}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-[var(--text-primary)] truncate dir-ltr text-right">{item.name}</p>
                                                    {item.details && <p className="text-sm text-red-500 mt-1 font-bold">{item.details}</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                             </div>
                             
                             <div className="lg:col-span-5 space-y-6">
                                {(stats.failed > 0 || stats.unusedCount > 0) && generatedFixSql && (
                                    <div className="bg-[#0f172a] rounded-[2.5rem] p-8 border border-white/10 shadow-2xl relative overflow-hidden">
                                        <div className="flex justify-between items-center mb-6 text-white">
                                            <h3 className="font-black text-lg">الحل الذكي (Auto-Fix)</h3>
                                            <div className="p-2 bg-indigo-500/20 rounded-xl"><CodeIcon className="w-6 h-6 text-indigo-400"/></div>
                                        </div>
                                        <div className="relative group mb-6">
                                            <pre className="bg-black/50 p-6 rounded-3xl text-sm font-mono text-pink-400 overflow-x-auto h-80 custom-scrollbar border border-white/5 leading-relaxed" dir="ltr">{generatedFixSql}</pre>
                                            <button onClick={() => { navigator.clipboard.writeText(generatedFixSql); addToast("تم نسخ الكود", ToastType.SUCCESS); }} className="absolute top-4 right-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg transition-all">نسخ الكود</button>
                                        </div>
                                    </div>
                                )}
                             </div>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
};

export default SystemTestView;
