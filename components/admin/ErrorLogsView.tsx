
import React, { useState, useEffect } from 'react';
import { getErrorLogs, clearErrorLogs, ERROR_LOGS_SQL } from '../../services/errorLogService';
import { ErrorLog, ToastType } from '../../types';
import { useToast } from '../../useToast';
import { 
    ShieldExclamationIcon, TrashIcon, ClockIcon, 
    ArrowRightIcon, CodeIcon, SmartphoneIcon, UserIcon,
    ClipboardIcon, ShieldCheckIcon
} from '../common/Icons';
import Loader from '../common/Loader';
import Modal from '../common/Modal';

const ErrorLogCard: React.FC<{ log: ErrorLog }> = ({ log }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className={`p-4 rounded-2xl border transition-all ${log.severity === 'error' ? 'bg-red-500/5 border-red-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
            <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl mt-1 ${log.severity === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                        <ShieldExclamationIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm font-black uppercase opacity-60 mb-1 flex items-center gap-2">
                            {log.source} 
                            <span className="w-1 h-1 rounded-full bg-current"></span> 
                            {new Date(log.created_at).toLocaleString()}
                        </p>
                        <h4 className="font-bold text-sm text-[var(--text-primary)] mb-1">{log.message}</h4>
                        {log.user_id && (
                            <div className="flex items-center gap-1 text-sm text-[var(--text-secondary)]">
                                <UserIcon className="w-3 h-3" /> User: {log.user_id.slice(0, 8)}...
                            </div>
                        )}
                    </div>
                </div>
                <button onClick={() => setExpanded(!expanded)} className="text-sm font-bold text-indigo-500 underline">
                    {expanded ? 'إخفاء' : 'تفاصيل'}
                </button>
            </div>
            
            {expanded && (
                <div className="mt-4 pt-4 border-t border-[var(--border-primary)] space-y-3 animate-fade-in">
                    {log.device_info && (
                        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] font-mono bg-[var(--bg-tertiary)] p-2 rounded-lg">
                            <SmartphoneIcon className="w-3.5 h-3.5" /> {log.device_info}
                        </div>
                    )}
                    {log.stack && (
                        <pre className="text-sm font-mono bg-black/80 text-red-300 p-3 rounded-xl overflow-x-auto dir-ltr text-left">
                            {log.stack}
                        </pre>
                    )}
                </div>
            )}
        </div>
    );
};

const ErrorLogsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [logs, setLogs] = useState<ErrorLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showSql, setShowSql] = useState(false);
    const { addToast } = useToast();

    const fetchLogs = async () => {
        setIsLoading(true);
        const data = await getErrorLogs();
        setLogs(data);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const handleClear = async () => {
        if(!confirm('هل أنت متأكد من حذف جميع السجلات؟')) return;
        try {
            await clearErrorLogs();
            addToast('تم تنظيف السجل.', ToastType.SUCCESS);
            setLogs([]);
        } catch (e) {
            addToast('فشل الحذف. ربما الجدول غير موجود.', ToastType.ERROR);
            setShowSql(true);
        }
    };

    return (
        <div className="fade-in pb-20 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-indigo-600 transition-all">
                        <ArrowRightIcon className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-[var(--text-primary)]">سجل الأخطاء المركزي</h1>
                        <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-1">System Error Tracking</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowSql(true)} className="p-3 bg-[var(--bg-tertiary)] hover:bg-[var(--border-primary)] rounded-xl text-[var(--text-secondary)] transition-all" title="كود الجدول">
                        <CodeIcon className="w-5 h-5" />
                    </button>
                    <button onClick={handleClear} className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow-lg flex items-center gap-2">
                        <TrashIcon className="w-4 h-4" /> تنظيف السجل
                    </button>
                </div>
            </div>

            <div className="bg-[var(--bg-secondary)] p-6 rounded-[2.5rem] border border-[var(--border-primary)] shadow-sm min-h-[400px]">
                {isLoading ? (
                    <div className="flex justify-center py-20"><Loader /></div>
                ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        <ShieldCheckIcon className="w-20 h-20 text-emerald-500 mb-4" />
                        <h3 className="text-xl font-black text-[var(--text-primary)]">النظام سليم</h3>
                        <p className="text-sm font-bold text-[var(--text-secondary)]">لا توجد أخطاء مسجلة حديثاً.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {logs.map(log => <ErrorLogCard key={log.id} log={log} />)}
                    </div>
                )}
            </div>

            <Modal isOpen={showSql} onClose={() => setShowSql(false)} title="إعداد جدول الأخطاء">
                <div className="space-y-4">
                    <p className="text-sm text-[var(--text-secondary)] font-bold">
                        إذا لم تظهر الأخطاء أو فشل الحذف، يرجى تشغيل الكود التالي في Supabase SQL Editor لإنشاء الجدول والصلاحيات:
                    </p>
                    <div className="relative bg-black p-4 rounded-xl border border-white/10 group">
                        <pre className="text-sm font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap dir-ltr text-left">
                            {ERROR_LOGS_SQL}
                        </pre>
                        <button 
                            onClick={() => { navigator.clipboard.writeText(ERROR_LOGS_SQL); addToast('تم النسخ', ToastType.SUCCESS); }}
                            className="absolute top-2 right-2 p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-all"
                        >
                            <ClipboardIcon className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex justify-end">
                        <button onClick={() => setShowSql(false)} className="px-6 py-2 bg-[var(--bg-tertiary)] rounded-xl font-bold">إغلاق</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ErrorLogsView;
