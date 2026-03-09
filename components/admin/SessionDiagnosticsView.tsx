import React, { useState, useEffect } from 'react';
import { supabase, clearUserDevices, clearAllActiveSessions, getUserById } from '../../services/storageService';
import { checkDbConnection } from '../../services/systemService';
import { useToast } from '../../useToast';
import { ToastType } from '../../types';
import { ArrowRightIcon, HardDriveIcon, TrashIcon, SearchIcon, ShieldCheckIcon, WifiIcon } from '../common/Icons';

const LogViewer: React.FC<{ logs: string[] }> = ({ logs }) => (
    <div className="mt-4 bg-[var(--bg-tertiary)] p-4 rounded-lg h-80 overflow-y-auto font-mono text-sm border border-[var(--border-primary)] shadow-inner custom-scrollbar">
        {logs.map((log, index) => (
            <p key={index} className={`whitespace-pre-wrap mb-1 ${log.includes('✅') ? 'text-green-500' : log.includes('❌') ? 'text-red-500' : log.includes('🚀') ? 'text-blue-400' : 'text-[var(--text-secondary)]'}`}>
                {log}
            </p>
        ))}
    </div>
);

const SessionDiagnosticsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { addToast } = useToast();
    const [logs, setLogs] = useState<string[]>(['جاهز لفحص نظام الجلسات...']);
    const [targetEmail, setTargetEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isMonitoring, setIsMonitoring] = useState(false);

    const addLog = (log: string) => setLogs(prev => [`[${new Date().toLocaleTimeString('en-GB')}] ${log}`, ...prev]);

    useEffect(() => {
        // Start monitoring on mount
        const channel = supabase
            .channel('session-monitor')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'device_sessions' },
                async (payload) => {
                    const event = payload.eventType;
                    const session = payload.new as any;
                    
                    if (event === 'INSERT' || (event === 'UPDATE' && session.active)) {
                        const { data: user } = await supabase.from('profiles').select('name').eq('id', session.user_id).single();
                        const userName = user?.name || 'مستخدم غير معروف';
                        const device = session.device_name || 'جهاز غير معروف';
                        
                        addLog(`🚀 تسجيل دخول جديد: ${userName} (الجهاز: ${device})`);
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    setIsMonitoring(true);
                    addLog("✅ تم تفعيل المراقبة الحية للجلسات.");
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const runBasicChecks = async () => {
        setIsLoading(true);
        addLog("بدء فحص نظام الجلسات...");

        // 1. Check DB Connection
        const { error: dbError } = await checkDbConnection();
        if (dbError) {
            addLog(`❌ فشل الاتصال بقاعدة البيانات: ${dbError.message}`);
            setIsLoading(false);
            return;
        }
        addLog("✅ الاتصال بقاعدة البيانات سليم.");

        // 2. Check device_sessions table access
        const { count, error: countError } = await supabase.from('device_sessions').select('*', { count: 'exact', head: true }).eq('active', true);
        if (countError) {
            addLog(`❌ فشل الوصول للجدول: ${countError.message}`);
        } else {
            addLog(`✅ الجدول متاح. عدد الجلسات النشطة حالياً: ${count}`);
        }

        setIsLoading(false);
    };

    const handleClearByEmail = async () => {
        if (!targetEmail.trim()) {
            addToast('أدخل البريد الإلكتروني أولاً', ToastType.ERROR);
            return;
        }
        setIsLoading(true);
        addLog(`--- محاولة مسح جلسات المستخدم: ${targetEmail} ---`);
        
        // 1. Find User ID
        const { data: users, error: userError } = await supabase.from('profiles').select('id, name').eq('email', targetEmail).single();
        
        if (userError || !users) {
            addLog(`❌ لم يتم العثور على مستخدم بهذا البريد.`);
            setIsLoading(false);
            return;
        }
        addLog(`✅ تم العثور على المستخدم: ${users.name}`);

        // 2. Clear Sessions
        const { error: clearError } = await clearUserDevices(users.id);
        if (clearError) {
            addLog(`❌ فشل حذف الجلسات: ${clearError.message}`);
        } else {
            addLog(`✅ تم حذف جميع الجلسات بنجاح.`);
            addToast(`تم تسجيل خروج ${users.name} من جميع الأجهزة.`, ToastType.SUCCESS);
        }
        setIsLoading(false);
    };

    const handleClearAll = async () => {
        if (!confirm('تحذير: سيتم تسجيل خروج جميع المستخدمين في النظام. هل أنت متأكد؟')) return;
        
        setIsLoading(true);
        addLog(`⚠️ بدء عملية تصفية شاملة للجلسات...`);
        
        const { error } = await clearAllActiveSessions();
        if (error) {
            addLog(`❌ فشل الحذف الشامل: ${error.message}`);
        } else {
            addLog(`✅ تمت عملية التصفية الشاملة بنجاح.`);
            addToast('تم تسجيل خروج جميع المستخدمين.', ToastType.SUCCESS);
        }
        setIsLoading(false);
    };

    return (
        <div className="fade-in">
            <button onClick={onBack} className="flex items-center space-x-2 space-x-reverse mb-6 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                <ArrowRightIcon className="w-4 h-4" />
                <span>العودة إلى فحص الأعطال</span>
            </button>
            <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">فحص ومراقبة الجلسات</h1>
            <p className="mb-8 text-[var(--text-secondary)]">مراقبة حية لعمليات تسجيل الدخول وأدوات إدارة الجلسات.</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Tools Panel */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Status Check */}
                    <div className="bg-[var(--bg-secondary)] p-6 rounded-xl shadow-lg border border-[var(--border-primary)]">
                        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                            <ShieldCheckIcon className="w-5 h-5 text-purple-500" /> الفحص السريع
                        </h2>
                        <button 
                            onClick={runBasicChecks} 
                            disabled={isLoading}
                            className="w-full py-3 font-semibold bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-all disabled:opacity-50"
                        >
                            {isLoading ? 'جاري الفحص...' : 'فحص حالة الجدول'}
                        </button>
                    </div>

                    {/* Specific User Logout */}
                    <div className="bg-[var(--bg-secondary)] p-6 rounded-xl shadow-lg border border-[var(--border-primary)]">
                        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                            <SearchIcon className="w-5 h-5 text-yellow-500" /> بحث وحذف
                        </h2>
                        <div className="space-y-3">
                            <input 
                                type="email" 
                                placeholder="بريد الطالب..." 
                                value={targetEmail}
                                onChange={e => setTargetEmail(e.target.value)}
                                className="w-full p-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg"
                            />
                            <button 
                                onClick={handleClearByEmail} 
                                disabled={isLoading}
                                className="w-full py-2.5 font-semibold bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] rounded-lg text-[var(--text-primary)] transition-all disabled:opacity-50 border border-[var(--border-primary)]"
                            >
                                تسجيل خروج هذا المستخدم
                            </button>
                        </div>
                    </div>

                    {/* Emergency Clear All */}
                    <div className="bg-red-900/10 p-6 rounded-xl shadow-lg border border-red-500/20">
                        <h2 className="text-xl font-bold text-red-500 mb-2 flex items-center gap-2">
                            <TrashIcon className="w-5 h-5" /> طوارئ
                        </h2>
                        <p className="text-sm text-[var(--text-secondary)] mb-4">استخدم هذا الزر فقط في حالة وجود خلل عام في الجلسات.</p>
                        <button 
                            onClick={handleClearAll} 
                            disabled={isLoading}
                            className="w-full py-3 font-bold bg-red-600 hover:bg-red-700 rounded-lg text-white transition-all disabled:opacity-50 shadow-lg shadow-red-500/20"
                        >
                            تسجيل خروج الجميع (Force Logout All)
                        </button>
                    </div>
                </div>

                {/* Log Viewer with Realtime Badge */}
                <div className="lg:col-span-2 bg-[var(--bg-secondary)] p-6 rounded-xl shadow-lg border border-[var(--border-primary)] flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                            <HardDriveIcon className="w-5 h-5 text-gray-500" /> سجل العمليات الحية
                        </h2>
                        {isMonitoring && (
                            <span className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-sm font-bold border border-green-500/20 animate-pulse">
                                <WifiIcon className="w-4 h-4"/> متصل بالخادم
                            </span>
                        )}
                    </div>
                    <LogViewer logs={logs} />
                </div>
            </div>
        </div>
    );
};

export default SessionDiagnosticsView;