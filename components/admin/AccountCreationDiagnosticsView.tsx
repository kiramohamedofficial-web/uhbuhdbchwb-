import React, { useState, useEffect, useCallback } from 'react';
import { UserCheckIcon, DatabaseIcon, ShieldCheckIcon, TrashIcon, CodeIcon, InformationCircleIcon, ClipboardIcon } from '../common/Icons';
import { getAllUsers, getUserById, deleteUser, supabase, getTemporaryClient } from '../../services/storageService';
import { checkDbConnection } from '../../services/systemService';
import { useToast } from '../../useToast';
import { User, ToastType } from '../../types';

type Status = 'idle' | 'running' | 'ok' | 'warning' | 'error';
type TestLevel = 'Middle' | 'Secondary';

interface Check {
    id: string;
    title: string;
    status: Status;
    details: string;
}

const deriveTrackFromGrade = (gradeId: number): 'Scientific' | 'Literary' | undefined => {
    switch (gradeId) {
        case 5: case 7: case 8: return 'Scientific';
        case 6: case 9: return 'Literary';
        default: return undefined;
    }
};

const StatusIndicator: React.FC<{ status: Status }> = ({ status }) => {
    const styles: Record<Status, { color: string; label: string; animation?: string }> = {
        idle: { color: 'bg-gray-500', label: 'لم يبدأ' },
        running: { color: 'bg-blue-500', label: 'جاري...', animation: 'animate-pulse' },
        ok: { color: 'bg-green-500', label: 'سليم' },
        warning: { color: 'bg-yellow-500', label: 'تحذير' },
        error: { color: 'bg-red-500', label: 'خطأ' },
    };
    const { color, label, animation } = styles[status];
    return (
        <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${color} ${animation || ''}`}></span>
            <span className="text-sm font-semibold">{label}</span>
        </div>
    );
};

const LogViewer: React.FC<{ logs: string[] }> = ({ logs }) => (
    <div className="mt-4 bg-[#0a0a0a] p-4 rounded-xl h-80 overflow-y-auto font-mono text-sm border border-white/5 shadow-inner" dir="ltr">
        {logs.map((log, index) => (
            <p key={index} className={`mb-1.5 whitespace-pre-wrap ${log.includes('✅') ? 'text-emerald-400 font-bold' : log.includes('❌') ? 'text-red-400 font-bold' : log.includes('⚠️') ? 'text-amber-400' : 'text-gray-400'}`}>
                {`[${new Date().toLocaleTimeString('ar-EG')}] ${log}`}
            </p>
        ))}
    </div>
);

const AccountCreationDiagnosticsView: React.FC = () => {
    const { addToast } = useToast();
    const [preFlightChecks, setPreFlightChecks] = useState<Check[]>([
        { id: 'db', title: 'اتصال قاعدة البيانات', status: 'idle', details: 'جاهز للفحص.' },
        { id: 'usersTable', title: 'جدول Profiles', status: 'idle', details: 'جاهز للفحص.' },
        { id: 'emailCheck', title: 'نسخ البريد الإلكتروني', status: 'idle', details: 'جاهز للفحص.' },
    ]);
    const [simulationLogs, setSimulationLogs] = useState<string[]>([]);
    const [isSimulating, setIsSimulating] = useState(false);
    const [showSqlFix, setShowSqlFix] = useState(false);

    const runPreFlightChecks = useCallback(async () => {
        const updateCheck = (id: string, status: Status, details: string) => {
            setPreFlightChecks(prev => prev.map(c => c.id === id ? { ...c, status, details } : c));
        };

        updateCheck('db', 'running', 'جاري فحص الاتصال...');
        const { error: dbError } = await checkDbConnection();
        updateCheck('db', dbError ? 'error' : 'ok', dbError ? `فشل: ${dbError.message}` : 'الاتصال ناجح.');

        updateCheck('usersTable', 'running', 'جاري التحقق من الجدول...');
        const { error: tableError } = await supabase.from('profiles').select('id').limit(1);
        updateCheck('usersTable', tableError ? 'error' : 'ok', tableError ? 'الجدول غير موجود أو الصلاحيات ناقصة.' : 'الجدول موجود وسليم.');

        updateCheck('emailCheck', 'running', 'فحص الحقول الفارغة...');
        const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).is('email', null);
        if (count && count > 0) {
            updateCheck('emailCheck', 'warning', `تنبيه: يوجد ${count} مستخدم بدون بريد إلكتروني مسجل.`);
            setShowSqlFix(true);
        } else {
            updateCheck('emailCheck', 'ok', 'جميع المستخدمين لديهم بريد إلكتروني.');
        }

    }, []);

    useEffect(() => {
        runPreFlightChecks();
    }, [runPreFlightChecks]);

    const handleRunSimulation = async () => {
        setIsSimulating(true);
        setSimulationLogs([]);
        let createdUserId: string | null = null;
        const addLog = (log: string) => setSimulationLogs(prev => [...prev, log]);
        const tempClient = getTemporaryClient();

        try {
            const testEmail = `diagnostic.${Math.random().toString(36).substring(7)}@test.com`;
            const testPass = "TestPass123!";
            
            addLog(`🚀 بدء المحاكاة للمستخدم: ${testEmail}`);
            
            // Step 1: Create Auth User
            addLog('الخطوة 1: إنشاء حساب في auth.users...');
            const { data: authData, error: authError } = await tempClient.auth.signUp({ 
                email: testEmail, 
                password: testPass,
                options: {
                    data: {
                        name: 'Test User',
                        grade_id: 1,
                        role: 'student'
                    }
                }
            });
            
            if (authError || !authData.user) throw new Error(`فشل إنشاء حساب المصادقة: ${authError?.message}`);
            createdUserId = authData.user.id;
            addLog(`✅ نجاح! تم إنشاء مستخدم المصادقة (ID: ${createdUserId})`);

            // Step 2: Check Profile (Trigger)
            addLog('الخطوة 2: التحقق من إنشاء الملف الشخصي ونسخ الإيميل...');
            let profileFound = false;
            let emailCopied = false;
            
            for (let i = 0; i < 5; i++) {
                await new Promise(r => setTimeout(r, 1500));
                addLog(`- محاولة التحقق رقم ${i+1}...`);
                const { data } = await supabase.from('profiles').select('id, email').eq('id', createdUserId).maybeSingle();
                if (data) { 
                    profileFound = true; 
                    if (data.email === testEmail) {
                        emailCopied = true;
                    }
                    break; 
                }
            }
            
            if (!profileFound) {
                 addLog('❌ فشل! لم يتم إنشاء ملف شخصي تلقائياً. تأكد من وجود Trigger.');
                 setShowSqlFix(true);
                 throw new Error('Trigger failure');
            }
            
            if (!emailCopied) {
                addLog('⚠️ تنبيه: الملف الشخصي تم إنشاؤه لكن البريد الإلكتروني (email) فارغ!');
                addLog('💡 المشكلة: دالة handle_new_user لا تنسخ حقل email.');
                setShowSqlFix(true);
            } else {
                addLog('✅ نجاح! الملف الشخصي موجود والبريد الإلكتروني منسوخ بشكل صحيح.');
            }

            // Step 3: Delete Test
            addLog('الخطوة 3: تنظيف البيانات (حذف الحساب)...');
            const { error: deleteError } = await deleteUser(createdUserId);
            if (deleteError) {
                 addLog(`⚠️ فشل الحذف التلقائي: ${deleteError.message}`);
                 setShowSqlFix(true); // Usually implies RPC issue
            } else {
                 addLog('✅ تم حذف الحساب التجريبي بنجاح.');
                 if (emailCopied) addToast("النظام يعمل بكفاءة 100%!", ToastType.SUCCESS);
            }

        } catch (e: any) {
            addLog(`❌ توقفت العملية: ${e.message}`);
        } finally {
            await tempClient.auth.signOut();
            setIsSimulating(false);
        }
    };

    const sqlCode = `-- إصلاح شامل لنظام إنشاء الحسابات وحفظ الإيميل
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
`;

    return (
        <div className="fade-in space-y-6">
            <h1 className="text-3xl font-black text-[var(--text-primary)]">فحص دورة حياة الحساب</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-[var(--bg-secondary)] p-6 rounded-[2.5rem] border border-[var(--border-primary)] shadow-sm">
                        <h2 className="text-lg font-black mb-4 flex items-center gap-2">
                            <ShieldCheckIcon className="w-5 h-5 text-indigo-500" /> الحالة الفنية
                        </h2>
                        <div className="space-y-4">
                            {preFlightChecks.map(check => (
                                <div key={check.id} className="p-3 bg-[var(--bg-tertiary)] rounded-2xl">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-bold">{check.title}</span>
                                        <StatusIndicator status={check.status} />
                                    </div>
                                    <p className="text-sm text-[var(--text-secondary)] mt-1 opacity-70">{check.details}</p>
                                </div>
                            ))}
                        </div>
                        <button 
                            onClick={handleRunSimulation} 
                            disabled={isSimulating}
                            className="w-full mt-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all active:scale-95"
                        >
                            {isSimulating ? 'جاري الاختبار...' : 'تشغيل محاكاة كاملة'}
                        </button>
                    </div>

                    {showSqlFix && (
                        <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-[2.5rem] animate-fade-in">
                            <h3 className="text-amber-600 font-black text-sm mb-2 flex items-center gap-2">
                                <InformationCircleIcon className="w-5 h-5"/> حل مشكلة البريد المفقود
                            </h3>
                            <p className="text-sm text-amber-800 dark:text-amber-200 font-bold leading-relaxed mb-4">
                                الكود أدناه يقوم بإصلاح دالة الإنشاء لنسخ البريد الإلكتروني تلقائياً، ويقوم أيضاً بتعبئة البريد للحسابات القديمة.
                            </p>
                            <button 
                                onClick={() => { navigator.clipboard.writeText(sqlCode); addToast("تم نسخ الكود!", ToastType.SUCCESS); }}
                                className="w-full py-2 bg-amber-500 text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 hover:bg-amber-600 transition-colors"
                            >
                                <ClipboardIcon className="w-4 h-4"/> نسخ كود الإصلاح SQL
                            </button>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-8">
                    <div className="bg-[var(--bg-secondary)] p-6 rounded-[2.5rem] border border-[var(--border-primary)] shadow-sm h-full flex flex-col">
                        <h2 className="text-lg font-black mb-4 flex items-center gap-2">
                            <DatabaseIcon className="w-5 h-5 text-indigo-500" /> سجل المحاكاة الحية
                        </h2>
                        <LogViewer logs={simulationLogs} />
                        
                        {showSqlFix && (
                            <div className="mt-4 p-4 bg-black rounded-2xl overflow-hidden border border-white/10">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-gray-500 font-mono">SQL FIX SCRIPT</span>
                                    <CodeIcon className="w-4 h-4 text-indigo-500" />
                                </div>
                                <pre className="text-sm text-emerald-500 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-60 custom-scrollbar" dir="ltr">
                                    {sqlCode}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountCreationDiagnosticsView;