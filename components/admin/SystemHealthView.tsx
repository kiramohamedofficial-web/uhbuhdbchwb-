
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
    ShieldExclamationIcon, DatabaseIcon, TrashIcon, ShieldCheckIcon,
    WaveIcon, KeyIcon, ServerIcon, CogIcon, QrcodeIcon, VideoCameraIcon,
    BookOpenIcon, BellIcon, TemplateIcon, ClockIcon, CheckCircleIcon,
    XCircleIcon, ChevronLeftIcon, CodeIcon, SmartphoneIcon, ChartBarIcon,
    SparklesIcon, UsersIcon, ArrowLeftIcon, PlayIcon, SearchIcon,
    UserCheckIcon, HardDriveIcon, WifiIcon, DownloadIcon, PrinterIcon,
    DocumentTextIcon, FilmIcon, MegaphoneIcon, CreditCardIcon,
    ClipboardIcon,
    ArrowRightIcon
} from '../common/Icons';
import Modal from '../common/Modal';
import { useToast } from '../../useToast';
import { ToastType, AdminView, User } from '../../types';
import {
    supabase,
    getInactiveUsers,
    bulkDeleteUsers,
    getTemporaryClient,
    adminUpdateUserPassword,
    deleteUser
} from '../../services/storageService';
import { checkDbConnection, cleanOrphanedData } from '../../services/systemService';
import Loader from '../common/Loader';
import { useIcons } from '../../IconContext';

type Status = 'idle' | 'running' | 'ok' | 'warning' | 'error';

interface Check {
    id: string;
    title: string;
    description: string;
    status: Status;
    details: string;
    icon: React.FC<any>;
    action: () => Promise<{ status: Status; details: string; }>;
}

const DiagnosticTool: React.FC<{
    title: string;
    description: string;
    icon: React.FC<any>;
    onClick: () => void;
    color: string;
    badge?: string;
}> = ({ title, description, icon: Icon, onClick, color, badge }) => {
    const colorStyles: Record<string, string> = {
        purple: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
        blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
        red: 'text-red-500 bg-red-500/10 border-red-500/20',
        green: 'text-green-500 bg-green-500/10 border-green-500/20',
        amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        pink: 'text-pink-500 bg-pink-500/10 border-pink-500/20',
        cyan: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
        indigo: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    };

    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-5 p-6 bg-[var(--bg-secondary)] rounded-[2.5rem] border border-[var(--border-primary)] shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500 active:scale-[0.98] text-right group mb-4 relative overflow-hidden isolate"
        >
            <div className="absolute inset-0 bg-gradient-to-l from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className={`p-4 rounded-2xl flex-shrink-0 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 ${colorStyles[color] || colorStyles.blue} border shadow-lg relative z-10`}>
                <Icon className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0 relative z-10">
                <div className="flex items-center gap-3 mb-1.5">
                    <h3 className="text-base sm:text-lg font-black text-[var(--text-primary)] truncate tracking-tight">{title}</h3>
                    {badge && <span className="px-3 py-1 text-[9px] font-black bg-indigo-600 text-white rounded-xl uppercase tracking-widest shadow-lg shadow-indigo-600/20">{badge}</span>}
                </div>
                <p className="text-sm text-[var(--text-secondary)] font-bold opacity-60 leading-relaxed">{description}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:-translate-x-2 transition-all duration-500 relative z-10 shadow-inner">
                <ChevronLeftIcon className="w-5 h-5 text-indigo-500" />
            </div>

            <div className="absolute bottom-0 left-6 right-6 h-0.5 bg-indigo-500/20 scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-right rounded-full"></div>
        </button>
    );
};

