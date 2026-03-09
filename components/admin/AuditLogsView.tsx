
import React, { useState, useEffect } from 'react';
import { getAuditLogs, AuditLog, AUDIT_LOGS_SQL } from '../../services/auditService';
import { ToastType } from '../../types';
import { useToast } from '../../useToast';
import { 
    ClockIcon, ArrowRightIcon, UserIcon, 
    ShieldCheckIcon, InformationCircleIcon, ClipboardIcon,
    DatabaseIcon, SearchIcon
} from '../common/Icons';
import Loader from '../common/Loader';
import Modal from '../common/Modal';

const AuditLogCard: React.FC<{ log: AuditLog }> = ({ log }) => {
    return (
        <div className="p-4 rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:shadow-md transition-all">
            <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl mt-1 bg-indigo-500/10 text-indigo-500">
                        <ShieldCheckIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm font-black uppercase opacity-60 mb-1 flex items-center gap-2">
                            {log.admin_name} 
                            <span className="w-1 h-1 rounded-full bg-current"></span> 
                            {new Date(log.created_at).toLocaleString('ar-EG')}
                        </p>
                        <h4 className="font-bold text-sm text-[var(--text-primary)] mb-1">{log.action}</h4>
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{log.details}</p>
                        {(log.target_id || log.target_type) && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {log.target_type && <span className="px-2 py-0.5 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-sm font-black uppercase">{log.target_type}</span>}
                                {log.target_id && <span className="px-2 py-0.5 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-sm font-mono">{log.target_id.slice(0, 8)}...</span>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const AuditLogsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showSql, setShowSql] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const { addToast } = useToast();

    const fetchLogs = async () => {
        setIsLoading(true);
        const data = await getAuditLogs();
        setLogs(data);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const filteredLogs = logs.filter(log => 
        log.admin_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fade-in pb-20 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-indigo-600 transition-all">
                        <ArrowRightIcon className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-[var(--text-primary)]">سجل نشاط الإدارة</h1>
                        <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-1">Admin Activity Audit Trail</p>
                    </div>
                </div>
                <button 
                    onClick={() => setShowSql(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 text-indigo-600 text-sm font-bold border border-indigo-500/20"
                >
                    <DatabaseIcon className="w-4 h-4" />
                    <span>إعداد الجدول</span>
                </button>
            </div>

            <div className="relative">
                <SearchIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)] opacity-50" />
                <input 
                    type="text"
                    placeholder="بحث في السجلات..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full py-4 pr-12 pl-5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-[1.5rem] outline-none focus:border-indigo-500 transition-all font-bold text-sm shadow-sm"
                />
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20"><Loader /></div>
            ) : filteredLogs.length === 0 ? (
                <div className="text-center py-20 bg-[var(--bg-secondary)] rounded-[2rem] border border-dashed border-[var(--border-primary)]">
                    <ClockIcon className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-4 opacity-20" />
                    <p className="text-[var(--text-secondary)] font-bold">لا توجد سجلات نشاط حالياً.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredLogs.map(log => (
                        <AuditLogCard key={log.id} log={log} />
                    ))}
                </div>
            )}

            <Modal isOpen={showSql} onClose={() => setShowSql(false)} title="إعداد قاعدة البيانات">
                <div className="space-y-4">
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3">
                        <InformationCircleIcon className="w-5 h-5 text-amber-600 mt-0.5" />
                        <p className="text-sm font-bold text-amber-800 leading-relaxed">
                            يجب تشغيل الكود التالي في SQL Editor الخاص بـ Supabase لإنشاء جدول سجلات النشاط وتفعيل صلاحيات الوصول.
                        </p>
                    </div>
                    <div className="relative">
                        <pre className="p-4 bg-slate-900 text-slate-300 rounded-2xl text-sm font-mono overflow-x-auto max-h-60 dir-ltr text-left">
                            {AUDIT_LOGS_SQL}
                        </pre>
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(AUDIT_LOGS_SQL);
                                addToast('تم نسخ الكود', ToastType.SUCCESS);
                            }}
                            className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all"
                        >
                            <ClipboardIcon className="w-4 h-4" />
                        </button>
                    </div>
                    <button 
                        onClick={() => setShowSql(false)}
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-lg active:scale-95 transition-all"
                    >
                        فهمت ذلك
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default AuditLogsView;
