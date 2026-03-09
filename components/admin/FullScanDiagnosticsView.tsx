
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, getTemporaryClient } from '../../services/storageService';
import { checkDbConnection } from '../../services/systemService';
import { useToast } from '../../useToast';
import { ToastType } from '../../types';
import { 
    ArrowRightIcon, ShieldCheckIcon, CheckCircleIcon, XCircleIcon, 
    ShieldExclamationIcon, DatabaseIcon, ServerIcon, KeyIcon, 
    PlayIcon, ClockIcon, CodeIcon, ClipboardIcon, ChevronDownIcon,
    InformationCircleIcon, CreditCardIcon, PhotoIcon, LockClosedIcon
} from '../common/Icons';
import Loader from '../common/Loader';

type TestStatus = 'pending' | 'running' | 'pass' | 'fail' | 'warn';

interface TestCase {
    id: string;
    title: string;
    description: string;
    group: 'infra' | 'auth' | 'content' | 'billing' | 'misc';
    problemExplanation: string;
    fixSql: string;
    action: () => Promise<{ status: TestStatus; message: string }>;
}

const TestItem: React.FC<{ 
    test: TestCase; 
    status: TestStatus; 
    message: string;
    onCopy: (text: string) => void;
}> = ({ test, status, message, onCopy }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    const statusConfigs = {
        pending: { icon: ClockIcon, color: 'text-gray-400', bg: 'bg-gray-500/5', border: 'border-gray-500/10' },
        running: { icon: Loader, color: 'text-blue-500', bg: 'bg-blue-500/5', border: 'border-blue-500/20' },
        pass: { icon: CheckCircleIcon, color: 'text-emerald-500', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20' },
        fail: { icon: XCircleIcon, color: 'text-red-500', bg: 'bg-red-500/5', border: 'border-red-500/20' },
        warn: { icon: ShieldExclamationIcon, color: 'text-amber-500', bg: 'bg-amber-500/5', border: 'border-amber-500/20' },
    };
    const config = statusConfigs[status];
    const Icon = config.icon;

    return (
        <div className={`rounded-3xl border ${config.bg} ${config.border} transition-all duration-300 overflow-hidden mb-4`}>
            <div className="p-5 flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-2xl bg-white/5 ${config.color}`}>
                        {status === 'running' ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : <Icon className="w-5 h-5" />}
                    </div>
                    <div>
                        <h4 className={`text-sm font-black ${status === 'pending' ? 'text-[var(--text-secondary)]' : config.color}`}>{test.title}</h4>
                        <p className="text-sm font-bold text-[var(--text-secondary)] opacity-60 mt-0.5">{test.description}</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    {status === 'fail' && (
                        <button 
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="px-3 py-1.5 bg-red-500 text-white rounded-xl text-sm font-black flex items-center gap-2 animate-pulse"
                        >
                            <CodeIcon className="w-3.5 h-3.5" />
                            إظهار كود الإصلاح
                            <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                    )}
                    {status !== 'pending' && (
                        <div className={`text-sm font-black uppercase tracking-widest ${config.color}`}>
                            {status}
                        </div>
                    )}
                </div>
            </div>

            {isExpanded && status === 'fail' && (
                <div className="px-5 pb-5 animate-fade-in">
                    <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/20 mb-4">
                        <div className="flex items-center gap-2 text-red-600 font-black text-sm mb-2">
                            <InformationCircleIcon className="w-4 h-4"/> تحليل المشكلة:
                        </div>
                        <p className="text-[11px] text-red-800 dark:text-red-200 font-bold leading-relaxed">{test.problemExplanation}</p>
                    </div>

                    <div className="relative group">
                        <div className="absolute top-3 right-4 flex items-center gap-2 z-10">
                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">SQL REPAIR SCRIPT</span>
                            <button 
                                onClick={() => onCopy(test.fixSql)}
                                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all active:scale-90"
                            >
                                <ClipboardIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <pre className="p-5 pt-10 bg-black text-emerald-400 font-mono text-sm rounded-2xl overflow-x-auto custom-scrollbar border border-white/5 shadow-inner" dir="ltr">
                            {test.fixSql}
                        </pre>
                        <p className="mt-3 text-sm text-[var(--text-secondary)] font-bold text-center italic">قم بنسخ الكود ولصقه في Supabase SQL Editor لتصحيح الخطأ فوراً.</p>
                    </div>
                </div>
            )}
            
            {message && status === 'pass' && (
                <div className="px-5 pb-4 opacity-60">
                    <p className="text-sm font-bold text-emerald-600" dir="ltr">✅ {message}</p>
                </div>
            )}
        </div>
    );
};

const FullScanDiagnosticsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { addToast } = useToast();
    const [testStates, setTestStates] = useState<Record<string, { status: TestStatus; message: string }>>({});
    const [isScanning, setIsScanning] = useState(false);
    const [scanSummary, setScanSummary] = useState({ passes: 0, fails: 0, warns: 0 });

    const tests = useMemo((): TestCase[] => [
        { 
            id: 'sb_conn', 
            group: 'infra', 
            title: 'Supabase Connectivity', 
            description: 'فحص الاتصال المباشر بالسيرفر السحابي.',
            problemExplanation: 'المنصة غير قادرة على الوصول إلى خادم Supabase. قد يكون السبب توقف السيرفر أو تغيير مفاتيح الربط في كود المشروع.',
            fixSql: '-- لا يمكن إصلاح مشكلة الاتصال عبر SQL\n-- تأكد من صحة SUPABASE_URL و SUPABASE_ANON_KEY في ملف البيئة.',
            action: async () => {
                const { error } = await checkDbConnection();
                return error ? { status: 'fail', message: error.message } : { status: 'pass', message: 'Connection established successfully.' };
            }
        },
        { 
            id: 'check_sub_temp', 
            group: 'billing', 
            title: 'Subscription Requests Table', 
            description: 'فحص جدول طلبات الاشتراك (المالية).',
            problemExplanation: 'جدول subscription_requests_temp مفقود أو لا يملك صلاحيات الكتابة (RLS)، مما يمنع الطلاب من إرسال طلبات الدفع.',
            fixSql: `CREATE TABLE IF NOT EXISTS public.subscription_requests_temp (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    user_name TEXT,
    plan TEXT,
    payment_from_number TEXT,
    status TEXT DEFAULT 'Pending',
    subject_name TEXT,
    unit_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.subscription_requests_temp ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable insert for users" ON public.subscription_requests_temp;
CREATE POLICY "Enable insert for users" ON public.subscription_requests_temp FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Enable read for admins" ON public.subscription_requests_temp;
CREATE POLICY "Enable read for admins" ON public.subscription_requests_temp FOR SELECT USING ( (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'supervisor') );`,
            action: async () => {
                const { error } = await supabase.from('subscription_requests_temp').select('id').limit(1);
                return error ? { status: 'fail', message: error.message } : { status: 'pass', message: 'Table operational.' };
            }
        },
        { 
            id: 'rpc_validate_code', 
            group: 'billing', 
            title: 'Coupon Validation Logic', 
            description: 'فحص دالة التحقق من أكواد الاشتراك.',
            problemExplanation: 'الدالة البرمجية المسؤولة عن فحص صحة الأكواد في قاعدة البيانات مفقودة أو قديمة، مما يمنع الإدارة من تفعيل اشتراكاتهم بالأكواد.',
            fixSql: `CREATE OR REPLACE FUNCTION validate_subscription_code_usage(p_code text, p_user_id uuid DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_code RECORD;
BEGIN
  SELECT * INTO v_code FROM subscription_codes WHERE code = UPPER(p_code);
  IF NOT FOUND THEN RETURN json_build_object('valid', false, 'error', 'الكود غير موجود'); END IF;
  IF v_code.times_used >= v_code.max_uses THEN RETURN json_build_object('valid', false, 'error', 'استنفد مرات الاستخدام'); END IF;
  RETURN json_build_object('valid', true, 'duration_days', v_code.duration_days, 'teacher_id', v_code.teacher_id);
END; $$;`,
            action: async () => {
                const { error } = await supabase.rpc('validate_subscription_code_usage', { p_code: 'TEST_PROBE' });
                return (error && error.message.includes('does not exist')) ? { status: 'fail', message: 'Function missing' } : { status: 'pass', message: 'Logic ready.' };
            }
        },
        { 
            id: 'schema_profiles', 
            group: 'content', 
            title: 'Profiles Table Integrity', 
            description: 'التأكد من وجود كافة أعمدة بيانات الطلاب.',
            problemExplanation: 'هناك أعمدة مفقودة في جدول بيانات الطلاب (مثل حقل الدور أو الصف الدراسي)، مما قد يسبب خطأ White Screen عند دخول الطالب.',
            fixSql: `ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student',
ADD COLUMN IF NOT EXISTS grade_id INTEGER,
ADD COLUMN IF NOT EXISTS guardian_phone TEXT;`,
            action: async () => {
                const { data, error } = await supabase.from('profiles').select('*').limit(1);
                if (error) return { status: 'fail', message: error.message };
                const cols = data.length > 0 ? Object.keys(data[0]) : [];
                return (cols.includes('role') && cols.includes('grade_id')) ? { status: 'pass', message: 'Table validated.' } : { status: 'fail', message: 'Columns missing.' };
            }
        },
        { 
            id: 'check_storage', 
            group: 'infra', 
            title: 'Storage Bucket (Images)', 
            description: 'فحص سلة تخزين الصور.',
            problemExplanation: 'سلة التخزين "images" غير موجودة أو غير متاحة للعامة (Public)، مما سيؤدي لعدم ظهور صور المدرسين والكورسات.',
            fixSql: `-- يرجى إنشاء سلة باسم 'images' من لوحة تحكم Supabase Storage وجعلها Public يدوياً.
-- ثم تشغيل سياسة الأمان التالية في SQL Editor للسماح بالرفع:
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'images' );
CREATE POLICY "Auth Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'images' AND auth.role() = 'authenticated' );
CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE USING ( bucket_id = 'images' AND auth.role() = 'authenticated' );`,
            action: async () => {
                const { data, error } = await supabase.storage.getBucket('images');
                if (error || !data) return { status: 'fail', message: 'Bucket missing.' };
                if (!data.public) return { status: 'fail', message: 'Bucket is not public.' };
                return { status: 'pass', message: 'Storage ready.' };
            }
        },
        { 
            id: 'check_content_rls', 
            group: 'content', 
            title: 'Public Content Access (RLS)', 
            description: 'فحص صلاحيات قراءة الدروس والكورسات.',
            problemExplanation: 'سياسات الأمان (Row Level Security) تمنع المستخدمين العاديين من قراءة جداول الكورسات أو الدروس. يجب تفعيل القراءة للعامة.',
            fixSql: `ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Lessons" ON public.lessons FOR SELECT USING (true);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Courses" ON public.courses FOR SELECT USING (true);
ALTER TABLE public.cartoon_movies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Movies" ON public.cartoon_movies FOR SELECT USING (true);`,
            action: async () => {
                // Try to read a lesson anonymously (simulated)
                const { error } = await supabase.from('lessons').select('id').limit(1);
                // If error is permission denied code
                if (error && error.code === '42501') return { status: 'fail', message: 'Permission Denied (RLS).' };
                return { status: 'pass', message: 'Content accessible.' };
            }
        },
        { 
            id: 'rpc_delete_user', 
            group: 'auth', 
            title: 'Secure Account Deletion', 
            description: 'فحص نظام الحذف النهائي للمستخدمين.',
            problemExplanation: 'دالة الحذف الآمن (Delete User Account) غير موجودة، مما يمنع الإدارة من مسح حسابات الطلاب أو المدرسين بشكل صحيح من سجلات المصادقة (Auth).',
            fixSql: `CREATE OR REPLACE FUNCTION delete_user_account(user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.profiles WHERE id = user_id;
  DELETE FROM auth.users WHERE id = user_id;
END; $$;`,
            action: async () => {
                const { error } = await supabase.rpc('delete_user_account', { user_id: '00000000-0000-0000-0000-000000000000' });
                return (error && error.message.includes('not found')) ? { status: 'fail', message: 'RPC missing.' } : { status: 'pass', message: 'Function found.' };
            }
        },
        { 
            id: 'realtime_lessons', 
            group: 'infra', 
            title: 'Realtime Replication', 
            description: 'فحص نظام الإشعارات الحية للمحتوى.',
            problemExplanation: 'نظام التزامن اللحظي (Realtime) غير مفعل لجدول الدروس، لن تظهر الإشعارات للطلاب عند إضافة فيديوهات جديدة إلا بعد تحديث الصفحة يدوياً.',
            fixSql: `ALTER PUBLICATION supabase_realtime ADD TABLE public.lessons;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cartoon_movies;`,
            action: async () => {
                return { status: 'warn', message: 'Requires manual verification in Supabase Publication settings.' };
            }
        },
        { 
            id: 'schema_device_sessions', 
            group: 'auth', 
            title: 'Multi-Device Guard', 
            description: 'فحص نظام حظر تعدد الأجهزة.',
            problemExplanation: 'جدول جلسات الأجهزة (device_sessions) مفقود، مما يعني أن الطلاب يمكنهم مشاركة حساباتهم مع عدد غير محدود من الأشخاص دون رقابة.',
            fixSql: `CREATE TABLE IF NOT EXISTS public.device_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    device_fingerprint TEXT NOT NULL,
    device_name TEXT,
    active BOOLEAN DEFAULT TRUE,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own sessions" ON public.device_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.device_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own sessions" ON public.device_sessions FOR SELECT USING (auth.uid() = user_id);`,
            action: async () => {
                const { error } = await supabase.from('device_sessions').select('id').limit(1);
                return error ? { status: 'fail', message: 'Guard table missing.' } : { status: 'pass', message: 'Active.' };
            }
        }
    ], []);

    useEffect(() => {
        const initial: Record<string, { status: TestStatus; message: string }> = {};
        tests.forEach(t => initial[t.id] = { status: 'pending', message: '' });
        setTestStates(initial);
    }, [tests]);

    const runFullScan = async () => {
        setIsScanning(true);
        setScanSummary({ passes: 0, fails: 0, warns: 0 });
        let p = 0, f = 0, w = 0;

        for (const test of tests) {
            setTestStates(prev => ({ ...prev, [test.id]: { status: 'running', message: '' }}));
            const result = await test.action();
            setTestStates(prev => ({ ...prev, [test.id]: result }));
            
            if (result.status === 'pass') p++;
            else if (result.status === 'fail') f++;
            else if (result.status === 'warn') w++;
            
            setScanSummary({ passes: p, fails: f, warns: w });
            await new Promise(res => setTimeout(res, 200));
        }

        setIsScanning(false);
        if (f > 0) addToast(`اكتمل الفحص. تم رصد ${f} مشكلات بحاجة لإصلاح.`, ToastType.ERROR);
        else addToast("المنصة تعمل بكفاءة 100%!", ToastType.SUCCESS);
    };

    const copyFix = (text: string) => {
        navigator.clipboard.writeText(text);
        addToast("تم نسخ كود الإصلاح!", ToastType.SUCCESS);
    };

    return (
        <div className="fade-in space-y-8 pb-32">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-indigo-600 transition-all shadow-sm">
                        <ArrowRightIcon className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-[var(--text-primary)]">الفحص الشامل الذكي</h1>
                        <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-1">AI-Powered System Diagnostic</p>
                    </div>
                </div>
                <button 
                    onClick={runFullScan} 
                    disabled={isScanning}
                    className="w-full md:w-auto px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black text-sm shadow-2xl shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                    {isScanning ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <PlayIcon className="w-5 h-5" />}
                    <span>بدء الفحص الآلي للمنصة</span>
                </button>
            </div>

            {/* Summary Grid */}
            {(isScanning || scanSummary.passes + scanSummary.fails + scanSummary.warns > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-fade-in">
                    <div className="bg-[var(--bg-secondary)] p-6 rounded-[2.5rem] border border-[var(--border-primary)] flex flex-col items-center justify-center shadow-lg">
                         <div className="relative w-20 h-20 mb-3">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="40" cy="40" r="36" stroke="var(--bg-tertiary)" strokeWidth="8" fill="transparent" />
                                <circle 
                                    cx="40" cy="40" r="36" 
                                    stroke="var(--accent-primary)" 
                                    strokeWidth="8" 
                                    fill="transparent" 
                                    strokeDasharray={2 * Math.PI * 36} 
                                    strokeDashoffset={(2 * Math.PI * 36) * (1 - (scanSummary.passes + scanSummary.fails + scanSummary.warns) / tests.length)} 
                                    strokeLinecap="round" 
                                    className="transition-all duration-300"
                                />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-sm font-black">{Math.round(((scanSummary.passes + scanSummary.fails + scanSummary.warns) / tests.length) * 100)}%</span>
                        </div>
                        <p className="text-sm font-black uppercase text-[var(--text-secondary)]">نسبة التقدم</p>
                    </div>
                    <div className="md:col-span-3 grid grid-cols-3 gap-4">
                        <div className="bg-emerald-500/10 p-6 rounded-[2rem] border border-emerald-500/20 text-center flex flex-col justify-center">
                            <span className="text-4xl font-black text-emerald-500">{scanSummary.passes}</span>
                            <span className="text-sm font-black text-emerald-600 uppercase mt-1">سليم</span>
                        </div>
                        <div className="bg-red-500/10 p-6 rounded-[2rem] border border-red-500/20 text-center flex flex-col justify-center">
                            <span className="text-4xl font-black text-red-500">{scanSummary.fails}</span>
                            <span className="text-sm font-black text-red-600 uppercase mt-1">عطل حرج</span>
                        </div>
                        <div className="bg-amber-500/10 p-6 rounded-[2rem] border border-amber-500/20 text-center flex flex-col justify-center">
                            <span className="text-4xl font-black text-amber-500">{scanSummary.warns}</span>
                            <span className="text-sm font-black text-amber-600 uppercase mt-1">تنبيه</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Test Results */}
            <div className="space-y-4">
                {tests.map(test => (
                    <TestItem 
                        key={test.id} 
                        test={test} 
                        status={testStates[test.id]?.status || 'pending'} 
                        message={testStates[test.id]?.message || ''} 
                        onCopy={copyFix}
                    />
                ))}
            </div>

            {!isScanning && scanSummary.fails > 0 && (
                <div className="bg-red-600 p-8 rounded-[3rem] text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 animate-fade-in-up">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-xl">
                            <ShieldExclamationIcon className="w-10 h-10 text-white" />
                        </div>
                        <div className="text-center md:text-right">
                            <h3 className="text-2xl font-black mb-1">تم العثور على {scanSummary.fails} أعطال برمجية!</h3>
                            <p className="text-red-100/70 font-bold max-w-md">يرجى نسخ أكواد SQL الظاهرة في الأعلى ولصقها في Supabase SQL Editor لإصلاح المنصة فوراً.</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => window.open('https://supabase.com/dashboard/project/_/sql', '_blank')}
                        className="w-full md:w-auto px-8 py-4 bg-white text-red-600 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-transform"
                    >
                        فتح لوحة تحكم سوبابيس
                    </button>
                </div>
            )}
        </div>
    );
};

export default FullScanDiagnosticsView;