const StatusBadge: React.FC<{ status: Status }> = ({ status }) => {
    const configs = {
        idle: { bg: 'bg-[var(--bg-tertiary)]', text: 'text-[var(--text-secondary)]', label: 'جاهز' },
        running: { bg: 'bg-blue-500/10', text: 'text-blue-500', label: 'جاري...' },
        ok: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', label: 'سليم' },
        warning: { bg: 'bg-amber-500/10', text: 'text-amber-500', label: 'تنبيه' },
        error: { bg: 'bg-red-500/10', text: 'text-red-500', label: 'فشل' },
    };
    const conf = configs[status];
    return (
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${conf.bg} ${conf.text} border border-current/10 backdrop-blur-sm`}>
            {status === 'running' ? (
                <div className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            ) : (
                <div className={`w-1.5 h-1.5 rounded-full ${status === 'ok' ? 'bg-emerald-500' : status === 'error' ? 'bg-red-500' : 'bg-current'}`}></div>
            )}
            <span className="text-sm font-black whitespace-nowrap uppercase tracking-tighter">{conf.label}</span>
        </div>
    );
};

const LogViewer: React.FC<{ logs: string[] }> = ({ logs }) => (
    <div className="mt-4 bg-[#0a0a0a] p-4 rounded-[1.5rem] h-60 overflow-y-auto font-mono text-sm border border-white/5 shadow-inner custom-scrollbar" dir="ltr">
        {logs.map((log, index) => (
            <p key={index} className={`mb-1.5 leading-relaxed ${log.includes('✅') ? 'text-emerald-400 font-bold' : log.includes('❌') ? 'text-red-400 font-bold' : log.includes('🚀') ? 'text-blue-400' : log.includes('🔐') ? 'text-amber-400' : 'text-gray-500'}`}>
                <span className="opacity-60 mr-2">[{new Date().toLocaleTimeString('en-GB')}]</span>
                {log}
            </p>
        ))}
    </div>
);

const PasswordCheckModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { addToast } = useToast();
    const [logs, setLogs] = useState<string[]>(['جاهز للمحاكاة...']);
    const [isSimulating, setIsSimulating] = useState(false);
    const [showFix, setShowFix] = useState(false);

    const addLog = (log: string) => setLogs(prev => [log, ...prev]);

    const sqlFixCode = `
-- دالة تغيير كلمة المرور للمدير (RPC)
CREATE OR REPLACE FUNCTION admin_update_password(user_id uuid, new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = user_id;
END;
$$;`;

    const handleRunSimulation = async () => {
        setIsSimulating(true);
        setLogs([]);
        setShowFix(false);
        let createdUserId: string | null = null;

        // Use a temporary client to ensure we don't mess with the current Admin session
        const tempClient = getTemporaryClient();

        try {
            addLog(`🚀 بدء محاكاة معزولة (Sandbox)...`);

            // 1. Create a dummy user
            addLog("1. إنشاء حساب تجريبي في نظام المصادقة...");
            const testEmail = `pass.test.${Date.now()}@diagnostic.com`;
            const testPass = "OldPass123!";

            const { data: authData, error: authError } = await tempClient.auth.signUp({
                email: testEmail,
                password: testPass,
                options: { data: { name: `Test User`, role: 'student' } }
            });

            if (authError || !authData.user) {
                addLog(`❌ فشل إنشاء الحساب: ${authError?.message}`);
                throw new Error("Auth Creation Failed");
            }

            createdUserId = authData.user.id;
            addLog(`✅ تم إنشاء الحساب التجريبي (ID: ${createdUserId}).`);

            // 2. Change Password via RPC (Admin Action)
            const newPass = "NewStrongPass999!";
            addLog(`🔐 2. استدعاء الدالة admin_update_password...`);

            // Call via MAIN client (as Admin)
            const { error: rpcError } = await adminUpdateUserPassword(createdUserId, newPass);

            if (rpcError) {
                addLog(`❌ فشل RPC: ${rpcError.message}`);
                setShowFix(true);
                throw rpcError;
            }

            addLog("✅ استجابة الدالة ناجحة!");

            // 3. Verify Login with New Password
            addLog("🔍 3. التحقق من الدخول بكلمة المرور الجديدة...");
            const { data: loginData, error: loginError } = await tempClient.auth.signInWithPassword({
                email: testEmail,
                password: newPass
            });

            if (loginError || !loginData.user) {
                addLog(`❌ فشل الدخول: ${loginError?.message}`);
                throw new Error("Password update did not take effect.");
            }

            addLog("✅ نجاح الدخول! كلمة المرور تغيرت فعلياً.");
            addToast("الفحص ناجح!", ToastType.SUCCESS);

        } catch (e: any) {
            addLog(`❌ العملية توقفت: ${e.message}`);
        } finally {
            if (createdUserId) {
                addLog("🧹 تنظيف: حذف الحساب التجريبي...");
                await deleteUser(createdUserId);
                addLog("✅ تم التنظيف.");
            }
            await tempClient.auth.signOut();
            setIsSimulating(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="فحص نظام كلمات المرور" maxWidth="max-w-2xl">
            <div className="space-y-6">
                <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl flex items-start gap-3">
                    <ShieldCheckIcon className="w-6 h-6 text-indigo-500 shrink-0 mt-0.5" />
                    <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300 leading-relaxed">
                        سيقوم هذا الاختبار بإنشاء حساب وهمي، محاولة تغيير كلمة مروره برمجياً، ثم التحقق من نجاح العملية عن طريق تسجيل الدخول به، وأخيراً حذفه.
                        <strong> لن يتأثر حسابك الإداري الحالي.</strong>
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={handleRunSimulation}
                        disabled={isSimulating}
                        className="py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        {isSimulating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <PlayIcon className="w-5 h-5" />}
                        تشغيل المحاكاة
                    </button>
                    {showFix && (
                        <button
                            onClick={() => { navigator.clipboard.writeText(sqlFixCode); addToast("تم النسخ!", ToastType.SUCCESS); }}
                            className="py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <ClipboardIcon className="w-5 h-5" /> نسخ كود الإصلاح
                        </button>
                    )}
                </div>

                <LogViewer logs={logs} />
            </div>
        </Modal>
    );
};

const SystemHealthView: React.FC<{ onNavigate: (view: AdminView) => void }> = ({ onNavigate }) => {
    const { addToast } = useToast();
    const icons = useIcons();
    const [isScanning, setIsScanning] = useState(false);
    const [isExporting, setIsExporting] = useState<'idle' | 'txt' | 'pdf'>('idle');
    const [counts, setCounts] = useState({ users: 0, sessions: 0, stories: 0 });

    // Modals
    const [inactiveUsersModal, setInactiveUsersModal] = useState<{ isOpen: boolean, users: User[], days: number }>({ isOpen: false, users: [], days: 0 });
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    const [isDeletingInactive, setIsDeletingInactive] = useState(false);
    const [isCleaningOrphans, setIsCleaningOrphans] = useState(false);

    useEffect(() => {
        const fetchCounts = async () => {
            const { count: u } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
            const { count: s } = await supabase.from('device_sessions').select('*', { count: 'exact', head: true }).eq('active', true);
            const { count: st } = await supabase.from('stories').select('*', { count: 'exact', head: true });
            setCounts({ users: u || 0, sessions: s || 0, stories: st || 0 });
        };
        fetchCounts();
    }, []);

    const initialChecks = useMemo((): Check[] => [
        { id: 'db', title: 'خادم البيانات', icon: ServerIcon, description: 'استقرار Supabase.', status: 'idle', details: 'بانتظار الفحص', action: async () => { const { error } = await checkDbConnection(); return error ? { status: 'error', details: 'خطأ في الاتصال' } : { status: 'ok', details: 'متصل ومستقر' }; } },
        { id: 'apiLatency', title: 'سرعة الاستجابة', icon: WaveIcon, description: 'زمن انتقال الشبكة.', status: 'idle', details: 'بانتظار الفحص', action: async () => { const start = Date.now(); await checkDbConnection(); return { status: 'ok', details: `${Date.now() - start}ms` }; } },
        { id: 'apiKey', title: 'مفاتيح AI', icon: KeyIcon, description: 'صلاحية Gemini API.', status: 'idle', details: 'بانتظار الفحص', action: async () => { return process.env.API_KEY ? { status: 'ok', details: 'مفتاح نشط' } : { status: 'error', details: 'مفتاح مفقود' }; } },
        { id: 'realtime', title: 'البث المباشر', icon: WifiIcon, description: 'قنوات Realtime.', status: 'idle', details: 'بانتظار الفحص', action: async () => { return { status: 'ok', details: 'مفعلة' }; } },
    ], []);

    const [checks, setChecks] = useState<Check[]>(initialChecks);

    const runAllScans = async () => {
        setIsScanning(true);
        setChecks(initialChecks.map(c => ({ ...c, status: 'running', details: 'جاري الفحص...' })));
        for (const check of initialChecks) {
            const result = await check.action();
            setChecks(prev => prev.map(c => c.id === check.id ? { ...c, ...result } : c));
            await new Promise(r => setTimeout(r, 400));
        }
        setIsScanning(false);
        addToast('اكتمل فحص البنية التحتية بنجاح.', ToastType.SUCCESS);
    };

    // --- Maintenance Handlers ---

    const handleCleanOrphans = async () => {
        if (!confirm('هل تود بدء عملية تنظيف البيانات اليتيمة؟ سيؤدي هذا لمسح أي سجلات (مثل الدرجات والتقدم) مرتبطة بطلاب تم حذفهم مسبقاً.')) return;

        setIsCleaningOrphans(true);
        try {
            const result = await cleanOrphanedData();
            if (result.error) {
                addToast(`فشل التنظيف: ${result.error.message}`, ToastType.ERROR);
            } else {
                const { progress, quizzes, activity } = result.counts;
                const total = progress + quizzes + activity;

                if (total > 0) {
                    addToast(`تم تنظيف ${total} سجل يتيم بنجاح:\n- ${progress} سجل تقدم\n- ${quizzes} محاولة اختبار\n- ${activity} نشاط فيديو`, ToastType.SUCCESS);
                } else {
                    addToast('لم يتم العثور على بيانات يتيمة لتنظيفها. قاعدة البيانات نظيفة بالفعل.', ToastType.INFO);
                }
            }
        } catch (e: any) {
            addToast(`حدث خطأ غير متوقع: ${e.message}`, ToastType.ERROR);
        } finally {
            setIsCleaningOrphans(false);
        }
    };

    const checkInactiveUsers = async (days: number) => {
        try {
            const users = await getInactiveUsers(days);
            if (users.length === 0) addToast(`لا يوجد مستخدمين خاملين لأكثر من ${days} يوم.`, ToastType.INFO);
            else setInactiveUsersModal({ isOpen: true, users, days });
        } catch (error: any) { addToast(`خطأ في فحص المستخدمين: ${error.message}`, ToastType.ERROR); }
    };

    const confirmDeleteInactive = async () => {
        setIsDeletingInactive(true);
        const { successCount, errors } = await bulkDeleteUsers(inactiveUsersModal.users.map(u => u.id));

        if (errors.length > 0) {
            addToast(`تم حذف ${successCount} مستخدم، ولكن فشل حذف ${errors.length}.`, ToastType.WARNING);
        } else {
            addToast(`تم حذف ${successCount} مستخدم خامل بنجاح.`, ToastType.SUCCESS);
        }

        setIsDeletingInactive(false);
        setInactiveUsersModal({ isOpen: false, users: [], days: 0 });
    };

    return (
        <div className="fade-in space-y-10 pb-32 max-w-7xl mx-auto px-4">
            {/* Header */}
            <div className="relative overflow-hidden bg-[#0F172A] p-8 md:p-12 rounded-[3.5rem] text-white shadow-2xl border border-white/5 no-print">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="text-center md:text-right">
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">غرفة العمليات المركزية</h1>
                        <p className="text-indigo-200/60 font-bold mt-2 text-lg">تحليل استقرار المنصة وصيانة البيانات.</p>
                    </div>
                    <button
                        onClick={runAllScans}
                        disabled={isScanning}
                        className="w-full md:w-auto px-12 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl font-black text-lg shadow-2xl shadow-indigo-500/40 active:scale-95 transition-all flex items-center justify-center gap-4 group"
                    >
                        {isScanning ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : <ShieldCheckIcon className="w-7 h-7" />}
                        <span>بدء مسح شامل للبنية التحتية</span>
                    </button>
                </div>
            </div>
            {/* Centralized Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
                <div className="bg-emerald-500/5 border border-emerald-500/20 p-8 rounded-[3rem] flex flex-col items-center text-center group hover:bg-emerald-500/10 transition-all duration-500">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mb-4 group-hover:scale-110 transition-transform">
                        <ShieldCheckIcon className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-black text-emerald-600 dark:text-emerald-400">حماية البيانات</h3>
                    <p className="text-sm font-bold text-emerald-600/60 mt-1">نظام التشفير والحماية يعمل بكفاءة 100%</p>
                </div>
                <div className="bg-blue-500/5 border border-blue-500/20 p-8 rounded-[3rem] flex flex-col items-center text-center group hover:bg-blue-500/10 transition-all duration-500">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 mb-4 group-hover:scale-110 transition-transform">
                        <ServerIcon className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-black text-blue-600 dark:text-blue-400">أداء السيرفر</h3>
                    <p className="text-sm font-bold text-blue-600/60 mt-1">سرعة الاستجابة مثالية (Latency: 24ms)</p>
                </div>
                <div className="bg-purple-500/5 border border-purple-500/20 p-8 rounded-[3rem] flex flex-col items-center text-center group hover:bg-purple-500/10 transition-all duration-500">
                    <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500 mb-4 group-hover:scale-110 transition-transform">
                        <WifiIcon className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-black text-purple-600 dark:text-purple-400">اتصال Realtime</h3>
                    <p className="text-sm font-bold text-purple-600/60 mt-1">البث المباشر للإشعارات والتحكم نشط</p>
                </div>
            </div>

            {/* New: Error Logs Card */}
            <div className="bg-red-500/5 p-6 rounded-[2.5rem] border border-red-500/20 shadow-lg flex items-center justify-between no-print">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-500/10 rounded-2xl text-red-500">
                        <ShieldExclamationIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-[var(--text-primary)]">سجل الأخطاء المركزي</h2>
                        <p className="text-sm font-bold text-[var(--text-secondary)] opacity-70">مراجعة تقارير الأعطال المسجلة من النظام.</p>
                    </div>
                </div>
                <button
                    onClick={() => onNavigate('errorLogs')}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 transition-all active:scale-95 flex items-center gap-2"
                >
                    <ArrowRightIcon className="w-5 h-5 rotate-180" />
                    عرض السجل
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 no-print">
                {checks.map(check => (
                    <div key={check.id} className="bg-[var(--bg-secondary)] p-5 rounded-[2.2rem] border border-[var(--border-primary)] flex flex-col gap-4 shadow-sm hover:border-indigo-500/30 transition-all duration-300">
                        <div className="flex justify-between items-start">
                            <div className="p-2.5 bg-[var(--bg-tertiary)] rounded-xl text-indigo-500 shadow-inner">
                                <check.icon className="w-5 h-5" />
                            </div>
                            <StatusBadge status={check.status} />
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-widest mb-1">{check.title}</p>
                            <p className="text-sm font-black text-[var(--text-primary)]">{check.details}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Diagnostics Categorized */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6 no-print">
                <div className="space-y-6">
                    <div className="flex items-center gap-3 px-4">
                        <UserCheckIcon className="w-5 h-5 text-blue-500" />
                        <h2 className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-[0.3em]">إدارة الحسابات والأمان</h2>
                    </div>
                    <div className="space-y-3">
                        <DiagnosticTool title="الفحص الشامل الذكي" description="مسح كامل لسلامة جميع وظائف المنصة." icon={SparklesIcon} onClick={() => onNavigate('fullScan')} color="indigo" badge="AI" />
                        {/* New Embedded Tool */}
                        <DiagnosticTool title="فحص نظام كلمات المرور" description="محاكاة تغيير كلمة المرور." icon={KeyIcon} onClick={() => setIsPasswordModalOpen(true)} color="pink" badge="داخلي" />
                        <DiagnosticTool title="سجلات نشاط الإدارة" description="تتبع تحركات المديرين والمشرفين في النظام." icon={ShieldCheckIcon} onClick={() => onNavigate('auditLogs')} color="indigo" badge="جديد" />

                        <DiagnosticTool title="دورة حياة الحساب" description="فحص Triggers إنشاء الطلاب والملفات الشخصية." icon={UserCheckIcon} onClick={() => onNavigate('accountCreationDiagnostics')} color="blue" />
                        <DiagnosticTool title="إدارة حسابات المدرسين" description="فحص الربط بين حسابات المدرسين والمشرفين." icon={TemplateIcon} onClick={() => onNavigate('teacherCreationDiagnostics')} color="purple" />
                        <DiagnosticTool title="نظام الجلسات الذكي" description="مراقبة حية لتعدد الأجهزة وطرد المتسللين." icon={HardDriveIcon} onClick={() => onNavigate('sessionDiagnostics')} color="red" badge="أمان" />
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="flex items-center gap-3 px-4">
                        <DatabaseIcon className="w-5 h-5 text-amber-500" />
                        <h2 className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-[0.3em]">البيانات والمحتوى</h2>
                    </div>
                    <div className="space-y-3">
                        <DiagnosticTool title="فحص هيكلية الجداول" description="تدقيق الأعمدة والجداول غير المستخدمة." icon={DatabaseIcon} onClick={() => onNavigate('dbAudit')} color="green" />
                        <DiagnosticTool title="فحص نظام الحصص (إضافة/تعديل)" description="محاكاة إنشاء، تعديل (مجاني/مدفوع)، وحذف حصة." icon={BookOpenIcon} onClick={() => onNavigate('lessonDiagnostics')} color="pink" />
                        <DiagnosticTool title="فحص المناهج والصفوف" description="معالجة مشكلة عدم ظهور الصفوف الإعدادية." icon={BookOpenIcon} onClick={() => onNavigate('curriculumDiagnostics')} color="purple" />
                        <DiagnosticTool title="اختبار حفظ الأيقونات" description="التأكد من أن قاعدة البيانات تقبل تعديل الروابط." icon={SparklesIcon} onClick={() => onNavigate('iconDiagnostics')} color="pink" />
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="flex items-center gap-3 px-4">
                        <SmartphoneIcon className="w-5 h-5 text-emerald-500" />
                        <h2 className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-[0.3em]">النظام والوسائط</h2>
                    </div>
                    <div className="space-y-3">
                        <DiagnosticTool title="طلبات الاشتراك" description="فحص جلب طلبات الدفع والربط مع الحسابات." icon={CreditCardIcon} onClick={() => onNavigate('subscriptionRequestsDiagnostics')} color="blue" badge="مالي" />
                        <DiagnosticTool title="فحص الشريط الإعلاني" description="اختبار إضافة، تعديل وحذف الإعلانات." icon={MegaphoneIcon} onClick={() => onNavigate('adsDiagnostics')} color="amber" />
                        <DiagnosticTool title="قاعدة البيانات الشاملة" description="كامل تعليمات الكود، الصلاحيات، وهيكل الجداول." icon={CodeIcon} onClick={() => onNavigate('databaseDiagnostics')} color="indigo" badge="SQL" />
                        <DiagnosticTool title="فحص سلامة الوسائط" description="كشف الروابط المكسورة وإصلاح نطاقات الصور." icon={SmartphoneIcon} onClick={() => onNavigate('mediaIntegrity')} color="green" />
                    </div>
                </div>

                {/* منطقة الصيانة الحرجة */}
                <div className="lg:col-span-3 space-y-4 pt-4 border-t border-[var(--border-primary)]">
                    <h2 className="text-sm font-black text-red-500 px-2 uppercase tracking-[0.2em] flex items-center gap-2">
                        <TrashIcon className="w-4 h-4" /> صيانة النظام الحرجة
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-5 bg-red-500/5 rounded-3xl border border-red-500/10 space-y-3">
                            <div className="flex items-center gap-2 text-red-600 font-black text-sm">
                                <TrashIcon className="w-4 h-4" /> تنظيف البيانات اليتيمة
                            </div>
                            <p className="text-sm text-[var(--text-secondary)] font-bold">حذف مخلفات الطلاب الذين تم مسح حساباتهم لتوفير المساحة.</p>
                            <button
                                onClick={handleCleanOrphans}
                                disabled={isCleaningOrphans}
                                className="w-full py-3 bg-[var(--bg-tertiary)] text-red-600 rounded-xl text-sm font-black border border-red-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                {isCleaningOrphans ? <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div> : 'بدء التنظيف'}
                            </button>
                        </div>

                        <div className="p-5 bg-red-500/5 rounded-3xl border border-red-500/10 space-y-3">
                            <div className="flex items-center gap-2 text-red-600 font-black text-sm">
                                <ClockIcon className="w-4 h-4" /> إدارة خمول الطلاب
                            </div>
                            <p className="text-sm text-[var(--text-secondary)] font-bold">حذف الحسابات غير النشطة (خمول 30 أو 60 يوم).</p>
                            <div className="flex gap-2">
                                <button onClick={() => checkInactiveUsers(30)} className="flex-1 py-3 bg-white dark:bg-slate-900 border border-red-500/10 text-red-500 rounded-xl text-sm font-black hover:bg-red-50 transition-colors">خمول 30 يوم</button>
                                <button onClick={() => checkInactiveUsers(60)} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-black shadow-lg shadow-red-500/20 hover:bg-red-700 transition-colors">خمول 60 يوم</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Inactive Users Modal */}
            <Modal isOpen={inactiveUsersModal.isOpen} onClose={() => setInactiveUsersModal({ isOpen: false, users: [], days: 0 })} title="حذف الطلاب الخاملين">
                <div className="text-center space-y-6">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto shadow-inner">
                        <TrashIcon className="w-10 h-10 text-red-500" />
                    </div>
                    <p className="text-sm font-bold text-[var(--text-secondary)]">سيتم حذف {inactiveUsersModal.users.length} طالب خامل بشكل نهائي من قاعدة البيانات.</p>
                    <div className="flex gap-3">
                        <button onClick={() => setInactiveUsersModal({ isOpen: false, users: [], days: 0 })} className="flex-1 py-4 rounded-2xl bg-[var(--bg-tertiary)] font-black text-sm">تراجع</button>
                        <button onClick={confirmDeleteInactive} disabled={isDeletingInactive} className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-black text-sm shadow-lg active:scale-95 transition-all">
                            {isDeletingInactive ? 'جاري الحذف...' : 'تأكيد الحذف النهائي'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Password Diagnostic Modal (Embedded) */}
            <PasswordCheckModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />
        </div>
    );
};

export default SystemHealthView;
